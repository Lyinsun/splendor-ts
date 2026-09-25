import { RoomService, type RoomServiceOptions } from './room-service.js';

export interface AppServices {
  rooms: RoomService;
}

/** Infrastructure (e.g. the SQLite repository) is injected by the entrypoint to keep dependencies pointing inward. */
export function composeAppServices(options: RoomServiceOptions = {}): AppServices {
  return {
    rooms: new RoomService(options),
  };
}
