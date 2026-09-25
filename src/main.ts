import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { loadConfig } from './config/config.js';
import { composeAppServices } from './game/application/composition.js';
import { SqliteRoomRepository } from './game/infrastructure/sqlite-room-repository.js';
import { createHttpApp } from './gateway/http/app.js';
import { RoomWebSocketHub } from './gateway/ws/room-ws-hub.js';

const TURN_TIMEOUT_CHECK_MS = 5_000;
const ROOM_SWEEP_INTERVAL_MS = 10 * 60_000;

const config = loadConfig();
const repository = new SqliteRoomRepository(config.storage.databasePath);
const services = composeAppServices({
  repository,
  maxRooms: config.rooms.maxRooms,
  turnTimeoutMs: config.rooms.turnTimeoutMs,
});
const app = createHttpApp({ config, services });
const wsHub = new RoomWebSocketHub(services.rooms, config.http.publicBasePath);

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.http.host,
    port: config.http.port,
  },
  (info) => {
    console.log(`Splendor Monsters TS listening on http://${info.address}:${info.port}`);
    console.log(`Dashboard: http://localhost:${info.port}${config.http.publicBasePath || '/'}`);
    console.log(`Room storage: ${config.storage.databasePath}`);
  },
) as Server;

wsHub.attach(server);

const timers = [
  setInterval(() => services.rooms.expireIdleTurns(), TURN_TIMEOUT_CHECK_MS),
  setInterval(() => services.rooms.sweepIdleRooms(), ROOM_SWEEP_INTERVAL_MS),
];

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down.`);
  timers.forEach(clearInterval);
  wsHub.close();
  server.close(() => {
    repository.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
