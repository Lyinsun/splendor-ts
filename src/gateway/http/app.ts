import { Hono } from 'hono';
import type { AppConfig } from '../../config/config.js';
import { GameRuleError, TOKEN_KINDS, type CardSource, type CardTier, type GameAction, type TokenKind } from '../../game/domain/types.js';
import type { AppServices } from '../../game/application/composition.js';
import { RoomNotFoundError, roomErrorStatus } from '../../game/application/room-service.js';
import { dashboardIndexHtml, serveDashboardAsset, serveSplendorAsset } from './dashboard-static.js';

export interface HttpAppDependencies {
  config: AppConfig;
  services: AppServices;
}

export function createHttpApp(deps: HttpAppDependencies) {
  const app = new Hono();

  app.use('/dashboard-assets/*', serveDashboardAsset);
  app.use('/assets/splendor-monsters/*', serveSplendorAsset);

  app.get('/', async (c) => c.html(await dashboardIndexHtml()));

  app.get('/healthz', (c) =>
    c.json({
      ok: true,
      service: 'splendor-monsters-ts',
      port: deps.config.http.port,
    }),
  );

  app.get('/v1/rooms', (c) => c.json(deps.services.rooms.listRooms()));

  app.post('/v1/rooms', async (c) => {
    try {
      const body = await readJson(c.req);
      const roomName = optionalStringField(body, 'roomName');
      const result = deps.services.rooms.createRoom(roomName === undefined
        ? { playerName: stringField(body, 'playerName', 'Trainer') }
        : { playerName: stringField(body, 'playerName', 'Trainer'), roomName });
      return c.json(result, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.get('/v1/rooms/:roomId', (c) => {
    try {
      return c.json(deps.services.rooms.getRoom(c.req.param('roomId')));
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post('/v1/rooms/:roomId/join', async (c) => {
    try {
      const body = await readJson(c.req);
      const result = deps.services.rooms.joinRoom(c.req.param('roomId'), stringField(body, 'playerName', 'Trainer'));
      return c.json(result);
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post('/v1/rooms/:roomId/demo-player', (c) => {
    try {
      return c.json(deps.services.rooms.addDemoPlayer(c.req.param('roomId')));
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post('/v1/rooms/:roomId/start', async (c) => {
    try {
      const body = await readJson(c.req);
      return c.json(deps.services.rooms.startRoom(c.req.param('roomId'), stringField(body, 'playerId')));
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post('/v1/rooms/:roomId/actions/take-tokens', async (c) => {
    try {
      const body = await readJson(c.req);
      const action: GameAction = {
        kind: 'take_tokens',
        playerId: stringField(body, 'playerId'),
        tokens: tokenArrayField(body, 'tokens'),
      };
      return c.json(deps.services.rooms.applyAction(c.req.param('roomId'), action));
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post('/v1/rooms/:roomId/actions/reserve', async (c) => {
    try {
      const body = await readJson(c.req);
      const source = cardSourceField(body, true);
      if (source.kind !== 'market') {
        throw new GameRuleError('Only market cards can be reserved.', 'invalid_card_source');
      }
      const action: GameAction = {
        kind: 'reserve_card',
        playerId: stringField(body, 'playerId'),
        source,
      };
      return c.json(deps.services.rooms.applyAction(c.req.param('roomId'), action));
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post('/v1/rooms/:roomId/actions/buy', async (c) => {
    try {
      const body = await readJson(c.req);
      const action: GameAction = {
        kind: 'buy_card',
        playerId: stringField(body, 'playerId'),
        source: cardSourceField(body, false),
      };
      return c.json(deps.services.rooms.applyAction(c.req.param('roomId'), action));
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  return app;
}

function errorResponse(c: { json: (payload: unknown, status?: number) => Response }, error: unknown): Response {
  const status = roomErrorStatus(error);
  if (error instanceof GameRuleError) {
    return c.json({ error_code: error.code, error: error.message }, status);
  }
  if (error instanceof RoomNotFoundError) {
    return c.json({ error_code: 'room_not_found', error: error.message }, status);
  }
  return c.json({ error_code: 'internal_error', error: errorMessage(error) }, status);
}

async function readJson(req: { json: () => Promise<unknown> }): Promise<Record<string, unknown>> {
  const body = await req.json();
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new GameRuleError('Request body must be a JSON object.', 'invalid_json_body');
  }
  return body as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, field: string, fallback?: string): string {
  const value = body[field];
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new GameRuleError(`Missing string field: ${field}`, 'invalid_request');
}

function optionalStringField(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return undefined;
}

function tokenArrayField(body: Record<string, unknown>, field: string): TokenKind[] {
  const value = body[field];
  if (!Array.isArray(value)) {
    throw new GameRuleError(`Missing array field: ${field}`, 'invalid_request');
  }
  return value.map((item) => {
    if (typeof item !== 'string' || !TOKEN_KINDS.includes(item as TokenKind)) {
      throw new GameRuleError(`Invalid token kind: ${String(item)}`, 'invalid_token');
    }
    return item as TokenKind;
  });
}

function cardSourceField(body: Record<string, unknown>, marketOnly: boolean): CardSource {
  const raw = body.source;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new GameRuleError('Missing card source.', 'invalid_card_source');
  }
  const source = raw as Record<string, unknown>;
  const kind = source.kind;
  if (kind === 'reserved' && !marketOnly) {
    return {
      kind: 'reserved',
      cardId: stringField(source, 'cardId'),
    };
  }
  if (kind === 'market') {
    return {
      kind: 'market',
      tier: cardTierField(source, 'tier'),
      cardId: stringField(source, 'cardId'),
    };
  }
  throw new GameRuleError('Invalid card source kind.', 'invalid_card_source');
}

function cardTierField(body: Record<string, unknown>, field: string): CardTier {
  const value = body[field];
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }
  throw new GameRuleError('Card tier must be 1, 2, or 3.', 'invalid_card_tier');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
