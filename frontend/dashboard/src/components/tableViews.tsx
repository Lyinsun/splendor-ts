import { ELEMENTS, isHiddenCard, type CardTier, type CompanionCard, type ElementCost, type PlayerState, type ReservedCard } from '../api/types';
import { cardArt, cardFlavor, cardText, tokenClassName, tokenLabel, type Locale, type ThemeId } from '../presentation/themes';
import { elementColorFor, type AppCopy } from '../presentation/gameRules';

export function CompanionCardView(props: {
  copy: AppCopy;
  locale: Locale;
  themeId: ThemeId;
  card: CompanionCard;
  disabled: boolean;
  affordable: boolean;
  compact?: boolean;
  pending?: boolean;
  onReserve?: () => void;
  onBuy: () => void;
}) {
  const text = cardText(props.card, props.locale, props.themeId);
  const art = cardArt(props.card, props.locale, props.themeId);
  const flavor = cardFlavor(props.card, props.locale, props.themeId);
  const cardFaceClass = art?.mode === 'card-face' ? 'card-face-card' : '';
  const cardArtClass = art?.mode === 'card-face' ? 'card-face-art' : '';
  const affordabilityClass = props.disabled ? '' : props.affordable ? 'affordable' : 'unaffordable';
  const elementColor = elementColorFor(props.card.element);
  return (
    <article
      className={`companion-card ${tokenClassName(props.card.element)} ${props.compact === true ? 'compact-card' : ''} ${cardFaceClass} ${affordabilityClass}${props.pending === true ? ' is-pending' : ''}`}
      aria-label={`${text.name}, ${props.card.points} ${props.copy.glory}, ${tokenLabel(props.card.element, props.locale)} type`}
    >
      <div className={`card-art ${cardArtClass}`}>
        {art === null ? <span>{text.species.slice(0, 1)}</span> : <img src={art.src} alt={art.alt} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        <span className="card-element-indicator" style={{ background: elementColor }} title={`${tokenLabel(props.card.element, props.locale)} ${props.copy.type}`} />
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

export function PlayerPanel(props: { copy: AppCopy; locale: Locale; themeId: ThemeId; player: PlayerState; active: boolean; controlled: boolean; local: boolean; online: boolean; targetScore?: number; onKick?: (() => void) | undefined }) {
  const left = props.player.status === 'left';
  const badge = left ? props.copy.leftSeat : props.controlled ? props.copy.controlled : props.local ? props.copy.localSeat : null;
  const target = props.targetScore ?? 18;
  const progress = Math.min(100, Math.round((props.player.score / target) * 100));
  return (
    <article className={`player-panel ${props.active ? 'active' : ''} ${props.controlled ? 'controlled' : ''} ${props.local ? 'local' : ''} ${left ? 'left' : ''}`}>
      <div className="player-heading">
        <strong>
          <span className={`presence-dot ${props.online ? 'online' : 'offline'}`} title={props.online ? props.copy.online : props.copy.offline} aria-label={props.online ? props.copy.online : props.copy.offline} />
          {props.player.name}{badge === null ? '' : ` · ${badge}`}
        </strong>
        <span>{props.player.score} {props.copy.glory}</span>
        {props.onKick !== undefined ? <button type="button" className="ghost-button kick-button" onClick={props.onKick}>{props.copy.kick}</button> : null}
      </div>
      <div className="score-progress">
        <div className="score-progress-bar" aria-hidden="true">
          <div className="score-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="score-progress-label">{props.copy.progressToVictory(props.player.score, target)}</span>
      </div>
      <div className="bonus-row">
        {ELEMENTS.map((element) => (
          <span className={`mini-token ${tokenClassName(element)}`} title={`${tokenLabel(element, props.locale)} ${props.copy.bonus}`} key={element}>{props.player.bonuses[element]}</span>
        ))}
        <span className={`mini-token ${tokenClassName('prism')}`} title={`${tokenLabel('prism', props.locale)}`}>{props.player.tokens.prism}</span>
      </div>
      <div className="player-token-chips">
        {ELEMENTS.map((element) => (
          <span className={`player-token-chip ${tokenClassName(element)}`} key={element} title={`${tokenLabel(element, props.locale)}: ${props.player.tokens[element]}`}>
            <span className="chip-dot" style={{ background: elementColorFor(element), color: '#fff' }}>{props.player.tokens[element] > 0 ? '' : ''}</span>
            <strong>{props.player.tokens[element]}</strong>
          </span>
        ))}
      </div>
      <div className="token-row">
        <span>{props.copy.evolutions}: {props.player.evolutionRecords.length}</span>
        <span>{props.copy.pokemonInPlay}: {props.player.tableau.length}</span>
        {props.player.reserved.length > 0 ? <span className="reserved-count">{props.copy.reservedLabel}: {props.player.reserved.length}</span> : null}
      </div>
      <PlayerCardStrip
        copy={props.copy}
        locale={props.locale}
        themeId={props.themeId}
        label={props.copy.pokemonInPlay}
        cards={props.player.tableau}
      />
      <PlayerCardStrip
        copy={props.copy}
        locale={props.locale}
        themeId={props.themeId}
        label={props.copy.reservedLabel}
        cards={props.player.reserved}
      />
    </article>
  );
}

export function PlayerCardStrip(props: { copy: AppCopy; locale: Locale; themeId: ThemeId; label: string; cards: ReservedCard[] }) {
  if (props.cards.length === 0) {
    return null;
  }
  return (
    <div className="public-card-strip">
      <span className="public-card-strip-label">{props.label}</span>
      <div className="public-card-list">
        {props.cards.map((card) => isHiddenCard(card) ? (
          <HiddenCardChip key={card.id} copy={props.copy} tier={card.tier} />
        ) : (
          <PublicCardChip
            key={card.id}
            copy={props.copy}
            locale={props.locale}
            themeId={props.themeId}
            card={card}
          />
        ))}
      </div>
    </div>
  );
}

export function HiddenCardChip(props: { copy: AppCopy; tier: CardTier }) {
  const label = props.copy.hiddenCard(props.tier);
  return (
    <div className="public-card-chip hidden-card-chip" tabIndex={0} role="group" aria-label={label} title={label}>
      <span>?</span>
      <strong>{props.tier}</strong>
    </div>
  );
}

export function PublicCardChip(props: { copy: AppCopy; locale: Locale; themeId: ThemeId; card: CompanionCard }) {
  const text = cardText(props.card, props.locale, props.themeId);
  const art = cardArt(props.card, props.locale, props.themeId);
  const elementLabel = tokenLabel(props.card.element, props.locale);
  const title = `${text.name} · ${props.card.points} ${props.copy.glory} · ${elementLabel}`;
  return (
    <div className={`public-card-chip ${tokenClassName(props.card.element)}`} tabIndex={0} role="group" aria-label={title}>
      <span>{text.name.slice(0, 2)}</span>
      <strong>{props.card.points}</strong>
      <div className="public-card-popover" role="tooltip">
        <div className="public-card-preview">
          <div className="public-card-preview-art">
            {art === null ? <span>{text.name.slice(0, 1)}</span> : <img src={art.src} alt={art.alt} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          </div>
          <div className="public-card-preview-body">
            <div className="card-title">
              <strong>{text.name}</strong>
              <span>{props.card.points} {props.copy.glory}</span>
            </div>
            <small>{text.species}</small>
            <span className="public-card-type">{elementLabel} {props.copy.type}</span>
            <CostList cost={props.card.cost} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CostList(props: { cost: ElementCost }) {
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

export function StatusPill(props: { label: string; tone: 'good' | 'warn' | 'muted' }) {
  return <span className={`status-pill ${props.tone}`}>{props.label}</span>;
}
