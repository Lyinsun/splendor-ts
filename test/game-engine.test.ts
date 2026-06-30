import { describe, expect, it } from 'vitest';
import { addPlayerToLobby, applyGameAction, createLobbyState, startGame } from '../src/game/domain/engine.js';
import { GameRuleError } from '../src/game/domain/types.js';

describe('game engine', () => {
  it('starts a two-player game with a filled market and player-scaled bank', () => {
    const lobby = createLobbyState('room_test', 'Test Room', { id: 'p1', name: 'Ada' });
    const joined = addPlayerToLobby(lobby, { id: 'p2', name: 'Blaise' });
    const game = startGame(joined, 'p1');

    expect(game.status).toBe('playing');
    expect(game.currentPlayerId).toBe('p1');
    expect(game.board.bank.fire).toBe(4);
    expect(game.board.bank.prism).toBe(5);
    expect(game.board.market[1]).toHaveLength(4);
    expect(game.board.market[2]).toHaveLength(4);
    expect(game.board.market[3]).toHaveLength(4);
    expect(game.board.gymLeaders).toHaveLength(3);
  });

  it('takes three different tokens and advances the turn', () => {
    const game = startedGame();
    const next = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water', 'grass'] });
    const player = next.players.find((entry) => entry.id === 'p1');

    expect(player?.tokens.fire).toBe(1);
    expect(player?.tokens.water).toBe(1);
    expect(player?.tokens.grass).toBe(1);
    expect(next.board.bank.fire).toBe(3);
    expect(next.currentPlayerId).toBe('p2');
  });

  it('reserves a market card and grants one prism when available', () => {
    const game = startedGame();
    const card = game.board.market[1][0];
    expect(card).toBeDefined();

    const next = applyGameAction(game, { kind: 'reserve_card', playerId: 'p1', source: { kind: 'market', tier: 1, cardId: card?.id ?? '' } });
    const player = next.players.find((entry) => entry.id === 'p1');

    expect(player?.reserved.map((entry) => entry.id)).toContain(card?.id);
    expect(player?.tokens.prism).toBe(1);
    expect(next.board.bank.prism).toBe(4);
    expect(next.board.market[1]).toHaveLength(4);
  });

  it('buys a card from the market through the same settlement path', () => {
    const game = startedGame();
    const player = game.players[0];
    const card = game.board.market[1][0];
    expect(player).toBeDefined();
    expect(card).toBeDefined();
    if (player === undefined || card === undefined) {
      throw new Error('missing test fixture');
    }
    player.tokens = { fire: 7, water: 7, grass: 7, electric: 7, psychic: 7, prism: 0 };

    const next = applyGameAction(game, { kind: 'buy_card', playerId: 'p1', source: { kind: 'market', tier: 1, cardId: card.id } });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(card.id);
    expect(updatedPlayer?.bonuses[card.element]).toBe(1);
    expect(updatedPlayer?.score).toBe(card.points);
    expect(next.board.market[1]).toHaveLength(4);
  });

  it('rejects actions from a player who does not own the current turn', () => {
    const game = startedGame();
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p2', tokens: ['fire', 'water', 'grass'] })).toThrow(GameRuleError);
  });
});

function startedGame() {
  const lobby = createLobbyState('room_test', 'Test Room', { id: 'p1', name: 'Ada' });
  const joined = addPlayerToLobby(lobby, { id: 'p2', name: 'Blaise' });
  return startGame(joined, 'p1');
}
