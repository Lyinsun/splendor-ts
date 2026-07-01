import { describe, expect, it } from 'vitest';
import { COMPANION_CARDS } from '../src/game/domain/content.js';
import { addPlayerToLobby, applyGameAction, createLobbyState, startGame } from '../src/game/domain/engine.js';
import { listLegalGameActions } from '../src/game/domain/legal-actions.js';
import { GameRuleError, type CompanionCard, type Element } from '../src/game/domain/types.js';
import { createElementCounter, emptyTokenBank } from '../src/game/domain/tokens.js';

describe('game engine', () => {
  it('starts a two-player game with a filled market and player-scaled bank', () => {
    const lobby = createLobbyState('room_test', 'Test Room', { id: 'p1', name: 'Ada' });
    const joined = addPlayerToLobby(lobby, { id: 'p2', name: 'Blaise' });
    const game = startGame(joined, 'p1');

    expect(game.status).toBe('playing');
    expect(game.currentPlayerId).toBe('p1');
    expect(game.targetScore).toBe(18);
    expect(game.board.bank.fire).toBe(4);
    expect(game.board.bank.prism).toBe(5);
    expect(game.board.market[1]).toHaveLength(4);
    expect(game.board.market[2]).toHaveLength(4);
    expect(game.board.market[3]).toHaveLength(4);
    expect(game.board.gymLeaders).toHaveLength(0);
    expect(game.board.specialMarket.rare).toHaveLength(1);
    expect(game.board.specialMarket.legendary).toHaveLength(1);
  });

  it('ships Pokemon edition content with the expected deck shape and evolution links', () => {
    expect(COMPANION_CARDS.filter((card) => card.tier === 1 && card.specialRank === undefined)).toHaveLength(35);
    expect(COMPANION_CARDS.filter((card) => card.tier === 2 && card.specialRank === undefined)).toHaveLength(30);
    expect(COMPANION_CARDS.filter((card) => card.tier === 3 && card.specialRank === undefined)).toHaveLength(15);
    expect(COMPANION_CARDS.filter((card) => card.specialRank === 'rare')).toHaveLength(5);
    expect(COMPANION_CARDS.filter((card) => card.specialRank === 'legendary')).toHaveLength(5);
    expect(new Set(COMPANION_CARDS.map((card) => card.id)).size).toBe(COMPANION_CARDS.length);

    const bulbasaur = COMPANION_CARDS.find((card) => card.id === 'pdf-t1-bulbasaur-01');
    const ivysaur = COMPANION_CARDS.find((card) => card.id === 'pdf-t2-ivysaur-01');
    const mewtwo = COMPANION_CARDS.find((card) => card.id === 'pdf-legendary-mewtwo');

    expect(bulbasaur?.evolvesTo).toEqual({ pokemonId: 'ivysaur', requirement: { psychic: 3 } });
    expect(ivysaur?.evolvesTo).toEqual({ pokemonId: 'venusaur', requirement: { water: 4 } });
    expect(mewtwo?.specialRank).toBe('legendary');
    expect(mewtwo?.bonusValue).toBe(2);
    expect(mewtwo?.requiresPrism).toBe(true);
  });

  it('uses the extracted PDF tier-one card data with duplicate Pokemon ids and source evolution links', () => {
    const tierOneCards = COMPANION_CARDS.filter((card) => card.tier === 1 && card.specialRank === undefined);
    const bellsproutCards = tierOneCards.filter((card) => card.pokemonId === 'bellsprout');
    const bonusCounts = tierOneCards.reduce<Record<Element, number>>((counts, card) => {
      counts[card.element] += 1;
      return counts;
    }, createElementCounter());
    const dratini = COMPANION_CARDS.find((card) => card.id === 'pdf-t1-dratini-01');
    const bellsproutThird = COMPANION_CARDS.find((card) => card.id === 'pdf-t1-bellsprout-03');

    expect(bonusCounts).toEqual({ fire: 7, water: 7, grass: 7, electric: 7, psychic: 7 });
    expect(bellsproutCards).toHaveLength(3);
    expect(dratini?.cost).toEqual({ grass: 4 });
    expect(dratini?.points).toBe(1);
    expect(dratini?.evolvesTo).toEqual({ pokemonId: 'dragonair', requirement: { water: 3 } });
    expect(bellsproutThird?.cost).toEqual({ electric: 3 });
    expect(bellsproutThird?.evolvesTo).toEqual({ pokemonId: 'weepinbell', requirement: { psychic: 2 } });
  });

  it('uses the extracted PDF tier-two card data with duplicate Pokemon ids and source evolution links', () => {
    const tierTwoCards = COMPANION_CARDS.filter((card) => card.tier === 2 && card.specialRank === undefined);
    const dragonairCards = tierTwoCards.filter((card) => card.pokemonId === 'dragonair');
    const bonusCounts = tierTwoCards.reduce<Record<Element, number>>((counts, card) => {
      counts[card.element] += 1;
      return counts;
    }, createElementCounter());
    const dragonair = COMPANION_CARDS.find((card) => card.id === 'pdf-t2-dragonair-01');
    const kadabraSecond = COMPANION_CARDS.find((card) => card.id === 'pdf-t2-kadabra-02');

    expect(bonusCounts).toEqual({ fire: 6, water: 6, grass: 6, electric: 6, psychic: 6 });
    expect(dragonairCards).toHaveLength(2);
    expect(dragonair?.cost).toEqual({ grass: 6 });
    expect(dragonair?.points).toBe(3);
    expect(dragonair?.evolvesTo).toEqual({ pokemonId: 'dragonite', requirement: { electric: 4 } });
    expect(kadabraSecond?.cost).toEqual({ fire: 4, electric: 4, grass: 1 });
    expect(kadabraSecond?.evolvesTo).toEqual({ pokemonId: 'alakazam', requirement: { grass: 4 } });
  });

  it('uses the extracted PDF tier-three and special card data', () => {
    const tierThreeCards = COMPANION_CARDS.filter((card) => card.tier === 3 && card.specialRank === undefined);
    const rareCards = COMPANION_CARDS.filter((card) => card.specialRank === 'rare');
    const legendaryCards = COMPANION_CARDS.filter((card) => card.specialRank === 'legendary');
    const tierThreeBonusCounts = tierThreeCards.reduce<Record<Element, number>>((counts, card) => {
      counts[card.element] += 1;
      return counts;
    }, createElementCounter());
    const dragonite = COMPANION_CARDS.find((card) => card.id === 'pdf-t3-dragonite-01');
    const lapras = COMPANION_CARDS.find((card) => card.id === 'pdf-rare-lapras');
    const zapdos = COMPANION_CARDS.find((card) => card.id === 'pdf-legendary-zapdos');

    expect(tierThreeBonusCounts).toEqual({ fire: 3, water: 3, grass: 3, electric: 3, psychic: 3 });
    expect(dragonite?.points).toBe(5);
    expect(dragonite?.cost).toEqual({ psychic: 7, water: 3 });
    expect(rareCards).toHaveLength(5);
    expect(rareCards.every((card) => card.points === 0 && card.bonusValue === 2 && card.requiresPrism === true)).toBe(true);
    expect(legendaryCards).toHaveLength(5);
    expect(legendaryCards.every((card) => card.points === 2 && card.bonusValue === 2 && card.requiresPrism === true)).toBe(true);
    expect(lapras?.cost).toEqual({ psychic: 1, grass: 3, water: 2 });
    expect(zapdos?.cost).toEqual({ psychic: 3, water: 3, electric: 3 });
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

  it('rejects sparse-bank token selections that exceed an available token count', () => {
    const game = startedGame();
    game.board.bank = { fire: 1, water: 2, grass: 0, electric: 0, psychic: 0, prism: 5 };

    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'fire', 'water'] })).toThrow(GameRuleError);

    const next = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['water', 'water', 'fire'] });
    const player = next.players.find((entry) => entry.id === 'p1');

    expect(player?.tokens.water).toBe(2);
    expect(player?.tokens.fire).toBe(1);
    expect(next.board.bank.water).toBe(0);
    expect(next.board.bank.fire).toBe(0);
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

  it('can reserve the top card from a tier deck without revealing it first', () => {
    const game = startedGame();
    const card = game.board.decks[1][0];
    expect(card).toBeDefined();
    const startingDeckSize = game.board.decks[1].length;

    const next = applyGameAction(game, { kind: 'reserve_card', playerId: 'p1', source: { kind: 'deck', tier: 1 } });
    const player = next.players.find((entry) => entry.id === 'p1');

    expect(player?.reserved.map((entry) => entry.id)).toContain(card?.id);
    expect(next.board.decks[1]).toHaveLength(startingDeckSize - 1);
    expect(next.board.market[1]).toHaveLength(4);
    expect(player?.tokens.prism).toBe(1);
  });

  it('requires and settles token discard after an action exceeds ten tokens', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    player.tokens = { fire: 2, water: 2, grass: 2, electric: 2, psychic: 1, prism: 0 };

    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water', 'grass'] })).toThrow(GameRuleError);

    const next = applyGameAction(game, {
      kind: 'take_tokens',
      playerId: 'p1',
      tokens: ['fire', 'water', 'grass'],
      discardTokens: ['electric', 'psychic'],
    });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tokens).toEqual({ fire: 3, water: 3, grass: 3, electric: 1, psychic: 0, prism: 0 });
    expect(next.board.bank.electric).toBe(5);
    expect(next.board.bank.psychic).toBe(5);
    expect(next.currentPlayerId).toBe('p2');
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
    player.tokens = { ...emptyTokenBank(), ...card.cost };

    const next = applyGameAction(game, { kind: 'buy_card', playerId: 'p1', source: { kind: 'market', tier: 1, cardId: card.id } });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(card.id);
    expect(updatedPlayer?.bonuses[card.element]).toBe(1);
    expect(updatedPlayer?.score).toBe(card.points);
    expect(next.board.market[1]).toHaveLength(4);
  });

  it('requires a prism to buy a rare or legendary special card and grants two bonuses', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    const special = testCard('rare-eevee', 3, 'Eevee', 'psychic', 3, { fire: 1 }, { specialRank: 'rare' });
    game.board.specialMarket.rare = [special];
    player.tokens = { ...emptyTokenBank(), fire: 1, prism: 1 };

    const next = applyGameAction(game, { kind: 'buy_card', playerId: 'p1', source: { kind: 'special_market', rank: 'rare', cardId: special.id } });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(special.id);
    expect(updatedPlayer?.tokens.fire).toBe(0);
    expect(updatedPlayer?.tokens.prism).toBe(0);
    expect(updatedPlayer?.bonuses.psychic).toBe(2);
    expect(updatedPlayer?.score).toBe(3);
  });

  it('can evolve once at the end of a main action and stops counting the evolved-away card', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    const from = testCard('bulbasaur', 1, 'Bulbasaur', 'grass', 0, { fire: 1 });
    const to = testCard('ivysaur', 2, 'Ivysaur', 'grass', 3, { water: 2 }, { evolvesFrom: from.id, evolutionRequirement: { grass: 1 } });
    player.tableau = [from];
    player.bonuses = { ...createElementCounter(), grass: 1 };
    game.board.market[2][0] = to;

    const next = applyGameAction(game, {
      kind: 'take_tokens',
      playerId: 'p1',
      tokens: ['fire', 'water', 'grass'],
      evolution: {
        fromCardId: from.id,
        to: { kind: 'market', tier: 2, cardId: to.id },
      },
    });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(to.id);
    expect(updatedPlayer?.tableau.map((entry) => entry.id)).not.toContain(from.id);
    expect(updatedPlayer?.evolutionRecords).toHaveLength(1);
    expect(updatedPlayer?.evolutionRecords[0]?.from.id).toBe(from.id);
    expect(updatedPlayer?.score).toBe(3);
    expect(updatedPlayer?.bonuses.grass).toBe(1);
    expect(next.board.market[2]).toHaveLength(4);
  });

  it('supports source-card evolution requirements for duplicate Pokemon cards from the PDF table', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    const from = testCard('bulbasaur-t1-a', 1, 'Bulbasaur', 'grass', 0, {}, {
      pokemonId: 'bulbasaur',
      evolvesTo: { pokemonId: 'ivysaur', requirement: { grass: 1 } },
    });
    const to = testCard('ivysaur-t2-a', 2, 'Ivysaur', 'grass', 3, {}, { pokemonId: 'ivysaur' });
    player.tableau = [from];
    player.bonuses = { ...createElementCounter(), grass: 1 };
    game.board.market[2][0] = to;

    const legal = listLegalGameActions(game, 'p1');
    expect(legal.actions.some((entry) => entry.action.evolution?.fromCardId === from.id && entry.action.evolution.to.kind === 'market' && entry.action.evolution.to.cardId === to.id)).toBe(true);

    const next = applyGameAction(game, {
      kind: 'take_tokens',
      playerId: 'p1',
      tokens: ['fire', 'water', 'grass'],
      evolution: {
        fromCardId: from.id,
        to: { kind: 'market', tier: 2, cardId: to.id },
      },
    });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(to.id);
    expect(updatedPlayer?.tableau.map((entry) => entry.id)).not.toContain(from.id);
    expect(updatedPlayer?.evolutionRecords[0]?.from.id).toBe(from.id);
  });

  it('uses Pokemon edition tie breakers: most evolutions, then most Pokemon in play', () => {
    const game = startedGame();
    const first = game.players[0];
    const second = game.players[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) {
      throw new Error('missing test fixture');
    }
    first.tableau = [testCard('p1-score', 1, 'P1 Score', 'fire', 18, {})];
    first.evolutionRecords = [{
      from: testCard('p1-old', 1, 'P1 Old', 'fire', 0, {}),
      to: testCard('p1-score', 1, 'P1 Score', 'fire', 18, {}),
      turn: 1,
    }];
    first.score = 18;
    second.tableau = [
      testCard('p2-score', 1, 'P2 Score', 'water', 18, {}),
      testCard('p2-extra', 1, 'P2 Extra', 'grass', 0, {}),
    ];
    second.evolutionRecords = [];
    second.score = 18;
    game.currentPlayerId = 'p2';
    game.finalRoundStartedBy = 'p1';

    const next = applyGameAction(game, { kind: 'take_tokens', playerId: 'p2', tokens: ['fire', 'water', 'grass'] });

    expect(next.status).toBe('finished');
    expect(next.winnerIds).toEqual(['p1']);
  });

  it('lists server-validated legal actions for the current Pokemon edition turn', () => {
    const game = startedGame();
    const legal = listLegalGameActions(game, 'p1');

    expect(legal.roomId).toBe(game.roomId);
    expect(legal.playerId).toBe('p1');
    expect(legal.turn).toBe(game.turn);
    expect(legal.actions.some((entry) => entry.action.kind === 'take_tokens' && entry.action.tokens.length === 3)).toBe(true);
    expect(legal.actions.some((entry) => entry.action.kind === 'reserve_card' && entry.action.source.kind === 'deck' && entry.action.source.tier === 1)).toBe(true);
    expect(legal.actions.some((entry) => entry.action.kind === 'buy_card' && entry.action.source.kind === 'special_market')).toBe(false);
  });

  it('lists special-card purchases and optional evolution only when the settled action is legal', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    const rare = game.board.specialMarket.rare[0];
    expect(rare).toBeDefined();
    if (rare === undefined) {
      throw new Error('missing special fixture');
    }
    const from = testCard('bulbasaur', 1, 'Bulbasaur', 'grass', 0, {});
    const to = testCard('ivysaur', 2, 'Ivysaur', 'grass', 2, {}, { evolvesFrom: from.id, evolutionRequirement: { grass: 1 } });
    player.tableau = [from];
    player.bonuses = { ...createElementCounter(), grass: 1 };
    player.tokens = { ...emptyTokenBank(), ...(rare.cost), prism: 1 };
    game.board.market[2][0] = to;

    const legal = listLegalGameActions(game, 'p1');

    expect(legal.actions.some((entry) => entry.action.kind === 'buy_card' && entry.action.source.kind === 'special_market' && entry.action.source.cardId === rare.id)).toBe(true);
    expect(legal.actions.some((entry) => entry.action.evolution?.fromCardId === from.id && entry.action.evolution.to.kind === 'market' && entry.action.evolution.to.cardId === to.id)).toBe(true);
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

function testCard(
  id: string,
  tier: 1 | 2 | 3,
  name: string,
  element: Element,
  points: number,
  cost: CompanionCard['cost'],
  extras: Partial<CompanionCard> = {},
): CompanionCard {
  return {
    id,
    tier,
    name,
    element,
    points,
    cost,
    species: name,
    ...extras,
  };
}
