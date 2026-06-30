import { RoomService } from './room-service.js';

export interface AppServices {
  rooms: RoomService;
}

export function composeAppServices(): AppServices {
  return {
    rooms: new RoomService(),
  };
}
