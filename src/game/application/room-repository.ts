import type { GameState } from '../domain/types.js';

/**
 * Everything the server keeps about a room. Seat credentials live beside the game state,
 * never inside it, so they cannot leak through a projected view.
 */
export interface RoomRecord {
  state: GameState;
  /** playerId -> sha256(seatToken). The raw token is only ever returned to its owner. */
  seatTokenHashes: Record<string, string>;
  /** Recently applied client action ids, newest last, for idempotent retries. */
  recentActionIds: string[];
}

export interface RoomRepository {
  loadAll(): RoomRecord[];
  save(record: RoomRecord): void;
  delete(roomId: string): void;
}

export class InMemoryRoomRepository implements RoomRepository {
  private readonly records = new Map<string, RoomRecord>();

  loadAll(): RoomRecord[] {
    return [...this.records.values()].map((record) => structuredClone(record));
  }

  save(record: RoomRecord): void {
    this.records.set(record.state.roomId, structuredClone(record));
  }

  delete(roomId: string): void {
    this.records.delete(roomId);
  }
}
