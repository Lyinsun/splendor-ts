import { ELEMENTS, visibleCards, type ActionOptions, type CardSource, type CardTier, type CompanionCard, type ElementCost, type EvolutionSelection, type GameState, type PlayerState, type SpecialCardRank, type TokenKind } from '../api/types';
import type { GameRoomError } from '../hooks/useGameRoom';
import { APP_COPY, cardText, tokenLabel, type Locale } from './themes';

export type AppCopy = (typeof APP_COPY)[Locale];
export type GameActionKind = 'take_tokens' | 'reserve_card' | 'buy_card';
export const TOKEN_KIND_ORDER = ['fire', 'water', 'grass', 'electric', 'psychic', 'prism'] satisfies TokenKind[];
const EVOLUTION_TIERS = [2, 3] satisfies CardTier[];

export interface EvolutionCandidate {
  selection: EvolutionSelection;
  label: string;
  /** Only reachable once this turn's purchase adds its bonus, so a take or reserve cannot trigger it. */
  needsPurchase: boolean;
}

export function elementColorFor(element: TokenKind): string {
  switch (element) {
    case 'fire': return '#c6423e';
    case 'water': return '#2473aa';
    case 'grass': return '#4a9e5c';
    case 'electric': return '#d7aa24';
    case 'psychic': return '#dc8fb5';
    case 'prism': return '#7b58c8';
    default: return '#888';
  }
}

export function describeActionDisabledReason(copy: AppCopy, room: GameState, isMyTurn: boolean, busy: boolean): string | null {
  if (busy) {
    return copy.tokenTakeProblems.busy;
  }
  if (room.status !== 'playing') {
    return copy.tokenTakeProblems.notPlaying;
  }
  if (!isMyTurn) {
    return copy.tokenTakeProblems.notCurrentTurn;
  }
  return null;
}

export function describeTokenTakeSelectionProblem(
  copy: AppCopy,
  locale: Locale,
  room: GameState,
  player: PlayerState | undefined,
  tokenSelection: TokenKind[],
  discardSelection: TokenKind[],
): string | null {
  if (tokenSelection.length === 0) {
    return null;
  }
  if (tokenSelection.some((token) => !isElementToken(token))) {
    return copy.tokenTakeProblems.cannotTakePrism;
  }

  const selectionCounts = countTokens(tokenSelection);
  const entries = TOKEN_KIND_ORDER
    .map((token) => [token, selectionCounts[token]] as const)
    .filter(([, count]) => count > 0);
  // Mirrors src/game/domain/token-rules.ts: three different elements, or one of each when fewer than three remain;
  // with exactly two left, one of them may be taken twice.
  const availableElementKinds = ELEMENTS.filter((element) => room.board.bank[element] > 0).length;
  const isDistinctTake = tokenSelection.length === Math.min(3, availableElementKinds)
    && entries.length === tokenSelection.length;
  const isSparseDoubleTake = tokenSelection.length === 3 && entries.length === 2 && availableElementKinds === 2;
  const isPair = tokenSelection.length === 2 && entries.length === 1 && entries[0]?.[1] === 2;

  if (!isDistinctTake && !isSparseDoubleTake && !isPair) {
    return copy.tokenTakeProblems.invalidPattern;
  }
  if (isPair) {
    const token = entries[0]?.[0];
    if (token === undefined || room.board.bank[token] < 4) {
      return copy.tokenTakeProblems.pairRequiresFour;
    }
  }
  for (const [token, count] of entries) {
    if (room.board.bank[token] < count) {
      return copy.tokenTakeProblems.bankTokenEmpty(tokenLabel(token, locale));
    }
  }

  if (player === undefined) {
    return null;
  }
  const nextTokens = countTokens([]);
  for (const token of TOKEN_KIND_ORDER) {
    nextTokens[token] = player.tokens[token] + selectionCounts[token];
  }
  const requiredDiscards = Math.max(tokenTotal(nextTokens) - 10, 0);
  const discardCounts = countTokens(discardSelection);
  for (const token of TOKEN_KIND_ORDER) {
    if (discardCounts[token] > nextTokens[token]) {
      return copy.tokenTakeProblems.invalidTokenDiscard(tokenLabel(token, locale));
    }
  }
  if (discardSelection.length !== requiredDiscards) {
    if (requiredDiscards === 0) {
      return copy.tokenTakeProblems.unexpectedTokenDiscard;
    }
    return copy.tokenTakeProblems.tokenDiscardRequired(requiredDiscards);
  }
  return null;
}

export function describeTokenTakeServerProblem(copy: AppCopy, locale: Locale, error: GameRoomError | null): string | null {
  if (error === null) {
    return null;
  }
  switch (error.code) {
    case 'empty_token_selection':
      return copy.tokenTakeProblems.emptySelection;
    case 'cannot_take_prism':
      return copy.tokenTakeProblems.cannotTakePrism;
    case 'invalid_token_pattern':
      return copy.tokenTakeProblems.invalidPattern;
    case 'pair_requires_four':
      return copy.tokenTakeProblems.pairRequiresFour;
    case 'bank_token_empty': {
      const token = TOKEN_KIND_ORDER.find((kind) => error.message.includes(kind));
      return copy.tokenTakeProblems.bankTokenEmpty(token === undefined ? copy.tokenTakeProblems.thatToken : tokenLabel(token, locale));
    }
    case 'token_discard_required':
      return copy.tokenTakeProblems.serverTokenDiscardRequired(error.message);
    case 'invalid_token_discard':
      return copy.tokenTakeProblems.invalidDiscard;
    case 'unexpected_token_discard':
      return copy.tokenTakeProblems.unexpectedTokenDiscard;
    case 'not_current_turn':
      return copy.tokenTakeProblems.notCurrentTurn;
    case 'invalid_status':
      return copy.tokenTakeProblems.notPlaying;
    default:
      return copy.tokenTakeProblems.serverFailure(error.message);
  }
}


export function nextDiscardSelection(current: TokenKind[], token: TokenKind): TokenKind[] {
  return [...current, token];
}

export function futureTokenAllowance(token: TokenKind): number {
  return token === 'prism' ? 1 : 3;
}

export function countTokens(tokens: TokenKind[]): Record<TokenKind, number> {
  const counts = Object.fromEntries(TOKEN_KIND_ORDER.map((token) => [token, 0])) as Record<TokenKind, number>;
  for (const token of tokens) {
    counts[token] += 1;
  }
  return counts;
}

export function tokenTotal(tokens: Record<TokenKind, number>): number {
  return TOKEN_KIND_ORDER.reduce((sum, token) => sum + tokens[token], 0);
}

export function isElementToken(token: TokenKind): boolean {
  return ELEMENTS.includes(token as (typeof ELEMENTS)[number]);
}

export function buildActionOptions(
  actionKind: GameActionKind,
  room: GameState | null,
  player: PlayerState | undefined,
  discardSelection: TokenKind[],
  evolutionSelection: EvolutionSelection | null,
  source?: Exclude<CardSource, { kind: 'deck' }>,
): ActionOptions {
  const options: ActionOptions = {};
  if (shouldSendDiscardSelection(actionKind, room, player, discardSelection)) {
    options.discardTokens = [...discardSelection];
  }
  if (room !== null && player !== undefined && evolutionSelection !== null && isValidEvolutionSelectionForAction(actionKind, player, room, evolutionSelection, source)) {
    options.evolution = afterActionEvolution(actionKind, evolutionSelection, source);
  }
  return options;
}

function shouldSendDiscardSelection(actionKind: GameActionKind, room: GameState | null, player: PlayerState | undefined, discardSelection: TokenKind[]): boolean {
  if (discardSelection.length === 0 || room === null || player === undefined) {
    return false;
  }
  if (actionKind === 'buy_card') {
    return false;
  }
  if (actionKind === 'reserve_card') {
    const prismGain = room.board.bank.prism > 0 ? 1 : 0;
    const requiredDiscards = Math.max(tokenTotal(player.tokens) + prismGain - 10, 0);
    return requiredDiscards > 0 && discardSelection.length === requiredDiscards;
  }
  return true;
}

export function canAfford(player: PlayerState, card: CompanionCard): boolean {
  let prismNeeded = card.requiresPrism === true || card.specialRank !== undefined ? 1 : 0;
  for (const element of ELEMENTS) {
    const required = Math.max((card.cost[element] ?? 0) - player.bonuses[element], 0);
    const missing = Math.max(required - player.tokens[element], 0);
    prismNeeded += missing;
  }
  return prismNeeded <= player.tokens.prism;
}

function bonusValue(card: CompanionCard): number {
  return card.bonusValue ?? (card.specialRank === undefined ? 1 : 2);
}

export function evolutionCandidates(player: PlayerState, room: GameState, locale: Locale): EvolutionCandidate[] {
  const targetCards: Array<{ card: CompanionCard; to: EvolutionSelection['to']; sourceLabel: string }> = [];
  for (const tier of EVOLUTION_TIERS) {
    for (const card of room.board.market[tier]) {
      targetCards.push({
        card,
        to: { kind: 'market', tier, cardId: card.id },
        sourceLabel: locale === 'zh-CN' ? `等级 ${tier}` : `tier ${tier}`,
      });
    }
  }
  for (const card of visibleCards(player.reserved)) {
    targetCards.push({
      card,
      to: { kind: 'reserved', cardId: card.id },
      sourceLabel: locale === 'zh-CN' ? '保留区' : 'reserve',
    });
  }

  const candidates: EvolutionCandidate[] = [];
  for (const from of player.tableau) {
    for (const target of targetCards) {
      if (!isEvolutionChain(from, target.card) || !canMeetEvolutionRequirementThisTurn(player, room, from, target.card)) {
        continue;
      }
      const fromText = cardText(from, locale);
      const toText = cardText(target.card, locale);
      const needsPurchase = !meetsEvolutionRequirement(player, from, target.card);
      const purchaseNote = needsPurchase ? (locale === 'zh-CN' ? '（需先捕获）' : ' (after a catch)') : '';
      candidates.push({
        selection: { fromCardId: from.id, to: target.to },
        label: `${fromText.name} -> ${toText.name} · ${target.sourceLabel}${purchaseNote}`,
        needsPurchase,
      });
    }
  }
  return candidates;
}

function isEvolutionChain(from: CompanionCard, to: CompanionCard): boolean {
  if (from.specialRank !== undefined || to.specialRank !== undefined) {
    return false;
  }
  if (to.tier !== from.tier + 1) {
    return false;
  }
  const fromPokemonId = pokemonIdForEvolution(from);
  const toPokemonId = pokemonIdForEvolution(to);
  if (from.evolvesTo !== undefined) {
    return from.evolvesTo.pokemonId === toPokemonId;
  }
  return to.evolvesFrom === from.id || to.evolvesFrom === fromPokemonId;
}

function meetsEvolutionRequirement(player: PlayerState, from: CompanionCard, to: CompanionCard): boolean {
  if (from.evolvesTo !== undefined) {
    return hasElementRequirement(player, from.evolvesTo.requirement);
  }
  return hasElementRequirement(player, to.evolutionRequirement ?? {});
}

function hasElementRequirement(player: PlayerState, requirement: ElementCost): boolean {
  return ELEMENTS.every((element) => player.bonuses[element] >= (requirement[element] ?? 0));
}

function canMeetEvolutionRequirementThisTurn(player: PlayerState, room: GameState, from: CompanionCard, to: CompanionCard): boolean {
  if (meetsEvolutionRequirement(player, from, to)) {
    return true;
  }
  return purchasableCards(room, player)
    .filter((card) => card.id !== to.id)
    .some((card) => meetsEvolutionRequirement(withPurchasedBonus(player, card), from, to));
}

/** Reserving a market card moves it to the hand, so an evolution into that card targets it as reserved. */
function afterActionEvolution(
  actionKind: GameActionKind,
  selection: EvolutionSelection,
  source?: Exclude<CardSource, { kind: 'deck' }>,
): EvolutionSelection {
  if (actionKind === 'reserve_card' && source?.kind === 'market' && isSameEvolutionTarget(selection, source)) {
    return { ...selection, to: { kind: 'reserved', cardId: selection.to.cardId } };
  }
  return selection;
}

function isValidEvolutionSelectionForAction(
  actionKind: GameActionKind,
  player: PlayerState,
  room: GameState,
  selection: EvolutionSelection,
  source?: Exclude<CardSource, { kind: 'deck' }>,
): boolean {
  if (actionKind !== 'buy_card') {
    return isValidEvolutionSelection(player, room, selection);
  }
  if (source === undefined || isSameEvolutionTarget(selection, source)) {
    return false;
  }
  const boughtCard = findCardBySource(room, player, source);
  if (boughtCard === undefined || !canAfford(player, boughtCard)) {
    return false;
  }
  return isValidEvolutionSelection(withPurchasedBonus(player, boughtCard), room, selection);
}

function isValidEvolutionSelection(player: PlayerState, room: GameState, selection: EvolutionSelection): boolean {
  const from = player.tableau.find((card) => card.id === selection.fromCardId);
  const to = findEvolutionTarget(room, player, selection);
  return from !== undefined && to !== undefined && isEvolutionChain(from, to) && meetsEvolutionRequirement(player, from, to);
}

function withPurchasedBonus(player: PlayerState, card: CompanionCard): PlayerState {
  return {
    ...player,
    bonuses: {
      ...player.bonuses,
      [card.element]: player.bonuses[card.element] + bonusValue(card),
    },
  };
}

function purchasableCards(room: GameState, player: PlayerState): CompanionCard[] {
  const cards: CompanionCard[] = [];
  for (const tier of [1, 2, 3] satisfies CardTier[]) {
    cards.push(...room.board.market[tier]);
  }
  cards.push(...visibleCards(player.reserved));
  for (const rank of ['rare', 'legendary'] satisfies SpecialCardRank[]) {
    cards.push(...room.board.specialMarket[rank]);
  }
  return cards.filter((card) => canAfford(player, card));
}

function findCardBySource(room: GameState, player: PlayerState, source: Exclude<CardSource, { kind: 'deck' }>): CompanionCard | undefined {
  if (source.kind === 'reserved') {
    return visibleCards(player.reserved).find((card) => card.id === source.cardId);
  }
  if (source.kind === 'special_market') {
    return room.board.specialMarket[source.rank].find((card) => card.id === source.cardId);
  }
  return room.board.market[source.tier].find((card) => card.id === source.cardId);
}

function findEvolutionTarget(room: GameState, player: PlayerState, selection: EvolutionSelection): CompanionCard | undefined {
  if (selection.to.kind === 'reserved') {
    return visibleCards(player.reserved).find((card) => card.id === selection.to.cardId);
  }
  return room.board.market[selection.to.tier].find((card) => card.id === selection.to.cardId);
}

function isSameEvolutionTarget(selection: EvolutionSelection, source: Exclude<CardSource, { kind: 'deck' }>): boolean {
  if (source.kind === 'reserved') {
    return selection.to.kind === 'reserved' && selection.to.cardId === source.cardId;
  }
  if (source.kind === 'market') {
    return selection.to.kind === 'market' && selection.to.tier === source.tier && selection.to.cardId === source.cardId;
  }
  return false;
}

export function evolutionValue(selection: EvolutionSelection): string {
  if (selection.to.kind === 'reserved') {
    return `${selection.fromCardId}:reserved:${selection.to.cardId}`;
  }
  return `${selection.fromCardId}:market:${selection.to.tier}:${selection.to.cardId}`;
}

function pokemonIdForEvolution(card: CompanionCard): string {
  return card.pokemonId ?? card.id;
}
