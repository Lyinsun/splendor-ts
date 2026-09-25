import { hasMainAction } from './engine.js';
import {
  CARD_TIERS,
  SPECIAL_CARD_RANKS,
  type CardTier,
  type CompanionCard,
  type GameState,
  type PlayerState,
  type SpecialCardRank,
} from './types.js';

/** Face-down card placeholder: only the tier is public. */
export interface HiddenCardView {
  id: string;
  tier: CardTier;
  hidden: true;
}

export type ReservedCardView = CompanionCard | HiddenCardView;

export interface PlayerView extends Omit<PlayerState, 'reserved' | 'hiddenReservedIds'> {
  reserved: ReservedCardView[];
}

export interface BoardView extends Omit<GameState['board'], 'decks' | 'specialDecks'> {
  deckCounts: Record<CardTier, number>;
  specialDeckCounts: Record<SpecialCardRank, number>;
}

/**
 * What a single viewer is allowed to see. Deck order and other players' face-down
 * reservations never leave the server; `viewerPlayerId` is null for spectators.
 */
export interface RoomView extends Omit<GameState, 'players' | 'board'> {
  players: PlayerView[];
  board: BoardView;
  maxPlayers: number;
  viewerPlayerId: string | null;
  viewerCanPass: boolean;
}

export function projectRoomView(state: GameState, viewerPlayerId: string | null, maxPlayers: number): RoomView {
  const { players, board, ...rest } = state;
  const { decks, specialDecks, ...openBoard } = board;
  const viewer = viewerPlayerId === null ? undefined : players.find((player) => player.id === viewerPlayerId);
  const viewerCanPass = viewer !== undefined
    && state.status === 'playing'
    && state.currentPlayerId === viewer.id
    && !hasMainAction(state, viewer);
  return structuredClone({
    ...rest,
    maxPlayers,
    viewerPlayerId: viewer?.id ?? null,
    viewerCanPass,
    board: {
      ...openBoard,
      deckCounts: countBy(CARD_TIERS, (tier) => decks[tier].length),
      specialDeckCounts: countBy(SPECIAL_CARD_RANKS, (rank) => specialDecks[rank].length),
    },
    players: players.map((player) => projectPlayer(player, player.id === viewer?.id)),
  });
}

function projectPlayer(player: PlayerState, isViewer: boolean): PlayerView {
  const { hiddenReservedIds, reserved, ...rest } = player;
  const hidden = new Set(hiddenReservedIds);
  return {
    ...rest,
    reserved: reserved.map((card, index): ReservedCardView =>
      isViewer || !hidden.has(card.id) ? card : { id: `hidden-${player.id}-${index}`, tier: card.tier, hidden: true }),
  };
}

function countBy<K extends string | number>(keys: readonly K[], count: (key: K) => number): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, count(key)])) as Record<K, number>;
}
