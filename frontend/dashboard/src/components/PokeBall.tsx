import type { TokenKind } from '../api/types';

/**
 * Hand-drawn SVG balls. The shapes follow the ball icons printed on the card faces
 * (Poké / Great / Ultra / Quick / Heal / Master), so the supply, the racks and the
 * card costs read as the same thing.
 */
const TOP = 'M2 20a18 18 0 0 1 36 0z';
const BOTTOM = 'M2 20a18 18 0 0 0 36 0z';

export function PokeBall(props: { kind: TokenKind; size?: number; className?: string }) {
  const size = props.size ?? 32;
  return (
    <svg
      className={`poke-ball ball-${props.kind}${props.className === undefined ? '' : ` ${props.className}`}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <BallBody kind={props.kind} />
      <rect x="2" y="18.4" width="36" height="3.2" fill="#15171c" />
      <circle cx="20" cy="20" r="5.6" fill="#f7f7f2" stroke="#15171c" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="2.4" fill="#fff" stroke="#c9ccd2" strokeWidth="0.8" />
      <ellipse cx="13" cy="10" rx="5" ry="3" fill="#fff" opacity="0.38" transform="rotate(-28 13 10)" />
      <circle cx="20" cy="20" r="18" fill="none" stroke="#15171c" strokeWidth="2" />
    </svg>
  );
}

function BallBody(props: { kind: TokenKind }) {
  switch (props.kind) {
    case 'fire':
      return (
        <>
          <path d={TOP} fill="#e0393f" />
          <path d={BOTTOM} fill="#f4f4ef" />
        </>
      );
    case 'water':
      return (
        <>
          <path d={TOP} fill="#2f6fd6" />
          <path d="M5.2 11.5c3 .6 5.6 3 6.4 6.9H3.2c.2-2.6.9-4.9 2-6.9z" fill="#e0393f" />
          <path d="M34.8 11.5c-3 .6-5.6 3-6.4 6.9h8.4c-.2-2.6-.9-4.9-2-6.9z" fill="#e0393f" />
          <path d={BOTTOM} fill="#f4f4ef" />
        </>
      );
    case 'grass':
      return (
        <>
          <path d={TOP} fill="#26282e" />
          <path d="M9 7.2v11.2h4.6v-4.2h12.8v4.2H31V7.2a18 18 0 0 0-4.6-2.4v5.6H13.6V4.8A18 18 0 0 0 9 7.2z" fill="#f2c230" />
          <path d={BOTTOM} fill="#f4f4ef" />
        </>
      );
    case 'electric':
      return (
        <>
          <path d={TOP} fill="#2b5fc4" />
          <path d="M20 2.2v16.2M6 8l9 10.4M34 8l-9 10.4" stroke="#f5cf2e" strokeWidth="3.2" strokeLinecap="round" />
          <path d={BOTTOM} fill="#f5cf2e" />
          <path d="M8 31.5c3.6 2.4 7.6 3.6 12 3.6s8.4-1.2 12-3.6" stroke="#2b5fc4" strokeWidth="2.6" fill="none" />
        </>
      );
    case 'psychic':
      return (
        <>
          <path d={TOP} fill="#ee8fb8" />
          <path d="M4.5 12.5h31" stroke="#fff" strokeWidth="2.4" opacity="0.85" />
          <path d={BOTTOM} fill="#f4f4ef" />
        </>
      );
    case 'prism':
      return (
        <>
          <path d={TOP} fill="#7446c9" />
          <circle cx="10.5" cy="12.5" r="3.4" fill="#ee6fb0" />
          <circle cx="29.5" cy="12.5" r="3.4" fill="#ee6fb0" />
          <path d="M14.6 16.4 16 7.8l4 5.4 4-5.4 1.4 8.6" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
          <path d={BOTTOM} fill="#f4f4ef" />
        </>
      );
    default:
      return null;
  }
}
