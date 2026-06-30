import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, gameApi } from '../api/client';
import type { CardSource, GameState, RoomSummary, TokenKind } from '../api/types';

const ROOM_KEY = 'splendor-monsters-room-id';
const PLAYER_KEY = 'splendor-monsters-player-id';
const NAME_KEY = 'splendor-monsters-player-name';

interface WsMessage {
  type: 'room_state' | 'error';
  room?: GameState;
  error?: string;
}

export function useGameRoom() {
  const [room, setRoom] = useState<GameState | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem(PLAYER_KEY) ?? '');
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem(NAME_KEY) ?? 'Trainer');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  const currentPlayer = useMemo(() => room?.players.find((player) => player.id === playerId), [playerId, room]);
  const activePlayer = useMemo(() => room?.players.find((player) => player.id === room.currentPlayerId), [room]);
  const isMyTurn = room?.status === 'playing' && room.currentPlayerId === playerId;
  const isHost = room?.hostPlayerId === playerId;

  const refreshRooms = useCallback(async () => {
    try {
      setRooms(await gameApi.listRooms());
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);

  const restoreRoom = useCallback(async () => {
    const storedRoomId = localStorage.getItem(ROOM_KEY);
    if (storedRoomId === null) {
      return;
    }
    try {
      setRoom(await gameApi.getRoom(storedRoomId));
    } catch {
      localStorage.removeItem(ROOM_KEY);
      localStorage.removeItem(PLAYER_KEY);
      setPlayerId('');
    }
  }, []);

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
        setError(message.error ?? 'WebSocket error');
      }
    });
    return () => {
      socket.close();
    };
  }, [room?.roomId]);

  const run = useCallback(async <T,>(task: () => Promise<T>, after?: (value: T) => void) => {
    setBusy(true);
    setError(null);
    try {
      const value = await task();
      after?.(value);
      return value;
    } catch (caught) {
      setError(errorMessage(caught));
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
      setPlayerId(result.playerId);
      localStorage.setItem(ROOM_KEY, result.room.roomId);
      localStorage.setItem(PLAYER_KEY, result.playerId);
    });
  }, [run]);

  const joinRoom = useCallback(async (roomId: string, name = playerName) => {
    localStorage.setItem(NAME_KEY, name);
    setPlayerName(name);
    await run(() => gameApi.joinRoom(roomId, name), (result) => {
      setRoom(result.room);
      setPlayerId(result.playerId);
      localStorage.setItem(ROOM_KEY, result.room.roomId);
      localStorage.setItem(PLAYER_KEY, result.playerId);
    });
  }, [playerName, run]);

  const leaveLocalRoom = useCallback(() => {
    localStorage.removeItem(ROOM_KEY);
    localStorage.removeItem(PLAYER_KEY);
    setRoom(null);
    setPlayerId('');
  }, []);

  const startRoom = useCallback(async () => {
    if (room === null || playerId === '') return;
    await run(() => gameApi.startRoom(room.roomId, playerId), setRoom);
  }, [playerId, room, run]);

  const addDemoPlayer = useCallback(async () => {
    if (room === null) return;
    await run(() => gameApi.addDemoPlayer(room.roomId), (result) => setRoom(result.room));
  }, [room, run]);

  const takeTokens = useCallback(async (tokens: TokenKind[]) => {
    if (room === null || playerId === '') return;
    await run(() => gameApi.takeTokens(room.roomId, playerId, tokens), setRoom);
  }, [playerId, room, run]);

  const reserveCard = useCallback(async (source: Extract<CardSource, { kind: 'market' }>) => {
    if (room === null || playerId === '') return;
    await run(() => gameApi.reserveCard(room.roomId, playerId, source), setRoom);
  }, [playerId, room, run]);

  const buyCard = useCallback(async (source: CardSource) => {
    if (room === null || playerId === '') return;
    await run(() => gameApi.buyCard(room.roomId, playerId, source), setRoom);
  }, [playerId, room, run]);

  return {
    room,
    rooms,
    playerId,
    playerName,
    currentPlayer,
    activePlayer,
    isMyTurn,
    isHost,
    busy,
    error,
    connected,
    setPlayerName,
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

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.code === undefined ? error.message : `${error.message} (${error.code})`;
  }
  return error instanceof Error ? error.message : String(error);
}
