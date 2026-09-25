import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { RoomService } from '../../game/application/room-service.js';
import { asJsonObject, optionalClientActionId, parseActionCommand, RequestValidationError, stringField } from '../protocol/action-dto.js';
import { describeError } from '../protocol/errors.js';

/**
 * Room push channel. Every socket starts as a spectator and may upgrade itself with
 * `{ type: 'auth', seatToken }` (tokens never go in the URL, so they stay out of proxy logs).
 *
 * Client -> server: auth | action | ping
 * Server -> client: room_state | auth_ok | action_result | room_closed | pong | error
 */
interface RoomSocket {
  roomId: string;
  socket: WebSocket;
  seatToken: string | null;
  playerId: string | null;
  alive: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_MESSAGE_BYTES = 16 * 1024;

export class RoomWebSocketHub {
  private readonly sockets = new Set<RoomSocket>();
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly rooms: RoomService,
    private readonly publicBasePath = '',
  ) {
    this.rooms.subscribe((roomId) => this.broadcastRoom(roomId));
  }

  attach(server: Server): void {
    server.on('upgrade', (request, socket, head) => {
      const roomId = parseRoomId(request, this.publicBasePath);
      if (roomId === null) {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.register(roomId, ws);
      });
    });
    this.heartbeat = setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL_MS);
    this.heartbeat.unref();
  }

  close(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
    }
    for (const entry of this.sockets) {
      entry.socket.close(1001, 'server shutting down');
    }
    this.wss.close();
  }

  /** Player ids with at least one open socket in the room. */
  onlinePlayerIds(roomId: string): string[] {
    const online = new Set<string>();
    for (const entry of this.sockets) {
      if (entry.roomId === roomId && entry.playerId !== null && entry.socket.readyState === WebSocket.OPEN) {
        online.add(entry.playerId);
      }
    }
    return [...online];
  }

  private register(roomId: string, socket: WebSocket): void {
    if (!this.rooms.hasRoom(roomId)) {
      send(socket, { type: 'error', error_code: 'room_not_found', error: `Room not found: ${roomId}` });
      socket.close(4404, 'room not found');
      return;
    }
    const entry: RoomSocket = { roomId, socket, seatToken: null, playerId: null, alive: true };
    this.sockets.add(entry);
    socket.on('pong', () => {
      entry.alive = true;
    });
    socket.on('message', (data) => this.handleMessage(entry, data));
    socket.on('close', () => this.unregister(entry));
    socket.on('error', () => {
      this.unregister(entry);
      socket.terminate();
    });
    this.sendState(entry);
  }

  private unregister(entry: RoomSocket): void {
    if (!this.sockets.delete(entry)) {
      return;
    }
    if (entry.playerId !== null && this.rooms.hasRoom(entry.roomId)) {
      this.broadcastRoom(entry.roomId);
    }
  }

  private handleMessage(entry: RoomSocket, data: RawData): void {
    entry.alive = true;
    let requestId: string | undefined;
    try {
      const message = asJsonObject(JSON.parse(rawToString(data)), 'WebSocket message');
      requestId = typeof message.requestId === 'string' ? message.requestId.slice(0, 64) : undefined;
      if (message.type === 'ping') {
        send(entry.socket, { type: 'pong', requestId });
        return;
      }
      if (message.type === 'auth') {
        const seatToken = stringField(message, 'seatToken');
        entry.playerId = this.rooms.authenticate(entry.roomId, seatToken);
        entry.seatToken = seatToken;
        send(entry.socket, { type: 'auth_ok', requestId, playerId: entry.playerId });
        // Presence changed for everyone; the new viewer also gets its personalised view.
        this.broadcastRoom(entry.roomId);
        return;
      }
      if (message.type === 'action') {
        if (entry.seatToken === null) {
          throw new RequestValidationError('Send { type: "auth", seatToken } before submitting actions.', 'not_authenticated');
        }
        const command = parseActionCommand(asJsonObject(message.action, 'action'));
        const room = this.rooms.applyAction(entry.roomId, entry.seatToken, command, optionalClientActionId(message));
        send(entry.socket, { type: 'action_result', requestId, ok: true, version: room.version });
        return;
      }
      throw new RequestValidationError('Unknown message type.', 'invalid_message_type');
    } catch (error) {
      const { body } = describeError(error);
      send(entry.socket, { type: requestId === undefined ? 'error' : 'action_result', requestId, ok: false, ...body });
    }
  }

  private broadcastRoom(roomId: string): void {
    const closed = !this.rooms.hasRoom(roomId);
    for (const entry of this.sockets) {
      if (entry.roomId !== roomId) {
        continue;
      }
      if (closed) {
        send(entry.socket, { type: 'room_closed', roomId });
        entry.socket.close(4410, 'room closed');
        continue;
      }
      this.sendState(entry);
    }
  }

  private sendState(entry: RoomSocket): void {
    if (entry.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      const room = this.rooms.viewFor(entry.roomId, entry.playerId);
      send(entry.socket, { type: 'room_state', room, onlinePlayerIds: this.onlinePlayerIds(entry.roomId) });
    } catch (error) {
      send(entry.socket, { type: 'error', ...describeError(error).body });
    }
  }

  private checkHeartbeats(): void {
    for (const entry of this.sockets) {
      if (!entry.alive) {
        entry.socket.terminate();
        continue;
      }
      entry.alive = false;
      entry.socket.ping();
    }
  }
}

function send(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function rawToString(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }
  return Buffer.from(data as ArrayBuffer).toString('utf8');
}

function parseRoomId(request: IncomingMessage, publicBasePath: string): string | null {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const escapedBasePath = escapeRegExp(publicBasePath);
  const match = new RegExp(`^${escapedBasePath}/ws/rooms/([^/]+)$`).exec(url.pathname);
  return match?.[1] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
