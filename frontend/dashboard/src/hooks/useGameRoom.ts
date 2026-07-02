import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, gameApi } from '../api/client';
import type { ActionOptions, CardSource, GameState, RoomSummary, TokenKind } from '../api/types';

const ROOM_KEY = 'splendor-monsters-room-id';
const PLAYER_KEY = 'splendor-monsters-player-id';
const LOCAL_PLAYERS_KEY = 'splendor-monsters-local-player-ids';
const NAME_KEY = 'splendor-monsters-player-name';

interface WsMessage {
  type: 'room_state' | 'error';
  room?: GameState;
  error?: string;
}

export interface GameRoomError {
  message: string;
  code?: string;
  status?: number;
}

export function useGameRoom() {
  const [room, setRoom] = useState<GameState | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem(PLAYER_KEY) ?? '');
  const [localPlayerIds, setLocalPlayerIds] = useState<string[]>(readLocalPlayerIds);
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem(NAME_KEY) ?? 'Trainer');
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<GameRoomError | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  const currentPlayer = useMemo(() => room?.players.find((player) => player.id === playerId), [playerId, room]);
  const localPlayers = useMemo(() => room?.players.filter((player) => localPlayerIds.includes(player.id)) ?? [], [localPlayerIds, room]);
  const activePlayer = useMemo(() => room?.players.find((player) => player.id === room.currentPlayerId), [room]);
  const isMyTurn = room?.status === 'playing' && room.currentPlayerId === playerId;
  const isHost = room?.hostPlayerId !== null && room?.hostPlayerId !== undefined && localPlayerIds.includes(room.hostPlayerId);

  const setControlledPlayerId = useCallback((nextPlayerId: string) => {
    setPlayerId(nextPlayerId);
    if (nextPlayerId === '') {
      localStorage.removeItem(PLAYER_KEY);
    } else {
      localStorage.setItem(PLAYER_KEY, nextPlayerId);
    }
  }, []);

  const replaceLocalPlayerIds = useCallback((nextPlayerIds: string[]) => {
    const normalized = unique(nextPlayerIds);
    setLocalPlayerIds(normalized);
    writeLocalPlayerIds(normalized);
  }, []);

  const rememberLocalPlayerId = useCallback((nextPlayerId: string) => {
    setLocalPlayerIds((current) => {
      const next = unique([...current, nextPlayerId]);
      writeLocalPlayerIds(next);
      return next;
    });
  }, []);

  const selectPlayer = useCallback((nextPlayerId: string) => {
    if (room === null || !localPlayerIds.includes(nextPlayerId) || !room.players.some((player) => player.id === nextPlayerId)) {
      return;
    }
    setControlledPlayerId(nextPlayerId);
  }, [localPlayerIds, room, setControlledPlayerId]);

  const refreshRooms = useCallback(async () => {
    try {
      setRooms(await gameApi.listRooms());
    } catch (caught) {
      const nextError = normalizeError(caught);
      setLastError(nextError);
      setError(errorMessage(nextError));
    }
  }, []);

  const restoreRoom = useCallback(async () => {
    const storedRoomId = localStorage.getItem(ROOM_KEY);
    if (storedRoomId === null) {
      return;
    }
    try {
      const restoredRoom = await gameApi.getRoom(storedRoomId);
      setRoom(restoredRoom);
    } catch {
      localStorage.removeItem(ROOM_KEY);
      localStorage.removeItem(PLAYER_KEY);
      localStorage.removeItem(LOCAL_PLAYERS_KEY);
      setPlayerId('');
      setLocalPlayerIds([]);
    }
  }, []);

  useEffect(() => {
    if (room === null) {
      return;
    }
    const roomPlayerIds = room.players.map((player) => player.id);
    setLocalPlayerIds((current) => {
      const migrated = playerId !== '' && roomPlayerIds.includes(playerId) ? [...current, playerId] : current;
      const next = unique(migrated).filter((id) => roomPlayerIds.includes(id));
      if (sameIds(current, next)) {
        return current;
      }
      writeLocalPlayerIds(next);
      return next;
    });
  }, [playerId, room]);

  useEffect(() => {
    if (room === null) {
      return;
    }
    const roomPlayerIds = room.players.map((player) => player.id);
    const localRoomPlayerIds = localPlayerIds.filter((id) => roomPlayerIds.includes(id));
    const activeLocalPlayerId = room.currentPlayerId !== null && localRoomPlayerIds.includes(room.currentPlayerId) ? room.currentPlayerId : null;
    const nextPlayerId = activeLocalPlayerId ?? (localRoomPlayerIds.includes(playerId) ? playerId : localRoomPlayerIds[0] ?? '');
    if (nextPlayerId !== playerId) {
      setControlledPlayerId(nextPlayerId);
    }
  }, [localPlayerIds, playerId, room, setControlledPlayerId]);

  useEffect(() => {
    void refreshRooms();
    void restoreRoom();
  }, [refreshRooms, restoreRoom]);

  useEffect(() => {
    if (room === null) {
      setConnected(false);
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/rooms/${room.roomId}`);
    socket.addEventListener('open', () => setConnected(true));
    socket.addEventListener('close', () => setConnected(false));
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as WsMessage;
      if (message.type === 'room_state' && message.room !== undefined) {
        setRoom(message.room);
      }
      if (message.type === 'error') {
        const nextError = { message: message.error ?? 'WebSocket error' };
        setLastError(nextError);
        setError(errorMessage(nextError));
      }
    });
    return () => {
      socket.close();
    };
  }, [room?.roomId]);

  const run = useCallback(async <T,>(task: () => Promise<T>, after?: (value: T) => void) => {
    setBusy(true);
    setError(null);
    setLastError(null);
    try {
      const value = await task();
      after?.(value);
      return value;
    } catch (caught) {
      const nextError = normalizeError(caught);
      setLastError(nextError);
      setError(errorMessage(nextError));
      return null;
    } finally {
      setBusy(false);
      void refreshRooms();
    }
  }, [refreshRooms]);

  const createRoom = useCallback(async (input: { playerName: string; roomName?: string }) => {
    localStorage.setItem(NAME_KEY, input.playerName);
    setPlayerName(input.playerName);
    await run(() => gameApi.createRoom(input), (result) => {
      setRoom(result.room);
      setControlledPlayerId(result.playerId);
      replaceLocalPlayerIds([result.playerId]);
      localStorage.setItem(ROOM_KEY, result.room.roomId);
    });
  }, [replaceLocalPlayerIds, run, setControlledPlayerId]);

  const joinRoom = useCallback(async (roomId: string, name = playerName) => {
    localStorage.setItem(NAME_KEY, name);
    setPlayerName(name);
    await run(() => gameApi.joinRoom(roomId, name), (result) => {
      setRoom(result.room);
      setControlledPlayerId(result.playerId);
      replaceLocalPlayerIds([result.playerId]);
      localStorage.setItem(ROOM_KEY, result.room.roomId);
    });
  }, [playerName, replaceLocalPlayerIds, run, setControlledPlayerId]);

  const leaveLocalRoom = useCallback(() => {
    localStorage.removeItem(ROOM_KEY);
    localStorage.removeItem(PLAYER_KEY);
    localStorage.removeItem(LOCAL_PLAYERS_KEY);
    setRoom(null);
    setPlayerId('');
    setLocalPlayerIds([]);
  }, []);

  const startRoom = useCallback(async () => {
    if (room === null || room.hostPlayerId === null || !localPlayerIds.includes(room.hostPlayerId)) return;
    const hostPlayerId = room.hostPlayerId;
    await run(() => gameApi.startRoom(room.roomId, hostPlayerId), setRoom);
  }, [localPlayerIds, room, run]);

  const addDemoPlayer = useCallback(async () => {
    if (room === null) return;
    await run(() => gameApi.addDemoPlayer(room.roomId), (result) => {
      setRoom(result.room);
      rememberLocalPlayerId(result.playerId);
      setControlledPlayerId(result.playerId);
    });
  }, [rememberLocalPlayerId, room, run, setControlledPlayerId]);

  const takeTokens = useCallback(async (tokens: TokenKind[], options: ActionOptions = {}) => {
    if (room === null || playerId === '') return null;
    return await run(() => gameApi.takeTokens(room.roomId, playerId, tokens, options), setRoom);
  }, [playerId, room, run]);

  const reserveCard = useCallback(async (source: Extract<CardSource, { kind: 'market' | 'deck' }>, options: ActionOptions = {}) => {
    if (room === null || playerId === '') return null;
    return await run(() => gameApi.reserveCard(room.roomId, playerId, source, options), setRoom);
  }, [playerId, room, run]);

  const buyCard = useCallback(async (source: Exclude<CardSource, { kind: 'deck' }>, options: ActionOptions = {}) => {
    if (room === null || playerId === '') return null;
    return await run(() => gameApi.buyCard(room.roomId, playerId, source, options), setRoom);
  }, [playerId, room, run]);

  return {
    room,
    rooms,
    playerId,
    localPlayerIds,
    playerName,
    currentPlayer,
    localPlayers,
    activePlayer,
    isMyTurn,
    isHost,
    busy,
    error,
    lastError,
    connected,
    setPlayerName,
    selectPlayer,
    refreshRooms,
    createRoom,
    joinRoom,
    leaveLocalRoom,
    startRoom,
    addDemoPlayer,
    takeTokens,
    reserveCard,
    buyCard,
  };
}

function readLocalPlayerIds(): string[] {
  const raw = localStorage.getItem(LOCAL_PLAYERS_KEY);
  if (raw === null) {
    const legacyPlayerId = localStorage.getItem(PLAYER_KEY);
    return legacyPlayerId === null ? [] : [legacyPlayerId];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? unique(parsed.filter((id): id is string => typeof id === 'string')) : [];
  } catch {
    return [];
  }
}

function writeLocalPlayerIds(playerIds: string[]): void {
  if (playerIds.length === 0) {
    localStorage.removeItem(LOCAL_PLAYERS_KEY);
    return;
  }
  localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(unique(playerIds)));
}

function unique(playerIds: string[]): string[] {
  return [...new Set(playerIds.filter((id) => id.length > 0))];
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeError(error: unknown): GameRoomError {
  if (error instanceof ApiError) {
    return error.code === undefined
      ? { message: error.message, status: error.status }
      : { message: error.message, status: error.status, code: error.code };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error) };
}

function errorMessage(error: GameRoomError): string {
  return error.code === undefined ? error.message : `${error.message} (${error.code})`;
}
