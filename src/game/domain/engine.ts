import { COMPANION_CARDS, GYM_LEADERS } from './content.js';
import { createSeededRandom, shuffle } from './random.js';
import {
  CARD_TIERS,
  ELEMENTS,
  SPECIAL_CARD_RANKS,
  type BoardState,
  type CardSource,
  type CardTier,
  type CompanionCard,
  type Element,
  type ElementCost,
  type EvolutionSelection,
  type GameAction,
  type GameLogEntry,
  GameRuleError,
  type GameState,
  type GymLeader,
  type PlayerState,
  type SpecialCardRank,
  type TokenKind,
} from './types.js';
import { cloneTokenBank, createElementCounter, emptyTokenBank, isElementToken, tokenTotal } from './tokens.js';

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const MAX_TOKENS_PER_PLAYER = 10;
export const MAX_RESERVED_CARDS = 3;
export const MARKET_SIZE = 4;
export const TARGET_SCORE = 18;

export interface LobbyPlayerInput {
  id: string;
  name: string;
}

export function createLobbyState(roomId: string, roomName: string, host: LobbyPlayerInput, now = new Date().toISOString()): GameState {
  return {
    roomId,
    roomName,
    status: 'lobby',
    players: [createPlayer(host, 0)],
    board: createEmptyBoard(),
    currentPlayerId: null,
    hostPlayerId: host.id,
    turn: 0,
    round: 1,
    targetScore: TARGET_SCORE,
    finalRoundStartedBy: null,
    winnerIds: [],
    logs: [
      {
        id: `${roomId}-lobby-created`,
        turn: 0,
        message: `${host.name} created the training table.`,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function addPlayerToLobby(state: GameState, player: LobbyPlayerInput, now = new Date().toISOString()): GameState {
  const next = cloneState(state);
  ensureStatus(next, 'lobby');
  if (next.players.some((entry) => entry.id === player.id)) {
    throw new GameRuleError('Player already joined this room.', 'player_already_joined');
  }
  if (next.players.length >= MAX_PLAYERS) {
    throw new GameRuleError('Room already has four players.', 'room_full');
  }
  next.players.push(createPlayer(player, next.players.length));
  appendLog(next, `${player.name} joined the table.`, now);
  next.updatedAt = now;
  return next;
}

export function startGame(state: GameState, playerId: string, now = new Date().toISOString()): GameState {
  const next = cloneState(state);
  ensureStatus(next, 'lobby');
  if (next.hostPlayerId !== playerId) {
    throw new GameRuleError('Only the host can start the game.', 'host_only');
  }
  if (next.players.length < MIN_PLAYERS) {
    throw new GameRuleError('At least two players are required.', 'not_enough_players');
  }
  next.players = next.players.map((player, index) => createPlayer({ id: player.id, name: player.name }, index));
  next.board = createInitialBoard(next.roomId, next.players.length);
  next.status = 'playing';
  next.currentPlayerId = next.players[0]?.id ?? null;
  next.turn = 1;
  next.round = 1;
  next.finalRoundStartedBy = null;
  next.winnerIds = [];
  appendLog(next, 'The first trainer round has started.', now);
  next.updatedAt = now;
  return next;
}

export function applyGameAction(state: GameState, action: GameAction, now = new Date().toISOString()): GameState {
  const next = cloneState(state);
  ensureStatus(next, 'playing');
  const player = ensureCurrentPlayer(next, action.playerId);

  if (action.kind === 'take_tokens') {
    takeTokens(next, player, action.tokens, now);
  } else if (action.kind === 'reserve_card') {
    reserveCard(next, player, action.source, now);
  } else {
    buyCard(next, player, action.source, now);
  }

  discardDownToLimit(next, player, action.discardTokens ?? [], now);
  evolveCardIfSelected(next, player, action.evolution ?? null, now);
  awardGymLeaderIfEligible(next, player, now);
  recalculatePlayer(player);
  handleEndOfTurn(next, player, now);
  next.updatedAt = now;
  return next;
}

export function computeAffordableTokens(player: PlayerState, card: CompanionCard): { colored: Partial<Record<Element, number>>; prism: number; missing: number } {
  const colored: Partial<Record<Element, number>> = {};
  let prism = requiresPrismPayment(card) ? 1 : 0;
  let missing = 0;
  for (const element of ELEMENTS) {
    const required = Math.max((card.cost[element] ?? 0) - player.bonuses[element], 0);
    if (required <= 0) {
      continue;
    }
    const coloredSpend = Math.min(player.tokens[element], required);
    if (coloredSpend > 0) {
      colored[element] = coloredSpend;
    }
    const remainder = required - coloredSpend;
    prism += remainder;
  }
  if (prism > player.tokens.prism) {
    missing = prism - player.tokens.prism;
  }
  return { colored, prism: Math.min(prism, player.tokens.prism), missing };
}

export function canInviteGymLeader(player: PlayerState, leader: GymLeader): boolean {
  return ELEMENTS.every((element) => player.bonuses[element] >= (leader.requirement[element] ?? 0));
}

export function canEvolve(player: PlayerState, from: CompanionCard, to: CompanionCard): boolean {
  if (to.specialRank !== undefined || from.specialRank !== undefined) {
    return false;
  }
  if (to.tier !== from.tier + 1) {
    return false;
  }
  const fromPokemonId = pokemonIdForEvolution(from);
  const toPokemonId = pokemonIdForEvolution(to);
  if (from.evolvesTo !== undefined) {
    if (from.evolvesTo.pokemonId !== toPokemonId) {
      return false;
    }
    return hasEvolutionRequirement(player, from.evolvesTo.requirement);
  }
  if (to.evolvesFrom !== from.id && to.evolvesFrom !== fromPokemonId) {
    return false;
  }
  return hasEvolutionRequirement(player, to.evolutionRequirement ?? {});
}

function createPlayer(input: LobbyPlayerInput, order: number): PlayerState {
  return {
    id: input.id,
    name: input.name.trim() || `Trainer ${order + 1}`,
    order,
    tokens: emptyTokenBank(),
    bonuses: createElementCounter(),
    tableau: [],
    reserved: [],
    evolutionRecords: [],
    gymLeaders: [],
    score: 0,
  };
}

function createEmptyBoard(): BoardState {
  return {
    bank: emptyTokenBank(),
    decks: { 1: [], 2: [], 3: [] },
    market: { 1: [], 2: [], 3: [] },
    specialDecks: { rare: [], legendary: [] },
    specialMarket: { rare: [], legendary: [] },
    gymLeaders: [],
  };
}

function createInitialBoard(seed: string, playerCount: number): BoardState {
  const random = createSeededRandom(seed);
  const tokenCount = tokenCountForPlayers(playerCount);
  const decks = {
    1: shuffle(COMPANION_CARDS.filter((card) => card.tier === 1 && card.specialRank === undefined), random),
    2: shuffle(COMPANION_CARDS.filter((card) => card.tier === 2 && card.specialRank === undefined), random),
    3: shuffle(COMPANION_CARDS.filter((card) => card.tier === 3 && card.specialRank === undefined), random),
  } satisfies Record<CardTier, CompanionCard[]>;
  const specialDecks = {
    rare: shuffle(COMPANION_CARDS.filter((card) => card.specialRank === 'rare'), random),
    legendary: shuffle(COMPANION_CARDS.filter((card) => card.specialRank === 'legendary'), random),
  } satisfies Record<SpecialCardRank, CompanionCard[]>;
  const board: BoardState = {
    bank: { fire: tokenCount, water: tokenCount, grass: tokenCount, electric: tokenCount, psychic: tokenCount, prism: 5 },
    decks,
    market: { 1: [], 2: [], 3: [] },
    specialDecks,
    specialMarket: { rare: [], legendary: [] },
    gymLeaders: [],
  };
  for (const tier of CARD_TIERS) {
    refillMarket(board, tier);
  }
  for (const rank of SPECIAL_CARD_RANKS) {
    refillSpecialMarket(board, rank);
  }
  return board;
}

function tokenCountForPlayers(playerCount: number): number {
  if (playerCount <= 2) {
    return 4;
  }
  if (playerCount === 3) {
    return 5;
  }
  return 7;
}

function takeTokens(state: GameState, player: PlayerState, tokens: TokenKind[], now: string): void {
  if (tokens.length === 0) {
    throw new GameRuleError('Select tokens before taking an action.', 'empty_token_selection');
  }
  if (tokens.some((kind) => !isElementToken(kind))) {
    throw new GameRuleError('Prism tokens can only be gained by reserving a card.', 'cannot_take_prism');
  }
  const counts = new Map<TokenKind, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const entries = [...counts.entries()];
  const isThreeDifferent = tokens.length === 3 && entries.length === 3 && entries.every(([, count]) => count === 1);
  const availableElementKinds = ELEMENTS.filter((element) => state.board.bank[element] > 0).length;
  const isTwoKindsWhenBankSparse = tokens.length === 3 && entries.length === 2 && availableElementKinds <= 2 && entries.some(([, count]) => count === 2);
  const isPair = tokens.length === 2 && entries.length === 1 && entries[0]?.[1] === 2;
  if (!isThreeDifferent && !isTwoKindsWhenBankSparse && !isPair) {
    throw new GameRuleError('Take either three different elements or two matching elements.', 'invalid_token_pattern');
  }
  if (isPair) {
    const token = entries[0]?.[0];
    if (token === undefined || state.board.bank[token] < 4) {
      throw new GameRuleError('Taking two matching tokens requires at least four in the bank.', 'pair_requires_four');
    }
  }
  for (const [token, count] of counts.entries()) {
    if (state.board.bank[token] < count) {
      throw new GameRuleError(`Not enough ${token} tokens remain in the bank.`, 'bank_token_empty');
    }
  }
  for (const token of tokens) {
    state.board.bank[token] -= 1;
    player.tokens[token] += 1;
  }
  appendLog(state, `${player.name} took ${tokens.join(', ')} energy.`, now);
}

function reserveCard(state: GameState, player: PlayerState, source: Extract<CardSource, { kind: 'market' | 'deck' }>, now: string): void {
  if (player.reserved.length >= MAX_RESERVED_CARDS) {
    throw new GameRuleError('A player can reserve at most three cards.', 'reserve_limit');
  }
  const prismGain = state.board.bank.prism > 0 ? 1 : 0;
  const located = locateReservableCard(state, source);
  player.reserved.push(located.card);
  located.remove();
  if (source.kind === 'market') {
    refillMarket(state.board, source.tier);
  }
  if (prismGain > 0) {
    state.board.bank.prism -= 1;
    player.tokens.prism += 1;
  }
  appendLog(state, `${player.name} reserved ${located.card.name}${prismGain > 0 ? ' and gained a prism' : ''}.`, now);
}

function buyCard(state: GameState, player: PlayerState, source: Exclude<CardSource, { kind: 'deck' }>, now: string): void {
  const located = locateBuyCard(state, player, source);
  const payment = computeAffordableTokens(player, located.card);
  if (payment.missing > 0) {
    throw new GameRuleError('Not enough energy to buy this companion.', 'cannot_afford_card');
  }
  for (const element of ELEMENTS) {
    const spend = payment.colored[element] ?? 0;
    if (spend > 0) {
      player.tokens[element] -= spend;
      state.board.bank[element] += spend;
    }
  }
  if (payment.prism > 0) {
    player.tokens.prism -= payment.prism;
    state.board.bank.prism += payment.prism;
  }
  located.remove();
  player.tableau.push(located.card);
  recalculatePlayer(player);
  appendLog(state, `${player.name} recruited ${located.card.name} for ${located.card.points} glory.`, now);
}

function locateReservableCard(state: GameState, source: Extract<CardSource, { kind: 'market' | 'deck' }>): { card: CompanionCard; remove: () => void } {
  if (source.kind === 'deck') {
    const card = state.board.decks[source.tier][0];
    if (card === undefined) {
      throw new GameRuleError('Deck is empty.', 'deck_empty');
    }
    return {
      card,
      remove: () => {
        state.board.decks[source.tier].shift();
      },
    };
  }

  const market = state.board.market[source.tier];
  const cardIndex = market.findIndex((card) => card.id === source.cardId);
  if (cardIndex < 0) {
    throw new GameRuleError('Card is not available in the market.', 'card_not_found');
  }
  const card = market[cardIndex];
  if (card === undefined) {
    throw new GameRuleError('Card is not available in the market.', 'card_not_found');
  }
  return {
    card,
    remove: () => {
      market.splice(cardIndex, 1);
    },
  };
}

function locateBuyCard(state: GameState, player: PlayerState, source: Exclude<CardSource, { kind: 'deck' }>): { card: CompanionCard; remove: () => void } {
  if (source.kind === 'reserved') {
    const cardIndex = player.reserved.findIndex((card) => card.id === source.cardId);
    if (cardIndex < 0) {
      throw new GameRuleError('Reserved card not found.', 'card_not_found');
    }
    const card = player.reserved[cardIndex];
    if (card === undefined) {
      throw new GameRuleError('Reserved card not found.', 'card_not_found');
    }
    return {
      card,
      remove: () => {
        player.reserved.splice(cardIndex, 1);
      },
    };
  }

  if (source.kind === 'special_market') {
    const market = state.board.specialMarket[source.rank];
    const cardIndex = market.findIndex((card) => card.id === source.cardId);
    if (cardIndex < 0) {
      throw new GameRuleError('Special card not found.', 'card_not_found');
    }
    const card = market[cardIndex];
    if (card === undefined) {
      throw new GameRuleError('Special card not found.', 'card_not_found');
    }
    return {
      card,
      remove: () => {
        market.splice(cardIndex, 1);
        refillSpecialMarket(state.board, source.rank);
      },
    };
  }

  const market = state.board.market[source.tier];
  const cardIndex = market.findIndex((card) => card.id === source.cardId);
  if (cardIndex < 0) {
    throw new GameRuleError('Market card not found.', 'card_not_found');
  }
  const card = market[cardIndex];
  if (card === undefined) {
    throw new GameRuleError('Market card not found.', 'card_not_found');
  }
  return {
    card,
    remove: () => {
      market.splice(cardIndex, 1);
      refillMarket(state.board, source.tier);
    },
  };
}

function awardGymLeaderIfEligible(state: GameState, player: PlayerState, now: string): void {
  const leaderIndex = state.board.gymLeaders.findIndex((leader) => canInviteGymLeader(player, leader));
  if (leaderIndex < 0) {
    return;
  }
  const [leader] = state.board.gymLeaders.splice(leaderIndex, 1);
  if (leader === undefined) {
    return;
  }
  player.gymLeaders.push(leader);
  recalculatePlayer(player);
  appendLog(state, `${player.name} invited ${leader.name} for ${leader.points} glory.`, now);
}

function discardDownToLimit(state: GameState, player: PlayerState, discardTokens: TokenKind[], now: string): void {
  const extra = tokenTotal(player.tokens) - MAX_TOKENS_PER_PLAYER;
  if (extra <= 0) {
    if (discardTokens.length > 0) {
      throw new GameRuleError('Discard tokens are only allowed when above the token limit.', 'unexpected_token_discard');
    }
    return;
  }
  if (discardTokens.length !== extra) {
    throw new GameRuleError(`Discard ${extra} token${extra === 1 ? '' : 's'} to return to the ten-token limit.`, 'token_discard_required');
  }
  const counts = new Map<TokenKind, number>();
  for (const token of discardTokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const [token, count] of counts.entries()) {
    if (player.tokens[token] < count) {
      throw new GameRuleError(`Cannot discard unavailable ${token} tokens.`, 'invalid_token_discard');
    }
  }
  for (const token of discardTokens) {
    player.tokens[token] -= 1;
    state.board.bank[token] += 1;
  }
  appendLog(state, `${player.name} discarded ${discardTokens.join(', ')} energy.`, now);
}

function evolveCardIfSelected(state: GameState, player: PlayerState, selection: EvolutionSelection | null, now: string): void {
  if (selection === null) {
    return;
  }
  recalculatePlayer(player);
  const fromIndex = player.tableau.findIndex((card) => card.id === selection.fromCardId);
  if (fromIndex < 0) {
    throw new GameRuleError('Evolution source card is not in play.', 'evolution_source_not_found');
  }
  const from = player.tableau[fromIndex];
  if (from === undefined) {
    throw new GameRuleError('Evolution source card is not in play.', 'evolution_source_not_found');
  }
  const located = locateEvolutionTarget(state, player, selection.to);
  if (!canEvolve(player, from, located.card)) {
    throw new GameRuleError('Evolution requirements are not met.', 'evolution_requirements_not_met');
  }
  located.remove();
  player.tableau.splice(fromIndex, 1, located.card);
  player.evolutionRecords.push({
    from,
    to: located.card,
    turn: state.turn,
  });
  recalculatePlayer(player);
  appendLog(state, `${player.name} evolved ${from.name} into ${located.card.name}.`, now);
}

function locateEvolutionTarget(
  state: GameState,
  player: PlayerState,
  source: EvolutionSelection['to'],
): { card: CompanionCard; remove: () => void } {
  if (source.kind === 'reserved') {
    const cardIndex = player.reserved.findIndex((card) => card.id === source.cardId);
    if (cardIndex < 0) {
      throw new GameRuleError('Evolution target reserved card not found.', 'card_not_found');
    }
    const card = player.reserved[cardIndex];
    if (card === undefined) {
      throw new GameRuleError('Evolution target reserved card not found.', 'card_not_found');
    }
    return {
      card,
      remove: () => {
        player.reserved.splice(cardIndex, 1);
      },
    };
  }

  const market = state.board.market[source.tier];
  const cardIndex = market.findIndex((card) => card.id === source.cardId);
  if (cardIndex < 0) {
    throw new GameRuleError('Evolution target market card not found.', 'card_not_found');
  }
  const card = market[cardIndex];
  if (card === undefined) {
    throw new GameRuleError('Evolution target market card not found.', 'card_not_found');
  }
  return {
    card,
    remove: () => {
      market.splice(cardIndex, 1);
      refillMarket(state.board, source.tier);
    },
  };
}

function handleEndOfTurn(state: GameState, player: PlayerState, now: string): void {
  recalculatePlayer(player);
  if (player.score >= state.targetScore && state.finalRoundStartedBy === null) {
    state.finalRoundStartedBy = player.id;
    appendLog(state, `${player.name} reached ${state.targetScore} glory. Final round begins.`, now);
  }

  const nextPlayer = nextTurnPlayer(state, player);
  state.turn += 1;
  if (nextPlayer.order === 0) {
    state.round += 1;
  }

  if (state.finalRoundStartedBy !== null && nextPlayer.order === 0) {
    finishGame(state, now);
    return;
  }

  state.currentPlayerId = nextPlayer.id;
}

function finishGame(state: GameState, now: string): void {
  state.status = 'finished';
  state.currentPlayerId = null;
  for (const player of state.players) {
    recalculatePlayer(player);
  }
  const bestScore = Math.max(...state.players.map((player) => player.score));
  let contenders = state.players.filter((player) => player.score === bestScore);
  const mostEvolutions = Math.max(...contenders.map((player) => player.evolutionRecords.length));
  contenders = contenders.filter((player) => player.evolutionRecords.length === mostEvolutions);
  const mostPokemon = Math.max(...contenders.map((player) => player.tableau.length));
  state.winnerIds = contenders.filter((player) => player.tableau.length === mostPokemon).map((player) => player.id);
  const names = state.players.filter((player) => state.winnerIds.includes(player.id)).map((player) => player.name).join(', ');
  appendLog(state, `Game finished. Winner: ${names}.`, now);
}

function nextTurnPlayer(state: GameState, player: PlayerState): PlayerState {
  const nextOrder = (player.order + 1) % state.players.length;
  const nextPlayer = state.players.find((candidate) => candidate.order === nextOrder);
  if (nextPlayer === undefined) {
    throw new GameRuleError('Next player could not be resolved.', 'turn_order_corrupt');
  }
  return nextPlayer;
}

function refillMarket(board: BoardState, tier: CardTier): void {
  const market = board.market[tier];
  const deck = board.decks[tier];
  while (market.length < MARKET_SIZE && deck.length > 0) {
    const nextCard = deck.shift();
    if (nextCard !== undefined) {
      market.push(nextCard);
    }
  }
}

function refillSpecialMarket(board: BoardState, rank: SpecialCardRank): void {
  const market = board.specialMarket[rank];
  const deck = board.specialDecks[rank];
  while (market.length < 1 && deck.length > 0) {
    const nextCard = deck.shift();
    if (nextCard !== undefined) {
      market.push(nextCard);
    }
  }
}

function recalculatePlayer(player: PlayerState): void {
  player.bonuses = createElementCounter();
  for (const card of player.tableau) {
    player.bonuses[card.element] += bonusValue(card);
  }
  player.score = player.tableau.reduce((sum, card) => sum + card.points, 0) + player.gymLeaders.reduce((sum, leader) => sum + leader.points, 0);
}

function bonusValue(card: CompanionCard): number {
  return card.bonusValue ?? (card.specialRank === undefined ? 1 : 2);
}

function requiresPrismPayment(card: CompanionCard): boolean {
  return card.requiresPrism === true || card.specialRank !== undefined;
}

function pokemonIdForEvolution(card: CompanionCard): string {
  return card.pokemonId ?? card.id;
}

function hasEvolutionRequirement(player: PlayerState, requirement: ElementCost): boolean {
  return ELEMENTS.every((element) => player.bonuses[element] >= (requirement[element] ?? 0));
}

function ensureStatus(state: GameState, status: GameState['status']): void {
  if (state.status !== status) {
    throw new GameRuleError(`Room must be ${status} for this operation.`, 'invalid_status');
  }
}

function ensureCurrentPlayer(state: GameState, playerId: string): PlayerState {
  if (state.currentPlayerId !== playerId) {
    throw new GameRuleError('It is not this player turn.', 'not_current_turn');
  }
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) {
    throw new GameRuleError('Player not found.', 'player_not_found');
  }
  return player;
}

function appendLog(state: GameState, message: string, now: string): void {
  const entry: GameLogEntry = {
    id: `${state.roomId}-${state.logs.length + 1}-${state.turn}`,
    turn: state.turn,
    message,
    createdAt: now,
  };
  state.logs = [entry, ...state.logs].slice(0, 80);
}

function cloneState(state: GameState): GameState {
  return structuredClone(state) as GameState;
}
