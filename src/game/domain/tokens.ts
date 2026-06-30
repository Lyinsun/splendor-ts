import { ELEMENTS, TOKEN_KINDS, type Element, type TokenBank, type TokenKind } from './types.js';

export function emptyTokenBank(): TokenBank {
  return {
    fire: 0,
    water: 0,
    grass: 0,
    electric: 0,
    psychic: 0,
    prism: 0,
  };
}

export function createTokenBank(value: number): TokenBank {
  return {
    fire: value,
    water: value,
    grass: value,
    electric: value,
    psychic: value,
    prism: value,
  };
}

export function createElementCounter(value = 0): Record<Element, number> {
  return {
    fire: value,
    water: value,
    grass: value,
    electric: value,
    psychic: value,
  };
}

export function tokenTotal(tokens: TokenBank): number {
  return TOKEN_KINDS.reduce((sum, kind) => sum + tokens[kind], 0);
}

export function cloneTokenBank(tokens: TokenBank): TokenBank {
  return { ...tokens };
}

export function isElementToken(kind: TokenKind): kind is Element {
  return ELEMENTS.includes(kind as Element);
}
