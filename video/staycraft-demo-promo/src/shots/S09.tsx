import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { Kicker, WordTitle } from '../core/ui';

/**
 * S09 · 900–1020 · Daily booked occupancy line (4.0s)
 * 03 §S09: analysis-04 trend card (CSS 711×415) macro; title 'One night full. / One night opens.' 96px;
 * kicker 'DAILY BOOKED OCCUPANCY · 11/10 → 11/16'; the baked line is revealed left→right 18f by a
 * card-coloured cover (the real chart is never redrawn); yellow rings pop on 11/14 Sat 100% and
 * 11/15 Sun 80% (the shot's single yellow use — both are weekend decision points); card holds with
 * the 15 / 9 / 11 rows still visible until the end.
 * Card pushed 1.0 → 1.035 + a few px down-right; the editorial column stays static above-left.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const eOut = (t: number) => EASE.out(t);

const CARD = { x: 580, y: 365, w: 710.13, h: 413.64 };
const Z = 1.7;
/** chart plot area and the two weekend dots, measured in card CSS px (2x capture /2) */
const PLOT = { x: 25, y: 88.4, w: 660.1, h: 206.3 };
const DOTS = [
  { x: 457.6, y: 117.3, r: 30 }, // 11/14 Sat · 100%
  { x: 550.7, y: 145.1, r: 26 }, // 11/15 Sun · 80%
];

const Stage: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(125% 120% at 62% 30%, #f9fafc 0%, #f2f0f9 44%, #eeecf7 76%, #eae7f5 100%)',
    }}
  />
);

export const S09: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = eOut(clamp01(frame / 12));
  const push = eOut(clamp01((frame - 14) / 100));
  const blurIn = (1 - enter) * 8;
  const enterScale = 1.03 - 0.03 * enter;
  const sc = 1 + 0.035 * push;
  /* card-local screen px (the ring lives inside the captured card) */
  const dotScreen = DOTS.map((d) => ({ x: d.x * Z, y: d.y * Z, r: d.r }));
  const ring = (i: number, from: number) => {
    const u = clamp01((frame - from) / 10);
    const p = eOut(u);
    const d = dotScreen[i];
    return { d, p, u };
  };
  const r1 = ring(0, 30);
  const r2 = ring(1, 44);
  /* line reveal: cover retracts left→right */
  const reveal = EASE.inOut(clamp01((frame - 12) / 18));

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden', fontFamily: FONT.en }}>
      <Stage />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'scale(' + enterScale.toFixed(5) + ')',
          transformOrigin: '58% 46%',
          filter: blurIn > 0.01 ? 'blur(' + blurIn.toFixed(2) + 'px)' : undefined,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transform:
              'translate(' + (-10 * push).toFixed(2) + 'px,' + (8 * push).toFixed(2) + 'px) scale(' + sc.toFixed(5) + ')',
            transformOrigin: '55% 45%',
          }}
        >
          {/* captured trend card as a physical screen */}
          <div
            style={{
              position: 'absolute',
              left: CARD.x,
              top: CARD.y,
              width: CARD.w * Z,
              height: CARD.h * Z,
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid ' + C.lineStrong,
              background: C.card,
              boxShadow: C.shadow,
            }}
          >
            <Img
              src={staticFile('textures/cards/analysis-04.png')}
              style={{ width: CARD.w * Z, height: CARD.h * Z, display: 'block' }}
            />
            {/* the shot's only yellow: ring the two weekend peaks (real chart points, not redrawn) */}
            {[r1, r2].map((r, i) => (
              <React.Fragment key={i}>
                <div
                  style={{
                    position: 'absolute',
                    left: r.d.x - r.d.r,
                    top: r.d.y - r.d.r,
                    width: r.d.r * 2,
                    height: r.d.r * 2,
                    borderRadius: '50%',
                    border: '3px solid ' + C.yellow,
                    boxShadow: '0 0 0 1px ' + C.yellow + '55, 0 0 30px ' + C.yellow + '77',
                    opacity: clamp01(r.u * 1.6),
                    transform: 'scale(' + (0.72 + 0.28 * r.p).toFixed(4) + ')',
                  }}
                />
              </React.Fragment>
            ))}
          </div>

          {/* line reveal: card-coloured cover over the plot, retracting left→right */}
          {reveal < 0.999 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: CARD.x + PLOT.x * Z,
                  top: CARD.y + PLOT.y * Z,
                  width: PLOT.w * Z,
                  height: PLOT.h * Z,
                  background: C.card,
                  clipPath: 'inset(0 0 0 ' + (reveal * 100).toFixed(2) + '%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: CARD.x + (PLOT.x + PLOT.w * reveal) * Z - 16,
                  top: CARD.y + PLOT.y * Z,
                  width: 32,
                  height: PLOT.h * Z,
                  background:
                    'linear-gradient(90deg, rgba(120,102,214,0) 0%, rgba(120,102,214,0.10) 55%, rgba(120,102,214,0) 100%)',
                  opacity: reveal > 0.01 && reveal < 0.995 ? 1 : 0,
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* editorial column */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 72,
          opacity: clamp01((frame - 6) / 10),
          transform: 'translateY(' + ((1 - clamp01((frame - 6) / 10)) * 10).toFixed(1) + 'px)',
        }}
      >
        <Kicker text='DAILY BOOKED OCCUPANCY · 11/10 → 11/16' />
      </div>
      <WordTitle
        lines={['One night full.', 'One night opens.']}
        from={10}
        size={96}
        stagger={3}
        style={{ position: 'absolute', left: 120, top: 110 }}
      />
    </AbsoluteFill>
  );
};
