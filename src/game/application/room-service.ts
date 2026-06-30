import {
  addPlayerToLobby,
  applyGameAction,
  createLobbyState,
  startGame,
  type LobbyPlayerInput,
} from '../domain/engine.js';
import { GameRuleError, type GameAction, type GameState } from '../domain/types.js';
import { createId } from '../../shared/ids.js';

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

export interface CreateRoomResult {
  room: GameState;
  playerId: string;
}

export interface JoinRoomResult {
  room: GameState;
  playerId: string;
}

export class RoomNotFoundError extends Error {
  constructor(readonly roomId: string) {
    super(`Room not found: ${roomId}`);
    this.name = 'RoomNotFoundError';
  }
}

export type RoomListener = (room: GameState) => void;

export class RoomService {
  private readonly rooms = new Map<string, GameState>();
  private readonly listeners = new Set<RoomListener>();

  createRoom(input: { playerName: string; roomName?: string }): CreateRoomResult {
    const roomId = createId('room');
    const playerId = createId('player');
    const host: LobbyPlayerInput = {
      id: playerId,
      name: input.playerName,
    };
    const room = createLobbyState(roomId, input.roomName?.trim() || `${host.name || 'Trainer'}'s table`, host);
    this.rooms.set(roomId, room);
    this.emit(room);
    return { room: clone(room), playerId };
  }

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .map((room) => ({
        roomId: room.roomId,
        roomName: room.roomName,
        status: room.status,
        players: room.players.length,
        maxPlayers: 4,
        turn: room.turn,
        round: room.round,
        updatedAt: room.updatedAt,
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getRoom(roomId: string): GameState {
    return clone(this.requireRoom(roomId));
  }

  joinRoom(roomId: string, playerName: string): JoinRoomResult {
    const playerId = createId('player');
    const room = addPlayerToLobby(this.requireRoom(roomId), { id: playerId, name: playerName });
    this.rooms.set(roomId, room);
    this.emit(room);
    return { room: clone(room), playerId };
  }

  addDemoPlayer(roomId: string): JoinRoomResult {
    const room = this.requireRoom(roomId);
    const demoNumber = room.players.length + 1;
    return this.joinRoom(roomId, `Demo Trainer ${demoNumber}`);
  }

  startRoom(roomId: string, playerId: string): GameState {
    const room = startGame(this.requireRoom(roomId), playerId);
    this.rooms.set(roomId, room);
    this.emit(room);
    return clone(room);
  }

  applyAction(roomId: string, action: GameAction): GameState {
    const room = applyGameAction(this.requireRoom(roomId), action);
    this.rooms.set(roomId, room);
    this.emit(room);
    return clone(room);
  }

  subscribe(listener: RoomListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private requireRoom(roomId: string): GameState {
    const room = this.rooms.get(roomId);
    if (room === undefined) {
      throw new RoomNotFoundError(roomId);
    }
    return room;
  }

  private emit(room: GameState): void {
    const snapshot = clone(room);
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export function roomErrorStatus(error: unknown): number {
  if (error instanceof RoomNotFoundError) {
    return 404;
  }
  if (error instanceof GameRuleError) {
    return 409;
  }
  return 500;
}

function clone<T>(value: T): T {
  return structuredClone(value) as T;
}
