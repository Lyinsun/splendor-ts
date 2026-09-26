import { Check, Copy, Gem, LogOut, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ELEMENTS, isHiddenCard, type CardSource, type CardTier, type EvolutionSelection, type GameState, type PlayerState, type SpecialCardRank, type TokenKind } from '../api/types';
import type { GameRoomError } from '../hooks/useGameRoom';
import { ballAnchor, bounce, flyBall, type FlightOrigin } from '../hooks/useBallFlights';
import {
  TOKEN_KIND_ORDER,
  canAfford,
  describeTokenTakeSelectionProblem,
  describeTokenTakeServerProblem,
  evolutionCandidates,
  evolutionValue,
  tokenTotal,
  type AppCopy,
} from '../presentation/gameRules';
import { MATCH_COPY, type MatchCopy } from '../presentation/matchCopy';
import { cardText, formatLogMessage, leaderName, tokenClassName, tokenLabel, type Locale, type ThemeId } from '../presentation/themes';
import { canAddToken, isCompleteTake, pickRefusal, type PickRefusal } from '../presentation/tokenTakes';
import { PokeBall } from './PokeBall';
import { CompanionCardView, CostList, HiddenCardChip, PlayerCardStrip } from './tableViews';

const MARKET_SLOTS = 4;

type MarketSource = Extract<CardSource, { kind: 'market' | 'deck' }>;
type BuySource = Exclude<CardSource, { kind: 'deck' }>;

export interface MatchTableProps {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  room: GameState;
  myPlayer: PlayerState | undefined;
  playerId: string;
  localPlayerIds: string[];
  onlinePlayerIds: string[];
  busy: boolean;
  isHost: boolean;
  isMyTurn: boolean;
  seatLink: string | null;
  lastTakeError: GameRoomError | null;
  tokenSelection: TokenKind[];
  discardSelection: TokenKind[];
  evolutionSelection: EvolutionSelection | null;
  onTokenSelectionChange: (next: TokenKind[]) => void;
  onDiscardSelectionChange: (next: TokenKind[]) => void;
  onEvolutionSelect: (selection: EvolutionSelection | null) => void;
  onTakeTokens: (origins: FlightOrigin[]) => void;
  onControlPlayer: (playerId: string) => void;
  onLeave: () => void;
  onPass: () => void;
  onRematch: () => void;
  onReserve: (source: MarketSource) => void;
  onBuy: (source: BuySource) => void;
  onCopy: (text: string) => void;
}

export function MatchTable(props: MatchTableProps) {
  const match = MATCH_COPY[props.locale];
  const room = props.room;
  const me = props.myPlayer;
  const canAct = props.isMyTurn && !props.busy && room.status === 'playing' && me !== undefined;
  const others = room.players.filter((player) => player.id !== me?.id);
  const [pickNotice, setPickNotice] = useState<string | null>(null);
  const pendingPick = useRef<FlightOrigin | null>(null);
  // Reserving also hands out a Master Ball, so a card click only stages it; the tray confirms.
  const [stagedReserve, setStagedReserve] = useState<MarketSource | null>(null);
  const pendingReserve = canAct && stagedReserve !== null && reserveStillOpen(room, stagedReserve) ? stagedReserve : null;

  useEffect(() => {
    if (!canAct) setStagedReserve(null);
  }, [canAct]);

  const stageReserve = (source: MarketSource) => {
    if (!canAct) return;
    setPickNotice(null);
    props.onTokenSelectionChange([]);
    setStagedReserve(source);
  };
  const cancelReserve = () => setStagedReserve(null);

  useEffect(() => {
    if (pickNotice === null) return undefined;
    const timer = window.setTimeout(() => setPickNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [pickNotice]);

  // Keep the discard draft no longer than what the current plan requires.
  const discardNeeded = me === undefined || (props.tokenSelection.length === 0 && pendingReserve === null)
    ? 0
    : requiredDiscards(room, me, props.tokenSelection);
  useEffect(() => {
    if (props.discardSelection.length > discardNeeded) {
      props.onDiscardSelectionChange(props.discardSelection.slice(0, discardNeeded));
    }
  }, [discardNeeded, props.discardSelection, props.onDiscardSelectionChange]);

  useTurnTitle(props.isMyTurn && room.status === 'playing', match.yourTurn);

  const pick = (kind: TokenKind) => {
    const stack = ballAnchor(`bank-${kind}`);
    if (!canAct) {
      if (stack !== null) shake(stack);
      return;
    }
    setStagedReserve(null);
    const refusal = pickRefusal(room.board.bank, props.tokenSelection, kind);
    if (refusal !== null) {
      if (stack !== null) shake(stack);
      const picked = props.tokenSelection.filter((token) => token === kind).length;
      setPickNotice(describeRefusal(match, refusal, tokenLabel(kind, props.locale), room.board.bank[kind] - picked));
      return;
    }
    setPickNotice(null);
    const ball = stack?.querySelector('.poke-ball:last-of-type') ?? stack;
    pendingPick.current = ball === null || ball === undefined ? null : { kind, rect: ball.getBoundingClientRect() };
    props.onTokenSelectionChange([...props.tokenSelection, kind]);
  };

  const returnAt = (index: number, element: Element | null) => {
    const kind = props.tokenSelection[index];
    if (kind === undefined) return;
    const target = ballAnchor(`bank-${kind}`);
    if (element !== null && target !== null) {
      void flyBall(kind, element.getBoundingClientRect(), target);
    }
    setPickNotice(null);
    props.onTokenSelectionChange(props.tokenSelection.filter((_, position) => position !== index));
  };

  const selectionProblem = me === undefined
    ? null
    : describeTokenTakeSelectionProblem(props.copy, props.locale, room, me, props.tokenSelection, props.discardSelection);
  const takeReady = canAct && isCompleteTake(room.board.bank, props.tokenSelection) && selectionProblem === null;

  const handFull = me !== undefined && me.reserved.length >= 3;
  const reserveReady = pendingReserve !== null && !handFull && props.discardSelection.length >= discardNeeded;
  const confirmReserve = () => {
    if (pendingReserve === null || !reserveReady) return;
    props.onReserve(pendingReserve);
  };

  const confirm = () => {
    if (!takeReady) return;
    const slots = Array.from(document.querySelectorAll<HTMLElement>('.tray-slot[data-kind]'));
    props.onTakeTokens(slots.map((slot) => ({ kind: slot.dataset.kind as TokenKind, rect: slot.getBoundingClientRect() })));
  };

  useEffect(() => {
    if (!canAct) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target !== null && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      // Keys belong to an open dialog (help, etc.), not to the table behind it.
      if (document.querySelector('[aria-modal="true"]') !== null) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < ELEMENTS.length) {
        event.preventDefault();
        pick(ELEMENTS[index]!);
      } else if (event.key === 'Enter' && pendingReserve !== null) {
        event.preventDefault();
        confirmReserve();
      } else if (event.key === 'Enter' && props.tokenSelection.length > 0) {
        event.preventDefault();
        confirm();
      } else if (event.key === 'Escape') {
        cancelReserve();
        props.onTokenSelectionChange([]);
        setPickNotice(null);
      } else if (event.key === 'Backspace' && props.tokenSelection.length > 0) {
        event.preventDefault();
        returnAt(props.tokenSelection.length - 1, document.querySelector('.tray-slot[data-kind]:last-of-type'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const serverProblem = describeTokenTakeServerProblem(props.copy, props.locale, props.lastTakeError);
  const trayMessage = pickNotice
    // The discard picker already explains an over-10 take, so skip the duplicate notice.
    ?? (props.tokenSelection.length > 0 && discardNeeded === 0 && isCompleteTake(room.board.bank, props.tokenSelection) ? selectionProblem : null)
    ?? serverProblem;

  return (
    <section className={`match-layout${canAct ? ' can-act' : ''}`}>
      <TurnBar {...props} match={match} />

      <div className="opponent-row">
        {others.map((player) => (
          <OpponentStrip
            key={player.id}
            copy={props.copy}
            match={match}
            locale={props.locale}
            themeId={props.themeId}
            player={player}
            active={room.currentPlayerId === player.id}
            local={props.localPlayerIds.includes(player.id)}
            online={props.onlinePlayerIds.includes(player.id)}
            winner={room.winnerIds.includes(player.id)}
            targetScore={room.targetScore}
          />
        ))}
      </div>

      <div className="match-center">
        <BallSupply match={match} locale={props.locale} room={room} selection={props.tokenSelection} canAct={canAct} onPick={pick} />

        <div className="market-board">
          {([3, 2, 1] satisfies CardTier[]).map((tier) => (
            <div className={`market-row tier-${tier}`} key={tier}>
              <button
                type="button"
                className={`deck-back tier-${tier}${pendingReserve?.kind === 'deck' && pendingReserve.tier === tier ? ' is-pending' : ''}`}
                disabled={!canAct || room.board.deckCounts[tier] <= 0}
                onClick={() => stageReserve({ kind: 'deck', tier })}
                title={`${match.reserveTop} · ${props.copy.tier} ${tier}`}
              >
                <span className="deck-tier">{'★'.repeat(tier)}</span>
                <strong>{room.board.deckCounts[tier]}</strong>
                <small>{match.reserveTop}</small>
              </button>
              {room.board.market[tier].map((card) => (
                <CompanionCardView
                  key={card.id}
                  copy={props.copy}
                  locale={props.locale}
                  themeId={props.themeId}
                  card={card}
                  disabled={!canAct}
                  affordable={me !== undefined && canAfford(me, card)}
                  pending={pendingReserve?.kind === 'market' && pendingReserve.cardId === card.id}
                  onReserve={() => stageReserve({ kind: 'market', tier, cardId: card.id })}
                  onBuy={() => props.onBuy({ kind: 'market', tier, cardId: card.id })}
                />
              ))}
              {/* Keep emptied slots so a thinning row stays aligned with the others. */}
              {Array.from({ length: Math.max(0, MARKET_SLOTS - room.board.market[tier].length) }, (_, index) => (
                <span className="market-slot is-empty" aria-hidden="true" key={`empty-${index}`} />
              ))}
            </div>
          ))}
        </div>

        <aside className="match-side">
          <SpecialCards copy={props.copy} locale={props.locale} themeId={props.themeId} room={room} me={me} canAct={canAct} onBuy={props.onBuy} />
          <section className="side-block leaders-block">
            <h3>{props.copy.gymMentors}</h3>
            <div className="leader-list">
              {room.board.gymLeaders.length === 0 ? <p className="leader-empty">{match.leadersGone}</p> : null}
              {room.board.gymLeaders.map((leader) => (
                <div className={`leader-chip ${tokenClassName(leader.element)}`} key={leader.id}>
                  <strong>{leaderName(leader, props.locale)}</strong>
                  <span className="leader-points">{leader.points}</span>
                  <CostList cost={leader.requirement} />
                </div>
              ))}
            </div>
          </section>
          <section className="side-block log-block">
            <h3>{match.log}</h3>
            <div className="match-log">
              {room.logs.slice(0, 14).map((entry, index) => (
                <p className={index === 0 ? 'is-latest' : ''} key={entry.id}>
                  <span>{entry.turn}</span>
                  {formatLogMessage(entry, props.locale)}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {me === undefined ? (
        <footer className="my-dock is-spectator"><p>{match.spectator}</p></footer>
      ) : (
        <footer className={`my-dock${props.isMyTurn && room.status === 'playing' ? ' is-my-turn' : ''}`}>
          <MySeat {...props} me={me} match={match} />
          <ActionTray
            {...props}
            me={me}
            match={match}
            canAct={canAct}
            takeReady={takeReady}
            message={trayMessage}
            discardNeeded={discardNeeded}
            pendingReserve={pendingReserve}
            reserveReady={reserveReady}
            onConfirmReserve={confirmReserve}
            onCancelReserve={cancelReserve}
            pendingPick={pendingPick}
            onReturn={returnAt}
            onConfirm={confirm}
            onClear={() => {
              setPickNotice(null);
              props.onTokenSelectionChange([]);
            }}
          />
          <MyHand {...props} me={me} match={match} canAct={canAct} />
        </footer>
      )}
    </section>
  );
}

function TurnBar(props: MatchTableProps & { match: MatchCopy }) {
  const room = props.room;
  const active = room.players.find((player) => player.id === room.currentPlayerId);
  const winners = room.players.filter((player) => room.winnerIds.includes(player.id)).map((player) => player.name).join(', ');
  const localPlayers = room.players.filter((player) => props.localPlayerIds.includes(player.id));
  const myTurn = props.isMyTurn && room.status === 'playing';
  return (
    <div className={`turn-bar${myTurn ? ' is-my-turn' : ''}${room.status === 'finished' ? ' is-finished' : ''}`}>
      <div className="turn-status">
        <span className="turn-light" aria-hidden="true" />
        <strong>
          {room.status === 'finished'
            ? props.match.finished(winners)
            : myTurn ? props.match.yourTurn : props.match.waitingFor(active?.name ?? '…')}
        </strong>
        <span className="turn-meta">{room.roomName} · {props.match.roundTurn(room.round, room.turn)}</span>
        {room.endGameTriggeredBy !== null && room.status === 'playing' ? <span className="final-flag">{props.copy.finalRound}</span> : null}
      </div>
      <div className="turn-tools">
        {localPlayers.length > 1 ? (
          <label className="seat-switch">
            <span>{props.match.seats}</span>
            <select value={props.playerId} disabled={props.busy} onChange={(event) => props.onControlPlayer(event.target.value)}>
              {localPlayers.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}
            </select>
          </label>
        ) : null}
        {room.status === 'finished' && props.isHost ? (
          <button type="button" className="primary-button" onClick={props.onRematch} disabled={props.busy}><Play size={16} /> {props.copy.rematch}</button>
        ) : null}
        <button type="button" className="ghost-button" onClick={() => props.onCopy(room.roomId)} title={props.copy.copyRoom}><Copy size={15} /> {props.copy.copyRoom}</button>
        {props.seatLink !== null ? (
          <button type="button" className="ghost-button" onClick={() => props.onCopy(props.seatLink!)} title={props.copy.seatLinkHint}><Copy size={15} /> {props.copy.copySeatLink}</button>
        ) : null}
        <button type="button" className="ghost-button" onClick={props.onLeave}><LogOut size={15} /> {props.copy.leave}</button>
      </div>
    </div>
  );
}

function BallSupply(props: { match: MatchCopy; locale: Locale; room: GameState; selection: TokenKind[]; canAct: boolean; onPick: (kind: TokenKind) => void }) {
  const bank = props.room.board.bank;
  return (
    <div className="ball-supply" role="group" aria-label={props.match.supply}>
      {ELEMENTS.map((kind, index) => {
        const picked = props.selection.filter((token) => token === kind).length;
        const left = bank[kind] - picked;
        const blocked = props.canAct && (left <= 0 || !canAddToken(bank, props.selection, kind));
        return (
          <button
            type="button"
            key={kind}
            className={`ball-stack ${tokenClassName(kind)}${blocked ? ' is-blocked' : ''}${picked > 0 ? ' is-picked' : ''}`}
            data-ball-anchor={`bank-${kind}`}
            aria-disabled={!props.canAct || blocked}
            aria-label={`${tokenLabel(kind, props.locale)} ${left}`}
            title={`${tokenLabel(kind, props.locale)} · ${index + 1}`}
            onClick={() => props.onPick(kind)}
          >
            <BallPile kind={kind} count={left} />
            <span className="stack-count">{left}</span>
            <span className="stack-name">{tokenLabel(kind, props.locale)}</span>
            <kbd className="stack-key">{index + 1}</kbd>
          </button>
        );
      })}
      <div className="ball-stack token-prism is-static" data-ball-anchor="bank-prism" title={tokenLabel('prism', props.locale)}>
        <BallPile kind="prism" count={bank.prism} />
        <span className="stack-count">{bank.prism}</span>
        <span className="stack-name">{tokenLabel('prism', props.locale)}</span>
      </div>
    </div>
  );
}

/** A small pile: up to four balls stacked, so "how many are left" reads at a glance. */
function BallPile(props: { kind: TokenKind; count: number }) {
  const visible = Math.max(1, Math.min(4, props.count));
  return (
    <span className={`ball-pile${props.count <= 0 ? ' is-empty' : ''}`} aria-hidden="true">
      {Array.from({ length: visible }, (_, index) => (
        <PokeBall kind={props.kind} size={34} key={index} className={`pile-${index}`} />
      ))}
    </span>
  );
}

function ActionTray(props: MatchTableProps & {
  me: PlayerState;
  match: MatchCopy;
  canAct: boolean;
  takeReady: boolean;
  message: string | null;
  discardNeeded: number;
  pendingReserve: MarketSource | null;
  reserveReady: boolean;
  onConfirmReserve: () => void;
  onCancelReserve: () => void;
  pendingPick: React.MutableRefObject<FlightOrigin | null>;
  onReturn: (index: number, element: Element | null) => void;
  onConfirm: () => void;
  onClear: () => void;
}) {
  const slotsRef = useRef<HTMLDivElement>(null);
  const previousLength = useRef(props.tokenSelection.length);

  // FLIP-style arrival: the new slot stays hidden while a ball flies in from its stack.
  useLayoutEffect(() => {
    const grew = props.tokenSelection.length > previousLength.current;
    previousLength.current = props.tokenSelection.length;
    const origin = props.pendingPick.current;
    props.pendingPick.current = null;
    if (!grew || origin === null) return;
    const slot = slotsRef.current?.querySelector<HTMLElement>('.tray-slot[data-kind]:last-of-type');
    if (slot === null || slot === undefined) return;
    slot.style.visibility = 'hidden';
    void flyBall(origin.kind, origin.rect, slot).then(() => {
      slot.style.visibility = '';
    });
  }, [props.tokenSelection, props.pendingPick]);

  const candidates = evolutionCandidates(props.me, props.room, props.locale);
  const selectedEvolution = props.evolutionSelection === null ? '' : evolutionValue(props.evolutionSelection);
  const chosenCandidate = candidates.find((candidate) => evolutionValue(candidate.selection) === selectedEvolution);
  const knownEvolution = chosenCandidate === undefined ? '' : selectedEvolution;
  const trayNote = props.message ?? (props.canAct && chosenCandidate?.needsPurchase === true ? props.match.evolveNeedsCatch : null);
  const showDiscard = props.canAct && props.discardNeeded > 0;
  const emptySlots = Math.max(0, 3 - props.tokenSelection.length);

  return (
    <div className={`action-tray${props.canAct ? '' : ' is-idle'}`}>
      <div className="tray-head">
        <strong>{props.match.tray}</strong>
        <span>{props.canAct ? props.match.keysHint : ''}</span>
      </div>
      <div className="tray-row">
        <div className="tray-slots" ref={slotsRef}>
          {props.tokenSelection.map((kind, index) => (
            <button
              type="button"
              className={`tray-slot ${tokenClassName(kind)}`}
              data-kind={kind}
              key={`${kind}-${index}`}
              title={`${tokenLabel(kind, props.locale)} · ${props.match.trayReturn}`}
              onClick={(event) => props.onReturn(index, event.currentTarget)}
            >
              <PokeBall kind={kind} size={34} />
            </button>
          ))}
          {Array.from({ length: emptySlots }, (_, index) => <span className="tray-slot is-empty" key={`empty-${index}`} />)}
        </div>
        <div className="tray-actions">
          <button type="button" onClick={props.onClear} disabled={!props.canAct || props.tokenSelection.length === 0} title={props.match.clear}>
            <RotateCcw size={16} />
          </button>
          <button type="button" className="primary-button confirm-button" onClick={props.onConfirm} disabled={!props.takeReady}>
            {props.busy ? <span className="spinner" /> : <Check size={17} />} {props.match.confirmTake}
          </button>
        </div>
      </div>

      {props.canAct && props.pendingReserve !== null ? (
        <div className="tray-reserve" role="group" aria-label={props.match.reserveConfirmTitle}>
          <div className="tray-reserve-text">
            <strong>{props.match.reserveConfirmTitle}</strong>
            <span>{reserveTargetName(props.room, props.pendingReserve, props.locale, props.themeId, props.match)}</span>
            <small>
              {props.room.board.bank.prism > 0 ? props.match.reserveGetsMaster : props.match.reserveNoMaster}
              {' · '}
              {props.me.reserved.length >= 3 ? props.match.reserveHandFull : props.match.reserveHand(props.me.reserved.length + 1)}
            </small>
          </div>
          <div className="tray-reserve-actions">
            <button type="button" className="ghost-button" onClick={props.onCancelReserve}>{props.match.reserveCancel}</button>
            <button type="button" className="primary-button" onClick={props.onConfirmReserve} disabled={!props.reserveReady || props.busy}>
              {props.busy ? <span className="spinner" /> : <Check size={16} />} {props.match.reserveConfirm}
            </button>
          </div>
        </div>
      ) : null}

      {showDiscard ? (
        <div className={`tray-discard${props.tokenSelection.length > 0 ? ' is-floating' : ''}`}>
          <span>
            {props.discardSelection.length >= props.discardNeeded
              ? props.match.returnReady
              : props.tokenSelection.length > 0
                ? props.match.mustReturn(props.discardNeeded - props.discardSelection.length)
                : props.match.reserveOverflow(props.discardNeeded - props.discardSelection.length)}
          </span>
          <div className="discard-options">
            {TOKEN_KIND_ORDER.map((kind) => {
              const owned = props.me.tokens[kind] + props.tokenSelection.filter((token) => token === kind).length;
              const chosen = props.discardSelection.filter((token) => token === kind).length;
              if (owned - chosen <= 0) return null;
              return (
                <button
                  type="button"
                  key={kind}
                  className="discard-ball"
                  disabled={props.discardSelection.length >= props.discardNeeded}
                  onClick={() => props.onDiscardSelectionChange([...props.discardSelection, kind])}
                  title={tokenLabel(kind, props.locale)}
                >
                  <PokeBall kind={kind} size={24} />
                  <small>{owned - chosen}</small>
                </button>
              );
            })}
          </div>
          {props.discardSelection.length > 0 ? (
            <div className="discard-chosen">
              <span>{props.match.returnPicked}</span>
              {props.discardSelection.map((kind, index) => (
                <button
                  type="button"
                  key={`${kind}-${index}`}
                  className="discard-ball is-chosen"
                  onClick={() => props.onDiscardSelectionChange(props.discardSelection.filter((_, position) => position !== index))}
                  title={tokenLabel(kind, props.locale)}
                >
                  <PokeBall kind={kind} size={22} />
                  <X size={11} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="tray-foot">
        <p className={`tray-message${trayNote === null ? ' is-hint' : ' is-problem'}`} aria-live="polite">
          {trayNote ?? (props.canAct ? props.match.trayHint : '')}
        </p>
        {props.canAct && candidates.length > 0 ? (
          <label className="tray-evolution">
            <span>{props.match.evolution}</span>
            <select
              value={knownEvolution}
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
        ) : null}
        {props.isMyTurn && props.room.viewerCanPass ? (
          <button type="button" className="ghost-button" title={props.copy.passHint} onClick={props.onPass} disabled={props.busy}>
            <SkipForward size={15} /> {props.copy.passTurn}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MySeat(props: MatchTableProps & { me: PlayerState; match: MatchCopy }) {
  const me = props.me;
  const target = props.room.targetScore;
  const progress = Math.min(100, Math.round((me.score / target) * 100));
  return (
    <div className="my-seat" data-ball-anchor={`player-${me.id}`}>
      <div className="seat-head">
        <strong>{me.name}</strong>
        <span className="seat-score"><Gem size={14} /> {props.match.score(me.score, target)}</span>
      </div>
      <div className="seat-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <div className="ball-rack">
        {TOKEN_KIND_ORDER.map((kind) => (
          <div className={`rack-slot ${tokenClassName(kind)}${me.tokens[kind] === 0 ? ' is-zero' : ''}`} key={kind} title={tokenLabel(kind, props.locale)}>
            <span className="rack-ball" data-ball-anchor={`player-${me.id}-${kind}`}>
              <PokeBall kind={kind} size={30} />
              <b>{me.tokens[kind]}</b>
            </span>
            {kind === 'prism' ? <i className="rack-bonus is-blank" /> : <i className="rack-bonus" title={props.match.myBonuses}>+{me.bonuses[kind]}</i>}
          </div>
        ))}
        <span className="rack-total">{tokenTotal(me.tokens)}/10</span>
      </div>
      <PlayerCardStrip copy={props.copy} locale={props.locale} themeId={props.themeId} label={props.copy.pokemonInPlay} cards={me.tableau} />
    </div>
  );
}

function MyHand(props: MatchTableProps & { me: PlayerState; match: MatchCopy; canAct: boolean }) {
  return (
    <div className={`my-hand${props.me.reserved.length === 0 ? ' is-empty' : ''}`}>
      <div className="tray-head"><strong>{props.match.myHand}</strong><span>{props.me.reserved.length}/3</span></div>
      <div className="hand-cards">
        {props.me.reserved.length === 0 ? <p className="hand-empty">{props.match.emptyHand}</p> : null}
        {props.me.reserved.map((card) => isHiddenCard(card) ? (
          <HiddenCardChip key={card.id} copy={props.copy} tier={card.tier} />
        ) : (
          <CompanionCardView
            key={card.id}
            copy={props.copy}
            locale={props.locale}
            themeId={props.themeId}
            card={card}
            compact
            disabled={!props.canAct}
            affordable={canAfford(props.me, card)}
            onBuy={() => props.onBuy({ kind: 'reserved', cardId: card.id })}
          />
        ))}
      </div>
    </div>
  );
}

function OpponentStrip(props: {
  copy: AppCopy;
  match: MatchCopy;
  locale: Locale;
  themeId: ThemeId;
  player: PlayerState;
  active: boolean;
  local: boolean;
  online: boolean;
  winner: boolean;
  targetScore: number;
}) {
  const player = props.player;
  const left = player.status === 'left';
  return (
    <article
      className={`opponent-strip${props.active ? ' is-active' : ''}${left ? ' is-left' : ''}${props.winner ? ' is-winner' : ''}`}
      data-ball-anchor={`player-${player.id}`}
    >
      <header>
        <span className={`presence-dot ${props.online ? 'online' : 'offline'}`} title={props.online ? props.copy.online : props.copy.offline} />
        <strong>{player.name}</strong>
        {left ? <em>{props.copy.leftSeat}</em> : props.local ? <em>{props.copy.localSeat}</em> : null}
        <span className="strip-score">{props.match.score(player.score, props.targetScore)}</span>
      </header>
      <div className="strip-balls">
        {TOKEN_KIND_ORDER.map((kind) => (
          <span className={`strip-ball${player.tokens[kind] === 0 && (kind === 'prism' || player.bonuses[kind] === 0) ? ' is-zero' : ''}`} key={kind} title={tokenLabel(kind, props.locale)}>
            <span data-ball-anchor={`player-${player.id}-${kind}`}><PokeBall kind={kind} size={18} /></span>
            <b>{player.tokens[kind]}</b>
            {kind === 'prism' ? null : <i>+{player.bonuses[kind]}</i>}
          </span>
        ))}
      </div>
      <footer>
        <PlayerCardStrip copy={props.copy} locale={props.locale} themeId={props.themeId} label={props.match.cardsCount(player.tableau.length)} cards={player.tableau} />
        <PlayerCardStrip copy={props.copy} locale={props.locale} themeId={props.themeId} label={props.match.handCount(player.reserved.length)} cards={player.reserved} />
      </footer>
    </article>
  );
}

function SpecialCards(props: { copy: AppCopy; locale: Locale; themeId: ThemeId; room: GameState; me: PlayerState | undefined; canAct: boolean; onBuy: (source: BuySource) => void }) {
  const ranks = ['rare', 'legendary'] satisfies SpecialCardRank[];
  if (!ranks.some((rank) => props.room.board.specialMarket[rank].length > 0 || props.room.board.specialDeckCounts[rank] > 0)) {
    return null;
  }
  return (
    <section className="side-block special-block">
      <h3>{props.copy.specialCards}</h3>
      <div className="special-row">
        {ranks.map((rank) => (
          <div className="special-slot" key={rank}>
            <span className="special-label">{props.copy.specialRank[rank]} · {props.room.board.specialDeckCounts[rank]}</span>
            {props.room.board.specialMarket[rank].map((card) => (
              <CompanionCardView
                key={card.id}
                copy={props.copy}
                locale={props.locale}
                themeId={props.themeId}
                card={card}
                disabled={!props.canAct}
                affordable={props.me !== undefined && canAfford(props.me, card)}
                onBuy={() => props.onBuy({ kind: 'special_market', rank, cardId: card.id })}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function reserveStillOpen(room: GameState, source: MarketSource): boolean {
  if (source.kind === 'deck') return room.board.deckCounts[source.tier] > 0;
  return room.board.market[source.tier].some((card) => card.id === source.cardId);
}

function reserveTargetName(room: GameState, source: MarketSource, locale: Locale, themeId: ThemeId, match: MatchCopy): string {
  if (source.kind === 'deck') return match.reserveDeckTarget('★'.repeat(source.tier));
  const card = room.board.market[source.tier].find((entry) => entry.id === source.cardId);
  return card === undefined ? '' : cardText(card, locale, themeId).name;
}

function requiredDiscards(room: GameState, me: PlayerState, selection: TokenKind[]): number {
  const held = tokenTotal(me.tokens);
  if (selection.length > 0) {
    return Math.max(held + selection.length - 10, 0);
  }
  return Math.max(held + (room.board.bank.prism > 0 ? 1 : 0) - 10, 0);
}

function describeRefusal(match: MatchCopy, refusal: PickRefusal, ball: string, left: number): string {
  switch (refusal) {
    case 'notElement': return match.pickProblems.notElement;
    case 'empty': return match.pickProblems.empty(ball);
    case 'full': return match.pickProblems.full;
    case 'pairOnly': return match.pickProblems.pairOnly;
    case 'pairNeedsFour': return match.pickProblems.pairNeedsFour(ball, left + 1);
    default: return match.pickProblems.invalid;
  }
}

function shake(element: Element): void {
  element.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
    { duration: 280, easing: 'ease-out' },
  );
}

/** Prefix the tab title while it is my turn, so a backgrounded tab still gets my attention. */
function useTurnTitle(myTurn: boolean, label: string): void {
  useEffect(() => {
    const base = document.title.replace(/^● .*? · /, '');
    document.title = myTurn ? `● ${label} · ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [myTurn, label]);
}

export { bounce };
