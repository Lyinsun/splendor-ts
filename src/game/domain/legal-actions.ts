import { applyGameAction } from './engine.js';
import {
  CARD_TIERS,
  ELEMENTS,
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
  const evolutionOptions = [null, ...evolutionCandidates(state, playerId)] satisfies Array<EvolutionSelection | null>;
  const options = new Map<string, LegalGameActionOption>();

  for (const baseAction of baseActions) {
    for (const discardTokens of discardOptions) {
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

  return {
    roomId: state.roomId,
    playerId,
    turn: state.turn,
    actions: [...options.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function takeTokenCandidates(state: GameState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const availableElements = ELEMENTS.filter((element) => state.board.bank[element] > 0);
  for (let left = 0; left < availableElements.length; left += 1) {
    for (let middle = left + 1; middle < availableElements.length; middle += 1) {
      for (let right = middle + 1; right < availableElements.length; right += 1) {
        const tokens = [availableElements[left], availableElements[middle], availableElements[right]];
        if (tokens.every((token) => token !== undefined)) {
          actions.push({ kind: 'take_tokens', playerId, tokens: tokens as TokenKind[] });
        }
      }
    }
  }

  if (availableElements.length <= 2) {
    for (const duplicate of availableElements) {
      if (state.board.bank[duplicate] < 2) {
        continue;
      }
      for (const other of availableElements) {
        if (other !== duplicate && state.board.bank[other] > 0) {
          actions.push({ kind: 'take_tokens', playerId, tokens: [duplicate, duplicate, other] });
        }
      }
    }
  }

  for (const element of ELEMENTS) {
    if (state.board.bank[element] >= 4) {
      actions.push({ kind: 'take_tokens', playerId, tokens: [element, element] });
    }
  }

  return actions;
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

function evolutionCandidates(state: GameState, playerId: string): EvolutionSelection[] {
  const player = state.players.find((entry) => entry.id === playerId);
  if (player === undefined) {
    return [];
  }
  const sourceCards = [
    ...player.tableau,
    ...player.reserved,
    ...CARD_TIERS.flatMap((tier) => state.board.market[tier]),
  ];
  const sourceIds = new Set(sourceCards.map((card) => card.id));
  const sourcePokemonIds = new Set(sourceCards.map((card) => pokemonIdForEvolution(card)));
  const targets: EvolutionTargetCandidate[] = [];
  for (const tier of CARD_TIERS) {
    for (const card of state.board.market[tier]) {
      targets.push({ card, source: { kind: 'market', tier, cardId: card.id } });
    }
    const refillCard = state.board.decks[tier][0];
    if (refillCard !== undefined) {
      targets.push({ card: refillCard, source: { kind: 'market', tier, cardId: refillCard.id } });
    }
  }
  for (const card of player.reserved) {
    targets.push({ card, source: { kind: 'reserved', cardId: card.id } });
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

function settlementId(action: GameAction): string {
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
