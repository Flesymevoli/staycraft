import { FPS } from './beat';

/**
 * SFX cue table for the 16-shot EN demo film (docs/03 §sound points).
 * Real-object foley only (clicks, page, metal, bell, risers, impacts); no game tones.
 * Peak frames are compensated from each source's measured energy peak and the
 * output AAC priming offset (same method as the previous StayCraft films).
 */

export const OUTPUT_AUDIO_OFFSET_FRAMES = 1.33; // measured AAC priming (re-check after first render)

type Src = { file: string; dur: number; peak: number };

const S = {
  impactA: { file: 'fs-645898.mp3', dur: 1.826, peak: 0.135 },
  impactB: { file: 'fs-812709.mp3', dur: 1.885, peak: 0.275 },
  riser: { file: 'fs-859482.mp3', dur: 3.0, peak: 2.285 },
  woosh: { file: 'fs-683096.mp3', dur: 1.322, peak: 0.955 },
  wooshShort: { file: 'fs-427823.mp3', dur: 0.8, peak: 0.215 },
  click: { file: 'fs-157539.mp3', dur: 0.161, peak: 0.005 },
  pop: { file: 'fs-202230.mp3', dur: 0.65, peak: 0.19 },
  popAlt: { file: 'fs-789793.mp3', dur: 0.22, peak: 0.005 },
  pencil: { file: 'fs-277312.mp3', dur: 1.074, peak: 0.025 },
  page: { file: 'fs-749880.mp3', dur: 0.679, peak: 0.465 },
  rustle: { file: 'fs-353125.mp3', dur: 1.13, peak: 0.865 },
  metal: { file: 'fs-337865.mp3', dur: 0.672, peak: 0.125 },
  room: { file: 'fs-536792.mp3', dur: 6.74, peak: 0.625 },
  bell: { file: 'fs-534261.mp3', dur: 0.612, peak: 0.215 },
  shutter: { file: 'fs-270435.mp3', dur: 0.164, peak: 0.085 },
} satisfies Record<string, Src>;

export type SfxCue = {
  id: string;
  src: string;
  from: number;
  durationInFrames: number;
  volume: number;
  note: string;
};

const peakAt = (src: Src, targetFrame: number): number =>
  Math.round(targetFrame - src.peak * FPS - OUTPUT_AUDIO_OFFSET_FRAMES);

const cue = (id: string, src: Src, targetFrame: number, volume: number, note: string): SfxCue => ({
  id,
  src: 'audio/sfx/' + src.file,
  from: peakAt(src, targetFrame),
  durationInFrames: Math.ceil(src.dur * FPS) + 2,
  volume,
  note,
});

export const SFX: SfxCue[] = [
  // S01 · brand hook (0–90)
  cue('s01-air', S.room, 6, 0.30, 'S01 soft room/air bed'),
  cue('s01-focus', S.woosh, 62, 0.18, 'S01 focus rack'),
  cue('s01-logo', S.bell, 84, 0.18, 'S01 logo settle'),

  // S02 · workbench establish (90–210)
  cue('s02-settle', S.wooshShort, 102, 0.22, 'S02 page settle'),
  cue('s02-kpi1', S.click, 150, 0.11, 'S02 KPI 1'),
  cue('s02-kpi2', S.click, 158, 0.10, 'S02 KPI 2'),
  cue('s02-kpi3', S.click, 166, 0.09, 'S02 KPI 3'),
  cue('s02-kpi4', S.click, 174, 0.08, 'S02 KPI 4'),
  cue('s02-riser', S.riser, 285, 0.24, 'S02→S03 judgment riser (peak on the judgment)'),

  // S03 · core judgment (210–330)
  cue('s03-hit', S.impactB, 289, 0.24, 'S03 judgment lands'),
  cue('s03-underline', S.pencil, 300, 0.55, 'S03 yellow underline'),

  // S04 · 68.6% gauge (330–450)
  cue('s04-swell', S.woosh, 340, 0.14, 'S04 gauge lift'),
  cue('s04-t1', S.click, 380, 0.09, 'S04 count tick'),
  cue('s04-t2', S.click, 384, 0.09, 'S04 count tick'),
  cue('s04-t3', S.click, 388, 0.08, 'S04 count tick'),
  cue('s04-t4', S.click, 392, 0.08, 'S04 count tick'),
  cue('s04-ring', S.bell, 430, 0.16, 'S04 ring pop'),

  // S05 · evidence (450–555)
  cue('s05-lift', S.wooshShort, 456, 0.18, 'S05 evidence card lift'),
  cue('s05-ota', S.click, 500, 0.10, 'S05 OTA row'),
  cue('s05-pms', S.metal, 508, 0.10, 'S05 PMS row'),

  // S06 · action plan (555–660)
  cue('s06-lift', S.wooshShort, 560, 0.16, 'S06 action plan lift'),
  cue('s06-done1', S.shutter, 600, 0.34, 'S06 first checked item (real shutter click)'),
  cue('s06-done2', S.shutter, 615, 0.26, 'S06 second checked item'),
  cue('s06-settle', S.metal, 645, 0.09, 'S06 card settle'),

  // S07 · handoff to Business Data (660–780)
  cue('s07-nav', S.click, 700, 0.22, 'S07 nav pill click'),
  cue('s07-cross', S.woosh, 706, 0.20, 'S07 page crossfade'),
  cue('s07-settle', S.bell, 742, 0.10, 'S07 analysis settles'),

  // S08 · KPI row (780–900)
  cue('s08-pan', S.woosh, 790, 0.12, 'S08 camera pan'),
  cue('s08-k1', S.click, 800, 0.09, 'S08 KPI 1'),
  cue('s08-k2', S.click, 808, 0.09, 'S08 KPI 2'),
  cue('s08-k3', S.click, 816, 0.08, 'S08 KPI 3'),
  cue('s08-k4', S.click, 824, 0.08, 'S08 KPI 4'),
  cue('s08-ring', S.bell, 830, 0.14, 'S08 68.6% ring'),

  // S09 · daily line (900–1020)
  cue('s09-reveal', S.pencil, 930, 0.55, 'S09 line reveal'),
  cue('s09-ring1', S.click, 960, 0.16, 'S09 100% point'),
  cue('s09-ring2', S.click, 1000, 0.14, 'S09 80% point'),

  // S10 · daily table (1020–1080)
  cue('s10-row1', S.metal, 1044, 0.10, 'S10 Sat row'),
  cue('s10-row2', S.metal, 1052, 0.09, 'S10 Sun row'),

  // S11 · handoff to Market (1080–1200)
  cue('s11-nav', S.click, 1120, 0.22, 'S11 nav pill click'),
  cue('s11-cross', S.woosh, 1126, 0.20, 'S11 page crossfade'),

  // S12 · market three numbers (1200–1320)
  cue('s12-t1', S.click, 1240, 0.10, 'S12 median count'),
  cue('s12-t2', S.click, 1244, 0.09, 'S12 median count'),
  cue('s12-t3', S.click, 1248, 0.09, 'S12 median count'),
  cue('s12-t4', S.click, 1252, 0.08, 'S12 median count'),
  cue('s12-underline', S.pencil, 1250, 0.50, 'S12 underline ¥540'),
  cue('s12-settle', S.metal, 1300, 0.10, 'S12 stats settle'),

  // S13 · 7-day median line (1320–1410)
  cue('s13-reveal', S.pencil, 1350, 0.50, 'S13 median line reveal'),
  cue('s13-ring', S.bell, 1360, 0.14, 'S13 ¥540 point'),

  // S14 · rate advisory (1410–1500)
  cue('s14-hit', S.impactB, 1438, 0.18, 'S14 advisory lands'),
  cue('s14-underline', S.pencil, 1445, 0.48, 'S14 underline ¥520–¥540'),

  // S15 · quotes + loop (1500–1620)
  cue('s15-row1', S.click, 1540, 0.10, 'S15 quote row 1'),
  cue('s15-row2', S.click, 1548, 0.09, 'S15 quote row 2'),
  cue('s15-row3', S.click, 1556, 0.09, 'S15 quote row 3'),
  cue('s15-riser', S.riser, 1580, 0.24, 'S15 riser to the loop'),
  cue('s15-loop', S.impactA, 1585, 0.26, 'S15 decision loop closes'),
  cue('s15-air', S.woosh, 1600, 0.16, 'S15 air out'),
  cue('s15-whoosh', S.wooshShort, 1610, 0.20, 'S15 → S16 whoosh'),

  // S16 · brand + QR (1620–1800)
  cue('s16-logo', S.impactB, 1640, 0.22, 'S16 logo lands'),
  cue('s16-qr', S.page, 1662, 0.16, 'S16 QR card settles'),
  cue('s16-sparkle', S.bell, 1680, 0.24, 'S16 closing sparkle'),
];

// Long room-tone source is trimmed to the S01 window.
for (const c of SFX) if (c.id === 's01-air') c.durationInFrames = 120;
