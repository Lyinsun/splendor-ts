import type { ActionOptions, CardSource, GameState, LegalGameActionList, RoomSummary, SeatGrant, TokenKind } from './types';
import { publicUrl } from '../runtime/publicPath';

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

/** Every seat-scoped call carries the seat token; player ids are public and never grant access. */
export const gameApi = {
  listRooms: () => request<RoomSummary[]>('/v1/rooms'),
  createRoom: (payload: { playerName: string; roomName?: string }) =>
    request<SeatGrant>('/v1/rooms', { method: 'POST', body: payload }),
  getRoom: (roomId: string, seatToken?: string) => request<GameState>(`/v1/rooms/${roomId}`, { seatToken }),
  listLegalActions: (roomId: string, seatToken: string) => request<LegalGameActionList>(`/v1/rooms/${roomId}/legal-actions`, { seatToken }),
  joinRoom: (roomId: string, playerName: string) =>
    request<SeatGrant>(`/v1/rooms/${roomId}/join`, { method: 'POST', body: { playerName } }),
  addDemoPlayer: (roomId: string, hostSeatToken: string) =>
    request<SeatGrant>(`/v1/rooms/${roomId}/demo-player`, { method: 'POST', seatToken: hostSeatToken }),
  startRoom: (roomId: string, hostSeatToken: string) =>
    request<GameState>(`/v1/rooms/${roomId}/start`, { method: 'POST', seatToken: hostSeatToken }),
  leaveRoom: (roomId: string, seatToken: string) =>
    request<{ room: GameState | null }>(`/v1/rooms/${roomId}/leave`, { method: 'POST', seatToken }),
  kickPlayer: (roomId: string, hostSeatToken: string, playerId: string) =>
    request<GameState>(`/v1/rooms/${roomId}/kick`, { method: 'POST', seatToken: hostSeatToken, body: { playerId } }),
  rematch: (roomId: string, hostSeatToken: string) =>
    request<GameState>(`/v1/rooms/${roomId}/rematch`, { method: 'POST', seatToken: hostSeatToken }),
  takeTokens: (roomId: string, seatToken: string, tokens: TokenKind[], options: ActionOptions = {}) =>
    action(roomId, seatToken, 'take-tokens', { tokens, ...options }),
  reserveCard: (roomId: string, seatToken: string, source: Extract<CardSource, { kind: 'market' | 'deck' }>, options: ActionOptions = {}) =>
    action(roomId, seatToken, 'reserve', { source, ...options }),
  buyCard: (roomId: string, seatToken: string, source: Exclude<CardSource, { kind: 'deck' }>, options: ActionOptions = {}) =>
    action(roomId, seatToken, 'buy', { source, ...options }),
  passTurn: (roomId: string, seatToken: string) => action(roomId, seatToken, 'pass', {}),
};

/** A fresh clientActionId per submit lets the server drop duplicate retries. */
function action(roomId: string, seatToken: string, route: string, body: Record<string, unknown>) {
  return request<GameState>(`/v1/rooms/${roomId}/actions/${route}`, {
    method: 'POST',
    seatToken,
    body: { ...body, clientActionId: newClientActionId() },
  });
}

function newClientActionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  seatToken?: string | undefined;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const headers: Record<string, string> = {};
  const init: RequestInit = {
    method: options.method ?? 'GET',
    signal: controller.signal,
    headers,
  };
  if (options.seatToken !== undefined) {
    headers.Authorization = `Bearer ${options.seatToken}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  try {
    const response = await fetch(publicUrl(url), init);
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message = payload !== undefined && typeof payload === 'object' && 'error' in payload ? String(payload.error) : response.statusText;
      const code = payload !== undefined && typeof payload === 'object' && 'error_code' in payload ? String(payload.error_code) : undefined;
      throw new ApiError(message, response.status, code);
    }
    return payload as T;
  } catch (caught) {
    if (caught instanceof Error && caught.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', 408, 'timeout');
    }
    throw caught;
  } finally {
    clearTimeout(timeoutId);
  }
}
