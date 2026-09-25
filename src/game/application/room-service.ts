import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  abandonGame,
  addPlayerToLobby,
  applyGameAction,
  createLobbyState,
  kickPlayerFromLobby,
  MAX_PLAYERS,
  removePlayerFromLobby,
  returnToLobby,
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

export interface RoomServiceOptions {
  repository?: RoomRepository;
  maxRooms?: number;
  /** 0 disables automatic play for idle turns. */
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
    this.rooms.set(roomId, record);
    this.persist(record);
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

  applyAction(roomId: string, seatToken: string, command: ActionCommand, clientActionId?: string): RoomView {
    const record = this.requireRoom(roomId);
    const playerId = this.authenticateRecord(record, seatToken);
    if (clientActionId !== undefined && record.recentActionIds.includes(clientActionId)) {
      return this.view(record, playerId);
    }
    const next = applyGameAction(record.state, { ...command, playerId } as GameAction, this.now());
    if (clientActionId !== undefined) {
      record.recentActionIds = [...record.recentActionIds, clientActionId].slice(-RECENT_ACTION_LIMIT);
    }
    this.commit(record, next);
    return this.view(record, playerId);
  }

  /** Returns null when the last player left and the room was closed. */
  leaveRoom(roomId: string, seatToken: string): RoomView | null {
    const record = this.requireRoom(roomId);
    const playerId = this.authenticateRecord(record, seatToken);
    if (record.state.status === 'lobby') {
      const next = removePlayerFromLobby(record.state, playerId, this.now());
      delete record.seatTokenHashes[playerId];
      if (next.players.length === 0) {
        this.deleteRoom(roomId);
        return null;
      }
      this.commit(record, next);
    } else if (record.state.status === 'playing') {
      this.commit(record, abandonGame(record.state, playerId, this.now()));
    }
    return this.view(record, null);
  }

  kickPlayer(roomId: string, seatToken: string, targetPlayerId: string): RoomView {
    const record = this.requireRoom(roomId);
    const hostId = this.authenticateRecord(record, seatToken);
    const next = kickPlayerFromLobby(record.state, hostId, targetPlayerId, this.now());
    delete record.seatTokenHashes[targetPlayerId];
    this.commit(record, next);
    return this.view(record, hostId);
  }

  rematch(roomId: string, seatToken: string): RoomView {
    const record = this.requireRoom(roomId);
    const hostId = this.authenticateRecord(record, seatToken);
    const next = returnToLobby(record.state, hostId, this.now());
    const remaining = new Set(next.players.map((player) => player.id));
    record.seatTokenHashes = Object.fromEntries(Object.entries(record.seatTokenHashes).filter(([id]) => remaining.has(id)));
    this.commit(record, next);
    return this.view(record, hostId);
  }

  /**
   * Plays for players whose turn has been idle longer than the timeout, so one absent
   * device cannot freeze the table. Returns the number of turns auto-played.
   */
  expireIdleTurns(): number {
    if (this.turnTimeoutMs <= 0) {
      return 0;
    }
    let played = 0;
    const now = this.clock().getTime();
    for (const record of this.rooms.values()) {
      const { state } = record;
      if (state.status !== 'playing' || state.currentPlayerId === null) {
        continue;
      }
      if (now - Date.parse(state.updatedAt) < this.turnTimeoutMs) {
        continue;
      }
      const action = pickTimeoutAction(listLegalGameActions(state, state.currentPlayerId));
      if (action === undefined) {
        continue;
      }
      this.commit(record, applyGameAction(state, action, this.now()));
      played += 1;
    }
    return played;
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
    record.seatTokenHashes[playerId] = hashToken(seatToken);
    this.commit(record, next);
    return { room: this.view(record, playerId), playerId, seatToken };
  }

  private commit(record: RoomRecord, next: GameState): void {
    next.version = record.state.version + 1;
    record.state = next;
    this.persist(record);
  }

  private persist(record: RoomRecord): void {
    this.repository.save(record);
    this.emit(record.state.roomId);
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

/** Prefer a harmless token take on timeout; fall back to whatever is legal (including pass). */
function pickTimeoutAction(legal: LegalGameActionList): GameAction | undefined {
  const take = legal.actions.find((option) => option.kind === 'take_tokens');
  return (take ?? legal.actions.find((option) => option.kind === 'pass_turn') ?? legal.actions[0])?.action;
}

function createSeatToken(): string {
  return randomBytes(24).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
