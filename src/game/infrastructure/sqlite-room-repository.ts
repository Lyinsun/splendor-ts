import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { RoomRecord, RoomRepository } from '../application/room-repository.js';

/**
 * Snapshot persistence on Node's built-in SQLite. Each room is one row holding the full
 * record as JSON; writes are synchronous so a snapshot is durable before it is broadcast.
 */
export class SqliteRoomRepository implements RoomRepository {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        record_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  loadAll(): RoomRecord[] {
    const rows = this.db.prepare('SELECT record_json FROM rooms').all() as Array<{ record_json: string }>;
    return rows.map((row) => JSON.parse(row.record_json) as RoomRecord);
  }

  save(record: RoomRecord): void {
    this.db
      .prepare(`
        INSERT INTO rooms (room_id, record_json, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(room_id) DO UPDATE SET record_json = excluded.record_json, updated_at = excluded.updated_at
      `)
      .run(record.state.roomId, JSON.stringify(record), record.state.updatedAt);
  }

  delete(roomId: string): void {
    this.db.prepare('DELETE FROM rooms WHERE room_id = ?').run(roomId);
  }

  close(): void {
    this.db.close();
  }
}
