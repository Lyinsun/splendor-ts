import type { ActionCommand, ActionOptions } from '../../game/application/room-service.js';
import {
  SPECIAL_CARD_RANKS,
  TOKEN_KINDS,
  type CardSource,
  type CardTier,
  type EvolutionSelection,
  type SpecialCardRank,
  type TokenKind,
} from '../../game/domain/types.js';

/** Malformed client input (shape, type, length). Rule violations stay GameRuleError. */
export class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly code = 'invalid_request',
  ) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

export type JsonObject = Record<string, unknown>;

export const PLAYER_NAME_MAX_LENGTH = 24;
export const ROOM_NAME_MAX_LENGTH = 40;
export const CLIENT_ACTION_ID_MAX_LENGTH = 64;

export const ACTION_KINDS = ['take_tokens', 'reserve_card', 'buy_card', 'pass_turn'] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export function asJsonObject(value: unknown, what = 'Request body'): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(`${what} must be a JSON object.`, 'invalid_json_body');
  }
  return value as JsonObject;
}

export function displayNameField(body: JsonObject, field: string, maxLength: number, fallback?: string): string {
  const value = body[field];
  if (value === undefined || value === null || (typeof value === 'string' && cleanText(value) === '')) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new RequestValidationError(`Missing string field: ${field}`);
  }
  if (typeof value !== 'string') {
    throw new RequestValidationError(`Field ${field} must be a string.`);
  }
  const cleaned = cleanText(value);
  if ([...cleaned].length > maxLength) {
    throw new RequestValidationError(`Field ${field} must be at most ${maxLength} characters.`, 'field_too_long');
  }
  return cleaned;
}

export function optionalDisplayNameField(body: JsonObject, field: string, maxLength: number): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || (typeof value === 'string' && cleanText(value) === '')) {
    return undefined;
  }
  return displayNameField(body, field, maxLength);
}

export function stringField(body: JsonObject, field: string): string {
  const value = body[field];
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  throw new RequestValidationError(`Missing string field: ${field}`);
}

export function optionalClientActionId(body: JsonObject): string | undefined {
  const value = body.clientActionId;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string' || value.length === 0 || value.length > CLIENT_ACTION_ID_MAX_LENGTH) {
    throw new RequestValidationError(`clientActionId must be a string of 1-${CLIENT_ACTION_ID_MAX_LENGTH} characters.`);
  }
  return value;
}

/** `expectedVersion`: the room version the client acted on (optimistic concurrency, see ActionOptions). */
export function optionalExpectedVersion(body: JsonObject): number | undefined {
  const value = body.expectedVersion;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new RequestValidationError('expectedVersion must be a positive integer.');
  }
  return value;
}

export function actionOptions(body: JsonObject): ActionOptions {
  const clientActionId = optionalClientActionId(body);
  const expectedVersion = optionalExpectedVersion(body);
  return {
    ...(clientActionId === undefined ? {} : { clientActionId }),
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  };
}

/** Parses an action body. `kind` comes from the route for the typed endpoints, or from the body otherwise. */
export function parseActionCommand(body: JsonObject, kind: ActionKind | undefined = undefined): ActionCommand {
  const resolved = kind ?? actionKindField(body);
  if (resolved === 'pass_turn') {
    return { kind: 'pass_turn' };
  }
  if (resolved === 'take_tokens') {
    return { kind: 'take_tokens', tokens: tokenArrayField(body, 'tokens'), ...actionOptionsField(body) };
  }
  if (resolved === 'reserve_card') {
    return { kind: 'reserve_card', source: reserveCardSourceField(body), ...actionOptionsField(body) };
  }
  return { kind: 'buy_card', source: buyCardSourceField(body), ...actionOptionsField(body) };
}

function actionKindField(body: JsonObject): ActionKind {
  const value = body.kind;
  if (typeof value === 'string' && (ACTION_KINDS as readonly string[]).includes(value)) {
    return value as ActionKind;
  }
  throw new RequestValidationError(`Action kind must be one of: ${ACTION_KINDS.join(', ')}.`, 'invalid_action_kind');
}

function cleanText(value: string): string {
  // Strip control characters so names render safely in every client.
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

function tokenArrayField(body: JsonObject, field: string): TokenKind[] {
  const value = body[field];
  if (!Array.isArray(value) || value.length > 10) {
    throw new RequestValidationError(`Field ${field} must be an array of at most 10 tokens.`);
  }
  return value.map((item) => {
    if (typeof item !== 'string' || !TOKEN_KINDS.includes(item as TokenKind)) {
      throw new RequestValidationError(`Invalid token kind: ${String(item)}`, 'invalid_token');
    }
    return item as TokenKind;
  });
}

function optionalTokenArrayField(body: JsonObject, field: string): TokenKind[] | undefined {
  if (!(field in body) || body[field] === undefined) {
    return undefined;
  }
  return tokenArrayField(body, field);
}

function reserveCardSourceField(body: JsonObject): Extract<CardSource, { kind: 'market' | 'deck' }> {
  const source = cardSourceField(body);
  if (source.kind === 'market' || source.kind === 'deck') {
    return source;
  }
  throw new RequestValidationError('Only normal market or deck cards can be reserved.', 'invalid_card_source');
}

function buyCardSourceField(body: JsonObject): Exclude<CardSource, { kind: 'deck' }> {
  const source = cardSourceField(body);
  if (source.kind === 'deck') {
    throw new RequestValidationError('Deck cards must be reserved before buying.', 'invalid_card_source');
  }
  return source;
}

function cardSourceField(body: JsonObject): CardSource {
  const raw = body.source;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new RequestValidationError('Missing card source.', 'invalid_card_source');
  }
  const source = raw as JsonObject;
  const kind = source.kind;
  if (kind === 'reserved') {
    return { kind: 'reserved', cardId: stringField(source, 'cardId') };
  }
  if (kind === 'market') {
    return { kind: 'market', tier: cardTierField(source, 'tier'), cardId: stringField(source, 'cardId') };
  }
  if (kind === 'deck') {
    return { kind: 'deck', tier: cardTierField(source, 'tier') };
  }
  if (kind === 'special_market') {
    return { kind: 'special_market', rank: specialCardRankField(source, 'rank'), cardId: stringField(source, 'cardId') };
  }
  throw new RequestValidationError('Invalid card source kind.', 'invalid_card_source');
}

function actionOptionsField(body: JsonObject): { discardTokens?: TokenKind[]; evolution?: EvolutionSelection | null } {
  const options: { discardTokens?: TokenKind[]; evolution?: EvolutionSelection | null } = {};
  const discardTokens = optionalTokenArrayField(body, 'discardTokens');
  if (discardTokens !== undefined) {
    options.discardTokens = discardTokens;
  }
  if ('evolution' in body) {
    options.evolution = evolutionSelectionField(body.evolution);
  }
  return options;
}

function evolutionSelectionField(raw: unknown): EvolutionSelection | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new RequestValidationError('Evolution selection must be an object or null.', 'invalid_evolution_selection');
  }
  const input = raw as JsonObject;
  const to = input.to;
  if (typeof to !== 'object' || to === null || Array.isArray(to)) {
    throw new RequestValidationError('Evolution target is required.', 'invalid_evolution_selection');
  }
  const target = to as JsonObject;
  if (target.kind === 'reserved') {
    return { fromCardId: stringField(input, 'fromCardId'), to: { kind: 'reserved', cardId: stringField(target, 'cardId') } };
  }
  if (target.kind === 'market') {
    return {
      fromCardId: stringField(input, 'fromCardId'),
      to: { kind: 'market', tier: cardTierField(target, 'tier'), cardId: stringField(target, 'cardId') },
    };
  }
  throw new RequestValidationError('Invalid evolution target kind.', 'invalid_evolution_selection');
}

function cardTierField(body: JsonObject, field: string): CardTier {
  const value = body[field];
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }
  throw new RequestValidationError('Card tier must be 1, 2, or 3.', 'invalid_card_tier');
}

function specialCardRankField(body: JsonObject, field: string): SpecialCardRank {
  const value = body[field];
  if (typeof value === 'string' && SPECIAL_CARD_RANKS.includes(value as SpecialCardRank)) {
    return value as SpecialCardRank;
  }
  throw new RequestValidationError('Special card rank must be rare or legendary.', 'invalid_special_card_rank');
}
