import { describe, expect, it } from 'vitest';
import { normalizePublicBasePath } from '../src/config/config.js';
import { COMPANION_CARDS, GYM_LEADERS } from '../src/game/domain/content.js';
import { abandonGame, addPlayerToLobby, applyGameAction, createLobbyState, leaveFinishedGame, returnToLobby, skipTurn, startGame } from '../src/game/domain/engine.js';
import { listLegalGameActions } from '../src/game/domain/legal-actions.js';
import { GameRuleError, type CompanionCard, type Element, type GameAction } from '../src/game/domain/types.js';
import { createElementCounter, emptyTokenBank } from '../src/game/domain/tokens.js';

describe('config', () => {
  it('normalizes the public base path for prefixed deployments', () => {
    expect(normalizePublicBasePath(undefined)).toBe('');
    expect(normalizePublicBasePath('')).toBe('');
    expect(normalizePublicBasePath('/')).toBe('');
    expect(normalizePublicBasePath('play-8f3k2q')).toBe('/play-8f3k2q');
    expect(normalizePublicBasePath('/play-8f3k2q/')).toBe('/play-8f3k2q');
  });
});

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
    expect(game.board.gymLeaders).toHaveLength(3);
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

  it('follows the Pokémon rulebook sparse-bank rule: with two elements left, one of each or two of one', () => {
    const game = startedGame();
    game.board.bank = { fire: 1, water: 2, grass: 0, electric: 0, psychic: 0, prism: 5 };

    // Only one fire remains, so fire cannot be the doubled element; a lone token is too few while two kinds remain.
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'fire', 'water'] })).toThrow(/Not enough fire/);
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['water'] })).toThrow(GameRuleError);
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['water', 'water'] })).toThrow(/at least 4/);

    const doubled = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['water', 'water', 'fire'] });
    const doubledPlayer = doubled.players.find((entry) => entry.id === 'p1');
    expect(doubledPlayer?.tokens.water).toBe(2);
    expect(doubledPlayer?.tokens.fire).toBe(1);
    expect(doubled.board.bank.water).toBe(0);
    expect(doubled.board.bank.fire).toBe(0);

    const single = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['water', 'fire'] });
    expect(single.board.bank.water).toBe(1);
    expect(single.board.bank.fire).toBe(0);

    expect(listLegalGameActions(game, 'p1').actions.filter((option) => option.kind === 'take_tokens').map((option) => option.action))
      .toEqual([
        { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water'] },
        { kind: 'take_tokens', playerId: 'p1', tokens: ['water', 'water', 'fire'] },
      ]);
  });

  it('refuses to reserve rare or legendary cards with a rule error', () => {
    const game = startedGame();
    const rare = game.board.specialMarket.rare[0];
    expect(rare).toBeDefined();
    const action = { kind: 'reserve_card', playerId: 'p1', source: { kind: 'special_market', rank: 'rare', cardId: rare?.id ?? '' } } as unknown as GameAction;

    expect(() => applyGameAction(game, action)).toThrow(/cannot be reserved/);
  });

  it('requires three different elements while three or more remain, and a stack of four for a pair', () => {
    const game = startedGame();
    game.board.bank = { fire: 3, water: 1, grass: 1, electric: 0, psychic: 0, prism: 5 };

    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water'] })).toThrow(GameRuleError);
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'fire'] })).toThrow(/at least 4/);
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'electric', 'water'] })).toThrow(GameRuleError);
    expect(applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water', 'grass'] }).board.bank.fire).toBe(2);
  });

  it('never deadlocks: a single token left in the bank is still a legal take, so passing is refused', () => {
    const game = startedGame();
    game.board.bank = { fire: 0, water: 1, grass: 0, electric: 0, psychic: 0, prism: 0 };
    for (const tier of [1, 2, 3] as const) {
      game.board.market[tier] = [];
      game.board.decks[tier] = [];
    }
    game.board.specialMarket = { rare: [], legendary: [] };

    expect(() => applyGameAction(game, { kind: 'pass_turn', playerId: 'p1' })).toThrow(GameRuleError);
    const legal = listLegalGameActions(game, 'p1').actions;
    expect(legal.map((option) => option.id)).toEqual(['take:water']);
    expect(applyGameAction(game, legal[0]!.action).currentPlayerId).toBe('p2');

    game.board.bank.water = 0;
    expect(listLegalGameActions(game, 'p1').actions.map((option) => option.id)).toEqual(['pass']);
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
    expect(legal.actions.some((entry) => "evolution" in entry.action && entry.action.evolution?.fromCardId === from.id && entry.action.evolution.to.kind === 'market' && entry.action.evolution.to.cardId === to.id)).toBe(true);

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

  it('lists buy-then-evolve: the card just bought can evolve in the same turn', () => {
    const game = startedGame();
    const player = game.players[0]!;
    const from = testCard('bulbasaur-buy', 1, 'Bulbasaur', 'grass', 0, {}, {
      pokemonId: 'bulbasaur',
      evolvesTo: { pokemonId: 'ivysaur', requirement: {} },
    });
    const to = testCard('ivysaur-buy', 2, 'Ivysaur', 'grass', 3, {}, { pokemonId: 'ivysaur' });
    game.board.market[1][0] = from;
    game.board.market[2][0] = to;
    player.tableau = [];

    const evolveAfterBuy = listLegalGameActions(game, 'p1').actions.find((entry) =>
      entry.action.kind === 'buy_card'
      && entry.action.source.kind === 'market'
      && entry.action.source.cardId === from.id
      && entry.action.evolution?.fromCardId === from.id);
    expect(evolveAfterBuy).toBeDefined();

    const next = applyGameAction(game, evolveAfterBuy!.action);
    expect(next.players[0]?.tableau.map((card) => card.id)).toEqual([to.id]);
  });

  it('lists reserve-then-evolve against the reserved copy, never the market slot it just left', () => {
    const game = startedGame();
    const player = game.players[0]!;
    const from = testCard('bulbasaur-res', 1, 'Bulbasaur', 'grass', 0, {}, {
      pokemonId: 'bulbasaur',
      evolvesTo: { pokemonId: 'ivysaur', requirement: {} },
    });
    const to = testCard('ivysaur-res', 2, 'Ivysaur', 'grass', 3, {}, { pokemonId: 'ivysaur' });
    player.tableau = [from];
    game.board.market[2][0] = to;

    const reserveOptions = listLegalGameActions(game, 'p1').actions.filter((entry) =>
      entry.action.kind === 'reserve_card' && entry.action.source.kind === 'market' && entry.action.source.cardId === to.id);
    const targets = reserveOptions.flatMap((entry) => (entry.action.kind === 'reserve_card' && entry.action.evolution ? [entry.action.evolution.to.kind] : []));
    expect(targets).toEqual(['reserved']);
    for (const option of reserveOptions) {
      expect(() => applyGameAction(game, option.action)).not.toThrow();
    }
  });

  it('returns a leaving player\'s tokens to the bank and skips their seat afterwards', () => {
    const lobby = addPlayerToLobby(addPlayerToLobby(createLobbyState('room_t', 'T', { id: 'p1', name: 'A' }), { id: 'p2', name: 'B' }), { id: 'p3', name: 'C' });
    const game = startGame(lobby, 'p1');
    const afterTake = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water', 'grass'] });
    const bankBefore = { ...afterTake.board.bank };

    const left = abandonGame(afterTake, 'p1');
    expect(left.players[0]?.tokens).toEqual(emptyTokenBank());
    expect(left.board.bank.fire).toBe(bankBefore.fire + 1);
    expect(left.board.bank.water).toBe(bankBefore.water + 1);
    expect(left.status).toBe('playing');

    const p2 = applyGameAction(left, { kind: 'take_tokens', playerId: 'p2', tokens: ['fire', 'water', 'grass'] });
    expect(p2.currentPlayerId).toBe('p3');
    const p3 = applyGameAction(p2, { kind: 'take_tokens', playerId: 'p3', tokens: ['fire', 'water', 'grass'] });
    expect(p3.currentPlayerId).toBe('p2');
  });

  it('skips a timed-out turn without acting for the player and restarts the turn clock', () => {
    const game = startGame(addPlayerToLobby(createLobbyState('room_t', 'T', { id: 'p1', name: 'A' }), { id: 'p2', name: 'B' }), 'p1', '2026-01-01T00:00:00.000Z');
    expect(game.turnStartedAt).toBe('2026-01-01T00:00:00.000Z');

    const skipped = skipTurn(game, 'p1', '2026-01-01T00:05:00.000Z');
    expect(skipped.currentPlayerId).toBe('p2');
    expect(skipped.players[0]?.tokens).toEqual(emptyTokenBank());
    expect(skipped.board.bank).toEqual(game.board.bank);
    expect(skipped.turnStartedAt).toBe('2026-01-01T00:05:00.000Z');
    expect(() => skipTurn(skipped, 'p1')).toThrow(GameRuleError);
  });

  it('marks a player leaving a finished table as left so a rematch excludes them', () => {
    const game = startedGame();
    const finished = abandonGame(game, 'p2');
    expect(finished.status).toBe('finished');
    const lobby3 = addPlayerToLobby(addPlayerToLobby(createLobbyState('room_t', 'T', { id: 'p1', name: 'A' }), { id: 'p2', name: 'B' }), { id: 'p3', name: 'C' });
    let three = startGame(lobby3, 'p1');
    three = { ...three, status: 'finished', currentPlayerId: null };

    const afterLeave = leaveFinishedGame(three, 'p1');
    expect(afterLeave.players[0]?.status).toBe('left');
    expect(afterLeave.hostPlayerId).toBe('p2');
    const rematch = returnToLobby(afterLeave, 'p2');
    expect(rematch.players.map((player) => player.id)).toEqual(['p2', 'p3']);
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
    game.endGameTriggeredBy = 'p1';

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
    expect(legal.actions.some((entry) => "evolution" in entry.action && entry.action.evolution?.fromCardId === from.id && entry.action.evolution.to.kind === 'market' && entry.action.evolution.to.cardId === to.id)).toBe(true);
  });

  it('rejects actions from a player who does not own the current turn', () => {
    const game = startedGame();
    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p2', tokens: ['fire', 'water', 'grass'] })).toThrow(GameRuleError);
  });

  it('auto-awards a gym leader when element bonuses meet the requirement', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    // Set up player with 4 fire bonus to qualify for Flare Warden
    player.bonuses = { ...createElementCounter(), fire: 4 };
    player.tableau = [
      testCard('fire-mon-1', 1, 'FireMon1', 'fire', 1, {}),
      testCard('fire-mon-2', 1, 'FireMon2', 'fire', 1, {}),
      testCard('fire-mon-3', 1, 'FireMon3', 'fire', 1, {}),
      testCard('fire-mon-4', 1, 'FireMon4', 'fire', 1, {}),
    ];
    // Put Flare Warden in the available leaders
    const flareWarden = GYM_LEADERS.find((leader) => leader.id === 'leader-flare');
    expect(flareWarden).toBeDefined();
    if (flareWarden === undefined) {
      throw new Error('missing gym leader fixture');
    }
    game.board.gymLeaders = [flareWarden];

    // Take tokens (any action triggers the check)
    const next = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water', 'grass'] });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.gymLeaders).toHaveLength(1);
    expect(updatedPlayer?.gymLeaders[0]?.id).toBe('leader-flare');
    expect(updatedPlayer?.score).toBe(4 + 3); // 4 from cards + 3 from gym leader
    expect(next.board.gymLeaders).toHaveLength(0); // leader removed from board
  });

  it('applies element bonuses to reduce card cost when buying', () => {
    const game = startedGame();
    const player = game.players[0];
    const card = game.board.market[1][0];
    expect(player).toBeDefined();
    expect(card).toBeDefined();
    if (player === undefined || card === undefined) {
      throw new Error('missing test fixture');
    }
    // Give player 2 bonus of the card's element
    const bonusElement = card.element;
    player.bonuses = { ...createElementCounter(), [bonusElement]: 2 };
    // Give player enough tokens to cover cost minus 2 bonus
    const costAfterBonus = { ...card.cost };
    costAfterBonus[bonusElement] = Math.max((costAfterBonus[bonusElement] ?? 0) - 2, 0);
    player.tokens = { ...emptyTokenBank(), ...costAfterBonus };

    const next = applyGameAction(game, { kind: 'buy_card', playerId: 'p1', source: { kind: 'market', tier: 1, cardId: card.id } });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(card.id);
    // Verify tokens were correctly deducted (bonus applied)
    for (const element of ['fire', 'water', 'grass', 'electric', 'psychic'] as const) {
      const expected = (player.tokens[element] ?? 0) - (costAfterBonus[element] ?? 0);
      expect(updatedPlayer?.tokens[element]).toBe(Math.max(0, expected));
    }
  });

  it('uses prism tokens as wildcards to cover cost shortfalls', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    // Create a card that costs 3 fire
    const card = testCard('prism-test', 1, 'PrismTest', 'fire', 2, { fire: 3 });
    game.board.market[1][0] = card;
    // Player has only 1 fire but 2 prisms
    player.tokens = { ...emptyTokenBank(), fire: 1, prism: 2 };

    const next = applyGameAction(game, { kind: 'buy_card', playerId: 'p1', source: { kind: 'market', tier: 1, cardId: card.id } });
    const updatedPlayer = next.players.find((entry) => entry.id === 'p1');

    expect(updatedPlayer?.tableau.map((entry) => entry.id)).toContain(card.id);
    expect(updatedPlayer?.tokens.fire).toBe(0);
    expect(updatedPlayer?.tokens.prism).toBe(0); // 2 prisms used as wildcards
    expect(next.board.bank.fire).toBe(5); // bank gets 1 fire back
    expect(next.board.bank.prism).toBe(7); // bank gets 2 prisms back (5 initial + 2)
  });

  it('scales the token bank for 3-player and 4-player games', () => {
    const lobby3 = createLobbyState('room_3p', '3P Room', { id: 'p1', name: 'A' });
    let joined3 = addPlayerToLobby(lobby3, { id: 'p2', name: 'B' });
    joined3 = addPlayerToLobby(joined3, { id: 'p3', name: 'C' });
    const game3 = startGame(joined3, 'p1');
    expect(game3.board.bank.fire).toBe(5);

    const lobby4 = createLobbyState('room_4p', '4P Room', { id: 'p1', name: 'A' });
    let joined4 = addPlayerToLobby(lobby4, { id: 'p2', name: 'B' });
    joined4 = addPlayerToLobby(joined4, { id: 'p3', name: 'C' });
    joined4 = addPlayerToLobby(joined4, { id: 'p4', name: 'D' });
    const game4 = startGame(joined4, 'p1');
    expect(game4.board.bank.fire).toBe(7);
    expect(game4.board.gymLeaders).toHaveLength(5); // min(4+1, 6) = 5
  });

  it('rejects reserving a fourth card when three are already reserved', () => {
    const game = startedGame();
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      throw new Error('missing test fixture');
    }
    player.reserved = [
      testCard('r1', 1, 'R1', 'fire', 0, {}),
      testCard('r2', 1, 'R2', 'water', 0, {}),
      testCard('r3', 1, 'R3', 'grass', 0, {}),
    ];

    expect(() => applyGameAction(game, {
      kind: 'reserve_card',
      playerId: 'p1',
      source: { kind: 'deck', tier: 1 },
    })).toThrow(GameRuleError);
  });

  it('rejects non-host players from starting the game', () => {
    const lobby = createLobbyState('room_host', 'Host Room', { id: 'host', name: 'Host' });
    const joined = addPlayerToLobby(lobby, { id: 'guest', name: 'Guest' });
    expect(() => startGame(joined, 'guest')).toThrow(GameRuleError);
  });

  it('requires at least four tokens in the bank to take a matching pair', () => {
    const game = startedGame();
    game.board.bank = { fire: 3, water: 4, grass: 7, electric: 7, psychic: 7, prism: 5 };

    expect(() => applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'fire'] })).toThrow(GameRuleError);

    const next = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['water', 'water'] });
    const player = next.players.find((entry) => entry.id === 'p1');
    expect(player?.tokens.water).toBe(2);
    expect(next.board.bank.water).toBe(2);
  });

  it('finishes the game with a single winner when one player clearly leads', () => {
    const game = startedGame();
    const first = game.players[0];
    const second = game.players[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) {
      throw new Error('missing test fixture');
    }
    first.tableau = [testCard('p1-18', 1, 'P1 Winner', 'fire', 18, {})];
    first.score = 18;
    second.tableau = [testCard('p2-10', 1, 'P2 Loser', 'water', 10, {})];
    second.score = 10;
    game.currentPlayerId = 'p1';

    const next = applyGameAction(game, { kind: 'take_tokens', playerId: 'p1', tokens: ['fire', 'water', 'grass'] });

    // p1 triggered end-game, but game doesn't end until round finishes (next player would be order 0)
    // Since p1 is order 0 and just played, next is p2 (order 1). Game continues.
    expect(next.status).toBe('playing');
    expect(next.endGameTriggeredBy).toBe('p1');
    expect(next.currentPlayerId).toBe('p2');

    // p2 takes their final turn
    const finished = applyGameAction(next, { kind: 'take_tokens', playerId: 'p2', tokens: ['fire', 'water', 'grass'] });
    expect(finished.status).toBe('finished');
    expect(finished.winnerIds).toEqual(['p1']);
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
