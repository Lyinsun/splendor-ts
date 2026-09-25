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

/** Another player's face-down reservation: the server only reveals its tier. */
export interface HiddenCard {
  id: string;
  tier: CardTier;
  hidden: true;
}

export type ReservedCard = CompanionCard | HiddenCard;

export function isHiddenCard(card: ReservedCard): card is HiddenCard {
  return 'hidden' in card && card.hidden === true;
}

export function visibleCards(cards: ReservedCard[]): CompanionCard[] {
  return cards.filter((card): card is CompanionCard => !isHiddenCard(card));
}

export interface PlayerState {
  id: string;
  name: string;
  order: number;
  status: 'active' | 'left';
  tokens: TokenBank;
  bonuses: Record<Element, number>;
  tableau: CompanionCard[];
  reserved: ReservedCard[];
  evolutionRecords: EvolutionRecord[];
  gymLeaders: GymLeader[];
  score: number;
}

export interface BoardState {
  bank: TokenBank;
  deckCounts: Record<CardTier, number>;
  market: Record<CardTier, CompanionCard[]>;
  specialDeckCounts: Record<SpecialCardRank, number>;
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

/** The room as projected for one viewer (see server `projectRoomView`). */
export interface GameState {
  roomId: string;
  version: number;
  maxPlayers: number;
  /** null when viewing as a spectator. */
  viewerPlayerId: string | null;
  viewerCanPass: boolean;
  roomName: string;
  status: 'lobby' | 'playing' | 'finished';
  players: PlayerState[];
  board: BoardState;
  currentPlayerId: string | null;
  hostPlayerId: string | null;
  turn: number;
  round: number;
  targetScore: number;
  endGameTriggeredBy: string | null;
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
    } & ActionOptions)
  | {
      kind: 'pass_turn';
      playerId: string;
    };

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

/** Returned only to the client that claimed a seat; the token is the seat's credential. */
export interface SeatGrant {
  room: GameState;
  playerId: string;
  seatToken: string;
}
