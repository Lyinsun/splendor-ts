import { Copy, Gem, Languages, Palette, Play, RefreshCw, ShieldPlus, Sparkles, Users } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import type { CardSource, CardTier, CompanionCard, ElementCost, GameState, PlayerState, TokenKind } from './api/types';
import { ELEMENTS } from './api/types';
import { useGameRoom } from './hooks/useGameRoom';
import {
  APP_COPY,
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  THEMES,
  browserDefaultLocale,
  cardText,
  formatLogMessage,
  leaderName,
  normalizeLocale,
  normalizeThemeId,
  tokenClassName,
  tokenLabel,
  type Locale,
  type ThemeId,
} from './presentation/themes';

const LOCALE_KEY = 'splendor-monsters-locale';
const THEME_KEY = 'splendor-monsters-theme';

type AppCopy = (typeof APP_COPY)[Locale];

export function App() {
  const game = useGameRoom();
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(localStorage.getItem(LOCALE_KEY), browserDefaultLocale()));
  const [themeId, setThemeIdState] = useState<ThemeId>(() => normalizeThemeId(localStorage.getItem(THEME_KEY)));
  const copy = APP_COPY[locale];
  const theme = THEMES[themeId];
  const [draftName, setDraftName] = useState(game.playerName);
  const [roomName, setRoomName] = useState(theme.defaultRoomName[locale]);
  const [tokenSelection, setTokenSelection] = useState<TokenKind[]>([]);

  const room = game.room;
  const myPlayer = game.currentPlayer;
  const appStyle = { '--hero-image': `url("${theme.assets.hero.src}")` } as CSSProperties;

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(LOCALE_KEY, nextLocale);
    if (isDefaultRoomName(roomName)) {
      setRoomName(theme.defaultRoomName[nextLocale]);
    }
  };

  const handleThemeChange = (nextThemeId: ThemeId) => {
    const nextTheme = THEMES[nextThemeId];
    setThemeIdState(nextThemeId);
    localStorage.setItem(THEME_KEY, nextThemeId);
    if (isDefaultRoomName(roomName)) {
      setRoomName(nextTheme.defaultRoomName[locale]);
    }
  };

  const handleTakeTokens = async () => {
    await game.takeTokens(tokenSelection);
    setTokenSelection([]);
  };

  return (
    <main className={`app ${theme.className}`} style={appStyle}>
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
          <button className="icon-button" type="button" onClick={() => void game.refreshRooms()} disabled={game.busy} title={copy.refreshRooms}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {game.error !== null && <div className="error-banner">{game.error}</div>}

      <section className="hero-panel" aria-label={theme.assets.hero.alt[locale]}>
        <div className="hero-copy">
          <p className="eyebrow">{copy.heroEyebrow}</p>
          <h2>{room?.roomName ?? copy.noRoomTitle}</h2>
          <p>{room === null ? copy.noRoomDescription : copy.roomMeta(room.players.length, room.round, room.turn)}</p>
        </div>
        <div className="hero-meta">
          <StatusPill label={theme.label[locale]} tone="muted" />
          <StatusPill label={room === null ? copy.noRoomStatus : copy.roomStatus[room.status]} tone={room?.status === 'playing' ? 'good' : 'muted'} />
          {room?.finalRoundStartedBy !== null && room?.finalRoundStartedBy !== undefined ? <StatusPill label={copy.finalRound} tone="warn" /> : null}
        </div>
      </section>

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
          onRoomNameChange={setRoomName}
          onCreate={() => void game.createRoom({ playerName: draftName, roomName })}
          onJoin={(roomId) => void game.joinRoom(roomId, draftName)}
        />
      ) : (
        <GameTable
          copy={copy}
          locale={locale}
          room={room}
          myPlayer={myPlayer}
          playerId={game.playerId}
          busy={game.busy}
          isHost={game.isHost}
          isMyTurn={game.isMyTurn}
          activePlayerName={game.activePlayer?.name ?? copy.watching}
          tokenSelection={tokenSelection}
          onTokenSelect={(token) => setTokenSelection((current) => nextTokenSelection(current, token))}
          onClearTokens={() => setTokenSelection([])}
          onTakeTokens={() => void handleTakeTokens()}
          onStart={() => void game.startRoom()}
          onAddDemoPlayer={() => void game.addDemoPlayer()}
          onLeave={game.leaveLocalRoom}
          onReserve={(source) => void game.reserveCard(source)}
          onBuy={(source) => void game.buyCard(source)}
        />
      )}
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
          <input value={props.playerName} onChange={(event) => props.onPlayerNameChange(event.target.value)} />
        </label>
        <label>
          {props.copy.roomLabel}
          <input value={props.roomName} onChange={(event) => props.onRoomNameChange(event.target.value)} />
        </label>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={props.busy}>
          <Users size={18} /> {props.copy.createRoom}
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

function GameTable(props: {
  copy: AppCopy;
  locale: Locale;
  room: GameState;
  myPlayer: PlayerState | undefined;
  playerId: string;
  busy: boolean;
  isHost: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  tokenSelection: TokenKind[];
  onTokenSelect: (token: TokenKind) => void;
  onClearTokens: () => void;
  onTakeTokens: () => void;
  onStart: () => void;
  onAddDemoPlayer: () => void;
  onLeave: () => void;
  onReserve: (source: Extract<CardSource, { kind: 'market' }>) => void;
  onBuy: (source: CardSource) => void;
}) {
  const winnerNames = props.room.players.filter((player) => props.room.winnerIds.includes(player.id)).map((player) => player.name).join(', ');
  return (
    <section className="table-layout">
      <aside className="panel side-panel">
        <div className="room-tools">
          <button type="button" className="ghost-button" onClick={() => copyRoomId(props.room.roomId)}>
            <Copy size={16} /> {props.copy.copyRoom}
          </button>
          <button type="button" className="ghost-button" onClick={props.onLeave}>{props.copy.leave}</button>
        </div>
        <h3>{props.copy.trainers}</h3>
        <div className="player-stack">
          {props.room.players.map((player) => (
            <PlayerPanel key={player.id} copy={props.copy} locale={props.locale} player={player} active={props.room.currentPlayerId === player.id} mine={props.playerId === player.id} />
          ))}
        </div>
        {props.room.status === 'lobby' ? (
          <div className="lobby-actions">
            <button type="button" onClick={props.onAddDemoPlayer} disabled={props.busy || props.room.players.length >= 4}>
              <ShieldPlus size={16} /> {props.copy.demoRival}
            </button>
            <button type="button" className="primary-button" onClick={props.onStart} disabled={props.busy || !props.isHost || props.room.players.length < 2}>
              <Play size={18} /> {props.copy.start}
            </button>
          </div>
        ) : null}
        {props.room.status === 'finished' ? <div className="winner-box">{props.copy.winner}: {winnerNames}</div> : null}
      </aside>

      <section className="play-area">
        <div className="panel turn-panel">
          <div>
            <p className="eyebrow">{props.copy.currentTurn}</p>
            <h3>{props.room.status === 'playing' ? props.activePlayerName : props.copy.roomStatus[props.room.status]}</h3>
          </div>
          <StatusPill label={props.isMyTurn ? props.copy.yourMove : props.copy.watching} tone={props.isMyTurn ? 'good' : 'muted'} />
        </div>

        {props.room.status === 'playing' ? (
          <BankPanel
            copy={props.copy}
            locale={props.locale}
            room={props.room}
            disabled={!props.isMyTurn || props.busy}
            tokenSelection={props.tokenSelection}
            onTokenSelect={props.onTokenSelect}
            onClearTokens={props.onClearTokens}
            onTakeTokens={props.onTakeTokens}
          />
        ) : null}

        <div className="market-grid">
          {[3, 2, 1].map((tier) => (
            <MarketTier
              key={tier}
              copy={props.copy}
              locale={props.locale}
              tier={tier as CardTier}
              cards={props.room.board.market[tier as CardTier]}
              disabled={!props.isMyTurn || props.busy || props.room.status !== 'playing'}
              player={props.myPlayer}
              onReserve={props.onReserve}
              onBuy={props.onBuy}
            />
          ))}
        </div>

        <section className="panel mentor-panel">
          <h3>{props.copy.gymMentors}</h3>
          <div className="mentor-row">
            {props.room.board.gymLeaders.map((leader) => (
              <div className={`mentor ${tokenClassName(leader.element)}`} key={leader.id}>
                <strong>{leaderName(leader, props.locale)}</strong>
                <span>{leader.points} {props.copy.glory}</span>
                <CostList cost={leader.requirement} />
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="panel side-panel">
        <h3>{props.copy.yourReserve}</h3>
        {props.myPlayer?.reserved.length === 0 ? <p className="empty">{props.copy.noReserved}</p> : null}
        {props.myPlayer?.reserved.map((card) => (
          <CompanionCardView
            key={card.id}
            copy={props.copy}
            locale={props.locale}
            card={card}
            compact
            disabled={!props.isMyTurn || props.busy}
            affordable={props.myPlayer === undefined ? false : canAfford(props.myPlayer, card)}
            onBuy={() => props.onBuy({ kind: 'reserved', cardId: card.id })}
          />
        ))}
        <h3>{props.copy.battleLog}</h3>
        <div className="log-list">
          {props.room.logs.slice(0, 12).map((entry) => (
            <div className="log-entry" key={entry.id}>
              <span>{props.copy.turn} {entry.turn}</span>
              <p>{formatLogMessage(entry, props.locale)}</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function BankPanel(props: {
  copy: AppCopy;
  locale: Locale;
  room: GameState;
  disabled: boolean;
  tokenSelection: TokenKind[];
  onTokenSelect: (token: TokenKind) => void;
  onClearTokens: () => void;
  onTakeTokens: () => void;
}) {
  const selectionText = props.tokenSelection.length === 0 ? props.copy.noEnergySelected : props.tokenSelection.map((token) => tokenLabel(token, props.locale)).join(', ');
  return (
    <section className="panel bank-panel">
      <div>
        <h3>{props.copy.energyBank}</h3>
        <p>{selectionText}</p>
      </div>
      <div className="bank-tokens">
        {(['fire', 'water', 'grass', 'electric', 'psychic'] satisfies TokenKind[]).map((token) => (
          <button
            type="button"
            className={`token-button ${tokenClassName(token)}`}
            key={token}
            disabled={props.disabled || props.room.board.bank[token] <= 0}
            onClick={() => props.onTokenSelect(token)}
          >
            <span>{tokenLabel(token, props.locale)}</span>
            <strong>{props.room.board.bank[token]}</strong>
          </button>
        ))}
        <div className={`token-button token-static ${tokenClassName('prism')}`}>
          <span>{tokenLabel('prism', props.locale)}</span>
          <strong>{props.room.board.bank.prism}</strong>
        </div>
      </div>
      <div className="bank-actions">
        <button type="button" onClick={props.onClearTokens} disabled={props.disabled || props.tokenSelection.length === 0}>{props.copy.clear}</button>
        <button type="button" className="primary-button" onClick={props.onTakeTokens} disabled={props.disabled || props.tokenSelection.length === 0}>
          <Gem size={18} /> {props.copy.takeEnergy}
        </button>
      </div>
    </section>
  );
}

function MarketTier(props: {
  copy: AppCopy;
  locale: Locale;
  tier: CardTier;
  cards: CompanionCard[];
  disabled: boolean;
  player: PlayerState | undefined;
  onReserve: (source: Extract<CardSource, { kind: 'market' }>) => void;
  onBuy: (source: CardSource) => void;
}) {
  return (
    <section className="panel market-tier">
      <div className="tier-heading">
        <h3>{props.copy.tier} {props.tier}</h3>
        <span>{props.cards.length} {props.copy.open}</span>
      </div>
      <div className="card-row">
        {props.cards.map((card) => (
          <CompanionCardView
            key={card.id}
            copy={props.copy}
            locale={props.locale}
            card={card}
            disabled={props.disabled}
            affordable={props.player === undefined ? false : canAfford(props.player, card)}
            onReserve={() => props.onReserve({ kind: 'market', tier: props.tier, cardId: card.id })}
            onBuy={() => props.onBuy({ kind: 'market', tier: props.tier, cardId: card.id })}
          />
        ))}
      </div>
    </section>
  );
}

function CompanionCardView(props: {
  copy: AppCopy;
  locale: Locale;
  card: CompanionCard;
  disabled: boolean;
  affordable: boolean;
  compact?: boolean;
  onReserve?: () => void;
  onBuy: () => void;
}) {
  const text = cardText(props.card, props.locale);
  return (
    <article className={`companion-card ${tokenClassName(props.card.element)} ${props.compact === true ? 'compact-card' : ''}`}>
      <div className="card-art">
        <span>{text.species.slice(0, 1)}</span>
      </div>
      <div className="card-body">
        <div className="card-title">
          <strong>{text.name}</strong>
          <span>{props.card.points} {props.copy.glory}</span>
        </div>
        <small>{text.species}</small>
        <CostList cost={props.card.cost} />
      </div>
      <div className="card-actions">
        <button type="button" onClick={props.onBuy} disabled={props.disabled || !props.affordable}>{props.copy.buy}</button>
        {props.onReserve !== undefined ? <button type="button" onClick={props.onReserve} disabled={props.disabled}>{props.copy.reserve}</button> : null}
      </div>
    </article>
  );
}

function PlayerPanel(props: { copy: AppCopy; locale: Locale; player: PlayerState; active: boolean; mine: boolean }) {
  return (
    <article className={`player-panel ${props.active ? 'active' : ''}`}>
      <div className="player-heading">
        <strong>{props.player.name}{props.mine ? ` · ${props.copy.you}` : ''}</strong>
        <span>{props.player.score} {props.copy.glory}</span>
      </div>
      <div className="bonus-row">
        {ELEMENTS.map((element) => (
          <span className={`mini-token ${tokenClassName(element)}`} title={tokenLabel(element, props.locale)} key={element}>{props.player.bonuses[element]}</span>
        ))}
        <span className={`mini-token ${tokenClassName('prism')}`} title={tokenLabel('prism', props.locale)}>{props.player.tokens.prism}</span>
      </div>
      <div className="token-row">
        {ELEMENTS.map((element) => (
          <span key={element}>{tokenLabel(element, props.locale)}: {props.player.tokens[element]}</span>
        ))}
      </div>
    </article>
  );
}

function CostList(props: { cost: ElementCost }) {
  return (
    <div className="cost-list">
      {ELEMENTS.map((element) => {
        const value = props.cost[element] ?? 0;
        if (value <= 0) return null;
        return <span className={`cost-chip ${tokenClassName(element)}`} key={element}>{value}</span>;
      })}
    </div>
  );
}

function StatusPill(props: { label: string; tone: 'good' | 'warn' | 'muted' }) {
  return <span className={`status-pill ${props.tone}`}>{props.label}</span>;
}

function nextTokenSelection(current: TokenKind[], token: TokenKind): TokenKind[] {
  const next = [...current, token];
  if (next.length > 3) {
    return [token];
  }
  return next;
}

function canAfford(player: PlayerState, card: CompanionCard): boolean {
  let prismNeeded = 0;
  for (const element of ELEMENTS) {
    const required = Math.max((card.cost[element] ?? 0) - player.bonuses[element], 0);
    const missing = Math.max(required - player.tokens[element], 0);
    prismNeeded += missing;
  }
  return prismNeeded <= player.tokens.prism;
}

function copyRoomId(roomId: string): void {
  void navigator.clipboard?.writeText(roomId);
}

function isDefaultRoomName(value: string): boolean {
  return THEME_OPTIONS.some((theme) => LOCALE_OPTIONS.some((locale) => theme.defaultRoomName[locale.id] === value));
}
