import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { FocusRack, GlowOrb } from '../core/overlays';
import { Kicker, YellowMark } from '../core/ui';

/**
 * S14 · Rate advisory (1410–1500f, 90f)
 * Card: hi/explore-stats (3x). The macro is the whole explore-00 card from just
 * above its heading to its bottom edge (card CSS y 18–289 → 1450×553 at
 * (380,392)), so the real advice box is the hero and the card top is complete.
 * Headline (02 S11): "Keep Saturday firm. / Test ¥520–¥540." 96px; the only yellow
 * use is the marker under ¥520–¥540. Camera micro-push from the card head to the
 * advice sentence; last 30f completely still.
 *
 * UI advice (verbatim): "Listed rates overlap the sample band" / "Sample median is
 * ¥540. Keep Saturday rates firm and test ¥520–¥540 on the remaining Sunday room."
 */
// full card width, from just above the heading down to the card's own bottom edge
const CROP = { x: 0, y: 54, w: 2133, h: 813 }; // 3x px of hi/explore-stats (card CSS y 18–289)
const SRC_W = 2133;
const SRC_H = 867;
const OUT = { x: 380, y: 392, w: 1450, h: 553 };

const CropCard: React.FC<{ opacity?: number; lift?: number }> = ({ opacity = 1, lift = 1 }) => {
  const s = OUT.w / CROP.w;
  return (
    <div
      style={{
        position: 'absolute', left: OUT.x, top: OUT.y, width: OUT.w, height: OUT.h,
        borderRadius: 26, overflow: 'hidden', background: C.card,
        border: '1px solid ' + C.lineStrong,
        boxShadow: '0 16px 40px rgba(24,24,28,' + 0.09 * lift + '), 0 3px 10px rgba(43,34,73,' + 0.035 * lift + ')',
        opacity,
      }}
    >
      <Img
        src={staticFile('textures/hi/explore-stats.png')}
        style={{
          position: 'absolute',
          left: -CROP.x * s,
          top: -CROP.y * s,
          width: SRC_W * s,
          height: SRC_H * s,
          display: 'block',
        }}
      />
    </div>
  );
};

export const S14: React.FC = () => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const kick = interpolate(f, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const h1 = interpolate(f, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const h2 = interpolate(f, [12, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // camera micro-push toward the advice sentence, then fully still (30f hold)
  const push = interpolate(f, [18, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const zoom = 1 + 0.04 * push;
  const ty = -12 * push;
  const lift = interpolate(f, [0, 22], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1100px 780px at 58% 44%, #f8f7ff 0%, #efedf8 58%, #f2f3f5 100%)', overflow: 'hidden' }}>
      <GlowOrb x={1000} y={600} r={520} from={0} to={20} opacity={0.3} />

      <Kicker
        text="RATE ADVISORY · REMAINING SUNDAY ROOM"
        size={28}
        style={{ position: 'absolute', left: 120, top: 84, opacity: kick, transform: `translateY(${(1 - kick) * 8}px)` }}
      />

      <div style={{ position: 'absolute', left: 120, top: 140 }}>
        <div
          style={{
            fontFamily: FONT.en, fontSize: 96, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em',
            color: C.ink, whiteSpace: 'nowrap', opacity: h1, transform: `translateY(${(1 - h1) * 14}px)`,
          }}
        >
          Keep Saturday firm.
        </div>
        <div
          style={{
            fontFamily: FONT.en, fontSize: 96, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em',
            color: C.ink, whiteSpace: 'nowrap', opacity: h2, transform: `translateY(${(1 - h2) * 14}px)`,
          }}
        >
          Test <YellowMark from={18}>¥520–¥540</YellowMark>.
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, transform: `translate(0, ${ty}px) scale(${zoom})`, transformOrigin: '960px 600px' }}>
        <FocusRack from={0} dur={14} blurFrom={10} style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', inset: 0, opacity: enter, transform: `translateY(${(1 - enter) * 24}px)` }}>
            <CropCard lift={lift} />
          </div>
        </FocusRack>
      </div>
    </AbsoluteFill>
  );
};
