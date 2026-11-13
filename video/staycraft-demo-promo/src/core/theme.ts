import { Easing } from 'remotion';

/** StayCraft concept-demo palette (final Gemini source: frontend/public/concept/index.html). */
export const C = {
  stage: '#efedf8',
  canvas: '#fdfdfe',
  card: '#ffffff',
  cardSubtle: '#f9fafb',
  ink: '#303039',
  inkSecondary: '#51515d',
  muted: '#73737f',
  line: '#efedf3',
  lineStrong: '#dedbe8',
  violet: '#6554c7',
  violetDeep: '#5545b4',
  chartViolet: '#7866d6',
  violetSoft: '#f3f2fc',
  violetPill: '#e5e0f5',
  yellow: '#e7d598',
  yellowSoft: '#f7efd4',
  amberBg: '#fbf6e8',
  amberText: '#85581a',
  emeraldBg: '#eaf7ef',
  emeraldText: '#1e7045',
  coralBg: '#fdf0f0',
  coralText: '#a63636',
  shadow: '0 2px 8px rgba(43,34,73,0.035), 0 24px 60px -28px rgba(43,34,73,0.22)',
} as const;

export const FONT = {
  en: 'Outfit, "Microsoft YaHei", sans-serif',
  num: 'Outfit, "Microsoft YaHei", sans-serif',
  mono: 'Outfit, ui-monospace, monospace',
} as const;

export const EASE = {
  out: Easing.bezier(0.22, 0.61, 0.36, 1),
  inOut: Easing.bezier(0.33, 0, 0.15, 1),
  soft: Easing.bezier(0.4, 0, 0.2, 1),
  prop: Easing.out(Easing.cubic),
  expo: Easing.bezier(0.16, 1, 0.3, 1),
} as const;

export const R = { card: 24, nested: 18, pill: 999 } as const;

export const TYPE = {
  display1: { fontSize: 150, fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.035em' },
  display2: { fontSize: 116, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' },
  h: { fontSize: 84, fontWeight: 600, lineHeight: 1.14, letterSpacing: '-0.02em' },
  caption: { fontSize: 52, fontWeight: 500, lineHeight: 1.35, letterSpacing: '0' },
  label: { fontSize: 34, fontWeight: 500, lineHeight: 1.3, letterSpacing: '0.01em' },
  kicker: { fontSize: 28, fontWeight: 600, lineHeight: 1, letterSpacing: '0.16em' },
} as const;
