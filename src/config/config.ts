export interface AppConfig {
  http: {
    host: string;
    port: number;
    publicBasePath: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    http: {
      host: process.env.SPLENDOR_HTTP_HOST ?? '127.0.0.1',
      port: parsePort(process.env.SPLENDOR_HTTP_PORT, 19988),
      publicBasePath: normalizePublicBasePath(process.env.SPLENDOR_PUBLIC_BASE_PATH),
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
