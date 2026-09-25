import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppConfig } from '../../config/config.js';
import type { AppServices } from '../../game/application/composition.js';
import { SeatAuthError } from '../../game/application/room-service.js';
import {
  asJsonObject,
  displayNameField,
  optionalClientActionId,
  optionalDisplayNameField,
  parseActionCommand,
  PLAYER_NAME_MAX_LENGTH,
  RequestValidationError,
  ROOM_NAME_MAX_LENGTH,
  stringField,
  type ActionKind,
  type JsonObject,
} from '../protocol/action-dto.js';
import { describeError } from '../protocol/errors.js';
import { createDashboardAssetHandler, createSplendorAssetHandler, dashboardIndexHtml } from './dashboard-static.js';

export interface HttpAppDependencies {
  config: AppConfig;
  services: AppServices;
}

const MAX_BODY_BYTES = 16 * 1024;

/** Typed action endpoints kept for simple clients; `POST /actions` accepts any kind in the body. */
const ACTION_ROUTES: Record<string, ActionKind> = {
  'take-tokens': 'take_tokens',
  reserve: 'reserve_card',
  buy: 'buy_card',
  pass: 'pass_turn',
};

export function createHttpApp(deps: HttpAppDependencies) {
  const app = new Hono();
  const rooms = deps.services.rooms;
  const basePath = deps.config.http.publicBasePath;
  const route = (path: string) => `${basePath}${path}`;

  app.onError((error, c) => {
    const { status, body } = describeError(error);
    return c.json(body, status as 400);
  });
  app.notFound((c) => c.json({ error_code: 'not_found', error: 'Route not found.' }, 404));

  app.use(route('/v1/*'), bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => c.json({ error_code: 'body_too_large', error: `Request body must be at most ${MAX_BODY_BYTES} bytes.` }, 413),
  }));
  app.use(route('/dashboard-assets/*'), createDashboardAssetHandler(basePath));
  app.use(route('/assets/splendor-monsters/*'), createSplendorAssetHandler(basePath));

  app.get(route('/'), async (c) => c.html(await dashboardIndexHtml(basePath)));
  if (basePath !== '') {
    app.get(basePath, async (c) => c.html(await dashboardIndexHtml(basePath)));
  }

  app.get(route('/healthz'), (c) =>
    c.json({
      ok: true,
      service: 'splendor-monsters-ts',
      port: deps.config.http.port,
      publicBasePath: basePath,
    }),
  );

  app.get(route('/v1/rooms'), (c) => c.json(rooms.listRooms()));

  app.post(route('/v1/rooms'), async (c) => {
    const body = await readJson(c);
    const playerName = displayNameField(body, 'playerName', PLAYER_NAME_MAX_LENGTH, 'Trainer');
    const roomName = optionalDisplayNameField(body, 'roomName', ROOM_NAME_MAX_LENGTH);
    return c.json(rooms.createRoom(roomName === undefined ? { playerName } : { playerName, roomName }), 201);
  });

  app.get(route('/v1/rooms/:roomId'), (c) => c.json(rooms.getRoomView(param(c, 'roomId'), optionalSeatToken(c))));

  app.get(route('/v1/rooms/:roomId/legal-actions'), (c) => c.json(rooms.listLegalActions(param(c, 'roomId'), seatToken(c))));

  app.post(route('/v1/rooms/:roomId/join'), async (c) => {
    const body = await readJson(c);
    return c.json(rooms.joinRoom(param(c, 'roomId'), displayNameField(body, 'playerName', PLAYER_NAME_MAX_LENGTH, 'Trainer')));
  });

  app.post(route('/v1/rooms/:roomId/demo-player'), (c) => c.json(rooms.addDemoPlayer(param(c, 'roomId'), seatToken(c))));

  app.post(route('/v1/rooms/:roomId/start'), (c) => c.json(rooms.startRoom(param(c, 'roomId'), seatToken(c))));

  app.post(route('/v1/rooms/:roomId/leave'), (c) => c.json({ room: rooms.leaveRoom(param(c, 'roomId'), seatToken(c)) }));

  app.post(route('/v1/rooms/:roomId/kick'), async (c) => {
    const body = await readJson(c);
    return c.json(rooms.kickPlayer(param(c, 'roomId'), seatToken(c), stringField(body, 'playerId')));
  });

  app.post(route('/v1/rooms/:roomId/rematch'), (c) => c.json(rooms.rematch(param(c, 'roomId'), seatToken(c))));

  app.post(route('/v1/rooms/:roomId/actions'), async (c) => {
    const body = await readJson(c);
    return c.json(rooms.applyAction(param(c, 'roomId'), seatToken(c), parseActionCommand(body), optionalClientActionId(body)));
  });

  app.post(route('/v1/rooms/:roomId/actions/:kind'), async (c) => {
    const kind = ACTION_ROUTES[param(c, 'kind')];
    if (kind === undefined) {
      throw new RequestValidationError(`Unknown action route: ${param(c, 'kind')}`, 'invalid_action_kind');
    }
    const body = kind === 'pass_turn' ? await readOptionalJson(c) : await readJson(c);
    return c.json(rooms.applyAction(param(c, 'roomId'), seatToken(c), parseActionCommand(body, kind), optionalClientActionId(body)));
  });

  return app;
}

/** Paths are built from the configurable base path, so Hono cannot infer param types. */
function param(c: Context, name: string): string {
  const value = c.req.param(name);
  if (value === undefined) {
    throw new RequestValidationError(`Missing path parameter: ${name}`);
  }
  return value;
}

async function readJson(c: Context): Promise<JsonObject> {
  return asJsonObject(await c.req.json());
}

async function readOptionalJson(c: Context): Promise<JsonObject> {
  const text = await c.req.text();
  return text.trim() === '' ? {} : asJsonObject(JSON.parse(text));
}

/** Seat tokens travel as `Authorization: Bearer <token>` (or `X-Seat-Token`), never in URLs or bodies. */
function optionalSeatToken(c: Context): string | null {
  const header = c.req.header('authorization');
  if (header !== undefined) {
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (match?.[1] === undefined) {
      throw new SeatAuthError('Authorization header must be "Bearer <seatToken>".');
    }
    return match[1];
  }
  return c.req.header('x-seat-token')?.trim() || null;
}

function seatToken(c: Context): string {
  const token = optionalSeatToken(c);
  if (token === null) {
    throw new SeatAuthError();
  }
  return token;
}
