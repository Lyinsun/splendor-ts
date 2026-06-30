export const ELEMENTS = ['fire', 'water', 'grass', 'electric', 'psychic'] as const;
export type Element = (typeof ELEMENTS)[number];
export type TokenKind = Element | 'prism';
export type CardTier = 1 | 2 | 3;

export type TokenBank = Record<TokenKind, number>;
export type ElementCost = Partial<Record<Element, number>>;

export interface CompanionCard {
  id: string;
  tier: CardTier;
  name: string;
  element: Element;
  points: number;
  cost: ElementCost;
  species: string;
}

export interface GymLeader {
  id: string;
  name: string;
  element: Element;
  points: number;
  requirement: ElementCost;
}

export interface PlayerState {
  id: string;
  name: string;
  order: number;
  tokens: TokenBank;
  bonuses: Record<Element, number>;
  tableau: CompanionCard[];
  reserved: CompanionCard[];
  gymLeaders: GymLeader[];
  score: number;
}

export interface BoardState {
  bank: TokenBank;
  decks: Record<CardTier, CompanionCard[]>;
  market: Record<CardTier, CompanionCard[]>;
  gymLeaders: GymLeader[];
}

export interface GameLogEntry {
  id: string;
  turn: number;
  message: string;
  createdAt: string;
}

export interface GameState {
  roomId: string;
  roomName: string;
  status: 'lobby' | 'playing' | 'finished';
  players: PlayerState[];
  board: BoardState;
  currentPlayerId: string | null;
  hostPlayerId: string | null;
  turn: number;
  round: number;
  targetScore: number;
  finalRoundStartedBy: string | null;
  winnerIds: string[];
  logs: GameLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSummary {
  roomId: string;
  roomName: string;
  status: GameState['status'];
  players: number;
  maxPlayers: number;
  turn: number;
  round: number;
  updatedAt: string;
}

export type CardSource =
  | {
      kind: 'market';
      tier: CardTier;
      cardId: string;
    }
  | {
      kind: 'reserved';
      cardId: string;
    };
