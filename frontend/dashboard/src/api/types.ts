export const ELEMENTS = ['fire', 'water', 'grass', 'electric', 'psychic'] as const;
export type Element = (typeof ELEMENTS)[number];
export type TokenKind = Element | 'prism';
export type CardTier = 1 | 2 | 3;
export type SpecialCardRank = 'rare' | 'legendary';

export type TokenBank = Record<TokenKind, number>;
export type ElementCost = Partial<Record<Element, number>>;

export interface CompanionCard {
  id: string;
  pokemonId?: string;
  tier: CardTier;
  name: string;
  element: Element;
  points: number;
  cost: ElementCost;
  species: string;
  bonusValue?: number;
  specialRank?: SpecialCardRank;
  evolvesFrom?: string;
  evolvesTo?: EvolutionLink;
  evolutionRequirement?: ElementCost;
  requiresPrism?: boolean;
}

export interface EvolutionLink {
  pokemonId: string;
  requirement: ElementCost;
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
  evolutionRecords: EvolutionRecord[];
  gymLeaders: GymLeader[];
  score: number;
}

export interface BoardState {
  bank: TokenBank;
  decks: Record<CardTier, CompanionCard[]>;
  market: Record<CardTier, CompanionCard[]>;
  specialDecks: Record<SpecialCardRank, CompanionCard[]>;
  specialMarket: Record<SpecialCardRank, CompanionCard[]>;
  gymLeaders: GymLeader[];
}

export interface EvolutionRecord {
  from: CompanionCard;
  to: CompanionCard;
  turn: number;
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
      kind: 'deck';
      tier: CardTier;
    }
  | {
      kind: 'special_market';
      rank: SpecialCardRank;
      cardId: string;
    }
  | {
      kind: 'reserved';
      cardId: string;
    };

export interface EvolutionSelection {
  fromCardId: string;
  to:
    | {
        kind: 'market';
        tier: CardTier;
        cardId: string;
      }
    | {
        kind: 'reserved';
        cardId: string;
      };
}

export interface ActionOptions {
  discardTokens?: TokenKind[];
  evolution?: EvolutionSelection | null;
}

export type GameAction =
  | ({
      kind: 'take_tokens';
      playerId: string;
      tokens: TokenKind[];
    } & ActionOptions)
  | ({
      kind: 'reserve_card';
      playerId: string;
      source: Extract<CardSource, { kind: 'market' | 'deck' }>;
    } & ActionOptions)
  | ({
      kind: 'buy_card';
      playerId: string;
      source: Exclude<CardSource, { kind: 'deck' }>;
    } & ActionOptions);

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
