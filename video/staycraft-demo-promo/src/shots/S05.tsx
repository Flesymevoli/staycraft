import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { WordTitle } from '../core/ui';

/**
 * S05 · Evidence sources (450–555f, 3.5s)
 * hi/workbench-signals 3x crop displayed at 1250×552. EN headline sits in the
 * top stage band (never on the UI), card drifts slowly as if the camera is
 * panning from the OTA row toward the PMS row. Element events: violet ruled
 * underlines on the two verified values (¥488/night, 92.5% — evidence is violet,
 * not yellow) and a soft-focus blur on the EVT row so the three rows do not
 * compete. No yellow is used in this shot.
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

const CARD = { x: 560, y: 350, w: 1250, h: 552 };
const SCALE = CARD.w / 711; // card CSS → display

export const S05: React.FC = () => {
  const f = useCurrentFrame();

  const enter = ramp(f, 0, 14, EASE.inOut);
  // slow camera drift: card rises ~24px and eases right while the OTA→PMS pan happens
  const drift = ramp(f, 0, 105, EASE.inOut);
  const x = CARD.x + 26 * drift;
  const y = CARD.y - 24 * drift;
  const push = 1 + 0.03 * drift;

  const ul1 = ramp(f, 24, 34, EASE.inOut);
  const ul2 = ramp(f, 38, 48, EASE.inOut);
  const evt = ramp(f, 12, 26, EASE.inOut);

  const kick = ramp(f, 4, 16, EASE.out);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden' }}>
      {/* headline in the top stage band; bottom 140px stays empty */}
      <div style={{ position: 'absolute', left: 100, top: 56, opacity: kick }}>
        <div style={{ fontFamily: FONT.en, fontSize: 28, fontWeight: 600, letterSpacing: '0.16em', color: C.violet }}>
          DETECTOR SIGNALS &amp; EVIDENCE · CONFIDENCE HIGH
        </div>
      </div>
      <WordTitle
        lines={['Every recommendation', 'has a source.']}
        from={8}
        size={96}
        color={C.ink}
        style={{ position: 'absolute', left: 100, top: 104 }}
      />

      {/* card */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: CARD.w,
          height: CARD.h,
          transform: 'scale(' + push + ')',
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
        <Img src={staticFile('textures/hi/workbench-signals.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

        {/* EVT row soft focus: duplicate of the same texture, blurred bottom band */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 413,
            width: CARD.w,
            height: CARD.h - 413,
            overflow: 'hidden',
            opacity: evt,
            filter: 'blur(4px) saturate(0.92)',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 26%, rgba(0,0,0,1) 52%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 26%, rgba(0,0,0,1) 52%)',
          }}
        >
          <Img
            src={staticFile('textures/hi/workbench-signals.png')}
            style={{ position: 'absolute', left: 0, top: -413, width: CARD.w, height: CARD.h, display: 'block' }}
          />
        </div>

        {/* violet evidence underlines on the two verified values */}
        <div
          style={{
            position: 'absolute',
            left: 540 * SCALE,
            top: 125 * SCALE,
            width: 81 * SCALE * ul1,
            height: 2,
            background: C.violet,
            borderRadius: 1,
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 575 * SCALE,
            top: 205 * SCALE,
            width: 40 * SCALE * ul2,
            height: 2,
            background: C.violet,
            borderRadius: 1,
            opacity: 0.9,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
