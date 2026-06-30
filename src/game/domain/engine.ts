import { COMPANION_CARDS, GYM_LEADERS } from './content.js';
import { createSeededRandom, shuffle } from './random.js';
import {
  CARD_TIERS,
  ELEMENTS,
  type BoardState,
  type CardSource,
  type CardTier,
  type CompanionCard,
  type Element,
  type ElementCost,
  type GameAction,
  type GameLogEntry,
  GameRuleError,
  type GameState,
  type GymLeader,
  type PlayerState,
  type TokenKind,
} from './types.js';
import { cloneTokenBank, createElementCounter, emptyTokenBank, isElementToken, tokenTotal } from './tokens.js';

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const MAX_TOKENS_PER_PLAYER = 10;
export const MAX_RESERVED_CARDS = 3;
export const MARKET_SIZE = 4;
export const TARGET_SCORE = 15;

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
    reserveCard(next, player, action.source.tier, action.source.cardId, now);
  } else {
    buyCard(next, player, action.source, now);
  }

  awardGymLeaderIfEligible(next, player, now);
  recalculateScore(player);
  handleEndOfTurn(next, player, now);
  next.updatedAt = now;
  return next;
}

export function computeAffordableTokens(player: PlayerState, card: CompanionCard): { colored: Partial<Record<Element, number>>; prism: number; missing: number } {
  const colored: Partial<Record<Element, number>> = {};
  let prism = 0;
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

function createPlayer(input: LobbyPlayerInput, order: number): PlayerState {
  return {
    id: input.id,
    name: input.name.trim() || `Trainer ${order + 1}`,
    order,
    tokens: emptyTokenBank(),
    bonuses: createElementCounter(),
    tableau: [],
    reserved: [],
    gymLeaders: [],
    score: 0,
  };
}

function createEmptyBoard(): BoardState {
  return {
    bank: emptyTokenBank(),
    decks: { 1: [], 2: [], 3: [] },
    market: { 1: [], 2: [], 3: [] },
    gymLeaders: [],
  };
}

function createInitialBoard(seed: string, playerCount: number): BoardState {
  const random = createSeededRandom(seed);
  const tokenCount = tokenCountForPlayers(playerCount);
  const decks = {
    1: shuffle(COMPANION_CARDS.filter((card) => card.tier === 1), random),
    2: shuffle(COMPANION_CARDS.filter((card) => card.tier === 2), random),
    3: shuffle(COMPANION_CARDS.filter((card) => card.tier === 3), random),
  } satisfies Record<CardTier, CompanionCard[]>;
  const board: BoardState = {
    bank: { fire: tokenCount, water: tokenCount, grass: tokenCount, electric: tokenCount, psychic: tokenCount, prism: 5 },
    decks,
    market: { 1: [], 2: [], 3: [] },
    gymLeaders: shuffle(GYM_LEADERS, random).slice(0, Math.min(playerCount + 1, GYM_LEADERS.length)),
  };
  for (const tier of CARD_TIERS) {
    refillMarket(board, tier);
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
  const isPair = tokens.length === 2 && entries.length === 1 && entries[0]?.[1] === 2;
  if (!isThreeDifferent && !isPair) {
    throw new GameRuleError('Take either three different elements or two matching elements.', 'invalid_token_pattern');
  }
  if (isPair) {
    const token = entries[0]?.[0];
    if (token === undefined || state.board.bank[token] < 4) {
      throw new GameRuleError('Taking two matching tokens requires at least four in the bank.', 'pair_requires_four');
    }
  }
  if (tokenTotal(player.tokens) + tokens.length > MAX_TOKENS_PER_PLAYER) {
    throw new GameRuleError('Players may hold at most ten tokens in this MVP.', 'token_limit');
  }
  for (const token of tokens) {
    if (state.board.bank[token] <= 0) {
      throw new GameRuleError(`No ${token} tokens remain in the bank.`, 'bank_token_empty');
    }
  }
  for (const token of tokens) {
    state.board.bank[token] -= 1;
    player.tokens[token] += 1;
  }
  appendLog(state, `${player.name} took ${tokens.join(', ')} energy.`, now);
}

function reserveCard(state: GameState, player: PlayerState, tier: CardTier, cardId: string, now: string): void {
  if (player.reserved.length >= MAX_RESERVED_CARDS) {
    throw new GameRuleError('A player can reserve at most three cards.', 'reserve_limit');
  }
  const market = state.board.market[tier];
  const cardIndex = market.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) {
    throw new GameRuleError('Card is not available in the market.', 'card_not_found');
  }
  const prismGain = state.board.bank.prism > 0 ? 1 : 0;
  if (tokenTotal(player.tokens) + prismGain > MAX_TOKENS_PER_PLAYER) {
    throw new GameRuleError('Reserve would exceed the ten-token limit.', 'token_limit');
  }
  const [card] = market.splice(cardIndex, 1);
  if (card === undefined) {
    throw new GameRuleError('Card is not available in the market.', 'card_not_found');
  }
  player.reserved.push(card);
  if (prismGain > 0) {
    state.board.bank.prism -= 1;
    player.tokens.prism += 1;
  }
  refillMarket(state.board, tier);
  appendLog(state, `${player.name} reserved ${card.name}${prismGain > 0 ? ' and gained a prism' : ''}.`, now);
}

function buyCard(state: GameState, player: PlayerState, source: CardSource, now: string): void {
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
  player.bonuses[located.card.element] += 1;
  recalculateScore(player);
  appendLog(state, `${player.name} recruited ${located.card.name} for ${located.card.points} glory.`, now);
}

function locateBuyCard(state: GameState, player: PlayerState, source: CardSource): { card: CompanionCard; remove: () => void } {
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
  recalculateScore(player);
  appendLog(state, `${player.name} invited ${leader.name} for ${leader.points} glory.`, now);
}

function handleEndOfTurn(state: GameState, player: PlayerState, now: string): void {
  recalculateScore(player);
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
  const bestScore = Math.max(...state.players.map((player) => player.score));
  const contenders = state.players.filter((player) => player.score === bestScore);
  const fewestCards = Math.min(...contenders.map((player) => player.tableau.length));
  state.winnerIds = contenders.filter((player) => player.tableau.length === fewestCards).map((player) => player.id);
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

function recalculateScore(player: PlayerState): void {
  player.score = player.tableau.reduce((sum, card) => sum + card.points, 0) + player.gymLeaders.reduce((sum, leader) => sum + leader.points, 0);
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
