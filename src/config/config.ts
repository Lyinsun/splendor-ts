export interface AppConfig {
  http: {
    host: string;
    port: number;
    publicBasePath: string;
  };
  storage: {
    /** SQLite file for room snapshots; ':memory:' keeps rooms in-process only. */
    databasePath: string;
  };
  rooms: {
    maxRooms: number;
    /** Auto-play a turn after this many ms of inactivity; 0 disables. */
    turnTimeoutMs: number;
  };
}

export function loadConfig(): AppConfig {
  return {
    http: {
      host: process.env.SPLENDOR_HTTP_HOST ?? '127.0.0.1',
      port: parsePositiveInt(process.env.SPLENDOR_HTTP_PORT, 19988),
      publicBasePath: normalizePublicBasePath(process.env.SPLENDOR_PUBLIC_BASE_PATH),
    },
    storage: {
      databasePath: process.env.SPLENDOR_DB_PATH?.trim() || 'data/splendor.db',
    },
    rooms: {
      maxRooms: parsePositiveInt(process.env.SPLENDOR_MAX_ROOMS, 200),
      turnTimeoutMs: parseNonNegativeInt(process.env.SPLENDOR_TURN_TIMEOUT_SEC, 0) * 1000,
    },
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizePublicBasePath(value: string | undefined): string {
  if (value === undefined) {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '/') {
    return '';
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
}
