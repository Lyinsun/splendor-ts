import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { AppConfig } from '../src/config/config.js';
import { composeAppServices } from '../src/game/application/composition.js';
import type { LegalGameActionOption } from '../src/game/domain/legal-actions.js';
import { createHttpApp } from '../src/gateway/http/app.js';
import { RoomWebSocketHub } from '../src/gateway/ws/room-ws-hub.js';

type Message = Record<string, any>;

/** Minimal test client: records every message and lets tests wait for a matching one. */
class Client {
  readonly messages: Message[] = [];
  private waiters: Array<{ match: (m: Message) => boolean; resolve: (m: Message) => void }> = [];
  closeCode: number | null = null;

  private constructor(readonly socket: WebSocket) {
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as Message;
      this.messages.push(message);
      this.waiters = this.waiters.filter((w) => {
        if (w.match(message)) {
          w.resolve(message);
          return false;
        }
        return true;
      });
    });
    socket.on('close', (code) => {
      this.closeCode = code;
    });
  }

  static async connect(url: string): Promise<Client> {
    const socket = new WebSocket(url);
    const client = new Client(socket);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    return client;
  }

  latestState(): Message | undefined {
    return [...this.messages].reverse().find((m) => m.type === 'room_state');
  }

  waitFor(match: (m: Message) => boolean, timeoutMs = 2000): Promise<Message> {
    const existing = this.messages.find(match);
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for message')), timeoutMs);
      this.waiters.push({ match, resolve: (m) => { clearTimeout(timer); resolve(m); } });
    });
  }

  waitForVersion(version: number): Promise<Message> {
    return this.waitFor((m) => m.type === 'room_state' && m.room.version >= version);
  }

  send(payload: Message): void {
    this.socket.send(JSON.stringify(payload));
  }

  close(): void {
    this.socket.close();
  }
}

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

async function startServer() {
  const config: AppConfig = {
    http: { host: '127.0.0.1', port: 0, publicBasePath: '' },
    storage: { databasePath: ':memory:' },
    rooms: { maxRooms: 50, turnTimeoutMs: 0 },
  };
  const services = composeAppServices();
  const app = createHttpApp({ config, services });
  const hub = new RoomWebSocketHub(services.rooms);
  const server = await new Promise<Server>((resolve) => {
    const s = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, () => resolve(s as Server)) as Server;
  });
  hub.attach(server);
  cleanups.push(() => {
    hub.close();
    server.close();
  });
  const { port } = server.address() as AddressInfo;
  const http = async (method: string, path: string, body?: unknown, token?: string) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token !== undefined) {
      headers.authorization = `Bearer ${token}`;
    }
    const init: RequestInit = body === undefined ? { method, headers } : { method, headers, body: JSON.stringify(body) };
    const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return response.json() as Promise<any>;
  };
  const connect = async (roomId: string, seatToken?: string) => {
    const client = await Client.connect(`ws://127.0.0.1:${port}/ws/rooms/${roomId}`);
    cleanups.push(() => client.close());
    if (seatToken !== undefined) {
      client.send({ type: 'auth', requestId: 'auth', seatToken });
      await client.waitFor((m) => m.type === 'auth_ok' || m.ok === false);
    }
    return client;
  };
  return { http, connect, port };
}

/** Greedy bot: buy the best card, else take tokens, else reserve, else pass. */
function pickAction(actions: LegalGameActionOption[]): LegalGameActionOption {
  const buys = actions.filter((a) => a.kind === 'buy_card');
  if (buys.length > 0) {
    return buys[buys.length - 1]!;
  }
  return actions.find((a) => a.kind === 'take_tokens') ?? actions.find((a) => a.kind === 'reserve_card') ?? actions[0]!;
}

describe('websocket multi-device sync', () => {
  it('rejects unknown rooms and bad seat tokens', async () => {
    const { connect, http } = await startServer();
    const ghost = await connect('room_missing');
    await ghost.waitFor((m) => m.error_code === 'room_not_found');
    await new Promise((r) => setTimeout(r, 50));
    expect(ghost.closeCode).toBe(4404);

    const host = await http('POST', '/v1/rooms', { playerName: 'Ada' });
    const client = await connect(host.room.roomId);
    client.send({ type: 'auth', requestId: 'a', seatToken: 'forged' });
    const reply = await client.waitFor((m) => m.requestId === 'a');
    expect(reply).toMatchObject({ ok: false, error_code: 'invalid_seat_token' });
    client.send({ type: 'action', requestId: 'b', action: { kind: 'pass_turn' } });
    expect(await client.waitFor((m) => m.requestId === 'b')).toMatchObject({ ok: false, error_code: 'not_authenticated' });
    client.send({ type: 'ping', requestId: 'c' });
    expect(await client.waitFor((m) => m.requestId === 'c')).toMatchObject({ type: 'pong' });
  });

  it('keeps two players, a second device and a spectator in sync for a full game', async () => {
    const { http, connect } = await startServer();
    const host = await http('POST', '/v1/rooms', { playerName: 'Ada' });
    const roomId = host.room.roomId as string;
    const guest = await http('POST', `/v1/rooms/${roomId}/join`, { playerName: 'Blaise' });

    const hostPhone = await connect(roomId, host.seatToken);
    const hostLaptop = await connect(roomId, host.seatToken);
    const guestClient = await connect(roomId, guest.seatToken);
    const spectator = await connect(roomId);
    const all = [hostPhone, hostLaptop, guestClient, spectator];

    const presence = await spectator.waitFor((m) => m.type === 'room_state' && m.onlinePlayerIds.length === 2);
    expect(new Set(presence.onlinePlayerIds)).toEqual(new Set([host.playerId, guest.playerId]));

    const started = await http('POST', `/v1/rooms/${roomId}/start`, undefined, host.seatToken);
    await Promise.all(all.map((c) => c.waitForVersion(started.version)));

    const seats = new Map<string, { token: string; clients: Client[] }>([
      [host.playerId, { token: host.seatToken, clients: [hostPhone, hostLaptop] }],
      [guest.playerId, { token: guest.seatToken, clients: [guestClient] }],
    ]);

    let version = started.version as number;
    let status = started.status as string;
    let currentPlayerId = started.currentPlayerId as string;
    let steps = 0;
    while (status === 'playing' && steps < 400) {
      const seat = seats.get(currentPlayerId)!;
      const legal = await http('GET', `/v1/rooms/${roomId}/legal-actions`, undefined, seat.token);
      const { playerId: _ignored, ...action } = pickAction(legal.actions).action;
      // Alternate between the host's two devices to prove either device can act.
      const device = seat.clients[steps % seat.clients.length]!;
      const requestId = `r${steps}`;
      device.send({ type: 'action', requestId, clientActionId: `c${steps}`, action });
      const result = await device.waitFor((m) => m.requestId === requestId);
      expect(result.ok, JSON.stringify(result)).toBe(true);
      version = result.version;

      const states = await Promise.all(all.map((c) => c.waitForVersion(version)));
      const [reference] = states;
      for (const state of states) {
        expect(state.room.version).toBe(version);
        expect(state.room.currentPlayerId).toBe(reference!.room.currentPlayerId);
        expect(state.room.board.bank).toEqual(reference!.room.board.bank);
        expect(state.room.players.map((p: any) => p.score)).toEqual(reference!.room.players.map((p: any) => p.score));
      }
      status = reference!.room.status;
      currentPlayerId = reference!.room.currentPlayerId;
      steps += 1;
    }

    expect(status).toBe('finished');
    const finalView = spectator.latestState()!.room;
    expect(finalView.winnerIds.length).toBeGreaterThan(0);
    // Spectators never see face-down reservations or deck contents.
    expect(JSON.stringify(finalView)).not.toContain('"decks"');
    for (const player of finalView.players) {
      for (const card of player.reserved) {
        if ('hidden' in card) {
          expect(Object.keys(card).sort()).toEqual(['hidden', 'id', 'tier']);
        }
      }
    }

    // Replaying a clientActionId is idempotent over the socket too.
    const snapshotVersion = spectator.latestState()!.room.version;
    hostPhone.send({ type: 'action', requestId: 'dup', clientActionId: 'c0', action: { kind: 'pass_turn' } });
    expect(await hostPhone.waitFor((m) => m.requestId === 'dup')).toMatchObject({ ok: true, version: snapshotVersion });
  });

  it('revokes a kicked seat on its open sockets and drops it from presence', async () => {
    const { http, connect } = await startServer();
    const host = await http('POST', '/v1/rooms', { playerName: 'Ada' });
    const roomId = host.room.roomId as string;
    const guest = await http('POST', `/v1/rooms/${roomId}/join`, { playerName: 'Blaise' });
    const hostClient = await connect(roomId, host.seatToken);
    const guestClient = await connect(roomId, guest.seatToken);
    await hostClient.waitFor((m) => m.type === 'room_state' && m.onlinePlayerIds.length === 2);

    const kicked = await http('POST', `/v1/rooms/${roomId}/kick`, { playerId: guest.playerId }, host.seatToken);
    expect(kicked.players).toHaveLength(1);

    expect(await guestClient.waitFor((m) => m.type === 'seat_revoked')).toMatchObject({ roomId, playerId: guest.playerId });
    // The revoked socket keeps receiving the room, now as a spectator.
    const revokedAt = guestClient.messages.findIndex((m) => m.type === 'seat_revoked');
    await guestClient.waitFor((m) => m.type === 'room_state' && guestClient.messages.indexOf(m) > revokedAt);
    const spectatorView = guestClient.messages.slice(revokedAt).find((m) => m.type === 'room_state')!;
    expect(spectatorView.room.viewerPlayerId).toBeNull();
    expect(spectatorView.room.players).toHaveLength(1);
    const hostView = await hostClient.waitFor((m) => m.type === 'room_state' && m.room.players.length === 1);
    expect(hostView.onlinePlayerIds).toEqual([host.playerId]);

    guestClient.send({ type: 'action', requestId: 'after-kick', action: { kind: 'pass_turn' } });
    expect(await guestClient.waitFor((m) => m.requestId === 'after-kick')).toMatchObject({ ok: false, error_code: 'not_authenticated' });
  });

  it('rejects a stale expectedVersion over the socket but replays a known clientActionId', async () => {
    const { http, connect } = await startServer();
    const host = await http('POST', '/v1/rooms', { playerName: 'Ada' });
    const roomId = host.room.roomId as string;
    await http('POST', `/v1/rooms/${roomId}/join`, { playerName: 'Blaise' });
    const started = await http('POST', `/v1/rooms/${roomId}/start`, undefined, host.seatToken);
    const hostClient = await connect(roomId, host.seatToken);
    const action = { kind: 'take_tokens', tokens: ['fire', 'water', 'grass'] };

    hostClient.send({ type: 'action', requestId: 'r1', action, clientActionId: 'm1', expectedVersion: started.version });
    expect(await hostClient.waitFor((m) => m.requestId === 'r1')).toMatchObject({ ok: true, version: started.version + 1 });
    hostClient.send({ type: 'action', requestId: 'r2', action, clientActionId: 'm1', expectedVersion: started.version });
    expect(await hostClient.waitFor((m) => m.requestId === 'r2')).toMatchObject({ ok: true, version: started.version + 1 });
    hostClient.send({ type: 'action', requestId: 'r3', action, clientActionId: 'm2', expectedVersion: started.version });
    expect(await hostClient.waitFor((m) => m.requestId === 'r3')).toMatchObject({ ok: false, error_code: 'stale_state' });
  });

  it('updates presence when a device disconnects and closes sockets when the room is removed', async () => {
    const { http, connect } = await startServer();
    const host = await http('POST', '/v1/rooms', { playerName: 'Ada' });
    const roomId = host.room.roomId as string;
    const guest = await http('POST', `/v1/rooms/${roomId}/join`, { playerName: 'Blaise' });
    const hostClient = await connect(roomId, host.seatToken);
    const guestClient = await connect(roomId, guest.seatToken);
    await hostClient.waitFor((m) => m.type === 'room_state' && m.onlinePlayerIds.length === 2);

    guestClient.close();
    await hostClient.waitFor((m) => m.type === 'room_state' && m.onlinePlayerIds.length === 1);

    await http('POST', `/v1/rooms/${roomId}/leave`, undefined, guest.seatToken);
    await http('POST', `/v1/rooms/${roomId}/leave`, undefined, host.seatToken);
    await hostClient.waitFor((m) => m.type === 'room_closed');
    await new Promise((r) => setTimeout(r, 50));
    expect(hostClient.closeCode).toBe(4410);
  });
});
