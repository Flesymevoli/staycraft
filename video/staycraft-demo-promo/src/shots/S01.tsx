import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { WordTitle } from '../core/ui';

/**
 * S01 · Brand hook — "The week, in one view." (0–90f, 3.0s)
 * Soft lavender stage; the real HD logo lockup + blurred 7-day gauge card as bokeh.
 * The gauge breathes ±1% and sharpens 14→6px before the whole frame defocuses into
 * S02's focus rack. No yellow graphic is added — this shot owns no decision point.
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

export const S01: React.FC = () => {
  const f = useCurrentFrame();

  // global camera push 1.0 → 1.04
  const push = 1 + 0.04 * ramp(f, 0, 90, EASE.inOut);

  // gauge bokeh: sharpens 14 → 6 until f70, then hands focus to S02
  const sharpen = ramp(f, 0, 70, EASE.inOut);
  const handoff = ramp(f, 70, 90, EASE.inOut);
  const gaugeBlur = 14 - 8 * sharpen + 16 * handoff;
  const breathe = 1 + 0.01 * Math.sin((Math.PI * 2 * f) / 90);
  const gaugeScale = 1.16 * breathe * (1 - 0.015 * handoff);
  const gaugeIn = ramp(f, 0, 18, EASE.out);

  // left editorial column
  const logoIn = ramp(f, 0, 24, EASE.out);
  const kickIn = ramp(f, 6, 18, EASE.out);
  const smallIn = ramp(f, 22, 34, EASE.out);
  const out = handoff;
  const leftOpacity = 1 - 0.4 * out;
  const leftBlur = out * 1.2;
  const leftY = -14 * out;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(1250px 950px at 76% 42%, #f8f6fd 0%, #efedf8 46%, #f2f3f5 100%)',
        overflow: 'hidden',
        fontFamily: FONT.en,
      }}
    >
      {/* soft violet glow behind the gauge (single light point, clipped by frame) */}
      <div
        style={{
          position: 'absolute',
          left: 820,
          top: -120,
          width: 1200,
          height: 1000,
          background: 'radial-gradient(closest-side, rgba(101,84,199,0.16), rgba(101,84,199,0.05) 55%, rgba(101,84,199,0) 75%)',
          opacity: gaugeIn,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push + ')', transformOrigin: '960px 540px' }}>
        {/* focus pull: gauge card bokeh, right 70% of frame */}
        <div
          style={{
            position: 'absolute',
            left: 780,
            top: 40,
            width: 1120,
            transform: 'scale(' + gaugeScale + ')',
            transformOrigin: 'center center',
            opacity: gaugeIn * (1 - 0.45 * handoff),
            filter: 'blur(' + gaugeBlur + 'px) saturate(0.92)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 84% at 54% 50%, #000 42%, rgba(0,0,0,0) 82%)',
            maskImage: 'radial-gradient(ellipse 80% 84% at 54% 50%, #000 42%, rgba(0,0,0,0) 82%)',
          }}
        >
          <Img src={staticFile('textures/cards/workbench-09.png')} style={{ width: '100%', display: 'block' }} />
        </div>

        {/* left editorial column */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 210,
            width: 760,
            opacity: leftOpacity,
            filter: leftBlur > 0.05 ? 'blur(' + leftBlur + 'px)' : undefined,
            transform: 'translateY(' + leftY + 'px)',
          }}
        >
          <div
            style={{
              opacity: logoIn,
              transform: 'scale(' + (0.98 + 0.02 * logoIn) + ')',
              transformOrigin: 'left center',
              filter: logoIn >= 0.999 ? undefined : 'blur(' + (1 - logoIn) * 6 + 'px)',
            }}
          >
            <Img src={staticFile('brand/StayCraft-main-HD.png')} style={{ width: 620, display: 'block' }} />
          </div>

          <div
            style={{
              marginTop: 40,
              fontFamily: FONT.en,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '0.16em',
              color: C.violet,
              opacity: kickIn,
              transform: 'translateY(' + (1 - kickIn) * 8 + 'px)',
            }}
          >
            STAYCRAFT · DECISION WORKBENCH
          </div>

          <WordTitle
            lines={['The week,', 'in one view.']}
            from={12}
            size={112}
            color={C.ink}
            style={{ marginTop: 42 }}
          />

          <div
            style={{
              marginTop: 52,
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: C.muted,
              opacity: smallIn,
              transform: 'translateY(' + (1 - smallIn) * 8 + 'px)',
            }}
          >
            Concept demo · fictional data
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
