import { useCallback, useEffect, useRef } from 'react';
import type { GameState, TokenKind } from '../api/types';

/**
 * Ball flight animations. Anything that moves balls (a take, a purchase, a reserve's
 * Master Ball, a discard, an opponent's move) shows up as a diff between two room
 * versions, so one diff-driven animator covers every player without per-action code.
 *
 * Anchors are plain DOM markers: `data-ball-anchor="bank-fire"`,
 * `data-ball-anchor="player-<id>-fire"` or `data-ball-anchor="player-<id>"`.
 */
const TOKEN_KINDS = ['fire', 'water', 'grass', 'electric', 'psychic', 'prism'] satisfies TokenKind[];
const MOTION_KEY = 'splendor-monsters-motion';
const FLIGHT_MS = 420;
const STAGGER_MS = 70;

let motionPreference: boolean = readMotionPreference();

function readMotionPreference(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function motionPreferred(): boolean {
  return motionPreference;
}

export function setMotionPreferred(enabled: boolean): void {
  motionPreference = enabled;
  try {
    localStorage.setItem(MOTION_KEY, enabled ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function motionEnabled(): boolean {
  if (!motionPreference) {
    return false;
  }
  return typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function ballAnchor(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-ball-anchor="${CSS.escape(name)}"]`);
}

/** Fly one ball from `from` to `to` along an arc; resolves once it lands. */
export function flyBall(kind: TokenKind, from: DOMRect, to: Element | DOMRect, delayMs = 0): Promise<void> {
  const template = document.querySelector(`.poke-ball.ball-${kind}`);
  if (!motionEnabled() || template === null) {
    return Promise.resolve();
  }
  const target = to instanceof DOMRect ? to : to.getBoundingClientRect();
  const size = 30;
  const ball = template.cloneNode(true) as SVGElement;
  ball.setAttribute('width', String(size));
  ball.setAttribute('height', String(size));
  ball.classList.add('flying-ball');
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  Object.assign(ball.style, { left: `${startX}px`, top: `${startY}px` });
  document.body.appendChild(ball);

  const dx = target.left + target.width / 2 - size / 2 - startX;
  const dy = target.top + target.height / 2 - size / 2 - startY;
  const lift = Math.min(140, 36 + Math.hypot(dx, dy) * 0.22);
  const animation = ball.animate(
    [
      { transform: 'translate(0, 0) scale(0.9) rotate(0deg)', opacity: 0.2 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(1.18) rotate(200deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.92) rotate(360deg)`, opacity: 1 },
    ],
    { duration: FLIGHT_MS, delay: delayMs, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' },
  );
  return animation.finished
    .catch(() => undefined)
    .then(() => {
      ball.remove();
      if (!(to instanceof DOMRect)) {
        bounce(to);
      }
    });
}

export function bounce(element: Element): void {
  if (!motionEnabled()) {
    return;
  }
  element.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
    { duration: 260, easing: 'ease-out' },
  );
}

/** Where my own confirmed take should launch from (the tray), instead of the bank. */
export interface FlightOrigin {
  kind: TokenKind;
  rect: DOMRect;
}

export function useBallFlights(room: GameState | null) {
  const previous = useRef<GameState | null>(null);
  const myOrigins = useRef<FlightOrigin[]>([]);

  useEffect(() => {
    const before = previous.current;
    previous.current = room;
    const origins = myOrigins.current;
    myOrigins.current = [];
    if (room === null || before === null || before.roomId !== room.roomId || room.version <= before.version || before.status !== 'playing') {
      return;
    }
    if (!motionEnabled()) {
      return;
    }
    let delay = 0;
    for (const player of room.players) {
      const old = before.players.find((entry) => entry.id === player.id);
      if (old === undefined) {
        continue;
      }
      const seat = ballAnchor(`player-${player.id}`);
      for (const kind of TOKEN_KINDS) {
        const change = player.tokens[kind] - old.tokens[kind];
        if (change === 0) {
          continue;
        }
        const bankAnchor = ballAnchor(`bank-${kind}`);
        const seatAnchor = ballAnchor(`player-${player.id}-${kind}`) ?? seat;
        if (bankAnchor === null || seatAnchor === null) {
          continue;
        }
        for (let index = 0; index < Math.abs(change); index += 1) {
          if (change > 0) {
            const originIndex = player.id === room.viewerPlayerId ? origins.findIndex((origin) => origin.kind === kind) : -1;
            const from = originIndex >= 0 ? origins.splice(originIndex, 1)[0]!.rect : bankAnchor.getBoundingClientRect();
            void flyBall(kind, from, seatAnchor, delay);
          } else {
            void flyBall(kind, seatAnchor.getBoundingClientRect(), bankAnchor, delay);
          }
          delay += STAGGER_MS;
        }
      }
    }
  }, [room]);

  const primeOrigins = useCallback((origins: FlightOrigin[]) => {
    myOrigins.current = origins;
  }, []);

  return { primeOrigins };
}
