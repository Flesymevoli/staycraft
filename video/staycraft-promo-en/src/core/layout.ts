/**
 * EN cut page-space coordinates (1440 CSS px grid). Measured from the English
 * captures (capture/layout-en-*.json + layout-en-app-import.json).
 */
export type Rect = { x: number; y: number; w: number; h: number };

export const PAGES = {
  workbench: { src: 'textures/app-workbench.png', w: 1440, h: 953 },
  analysis: { src: 'textures/app-analysis.png', w: 1440, h: 1530 },
  importPage: { src: 'textures/app-import.png', w: 1440, h: 4732 },
  rooms: { src: 'textures/app-rooms.png', w: 1440, h: 1343 },
  market: { src: 'textures/app-market.png', w: 1440, h: 1580 },
  promoSimple: { src: 'textures/app-promo-simple.png', w: 1440, h: 1268 },
  promoTraffic: { src: 'textures/app-promo-traffic.png', w: 1440, h: 1268 },
  /** transitional alias: EN report beats use the analysis page as the document */
  report: { src: 'textures/app-analysis.png', w: 1440, h: 1530 },
} as const;

export const ANALYSIS = {
  page: PAGES.analysis,
  metricsCard: { x: 278, y: 354, w: 1120, h: 140 } as Rect,
  metricCells: [
    { x: 284, y: 360, w: 277, h: 128 },
    { x: 561, y: 360, w: 277, h: 128 },
    { x: 838, y: 360, w: 277, h: 128 },
    { x: 1115, y: 360, w: 277, h: 128 },
  ] as Rect[],
  chartCard: { x: 278, y: 510, w: 1120, h: 665 } as Rect,
  chartPlot: { x: 545, y: 725, w: 690, h: 235 } as Rect,
  /** same values as the CN capture; EN chart x is shifted by -1..+1 px only */
  chartPoints: [
    { date: '11-05', x: 575, y: 774, value: 80, weekend: false },
    { date: '11-06', x: 665, y: 813, value: 62, weekend: false },
    { date: '11-07', x: 755, y: 775, value: 80, weekend: true },
    { date: '11-08', x: 845, y: 899, value: 20, weekend: true },
    { date: '11-09', x: 935, y: 858, value: 40, weekend: false },
    { date: '11-10', x: 1025, y: 858, value: 40, weekend: false },
    { date: '11-11', x: 1115, y: 815, value: 60, weekend: false },
  ],
  lowPoint: { date: '11-08', x: 845, y: 899, value: 20 },
  axisZeroY: 946,
  revenuePreview: { x: 278, y: 1426, w: 1120, h: 153 } as Rect,
} as const;

export const MARKET = {
  page: PAGES.market,
  card: { x: 278, y: 199, w: 1100, h: 1193 } as Rect,
  priceCard: { x: 278, y: 338, w: 1100, h: 152 } as Rect,
  priceRangeText: { x: 300, y: 380, w: 330, h: 60 } as Rect,
  hotelsReturned: { x: 1000, y: 355, w: 260, h: 120 } as Rect,
  myPrice: { x: 278, y: 520, w: 1100, h: 260 } as Rect,
  slider: { x: 290, y: 690, w: 1080, h: 40 } as Rect,
  hotelList: { x: 278, y: 730, w: 1100, h: 640 } as Rect,
  quoteRows: [
    { x: 278, y: 745, w: 1100, h: 108 },
    { x: 278, y: 855, w: 1100, h: 108 },
    { x: 278, y: 965, w: 1100, h: 108 },
    { x: 278, y: 1075, w: 1100, h: 108 },
    { x: 278, y: 1185, w: 1100, h: 108 },
  ] as Rect[],
} as const;

export const WORKBENCH = {
  page: PAGES.workbench,
  incomeCard: { x: 278, y: 239, w: 1120, h: 150 } as Rect,
  reportArea: { x: 278, y: 470, w: 1120, h: 420 } as Rect,
} as const;

export const PROMO = {
  page: PAGES.promoSimple,
  pageTraffic: PAGES.promoTraffic,
  audienceCard: { x: 288, y: 199, w: 1100, h: 240 } as Rect,
  nearbyCard: { x: 288, y: 464, w: 1100, h: 204 } as Rect,
  copyCard: { x: 288, y: 692, w: 1100, h: 310 } as Rect,
  segmented: { x: 311, y: 759, w: 1054, h: 44 } as Rect,
  simpleTab: { x: 311, y: 759, w: 525, h: 44 } as Rect,
  socialTab: { x: 840, y: 759, w: 525, h: 44 } as Rect,
  draftsCard: { x: 288, y: 1026, w: 1100, h: 118 } as Rect,
  generate: { x: 307, y: 923, w: 112, h: 44 } as Rect,
} as const;

export const IMPORT = {
  page: PAGES.importPage,
  header: { x: 278, y: 180, w: 1120, h: 240 } as Rect,
  importCard: { x: 278, y: 275, w: 1120, h: 482 } as Rect,
  taskRows: [
    { x: 295, y: 545, w: 1080, h: 62 },
    { x: 295, y: 612, w: 1080, h: 62 },
    { x: 295, y: 679, w: 1080, h: 62 },
  ] as Rect[],
  bookingsList: { x: 278, y: 853, w: 1120, h: 900 } as Rect,
} as const;

/**
 * The English demo has no report-reader page. Report-beat shots (S10-S13) use the
 * analysis page as the document backdrop; this alias keeps those files compiling
 * while they are being re-fitted to ANALYSIS.*.
 */
export const REPORT = {
  page: PAGES.analysis,
  sheet: { x: 0, y: 0, w: 1440, h: 1530 } as Rect,
  headline: ANALYSIS.chartCard,
  section1: ANALYSIS.chartCard,
  uncertainty: ANALYSIS.revenuePreview,
} as const;
