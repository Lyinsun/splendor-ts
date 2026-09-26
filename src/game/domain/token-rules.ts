import { ELEMENTS, GameRuleError, type Element, type TokenBank, type TokenKind } from './types.js';
import { isElementToken } from './tokens.js';

/**
 * Single source of truth for "take tokens", shared by the engine (validation) and
 * legal-actions (enumeration), following the official Splendor rules:
 *
 * - take three tokens of different elements; or
 * - take two tokens of the same element, only if that stack holds at least four; or
 * - when fewer than three elements remain in the bank, take one of each remaining element.
 *
 * Prism (gold) is never taken directly; it only comes from reserving a card.
 */
export const PAIR_MIN_STACK = 4;
export const DISTINCT_TAKE_SIZE = 3;

export function availableElements(bank: TokenBank): Element[] {
  return ELEMENTS.filter((element) => bank[element] > 0);
}

/** How many distinct tokens a "take different" move must contain for this bank. */
export function requiredDistinctCount(bank: TokenBank): number {
  return Math.min(DISTINCT_TAKE_SIZE, availableElements(bank).length);
}

export function validateTokenTake(bank: TokenBank, tokens: readonly TokenKind[]): void {
  if (tokens.length === 0) {
    throw new GameRuleError('Select tokens before taking an action.', 'empty_token_selection');
  }
  if (tokens.some((kind) => !isElementToken(kind))) {
    throw new GameRuleError('Prism tokens can only be gained by reserving a card.', 'cannot_take_prism');
  }
  const kinds = new Set(tokens);

  if (tokens.length === 2 && kinds.size === 1) {
    const [token] = tokens as [TokenKind, TokenKind];
    if (bank[token] < PAIR_MIN_STACK) {
      throw new GameRuleError(`Taking two matching tokens requires at least ${PAIR_MIN_STACK} in the bank.`, 'pair_requires_four');
    }
    return;
  }

  if (kinds.size !== tokens.length) {
    throw new GameRuleError('Take either three different elements or two matching elements.', 'invalid_token_pattern');
  }
  for (const token of tokens) {
    if (bank[token] < 1) {
      throw new GameRuleError(`Not enough ${token} tokens remain in the bank.`, 'bank_token_empty');
    }
  }
  const required = requiredDistinctCount(bank);
  if (tokens.length !== required) {
    throw new GameRuleError(
      required === DISTINCT_TAKE_SIZE
        ? 'Take either three different elements or two matching elements.'
        : `Only ${required} element${required === 1 ? '' : 's'} remain; take one of each.`,
      'invalid_token_pattern',
    );
  }
}

/** Every legal take for this bank, in a stable order. */
export function enumerateTokenTakes(bank: TokenBank): Element[][] {
  const available = availableElements(bank);
  const takes: Element[][] = [];
  const size = requiredDistinctCount(bank);
  if (size > 0) {
    collectCombinations(available, size, 0, [], takes);
  }
  for (const element of ELEMENTS) {
    if (bank[element] >= PAIR_MIN_STACK) {
      takes.push([element, element]);
    }
  }
  return takes;
}

/** A take is possible whenever any element remains; the ten-token limit is settled by discarding. */
export function hasLegalTokenTake(bank: TokenBank): boolean {
  return availableElements(bank).length > 0;
}

function collectCombinations(pool: Element[], size: number, start: number, current: Element[], output: Element[][]): void {
  if (current.length === size) {
    output.push([...current]);
    return;
  }
  for (let index = start; index < pool.length; index += 1) {
    const element = pool[index];
    if (element === undefined) {
      continue;
    }
    current.push(element);
    collectCombinations(pool, size, index + 1, current, output);
    current.pop();
  }
}
