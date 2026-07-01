import type { ActionOptions, CardSource, GameState, LegalGameActionList, RoomSummary, TokenKind } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const gameApi = {
  listRooms: () => request<RoomSummary[]>('/v1/rooms'),
  createRoom: (payload: { playerName: string; roomName?: string }) =>
    request<{ room: GameState; playerId: string }>('/v1/rooms', {
      method: 'POST',
      body: payload,
    }),
  getRoom: (roomId: string) => request<GameState>(`/v1/rooms/${roomId}`),
  listLegalActions: (roomId: string, playerId: string) => request<LegalGameActionList>(`/v1/rooms/${roomId}/players/${playerId}/legal-actions`),
  joinRoom: (roomId: string, playerName: string) =>
    request<{ room: GameState; playerId: string }>(`/v1/rooms/${roomId}/join`, {
      method: 'POST',
      body: { playerName },
    }),
  addDemoPlayer: (roomId: string) =>
    request<{ room: GameState; playerId: string }>(`/v1/rooms/${roomId}/demo-player`, {
      method: 'POST',
    }),
  startRoom: (roomId: string, playerId: string) =>
    request<GameState>(`/v1/rooms/${roomId}/start`, {
      method: 'POST',
      body: { playerId },
    }),
  takeTokens: (roomId: string, playerId: string, tokens: TokenKind[], options: ActionOptions = {}) =>
    request<GameState>(`/v1/rooms/${roomId}/actions/take-tokens`, {
      method: 'POST',
      body: { playerId, tokens, ...options },
    }),
  reserveCard: (roomId: string, playerId: string, source: Extract<CardSource, { kind: 'market' | 'deck' }>, options: ActionOptions = {}) =>
    request<GameState>(`/v1/rooms/${roomId}/actions/reserve`, {
      method: 'POST',
      body: { playerId, source, ...options },
    }),
  buyCard: (roomId: string, playerId: string, source: Exclude<CardSource, { kind: 'deck' }>, options: ActionOptions = {}) =>
    request<GameState>(`/v1/rooms/${roomId}/actions/buy`, {
      method: 'POST',
      body: { playerId, source, ...options },
    }),
};

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
  };
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload !== undefined && typeof payload === 'object' && 'error' in payload ? String(payload.error) : response.statusText;
    const code = payload !== undefined && typeof payload === 'object' && 'error_code' in payload ? String(payload.error_code) : undefined;
    throw new ApiError(message, response.status, code);
  }
  return payload as T;
}
