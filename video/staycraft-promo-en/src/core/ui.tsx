import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { useFilmOptions } from './options';
import { C, EASE, FONT, R, SHADOW, TYPE } from './theme';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** fade in/out window helper: all args are frames relative to current Sequence. */
export const useWindow = (inStart: number, inEnd: number, outStart = Number.POSITIVE_INFINITY, outEnd = Number.POSITIVE_INFINITY) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [inStart, inEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.out,
  });
  const b = interpolate(frame, [outStart, outEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.inOut,
  });
  return Math.min(a, b);
};

/** narration caption: 58px, muted, bottom band with hairline lead-in. */
export const Caption: React.FC<{
  text: string;
  from: number;
  to: number;
  bottom?: number;
  tone?: 'light' | 'dark';
  align?: 'center' | 'left';
  left?: number;
  size?: number;
}> = ({ text, from, to, bottom = 84, tone = 'light', align = 'center', left, size = 58 }) => {
  const { captions: captionsOn } = useFilmOptions();
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [from, from + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.out,
  });
  const out = interpolate(frame, [to - 8, to], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const color = tone === 'light' ? C.muted : 'rgba(255,255,255,0.72)';
  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'center' ? 0 : left ?? 140,
        right: align === 'center' ? 0 : undefined,
        bottom,
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        alignItems: 'center',
        gap: 18,
        fontFamily: FONT.zh,
        fontSize: size,
        fontWeight: 500,
        lineHeight: 1.4,
        color,
        opacity: captionsOn ? inn * out : 0,
        transform: `translateY(${(1 - inn) * 10}px)`,
      }}
    >
      <span style={{ width: 34, height: 2, background: C.violet, opacity: 0.9, flex: '0 0 auto' }} />
      <span style={{ whiteSpace: 'normal', maxWidth: 1360, textAlign: 'center' }}>{text}</span>
    </div>
  );
};

/** large kinetic Chinese title. */
export const Title: React.FC<{
  text: string;
  from: number;
  size?: number;
  color?: string;
  weight?: number;
  lineHeight?: number;
  letterSpacing?: string;
  style?: React.CSSProperties;
}> = ({ text, from, size = 104, color = C.ink, weight = 700, lineHeight = 1.14, letterSpacing = '-0.02em', style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.out,
  });
  return (
    <div
      style={{
        fontFamily: FONT.zh,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing,
        color,
        opacity: p,
        filter: `blur(${(1 - p) * 7}px)`,
        transform: `translateY(${(1 - p) * 14}px) scale(${1 + (1 - p) * 0.02})`,
        transformOrigin: 'left center',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** English kicker label (uppercase, wide tracking). */
export const Kicker: React.FC<{ text: string; color?: string; size?: number; style?: React.CSSProperties }> = ({
  text,
  color = C.violet,
  size = 30,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT.en,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color,
      ...style,
    }}
  >
    {text}
  </div>
);

/** yellow marker highlight drawn left→right behind an inline span. */
export const YellowMark: React.FC<{ children: React.ReactNode; from: number; height?: number }> = ({ children, from, height = 0.56 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.inOut,
  });
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        style={{
          position: 'absolute',
          left: '-0.06em',
          right: '-0.06em',
          bottom: '0.02em',
          height: `${height}em`,
          background: C.yellow,
          borderRadius: 4,
          transform: `scaleX(${p})`,
          transformOrigin: 'left center',
          zIndex: 0,
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  );
};

/** deterministic paper grain (static SVG turbulence, fixed seed). */
export const Grain: React.FC<{ opacity?: number; blend?: 'multiply' | 'normal' | 'overlay' }> = ({ opacity = 0.18, blend = 'multiply' }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity, mixBlendMode: blend }}>
    <svg width="100%" height="100%">
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain)" opacity="0.55" />
    </svg>
  </AbsoluteFill>
);

/** hairline used as a structural line / lead-in. */
export const Rule: React.FC<{ from: number; to?: number; color?: string; width?: number | string; left?: number; top?: number; growTo?: number }> = ({
  from,
  to = from + 16,
  color = C.line,
  width = 2,
  left = 140,
  top,
  growTo = 300,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.inOut,
  });
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: growTo,
        height: width,
        background: color,
        transform: `scaleX(${p})`,
        transformOrigin: 'left center',
      }}
    />
  );
};

/** small pill label. */
export const Pill: React.FC<{ children: React.ReactNode; tone?: 'violet' | 'line' | 'dark' | 'yellow'; style?: React.CSSProperties }> = ({ children, tone = 'violet', style }) => {
  const map = {
    violet: { background: C.violetFog, color: C.violet, border: '1px solid rgba(101,84,232,0.18)' },
    line: { background: '#fff', color: C.muted, border: '1px solid ' + C.line },
    dark: { background: C.ink, color: '#fff', border: '1px solid ' + C.ink },
    yellow: { background: C.yellow, color: C.ink, border: '1px solid ' + C.yellow },
  }[tone];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 26px',
        borderRadius: R.pill,
        fontFamily: FONT.zh,
        fontSize: 30,
        fontWeight: 500,
        ...map,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** numbers rendered with tabular Outfit. */
export const Num: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties }> = ({
  children,
  size = 96,
  color = C.ink,
  weight = 600,
  style,
}) => (
  <span
    style={{
      fontFamily: FONT.num,
      fontVariantNumeric: 'tabular-nums',
      fontSize: size,
      fontWeight: weight,
      letterSpacing: '-0.02em',
      color,
      ...style,
    }}
  >
    {children}
  </span>
);

export const sheetStyle: React.CSSProperties = {
  background: C.paper,
  borderRadius: R.card,
  border: '1px solid ' + C.line,
  boxShadow: SHADOW.sheet,
};
