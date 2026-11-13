import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { PageCam } from '../core/PageCam';
import { WordTitle } from '../core/ui';
import { PAGE } from '../core/layout';

/**
 * S02 · Workbench establishes (90–210f, 4.0s)
 * Real app-workbench-full on the right (page left ≈480). 0–60f holds the page
 * title + all four KPI cards (visible page start 80), the page floats up 6px and
 * settles; 60–110f the camera tilts down to the hero card (visible start 251)
 * for the T1 hand-off to S03. No per-card overlay: the KPI cards are part of the
 * captured texture, so nothing can ghost or double.
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

export const S02: React.FC = () => {
  const f = useCurrentFrame();

  // T1 in: page arrives out of focus from S01
  const focus = ramp(f, 0, 16, EASE.inOut);
  const pageBlur = 10 * (1 - focus);

  const kick = ramp(f, 8, 20, EASE.out);
  const plateIn = ramp(f, 2, 16, EASE.out);
  const topFade = ramp(f, 66, 110, EASE.inOut);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden' }}>
      <PageCam
        src={PAGE.workbench.src}
        pageH={PAGE.workbench.h}
        blur={pageBlur}
        keys={[
          // hold: visible page start 80, page floats up 6px around f30 then settles
          { frame: 0, cx: 480, cy: 620, zoom: 1.0 },
          { frame: 30, cx: 482.1, cy: 622.8, zoom: 1.006 },
          { frame: 60, cx: 484.2, cy: 613.6, zoom: 1.012 },
          // tilt down to the hero card (visible page start 251), keeping the 4th KPI inside the frame
          { frame: 110, cx: 490.2, cy: 780.4, zoom: 1.02 },
        ]}
      />

      {/* frosted editorial wash: hides the captured sidebar labels under the title, stops at x=750
          so the KPI row (page x≈281 → screen ≈761+) stays untouched */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 750,
          height: 470,
          borderBottomRightRadius: 44,
          background: 'linear-gradient(150deg, rgba(246,245,251,0.985) 0%, rgba(241,239,249,0.97) 58%, rgba(241,239,249,0.9) 100%)',
          backdropFilter: 'blur(12px)',
          opacity: plateIn,
          transform: 'translateY(' + (1 - plateIn) * -10 + 'px)',
          pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 86%, rgba(0,0,0,0) 100%)',
          maskImage: 'linear-gradient(180deg, #000 0%, #000 86%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* top lavender fade: covers the scrolled cut as the camera tilts down to the hero */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1920,
          height: 240,
          background: 'linear-gradient(180deg, #efedf8 0%, #efedf8 44%, rgba(239,237,248,0) 100%)',
          opacity: topFade,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 104,
          width: 660,
          opacity: kick,
          transform: 'translateY(' + (1 - kick) * 8 + 'px)',
        }}
      >
        <div style={{ fontFamily: FONT.en, fontSize: 26, fontWeight: 600, letterSpacing: '0.12em', color: C.violet }}>
          DECISION WORKBENCH · 2026-11-10 — 11-16
        </div>
      </div>

      <WordTitle
        lines={['One week,', 'four numbers.']}
        from={14}
        size={96}
        color={C.ink}
        style={{ position: 'absolute', left: 80, top: 156, width: 740 }}
      />
    </AbsoluteFill>
  );
};
