declare global {
  interface Window {
    __SPLENDOR_PUBLIC_BASE_PATH__?: string;
  }
}

export function publicUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${publicBasePath()}${suffix}`;
}

export function publicWsUrl(path: string): string {
  const suffix = publicUrl(path);
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${suffix}`;
}

export function publicBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return normalizePublicBasePath(window.__SPLENDOR_PUBLIC_BASE_PATH__);
}

function normalizePublicBasePath(value: string | undefined): string {
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
