import React from 'react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, R, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption, YellowMark } from '../core/ui';
import { ANALYSIS_SEAM } from './S10';

/**
 * S11 · Three takeaways (1020–1200f, 6.0s) — EN cut
 * Card: ui-entrance/doc-park-left-pill-deal · demo demos/ui-entrance/doc-park-left-pill-deal/DocParkLeftPillDeal.tsx
 * EN adaptation (02-copy-en §E2): no English report page → the document is app-analysis.png.
 * Page parks left (0.9, viewport top 0 → 126 at 0.7px/f, ~52% of frame width) and slowly scrolls
 * while three white outlined pills deal in at T0 = 47/86/126. English labels are longer than the
 * CN cut, so each pill is two lines (64px, h150, w620); evidence lines point at the analysis page's
 * daily chart / metric region (not at any Chinese report text). Yellow line f140–150, camera 1.02 f150–180.
 * Copy: pills 'Gap: 8–10 Nov' / 'Rest of the week is fairly full' / 'Decide those three nights first',
 * label 'Recommendations · demo data', caption 'Conclusion, reason, action.'
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

const PAGE = { x0: ANALYSIS_SEAM.pageX, top0: ANALYSIS_SEAM.pageTop, scrollV: 0.7 };
const PARK = { toX: -260, toScale: 0.9, dur: 30 };
/* f150–180 element-layer peak: whole-layer camera push 1.0→1.02 (transformOrigin 46% 50% = 883.2,540) */
const PUSH_END = 1.02;
const PUSH_O = { x: 883.2, y: 540 };
const END_TOP = PAGE.top0 + PAGE.scrollV * 179; // 125.3
/**
 * S11 end-frame (f179) camera in screen-equivalent values, INCLUDING the 1.02 push:
 * S12 uses it as translate(x, -scale*top) scale(scale) origin 0 0 on the 1440-wide analysis page.
 */
export const S11_EXIT = {
  x: PUSH_O.x * (1 - PUSH_END) + PUSH_END * PARK.toX,
  scale: PUSH_END * PARK.toScale,
  top: (-(PUSH_O.y * (1 - PUSH_END)) + PUSH_END * PARK.toScale * END_TOP) / (PUSH_END * PARK.toScale),
} as const;

const PX = 1080;
const PW = 620;
const PH = 150;
const PILL_T0 = [47, 86, 126];
const PILL_Y = [220, 470, 700];
const PILL_TEXT: string[][] = [['Gap: ', '8–10 Nov'], ['The rest is', 'fairly full'], ['Decide those', 'three nights first']];

/* evidence regions on app-analysis.png (page space, 1440 wide) */
const EVIDENCE = [
  { x0: 575, y0: 405, w: 220, h: 55, color: C.yellow, alpha: 0.62 },
  { x0: 540, y0: 720, w: 290, h: 100, color: C.violet, alpha: 0.12 },
  { x0: 800, y0: 860, w: 180, h: 120, color: C.violet, alpha: 0.14 },
];

const Pill: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const t0 = PILL_T0[i];
  if (frame < t0) return null;
  const o = seg(frame, t0, t0 + 6, Easing.out(Easing.quad));
  const b = seg(frame, t0, t0 + 11, Easing.out(Easing.back(1.25)));
  const y = PILL_Y[i];
  return (
    <div
      style={{
        position: 'absolute', left: PX, top: y, width: PW, height: PH,
        borderRadius: 999, background: C.paper, border: '1px solid rgba(24,24,27,0.14)',
        boxShadow: SHADOW.card, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', paddingLeft: 40, paddingRight: 34, gap: 16,
        opacity: o, transform: 'translateY(' + ((1 - b) * 14).toFixed(2) + 'px) scale(' + (0.94 + 0.06 * b).toFixed(4) + ')',
        transformOrigin: '50% 50%',
      }}
    >
      {i === 0 ? <div style={{ position: 'absolute', left: 0, top: 26, bottom: 26, width: 6, borderRadius: 3, background: C.yellow }} /> : null}
      <span style={{ fontFamily: FONT.en, fontSize: 22, fontWeight: 600, letterSpacing: '0.12em', color: C.violet, flex: '0 0 auto' }}>
        {'0' + (i + 1)}
      </span>
      <div
        style={{
          fontFamily: FONT.en, fontSize: 64, fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.02em',
          color: C.ink, display: 'flex', flexDirection: 'column', whiteSpace: 'pre',
        }}
      >
        {PILL_TEXT[i].map((t, k) => (
          <span key={k} style={{ display: 'block' }}>
            {i === 0 && k === 1 ? <YellowMark from={t0 + 6} height={0.5}>{t}</YellowMark> : t}
          </span>
        ))}
      </div>
    </div>
  );
};

export const S11: React.FC = () => {
  const frame = useCurrentFrame();
  const parkE = seg(frame, 0, PARK.dur, Easing.inOut(Easing.cubic));
  const s = 1 - (1 - PARK.toScale) * parkE;
  const tx = PAGE.x0 + (PARK.toX - PAGE.x0) * parkE;
  const top = PAGE.top0 + PAGE.scrollV * frame;
  const ty = -s * top;
  const pageT = 'translate(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
  const push = 1 + 0.02 * ramp(frame, 150, 180);
  const metaIn = ramp(frame, 36, 50);
  const yellowLine = seg(frame, 140, 150, Easing.out(Easing.cubic));

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden', fontFamily: FONT.en }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push.toFixed(5) + ')', transformOrigin: '46% 50%' }}>
        {/* analysis page: parks left and keeps slowly scrolling */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: 1440, height: PAGES.analysis.h,
            transformOrigin: '0 0', transform: pageT,
            borderRadius: R.card, overflow: 'hidden', background: C.fog,
            border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          }}
        >
          <Img src={staticFile(PAGES.analysis.src)} style={{ width: 1440, height: PAGES.analysis.h, display: 'block' }} />
        </div>

        {/* evidence highlights on the page (page space → screen space) */}
        {EVIDENCE.map((ev, i) => {
          const at = PILL_T0[i];
          const draw = seg(frame, at + 2, at + 12, Easing.out(Easing.cubic));
          const ce = i < 2 ? PILL_T0[i + 1] - 6 : 176;
          const fade = 1 - seg(frame, ce - 6, ce, Easing.out(Easing.quad));
          if (draw <= 0 || fade <= 0) return null;
          const x = tx + s * ev.x0;
          const y = ty + s * ev.y0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: x, top: y, width: s * ev.w * draw, height: s * ev.h,
                background: ev.color, opacity: ev.alpha * fade, borderRadius: 3,
                mixBlendMode: ev.color === C.yellow ? 'multiply' : 'normal',
              }}
            />
          );
        })}

        {/* evidence leaders → pills */}
        {EVIDENCE.map((ev, i) => {
          const at = PILL_T0[i];
          const draw = seg(frame, at + 4, at + 14, Easing.out(Easing.cubic));
          const ce = i < 2 ? PILL_T0[i + 1] - 6 : 176;
          const fade = 1 - seg(frame, ce - 6, ce, Easing.out(Easing.quad));
          if (draw <= 0 || fade <= 0) return null;
          const ax = tx + s * (ev.x0 + ev.w);
          const ay = ty + s * (ev.y0 + ev.h / 2);
          const bx = PX - 12;
          const by = PILL_Y[i] + PH / 2;
          const d = 'M ' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' C ' + (ax + 90).toFixed(1) + ' ' + ay.toFixed(1) + ', ' + (bx - 110).toFixed(1) + ' ' + by.toFixed(1) + ', ' + bx.toFixed(1) + ' ' + by.toFixed(1);
          return (
            <svg key={i} width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55 * fade }}>
              <path d={d} fill='none' stroke={C.violet} strokeWidth={1.5} strokeLinecap='round' pathLength={1} strokeDasharray='1 1' strokeDashoffset={(1 - draw).toFixed(4)} />
              <circle cx={ax} cy={ay} r={3.4} fill={C.violet} opacity={Math.min(1, draw * 2)} />
            </svg>
          );
        })}

        {/* right column: label + pills + yellow line */}
        <div
          style={{
            position: 'absolute', left: PX, top: 156, display: 'flex', alignItems: 'center', gap: 12,
            opacity: metaIn, fontFamily: FONT.en, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.02em',
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 6, background: C.violet, display: 'inline-block' }} />
          Recommendations · demo data
        </div>
        {[0, 1, 2].map((i) => (
          <Pill key={'p' + i} i={i} frame={frame} />
        ))}
        <div
          style={{
            position: 'absolute', left: 1060, top: 206, width: 6, height: 660, borderRadius: 3,
            background: C.yellow, transform: 'scaleY(' + yellowLine.toFixed(4) + ')', transformOrigin: 'top center',
          }}
        />
      </div>

      {/* bottom wash so the caption reads */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 240,
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 55%, #ffffff 100%)',
        }}
      />
      <Caption text='Conclusion, reason, action.' from={134} to={300} />
    </AbsoluteFill>
  );
};
