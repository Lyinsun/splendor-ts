import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { loadConfig } from './config/config.js';
import { composeAppServices } from './game/application/composition.js';
import { RoomWebSocketHub } from './game/infrastructure/room-ws-hub.js';
import { createHttpApp } from './gateway/http/app.js';

const config = loadConfig();
const services = composeAppServices();
const app = createHttpApp({ config, services });
const wsHub = new RoomWebSocketHub(services.rooms);

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.http.host,
    port: config.http.port,
  },
  (info) => {
    console.log(`Splendor Monsters TS listening on http://${info.address}:${info.port}`);
    console.log(`Dashboard: http://localhost:${info.port}/`);
  },
) as Server;

wsHub.attach(server);
