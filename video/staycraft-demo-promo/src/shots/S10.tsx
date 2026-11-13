import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { AN } from '../core/layout';
import { Kicker } from '../core/ui';

/**
 * S10 · 1020–1080 · Daily figures breakdown (2.0s)
 * 03 §S10: analysis-05 table card (CSS 384×462) shown 820 wide at (x=930, y 40 → -60); left column
 * kicker 'DAILY FIGURES BREAKDOWN' + small '15 weekday nights · 9 weekend nights · 11 open.' 34px;
 * no headline; the camera tilts down from the table head to the 11-14 Sat / 11-15 Sun rows (5/0, 4/1);
 * those two rows get one extremely light yellow wash (matches the real UI highlight) — the shot's
 * single yellow use. Rows are never redrawn.
 * End state is exported as S10_EXIT so S11 starts on exactly this framing (T2 pull-back to the shell).
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const CARD_CSS = { w: 384, h: 462 };
const CARD_W = 820;
const Z = CARD_W / CARD_CSS.w; // 2.1354
const X0 = 930;
const Y0 = 40;
const Y1 = -60;
const PUSH = 1.04;

/** S10 end framing, page-space mapping: screen = ox + doc*s, oy + doc*s */
export const S10_EXIT = (() => {
  const s = Z * PUSH;
  const screenX = X0 - (CARD_W * (PUSH - 1)) / 2;
  return { s, screenX, screenTop: Y1, ox: screenX - AN.table.x * s, oy: Y1 - AN.table.y * s };
})();

/* table rows in card CSS px (page doc - card origin) */
const ROW = { x: 6, w: 372, h: 43.8 };
const ROWS = {
  sat: 684.6 - AN.table.y,
  sun: 728.4 - AN.table.y,
};

const Stage: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(120% 115% at 60% 32%, #f9fafc 0%, #f2f0f9 44%, #eeecf7 76%, #eae7f5 100%)',
    }}
  />
);

export const S10: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = EASE.out(clamp01(frame / 10));
  const blurIn = (1 - enter) * 8;
  const enterScale = 1.03 - 0.03 * enter;
  const pan = EASE.inOut(clamp01((frame - 8) / 32));
  const push = EASE.out(clamp01((frame - 10) / 32));
  const p = 1 + (PUSH - 1) * push;
  const w = CARD_W * p;
  const h = CARD_CSS.h * Z * p;
  const top = lerp(Y0, Y1, pan);
  const left = X0 - (CARD_W * (p - 1)) / 2;
  const s = Z * p;
  const wash = EASE.out(clamp01((frame - 24) / 14));
  const kickerIn = clamp01((frame - 8) / 12);
  const smallIn = clamp01((frame - 14) / 12);

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden', fontFamily: FONT.en }}>
      <Stage />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'scale(' + enterScale.toFixed(5) + ')',
          transformOrigin: '62% 42%',
          filter: blurIn > 0.01 ? 'blur(' + blurIn.toFixed(2) + 'px)' : undefined,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width: w,
            height: h,
            borderRadius: 26,
            overflow: 'hidden',
            border: '1px solid ' + C.lineStrong,
            background: C.card,
            boxShadow: C.shadow,
          }}
        >
          <Img
            src={staticFile('textures/cards/analysis-05.png')}
            style={{ width: w, height: h, display: 'block' }}
          />
          {/* single pale-yellow wash on the Sat / Sun rows (real UI highlight reinforced once) */}
          {[ROWS.sat, ROWS.sun].map((ry, i) => (
            <div
              key={'wash' + i}
              style={{
                position: 'absolute',
                left: ROW.x * s,
                top: ry * s,
                width: ROW.w * s,
                height: ROW.h * s,
                background: 'rgba(231,213,152,' + (0.24 * wash).toFixed(3) + ')',
                boxShadow: 'inset 0 0 0 1px rgba(231,213,152,' + (0.35 * wash).toFixed(3) + ')',
              }}
            />
          ))}
        </div>
      </div>

      {/* left editorial column */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 230,
          opacity: kickerIn,
          transform: 'translateY(' + ((1 - kickerIn) * 10).toFixed(1) + 'px)',
        }}
      >
        <Kicker text='DAILY FIGURES BREAKDOWN' />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 288,
          opacity: smallIn,
          transform: 'translateY(' + ((1 - smallIn) * 10).toFixed(1) + 'px)',
          fontFamily: FONT.en,
          fontSize: 34,
          fontWeight: 500,
          lineHeight: 1.3,
          letterSpacing: '0.01em',
          color: C.muted,
          whiteSpace: 'nowrap',
        }}
      >
        15 weekday nights · 9 weekend nights · 11 open.
      </div>
    </AbsoluteFill>
  );
};
