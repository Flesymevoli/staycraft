import React from 'react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, R, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption } from '../core/ui';

/**
 * S10 · Diagnosis headline (960–1020f, 2.0s) — EN cut
 * Card: typography/marker-underline-title · demo demos/typography/marker-underline-title/MarkerUnderlineTitle.tsx
 * EN adaptation (02-copy-en §E2): there is no English report page, so the page is app-analysis.png
 * and the real English AI diagnosis summary is the DOM hero quote:
 *   '19 of 35 room nights sold.' / 'The gap sits on 8–10 November.'
 * Small print 'AI diagnosis · demo data' (truthful — not a report title). Yellow marker under the gap dates.
 * Caption 'Answer, then evidence.'. Hold f30–60.
 * S10→S11 same page: ANALYSIS_SEAM is read by S11 (page viewport top 0 on app-analysis.png).
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

/** analysis page state at the S10 end / S11 start (page-space 1440 wide, 1:1) */
export const ANALYSIS_SEAM = { pageX: 240, pageTop: 0 } as const;
const PAGE_TOP = ANALYSIS_SEAM.pageTop;

const Line: React.FC<{ from: number; delay: number; children: React.ReactNode }> = ({ from, delay, children }) => {
  const p = ramp(from, delay, delay + 14);
  return (
    <div
      style={{
        opacity: p,
        filter: 'blur(' + ((1 - p) * 6).toFixed(2) + 'px)',
        transform: 'translateY(' + ((1 - p) * 14).toFixed(1) + 'px) scale(' + (1 + (1 - p) * 0.025).toFixed(4) + ')',
        transformOrigin: 'left center',
      }}
    >
      {children}
    </div>
  );
};

/* marker underline: varying-width stroke + dry-brush edge (deterministic seed), drawn in 10f */
const Marker: React.FC<{ progress: number }> = ({ progress }) => {
  const p = clamp01(progress);
  return (
    <svg
      width='100%' height='0.30em' viewBox='0 0 100 20' preserveAspectRatio='none'
      style={{ position: 'absolute', left: '-0.04em', right: '-0.04em', bottom: '-0.16em', overflow: 'visible', mixBlendMode: 'multiply' }}
    >
      <defs>
        <clipPath id='s10en-marker-clip'>
          <rect x={0} y={-4} width={Math.max(0.01, p * 102)} height={28} />
        </clipPath>
        <filter id='s10en-marker-dry' x='-5%' y='-40%' width='110%' height='180%' colorInterpolationFilters='sRGB'>
          <feTurbulence type='fractalNoise' baseFrequency='0.06 0.6' numOctaves={2} seed={7} result='warp' />
          <feDisplacementMap in='SourceGraphic' in2='warp' scale={1.6} xChannelSelector='R' yChannelSelector='G' />
        </filter>
      </defs>
      <g clipPath='url(#s10en-marker-clip)'>
        <path
          d='M2 16.2 C 20 15.1, 44 13.2, 66 10.6 C 80 9.1, 92 7.4, 98 6.6'
          fill='none' stroke={C.yellow} strokeWidth={8} strokeLinecap='round' vectorEffect='non-scaling-stroke' filter='url(#s10en-marker-dry)'
        />
        <path
          d='M3 18.4 C 24 17.4, 47 15.6, 69 13.1 C 83 11.5, 93 10.1, 98 9.4'
          fill='none' stroke={C.yellow} strokeWidth={3.4} strokeLinecap='round' vectorEffect='non-scaling-stroke' opacity={0.75}
        />
      </g>
    </svg>
  );
};

export const S10: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = ramp(frame, 0, 10);
  const card = ramp(frame, 8, 20);
  const underline = seg(frame, 20, 30, Easing.out(Easing.cubic));
  const labelIn = ramp(frame, 20, 30);
  const pageX = ANALYSIS_SEAM.pageX + (1 - slide) * 1680;

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden', fontFamily: FONT.en }}>
      {/* analysis page sheet, 1:1 → 1.0, slides in from the right */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: 1440, height: 1080,
          transform: 'translateX(' + pageX.toFixed(2) + 'px)',
          borderRadius: R.card, overflow: 'hidden', background: C.fog,
          border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
        }}
      >
        <Img
          src={staticFile(PAGES.analysis.src)}
          style={{ position: 'absolute', left: 0, top: -PAGE_TOP, width: 1440, height: PAGES.analysis.h, display: 'block' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.32)' }} />
      </div>

      {/* hero quote card: the real English AI diagnosis summary (DOM, 96px, two lines) */}
      <div
        style={{
          position: 'absolute', left: 240, top: 150, width: 1440, minHeight: 400,
          background: C.paper, border: '1px solid ' + C.line, borderRadius: R.card, boxShadow: SHADOW.sheet,
          padding: '44px 44px 40px', boxSizing: 'border-box',
          opacity: card,
          transform: 'translateY(' + ((1 - card) * 18).toFixed(1) + 'px) scale(' + (1 + (1 - card) * 0.03).toFixed(4) + ')',
          transformOrigin: '50% 40%',
        }}
      >
        <div style={{ fontFamily: FONT.en, fontSize: 84, fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.025em', color: C.ink, whiteSpace: 'nowrap' }}>
          <Line from={frame} delay={8}>19 of 35 room nights sold.</Line>
          <Line from={frame} delay={12}>
            <span>The gap sits on </span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              8–10 November
              <Marker progress={underline} />
            </span>
            <span>.</span>
          </Line>
        </div>
        <div
          style={{
            marginTop: 24, display: 'flex', alignItems: 'center', gap: 14,
            fontFamily: FONT.en, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.02em',
            opacity: labelIn,
          }}
        >
          <span style={{ width: 26, height: 2, background: C.violet, display: 'inline-block' }} />
          AI diagnosis · demo data
        </div>
      </div>

      {/* bottom wash so the caption reads over the page */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 300,
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.94) 44%, #ffffff 74%)',
        }}
      />
      <Caption text='Answer, then evidence.' from={18} to={300} />
    </AbsoluteFill>
  );
};
