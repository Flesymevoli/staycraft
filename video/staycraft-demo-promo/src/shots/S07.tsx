import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { PAGE, WB } from '../core/layout';
import { Kicker, WordTitle } from '../core/ui';

/**
 * S07 · 660–780 · Handoff to Business Data (4.0s)
 * 03 §S07: pull back from the action-plan macro to the app shell, nav active pill
 * Workbench → Business Data (8f), page cross-fade workbench → analysis (12f, 6px soft-focus bridge),
 * title 'Before you act, / verify the numbers.' 96px + kicker 'BUSINESS DATA & BOOKINGS'.
 * 01 §2: product page = captured screen, cropped at doc y=96 (top bar with the 中文 button never
 * enters frame), page card radius 26 + 1px line + soft shadow. Title/kicker live in the stage above it.
 * In: matches the S06 end framing — action plan card (WB.plan 383.9×335.3 CSS) at 880×769 @ (900,160).
 *      S07 f0 clips the workbench page to exactly that card rect, then the clip + camera pull back.
 * Nav: the captured sidebar has the active pill baked in each page; during the cross-fade a violet
 * pill-shaped trace slides Workbench → Business Data on top (no UI text is covered or retyped).
 * Out: analysis page settled; S08 zooms into the KPI row.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (f: number, a: number, b: number, e: (t: number) => number = (t) => t) => e(clamp01((f - a) / Math.max(1e-6, b - a)));

/* page card framing: doc y 96 (top bar cropped) sits at screen y 400, page runs off the right edge */
const Z_END = 0.82;
const OX_END = 760;
const OY_END = 400 - 96 * Z_END; // 321.28
/* S06 end framing: WB.plan at 880×769 @ (900,160) */
const PLAN_W = 880;
const Z0 = PLAN_W / WB.plan.w;
const OX0 = 900 - WB.plan.x * Z0;
const OY0 = 160 - WB.plan.y * Z0;

const CARD_RECT = { left: 900, top: 160, w: 880, h: 769 };
const PILL = { x: 28, w: 203.5, h: 43.5 };
const PILL_Y = { workbench: 134, analysis: 184 };

const Stage: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(125% 115% at 64% 30%, #f8f9fb 0%, #f1eff8 46%, #eeecf7 72%, #eae7f5 100%)',
    }}
  />
);

/** captured app-shell screen, cropped to a (possibly animating) clip rect */
const PageScreen: React.FC<{
  src: string;
  pageW: number;
  pageH: number;
  s: number;
  ox: number;
  oy: number;
  clip: { left: number; top: number; w: number; h: number };
  radius?: number;
  opacity?: number;
  blur?: number;
}> = ({ src, pageW, pageH, s, ox, oy, clip, radius = 26, opacity = 1, blur = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: clip.left,
      top: clip.top,
      width: clip.w,
      height: clip.h,
      overflow: 'hidden',
      borderRadius: radius,
      border: '1px solid ' + C.lineStrong,
      background: C.canvas,
      boxShadow: C.shadow,
      opacity,
      filter: blur > 0.01 ? 'blur(' + blur.toFixed(2) + 'px)' : undefined,
    }}
  >
    <Img
      src={staticFile(src)}
      style={{
        position: 'absolute',
        left: ox - clip.left,
        top: oy - clip.top,
        width: pageW * s,
        height: pageH * s,
        display: 'block',
      }}
    />
  </div>
);

/** violet pill-shaped trace that reads as the active nav pill sliding between two items */
const NavTrace: React.FC<{ frame: number; s: number; ox: number; oy: number }> = ({ frame, s, ox, oy }) => {
  const slide = EASE.out(clamp01((frame - 32) / 8));
  const y = lerp(PILL_Y.workbench, PILL_Y.analysis, slide);
  const op = clamp01((frame - 29) / 3) * (1 - clamp01((frame - 40) / 6));
  if (op <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: ox + PILL.x * s,
        top: oy + y * s,
        width: PILL.w * s,
        height: PILL.h * s,
        borderRadius: 999,
        border: (2 * Math.min(1.6, Math.max(1, s))).toFixed(2) + 'px solid ' + C.violet,
        background: 'rgba(101,84,199,0.075)',
        boxShadow: '0 0 0 1px rgba(101,84,199,0.10), 0 0 22px rgba(101,84,199,0.22)',
        opacity: op,
      }}
    />
  );
};

export const S07: React.FC = () => {
  const frame = useCurrentFrame();
  const pull = EASE.inOut(clamp01((frame - 4) / 26));
  /* camera: from the plan-card macro back to the settled app-shell framing (+ slow drift) */
  const drift = EASE.out(clamp01((frame - 58) / 62));
  const s = lerp(Z0, Z_END, pull) + 0.006 * drift;
  const ox = lerp(OX0, OX_END, pull) - 7 * drift;
  const oy = lerp(OY0, OY_END, pull) + 0.5 * drift;
  /* clip: S06 card rect → settled page screen */
  const settled = { left: ox, top: oy + 96 * s, w: PAGE.workbench.w * s, h: (PAGE.workbench.h - 96) * s };
  const clip = {
    left: lerp(CARD_RECT.left, settled.left, pull),
    top: lerp(CARD_RECT.top, settled.top, pull),
    w: lerp(CARD_RECT.w, settled.w, pull),
    h: lerp(CARD_RECT.h, settled.h, pull),
  };
  const radius = lerp(24, 26, pull);
  /* page cross-fade with a 6px soft-focus bridge */
  const xf = EASE.inOut(clamp01((frame - 26) / 12));
  const bridge = Math.sin(xf * Math.PI) * 6;
  const analOp = clamp01(xf);
  const workOp = 1 - clamp01(xf);
  const titleIn = clamp01((frame - 30) / 10);
  const kickerIn = clamp01((frame - 28) / 10);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden', fontFamily: FONT.en }}>
      <Stage />
      {workOp > 0.001 && (
        <PageScreen src={PAGE.workbench.src} pageW={PAGE.workbench.w} pageH={PAGE.workbench.h} s={s} ox={ox} oy={oy} clip={clip} radius={radius} opacity={workOp} blur={bridge} />
      )}
      {analOp > 0.001 && (
        <PageScreen src={PAGE.analysis.src} pageW={PAGE.analysis.w} pageH={PAGE.analysis.h} s={s} ox={ox} oy={oy} clip={clip} radius={radius} opacity={analOp} blur={bridge} />
      )}
      <NavTrace frame={frame} s={s} ox={ox} oy={oy} />

      {/* editorial column: kicker + kinetic title */}
      <div style={{ position: 'absolute', left: 120, top: 96, opacity: kickerIn, transform: 'translateY(' + ((1 - kickerIn) * 10).toFixed(1) + 'px)' }}>
        <Kicker text='BUSINESS DATA & BOOKINGS' />
      </div>
      <WordTitle
        lines={['Before you act,', 'verify the numbers.']}
        from={33}
        size={96}
        stagger={3}
        style={{ position: 'absolute', left: 120, top: 152 }}
      />
    </AbsoluteFill>
  );
};
