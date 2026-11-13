import type { CamKey } from './PageCam';

/** Authoritative CSS-px geometry measured at scroll 0 (capture/layout-fixed.json). */

export const PAGE = {
  /** full app shell, 2x texture 2880 wide */
  workbench: { w: 1440, h: 1530, src: 'textures/app-workbench-full.png' },
  analysis: { w: 1440, h: 906, src: 'textures/app-analysis-full.png' },
  explore: { w: 1440, h: 1033, src: 'textures/app-explore-full.png' },
} as const;

/** content-only captures (sidebar excluded), 1114 CSS wide */
export const CONTENT = {
  workbench: { w: 1114, h: 1355, src: 'textures/page-workbench.png', x: 281 },
  analysis: { w: 1114, h: 731, src: 'textures/page-analysis.png', x: 281 },
  explore: { w: 1114, h: 857, src: 'textures/page-explore.png', x: 281 },
} as const;

export const SAFE = { bottom: 140, left: 120, top: 90 } as const;

export type Box = { x: number; y: number; w: number; h: number };

/** full-page document coordinates (y includes the 111px header offset) */
export const WB = {
  section: { x: 281, y: 111, w: 1114, h: 1354 } as Box,
  kpiRow: { x: 281, y: 200.9, w: 1114, h: 162 } as Box,
  kpis: [
    { x: 281, y: 200.9, w: 266.5, h: 162, file: 'cards/workbench-00.png', label: 'Completed Room Revenue ¥18,450' },
    { x: 563.5, y: 200.9, w: 266.5, h: 162, file: 'cards/workbench-01.png', label: 'Sold Room Nights 42' },
    { x: 846, y: 200.9, w: 266.5, h: 162, file: 'cards/workbench-02.png', label: 'Achieved Room Rate ¥439.29' },
    { x: 1128.5, y: 200.9, w: 266.5, h: 162, file: 'cards/workbench-03.png', label: 'Future Booked Value ¥12,800 · 24/35' },
  ],
  hero: { x: 281, y: 380.9, w: 710.1, h: 447.7 } as Box,
  heroTop: { x: 306, y: 405.9, w: 660.1, h: 271.3 } as Box,
  gauge: { x: 1011.1, y: 380.9, w: 383.9, h: 324.6 } as Box,
  gaugeWrap: { x: 1093.1, y: 467.3, w: 220, h: 124 } as Box,
  plan: { x: 1011.1, y: 725.5, w: 383.9, h: 335.3 } as Box,
  signals: { x: 281, y: 1152.8, w: 710.1, h: 312.2 } as Box,
  opps: { x: 281, y: 848.6, w: 710.1, h: 284.2 } as Box,
  oppCards: [
    { x: 281, y: 848.6, w: 347.1, h: 284.2 },
    { x: 644.1, y: 848.6, w: 347.1, h: 284.2 },
  ],
} as const;

export const AN = {
  section: { x: 281, y: 111, w: 1114, h: 730 } as Box,
  kpiRow: { x: 281, y: 200.9, w: 1114, h: 162 } as Box,
  kpis: [
    { x: 281, y: 200.9, w: 266.5, h: 162, file: 'cards/analysis-00.png', label: 'Booked Occupancy 68.6%' },
    { x: 563.5, y: 200.9, w: 266.5, h: 162, file: 'cards/analysis-01.png', label: 'Booking Progress 24/35' },
    { x: 846, y: 200.9, w: 266.5, h: 162, file: 'cards/analysis-02.png', label: 'Booked Amount ¥12,800' },
    { x: 1128.5, y: 200.9, w: 266.5, h: 162, file: 'cards/analysis-03.png', label: 'Average Booked Rate ¥533.33' },
  ],
  chart: { x: 281, y: 380.9, w: 710.1, h: 413.6 } as Box,
  chartSvg: { x: 306, y: 469.3, w: 660.1, h: 206.3 } as Box,
  table: { x: 1011.1, y: 380.9, w: 383.9, h: 460.6 } as Box,
  tableRows: [
    { y: 509.4, h: 43.8, label: '2026-11-10' },
    { y: 553.2, h: 43.8, label: '2026-11-11' },
    { y: 597.0, h: 43.8, label: '2026-11-12' },
    { y: 640.8, h: 43.8, label: '2026-11-13' },
    { y: 684.6, h: 43.8, label: '11-14 Sat' },
    { y: 728.4, h: 43.8, label: '11-15 Sun' },
    { y: 772.2, h: 43.8, label: '2026-11-16' },
  ],
} as const;

export const EX = {
  section: { x: 281, y: 111, w: 1114, h: 857 } as Box,
  stats: { x: 281, y: 200.9, w: 710.1, h: 288 } as Box,
  trend: { x: 1011.1, y: 200.9, w: 383.9, h: 257.2 } as Box,
  quotes: { x: 281, y: 506.9, w: 1114, h: 460.6 } as Box,
  quoteRows: [
    { y: 530, h: 118, label: 'Wuzhen Water Lane Riverside Boutique ¥568' },
    { y: 648, h: 118, label: 'Xitang Misty Rain Courtyard Inn ¥488' },
    { y: 766, h: 118, label: 'Jiangnan Waterside Design Resort ¥620' },
  ],
} as const;

/** sidebar nav active-pill geometry (page space) */
export const NAV = {
  x: 16,
  w: 250,
  items: { workbench: 132, analysis: 195, explore: 258, promotion: 321, mine: 430 },
  h: 44,
} as const;

/** standard camera: full app shell, right-shifted with a left editorial column */
export const camFull = (from: number, cx: number, cy: number, zoom: number, extra: Partial<CamKey> = {}): CamKey => ({ frame: from, cx, cy, zoom, ...extra });
