import { DURATION, HEIGHT, WIDTH } from './beat';

export type ShotId =
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07' | 'S08'
  | 'S09' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14' | 'S15' | 'S16';

export type Shot = {
  id: ShotId;
  from: number;
  duration: number;
  title: string;
  act: 1 | 2 | 3 | 4 | 5;
};

/**
 * SHOTS is the single source of truth for the timeline (video-shotcraft
 * pipeline phase 5 rule). Captions, SFX cue frames and transitions all derive
 * from it. 60.0s at 120 BPM: every boundary is a beat multiple.
 */
export const SHOTS: Shot[] = [
  { id: 'S01', from: 0, duration: 180, title: '夜桌·四格窗', act: 1 },
  { id: 'S02', from: 180, duration: 105, title: '品牌接棒', act: 2 },
  { id: 'S03', from: 285, duration: 90, title: '导入归位', act: 2 },
  { id: 'S04', from: 375, duration: 120, title: '全景+数字', act: 2 },
  { id: 'S05', from: 495, duration: 90, title: '折线低谷', act: 2 },
  { id: 'S06', from: 585, duration: 75, title: '两本账', act: 2 },
  { id: 'S07', from: 660, duration: 90, title: 'AI 调查', act: 3 },
  { id: 'S08', from: 750, duration: 120, title: '市场页扫描', act: 3 },
  { id: 'S09', from: 870, duration: 90, title: '价格位置', act: 3 },
  { id: 'S10', from: 960, duration: 60, title: '报告标题', act: 3 },
  { id: 'S11', from: 1020, duration: 180, title: '报告三拍', act: 4 },
  { id: 'S12', from: 1200, duration: 90, title: '不确定性', act: 4 },
  { id: 'S13', from: 1290, duration: 90, title: '合上报告→推广', act: 4 },
  { id: 'S14', from: 1380, duration: 150, title: '推广两版', act: 5 },
  { id: 'S15', from: 1530, duration: 90, title: '手机确认', act: 5 },
  { id: 'S16', from: 1620, duration: 180, title: '品牌收尾', act: 5 },
];

export const shotById = (id: ShotId): Shot => {
  const shot = SHOTS.find((s) => s.id === id);
  if (!shot) throw new Error('unknown shot ' + id);
  return shot;
};

export const endOf = (id: ShotId): number => {
  const shot = shotById(id);
  return shot.from + shot.duration;
};

const total = SHOTS.reduce((sum, s) => sum + s.duration, 0);
if (total !== DURATION) {
  throw new Error('SHOTS must add up to ' + DURATION + ' frames, got ' + total);
}

export { DURATION, HEIGHT, WIDTH };
