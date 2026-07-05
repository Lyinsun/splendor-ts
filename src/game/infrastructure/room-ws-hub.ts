import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import type { RoomService } from '../application/room-service.js';
import type { GameState } from '../domain/types.js';

interface RoomSocket {
  roomId: string;
  socket: WebSocket;
}

export class RoomWebSocketHub {
  private readonly sockets = new Set<RoomSocket>();
  private readonly wss = new WebSocketServer({ noServer: true });

  constructor(
    private readonly rooms: RoomService,
    private readonly publicBasePath = '',
  ) {
    this.rooms.subscribe((room) => this.broadcastRoom(room));
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
  }

  private register(roomId: string, socket: WebSocket): void {
    const entry: RoomSocket = { roomId, socket };
    this.sockets.add(entry);
    socket.on('close', () => {
      this.sockets.delete(entry);
    });
    socket.on('error', () => {
      this.sockets.delete(entry);
      socket.close();
    });
    try {
      const room = this.rooms.getRoom(roomId);
      socket.send(JSON.stringify({ type: 'room_state', room }));
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : String(error) }));
      socket.close(1008);
    }
  }

  private broadcastRoom(room: GameState): void {
    const payload = JSON.stringify({ type: 'room_state', room });
    for (const entry of this.sockets) {
      if (entry.roomId === room.roomId && entry.socket.readyState === WebSocket.OPEN) {
        entry.socket.send(payload);
      }
    }
  }
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
