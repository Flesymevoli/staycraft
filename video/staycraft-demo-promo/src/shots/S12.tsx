import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE } from '../core/theme';
import { CardFloat, GlowOrb, Underline } from '../core/overlays';
import { Kicker } from '../core/ui';

/**
 * S12 · Market: three numbers (1200–1320f, 120f)
 * Card: cards/explore-00 → hi/explore-stats (3x). Full card macro at 2.11x
 * (1500×610, x=360,y=210 per 03). No headline — the three numbers are the text.
 * The only yellow use is the hand underline under ¥540 (the decision median).
 * Camera: the card grows out of S11's stats-card rect (motion-b's S11_EXIT) with a
 * focus pull, then a slow pan toward the right-hand ranges and back; last 36f still.
 *
 * Data (UI, verbatim): ¥540 Sample Median · ¥488–¥594 Middle 50% Band ·
 * ¥420–¥580 Your Listed Rates · "4 stays · 4 valid calendar quotes".
 */
const CARD = { x: 360, y: 210, w: 1500, h: 610 };
const SRC = 'textures/hi/explore-stats.png';

export const S12: React.FC = () => {
  const f = useCurrentFrame();
  // T1 match: the card lifts out of S11's page rect (motion-b's S11_EXIT mapping:
  // stats card on screen ≈ 1033.6,481.0,543.4×220.3) and grows into the macro.
  const S11_CARD = { x: 1033.6, y: 481.0, s: 543.4 / 1500 };
  const enter = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const lift01 = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // focus-pull through the growth: crisp at f0 (matches S11), soft mid-move, sharp on the macro
  const focusBlur = Math.sin(Math.min(1, f / 18) * Math.PI) * 5;
  const textIn = interpolate(f, [6, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const cardX = S11_CARD.x + (CARD.x - S11_CARD.x) * enter;
  const cardY = S11_CARD.y + (CARD.y - S11_CARD.y) * enter;
  const cardScale = S11_CARD.s + (1 - S11_CARD.s) * enter;

  // camera: pan toward ¥420–¥580 (card moves left), then settle back toward ¥540
  const pan = interpolate(f, [20, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const back = interpolate(f, [58, 84], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const dx = -150 * pan + 110 * back;
  const dy = -16 * pan + 12 * back;
  const zoom = 1 + 0.035 * pan - 0.018 * back; // 1 → 1.035 → 1.017
  // card lift: a slightly deeper shadow as it lands
  const lift = interpolate(f, [0, 24], [1.35, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1100px 760px at 60% 40%, #f8f7ff 0%, #efedf8 58%, #f2f3f5 100%)', overflow: 'hidden' }}>
      <GlowOrb x={1120} y={520} r={520} from={0} to={22} opacity={0.35} />

      {/* kicker only — no headline (03 §4 / 02 S12) */}
      <Kicker
        text="DAILY SAMPLE STATS · 4 VALID QUOTES"
        size={28}
        style={{ position: 'absolute', left: 120, top: 90, opacity: textIn, transform: `translateY(${(1 - textIn) * 8}px)` }}
      />

      <div style={{ position: 'absolute', inset: 0, transform: `translate(${dx}px, ${dy}px) scale(${zoom})`, transformOrigin: '960px 540px' }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(' + focusBlur.toFixed(2) + 'px)' }}>
          <CardFloat src={SRC} cssW={CARD.w} cssH={CARD.h} x={cardX} y={cardY} scale={cardScale} radius={30} shadow={1 + (lift - 1) * lift01}>
            {/* the one yellow use: decision median underline (hand-drawn feel) */}
            <div style={{ position: 'absolute', inset: 0, opacity: enter, transform: 'rotate(-1.2deg)', transformOrigin: '140px 244px' }}>
              <Underline x={76} y={244} w={132} from={26} height={5} radius={3} />
            </div>
          </CardFloat>
        </div>
      </div>
    </AbsoluteFill>
  );
};
