import { Copy, Gem, Play, RefreshCw, ShieldPlus, Sparkles, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CardSource, CardTier, CompanionCard, Element, ElementCost, GameState, PlayerState, TokenKind } from './api/types';
import { ELEMENTS } from './api/types';
import { useGameRoom } from './hooks/useGameRoom';

const ELEMENT_META: Record<Element | 'prism', { label: string; className: string }> = {
  fire: { label: 'Fire', className: 'token-fire' },
  water: { label: 'Water', className: 'token-water' },
  grass: { label: 'Grass', className: 'token-grass' },
  electric: { label: 'Volt', className: 'token-electric' },
  psychic: { label: 'Mind', className: 'token-psychic' },
  prism: { label: 'Prism', className: 'token-prism' },
};

export function App() {
  const game = useGameRoom();
  const [draftName, setDraftName] = useState(game.playerName);
  const [roomName, setRoomName] = useState('Element League Table');
  const [tokenSelection, setTokenSelection] = useState<TokenKind[]>([]);

  const room = game.room;
  const myPlayer = game.currentPlayer;

  const handleTakeTokens = async () => {
    await game.takeTokens(tokenSelection);
    setTokenSelection([]);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <h1>Splendor Monsters</h1>
            <span>TypeScript multiplayer MVP</span>
          </div>
        </div>
        <div className="topbar-actions">
          <StatusPill label={game.connected ? 'Live sync' : 'Offline sync'} tone={game.connected ? 'good' : 'muted'} />
          <button className="icon-button" type="button" onClick={() => void game.refreshRooms()} disabled={game.busy} title="Refresh rooms">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {game.error !== null && <div className="error-banner">{game.error}</div>}

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Element companion league</p>
          <h2>{room?.roomName ?? 'Create or join a trainer table'}</h2>
          <p>{room === null ? 'Rooms are local to this running server. Open another browser window to join as a second trainer.' : `${room.players.length} trainers · round ${room.round} · turn ${room.turn}`}</p>
        </div>
        <div className="hero-meta">
          <StatusPill label={room?.status ?? 'no room'} tone={room?.status === 'playing' ? 'good' : 'muted'} />
          {room?.finalRoundStartedBy !== null && room?.finalRoundStartedBy !== undefined ? <StatusPill label="Final round" tone="warn" /> : null}
        </div>
      </section>

      {room === null ? (
        <Lobby
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
          room={room}
          myPlayer={myPlayer}
          playerId={game.playerId}
          busy={game.busy}
          isHost={game.isHost}
          isMyTurn={game.isMyTurn}
          activePlayerName={game.activePlayer?.name ?? 'Waiting'}
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

function Lobby(props: {
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
        <h3>Trainer seat</h3>
        <label>
          Name
          <input value={props.playerName} onChange={(event) => props.onPlayerNameChange(event.target.value)} />
        </label>
        <label>
          Room
          <input value={props.roomName} onChange={(event) => props.onRoomNameChange(event.target.value)} />
        </label>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={props.busy}>
          <Users size={18} /> Create room
        </button>
      </div>
      <div className="panel room-list">
        <h3>Open rooms</h3>
        {props.rooms.length === 0 ? <p className="empty">No rooms yet.</p> : null}
        {props.rooms.map((room) => (
          <div className="room-row" key={room.roomId}>
            <div>
              <strong>{room.roomName}</strong>
              <span>{room.players}/{room.maxPlayers} trainers · {room.status}</span>
            </div>
            <button type="button" onClick={() => props.onJoin(room.roomId)} disabled={props.busy || room.status !== 'lobby'}>
              Join
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function GameTable(props: {
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
            <Copy size={16} /> Copy room
          </button>
          <button type="button" className="ghost-button" onClick={props.onLeave}>Leave</button>
        </div>
        <h3>Trainers</h3>
        <div className="player-stack">
          {props.room.players.map((player) => (
            <PlayerPanel key={player.id} player={player} active={props.room.currentPlayerId === player.id} mine={props.playerId === player.id} />
          ))}
        </div>
        {props.room.status === 'lobby' ? (
          <div className="lobby-actions">
            <button type="button" onClick={props.onAddDemoPlayer} disabled={props.busy || props.room.players.length >= 4}>
              <ShieldPlus size={16} /> Demo rival
            </button>
            <button type="button" className="primary-button" onClick={props.onStart} disabled={props.busy || !props.isHost || props.room.players.length < 2}>
              <Play size={18} /> Start
            </button>
          </div>
        ) : null}
        {props.room.status === 'finished' ? <div className="winner-box">Winner: {winnerNames}</div> : null}
      </aside>

      <section className="play-area">
        <div className="panel turn-panel">
          <div>
            <p className="eyebrow">Current turn</p>
            <h3>{props.room.status === 'playing' ? props.activePlayerName : props.room.status}</h3>
          </div>
          <StatusPill label={props.isMyTurn ? 'Your move' : 'Watching'} tone={props.isMyTurn ? 'good' : 'muted'} />
        </div>

        {props.room.status === 'playing' ? (
          <BankPanel
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
          <h3>Gym mentors</h3>
          <div className="mentor-row">
            {props.room.board.gymLeaders.map((leader) => (
              <div className={`mentor ${ELEMENT_META[leader.element].className}`} key={leader.id}>
                <strong>{leader.name}</strong>
                <span>{leader.points} glory</span>
                <CostList cost={leader.requirement} />
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="panel side-panel">
        <h3>Your reserve</h3>
        {props.myPlayer?.reserved.length === 0 ? <p className="empty">No reserved companions.</p> : null}
        {props.myPlayer?.reserved.map((card) => (
          <CompanionCardView
            key={card.id}
            card={card}
            compact
            disabled={!props.isMyTurn || props.busy}
            affordable={props.myPlayer === undefined ? false : canAfford(props.myPlayer, card)}
            onBuy={() => props.onBuy({ kind: 'reserved', cardId: card.id })}
          />
        ))}
        <h3>Battle log</h3>
        <div className="log-list">
          {props.room.logs.slice(0, 12).map((entry) => (
            <div className="log-entry" key={entry.id}>
              <span>Turn {entry.turn}</span>
              <p>{entry.message}</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function BankPanel(props: {
  room: GameState;
  disabled: boolean;
  tokenSelection: TokenKind[];
  onTokenSelect: (token: TokenKind) => void;
  onClearTokens: () => void;
  onTakeTokens: () => void;
}) {
  const selectionText = props.tokenSelection.length === 0 ? 'No energy selected' : props.tokenSelection.map((token) => ELEMENT_META[token].label).join(', ');
  return (
    <section className="panel bank-panel">
      <div>
        <h3>Energy bank</h3>
        <p>{selectionText}</p>
      </div>
      <div className="bank-tokens">
        {(['fire', 'water', 'grass', 'electric', 'psychic'] satisfies TokenKind[]).map((token) => (
          <button
            type="button"
            className={`token-button ${ELEMENT_META[token].className}`}
            key={token}
            disabled={props.disabled || props.room.board.bank[token] <= 0}
            onClick={() => props.onTokenSelect(token)}
          >
            <span>{ELEMENT_META[token].label}</span>
            <strong>{props.room.board.bank[token]}</strong>
          </button>
        ))}
        <div className={`token-button token-static ${ELEMENT_META.prism.className}`}>
          <span>Prism</span>
          <strong>{props.room.board.bank.prism}</strong>
        </div>
      </div>
      <div className="bank-actions">
        <button type="button" onClick={props.onClearTokens} disabled={props.disabled || props.tokenSelection.length === 0}>Clear</button>
        <button type="button" className="primary-button" onClick={props.onTakeTokens} disabled={props.disabled || props.tokenSelection.length === 0}>
          <Gem size={18} /> Take energy
        </button>
      </div>
    </section>
  );
}

function MarketTier(props: {
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
        <h3>Tier {props.tier}</h3>
        <span>{props.cards.length} open</span>
      </div>
      <div className="card-row">
        {props.cards.map((card) => (
          <CompanionCardView
            key={card.id}
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
  card: CompanionCard;
  disabled: boolean;
  affordable: boolean;
  compact?: boolean;
  onReserve?: () => void;
  onBuy: () => void;
}) {
  return (
    <article className={`companion-card ${ELEMENT_META[props.card.element].className} ${props.compact === true ? 'compact-card' : ''}`}>
      <div className="card-art">
        <span>{props.card.species.slice(0, 1)}</span>
      </div>
      <div className="card-body">
        <div className="card-title">
          <strong>{props.card.name}</strong>
          <span>{props.card.points} glory</span>
        </div>
        <small>{props.card.species}</small>
        <CostList cost={props.card.cost} />
      </div>
      <div className="card-actions">
        <button type="button" onClick={props.onBuy} disabled={props.disabled || !props.affordable}>Buy</button>
        {props.onReserve !== undefined ? <button type="button" onClick={props.onReserve} disabled={props.disabled}>Reserve</button> : null}
      </div>
    </article>
  );
}

function PlayerPanel(props: { player: PlayerState; active: boolean; mine: boolean }) {
  return (
    <article className={`player-panel ${props.active ? 'active' : ''}`}>
      <div className="player-heading">
        <strong>{props.player.name}{props.mine ? ' · you' : ''}</strong>
        <span>{props.player.score} glory</span>
      </div>
      <div className="bonus-row">
        {ELEMENTS.map((element) => (
          <span className={`mini-token ${ELEMENT_META[element].className}`} key={element}>{props.player.bonuses[element]}</span>
        ))}
        <span className={`mini-token ${ELEMENT_META.prism.className}`}>{props.player.tokens.prism}</span>
      </div>
      <div className="token-row">
        {ELEMENTS.map((element) => (
          <span key={element}>{ELEMENT_META[element].label}: {props.player.tokens[element]}</span>
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
        return <span className={`cost-chip ${ELEMENT_META[element].className}`} key={element}>{value}</span>;
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
