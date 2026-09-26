import { enumerateTokenTakes } from '../../../../src/game/domain/token-rules.js';
import { ELEMENTS, type Element, type TokenBank, type TokenKind } from '../api/types';

/**
 * Client-side helpers for the staged "take balls" interaction. Legality comes from the
 * server's own rule module (src/game/domain/token-rules.ts), so the tray can never
 * offer a take the engine would reject.
 */
export type PickRefusal = 'notElement' | 'empty' | 'full' | 'pairOnly' | 'pairNeedsFour' | 'invalid';

export function legalTakes(bank: TokenBank): Element[][] {
  return enumerateTokenTakes(bank);
}

/** Whether `selection` plus one `kind` still fits inside some legal take. */
export function canAddToken(bank: TokenBank, selection: readonly TokenKind[], kind: TokenKind): boolean {
  const next = counts([...selection, kind]);
  return legalTakes(bank).some((take) => isSubMultiset(next, counts(take)));
}

/** Whether `selection` is exactly one legal take. */
export function isCompleteTake(bank: TokenBank, selection: readonly TokenKind[]): boolean {
  if (selection.length === 0) {
    return false;
  }
  const selected = counts(selection);
  return legalTakes(bank).some((take) => take.length === selection.length && isSubMultiset(selected, counts(take)));
}

/** Why clicking `kind` cannot extend `selection`; null when it can. */
export function pickRefusal(bank: TokenBank, selection: readonly TokenKind[], kind: TokenKind): PickRefusal | null {
  if (!ELEMENTS.includes(kind as Element)) {
    return 'notElement';
  }
  if (canAddToken(bank, selection, kind)) {
    return null;
  }
  const already = selection.filter((token) => token === kind).length;
  if (bank[kind] - already <= 0) {
    return 'empty';
  }
  const selected = counts(selection);
  const hasPair = Object.values(selected).some((count) => count >= 2);
  if (already === 1 && selection.length === 1 && bank[kind] < 4) {
    return 'pairNeedsFour';
  }
  if (hasPair || (already === 1 && selection.length > 1)) {
    return 'pairOnly';
  }
  const maxSize = Math.max(0, ...legalTakes(bank).map((take) => take.length));
  if (selection.length >= maxSize) {
    return 'full';
  }
  return 'invalid';
}

function counts(tokens: readonly TokenKind[]): Partial<Record<TokenKind, number>> {
  const result: Partial<Record<TokenKind, number>> = {};
  for (const token of tokens) {
    result[token] = (result[token] ?? 0) + 1;
  }
  return result;
}

function isSubMultiset(part: Partial<Record<TokenKind, number>>, whole: Partial<Record<TokenKind, number>>): boolean {
  return Object.entries(part).every(([kind, count]) => (whole[kind as TokenKind] ?? 0) >= (count ?? 0));
}
