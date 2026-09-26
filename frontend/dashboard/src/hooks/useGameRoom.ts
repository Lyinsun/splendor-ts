import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, gameApi } from '../api/client';
import type { ActionOptions, CardSource, GameState, RoomSummary, SeatGrant, TokenKind } from '../api/types';
import { randomTrainerName } from '../presentation/randomNames';
import { browserDefaultLocale, normalizeLocale } from '../presentation/themes';
import { inviteAction, inviteLink as buildInviteLink, syncRoomParam } from '../runtime/invite';
import { publicUrl, publicWsUrl } from '../runtime/publicPath';

/** `{ roomId, seats: { playerId: seatToken }, controlledPlayerId }` for the room this device sits at. */
const SESSION_KEY = 'splendor-monsters-session';
const NAME_KEY = 'splendor-monsters-player-name';
/** Pre-token keys; they cannot authenticate anymore and are only cleaned up. */
const LEGACY_KEYS = ['splendor-monsters-room-id', 'splendor-monsters-player-id', 'splendor-monsters-local-player-ids'];

const safeStorage = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
  remove(key: string): void { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

/** A stored name wins; newcomers (and the old 'Trainer' default) get a random one, kept for next time. */
function initialPlayerName(): string {
  const stored = safeStorage.get(NAME_KEY)?.trim();
  if (stored !== undefined && stored !== '' && stored !== 'Trainer') {
    return stored;
  }
  // Same key App.tsx keeps the chosen language under, so the name matches the UI language.
  const name = randomTrainerName(normalizeLocale(safeStorage.get('splendor-monsters-locale'), browserDefaultLocale()));
  safeStorage.set(NAME_KEY, name);
  return name;
}

interface SeatSession {
  roomId: string;
  seats: Record<string, string>;
  controlledPlayerId: string;
}

interface WsMessage {
  type: 'room_state' | 'auth_ok' | 'action_result' | 'seat_revoked' | 'room_closed' | 'pong' | 'error';
  requestId?: string;
  room?: GameState;
  onlinePlayerIds?: string[];
  playerId?: string;
  ok?: boolean;
  error?: string;
  error_code?: string;
}

export interface GameRoomError {
  message: string;
  code?: string;
  status?: number;
}

export function useGameRoom() {
  const [session, setSessionState] = useState<SeatSession | null>(readSession);
  const [room, setRoom] = useState<GameState | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState<string>(initialPlayerName);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<GameRoomError | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  const playerId = session?.controlledPlayerId ?? '';
  const seatToken = session?.seats[playerId];
  const localPlayerIds = useMemo(() => Object.keys(session?.seats ?? {}), [session]);

  const currentPlayer = useMemo(() => room?.players.find((player) => player.id === playerId), [playerId, room]);
  const localPlayers = useMemo(() => room?.players.filter((player) => localPlayerIds.includes(player.id)) ?? [], [localPlayerIds, room]);
  const activePlayer = useMemo(() => room?.players.find((player) => player.id === room.currentPlayerId), [room]);
  const isMyTurn = room?.status === 'playing' && room.currentPlayerId === playerId;
  const hostSeatToken = room?.hostPlayerId == null ? undefined : session?.seats[room.hostPlayerId];
  const isHost = hostSeatToken !== undefined;

  const sessionRef = useRef<SeatSession | null>(session);
  sessionRef.current = session;
  const setSession = useCallback((next: SeatSession | null | ((current: SeatSession | null) => SeatSession | null)) => {
    setSessionState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      writeSession(resolved);
      return resolved;
    });
  }, []);

  // Views are personalised: only accept a snapshot rendered for the seat we control, and never go back in time.
  const expectedViewerRef = useRef<string | null>(null);
  expectedViewerRef.current = seatToken === undefined ? null : playerId;
  const acceptRoom = useCallback((next: GameState) => {
    if (next.viewerPlayerId !== expectedViewerRef.current) {
      return;
    }
    setRoom((current) => (current !== null && current.roomId === next.roomId && current.viewerPlayerId === next.viewerPlayerId && next.version < current.version ? current : next));
  }, []);

  const reportError = useCallback((caught: unknown) => {
    const nextError = normalizeError(caught);
    setLastError(nextError);
    setError(errorMessage(nextError));
  }, []);

  const resetToHall = useCallback((message?: string) => {
    setSession(null);
    setRoom(null);
    setOnlinePlayerIds([]);
    if (message !== undefined) {
      setError(message);
    }
  }, [setSession]);

  const refreshRooms = useCallback(async () => {
    try {
      setRooms(await gameApi.listRooms());
    } catch (caught) {
      reportError(caught);
    }
  }, [reportError]);

  /**
   * Stores a newly granted seat. `takeControl: false` (e.g. adding a local demo seat) keeps controlling the current
   * seat, so the view does not jump to the new player.
   */
  const adoptGrant = useCallback((grant: SeatGrant, keepExistingSeats: boolean, takeControl = true) => {
    const current = sessionRef.current;
    const keepSeats = keepExistingSeats && current?.roomId === grant.room.roomId ? current.seats : {};
    const keepControl = !takeControl && current !== null && keepSeats[current.controlledPlayerId] !== undefined;
    const controlledPlayerId = keepControl ? current.controlledPlayerId : grant.playerId;
    setSession({ roomId: grant.room.roomId, seats: { ...keepSeats, [grant.playerId]: grant.seatToken }, controlledPlayerId });
    if (!keepControl) {
      expectedViewerRef.current = grant.playerId;
      setRoom(grant.room);
    }
  }, [setSession]);

  /**
   * The server revoked a seat (kicked, left from another device, rematch cleanup). Drop it and keep playing any other
   * local seat; with none left the socket is a spectator, so accept spectator views instead of freezing.
   */
  const dropSeat = useCallback((revokedPlayerId: string | undefined) => {
    const current = sessionRef.current;
    const target = revokedPlayerId ?? current?.controlledPlayerId;
    if (current === null || target === undefined || current.seats[target] === undefined) {
      return;
    }
    const seats = { ...current.seats };
    delete seats[target];
    const ids = Object.keys(seats);
    if (target === current.controlledPlayerId) {
      // Until the socket re-authenticates as another seat it receives spectator views.
      expectedViewerRef.current = null;
    }
    if (ids.length === 0) {
      setSession(null);
      setError('你的座位已被移除，当前以观众身份观看');
      return;
    }
    setSession({ ...current, seats, controlledPlayerId: ids.includes(current.controlledPlayerId) ? current.controlledPlayerId : ids[0]! });
  }, [setSession]);

  // Restore on load: a `?room=&seat=` link (another device handing over a seat) wins over the stored session;
  // a bare `?room=` invite joins a room that still waits for players and watches one that has started.
  useEffect(() => {
    void refreshRooms();
    LEGACY_KEYS.forEach((key) => safeStorage.remove(key));
    const params = new URLSearchParams(window.location.search);
    const linkRoomId = params.get('room');
    const linkSeatToken = params.get('seat');
    if (linkSeatToken !== null) {
      params.delete('seat');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query === '' ? '' : `?${query}`}${window.location.hash}`);
    }
    const stored = readSession();
    const restore = async () => {
      if (linkRoomId !== null && linkSeatToken !== null) {
        try {
          const view = await gameApi.getRoom(linkRoomId, linkSeatToken);
          if (view.viewerPlayerId !== null) {
            adoptGrant({ room: view, playerId: view.viewerPlayerId, seatToken: linkSeatToken }, true);
            return;
          }
        } catch {
          setError('座位链接已失效（房间已关闭或座位已被移除）');
        }
      } else if (linkRoomId !== null && stored?.roomId !== linkRoomId) {
        try {
          const view = await gameApi.getRoom(linkRoomId);
          if (inviteAction(view) === 'join') {
            const grant = await gameApi.joinRoom(linkRoomId, playerName);
            adoptGrant(grant, false);
          } else {
            setSession(null);
            expectedViewerRef.current = null;
            setRoom(view);
          }
          return;
        } catch {
          setError('邀请链接已失效（房间已关闭或已满员）');
        }
      }
      if (stored === null) {
        return;
      }
      const token = stored.seats[stored.controlledPlayerId];
      try {
        const view = await gameApi.getRoom(stored.roomId, token);
        expectedViewerRef.current = view.viewerPlayerId;
        setRoom(view);
      } catch {
        resetToHall('你之前的游戏房间已不存在，已返回大厅');
      }
    };
    void restore();
    // Runs once on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the open room in the address bar (declared after the restore effect, which reads the link first), so the
  // address is itself an invite and a refresh while watching keeps watching.
  const shownRoomId = room?.roomId ?? null;
  useEffect(() => {
    syncRoomParam(shownRoomId);
  }, [shownRoomId]);

  // Drop seats that the server no longer knows (kicked, left, rematch cleanup) and keep control on a local seat.
  // Hot-seat play follows the turn only when the turn actually changes, so a manual seat switch is not undone
  // by the next push.
  const followedTurnRef = useRef<string | null>(null);
  useEffect(() => {
    if (room === null || session === null || session.roomId !== room.roomId) {
      return;
    }
    const activeIds = new Set(room.players.filter((player) => player.status !== 'left').map((player) => player.id));
    const seats = Object.fromEntries(Object.entries(session.seats).filter(([id]) => activeIds.has(id)));
    const ids = Object.keys(seats);
    const turnChanged = room.currentPlayerId !== followedTurnRef.current;
    followedTurnRef.current = room.currentPlayerId;
    const onTurn = turnChanged && room.currentPlayerId !== null && ids.includes(room.currentPlayerId) ? room.currentPlayerId : null;
    const controlledPlayerId = onTurn ?? (ids.includes(session.controlledPlayerId) ? session.controlledPlayerId : ids[0] ?? '');
    if (ids.length === Object.keys(session.seats).length && controlledPlayerId === session.controlledPlayerId) {
      return;
    }
    setSession({ ...session, seats, controlledPlayerId });
  }, [room, session, setSession]);

  const reconnectRef = useRef<{ attempts: number; timer: ReturnType<typeof setTimeout> | null; manualClose: boolean }>({ attempts: 0, timer: null, manualClose: false });
  const socketRef = useRef<WebSocket | null>(null);
  const seatTokenRef = useRef<string | undefined>(seatToken);
  seatTokenRef.current = seatToken;
  const roomId = room?.roomId ?? null;

  useEffect(() => {
    if (roomId === null) {
      setConnected(false);
      return;
    }
    reconnectRef.current.manualClose = false;

    const connect = () => {
      const socket = new WebSocket(publicWsUrl(`/ws/rooms/${roomId}`));
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        setConnected(true);
        reconnectRef.current.attempts = 0;
        if (seatTokenRef.current !== undefined) {
          socket.send(JSON.stringify({ type: 'auth', requestId: 'auth', seatToken: seatTokenRef.current }));
        }
      });

      socket.addEventListener('close', (event) => {
        setConnected(false);
        if (reconnectRef.current.manualClose || event.code === 4404 || event.code === 4410) {
          return;
        }
        const delay = Math.min(Math.pow(2, reconnectRef.current.attempts) * 1000, 30000);
        reconnectRef.current.attempts += 1;
        reconnectRef.current.timer = setTimeout(connect, delay);
      });

      socket.addEventListener('message', (event) => {
        let message: WsMessage;
        try {
          message = JSON.parse(String(event.data)) as WsMessage;
        } catch {
          console.warn('[WS] Failed to parse message');
          return;
        }
        if (message.type === 'room_state' && message.room !== undefined) {
          acceptRoom(message.room);
          setOnlinePlayerIds(message.onlinePlayerIds ?? []);
        } else if (message.type === 'room_closed' || message.error_code === 'room_not_found') {
          resetToHall('房间已关闭，已返回大厅');
        } else if (message.type === 'seat_revoked') {
          dropSeat(message.playerId);
        } else if (message.requestId === 'auth' && message.ok === false) {
          // The stored token no longer authenticates (revoked while this device was offline).
          dropSeat(undefined);
        } else if (message.type === 'error' || message.ok === false) {
          reportError(new ApiError(message.error ?? 'WebSocket error', 0, message.error_code));
        }
      });
    };

    connect();

    return () => {
      reconnectRef.current.manualClose = true;
      if (reconnectRef.current.timer !== null) {
        clearTimeout(reconnectRef.current.timer);
        reconnectRef.current.timer = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [acceptRoom, dropSeat, reportError, resetToHall, roomId]);

  // Switching the controlled seat re-authenticates the same socket so the pushed view follows it.
  useEffect(() => {
    const socket = socketRef.current;
    if (socket !== null && socket.readyState === WebSocket.OPEN && seatToken !== undefined) {
      socket.send(JSON.stringify({ type: 'auth', requestId: 'auth', seatToken }));
    }
  }, [seatToken]);

  const run = useCallback(async <T,>(task: () => Promise<T>, after?: (value: T) => void) => {
    setBusy(true);
    setError(null);
    setLastError(null);
    try {
      const value = await task();
      after?.(value);
      return value;
    } catch (caught) {
      reportError(caught);
      return null;
    } finally {
      setBusy(false);
      void refreshRooms();
    }
  }, [refreshRooms, reportError]);

  const createRoom = useCallback(async (input: { playerName: string; roomName?: string }) => {
    safeStorage.set(NAME_KEY, input.playerName);
    setPlayerName(input.playerName);
    await run(() => gameApi.createRoom(input), (grant) => adoptGrant(grant, false));
  }, [adoptGrant, run]);

  const joinRoom = useCallback(async (targetRoomId: string, name = playerName) => {
    safeStorage.set(NAME_KEY, name);
    setPlayerName(name);
    await run(() => gameApi.joinRoom(targetRoomId, name), (grant) => adoptGrant(grant, false));
  }, [adoptGrant, playerName, run]);

  /** Watches a room without a seat: the socket stays unauthenticated and receives spectator views. */
  const spectateRoom = useCallback(async (targetRoomId: string) => {
    const stored = sessionRef.current;
    const token = stored?.roomId === targetRoomId ? stored.seats[stored.controlledPlayerId] : undefined;
    if (token === undefined) {
      setSession(null);
    }
    await run(() => gameApi.getRoom(targetRoomId, token), (view) => {
      expectedViewerRef.current = view.viewerPlayerId;
      setRoom(view);
    });
  }, [run, setSession]);

  const selectPlayer = useCallback((nextPlayerId: string) => {
    setSession((current) => (current === null || current.seats[nextPlayerId] === undefined ? current : { ...current, controlledPlayerId: nextPlayerId }));
  }, [setSession]);

  /** Gives up every seat this device holds, then returns to the hall. */
  const leaveRoom = useCallback(async () => {
    if (room === null || session === null) {
      resetToHall();
      return;
    }
    const tokens = Object.values(session.seats);
    await run(async () => {
      for (const token of tokens) {
        await gameApi.leaveRoom(room.roomId, token).catch((caught: unknown) => {
          if (!(caught instanceof ApiError) || (caught.status !== 401 && caught.status !== 404)) throw caught;
        });
      }
    }, () => resetToHall());
  }, [resetToHall, room, run, session]);

  const startRoom = useCallback(async () => {
    if (room === null || hostSeatToken === undefined) return;
    await run(() => gameApi.startRoom(room.roomId, hostSeatToken), acceptRoom);
  }, [acceptRoom, hostSeatToken, room, run]);

  const addDemoPlayer = useCallback(async () => {
    if (room === null || hostSeatToken === undefined) return;
    await run(() => gameApi.addDemoPlayer(room.roomId, hostSeatToken), (grant) => adoptGrant(grant, true, false));
  }, [adoptGrant, hostSeatToken, room, run]);

  const kickPlayer = useCallback(async (targetPlayerId: string) => {
    if (room === null || hostSeatToken === undefined) return;
    await run(() => gameApi.kickPlayer(room.roomId, hostSeatToken, targetPlayerId), acceptRoom);
  }, [acceptRoom, hostSeatToken, room, run]);

  const rematch = useCallback(async () => {
    if (room === null || hostSeatToken === undefined) return;
    await run(() => gameApi.rematch(room.roomId, hostSeatToken), acceptRoom);
  }, [acceptRoom, hostSeatToken, room, run]);

  /**
   * Moves carry the version they were decided on. If the room moved on meanwhile the server answers `stale_state`;
   * we then pull the latest view so the player re-decides on current information instead of acting blind.
   */
  const withSeat = useCallback((task: (targetRoomId: string, token: string, expectedVersion: number) => Promise<GameState>) => {
    if (room === null || seatToken === undefined) return Promise.resolve(null);
    const targetRoomId = room.roomId;
    return run(async () => {
      try {
        return await task(targetRoomId, seatToken, room.version);
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === 'stale_state') {
          void gameApi.getRoom(targetRoomId, seatToken).then(acceptRoom).catch(() => undefined);
          throw new ApiError('局面已更新，已刷新到最新状态，请确认后重新操作', caught.status, caught.code);
        }
        throw caught;
      }
    }, acceptRoom);
  }, [acceptRoom, room, run, seatToken]);

  const takeTokens = useCallback((tokens: TokenKind[], options: ActionOptions = {}) =>
    withSeat((id, token, expectedVersion) => gameApi.takeTokens(id, token, tokens, { ...options, expectedVersion })), [withSeat]);

  const reserveCard = useCallback((source: Extract<CardSource, { kind: 'market' | 'deck' }>, options: ActionOptions = {}) =>
    withSeat((id, token, expectedVersion) => gameApi.reserveCard(id, token, source, { ...options, expectedVersion })), [withSeat]);

  const buyCard = useCallback((source: Exclude<CardSource, { kind: 'deck' }>, options: ActionOptions = {}) =>
    withSeat((id, token, expectedVersion) => gameApi.buyCard(id, token, source, { ...options, expectedVersion })), [withSeat]);

  const passTurn = useCallback(() => withSeat((id, token, expectedVersion) => gameApi.passTurn(id, token, { expectedVersion })), [withSeat]);

  /** A link that hands the controlled seat to another device (anyone holding it can play this seat). */
  const seatLink = useMemo(() => {
    if (room === null || seatToken === undefined) return null;
    const params = new URLSearchParams({ room: room.roomId, seat: seatToken });
    return `${window.location.origin}${publicUrl('/')}?${params.toString()}`;
  }, [room, seatToken]);

  /** A token-free link to this room for friends: they join while it waits for players, and watch afterwards. */
  const inviteLink = useMemo(() => (room === null ? null : buildInviteLink(room.roomId)), [room]);

  return {
    room,
    rooms,
    playerId,
    localPlayerIds,
    playerName,
    currentPlayer,
    localPlayers,
    activePlayer,
    onlinePlayerIds,
    isMyTurn,
    isHost,
    busy,
    error,
    lastError,
    connected,
    seatLink,
    inviteLink,
    setPlayerName,
    selectPlayer,
    refreshRooms,
    createRoom,
    joinRoom,
    spectateRoom,
    leaveRoom,
    startRoom,
    addDemoPlayer,
    kickPlayer,
    rematch,
    takeTokens,
    reserveCard,
    buyCard,
    passTurn,
  };
}

function readSession(): SeatSession | null {
  const raw = safeStorage.get(SESSION_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SeatSession>;
    if (typeof parsed.roomId !== 'string' || parsed.seats === null || typeof parsed.seats !== 'object') {
      return null;
    }
    const seats = Object.fromEntries(Object.entries(parsed.seats).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    const ids = Object.keys(seats);
    if (ids.length === 0) {
      return null;
    }
    const controlledPlayerId = typeof parsed.controlledPlayerId === 'string' && ids.includes(parsed.controlledPlayerId) ? parsed.controlledPlayerId : ids[0]!;
    return { roomId: parsed.roomId, seats, controlledPlayerId };
  } catch {
    return null;
  }
}

function writeSession(session: SeatSession | null): void {
  if (session === null) {
    safeStorage.remove(SESSION_KEY);
    return;
  }
  safeStorage.set(SESSION_KEY, JSON.stringify(session));
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
