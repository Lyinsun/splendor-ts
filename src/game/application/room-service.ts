import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  abandonGame,
  addPlayerToLobby,
  applyGameAction,
  createLobbyState,
  kickPlayerFromLobby,
  leaveFinishedGame,
  MAX_PLAYERS,
  removePlayerFromLobby,
  returnToLobby,
  skipTurn,
  startGame,
} from '../domain/engine.js';
import { listLegalGameActions, type LegalGameActionList } from '../domain/legal-actions.js';
import { GameRuleError, type GameAction, type GameState } from '../domain/types.js';
import { projectRoomView, type RoomView } from '../domain/view.js';
import { createId } from '../../shared/ids.js';
import { InMemoryRoomRepository, type RoomRecord, type RoomRepository } from './room-repository.js';

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** A player action as submitted by a client; the acting player comes from the seat token. */
export type ActionCommand = DistributiveOmit<GameAction, 'playerId'>;

export interface RoomSummary {
  roomId: string;
  roomName: string;
  status: GameState['status'];
  players: number;
  maxPlayers: number;
  turn: number;
  round: number;
  updatedAt: string;
}

/** Returned only to the client that claimed the seat. */
export interface SeatGrant {
  room: RoomView;
  playerId: string;
  seatToken: string;
}

/**
 * Retry and concurrency controls for an action, modelled on Stripe idempotency keys and
 * boardgame.io's stateID check.
 */
export interface ActionOptions {
  /** One id per logical move; a retry with the same id returns the current state instead of acting twice. */
  clientActionId?: string;
  /** The `version` the client was looking at. A mismatch is rejected as `stale_state` (409). */
  expectedVersion?: number;
}

/** Record fields a commit may replace alongside the game state. */
type RecordChanges = Partial<Pick<RoomRecord, 'seatTokenHashes' | 'recentActionIds'>>;

export interface RoomServiceOptions {
  repository?: RoomRepository;
  maxRooms?: number;
  /** 0 disables turn timeouts; otherwise an idle turn is skipped (never played for the player). */
  turnTimeoutMs?: number;
  /** Idle time after which a room is garbage-collected, per status. */
  idleTtlMs?: Partial<Record<GameState['status'], number>>;
  clock?: () => Date;
}

export class RoomNotFoundError extends Error {
  constructor(readonly roomId: string) {
    super(`Room not found: ${roomId}`);
    this.name = 'RoomNotFoundError';
  }
}

export class SeatAuthError extends Error {
  constructor(message = 'A valid seat token is required for this room.') {
    super(message);
    this.name = 'SeatAuthError';
  }
}

export class RoomLimitError extends Error {
  constructor(readonly limit: number) {
    super(`The server already hosts ${limit} rooms. Try again later.`);
    this.name = 'RoomLimitError';
  }
}

export type RoomListener = (roomId: string) => void;

const RECENT_ACTION_LIMIT = 64;
const DEFAULT_IDLE_TTL_MS: Record<GameState['status'], number> = {
  lobby: 2 * 60 * 60 * 1000,
  playing: 24 * 60 * 60 * 1000,
  finished: 2 * 60 * 60 * 1000,
};

export class RoomService {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly listeners = new Set<RoomListener>();
  private readonly repository: RoomRepository;
  private readonly maxRooms: number;
  private readonly turnTimeoutMs: number;
  private readonly idleTtlMs: Record<GameState['status'], number>;
  private readonly clock: () => Date;

  constructor(options: RoomServiceOptions = {}) {
    this.repository = options.repository ?? new InMemoryRoomRepository();
    this.maxRooms = options.maxRooms ?? 200;
    this.turnTimeoutMs = options.turnTimeoutMs ?? 0;
    this.idleTtlMs = { ...DEFAULT_IDLE_TTL_MS, ...options.idleTtlMs };
    this.clock = options.clock ?? (() => new Date());
    for (const record of this.repository.loadAll()) {
      this.rooms.set(record.state.roomId, record);
    }
  }

  createRoom(input: { playerName: string; roomName?: string }): SeatGrant {
    if (this.rooms.size >= this.maxRooms) {
      throw new RoomLimitError(this.maxRooms);
    }
    const roomId = createId('room');
    const playerId = createId('player');
    const seatToken = createSeatToken();
    const state = createLobbyState(roomId, input.roomName?.trim() || `${input.playerName || 'Trainer'}'s table`, { id: playerId, name: input.playerName }, this.now());
    const record: RoomRecord = { state, seatTokenHashes: { [playerId]: hashToken(seatToken) }, recentActionIds: [] };
    this.repository.save(record);
    this.rooms.set(roomId, record);
    this.emit(roomId);
    return { room: this.view(record, playerId), playerId, seatToken };
  }

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .map(({ state }) => ({
        roomId: state.roomId,
        roomName: state.roomName,
        status: state.status,
        players: state.players.filter((player) => player.status === 'active').length,
        maxPlayers: MAX_PLAYERS,
        turn: state.turn,
        round: state.round,
        updatedAt: state.updatedAt,
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  /** Personalised view for a seat token, or the spectator view when no token is given. */
  getRoomView(roomId: string, seatToken?: string | null): RoomView {
    const record = this.requireRoom(roomId);
    const playerId = seatToken === undefined || seatToken === null ? null : this.authenticateRecord(record, seatToken);
    return this.view(record, playerId);
  }

  /** Used by push channels that already resolved the viewer. */
  viewFor(roomId: string, playerId: string | null): RoomView {
    return this.view(this.requireRoom(roomId), playerId);
  }

  authenticate(roomId: string, seatToken: string): string {
    return this.authenticateRecord(this.requireRoom(roomId), seatToken);
  }

  listLegalActions(roomId: string, seatToken: string): LegalGameActionList {
    const record = this.requireRoom(roomId);
    return listLegalGameActions(record.state, this.authenticateRecord(record, seatToken));
  }

  joinRoom(roomId: string, playerName: string): SeatGrant {
    return this.grantSeat(this.requireRoom(roomId), playerName);
  }

  /** Host-only helper that fills a lobby seat for hot-seat play on one device. */
  addDemoPlayer(roomId: string, hostSeatToken: string): SeatGrant {
    const record = this.requireRoom(roomId);
    const hostId = this.authenticateRecord(record, hostSeatToken);
    if (record.state.hostPlayerId !== hostId) {
      throw new GameRuleError('Only the host can add local players.', 'host_only');
    }
    return this.grantSeat(record, `Demo Trainer ${record.state.players.length + 1}`);
  }

  startRoom(roomId: string, seatToken: string): RoomView {
    const record = this.requireRoom(roomId);
    const playerId = this.authenticateRecord(record, seatToken);
    this.commit(record, startGame(record.state, playerId, this.now(), randomUUID()));
    return this.view(record, playerId);
  }

  applyAction(roomId: string, seatToken: string, command: ActionCommand, options: ActionOptions = {}): RoomView {
    const record = this.requireRoom(roomId);
    const playerId = this.authenticateRecord(record, seatToken);
    const { clientActionId, expectedVersion } = options;
    // Replays win over the version check: a retry legitimately carries the version from before its first attempt.
    if (clientActionId !== undefined && record.recentActionIds.includes(clientActionId)) {
      return this.view(record, playerId);
    }
    if (expectedVersion !== undefined && expectedVersion !== record.state.version) {
      throw new GameRuleError(
        `The room moved on (version ${record.state.version}, you acted on ${expectedVersion}). Refresh and try again.`,
        'stale_state',
      );
    }
    const next = applyGameAction(record.state, { ...command, playerId } as GameAction, this.now());
    this.commit(record, next, clientActionId === undefined
      ? {}
      : { recentActionIds: [...record.recentActionIds, clientActionId].slice(-RECENT_ACTION_LIMIT) });
    return this.view(record, playerId);
  }

  /**
   * Leaving always revokes the seat token. In a lobby the seat disappears; mid-game it becomes
   * a skipped `left` seat; on a finished table it is excluded from a rematch.
   * Returns null when no seat is left and the room was closed.
   */
  leaveRoom(roomId: string, seatToken: string): RoomView | null {
    const record = this.requireRoom(roomId);
    const playerId = this.authenticateRecord(record, seatToken);
    const now = this.now();
    const next = record.state.status === 'lobby'
      ? removePlayerFromLobby(record.state, playerId, now)
      : record.state.status === 'playing'
        ? abandonGame(record.state, playerId, now)
        : leaveFinishedGame(record.state, playerId, now);
    const seatTokenHashes = withoutSeat(record.seatTokenHashes, playerId);
    if (Object.keys(seatTokenHashes).length === 0) {
      this.deleteRoom(roomId);
      return null;
    }
    this.commit(record, next, { seatTokenHashes });
    return this.view(record, null);
  }

  kickPlayer(roomId: string, seatToken: string, targetPlayerId: string): RoomView {
    const record = this.requireRoom(roomId);
    const hostId = this.authenticateRecord(record, seatToken);
    const next = kickPlayerFromLobby(record.state, hostId, targetPlayerId, this.now());
    this.commit(record, next, { seatTokenHashes: withoutSeat(record.seatTokenHashes, targetPlayerId) });
    return this.view(record, hostId);
  }

  rematch(roomId: string, seatToken: string): RoomView {
    const record = this.requireRoom(roomId);
    const hostId = this.authenticateRecord(record, seatToken);
    const next = returnToLobby(record.state, hostId, this.now());
    const remaining = new Set(next.players.map((player) => player.id));
    const seatTokenHashes = Object.fromEntries(Object.entries(record.seatTokenHashes).filter(([id]) => remaining.has(id)));
    this.commit(record, next, { seatTokenHashes });
    return this.view(record, hostId);
  }

  /**
   * Skips turns that have been idle longer than the timeout, so one absent device cannot
   * freeze the table. Like BGA, the server never plays a move on the player's behalf.
   * Returns the number of turns skipped.
   */
  expireIdleTurns(): number {
    if (this.turnTimeoutMs <= 0) {
      return 0;
    }
    let skipped = 0;
    const now = this.clock().getTime();
    for (const record of this.rooms.values()) {
      const { state } = record;
      if (state.status !== 'playing' || state.currentPlayerId === null) {
        continue;
      }
      // Snapshots from before turnStartedAt existed fall back to the last state change.
      const turnStartedAt = Date.parse(state.turnStartedAt ?? state.updatedAt);
      if (now - turnStartedAt < this.turnTimeoutMs) {
        continue;
      }
      this.commit(record, skipTurn(state, state.currentPlayerId, this.now()));
      skipped += 1;
    }
    return skipped;
  }

  /** Drops rooms that have been idle past their TTL. Returns the removed room ids. */
  sweepIdleRooms(): string[] {
    const now = this.clock().getTime();
    const removed: string[] = [];
    for (const { state } of [...this.rooms.values()]) {
      if (now - Date.parse(state.updatedAt) > this.idleTtlMs[state.status]) {
        this.deleteRoom(state.roomId);
        removed.push(state.roomId);
      }
    }
    return removed;
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  subscribe(listener: RoomListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private grantSeat(record: RoomRecord, playerName: string): SeatGrant {
    const playerId = createId('player');
    const seatToken = createSeatToken();
    const next = addPlayerToLobby(record.state, { id: playerId, name: playerName }, this.now());
    this.commit(record, next, { seatTokenHashes: { ...record.seatTokenHashes, [playerId]: hashToken(seatToken) } });
    return { room: this.view(record, playerId), playerId, seatToken };
  }

  /**
   * Persist first, then swap the in-memory record: if the write throws, memory still matches
   * the database and no client has seen a state that would vanish on restart.
   */
  private commit(record: RoomRecord, next: GameState, changes: RecordChanges = {}): void {
    next.version = record.state.version + 1;
    const updated: RoomRecord = { ...record, ...changes, state: next };
    this.repository.save(updated);
    Object.assign(record, updated);
    this.emit(next.roomId);
  }

  private deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.repository.delete(roomId);
    this.emit(roomId);
  }

  private authenticateRecord(record: RoomRecord, seatToken: string): string {
    const hash = hashToken(seatToken);
    const playerId = Object.entries(record.seatTokenHashes).find(([, stored]) => stored === hash)?.[0];
    if (playerId === undefined) {
      throw new SeatAuthError();
    }
    return playerId;
  }

  private requireRoom(roomId: string): RoomRecord {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      throw new RoomNotFoundError(roomId);
    }
    return record;
  }

  private view(record: RoomRecord, playerId: string | null): RoomView {
    return projectRoomView(record.state, playerId, MAX_PLAYERS);
  }

  private now(): string {
    return this.clock().toISOString();
  }

  private emit(roomId: string): void {
    for (const listener of this.listeners) {
      listener(roomId);
    }
  }
}

export function roomErrorStatus(error: unknown): number {
  if (error instanceof RoomNotFoundError) {
    return 404;
  }
  if (error instanceof SeatAuthError) {
    return 401;
  }
  if (error instanceof RoomLimitError) {
    return 503;
  }
  if (error instanceof GameRuleError) {
    return error.code === 'host_only' ? 403 : 409;
  }
  return 500;
}

function withoutSeat(hashes: Record<string, string>, playerId: string): Record<string, string> {
  return Object.fromEntries(Object.entries(hashes).filter(([id]) => id !== playerId));
}

function createSeatToken(): string {
  return randomBytes(24).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
