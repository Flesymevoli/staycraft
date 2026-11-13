import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { ReactNode } from 'react';
import { C, EASE, FONT } from './theme';

/** Page-space rounded highlight ring around a captured region (yellow = decision). */
export const Ring: React.FC<{
  x: number; y: number; w: number; h: number;
  from: number;
  color?: string;
  radius?: number;
  thickness?: number;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, from, color = C.yellow, radius = 20, thickness = 3, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  return (
    <div
      style={{
        position: 'absolute',
        left: x, top: y, width: w, height: h,
        borderRadius: radius,
        border: thickness + 'px solid ' + color,
        opacity: p,
        transform: 'scale(' + (0.96 + p * 0.04) + ')',
        boxShadow: '0 0 0 1px ' + color + '33, 0 0 24px ' + color + '55',
        ...style,
      }}
    />
  );
};

/** Page-space underline that draws left to right (for decision values or card phrases). */
export const Underline: React.FC<{ x: number; y: number; w: number; from: number; color?: string; height?: number; radius?: number }> = ({ x, y, w, from, color = C.yellow, height = 8, radius = 4 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: height, borderRadius: radius, background: color, transform: 'scaleX(' + p + ')', transformOrigin: 'left center' }} />;
};

/** Focus rack: wraps a captured fragment, blur/brightness settle to 0/1 in [from,from+dur]. */
export const FocusRack: React.FC<{ from: number; dur?: number; blurFrom?: number; children: ReactNode; style?: React.CSSProperties }> = ({ from, dur = 14, blurFrom = 12, children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  return <div style={{ filter: 'blur(' + ((1 - p) * blurFrom) + 'px) saturate(' + (0.85 + 0.15 * p) + ')', transform: 'scale(' + (1 + (1 - p) * 0.02) + ')', ...style }}>{children}</div>;
};

/** Wipe reveal across a captured fragment (used to "draw" the real chart line). */
export const WipeReveal: React.FC<{ from: number; dur?: number; direction?: 'left' | 'right'; children: ReactNode; style?: React.CSSProperties }> = ({ from, dur = 18, direction = 'left', children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const clip = direction === 'left' ? 'inset(0 ' + ((1 - p) * 100) + '% 0 0)' : 'inset(0 0 0 ' + ((1 - p) * 100) + '%)';
  return <div style={{ clipPath: clip, ...style }}>{children}</div>;
};

/** Cross-fade helper with optional blur bridge. */
export const CrossFade: React.FC<{ a: ReactNode; b: ReactNode; from: number; dur?: number; bridgeBlur?: number }> = ({ a, b, from, dur = 12, bridgeBlur = 6 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const bridge = Math.sin(p * Math.PI) * bridgeBlur;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - p, filter: 'blur(' + bridge + 'px)' }}>{a}</div>
      <div style={{ position: 'absolute', inset: 0, opacity: p, filter: 'blur(' + bridge + 'px)' }}>{b}</div>
    </AbsoluteFill>
  );
};

/** Captured card placed in screen space, with an optional lift shadow. */
export const CardFloat: React.FC<{ src: string; cssW: number; cssH: number; x: number; y: number; scale?: number; radius?: number; shadow?: number; children?: ReactNode; style?: React.CSSProperties }> = ({ src, cssW, cssH, x, y, scale = 1, radius = 24, shadow = 1, children, style }) => (
  <div
    style={{
      position: 'absolute',
      left: x, top: y, width: cssW, height: cssH,
      transform: 'scale(' + scale + ')', transformOrigin: 'left top',
      borderRadius: radius, overflow: 'hidden',
      border: '1px solid ' + C.lineStrong,
      background: C.card,
      boxShadow: '0 ' + (12 * shadow) + 'px ' + (32 * shadow) + 'px rgba(24,24,28,' + (0.09 * shadow) + '), 0 2px 8px rgba(43,34,73,' + (0.03 * shadow) + ')',
      ...style,
    }}
  >
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', display: 'block' }} />
    {children}
  </div>
);

/** Radial violet glow, cropped by the caller. */
export const GlowOrb: React.FC<{ x: number; y: number; r: number; from: number; to?: number; color?: string; opacity?: number }> = ({ x, y, r, from, to = from + 20, color = C.violet, opacity = 0.3 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  return (
    <div
      style={{
        position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%',
        background: 'radial-gradient(circle, ' + color + '66 0%, ' + color + '22 42%, transparent 72%)',
        opacity: p * opacity,
        transform: 'scale(' + (0.9 + p * 0.1) + ')',
        pointerEvents: 'none',
      }}
    />
  );
};

/** Thin drawn line between two page-space points (for the closing decision loop). */
export const LineLink: React.FC<{ x1: number; y1: number; x2: number; y2: number; from: number; dur?: number; color?: string; width?: number; curve?: number; opacity?: number }> = ({ x1, y1, x2, y2, from, dur = 18, color = C.violet, width = 2, curve = 0, opacity = 0.9 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + curve;
  const d = 'M ' + x1 + ' ' + y1 + ' Q ' + mx + ' ' + my + ' ' + x2 + ' ' + y2;
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1920 1080">
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray="1200" strokeDashoffset={1200 * (1 - p)} strokeLinecap="round" opacity={opacity} />
    </svg>
  );
};

/** Small metadata label used in the editorial column. */
export const Small: React.FC<{ children: ReactNode; from: number; x: number; y: number; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, from, x, y, color = C.muted, size = 32, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  return (
    <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT.en, fontSize: size, fontWeight: 500, lineHeight: 1.35, color: color, opacity: p, transform: 'translateY(' + ((1 - p) * 8) + 'px)', ...style }}>
      {children}
    </div>
  );
};
