import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { PAGE } from '../core/layout';
import { Kicker, WordTitle } from '../core/ui';
import { S10_EXIT } from './S10';

/**
 * S11 · 1080–1200 · Handoff to Market Quotes (4.0s)
 * 03 §S11: pull back from the S10 table macro to the app shell; nav active pill Business Data →
 * Market Quotes (8f); page cross-fades analysis → explore (12f, 6px soft-focus bridge); right side
 * app-explore-full (top bar cropped at doc y=96); title 'Four nearby stays, / same date.' 96px +
 * kicker 'NEARBY MARKET RESEARCH · CHECK-IN 2026/11/14'.
 * f0 is exactly the S10 end framing (S10_EXIT), so the card becomes the page at the same screen rect.
 * Nav trace: violet pill-shaped outline slides between the two baked active pills during the
 * cross-fade (no UI text is covered or retyped).
 * S11_EXIT is exported for S12: screen = (ox + docX*s, oy + docY*s) on app-explore-full.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Z_END = 0.76;
const OX_END = 1920 - PAGE.explore.w * Z_END; // 825.6
const OY_END = 400 - 96 * Z_END; // 327.04
const DRIFT_S = Z_END + 0.005;
const DRIFT_OX = OX_END - 7;
const DRIFT_OY = OY_END;
const CROP_TOP = 96;
const CONTAINER_DOC_H = PAGE.explore.h - CROP_TOP;

/** S11 end framing for S12 (motion-c): map app-explore-full doc px → screen px */
export const S11_EXIT = {
  pageW: PAGE.explore.w,
  pageH: PAGE.explore.h,
  s: DRIFT_S,
  ox: DRIFT_OX,
  oy: DRIFT_OY,
  cropTop: CROP_TOP,
  clip: {
    left: DRIFT_OX,
    top: DRIFT_OY + CROP_TOP * DRIFT_S,
    w: PAGE.explore.w * DRIFT_S,
    h: CONTAINER_DOC_H * DRIFT_S,
  },
} as const;

const PILL = { x: 28, w: 203.5, h: 43.5 };
const PILL_Y = { analysis: 184, explore: 234 };

const Stage: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(125% 115% at 64% 30%, #f8f9fb 0%, #f1eff8 46%, #eeecf7 72%, #eae7f5 100%)',
    }}
  />
);

const PageScreen: React.FC<{
  src: string;
  pageW: number;
  pageH: number;
  s: number;
  ox: number;
  oy: number;
  clip: { left: number; top: number; w: number; h: number };
  opacity?: number;
  blur?: number;
}> = ({ src, pageW, pageH, s, ox, oy, clip, opacity = 1, blur = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: clip.left,
      top: clip.top,
      width: clip.w,
      height: clip.h,
      overflow: 'hidden',
      borderRadius: 26,
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

const NavTrace: React.FC<{ frame: number; s: number; ox: number; oy: number }> = ({ frame, s, ox, oy }) => {
  const slide = EASE.out(clamp01((frame - 30) / 8));
  const y = lerp(PILL_Y.analysis, PILL_Y.explore, slide);
  const op = clamp01((frame - 27) / 3) * (1 - clamp01((frame - 40) / 6));
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

export const S11: React.FC = () => {
  const frame = useCurrentFrame();
  const pull = EASE.inOut(clamp01((frame - 2) / 28));
  const drift = EASE.out(clamp01((frame - 58) / 50));
  /* page-space mapping: at f0 it is exactly S10's end (same rect/scale) */
  const s = lerp(lerp(S10_EXIT.s, Z_END, pull), DRIFT_S, drift);
  const ox = lerp(lerp(S10_EXIT.ox, OX_END, pull), DRIFT_OX, drift);
  const oy = lerp(lerp(S10_EXIT.oy, OY_END, pull), DRIFT_OY, drift);
  const cardW = 384 * S10_EXIT.s;
  const cardH = 462 * S10_EXIT.s;
  const settled = { left: ox, top: oy + CROP_TOP * s, w: PAGE.explore.w * s, h: CONTAINER_DOC_H * s };
  const clip = {
    left: lerp(S10_EXIT.screenX, settled.left, pull),
    top: lerp(S10_EXIT.screenTop, settled.top, pull),
    w: lerp(cardW, settled.w, pull),
    h: lerp(cardH, settled.h, pull),
  };
  const xf = EASE.inOut(clamp01((frame - 22) / 12));
  const bridge = Math.sin(xf * Math.PI) * 6;
  const exploreOp = clamp01(xf);
  const analysisOp = 1 - clamp01(xf);
  const titleIn = clamp01((frame - 26) / 10);
  const kickerIn = clamp01((frame - 24) / 10);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden', fontFamily: FONT.en }}>
      <Stage />
      {analysisOp > 0.001 && (
        <PageScreen src={PAGE.analysis.src} pageW={PAGE.analysis.w} pageH={PAGE.analysis.h} s={s} ox={ox} oy={oy} clip={clip} opacity={analysisOp} blur={bridge} />
      )}
      {exploreOp > 0.001 && (
        <PageScreen src={PAGE.explore.src} pageW={PAGE.explore.w} pageH={PAGE.explore.h} s={s} ox={ox} oy={oy} clip={clip} opacity={exploreOp} blur={bridge} />
      )}
      <NavTrace frame={frame} s={s} ox={ox} oy={oy} />

      <div style={{ position: 'absolute', left: 120, top: 96, opacity: kickerIn, transform: 'translateY(' + ((1 - kickerIn) * 10).toFixed(1) + 'px)' }}>
        <Kicker text='NEARBY MARKET RESEARCH · CHECK-IN 2026/11/14' />
      </div>
      <WordTitle
        lines={['Four nearby stays,', 'same date.']}
        from={29}
        size={96}
        stagger={3}
        style={{ position: 'absolute', left: 120, top: 152 }}
      />
    </AbsoluteFill>
  );
};
