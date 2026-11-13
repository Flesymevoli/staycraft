import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { PageCam } from '../core/PageCam';

/**
 * S03 · Core judgment (210–330f, 4.0s)
 * workbench-04 hero card at 1500×947 on the right (hi/ 3x crop via PageCam so the
 * captured UI stays crisp). No headline — the card already carries the sentence.
 * Two element-level events: the real chart line is revealed by a clip mask (left→right,
 * the line itself is never redrawn) and a yellow hand-drawn underline lands under
 * "has 1 room left" (the decision point, single yellow use this shot).
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

const CARD = { w: 711.1, h: 447.7 };
// chart region inside the card (CSS page space)
const CHART = { x: 318, y: 70, w: 360, h: 128 };
// yellow underline geometry (card CSS space): under "has 1 room left"
const UL = { x: 24, y: 123.4, w: 236 };

export const S03: React.FC = () => {
  const f = useCurrentFrame();

  // T1 in: card resolves out of the S02 focus rack
  const focus = ramp(f, 0, 14, EASE.inOut);
  const blur = 5 * (1 - focus);
  // tiny push 1.0 → 1.05 while keeping the card's top-left close to (380,140)
  const z0 = 2.08;
  const z1 = 2.15;
  const zoom = z0 + (z1 - z0) * ramp(f, 0, 120, EASE.inOut);
  const cx = 580 / zoom;
  const cy = 400 / zoom;

  // chart line reveal + underline draw
  const reveal = ramp(f, 14, 32, EASE.inOut);
  const ulDraw = ramp(f, 40, 52, EASE.inOut);
  const kick = ramp(f, 6, 18, EASE.out);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden' }}>
      <PageCam
        src="textures/hi/workbench-hero.png"
        pageW={CARD.w}
        pageH={CARD.h}
        blur={blur}
        keys={[
          { frame: 0, cx, cy, zoom },
          { frame: 120, cx, cy, zoom },
        ]}
      >
        {/* chart mask: white patch + a clipped duplicate of the same card, revealed L→R */}
        <div style={{ position: 'absolute', left: CHART.x, top: CHART.y, width: CHART.w, height: CHART.h, background: '#ffffff' }} />
        <div
          style={{
            position: 'absolute',
            left: CHART.x,
            top: CHART.y,
            width: CHART.w,
            height: CHART.h,
            overflow: 'hidden',
            clipPath: 'inset(0 ' + (1 - reveal) * 100 + '% 0 0)',
          }}
        >
          <Img
            src={staticFile('textures/hi/workbench-hero.png')}
            style={{ position: 'absolute', left: -CHART.x, top: -CHART.y, width: CARD.w, height: CARD.h, display: 'block' }}
          />
        </div>

        {/* hand-drawn yellow underline under "has 1 room left" */}
        <div
          style={{
            position: 'absolute',
            left: UL.x,
            top: UL.y,
            width: UL.w * ulDraw,
            height: 1.2,
            borderRadius: 1,
            background: C.yellow,
            boxShadow: '0 0 10px rgba(231,213,152,0.75)',
            transform: 'rotate(-0.35deg)',
            transformOrigin: 'left center',
          }}
        />
      </PageCam>

      {/* kicker sits in the stage band above the card — no headline on top of the UI */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          top: 82,
          fontFamily: FONT.en,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '0.16em',
          color: C.violet,
          opacity: kick,
          transform: 'translateY(' + (1 - kick) * 8 + 'px)',
        }}
      >
        AI DIAGNOSIS · CORE JUDGMENT
      </div>
    </AbsoluteFill>
  );
};
