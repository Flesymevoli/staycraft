import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';

export const Placeholder: React.FC<{ id: string; title: string; from: number; duration: number }> = ({ id, title, from, duration }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.canvas, color: C.ink, fontFamily: FONT.en, padding: 80 }}>
      <div style={{ fontSize: 28, letterSpacing: '0.16em', color: C.violet, fontWeight: 600 }}>SHOT {id}</div>
      <div style={{ fontSize: 76, fontWeight: 700, marginTop: 18, letterSpacing: '-0.03em' }}>{title}</div>
      <div style={{ fontSize: 30, color: C.muted, marginTop: 20 }}>f{from} · +{duration}f · current {frame}</div>
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 80, height: 12, background: C.line, borderRadius: 6 }}>
        <div style={{ width: ((frame + 1) / duration) * 100 + '%', height: '100%', background: C.violet, borderRadius: 6 }} />
      </div>
    </AbsoluteFill>
  );
};
