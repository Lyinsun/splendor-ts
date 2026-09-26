import { CircleHelp, Copy, Dices, Languages, Palette, Play, RefreshCw, ShieldPlus, Sparkles, Users, X, Zap, ZapOff } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import type { CardSource, EvolutionSelection, GameState, PlayerState, TokenKind } from './api/types';
import { MatchTable } from './components/MatchTable';
import { PlayerPanel, StatusPill } from './components/tableViews';
import { motionPreferred, setMotionPreferred, useBallFlights, type FlightOrigin } from './hooks/useBallFlights';
import { useGameRoom } from './hooks/useGameRoom';
import { HelpModal, hasSeenTutorial, type HelpTab } from './HelpModal';
import { buildActionOptions, type AppCopy, type GameActionKind } from './presentation/gameRules';
import { MATCH_COPY } from './presentation/matchCopy';
import { randomTrainerName } from './presentation/randomNames';
import { publicUrl } from './runtime/publicPath';
import {
  APP_COPY,
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  THEMES,
  browserDefaultLocale,
  normalizeLocale,
  normalizeThemeId,
  type Locale,
  type ThemeId,
} from './presentation/themes';

const LOCALE_KEY = 'splendor-monsters-locale';
const THEME_KEY = 'splendor-monsters-theme';

const safeStorage = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};

type ActionContext = 'take_tokens' | null;
export function App() {
  const game = useGameRoom();
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(safeStorage.get(LOCALE_KEY), browserDefaultLocale()));
  const [themeId, setThemeIdState] = useState<ThemeId>(() => normalizeThemeId(safeStorage.get(THEME_KEY)));
  const copy = APP_COPY[locale];
  const match = MATCH_COPY[locale];
  const theme = THEMES[themeId];
  const [draftName, setDraftName] = useState(game.playerName);
  const [roomName, setRoomName] = useState(theme.defaultRoomName[locale]);
  const [tokenSelection, setTokenSelection] = useState<TokenKind[]>([]);
  const [discardSelection, setDiscardSelection] = useState<TokenKind[]>([]);
  const [evolutionSelection, setEvolutionSelection] = useState<EvolutionSelection | null>(null);
  const [lastActionContext, setLastActionContext] = useState<ActionContext>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTab>('quickStart');
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [motionOn, setMotionOn] = useState(motionPreferred);

  useEffect(() => {
    if (!hasSeenTutorial()) {
      setHelpInitialTab('quickStart');
      setHelpOpen(true);
    }
  }, []);

  const room = game.room;
  const myPlayer = game.currentPlayer;
  const inMatch = room !== null && room.status !== 'lobby';
  const appStyle = { '--hero-image': `url("${publicUrl(theme.assets.hero.src)}")` } as CSSProperties;
  const { primeOrigins } = useBallFlights(room);

  // Reset dismiss when a new error arrives.
  useEffect(() => {
    if (game.error !== null) {
      setErrorDismissed(false);
    }
  }, [game.error]);

  // A draft from an earlier turn (or another seat) must not leak into the next one.
  const turnKey = room === null ? '' : `${room.roomId}:${room.currentPlayerId ?? ''}:${game.playerId}`;
  useEffect(() => {
    setTokenSelection([]);
    setDiscardSelection([]);
    setEvolutionSelection(null);
    setLastActionContext(null);
  }, [turnKey]);

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    safeStorage.set(LOCALE_KEY, nextLocale);
    if (isDefaultRoomName(roomName)) {
      setRoomName(theme.defaultRoomName[nextLocale]);
    }
  };

  const handleThemeChange = (nextThemeId: ThemeId) => {
    const nextTheme = THEMES[nextThemeId];
    setThemeIdState(nextThemeId);
    safeStorage.set(THEME_KEY, nextThemeId);
    if (isDefaultRoomName(roomName)) {
      setRoomName(nextTheme.defaultRoomName[locale]);
    }
  };

  const toggleMotion = () => {
    setMotionPreferred(!motionOn);
    setMotionOn(!motionOn);
  };

  const actionOptions = (actionKind: GameActionKind, source?: Exclude<CardSource, { kind: 'deck' }>) =>
    buildActionOptions(actionKind, room, myPlayer, discardSelection, evolutionSelection, source);
  const clearSettlementDraft = () => {
    setDiscardSelection([]);
    setEvolutionSelection(null);
  };

  const handleTakeTokens = async (origins: FlightOrigin[]) => {
    setLastActionContext('take_tokens');
    primeOrigins(origins);
    const next = await game.takeTokens(tokenSelection, actionOptions('take_tokens'));
    if (next !== null) {
      setTokenSelection([]);
      clearSettlementDraft();
      setLastActionContext(null);
    } else {
      primeOrigins([]);
    }
  };

  const handleReserve = async (source: Extract<CardSource, { kind: 'market' | 'deck' }>) => {
    setLastActionContext(null);
    const next = await game.reserveCard(source, actionOptions('reserve_card', source.kind === 'market' ? source : undefined));
    if (next !== null) {
      setTokenSelection([]);
      clearSettlementDraft();
    }
  };

  const handleBuy = async (source: Exclude<CardSource, { kind: 'deck' }>) => {
    setLastActionContext(null);
    const next = await game.buyCard(source, actionOptions('buy_card', source));
    if (next !== null) {
      setTokenSelection([]);
      clearSettlementDraft();
    }
  };

  const onTokenSelectionChange = useCallback((next: TokenKind[]) => {
    setLastActionContext(null);
    setTokenSelection(next);
  }, []);
  const onDiscardSelectionChange = useCallback((next: TokenKind[]) => {
    setLastActionContext(null);
    setDiscardSelection(next);
  }, []);

  const onLeave = () => {
    if (room?.status === 'playing' && !window.confirm(copy.confirmLeavePlaying)) return;
    void game.leaveRoom();
  };

  return (
    <main className={`app ${theme.className}${inMatch ? ' in-match' : ''}`} style={appStyle}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <h1>{copy.appTitle}</h1>
            <span>{copy.appSubtitle}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <PresentationControls
            copy={copy}
            locale={locale}
            themeId={themeId}
            onLocaleChange={handleLocaleChange}
            onThemeChange={handleThemeChange}
          />
          <StatusPill label={game.connected ? copy.liveSync : copy.offlineSync} tone={game.connected ? 'good' : 'muted'} />
          <button className="icon-button" type="button" onClick={toggleMotion} title={motionOn ? match.motionOn : match.motionOff} aria-pressed={motionOn}>
            {motionOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
          <button className="icon-button" type="button" onClick={() => { setHelpInitialTab('quickStart'); setHelpOpen(true); }} title={copy.help}>
            <CircleHelp size={18} />
          </button>
          {inMatch ? null : (
            <button className="icon-button" type="button" onClick={() => void game.refreshRooms()} disabled={game.busy} title={copy.refreshRooms}>
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </header>

      {game.error !== null && !errorDismissed && (
        <div className="error-banner" role="alert">
          <span>{game.error}</span>
          <button type="button" onClick={() => setErrorDismissed(true)} aria-label={copy.dismiss}>
            <X size={14} />
          </button>
        </div>
      )}

      {room !== null && !game.connected && (
        <div className="reconnect-banner" role="status">
          <span className="spinner" />
          <span>{copy.reconnecting}</span>
        </div>
      )}

      {inMatch ? null : (
        <section className={`hero-panel ${room === null ? 'lobby-hero' : 'match-panel'}`} aria-label={theme.assets.hero.alt[locale]}>
          <div className="hero-copy">
            <p className="eyebrow">{copy.heroEyebrow}</p>
            <h2>{room?.roomName ?? copy.noRoomTitle}</h2>
            <p>{room === null ? copy.noRoomDescription : copy.roomMeta(room.players.length, room.round, room.turn)}</p>
          </div>
          <div className="hero-meta">
            <StatusPill label={theme.label[locale]} tone="muted" />
            <StatusPill label={room === null ? copy.noRoomStatus : copy.roomStatus[room.status]} tone="muted" />
          </div>
        </section>
      )}

      {room === null ? (
        <Lobby
          copy={copy}
          rooms={game.rooms}
          playerName={draftName}
          roomName={roomName}
          busy={game.busy}
          onPlayerNameChange={(value) => {
            setDraftName(value);
            game.setPlayerName(value);
          }}
          onRandomName={() => {
            const next = randomTrainerName(locale, draftName);
            setDraftName(next);
            game.setPlayerName(next);
          }}
          onRoomNameChange={setRoomName}
          onCreate={() => void game.createRoom({ playerName: draftName, roomName })}
          onJoin={(roomId) => void game.joinRoom(roomId, draftName)}
        />
      ) : room.status === 'lobby' ? (
        <WaitingRoom
          copy={copy}
          locale={locale}
          themeId={themeId}
          room={room}
          playerId={game.playerId}
          localPlayerIds={game.localPlayerIds}
          onlinePlayerIds={game.onlinePlayerIds}
          busy={game.busy}
          isHost={game.isHost}
          seatLink={game.seatLink}
          onStart={() => void game.startRoom()}
          onAddDemoPlayer={() => void game.addDemoPlayer()}
          onControlPlayer={game.selectPlayer}
          onLeave={onLeave}
          onKick={(targetPlayerId) => void game.kickPlayer(targetPlayerId)}
        />
      ) : (
        <MatchTable
          copy={copy}
          locale={locale}
          themeId={themeId}
          room={room}
          myPlayer={myPlayer}
          playerId={game.playerId}
          localPlayerIds={game.localPlayerIds}
          onlinePlayerIds={game.onlinePlayerIds}
          busy={game.busy}
          isHost={game.isHost}
          isMyTurn={game.isMyTurn}
          seatLink={game.seatLink}
          lastTakeError={lastActionContext === 'take_tokens' ? game.lastError : null}
          tokenSelection={tokenSelection}
          discardSelection={discardSelection}
          evolutionSelection={evolutionSelection}
          onTokenSelectionChange={onTokenSelectionChange}
          onDiscardSelectionChange={onDiscardSelectionChange}
          onEvolutionSelect={(selection) => {
            setLastActionContext(null);
            setEvolutionSelection(selection);
          }}
          onTakeTokens={(origins) => void handleTakeTokens(origins)}
          onControlPlayer={game.selectPlayer}
          onLeave={onLeave}
          onPass={() => void game.passTurn()}
          onRematch={() => void game.rematch()}
          onReserve={(source) => void handleReserve(source)}
          onBuy={(source) => void handleBuy(source)}
          onCopy={copyText}
        />
      )}
      <HelpModal open={helpOpen} initialTab={helpInitialTab} locale={locale} copy={copy as unknown as Record<string, unknown>} onClose={() => setHelpOpen(false)} />
    </main>
  );
}

function PresentationControls(props: {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  onLocaleChange: (locale: Locale) => void;
  onThemeChange: (themeId: ThemeId) => void;
}) {
  return (
    <div className="presentation-controls">
      <label className="select-control">
        <Languages size={16} />
        <span>{props.copy.languageLabel}</span>
        <select value={props.locale} onChange={(event) => props.onLocaleChange(normalizeLocale(event.target.value, props.locale))}>
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="select-control">
        <Palette size={16} />
        <span>{props.copy.themeLabel}</span>
        <select value={props.themeId} onChange={(event) => props.onThemeChange(normalizeThemeId(event.target.value))}>
          {THEME_OPTIONS.map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.label[props.locale]}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Lobby(props: {
  copy: AppCopy;
  rooms: Array<{ roomId: string; roomName: string; status: GameState['status']; players: number; maxPlayers: number }>;
  playerName: string;
  roomName: string;
  busy: boolean;
  onPlayerNameChange: (value: string) => void;
  onRandomName: () => void;
  onRoomNameChange: (value: string) => void;
  onCreate: () => void;
  onJoin: (roomId: string) => void;
}) {
  return (
    <section className="lobby-grid">
      <div className="panel lobby-form">
        <h3>{props.copy.trainerSeat}</h3>
        <label>
          {props.copy.nameLabel}
          <span className="name-field">
            <input value={props.playerName} maxLength={24} onChange={(event) => props.onPlayerNameChange(event.target.value)} />
            <button type="button" className="icon-button" onClick={props.onRandomName} title={props.copy.randomName} aria-label={props.copy.randomName}>
              <Dices size={18} />
            </button>
          </span>
        </label>
        <label>
          {props.copy.roomLabel}
          <input value={props.roomName} onChange={(event) => props.onRoomNameChange(event.target.value)} />
        </label>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={props.busy}>
          {props.busy ? <span className="spinner" /> : <Users size={18} />} {props.copy.createRoom}
        </button>
      </div>
      <div className="panel room-list">
        <h3>{props.copy.openRooms}</h3>
        {props.rooms.length === 0 ? <p className="empty">{props.copy.noRooms}</p> : null}
        {props.rooms.map((room) => (
          <div className="room-row" key={room.roomId}>
            <div>
              <strong>{room.roomName}</strong>
              <span>{props.copy.playerCount(room.players, room.maxPlayers, room.status)}</span>
            </div>
            <button type="button" onClick={() => props.onJoin(room.roomId)} disabled={props.busy || room.status !== 'lobby'}>
              {props.copy.join}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
/** The pre-game room: seats, invites and the start button. The board lives in MatchTable. */
function WaitingRoom(props: {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  room: GameState;
  playerId: string;
  localPlayerIds: string[];
  onlinePlayerIds: string[];
  busy: boolean;
  isHost: boolean;
  seatLink: string | null;
  onStart: () => void;
  onAddDemoPlayer: () => void;
  onControlPlayer: (playerId: string) => void;
  onLeave: () => void;
  onKick: (playerId: string) => void;
}) {
  const localPlayers = props.room.players.filter((player) => props.localPlayerIds.includes(player.id));
  return (
    <section className="waiting-room">
      <div className="panel waiting-panel">
        <div className="room-tools">
          <button type="button" className="ghost-button" onClick={() => copyRoomId(props.room.roomId)}>
            <Copy size={16} /> {props.copy.copyRoom}
          </button>
          {props.seatLink !== null ? (
            <button type="button" className="ghost-button" title={props.copy.seatLinkHint} onClick={() => copyText(props.seatLink!)}>
              <Copy size={16} /> {props.copy.copySeatLink}
            </button>
          ) : null}
          <button type="button" className="ghost-button" onClick={props.onLeave}>{props.copy.leave}</button>
        </div>
        {props.localPlayerIds.length === 0 ? <p className="empty">{props.copy.spectating}</p> : null}
        <h3>{props.copy.trainers} · {props.room.players.length}/{props.room.maxPlayers}</h3>
        {localPlayers.length > 1 ? (
          <label className="control-seat">
            <span>{props.copy.controlSeat}</span>
            <select value={props.playerId} disabled={props.busy} onChange={(event) => props.onControlPlayer(event.target.value)}>
              {localPlayers.map((player) => (
                <option value={player.id} key={player.id}>{player.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="player-stack">
          {props.room.players.map((player) => (
            <PlayerPanel
              key={player.id}
              copy={props.copy}
              locale={props.locale}
              themeId={props.themeId}
              player={player}
              active={false}
              controlled={props.playerId === player.id}
              local={props.localPlayerIds.includes(player.id)}
              online={props.onlinePlayerIds.includes(player.id)}
              targetScore={props.room.targetScore}
              onKick={props.isHost && player.id !== props.room.hostPlayerId ? () => props.onKick(player.id) : undefined}
            />
          ))}
        </div>
        <div className="lobby-actions">
          <button type="button" onClick={props.onAddDemoPlayer} disabled={props.busy || !props.isHost || props.room.players.length >= props.room.maxPlayers}>
            <ShieldPlus size={16} /> {props.copy.demoRival}
          </button>
          <button type="button" className="primary-button" onClick={props.onStart} disabled={props.busy || !props.isHost || props.room.players.length < 2}>
            {props.busy ? <span className="spinner" /> : <Play size={18} />} {props.copy.start}
          </button>
        </div>
      </div>
    </section>
  );
}

function copyRoomId(roomId: string): void {
  copyText(roomId);
}

function copyText(text: string): void {
  void navigator.clipboard?.writeText(text);
}

function isDefaultRoomName(value: string): boolean {
  return THEME_OPTIONS.some((theme) => LOCALE_OPTIONS.some((locale) => theme.defaultRoomName[locale.id] === value));
}

