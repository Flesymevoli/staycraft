import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { AN, CONTENT } from '../core/layout';
import { Kicker } from '../core/ui';

/**
 * S08 · 780–900 · Business Data KPI row (4.0s)
 * 03 §S08: page-analysis upper part (KPI row, CSS 1114 wide) shown 1600 wide at (x 380→260, y 120);
 * kicker 'BOOKED OCCUPANCY · 11/10 → 11/16'; no headline (the four UI numbers are the text);
 * yellow ring only on 68.6% (the shot's single yellow decision highlight); the four cards get a 6f
 * violet lift on the beat (ticks 8f apart). 2x source at 1.436x stays sharp (03 §0).
 * The row is 1600 wide, so all four cards are in frame — the '68.6 → ¥533.33' pan is the 140px
 * lateral drift + micro push that walks the eye down the row (0.4 screen/s would need >2x zoom
 * and break the 2x sharpness rule; flagged in the report).
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const eOut = (t: number) => EASE.out(t);

const Z8 = 1600 / CONTENT.analysis.w; // 1.4363
const PAGE_Y = 120;
const KPI_W = AN.kpis[0].w;
const KPI_H = AN.kpis[0].h;
/** KPI cards in content-capture coords (page-analysis.png starts at page x=281, y=111) */
const KPIS = AN.kpis.map((k) => ({ x: k.x - 281, y: k.y - 111, w: k.w, h: k.h }));

const Stage: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(120% 120% at 62% 34%, #f9fafc 0%, #f2f0f9 44%, #eeecf7 74%, #eae7f5 100%)',
    }}
  />
);

export const S08: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = eOut(clamp01(frame / 12));
  const blurIn = (1 - enter) * 8;
  const pan = EASE.inOut(clamp01((frame - 14) / 64));
  const push = EASE.out(clamp01((frame - 20) / 70));
  const drift = EASE.out(clamp01((frame - 92) / 28));
  const z = Z8 + 0.018 * push;
  /* all four cards stay in frame: 1600 → 1616 wide, left edge 380 → 240 */
  const px = 380 - 140 * pan - 5 * drift;
  const scaleIn = 1.035 - 0.035 * enter;
  const kickerIn = clamp01((frame - 4) / 12);

  /* yellow ring on the 68.6% KPI card */
  const ringP = eOut(clamp01((frame - 28) / 12));
  const k0 = KPIS[0];
  const ring = {
    left: px + k0.x * z,
    top: PAGE_Y + k0.y * z,
    w: k0.w * z,
    h: k0.h * z,
  };
  /* four cards lift on the beat (6f each, 8f apart) */
  const ticks = [20, 28, 36, 44];

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden', fontFamily: FONT.en }}>
      <Stage />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'scale(' + scaleIn.toFixed(5) + ')',
          transformOrigin: '58% 46%',
          filter: blurIn > 0.01 ? 'blur(' + blurIn.toFixed(2) + 'px)' : undefined,
        }}
      >
        {/* captured analysis page (top bar already cropped by the content capture) */}
        <div
          style={{
            position: 'absolute',
            left: px,
            top: PAGE_Y,
            width: CONTENT.analysis.w * z,
            height: CONTENT.analysis.h * z,
            borderRadius: 26,
            overflow: 'hidden',
            border: '1px solid ' + C.lineStrong,
            background: C.canvas,
            boxShadow: C.shadow,
          }}
        >
          <Img
            src={staticFile(CONTENT.analysis.src)}
            style={{ width: CONTENT.analysis.w * z, height: CONTENT.analysis.h * z, display: 'block' }}
          />
        </div>

        {/* KPI cards: 6f violet lift on each tick */}
        {KPIS.map((k, i) => {
          const t = ticks[i];
          const u = clamp01((frame - t) / 10);
          const p = Math.sin(u * Math.PI);
          if (p <= 0.001) return null;
          return (
            <div
              key={'lift' + i}
              style={{
                position: 'absolute',
                left: px + k.x * z,
                top: PAGE_Y + k.y * z,
                width: k.w * z,
                height: k.h * z,
                borderRadius: 20,
                background: 'rgba(101,84,199,' + (0.055 * p).toFixed(3) + ')',
                boxShadow:
                  '0 0 0 1.5px rgba(101,84,199,' + (0.30 * p).toFixed(2) + '), 0 18px 34px -18px rgba(101,84,199,' + (0.38 * p).toFixed(2) + ')',
              }}
            />
          );
        })}

        {/* the shot's only yellow: ring on 68.6% */}
        {ringP > 0.001 && (
          <div
            style={{
              position: 'absolute',
              left: ring.left,
              top: ring.top,
              width: ring.w,
              height: ring.h,
              borderRadius: 22,
              border: '3.5px solid ' + C.yellow,
              boxShadow: '0 0 0 1px ' + C.yellow + '55, 0 0 34px ' + C.yellow + '66',
              opacity: ringP,
              transform: 'scale(' + (1.02 - 0.02 * ringP).toFixed(4) + ')',
            }}
          />
        )}
      </div>

      {/* editorial column: kicker only (no headline — the KPI values are the copy) */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 62,
          opacity: kickerIn,
          transform: 'translateY(' + ((1 - kickerIn) * 10).toFixed(1) + 'px)',
        }}
      >
        <Kicker text='BOOKED OCCUPANCY · 11/10 → 11/16' />
      </div>
    </AbsoluteFill>
  );
};
