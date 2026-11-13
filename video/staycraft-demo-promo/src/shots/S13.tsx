import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { CardFloat, FocusRack, GlowOrb, LineLink, Ring } from '../core/overlays';
import { Kicker } from '../core/ui';

/**
 * S13 · 7-day median line (1320–1410f, 90f)
 * Card: cards/explore-01 → hi/explore-trend (3x), macro 880×594 at (880,250) per 03.
 * No headline; one annotation ("SATURDAY MEDIAN ¥540") with a short yellow leader
 * to the 11/14 point, plus one yellow point ring — same attention element.
 * The real curve is never redrawn: a card-coloured cover wipes away right→left to
 * "draw" the line (18f). Camera pushes gently from the left segment to the point.
 * Hold: last 30f still.
 *
 * Data (UI, verbatim): 7-day medians ¥440 / ¥430 / ¥450 / ¥490 / ¥540 (11/14 Sat) /
 * ¥510 (11/15 Sun) / ¥460.
 */
const CARD = { x: 880, y: 250, w: 880, h: 594 };
const SRC = 'textures/hi/explore-trend.png';
const K = 880 / 384; // display px per card CSS px
/** card-CSS → display */
const cd = (v: number) => v * K;

export const S13: React.FC = () => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const reveal = interpolate(f, [8, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const kickIn = interpolate(f, [6, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const labelIn = interpolate(f, [18, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const ringIn = interpolate(f, [22, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // camera: push in and slide left so the 11/14 point sits near mid-frame
  const cam = interpolate(f, [8, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const tx = -364 * cam;
  const ty = 37 * cam;
  const zoom = 1 + 0.045 * cam;
  const lift = interpolate(f, [0, 20], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  /** 11/14 point in card-CSS px (measured from the capture) */
  const POINT = { x: 245.5, y: 111.25 };

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1100px 760px at 58% 42%, #f8f7ff 0%, #efedf8 58%, #f2f3f5 100%)', overflow: 'hidden' }}>
      <GlowOrb x={1330} y={430} r={470} from={0} to={20} opacity={0.3} />

      <Kicker
        text="7-DAY SAMPLE MEDIAN TREND"
        size={28}
        style={{ position: 'absolute', left: 120, top: 90, opacity: kickIn, transform: `translateY(${(1 - kickIn) * 8}px)` }}
      />

      <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: '960px 540px' }}>
        <FocusRack from={0} dur={14} blurFrom={10} style={{ position: 'absolute', inset: 0 }}>
          <CardFloat src={SRC} cssW={CARD.w} cssH={CARD.h} x={CARD.x} y={CARD.y + (1 - enter) * 24} radius={26} shadow={lift}>
            {/* card-coloured cover: wipes away right→left so the real line "draws" */}
            <div
              style={{
                position: 'absolute',
                left: cd(10), top: cd(84), width: cd(364), height: cd(148),
                background: C.card,
                transform: `scaleX(${1 - reveal})`,
                transformOrigin: 'left center',
              }}
            />
            {/* the 11/14 median point ring (yellow = decision point) */}
            <div style={{ position: 'absolute', inset: 0, opacity: ringIn }}>
              <Ring x={cd(POINT.x) - 36} y={cd(POINT.y) - 36} w={72} h={72} from={22} radius={36} thickness={4} />
            </div>
          </CardFloat>
        </FocusRack>

        {/* annotation + short yellow leader to the point (screen space, follows the camera) */}
        <div
          style={{
            position: 'absolute', left: 505, top: 420,
            fontFamily: FONT.en, fontSize: 32, fontWeight: 600, letterSpacing: '0.01em',
            color: C.ink, whiteSpace: 'nowrap',
            opacity: labelIn, transform: `translateY(${(1 - labelIn) * 8}px)`,
          }}
        >
          SATURDAY MEDIAN ¥540
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: labelIn }}>
          <LineLink x1={850} y1={458} x2={1420} y2={496} from={24} dur={16} color={C.yellow} width={3} curve={-60} opacity={0.95} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
