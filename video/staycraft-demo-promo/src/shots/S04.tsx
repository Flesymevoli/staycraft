import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';

/**
 * S04 · 68.6% radial gauge (330–450f, 4.0s)
 * workbench-09 gauge card macro at 880×747 (2x capture, displayed 1.15× CSS).
 * This is the film's only orbit: ±6° over 60f, plus a 1.04 push. The one yellow
 * use of the shot is a hand-drawn arc that traces the weekend segments of the
 * real gauge, popping once. No DOM copy on the number (count-up dropped: it cannot
 * be pixel-aligned with the captured UI, per 03 §6 and 02 §3).
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

const CARD = { x: 860, y: 152, w: 880, h: 747 };
// gauge arc in the displayed card (derived from the 2x capture: center 378,395 r≈200)
const ARC = { cx: 433, cy: 453, r: 248, from: -80, to: -36 };

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return 'M ' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2);
};

export const S04: React.FC = () => {
  const f = useCurrentFrame();

  const enter = ramp(f, 0, 13, EASE.inOut);
  const orbit = -6 + 12 * ramp(f, 10, 80, EASE.inOut);
  const push = 1 + 0.04 * ramp(f, 0, 120, EASE.inOut);

  // weekend arc: draws at f58, overshoots slightly, then settles
  const draw = ramp(f, 58, 70, EASE.inOut);
  const ringPop = interpolate(f, [58, 64, 72], [1.14, 1.0, 1.0], clamp);
  const endAngle = ARC.from + (ARC.to - ARC.from) * draw;
  const capIn = ramp(f, 68, 74, EASE.out);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden' }}>
      {/* one soft violet glow behind the card */}
      <div
        style={{
          position: 'absolute',
          left: 880,
          top: -80,
          width: 1100,
          height: 1000,
          background: 'radial-gradient(closest-side, rgba(101,84,199,0.14), rgba(101,84,199,0.04) 55%, rgba(101,84,199,0) 75%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          perspective: 2400,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: 'rotateY(' + orbit + 'deg) scale(' + push + ')',
            transformOrigin: 'center center',
            opacity: enter,
            filter: enter >= 0.999 ? undefined : 'blur(' + (1 - enter) * 8 + 'px)',
            borderRadius: 26,
            overflow: 'hidden',
            border: '1px solid ' + C.line,
            boxShadow: C.shadow,
            background: '#fff',
          }}
        >
          <Img src={staticFile('textures/cards/workbench-09.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

          {/* yellow weekend arc (the single emphasis of this shot) */}
          <svg
            width={CARD.w}
            height={CARD.h}
            viewBox={'0 0 ' + CARD.w + ' ' + CARD.h}
            style={{ position: 'absolute', inset: 0, opacity: draw > 0.01 ? 1 : 0, transform: 'scale(' + ringPop + ')', transformOrigin: ARC.cx + 'px ' + ARC.cy + 'px' }}
          >
            <path d={arcPath(ARC.cx, ARC.cy, ARC.r, ARC.from, endAngle)} fill="none" stroke={C.yellow} strokeWidth={12} strokeLinecap="round" opacity={0.18} />
            <path d={arcPath(ARC.cx, ARC.cy, ARC.r, ARC.from, endAngle)} fill="none" stroke={C.yellow} strokeWidth={5} strokeLinecap="round" />
            {capIn > 0.01 ? (
              <>
                <circle cx={polar(ARC.cx, ARC.cy, ARC.r, ARC.from).x} cy={polar(ARC.cx, ARC.cy, ARC.r, ARC.from).y} r={4.5} fill={C.yellow} opacity={capIn} />
                <circle cx={polar(ARC.cx, ARC.cy, ARC.r, ARC.to).x} cy={polar(ARC.cx, ARC.cy, ARC.r, ARC.to).y} r={4.5} fill={C.yellow} opacity={capIn} />
              </>
            ) : null}
          </svg>
        </div>
      </div>

      {/* editorial column (never over the card / UI) */}
      <div style={{ position: 'absolute', left: 100, top: 300, width: 700 }}>
        <div style={{ fontFamily: FONT.en, fontSize: 28, fontWeight: 600, letterSpacing: '0.16em', color: C.violet, opacity: ramp(f, 6, 18, EASE.out) }}>
          7-DAY BOOKED OCCUPANCY · ON TRACK
        </div>
        <div
          style={{
            marginTop: 34,
            fontFamily: FONT.en,
            fontSize: 34,
            fontWeight: 500,
            lineHeight: 1.35,
            color: C.muted,
            opacity: ramp(f, 16, 30, EASE.out),
            transform: 'translateY(' + (1 - ramp(f, 16, 30, EASE.out)) * 8 + 'px)',
          }}
        >
          4 room-nights from the 80% target.
        </div>
      </div>
    </AbsoluteFill>
  );
};
