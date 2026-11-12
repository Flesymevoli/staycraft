import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { SHOTS } from './timeline';

export const Placeholder: React.FC<{ id: keyof typeof SHOT_META; title: string }> = ({ id, title }) => {
  const frame = useCurrentFrame();
  const shot = SHOTS.find((s) => s.id === id);
  const p = shot ? Math.min(1, frame / Math.max(1, shot.duration)) : 0;
  return (
    <AbsoluteFill style={{ background: C.fog, fontFamily: FONT.zh, color: C.muted, padding: 80 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <div style={{ fontSize: 150, fontWeight: 700, color: C.ink, letterSpacing: '-0.04em' }}>{id}</div>
        <div style={{ fontSize: 46 }}>{title}</div>
      </div>
      <div style={{ marginTop: 'auto', height: 4, background: C.line, width: '100%' }}>
        <div style={{ height: 4, background: C.violet, width: p * 100 + '%' }} />
      </div>
    </AbsoluteFill>
  );
};

export const SHOT_META = {
  S01: '夜桌·四格窗', S02: '品牌接棒', S03: '导入归位', S04: '全景+数字',
  S05: '折线低谷', S06: '两本账', S07: 'AI 调查', S08: '市场页扫描',
  S09: '价格位置', S10: '报告标题', S11: '报告三拍', S12: '不确定性',
  S13: '合上报告→推广', S14: '推广两版', S15: '手机确认', S16: '品牌收尾',
} as const;
