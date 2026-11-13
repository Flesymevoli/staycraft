import { DURATION } from './beat';

export type ShotId = 'S01'|'S02'|'S03'|'S04'|'S05'|'S06'|'S07'|'S08'|'S09'|'S10'|'S11'|'S12'|'S13'|'S14'|'S15'|'S16';

export type Shot = { id: ShotId; from: number; duration: number; title: string; act: 1|2|3|4|5 };

/**
 * Locked storyboard (docs/03-storyboard.md, creative-director v1):
 * 16 shots, 0–1800f @30fps, 120 BPM (every boundary is a 15f beat multiple).
 */
export const SHOTS: Shot[] = [
  { id: 'S01', from: 0,    duration: 90,  title: 'Brand hook · week in one view', act: 1 },
  { id: 'S02', from: 90,   duration: 120, title: 'Workbench establishes', act: 1 },
  { id: 'S03', from: 210,  duration: 120, title: 'Core judgment', act: 2 },
  { id: 'S04', from: 330,  duration: 120, title: '68.6% radial gauge', act: 2 },
  { id: 'S05', from: 450,  duration: 105, title: 'Evidence sources', act: 2 },
  { id: 'S06', from: 555,  duration: 105, title: 'Action plan', act: 2 },
  { id: 'S07', from: 660,  duration: 120, title: 'Handoff to Business Data', act: 3 },
  { id: 'S08', from: 780,  duration: 120, title: 'Business KPI row', act: 3 },
  { id: 'S09', from: 900,  duration: 120, title: 'Daily occupancy line', act: 3 },
  { id: 'S10', from: 1020, duration: 60,  title: 'Daily figures table', act: 3 },
  { id: 'S11', from: 1080, duration: 120, title: 'Handoff to Market Quotes', act: 4 },
  { id: 'S12', from: 1200, duration: 120, title: 'Market: three numbers', act: 4 },
  { id: 'S13', from: 1320, duration: 90,  title: '7-day median line', act: 4 },
  { id: 'S14', from: 1410, duration: 90,  title: 'Rate advisory', act: 4 },
  { id: 'S15', from: 1500, duration: 120, title: 'Quotes + decision loop', act: 5 },
  { id: 'S16', from: 1620, duration: 180, title: 'Brand + QR close', act: 5 },
];

export const shotById = (id: ShotId): Shot => {
  const shot = SHOTS.find((s) => s.id === id);
  if (!shot) throw new Error('unknown shot ' + id);
  return shot;
};
export const endOf = (id: ShotId): number => { const s = shotById(id); return s.from + s.duration; };
const total = SHOTS.reduce((n, s) => n + s.duration, 0);
if (total !== DURATION) throw new Error('SHOTS must add up to ' + DURATION + ', got ' + total);
export { DURATION };
