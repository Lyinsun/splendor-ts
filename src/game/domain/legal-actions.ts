import { applyGameAction, MAX_TOKENS_PER_PLAYER } from './engine.js';
import { enumerateTokenTakes } from './token-rules.js';
import {
  CARD_TIERS,
  SPECIAL_CARD_RANKS,
  TOKEN_KINDS,
  type CardSource,
  type CardTier,
  type CompanionCard,
  type EvolutionSelection,
  type GameAction,
  type GameState,
  type TokenKind,
} from './types.js';

export interface LegalGameActionOption {
  id: string;
  kind: GameAction['kind'];
  action: GameAction;
  summary: string;
}

export interface LegalGameActionList {
  roomId: string;
  playerId: string;
  turn: number;
  actions: LegalGameActionOption[];
}

interface EvolutionTargetCandidate {
  card: CompanionCard;
  source: EvolutionSelection['to'];
}

export function listLegalGameActions(state: GameState, playerId: string): LegalGameActionList {
  if (state.status !== 'playing' || state.currentPlayerId !== playerId) {
    return {
      roomId: state.roomId,
      playerId,
      turn: state.turn,
      actions: [],
    };
  }

  const baseActions = [
    ...takeTokenCandidates(state, playerId),
    ...reserveCardCandidates(state, playerId),
    ...buyCardCandidates(state, playerId),
  ];
  const discardOptions = discardTokenOptions();
  const options = new Map<string, LegalGameActionOption>();

  for (const baseAction of baseActions) {
    // Evolution is settled after the main action, so the card just bought or reserved can take part.
    const evolutionOptions = [null, ...evolutionCandidates(state, playerId, baseAction)] satisfies Array<EvolutionSelection | null>;
    // Only the exact discard size required after this action can be legal, so skip the rest of the search space.
    const discardSize = requiredDiscardSize(state, baseAction);
    for (const discardTokens of discardOptions.filter((option) => option.length === discardSize)) {
      for (const evolution of evolutionOptions) {
        const action = withSettlementOptions(baseAction, discardTokens, evolution);
        if (!isActionLegal(state, action)) {
          continue;
        }
        const key = JSON.stringify(action);
        if (!options.has(key)) {
          options.set(key, {
            id: actionId(action),
            kind: action.kind,
            action,
            summary: actionSummary(state, action),
          });
        }
      }
    }
  }

  if (options.size === 0) {
    const pass: GameAction = { kind: 'pass_turn', playerId };
    if (isActionLegal(state, pass)) {
      options.set('pass', { id: 'pass', kind: 'pass_turn', action: pass, summary: 'Pass (no other action available)' });
    }
  }

  return {
    roomId: state.roomId,
    playerId,
    turn: state.turn,
    actions: [...options.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function takeTokenCandidates(state: GameState, playerId: string): GameAction[] {
  return enumerateTokenTakes(state.board.bank).map((tokens) => ({ kind: 'take_tokens', playerId, tokens }));
}

function reserveCardCandidates(state: GameState, playerId: string): GameAction[] {
  const player = state.players.find((entry) => entry.id === playerId);
  if (player === undefined || player.reserved.length >= 3) {
    return [];
  }
  const actions: GameAction[] = [];
  for (const tier of CARD_TIERS) {
    for (const card of state.board.market[tier]) {
      actions.push({
        kind: 'reserve_card',
        playerId,
        source: { kind: 'market', tier, cardId: card.id },
      });
    }
    if (state.board.decks[tier].length > 0) {
      actions.push({
        kind: 'reserve_card',
        playerId,
        source: { kind: 'deck', tier },
      });
    }
  }
  return actions;
}

function buyCardCandidates(state: GameState, playerId: string): GameAction[] {
  const player = state.players.find((entry) => entry.id === playerId);
  if (player === undefined) {
    return [];
  }
  const actions: GameAction[] = [];
  for (const tier of CARD_TIERS) {
    for (const card of state.board.market[tier]) {
      actions.push({
        kind: 'buy_card',
        playerId,
        source: { kind: 'market', tier, cardId: card.id },
      });
    }
  }
  for (const card of player.reserved) {
    actions.push({
      kind: 'buy_card',
      playerId,
      source: { kind: 'reserved', cardId: card.id },
    });
  }
  for (const rank of SPECIAL_CARD_RANKS) {
    for (const card of state.board.specialMarket[rank]) {
      actions.push({
        kind: 'buy_card',
        playerId,
        source: { kind: 'special_market', rank, cardId: card.id },
      });
    }
  }
  return actions;
}

function discardTokenOptions(): TokenKind[][] {
  const options: TokenKind[][] = [[]];
  for (let length = 1; length <= 3; length += 1) {
    collectTokenMultisets(length, 0, [], options);
  }
  return options;
}

function collectTokenMultisets(length: number, start: number, current: TokenKind[], output: TokenKind[][]): void {
  if (current.length === length) {
    output.push([...current]);
    return;
  }
  for (let index = start; index < TOKEN_KINDS.length; index += 1) {
    const token = TOKEN_KINDS[index];
    if (token === undefined) {
      continue;
    }
    current.push(token);
    collectTokenMultisets(length, index, current, output);
    current.pop();
  }
}

function evolutionCandidates(state: GameState, playerId: string, baseAction: GameAction): EvolutionSelection[] {
  const player = state.players.find((entry) => entry.id === playerId);
  if (player === undefined) {
    return [];
  }
  const acquired = acquiredCard(state, player.reserved, baseAction);
  // Evolution sources must be cards you own and have in play (tableau only), including the card just bought.
  const sourceCards = baseAction.kind === 'buy_card' && acquired !== undefined ? [...player.tableau, acquired] : player.tableau;
  const sourceIds = new Set(sourceCards.map((card) => card.id));
  const sourcePokemonIds = new Set(sourceCards.map((card) => pokemonIdForEvolution(card)));
  const targets: EvolutionTargetCandidate[] = [];
  for (const tier of CARD_TIERS) {
    for (const card of state.board.market[tier]) {
      if (card.id !== acquired?.id) {
        targets.push({ card, source: { kind: 'market', tier, cardId: card.id } });
      }
    }
  }
  for (const card of player.reserved) {
    if (card.id !== acquired?.id) {
      targets.push({ card, source: { kind: 'reserved', cardId: card.id } });
    }
  }
  // A card reserved from the open market this turn is now a reserved-card evolution target.
  if (baseAction.kind === 'reserve_card' && acquired !== undefined) {
    targets.push({ card: acquired, source: { kind: 'reserved', cardId: acquired.id } });
  }

  const candidates = new Map<string, EvolutionSelection>();
  for (const source of sourceCards) {
    if (source.evolvesTo === undefined) {
      continue;
    }
    for (const target of targets) {
      if (target.card.specialRank !== undefined || target.card.tier !== source.tier + 1 || source.evolvesTo.pokemonId !== pokemonIdForEvolution(target.card)) {
        continue;
      }
      const selection: EvolutionSelection = {
        fromCardId: source.id,
        to: target.source,
      };
      candidates.set(evolutionKey(selection), selection);
    }
  }
  for (const target of targets) {
    if (
      target.card.evolvesFrom === undefined
      || target.card.specialRank !== undefined
      || (!sourceIds.has(target.card.evolvesFrom) && !sourcePokemonIds.has(target.card.evolvesFrom))
    ) {
      continue;
    }
    const source = sourceCards.find((card) => card.id === target.card.evolvesFrom || pokemonIdForEvolution(card) === target.card.evolvesFrom);
    if (source === undefined) {
      continue;
    }
    const selection: EvolutionSelection = {
      fromCardId: source.id,
      to: target.source,
    };
    candidates.set(evolutionKey(selection), selection);
  }
  return [...candidates.values()];
}

/**
 * The face-up card a buy or market reserve moves to the player. Deck reserves are skipped:
 * the top card is hidden, and enumerating it would leak the deck through the action list.
 */
function acquiredCard(state: GameState, reserved: CompanionCard[], action: GameAction): CompanionCard | undefined {
  if (action.kind === 'buy_card') {
    return action.source.kind === 'reserved'
      ? reserved.find((card) => card.id === action.source.cardId)
      : findCardBySource(state, action.source);
  }
  if (action.kind === 'reserve_card' && action.source.kind === 'market') {
    return findCardBySource(state, action.source);
  }
  return undefined;
}

function requiredDiscardSize(state: GameState, action: GameAction): number {
  const player = state.players.find((entry) => entry.id === action.playerId);
  if (player === undefined) {
    return 0;
  }
  const held = TOKEN_KINDS.reduce((sum, token) => sum + player.tokens[token], 0);
  let gained = 0;
  if (action.kind === 'take_tokens') {
    gained = action.tokens.length;
  } else if (action.kind === 'reserve_card') {
    gained = state.board.bank.prism > 0 ? 1 : 0;
  }
  return Math.max(held + gained - MAX_TOKENS_PER_PLAYER, 0);
}

function withSettlementOptions(baseAction: GameAction, discardTokens: TokenKind[], evolution: EvolutionSelection | null): GameAction {
  const options = {
    ...(discardTokens.length > 0 ? { discardTokens } : {}),
    ...(evolution !== null ? { evolution } : {}),
  };
  return {
    ...baseAction,
    ...options,
  } as GameAction;
}

function isActionLegal(state: GameState, action: GameAction): boolean {
  try {
    applyGameAction(state, action, '1970-01-01T00:00:00.000Z');
    return true;
  } catch {
    return false;
  }
}

function actionId(action: GameAction): string {
  if (action.kind === 'take_tokens') {
    return ['take', ...action.tokens, settlementId(action)].filter(Boolean).join(':');
  }
  if (action.kind === 'reserve_card') {
    return ['reserve', sourceId(action.source), settlementId(action)].filter(Boolean).join(':');
  }
  if (action.kind === 'pass_turn') {
    return 'pass';
  }
  return ['buy', sourceId(action.source), settlementId(action)].filter(Boolean).join(':');
}

function sourceId(source: CardSource): string {
  if (source.kind === 'reserved') {
    return `reserved:${source.cardId}`;
  }
  if (source.kind === 'market') {
    return `market:${source.tier}:${source.cardId}`;
  }
  if (source.kind === 'deck') {
    return `deck:${source.tier}`;
  }
  return `special:${source.rank}:${source.cardId}`;
}

function settlementId(action: Exclude<GameAction, { kind: 'pass_turn' }>): string {
  const fragments = [];
  if (action.discardTokens !== undefined && action.discardTokens.length > 0) {
    fragments.push(`discard:${action.discardTokens.join(',')}`);
  }
  if (action.evolution !== undefined && action.evolution !== null) {
    fragments.push(`evolve:${evolutionKey(action.evolution)}`);
  }
  return fragments.join(':');
}

function evolutionKey(selection: EvolutionSelection): string {
  if (selection.to.kind === 'reserved') {
    return `${selection.fromCardId}:reserved:${selection.to.cardId}`;
  }
  return `${selection.fromCardId}:market:${selection.to.tier}:${selection.to.cardId}`;
}

function actionSummary(state: GameState, action: GameAction): string {
  if (action.kind === 'take_tokens') {
    return `Take ${action.tokens.join(', ')}`;
  }
  if (action.kind === 'reserve_card') {
    if (action.source.kind === 'deck') {
      return `Reserve the top tier ${action.source.tier} card`;
    }
    return `Reserve ${cardName(state, action.source)}`;
  }
  if (action.kind === 'pass_turn') {
    return 'Pass';
  }
  return `Buy ${cardName(state, action.source)}`;
}

function cardName(state: GameState, source: Exclude<CardSource, { kind: 'deck' }>): string {
  const card = findCardBySource(state, source);
  return card?.name ?? source.cardId;
}

function pokemonIdForEvolution(card: CompanionCard): string {
  return card.pokemonId ?? card.id;
}

function findCardBySource(state: GameState, source: Exclude<CardSource, { kind: 'deck' }>): CompanionCard | undefined {
  if (source.kind === 'reserved') {
    return state.players.flatMap((player) => player.reserved).find((card) => card.id === source.cardId);
  }
  if (source.kind === 'market') {
    return state.board.market[source.tier].find((card) => card.id === source.cardId);
  }
  return state.board.specialMarket[source.rank].find((card) => card.id === source.cardId);
}
