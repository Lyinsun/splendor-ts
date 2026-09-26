import { publicUrl } from './publicPath';

/** A shareable room link. Unlike a seat link it carries no token, so it is safe to post in a group chat. */
export function inviteLink(roomId: string): string {
  const params = new URLSearchParams({ room: roomId });
  return `${window.location.origin}${publicUrl('/')}?${params.toString()}`;
}

/** What opening an invite link does: take a free seat while the room still waits for players, otherwise watch. */
export function inviteAction(view: { status: 'lobby' | 'playing' | 'finished'; players: readonly unknown[]; maxPlayers: number }): 'join' | 'spectate' {
  return view.status === 'lobby' && view.players.length < view.maxPlayers ? 'join' : 'spectate';
}

/** Keeps `?room=` in the address bar while watching, so a refresh keeps watching; drops it otherwise. */
export function syncRoomParam(roomId: string | null): void {
  const params = new URLSearchParams(window.location.search);
  if (roomId === null) params.delete('room');
  else params.set('room', roomId);
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query === '' ? '' : `?${query}`}${window.location.hash}`);
}
