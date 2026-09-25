import { roomErrorStatus, RoomLimitError, RoomNotFoundError, SeatAuthError } from '../../game/application/room-service.js';
import { GameRuleError } from '../../game/domain/types.js';
import { RequestValidationError } from './action-dto.js';

export interface ErrorPayload {
  error_code: string;
  error: string;
}

/** Single error mapping shared by HTTP responses and WebSocket replies. */
export function describeError(error: unknown): { status: number; body: ErrorPayload } {
  if (error instanceof RequestValidationError) {
    return { status: 400, body: { error_code: error.code, error: error.message } };
  }
  if (error instanceof SyntaxError) {
    return { status: 400, body: { error_code: 'invalid_json_body', error: 'Request body is not valid JSON.' } };
  }
  const status = roomErrorStatus(error);
  if (error instanceof GameRuleError) {
    return { status, body: { error_code: error.code, error: error.message } };
  }
  if (error instanceof RoomNotFoundError) {
    return { status, body: { error_code: 'room_not_found', error: error.message } };
  }
  if (error instanceof SeatAuthError) {
    return { status, body: { error_code: 'invalid_seat_token', error: error.message } };
  }
  if (error instanceof RoomLimitError) {
    return { status, body: { error_code: 'room_limit', error: error.message } };
  }
  console.error('[splendor] unexpected error', error);
  return { status: 500, body: { error_code: 'internal_error', error: 'Internal server error.' } };
}
