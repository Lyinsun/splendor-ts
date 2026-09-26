import { describe, expect, it } from 'vitest';
import { inviteAction } from './invite';

describe('inviteAction', () => {
  it('joins a lobby room with a free seat', () => {
    expect(inviteAction({ status: 'lobby', players: [1, 2], maxPlayers: 4 })).toBe('join');
  });

  it('spectates a full lobby room', () => {
    expect(inviteAction({ status: 'lobby', players: [1, 2, 3, 4], maxPlayers: 4 })).toBe('spectate');
  });

  it('spectates a room that has started or finished', () => {
    expect(inviteAction({ status: 'playing', players: [1, 2], maxPlayers: 4 })).toBe('spectate');
    expect(inviteAction({ status: 'finished', players: [1, 2], maxPlayers: 4 })).toBe('spectate');
  });
});
