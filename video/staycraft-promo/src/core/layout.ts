/**
 * Measured page-space coordinates (1440 CSS px grid) for the frozen screenshots.
 * Source: pixel measurement of artifacts/app-screenshots-2026-11-05 (see
 * analysis/measure-layout.mjs + chart-points3.mjs). The captures are 1x, so the
 * boards never zoom past 1.15 (docs/01 §6.2).
 */

export type Rect = { x: number; y: number; w: number; h: number };

export const PAGES = {
  workbench: { src: 'textures/app-workbench.png', w: 1440, h: 1000 },
  workbenchReport: { src: 'textures/app-workbench-report.png', w: 1440, h: 4398 },
  analysis: { src: 'textures/app-analysis.png', w: 1440, h: 1530 },
  market: { src: 'textures/app-market.png', w: 1440, h: 1580 },
  promoSimple: { src: 'textures/app-promo-simple.png', w: 1440, h: 2575 },
  promoTraffic: { src: 'textures/app-promo-traffic.png', w: 1440, h: 2575 },
  report: { src: 'textures/app-report.png', w: 1440, h: 3839 },
  importPage: { src: 'textures/app-import.png', w: 1440, h: 4799 },
  rooms: { src: 'textures/app-rooms.png', w: 1440, h: 1371 },
} as const;

/** app-analysis.png */
export const ANALYSIS = {
  page: PAGES.analysis,
  metricsCard: { x: 279, y: 355, w: 1118, h: 138 } as Rect,
  /** the four metric cells inside metricsCard (columns) */
  metricCells: [
    { x: 279, y: 355, w: 280, h: 138 },
    { x: 559, y: 355, w: 280, h: 138 },
    { x: 839, y: 355, w: 280, h: 138 },
    { x: 1119, y: 355, w: 278, h: 138 },
  ] as Rect[],
  chartCard: { x: 279, y: 511, w: 1118, h: 663 } as Rect,
  /** plot area (chart card inner) */
  chartPlot: { x: 540, y: 720, w: 680, h: 230 } as Rect,
  /** 7 daily points, measured pixel centres; value = round((947 - y) / 2.15) */
  chartPoints: [
    { date: '11-05', x: 576, y: 775, value: 80, weekend: false },
    { date: '11-06', x: 666, y: 814, value: 62, weekend: false },
    { date: '11-07', x: 756, y: 776, value: 80, weekend: true },
    { date: '11-08', x: 846, y: 900, value: 20, weekend: true },
    { date: '11-09', x: 936, y: 859, value: 40, weekend: false },
    { date: '11-10', x: 1026, y: 859, value: 40, weekend: false },
    { date: '11-11', x: 1116, y: 816, value: 60, weekend: false },
  ],
  lowPoint: { date: '11-08', x: 846, y: 900, value: 20 },
  axisZeroY: 947,
  pricePanel: { x: 279, y: 1216, w: 1118, h: 220 } as Rect,
} as const;

/** app-market.png */
export const MARKET = {
  page: PAGES.market,
  priceCard: { x: 279, y: 350, w: 1100, h: 200 } as Rect,
  priceRange: { x: 296, y: 452, w: 420, h: 80 } as Rect,
  hotelCount: { x: 1018, y: 420, w: 300, h: 140 } as Rect,
  myPrice: { x: 279, y: 618, w: 1100, h: 200 } as Rect,
  slider: { x: 290, y: 800, w: 1080, h: 30 } as Rect,
  hotelList: { x: 279, y: 834, w: 1098, h: 557 } as Rect,
  /** five quote rows inside the list (row height ~105) */
  quoteRows: [
    { x: 279, y: 852, w: 1098, h: 103 },
    { x: 279, y: 957, w: 1098, h: 103 },
    { x: 279, y: 1062, w: 1098, h: 103 },
    { x: 279, y: 1167, w: 1098, h: 103 },
    { x: 279, y: 1272, w: 1098, h: 103 },
  ] as Rect[],
} as const;

/** app-workbench.png */
export const WORKBENCH = {
  page: PAGES.workbench,
  metricsCard: { x: 279, y: 240, w: 1118, h: 148 } as Rect,
  reportHeadline: { x: 279, y: 520, w: 1118, h: 120 } as Rect,
} as const;

/** app-promo-simple.png (and same layout on promo-traffic) */
export const PROMO = {
  page: PAGES.promoSimple,
  pageTraffic: PAGES.promoTraffic,
  audienceCard: { x: 289, y: 200, w: 1098, h: 239 } as Rect,
  opportunityCard: { x: 289, y: 465, w: 1098, h: 903 } as Rect,
  copyPanel: { x: 289, y: 1394, w: 1098, h: 308 } as Rect,
  /** segmented control: 简约版 | 引流版 (measured from the white thumb row) */
  segmented: { x: 432, y: 1548, w: 940, h: 46 } as Rect,
  draftsCard: { x: 289, y: 1728, w: 1098, h: 579 } as Rect,
  draftTextArea: { x: 308, y: 1830, w: 1060, h: 380 } as Rect,
} as const;

/** app-report.png */
export const REPORT = {
  page: PAGES.report,
  sheet: { x: 311, y: 109, w: 818, h: 3649 } as Rect,
  /** top: kicker + headline */
  headline: { x: 352, y: 200, w: 740, h: 240 } as Rect,
  section1: { x: 352, y: 600, w: 740, h: 620 } as Rect,
  uncertainty: { x: 352, y: 3000, w: 740, h: 560 } as Rect,
} as const;

/** app-import.png */
export const IMPORT = {
  page: PAGES.importPage,
  head: { x: 279, y: 200, w: 1118, h: 400 } as Rect,
} as const;
