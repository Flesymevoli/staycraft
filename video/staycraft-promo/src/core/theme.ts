import { Easing } from 'remotion';

export const C = {
  paper: '#ffffff',
  fog: '#f4f4f6',
  fogDeep: '#ececef',
  ink: '#18181b',
  inkSoft: '#2b2b30',
  muted: '#62626c',
  line: '#e1e1e7',
  lineDark: '#3a3a42',
  violet: '#6554e8',
  violetDeep: '#5A3FD6',
  violetFog: '#eeecfc',
  violetTint: '#aca2ec',
  yellow: '#ffdc32',
  yellowSoft: '#ffe98a',
} as const;

export const FONT = {
  zh: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
  en: 'Outfit, "Microsoft YaHei", sans-serif',
  num: 'Outfit, "Microsoft YaHei", sans-serif',
} as const;

export const EASE = {
  out: Easing.bezier(0.22, 0.61, 0.36, 1),
  inOut: Easing.bezier(0.33, 0, 0.15, 1),
  soft: Easing.bezier(0.4, 0, 0.2, 1),
  prop: Easing.out(Easing.cubic),
} as const;

export const SHADOW = {
  sheet: '0 2px 6px rgba(24,24,27,0.05), 0 30px 80px -30px rgba(24,24,27,0.18)',
  card: '0 1px 2px rgba(24,24,27,0.04), 0 18px 44px -22px rgba(24,24,27,0.16)',
  float: '0 10px 30px -10px rgba(24,24,27,0.18)',
} as const;

export const R = { card: 26, nested: 19, pill: 999 } as const;

export const TYPE = {
  display1: { fontSize: 132, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' },
  display2: { fontSize: 104, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.02em' },
  h: { fontSize: 76, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' },
  caption: { fontSize: 58, fontWeight: 500, lineHeight: 1.45, letterSpacing: '0' },
  label: { fontSize: 36, fontWeight: 500, lineHeight: 1.3, letterSpacing: '0.02em' },
  kicker: { fontSize: 30, fontWeight: 600, lineHeight: 1, letterSpacing: '0.14em' },
} as const;
