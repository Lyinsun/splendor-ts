import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import type { Context, MiddlewareHandler } from 'hono';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
// Overridable so a staging build can be served without touching the live dist/dashboard.
const dashboardDist = path.resolve(projectRoot, process.env.SPLENDOR_DASHBOARD_DIST?.trim() || 'dist/dashboard');
const projectAssetsRoot = path.join(projectRoot, 'assets/splendor-monsters');

export async function dashboardIndexHtml(publicBasePath = ''): Promise<string> {
  const indexPath = path.join(dashboardDist, 'index.html');
  try {
    return prepareIndexHtml(await readFile(indexPath, 'utf8'), publicBasePath);
  } catch {
    return prepareIndexHtml(`<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Splendor Monsters TS</title></head>
  <body>
    <main style="font-family: system-ui; padding: 32px; max-width: 720px;">
      <h1>Dashboard build missing</h1>
      <p>Run <code>npm run build:dashboard</code>, then restart the server.</p>
    </main>
  </body>
</html>`, publicBasePath);
  }
}

export function createDashboardAssetHandler(publicBasePath = ''): MiddlewareHandler {
  return async (c) => {
    const relativePath = routeRelativePath(c, joinRoute(publicBasePath, '/dashboard-assets/'));
    return serveFile(c, dashboardDist, relativePath);
  };
}

export function createSplendorAssetHandler(publicBasePath = ''): MiddlewareHandler {
  return async (c) => {
    const relativePath = routeRelativePath(c, joinRoute(publicBasePath, '/assets/splendor-monsters/'));
    return serveFile(c, projectAssetsRoot, relativePath);
  };
}

export const serveDashboardAsset: MiddlewareHandler = async (c) => {
  const relativePath = routeRelativePath(c, '/dashboard-assets/');
  return serveFile(c, dashboardDist, relativePath);
};

export const serveSplendorAsset: MiddlewareHandler = async (c) => {
  const relativePath = routeRelativePath(c, '/assets/splendor-monsters/');
  return serveFile(c, projectAssetsRoot, relativePath);
};

function prepareIndexHtml(html: string, publicBasePath: string): string {
  const normalizedBase = publicBasePath === '/' ? '' : publicBasePath;
  const runtimeConfig = `<script>window.__SPLENDOR_PUBLIC_BASE_PATH__=${JSON.stringify(normalizedBase)};</script>`;
  const withRuntimeConfig = html.includes('</head>')
    ? html.replace('</head>', `    ${runtimeConfig}\n  </head>`)
    : `${runtimeConfig}\n${html}`;
  if (normalizedBase === '') {
    return withRuntimeConfig;
  }
  return withRuntimeConfig
    .replaceAll('"/dashboard-assets/', `"${normalizedBase}/dashboard-assets/`)
    .replaceAll("'/dashboard-assets/", `'${normalizedBase}/dashboard-assets/`);
}

async function serveFile(c: Context, root: string, relativePath: string | null): Promise<Response> {
  const safePath = relativePath === null ? null : safeJoin(root, relativePath);
  if (safePath === null) {
    return c.text('Not found', 404);
  }
  try {
    const fileStat = await stat(safePath);
    if (!fileStat.isFile()) {
      return c.text('Not found', 404);
    }
    const headers = new Headers();
    headers.set('Content-Type', contentType(safePath));
    headers.set('Cache-Control', 'public, max-age=3600');
    const body = Readable.toWeb(createReadStream(safePath)) as ReadableStream;
    return new Response(body, { headers });
  } catch {
    return c.text('Not found', 404);
  }
}

/** Null for malformed percent-encoding (e.g. `%E0%A4%A`), which is a 404 rather than a server error. */
function routeRelativePath(c: Context, prefix: string): string | null {
  const pathname = new URL(c.req.url).pathname;
  const raw = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  try {
    return decodeURIComponent(raw || 'index.html');
  } catch {
    return null;
  }
}

function joinRoute(publicBasePath: string, route: string): string {
  return `${publicBasePath}${route}`;
}

function safeJoin(root: string, relativePath: string): string | null {
  if (relativePath.includes('\0')) {
    return null;
  }
  const resolved = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    return null;
  }
  return resolved;
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
