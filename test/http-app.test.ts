import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../src/config/config.js';
import { composeAppServices } from '../src/game/application/composition.js';
import { createHttpApp } from '../src/gateway/http/app.js';

function testApp(publicBasePath = '', maxRooms = 200) {
  const config: AppConfig = {
    http: { host: '127.0.0.1', port: 0, publicBasePath },
    storage: { databasePath: ':memory:' },
    rooms: { maxRooms, turnTimeoutMs: 0 },
  };
  const app = createHttpApp({ config, services: composeAppServices({ maxRooms }) });
  const call = async (method: string, path: string, options: { body?: unknown; raw?: string; token?: string } = {}) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (options.token !== undefined) {
      headers.authorization = `Bearer ${options.token}`;
    }
    const body = options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
    const response = await app.request(`${publicBasePath}${path}`, body === undefined ? { method, headers } : { method, headers, body });
    return { status: response.status, json: (await response.json()) as any };
  };
  return { app, call };
}

async function startedGame(call: ReturnType<typeof testApp>['call']) {
  const host = (await call('POST', '/v1/rooms', { body: { playerName: 'Ada' } })).json;
  const roomId = host.room.roomId as string;
  const guest = (await call('POST', `/v1/rooms/${roomId}/join`, { body: { playerName: 'Blaise' } })).json;
  const started = (await call('POST', `/v1/rooms/${roomId}/start`, { token: host.seatToken })).json;
  const current = started.currentPlayerId === host.playerId ? host : guest;
  const other = current === host ? guest : host;
  return { roomId, host, guest, current, other, started };
}

describe('http api', () => {
  it('returns a seat token only to the client that claimed the seat', async () => {
    const { call } = testApp();
    const created = await call('POST', '/v1/rooms', { body: { playerName: 'Ada', roomName: 'Friday table' } });
    expect(created.status).toBe(201);
    expect(created.json.seatToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(created.json.room.viewerPlayerId).toBe(created.json.playerId);

    const publicView = await call('GET', `/v1/rooms/${created.json.room.roomId}`);
    expect(publicView.status).toBe(200);
    expect(JSON.stringify(publicView.json)).not.toContain(created.json.seatToken);
    expect(publicView.json.viewerPlayerId).toBeNull();
  });

  it('maps client mistakes to 4xx codes instead of 500', async () => {
    const { call } = testApp();
    const { roomId, current, other } = await startedGame(call);

    expect((await call('POST', '/v1/rooms', { raw: '{not json' })).status).toBe(400);
    expect((await call('POST', '/v1/rooms', { body: { playerName: 'x'.repeat(200) } })).status).toBe(400);
    expect((await call('POST', `/v1/rooms/${roomId}/actions/take-tokens`, { token: current.seatToken, body: {} })).status).toBe(400);
    expect((await call('POST', `/v1/rooms/${roomId}/actions/fly`, { token: current.seatToken, body: {} })).status).toBe(400);
    expect((await call('POST', `/v1/rooms/${roomId}/actions/pass`)).status).toBe(401);
    expect((await call('POST', `/v1/rooms/${roomId}/actions/pass`, { token: 'forged' })).status).toBe(401);
    expect((await call('GET', '/v1/rooms/room_missing')).status).toBe(404);
    const wrongTurn = await call('POST', `/v1/rooms/${roomId}/actions/take-tokens`, {
      token: other.seatToken,
      body: { tokens: ['fire', 'water', 'grass'] },
    });
    expect(wrongTurn.status).toBe(409);
    expect(wrongTurn.json.error_code).toBeTypeOf('string');
    expect((await call('POST', `/v1/rooms/${roomId}/actions/pass`, { token: current.seatToken })).status).toBe(409);
    expect((await call('POST', '/v1/rooms', { raw: JSON.stringify({ playerName: 'a', pad: 'x'.repeat(20_000) }) })).status).toBe(413);
  });

  it('plays through the generic and typed action endpoints', async () => {
    const { call } = testApp();
    const { roomId, current, other, started } = await startedGame(call);

    const legal = await call('GET', `/v1/rooms/${roomId}/legal-actions`, { token: current.seatToken });
    expect(legal.status).toBe(200);
    expect(legal.json.actions.length).toBeGreaterThan(0);

    const first = await call('POST', `/v1/rooms/${roomId}/actions`, {
      token: current.seatToken,
      body: { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'], clientActionId: 'a1' },
    });
    expect(first.status).toBe(200);
    expect(first.json.version).toBe(started.version + 1);

    const second = await call('POST', `/v1/rooms/${roomId}/actions/reserve`, {
      token: other.seatToken,
      body: { source: { kind: 'deck', tier: 2 } },
    });
    expect(second.status).toBe(200);
    expect(second.json.players.find((p: any) => p.id === other.playerId).reserved[0].hidden).toBeUndefined();

    const seenByOpponent = await call('GET', `/v1/rooms/${roomId}`, { token: current.seatToken });
    expect(seenByOpponent.json.players.find((p: any) => p.id === other.playerId).reserved[0].hidden).toBe(true);
  });

  it('supports leave, kick and rematch', async () => {
    const { call } = testApp();
    const host = (await call('POST', '/v1/rooms', { body: { playerName: 'Ada' } })).json;
    const roomId = host.room.roomId;
    const guest = (await call('POST', `/v1/rooms/${roomId}/join`, { body: { playerName: 'Blaise' } })).json;
    expect((await call('POST', `/v1/rooms/${roomId}/kick`, { token: guest.seatToken, body: { playerId: host.playerId } })).status).toBe(403);
    const kicked = await call('POST', `/v1/rooms/${roomId}/kick`, { token: host.seatToken, body: { playerId: guest.playerId } });
    expect(kicked.json.players).toHaveLength(1);

    const again = (await call('POST', `/v1/rooms/${roomId}/join`, { body: { playerName: 'Blaise' } })).json;
    await call('POST', `/v1/rooms/${roomId}/start`, { token: host.seatToken });
    const left = await call('POST', `/v1/rooms/${roomId}/leave`, { token: again.seatToken });
    expect(left.json.room.status).toBe('finished');
    const rematch = await call('POST', `/v1/rooms/${roomId}/rematch`, { token: host.seatToken });
    expect(rematch.json.status).toBe('lobby');
  });

  it('honours the public base path and the room cap', async () => {
    const { call } = testApp('/play-abc', 1);
    expect((await call('GET', '/healthz')).json.publicBasePath).toBe('/play-abc');
    expect((await call('POST', '/v1/rooms', { body: { playerName: 'A' } })).status).toBe(201);
    expect((await call('POST', '/v1/rooms', { body: { playerName: 'B' } })).status).toBe(503);
  });
});
