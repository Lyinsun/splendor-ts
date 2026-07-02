import { CircleHelp, Copy, Gem, Languages, Palette, Play, RefreshCw, ShieldPlus, Sparkles, Users } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import type { ActionOptions, CardSource, CardTier, CompanionCard, ElementCost, EvolutionSelection, GameState, PlayerState, SpecialCardRank, TokenKind } from './api/types';
import { ELEMENTS } from './api/types';
import { useGameRoom, type GameRoomError } from './hooks/useGameRoom';
import { HelpModal, hasSeenTutorial, type HelpTab } from './HelpModal';
import {
  APP_COPY,
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  THEMES,
  cardArt,
  cardFlavor,
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
const TOKEN_KIND_ORDER = ['fire', 'water', 'grass', 'electric', 'psychic', 'prism'] satisfies TokenKind[];
const EVOLUTION_TIERS = [2, 3] satisfies CardTier[];

type AppCopy = (typeof APP_COPY)[Locale];
type ActionContext = 'take_tokens' | null;
interface EvolutionCandidate {
  selection: EvolutionSelection;
  label: string;
}

export function App() {
  const game = useGameRoom();
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(localStorage.getItem(LOCALE_KEY), browserDefaultLocale()));
  const [themeId, setThemeIdState] = useState<ThemeId>(() => normalizeThemeId(localStorage.getItem(THEME_KEY)));
  const copy = APP_COPY[locale];
  const theme = THEMES[themeId];
  const [draftName, setDraftName] = useState(game.playerName);
  const [roomName, setRoomName] = useState(theme.defaultRoomName[locale]);
  const [tokenSelection, setTokenSelection] = useState<TokenKind[]>([]);
  const [discardSelection, setDiscardSelection] = useState<TokenKind[]>([]);
  const [evolutionSelection, setEvolutionSelection] = useState<EvolutionSelection | null>(null);
  const [lastActionContext, setLastActionContext] = useState<ActionContext>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTab>('quickStart');

  useEffect(() => {
    if (!hasSeenTutorial()) {
      setHelpInitialTab('quickStart');
      setHelpOpen(true);
    }
  }, []);

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

  const actionOptions = (): ActionOptions => buildActionOptions(room, myPlayer, discardSelection, evolutionSelection);
  const clearSettlementDraft = () => {
    setDiscardSelection([]);
    setEvolutionSelection(null);
  };

  const handleTakeTokens = async () => {
    setLastActionContext('take_tokens');
    const next = await game.takeTokens(tokenSelection, actionOptions());
    if (next !== null) {
      setTokenSelection([]);
      clearSettlementDraft();
      setLastActionContext(null);
    }
  };

  const handleReserve = async (source: Extract<CardSource, { kind: 'market' | 'deck' }>) => {
    setLastActionContext(null);
    const next = await game.reserveCard(source, actionOptions());
    if (next !== null) {
      clearSettlementDraft();
    }
  };

  const handleBuy = async (source: Exclude<CardSource, { kind: 'deck' }>) => {
    setLastActionContext(null);
    const next = await game.buyCard(source, actionOptions());
    if (next !== null) {
      clearSettlementDraft();
    }
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
          <button className="icon-button" type="button" onClick={() => { setHelpInitialTab('quickStart'); setHelpOpen(true); }} title={copy.help}>
            <CircleHelp size={18} />
          </button>
          <button className="icon-button" type="button" onClick={() => void game.refreshRooms()} disabled={game.busy} title={copy.refreshRooms}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {game.error !== null && <div className="error-banner">{game.error}</div>}

      <section className={`hero-panel ${room === null ? 'lobby-hero' : 'match-panel'}`} aria-label={theme.assets.hero.alt[locale]}>
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
          themeId={themeId}
          room={room}
          myPlayer={myPlayer}
          playerId={game.playerId}
          localPlayerIds={game.localPlayerIds}
          busy={game.busy}
          isHost={game.isHost}
          isMyTurn={game.isMyTurn}
          activePlayerName={game.activePlayer?.name ?? copy.watching}
          lastTakeError={lastActionContext === 'take_tokens' ? game.lastError : null}
          tokenSelection={tokenSelection}
          discardSelection={discardSelection}
          evolutionSelection={evolutionSelection}
          onTokenSelect={(token) => {
            setLastActionContext(null);
            setTokenSelection((current) => nextTokenSelection(current, token));
          }}
          onClearTokens={() => {
            setLastActionContext(null);
            setTokenSelection([]);
          }}
          onDiscardSelect={(token) => {
            setLastActionContext(null);
            setDiscardSelection((current) => nextDiscardSelection(current, token));
          }}
          onClearDiscard={() => {
            setLastActionContext(null);
            setDiscardSelection([]);
          }}
          onEvolutionSelect={(selection) => {
            setLastActionContext(null);
            setEvolutionSelection(selection);
          }}
          onTakeTokens={() => void handleTakeTokens()}
          onStart={() => void game.startRoom()}
          onAddDemoPlayer={() => void game.addDemoPlayer()}
          onControlPlayer={game.selectPlayer}
          onLeave={game.leaveLocalRoom}
          onReserve={(source) => void handleReserve(source)}
          onBuy={(source) => void handleBuy(source)}
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
  themeId: ThemeId;
  room: GameState;
  myPlayer: PlayerState | undefined;
  playerId: string;
  localPlayerIds: string[];
  busy: boolean;
  isHost: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  lastTakeError: GameRoomError | null;
  tokenSelection: TokenKind[];
  discardSelection: TokenKind[];
  evolutionSelection: EvolutionSelection | null;
  onTokenSelect: (token: TokenKind) => void;
  onClearTokens: () => void;
  onDiscardSelect: (token: TokenKind) => void;
  onClearDiscard: () => void;
  onEvolutionSelect: (selection: EvolutionSelection | null) => void;
  onTakeTokens: () => void;
  onStart: () => void;
  onAddDemoPlayer: () => void;
  onControlPlayer: (playerId: string) => void;
  onLeave: () => void;
  onReserve: (source: Extract<CardSource, { kind: 'market' | 'deck' }>) => void;
  onBuy: (source: Exclude<CardSource, { kind: 'deck' }>) => void;
}) {
  const winnerNames = props.room.players.filter((player) => props.room.winnerIds.includes(player.id)).map((player) => player.name).join(', ');
  const hasBoard = props.room.status !== 'lobby';
  const actionDisabled = !props.isMyTurn || props.busy || props.room.status !== 'playing';
  const actionDisabledReason = describeActionDisabledReason(props.copy, props.room, props.isMyTurn, props.busy);
  return (
    <section className="table-layout standard-table">
      <aside className="panel side-panel player-rail">
        <div className="room-tools">
          <button type="button" className="ghost-button" onClick={() => copyRoomId(props.room.roomId)}>
            <Copy size={16} /> {props.copy.copyRoom}
          </button>
          <button type="button" className="ghost-button" onClick={props.onLeave}>{props.copy.leave}</button>
        </div>
        <h3>{props.copy.trainers}</h3>
        <label className="control-seat">
          <span>{props.copy.controlSeat}</span>
          <select value={props.playerId} disabled={props.busy || props.localPlayerIds.length === 0} onChange={(event) => props.onControlPlayer(event.target.value)}>
            {props.room.players.filter((player) => props.localPlayerIds.includes(player.id)).map((player) => (
              <option value={player.id} key={player.id}>{player.name}</option>
            ))}
          </select>
        </label>
        <div className="player-stack">
          {props.room.players.map((player) => (
            <PlayerPanel
              key={player.id}
              copy={props.copy}
              locale={props.locale}
              player={player}
              active={props.room.currentPlayerId === player.id}
              controlled={props.playerId === player.id}
              local={props.localPlayerIds.includes(player.id)}
            />
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

      <section className="play-area standard-field">
        <div className="panel turn-panel">
          <div>
            <p className="eyebrow">{props.copy.currentTurn}</p>
            <h3>{props.room.status === 'playing' ? props.activePlayerName : props.copy.roomStatus[props.room.status]}</h3>
          </div>
          <StatusPill label={props.isMyTurn ? props.copy.yourMove : props.copy.watching} tone={props.isMyTurn ? 'good' : 'muted'} />
        </div>

        {hasBoard ? (
          <div className="field-board">
            <div className="field-control-stack">
              <BankPanel
                copy={props.copy}
                locale={props.locale}
                room={props.room}
                player={props.myPlayer}
                disabled={actionDisabled}
                disabledReason={actionDisabledReason}
                lastTakeError={props.lastTakeError}
                tokenSelection={props.tokenSelection}
                discardSelection={props.discardSelection}
                onTokenSelect={props.onTokenSelect}
                onClearTokens={props.onClearTokens}
                onTakeTokens={props.onTakeTokens}
              />
              {props.room.status === 'playing' ? (
                <SettlementPanel
                  copy={props.copy}
                  locale={props.locale}
                  room={props.room}
                  player={props.myPlayer}
                  disabled={actionDisabled}
                  discardSelection={props.discardSelection}
                  evolutionSelection={props.evolutionSelection}
                  onDiscardSelect={props.onDiscardSelect}
                  onClearDiscard={props.onClearDiscard}
                  onEvolutionSelect={props.onEvolutionSelect}
                />
              ) : null}
            </div>

            <div className="field-market-stack">
              <div className="market-grid">
                {[3, 2, 1].map((tier) => (
                  <MarketTier
                    key={tier}
                    copy={props.copy}
                    locale={props.locale}
                    themeId={props.themeId}
                    tier={tier as CardTier}
                    cards={props.room.board.market[tier as CardTier]}
                    deckCount={props.room.board.decks[tier as CardTier].length}
                    disabled={actionDisabled}
                    player={props.myPlayer}
                    onReserve={props.onReserve}
                    onBuy={props.onBuy}
                  />
                ))}
              </div>
            </div>

            <div className="field-side-stack">
              <SpecialMarket
                copy={props.copy}
                locale={props.locale}
                themeId={props.themeId}
                room={props.room}
                disabled={actionDisabled}
                player={props.myPlayer}
                onBuy={props.onBuy}
              />

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
            </div>
          </div>
        ) : null}
      </section>

      <aside className="panel side-panel table-rail">
        <h3>{props.copy.yourReserve}</h3>
        {props.myPlayer?.reserved.length === 0 ? <p className="empty">{props.copy.noReserved}</p> : null}
        {props.myPlayer?.reserved.map((card) => (
          <CompanionCardView
            key={card.id}
            copy={props.copy}
            locale={props.locale}
            themeId={props.themeId}
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

function SpecialMarket(props: {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  room: GameState;
  disabled: boolean;
  player: PlayerState | undefined;
  onBuy: (source: Exclude<CardSource, { kind: 'deck' }>) => void;
}) {
  const ranks = ['rare', 'legendary'] satisfies SpecialCardRank[];
  const hasSpecialCards = ranks.some((rank) => props.room.board.specialMarket[rank].length > 0 || props.room.board.specialDecks[rank].length > 0);
  if (!hasSpecialCards) {
    return null;
  }
  return (
    <section className="panel special-panel">
      <div className="tier-heading">
        <h3>{props.copy.specialCards}</h3>
        <span>{ranks.reduce((sum, rank) => sum + props.room.board.specialMarket[rank].length, 0)} {props.copy.open}</span>
      </div>
      <div className="special-grid">
        {ranks.map((rank) => (
          <div className="special-card-slot" key={rank}>
            <div className="special-slot-heading">
              <span className="special-rank">{props.copy.specialRank[rank]}</span>
              <span className="deck-count">{props.room.board.specialDecks[rank].length} {props.copy.deck}</span>
            </div>
            {props.room.board.specialMarket[rank].map((card) => (
              <CompanionCardView
                key={card.id}
                copy={props.copy}
                locale={props.locale}
                themeId={props.themeId}
                card={card}
                compact
                disabled={props.disabled}
                affordable={props.player === undefined ? false : canAfford(props.player, card)}
                onBuy={() => props.onBuy({ kind: 'special_market', rank, cardId: card.id })}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function BankPanel(props: {
  copy: AppCopy;
  locale: Locale;
  room: GameState;
  player: PlayerState | undefined;
  disabled: boolean;
  disabledReason: string | null;
  lastTakeError: GameRoomError | null;
  tokenSelection: TokenKind[];
  discardSelection: TokenKind[];
  onTokenSelect: (token: TokenKind) => void;
  onClearTokens: () => void;
  onTakeTokens: () => void;
}) {
  const selectionText = props.tokenSelection.length === 0 ? props.copy.noEnergySelected : props.tokenSelection.map((token) => tokenLabel(token, props.locale)).join(', ');
  const selectionProblem = describeTokenTakeSelectionProblem(props.copy, props.locale, props.room, props.player, props.tokenSelection, props.discardSelection);
  const serverProblem = describeTokenTakeServerProblem(props.copy, props.locale, props.lastTakeError);
  const takeProblem = props.disabledReason ?? selectionProblem ?? serverProblem;
  const takeDisabled = props.disabled || props.tokenSelection.length === 0 || selectionProblem !== null;
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
      <p className={`action-problem${takeProblem === null ? ' is-empty' : ''}`} aria-live="polite">{takeProblem ?? ''}</p>
      <div className="bank-actions">
        <button type="button" onClick={props.onClearTokens} disabled={props.disabled || props.tokenSelection.length === 0}>{props.copy.clear}</button>
        <button type="button" className="primary-button" onClick={props.onTakeTokens} disabled={takeDisabled}>
          <Gem size={18} /> {props.copy.takeEnergy}
        </button>
      </div>
    </section>
  );
}

function SettlementPanel(props: {
  copy: AppCopy;
  locale: Locale;
  room: GameState;
  player: PlayerState | undefined;
  disabled: boolean;
  discardSelection: TokenKind[];
  evolutionSelection: EvolutionSelection | null;
  onDiscardSelect: (token: TokenKind) => void;
  onClearDiscard: () => void;
  onEvolutionSelect: (selection: EvolutionSelection | null) => void;
}) {
  if (props.player === undefined) {
    return null;
  }
  const candidates = evolutionCandidates(props.player, props.room, props.locale);
  const selectedEvolutionValue = props.evolutionSelection === null ? '' : evolutionValue(props.evolutionSelection);
  const knownSelectedEvolution = candidates.some((candidate) => evolutionValue(candidate.selection) === selectedEvolutionValue) ? selectedEvolutionValue : '';
  const selectedDiscardText = props.discardSelection.length === 0
    ? props.copy.noEnergySelected
    : props.discardSelection.map((token) => tokenLabel(token, props.locale)).join(', ');

  return (
    <section className="panel settlement-panel">
      <div className="tier-heading">
        <h3>{props.copy.settlement}</h3>
        <span>{props.copy.discardTokens}: {selectedDiscardText}</span>
      </div>
      <div className="settlement-grid">
        <div className="settlement-block">
          <strong>{props.copy.discardTokens}</strong>
          <div className="bank-tokens compact-token-row">
            {TOKEN_KIND_ORDER.map((token) => {
              const selectedCount = props.discardSelection.filter((entry) => entry === token).length;
              const heldCount = props.player?.tokens[token] ?? 0;
              const selectableCount = heldCount + futureTokenAllowance(token);
              return (
                <button
                  type="button"
                  className={`mini-token token-choice ${tokenClassName(token)}`}
                  disabled={props.disabled || selectableCount <= selectedCount}
                  onClick={() => props.onDiscardSelect(token)}
                  title={tokenLabel(token, props.locale)}
                  key={token}
                >
                  {Math.max(heldCount - selectedCount, 0)}
                </button>
              );
            })}
          </div>
          <button type="button" className="ghost-button small-button" disabled={props.disabled || props.discardSelection.length === 0} onClick={props.onClearDiscard}>
            {props.copy.clear}
          </button>
        </div>
        <label className="settlement-block">
          {props.copy.optionalEvolution}
          <select
            value={knownSelectedEvolution}
            disabled={props.disabled || candidates.length === 0}
            onChange={(event) => {
              const candidate = candidates.find((entry) => evolutionValue(entry.selection) === event.target.value);
              props.onEvolutionSelect(candidate?.selection ?? null);
            }}
          >
            <option value="">{props.copy.noEvolution}</option>
            {candidates.map((candidate) => (
              <option key={evolutionValue(candidate.selection)} value={evolutionValue(candidate.selection)}>{candidate.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function MarketTier(props: {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  tier: CardTier;
  cards: CompanionCard[];
  deckCount: number;
  disabled: boolean;
  player: PlayerState | undefined;
  onReserve: (source: Extract<CardSource, { kind: 'market' | 'deck' }>) => void;
  onBuy: (source: Exclude<CardSource, { kind: 'deck' }>) => void;
}) {
  return (
    <section className="panel market-tier">
      <div className="tier-heading">
        <h3>{props.copy.tier} {props.tier}</h3>
        <span>{props.cards.length} {props.copy.open}</span>
      </div>
      <div className="market-lane">
        <button
          type="button"
          className="deck-slot"
          disabled={props.disabled || props.deckCount <= 0}
          onClick={() => props.onReserve({ kind: 'deck', tier: props.tier })}
          title={`${props.copy.reserveDeck} · ${props.copy.tier} ${props.tier}`}
        >
          <span>{props.copy.tier} {props.tier}</span>
          <strong>{props.deckCount}</strong>
          <small>{props.copy.reserveDeck}</small>
        </button>
        <div className="card-row market-card-row">
          {props.cards.map((card) => (
            <CompanionCardView
              key={card.id}
              copy={props.copy}
              locale={props.locale}
              themeId={props.themeId}
              card={card}
              disabled={props.disabled}
              affordable={props.player === undefined ? false : canAfford(props.player, card)}
              onReserve={() => props.onReserve({ kind: 'market', tier: props.tier, cardId: card.id })}
              onBuy={() => props.onBuy({ kind: 'market', tier: props.tier, cardId: card.id })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CompanionCardView(props: {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  card: CompanionCard;
  disabled: boolean;
  affordable: boolean;
  compact?: boolean;
  onReserve?: () => void;
  onBuy: () => void;
}) {
  const text = cardText(props.card, props.locale, props.themeId);
  const art = cardArt(props.card, props.locale, props.themeId);
  const flavor = cardFlavor(props.card, props.locale, props.themeId);
  const cardFaceClass = art?.mode === 'card-face' ? 'card-face-card' : '';
  const cardArtClass = art?.mode === 'card-face' ? 'card-face-art' : '';
  return (
    <article className={`companion-card ${tokenClassName(props.card.element)} ${props.compact === true ? 'compact-card' : ''} ${cardFaceClass}`}>
      <div className={`card-art ${cardArtClass}`}>
        {art === null ? <span>{text.species.slice(0, 1)}</span> : <img src={art.src} alt={art.alt} loading="lazy" />}
      </div>
      <div className="card-body">
        <div className="card-title">
          <strong>{text.name}</strong>
          <span>{props.card.points} {props.copy.glory}</span>
        </div>
        <small>{text.species}</small>
        {flavor === null ? null : <p className="card-flavor">{flavor}</p>}
        <CostList cost={props.card.cost} />
      </div>
      <div className="card-actions">
        <button type="button" onClick={props.onBuy} disabled={props.disabled || !props.affordable}>{props.copy.buy}</button>
        {props.onReserve !== undefined ? <button type="button" onClick={props.onReserve} disabled={props.disabled}>{props.copy.reserve}</button> : null}
      </div>
    </article>
  );
}

function PlayerPanel(props: { copy: AppCopy; locale: Locale; player: PlayerState; active: boolean; controlled: boolean; local: boolean }) {
  const badge = props.controlled ? props.copy.controlled : props.local ? props.copy.localSeat : null;
  return (
    <article className={`player-panel ${props.active ? 'active' : ''} ${props.controlled ? 'controlled' : ''} ${props.local ? 'local' : ''}`}>
      <div className="player-heading">
        <strong>{props.player.name}{badge === null ? '' : ` · ${badge}`}</strong>
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
      <div className="token-row">
        <span>{props.copy.evolutions}: {props.player.evolutionRecords.length}</span>
        <span>{props.copy.pokemonInPlay}: {props.player.tableau.length}</span>
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

function describeActionDisabledReason(copy: AppCopy, room: GameState, isMyTurn: boolean, busy: boolean): string | null {
  if (busy) {
    return copy.tokenTakeProblems.busy;
  }
  if (room.status !== 'playing') {
    return copy.tokenTakeProblems.notPlaying;
  }
  if (!isMyTurn) {
    return copy.tokenTakeProblems.notCurrentTurn;
  }
  return null;
}

function describeTokenTakeSelectionProblem(
  copy: AppCopy,
  locale: Locale,
  room: GameState,
  player: PlayerState | undefined,
  tokenSelection: TokenKind[],
  discardSelection: TokenKind[],
): string | null {
  if (tokenSelection.length === 0) {
    return null;
  }
  if (tokenSelection.some((token) => !isElementToken(token))) {
    return copy.tokenTakeProblems.cannotTakePrism;
  }

  const selectionCounts = countTokens(tokenSelection);
  const entries = TOKEN_KIND_ORDER
    .map((token) => [token, selectionCounts[token]] as const)
    .filter(([, count]) => count > 0);
  const isThreeDifferent = tokenSelection.length === 3 && entries.length === 3 && entries.every(([, count]) => count === 1);
  const availableElementKinds = ELEMENTS.filter((element) => room.board.bank[element] > 0).length;
  const isTwoKindsWhenBankSparse = tokenSelection.length === 3
    && entries.length === 2
    && availableElementKinds <= 2
    && entries.some(([, count]) => count === 2);
  const isPair = tokenSelection.length === 2 && entries.length === 1 && entries[0]?.[1] === 2;

  if (!isThreeDifferent && !isTwoKindsWhenBankSparse && !isPair) {
    return copy.tokenTakeProblems.invalidPattern;
  }
  if (isPair) {
    const token = entries[0]?.[0];
    if (token === undefined || room.board.bank[token] < 4) {
      return copy.tokenTakeProblems.pairRequiresFour;
    }
  }
  for (const [token, count] of entries) {
    if (room.board.bank[token] < count) {
      return copy.tokenTakeProblems.bankTokenEmpty(tokenLabel(token, locale));
    }
  }

  if (player === undefined) {
    return null;
  }
  const nextTokens = countTokens([]);
  for (const token of TOKEN_KIND_ORDER) {
    nextTokens[token] = player.tokens[token] + selectionCounts[token];
  }
  const requiredDiscards = Math.max(tokenTotal(nextTokens) - 10, 0);
  const discardCounts = countTokens(discardSelection);
  for (const token of TOKEN_KIND_ORDER) {
    if (discardCounts[token] > nextTokens[token]) {
      return copy.tokenTakeProblems.invalidTokenDiscard(tokenLabel(token, locale));
    }
  }
  if (discardSelection.length !== requiredDiscards) {
    if (requiredDiscards === 0) {
      return copy.tokenTakeProblems.unexpectedTokenDiscard;
    }
    return copy.tokenTakeProblems.tokenDiscardRequired(requiredDiscards);
  }
  return null;
}

function describeTokenTakeServerProblem(copy: AppCopy, locale: Locale, error: GameRoomError | null): string | null {
  if (error === null) {
    return null;
  }
  switch (error.code) {
    case 'empty_token_selection':
      return copy.tokenTakeProblems.emptySelection;
    case 'cannot_take_prism':
      return copy.tokenTakeProblems.cannotTakePrism;
    case 'invalid_token_pattern':
      return copy.tokenTakeProblems.invalidPattern;
    case 'pair_requires_four':
      return copy.tokenTakeProblems.pairRequiresFour;
    case 'bank_token_empty': {
      const token = TOKEN_KIND_ORDER.find((kind) => error.message.includes(kind));
      return copy.tokenTakeProblems.bankTokenEmpty(token === undefined ? copy.tokenTakeProblems.thatToken : tokenLabel(token, locale));
    }
    case 'token_discard_required':
      return copy.tokenTakeProblems.serverTokenDiscardRequired(error.message);
    case 'invalid_token_discard':
      return copy.tokenTakeProblems.invalidDiscard;
    case 'unexpected_token_discard':
      return copy.tokenTakeProblems.unexpectedTokenDiscard;
    case 'not_current_turn':
      return copy.tokenTakeProblems.notCurrentTurn;
    case 'invalid_status':
      return copy.tokenTakeProblems.notPlaying;
    default:
      return copy.tokenTakeProblems.serverFailure(error.message);
  }
}

function nextTokenSelection(current: TokenKind[], token: TokenKind): TokenKind[] {
  const next = [...current, token];
  if (next.length > 3) {
    return [token];
  }
  return next;
}

function nextDiscardSelection(current: TokenKind[], token: TokenKind): TokenKind[] {
  return [...current, token];
}

function futureTokenAllowance(token: TokenKind): number {
  return token === 'prism' ? 1 : 3;
}

function countTokens(tokens: TokenKind[]): Record<TokenKind, number> {
  const counts = Object.fromEntries(TOKEN_KIND_ORDER.map((token) => [token, 0])) as Record<TokenKind, number>;
  for (const token of tokens) {
    counts[token] += 1;
  }
  return counts;
}

function tokenTotal(tokens: Record<TokenKind, number>): number {
  return TOKEN_KIND_ORDER.reduce((sum, token) => sum + tokens[token], 0);
}

function isElementToken(token: TokenKind): boolean {
  return ELEMENTS.includes(token as (typeof ELEMENTS)[number]);
}

function buildActionOptions(
  room: GameState | null,
  player: PlayerState | undefined,
  discardSelection: TokenKind[],
  evolutionSelection: EvolutionSelection | null,
): ActionOptions {
  const options: ActionOptions = {};
  if (discardSelection.length > 0) {
    options.discardTokens = [...discardSelection];
  }
  if (room !== null && player !== undefined && evolutionSelection !== null && isValidEvolutionSelection(player, room, evolutionSelection)) {
    options.evolution = evolutionSelection;
  }
  return options;
}

function canAfford(player: PlayerState, card: CompanionCard): boolean {
  let prismNeeded = card.requiresPrism === true || card.specialRank !== undefined ? 1 : 0;
  for (const element of ELEMENTS) {
    const required = Math.max((card.cost[element] ?? 0) - player.bonuses[element], 0);
    const missing = Math.max(required - player.tokens[element], 0);
    prismNeeded += missing;
  }
  return prismNeeded <= player.tokens.prism;
}

function evolutionCandidates(player: PlayerState, room: GameState, locale: Locale): EvolutionCandidate[] {
  const targetCards: Array<{ card: CompanionCard; to: EvolutionSelection['to']; sourceLabel: string }> = [];
  for (const tier of EVOLUTION_TIERS) {
    for (const card of room.board.market[tier]) {
      targetCards.push({
        card,
        to: { kind: 'market', tier, cardId: card.id },
        sourceLabel: locale === 'zh-CN' ? `等级 ${tier}` : `tier ${tier}`,
      });
    }
  }
  for (const card of player.reserved) {
    targetCards.push({
      card,
      to: { kind: 'reserved', cardId: card.id },
      sourceLabel: locale === 'zh-CN' ? '保留区' : 'reserve',
    });
  }

  const candidates: EvolutionCandidate[] = [];
  for (const from of player.tableau) {
    for (const target of targetCards) {
      if (!isEvolutionChain(from, target.card)) {
        continue;
      }
      const fromText = cardText(from, locale);
      const toText = cardText(target.card, locale);
      candidates.push({
        selection: { fromCardId: from.id, to: target.to },
        label: `${fromText.name} -> ${toText.name} · ${target.sourceLabel}`,
      });
    }
  }
  return candidates;
}

function isEvolutionChain(from: CompanionCard, to: CompanionCard): boolean {
  if (from.specialRank !== undefined || to.specialRank !== undefined) {
    return false;
  }
  if (to.tier !== from.tier + 1) {
    return false;
  }
  const fromPokemonId = pokemonIdForEvolution(from);
  const toPokemonId = pokemonIdForEvolution(to);
  if (from.evolvesTo !== undefined) {
    return from.evolvesTo.pokemonId === toPokemonId;
  }
  return to.evolvesFrom === from.id || to.evolvesFrom === fromPokemonId;
}

function isValidEvolutionSelection(player: PlayerState, room: GameState, selection: EvolutionSelection): boolean {
  return evolutionCandidates(player, room, 'en-US').some((candidate) => evolutionValue(candidate.selection) === evolutionValue(selection));
}

function evolutionValue(selection: EvolutionSelection): string {
  if (selection.to.kind === 'reserved') {
    return `${selection.fromCardId}:reserved:${selection.to.cardId}`;
  }
  return `${selection.fromCardId}:market:${selection.to.tier}:${selection.to.cardId}`;
}

function pokemonIdForEvolution(card: CompanionCard): string {
  return card.pokemonId ?? card.id;
}

function copyRoomId(roomId: string): void {
  void navigator.clipboard?.writeText(roomId);
}

function isDefaultRoomName(value: string): boolean {
  return THEME_OPTIONS.some((theme) => LOCALE_OPTIONS.some((locale) => theme.defaultRoomName[locale.id] === value));
}
