export interface AppConfig {
  http: {
    host: string;
    port: number;
  };
}

export function loadConfig(): AppConfig {
  return {
    http: {
      host: process.env.SPLENDOR_HTTP_HOST ?? '127.0.0.1',
      port: parsePort(process.env.SPLENDOR_HTTP_PORT, 19988),
    },
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
