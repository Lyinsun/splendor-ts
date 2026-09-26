import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RoomLimitError, RoomNotFoundError, RoomService, SeatAuthError, type ActionCommand } from '../src/game/application/room-service.js';
import { InMemoryRoomRepository } from '../src/game/application/room-repository.js';
import { SqliteRoomRepository } from '../src/game/infrastructure/sqlite-room-repository.js';
import { GameRuleError } from '../src/game/domain/types.js';

function startedRoom(service = new RoomService()) {
  const host = service.createRoom({ playerName: 'Ada' });
  const guest = service.joinRoom(host.room.roomId, 'Blaise');
  const room = service.startRoom(host.room.roomId, host.seatToken);
  const tokenOf = (playerId: string | null) => (playerId === host.playerId ? host.seatToken : guest.seatToken);
  return { service, host, guest, room, roomId: host.room.roomId, tokenOf };
}

describe('room service', () => {
  it('binds actions to seat tokens so public player ids cannot be impersonated', () => {
    const { service, roomId, room, host, guest } = startedRoom();
    const current = room.currentPlayerId === host.playerId ? host : guest;
    const other = current === host ? guest : host;

    expect(() => service.applyAction(roomId, 'forged-token', { kind: 'pass_turn' })).toThrow(SeatAuthError);
    expect(() => service.applyAction(roomId, other.seatToken, { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] })).toThrow(GameRuleError);
    const next = service.applyAction(roomId, current.seatToken, { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] });
    expect(next.version).toBe(room.version + 1);
    expect(next.currentPlayerId).toBe(other.playerId);
  });

  it('never leaks deck order and hides face-down reservations from other seats', () => {
    const { service, roomId, room, tokenOf, host, guest } = startedRoom();
    const actor = room.currentPlayerId!;
    service.applyAction(roomId, tokenOf(actor), { kind: 'reserve_card', source: { kind: 'deck', tier: 1 } });

    const own = service.getRoomView(roomId, tokenOf(actor));
    const otherId = actor === host.playerId ? guest.playerId : host.playerId;
    const theirs = service.getRoomView(roomId, tokenOf(otherId));
    const spectator = service.getRoomView(roomId);

    expect('decks' in own.board).toBe(false);
    expect(own.board.deckCounts[1]).toBeGreaterThan(0);
    const ownCard = own.players.find((p) => p.id === actor)!.reserved[0]!;
    expect('hidden' in ownCard).toBe(false);
    for (const view of [theirs, spectator]) {
      const card = view.players.find((p) => p.id === actor)!.reserved[0]!;
      expect(card).toEqual({ id: expect.stringMatching(/^hidden-/), tier: 1, hidden: true });
    }
    expect(JSON.stringify(spectator)).not.toContain(ownCard.id);
  });

  it('treats a repeated clientActionId as a no-op so client retries are safe', () => {
    const { service, roomId, room, tokenOf } = startedRoom();
    const token = tokenOf(room.currentPlayerId);
    const command: ActionCommand = { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] };
    const first = service.applyAction(roomId, token, command, { clientActionId: 'retry-1' });
    const second = service.applyAction(roomId, token, command, { clientActionId: 'retry-1' });
    expect(second.version).toBe(first.version);
    expect(second.turn).toBe(first.turn);
  });

  it('only lets the host add demo players, start, kick and rematch', () => {
    const service = new RoomService();
    const host = service.createRoom({ playerName: 'Ada' });
    const guest = service.joinRoom(host.room.roomId, 'Blaise');
    const roomId = host.room.roomId;
    expect(() => service.addDemoPlayer(roomId, guest.seatToken)).toThrow(GameRuleError);
    expect(() => service.startRoom(roomId, guest.seatToken)).toThrow(GameRuleError);
    expect(() => service.kickPlayer(roomId, guest.seatToken, host.playerId)).toThrow(GameRuleError);

    const kicked = service.kickPlayer(roomId, host.seatToken, guest.playerId);
    expect(kicked.players.map((p) => p.id)).toEqual([host.playerId]);
    expect(() => service.getRoomView(roomId, guest.seatToken)).toThrow(SeatAuthError);
  });

  it('ends the game when a player leaves a two-player match, and supports a rematch', () => {
    const { service, roomId, host, guest } = startedRoom();
    const afterLeave = service.leaveRoom(roomId, guest.seatToken)!;
    expect(afterLeave.status).toBe('finished');
    expect(afterLeave.players.find((p) => p.id === guest.playerId)?.status).toBe('left');

    const lobby = service.rematch(roomId, host.seatToken);
    expect(lobby.status).toBe('lobby');
    expect(lobby.players.map((p) => p.id)).toEqual([host.playerId]);
    expect(() => service.getRoomView(roomId, guest.seatToken)).toThrow(SeatAuthError);
  });

  it('skips departed players and keeps playing with three or more seats', () => {
    const service = new RoomService();
    const a = service.createRoom({ playerName: 'A' });
    const roomId = a.room.roomId;
    const b = service.joinRoom(roomId, 'B');
    const c = service.joinRoom(roomId, 'C');
    service.startRoom(roomId, a.seatToken);
    service.leaveRoom(roomId, b.seatToken);
    const tokens = new Map([[a.playerId, a.seatToken], [c.playerId, c.seatToken]]);
    for (let i = 0; i < 4; i += 1) {
      const view = service.getRoomView(roomId);
      expect(view.status).toBe('playing');
      expect(view.currentPlayerId).not.toBe(b.playerId);
      const token = tokens.get(view.currentPlayerId!)!;
      const action = service.listLegalActions(roomId, token).actions[0]!;
      const { playerId: _ignored, ...command } = action.action;
      service.applyAction(roomId, token, command);
    }
  });

  it('closes the room when the last lobby player leaves', () => {
    const service = new RoomService();
    const host = service.createRoom({ playerName: 'Ada' });
    expect(service.leaveRoom(host.room.roomId, host.seatToken)).toBeNull();
    expect(() => service.getRoomView(host.room.roomId)).toThrow(RoomNotFoundError);
  });

  it('skips idle turns after the timeout without acting, and garbage-collects idle rooms', () => {
    let now = Date.parse('2026-01-01T00:00:00Z');
    const clock = () => new Date(now);
    const service = new RoomService({ turnTimeoutMs: 60_000, clock, idleTtlMs: { finished: 1000 } });
    const { room, roomId } = startedRoom(service);

    now += 30_000;
    expect(service.expireIdleTurns()).toBe(0);
    now += 31_000;
    expect(service.expireIdleTurns()).toBe(1);
    const after = service.getRoomView(roomId);
    expect(after.currentPlayerId).not.toBe(room.currentPlayerId);
    expect(after.version).toBe(room.version + 1);
    // Skipped, not played: nobody gained tokens and the bank is untouched.
    expect(after.board.bank).toEqual(room.board.bank);
    expect(after.players.every((player) => Object.values(player.tokens).every((count) => count === 0))).toBe(true);

    const lobbyOnly = service.createRoom({ playerName: 'Idle' });
    now += 3 * 60 * 60 * 1000;
    const removed = service.sweepIdleRooms();
    expect(removed).toContain(lobbyOnly.room.roomId);
    expect(removed).not.toContain(roomId);
  });

  it('times turns from turnStartedAt, not from unrelated room activity', () => {
    let now = Date.parse('2026-01-01T00:00:00Z');
    const service = new RoomService({ turnTimeoutMs: 60_000, clock: () => new Date(now) });
    const a = service.createRoom({ playerName: 'A' });
    const roomId = a.room.roomId;
    service.joinRoom(roomId, 'B');
    const c = service.joinRoom(roomId, 'C');
    const started = service.startRoom(roomId, a.seatToken);
    expect(started.currentPlayerId).toBe(a.playerId);

    now += 50_000;
    // Another seat leaving bumps updatedAt but must not restart A's turn clock.
    service.leaveRoom(roomId, c.seatToken);
    now += 11_000;
    expect(service.expireIdleTurns()).toBe(1);
    expect(service.getRoomView(roomId).currentPlayerId).not.toBe(a.playerId);
    now += 30_000;
    expect(service.expireIdleTurns()).toBe(0);
  });

  it('revokes the seat token whenever a player leaves, including mid-game and after the game', () => {
    const service = new RoomService();
    const a = service.createRoom({ playerName: 'A' });
    const roomId = a.room.roomId;
    const b = service.joinRoom(roomId, 'B');
    const c = service.joinRoom(roomId, 'C');
    service.startRoom(roomId, a.seatToken);

    service.leaveRoom(roomId, b.seatToken);
    expect(() => service.authenticate(roomId, b.seatToken)).toThrow(SeatAuthError);
    expect(() => service.leaveRoom(roomId, b.seatToken)).toThrow(SeatAuthError);

    const finished = service.leaveRoom(roomId, c.seatToken)!;
    expect(finished.status).toBe('finished');

    // Leaving a finished table used to be a silent no-op that kept the seat for the rematch.
    expect(service.leaveRoom(roomId, a.seatToken)).toBeNull();
    expect(service.hasRoom(roomId)).toBe(false);
  });

  it('rejects an action built on a stale version unless it is a replay of an applied action', () => {
    const { service, roomId, room, tokenOf } = startedRoom();
    const token = tokenOf(room.currentPlayerId);
    const command: ActionCommand = { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] };
    const applied = service.applyAction(roomId, token, command, { clientActionId: 'move-1', expectedVersion: room.version });
    expect(applied.version).toBe(room.version + 1);

    // Same id, same (now stale) version: an idempotent retry, not a conflict.
    expect(service.applyAction(roomId, token, command, { clientActionId: 'move-1', expectedVersion: room.version }).version).toBe(applied.version);

    const nextToken = tokenOf(applied.currentPlayerId);
    expect(() => service.applyAction(roomId, nextToken, command, { clientActionId: 'move-2', expectedVersion: room.version }))
      .toThrow(expect.objectContaining({ code: 'stale_state' }));
    expect(service.applyAction(roomId, nextToken, command, { expectedVersion: applied.version }).version).toBe(applied.version + 1);
  });

  it('persists before mutating memory, so a failed write leaves the room unchanged', () => {
    const repository = new InMemoryRoomRepository();
    const service = new RoomService({ repository });
    const { roomId, room, tokenOf } = startedRoom(service);
    const token = tokenOf(room.currentPlayerId);
    const events: string[] = [];
    service.subscribe((id) => events.push(id));
    repository.save = () => {
      throw new Error('disk full');
    };

    expect(() => service.applyAction(roomId, token, { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] }, { clientActionId: 'x' })).toThrow('disk full');
    const view = service.getRoomView(roomId);
    expect(view.version).toBe(room.version);
    expect(view.currentPlayerId).toBe(room.currentPlayerId);
    expect(events).toEqual([]);
  });

  it('enforces the room cap', () => {
    const service = new RoomService({ maxRooms: 2 });
    service.createRoom({ playerName: 'A' });
    service.createRoom({ playerName: 'B' });
    expect(() => service.createRoom({ playerName: 'C' })).toThrow(RoomLimitError);
  });

  it('notifies subscribers on every committed change', () => {
    const service = new RoomService();
    const seen: string[] = [];
    service.subscribe((roomId) => seen.push(roomId));
    const host = service.createRoom({ playerName: 'Ada' });
    service.joinRoom(host.room.roomId, 'Blaise');
    expect(seen).toEqual([host.room.roomId, host.room.roomId]);
  });
});

describe('sqlite room repository', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('restores rooms and seat tokens after a restart', () => {
    const dir = mkdtempSync(join(tmpdir(), 'splendor-'));
    dirs.push(dir);
    const path = join(dir, 'rooms.db');

    const firstRepo = new SqliteRoomRepository(path);
    const { roomId, room, tokenOf } = startedRoom(new RoomService({ repository: firstRepo }));
    firstRepo.close();

    const secondRepo = new SqliteRoomRepository(path);
    const restored = new RoomService({ repository: secondRepo });
    const view = restored.getRoomView(roomId, tokenOf(room.currentPlayerId));
    expect(view.version).toBe(room.version);
    expect(view.viewerPlayerId).toBe(room.currentPlayerId);
    restored.applyAction(roomId, tokenOf(room.currentPlayerId), { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] });
    secondRepo.close();
  });
});
