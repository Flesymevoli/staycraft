import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { useFilmOptions } from './options';
import { C, EASE, FONT, R } from './theme';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** fade in/out window helper: args are frames relative to the current Sequence. */
export const useWindow = (inStart: number, inEnd: number, outStart = Number.POSITIVE_INFINITY, outEnd = Number.POSITIVE_INFINITY) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [inStart, inEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const b = interpolate(frame, [outStart, outEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  return Math.min(a, b);
};

/** Large kinetic English title. */
export const Title: React.FC<{
  text: string;
  from: number;
  size?: number;
  color?: string;
  weight?: number;
  lineHeight?: number;
  letterSpacing?: string;
  style?: React.CSSProperties;
}> = ({ text, from, size = 104, color = C.ink, weight = 700, lineHeight = 1.1, letterSpacing = '-0.03em', style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  return (
    <div
      style={{
        fontFamily: FONT.en,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing,
        color,
        opacity: p,
        filter: `blur(${(1 - p) * 6}px)`,
        transform: `translateY(${(1 - p) * 16}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Word-by-word kinetic title (each word rises on a stagger). */
export const WordTitle: React.FC<{
  lines: string[];
  from: number;
  size?: number;
  color?: string;
  weight?: number;
  stagger?: number;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}> = ({ lines, from, size = 118, color = C.ink, weight = 700, stagger = 4, align = 'left', style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start', gap: size * 0.08, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', flexWrap: 'nowrap', gap: size * 0.09 }}>
          {line.split(' ').map((word, wi) => {
            const idx = lines.slice(0, li).reduce((n, l) => n + l.split(' ').length, 0) + wi;
            const t0 = from + idx * stagger;
            const p = interpolate(frame, [t0, t0 + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  fontFamily: FONT.en,
                  fontSize: size,
                  fontWeight: weight,
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  color,
                  opacity: p,
                  filter: `blur(${(1 - p) * 8}px)`,
                  transform: `translateY(${(1 - p) * size * 0.22}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Kicker: React.FC<{ text: string; color?: string; size?: number; style?: React.CSSProperties }> = ({ text, color = C.violet, size = 28, style }) => (
  <div style={{ fontFamily: FONT.en, fontSize: size, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color, ...style }}>{text}</div>
);

/** yellow marker highlight drawn left→right behind an inline span. */
export const YellowMark: React.FC<{ children: React.ReactNode; from: number; height?: number; color?: string }> = ({ children, from, height = 0.52, color = C.yellow }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ position: 'absolute', left: '-0.06em', right: '-0.06em', bottom: '0.02em', height: `${height}em`, background: color, borderRadius: 4, transform: `scaleX(${p})`, transformOrigin: 'left center', zIndex: 0 }} />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  );
};

/** deterministic paper grain (static SVG turbulence, fixed seed). */
export const Grain: React.FC<{ opacity?: number; blend?: 'multiply' | 'normal' | 'overlay' }> = ({ opacity = 0.1, blend = 'multiply' }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity, mixBlendMode: blend }}>
    <svg width="100%" height="100%">
      <filter id="paper-grain-2">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain-2)" opacity="0.55" />
    </svg>
  </AbsoluteFill>
);

/** hairline that grows from a point. */
export const Rule: React.FC<{ from: number; to?: number; color?: string; height?: number; left?: number; top?: number; growTo?: number }> = ({ from, to = from + 14, color = C.lineStrong, height = 2, left = 140, top, growTo = 300 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  return <div style={{ position: 'absolute', left, top, width: growTo, height, background: color, transform: `scaleX(${p})`, transformOrigin: 'left center' }} />;
};

export const Pill: React.FC<{ children: React.ReactNode; tone?: 'violet' | 'line' | 'dark' | 'yellow' | 'emerald'; style?: React.CSSProperties }> = ({ children, tone = 'violet', style }) => {
  const map = {
    violet: { background: C.violetSoft, color: C.violet, border: '1px solid rgba(101,84,199,0.16)' },
    line: { background: '#fff', color: C.muted, border: '1px solid ' + C.lineStrong },
    dark: { background: C.ink, color: '#fff', border: '1px solid ' + C.ink },
    yellow: { background: C.yellow, color: C.ink, border: '1px solid ' + C.yellow },
    emerald: { background: C.emeraldBg, color: C.emeraldText, border: '1px solid rgba(30,112,69,0.12)' },
  }[tone];
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 24px', borderRadius: R.pill, fontFamily: FONT.en, fontSize: 28, fontWeight: 500, ...map, ...style }}>{children}</div>;
};

/** numbers rendered with tabular Outfit. */
export const Num: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties }> = ({ children, size = 96, color = C.ink, weight = 600, style }) => (
  <span style={{ fontFamily: FONT.num, fontVariantNumeric: 'tabular-nums', fontSize: size, fontWeight: weight, letterSpacing: '-0.025em', color, ...style }}>{children}</span>
);

/** count-up number with tabular figures. */
export const RollNumber: React.FC<{
  value: number;
  from: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ value, from, duration = 20, decimals = 0, prefix = '', suffix = '', size = 96, color = C.ink, weight = 600, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const v = value * p;
  return (
    <Num size={size} color={color} weight={weight} style={style}>
      {prefix}
      {decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')}
      {suffix}
    </Num>
  );
};

/** white rounded card on the lavender stage. */
export const SoftCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: R.card, border: '1px solid ' + C.line, boxShadow: C.shadow, ...style }}>{children}</div>
);

export { useFilmOptions };
