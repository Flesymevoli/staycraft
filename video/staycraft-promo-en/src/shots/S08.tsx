import React from 'react';
import { AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption } from '../core/ui';

/**
 * S08 · Market scan (750–870f, 4.0s) — EN cut
 * Card: effects/scanline-annotate-focus · demo demos/effects/scanline-annotate-focus/ScanlineAnnotateFocus.tsx
 * EN adaptation: the market page (1440×1580 CSS, 2x texture) is cropped to its content column
 * (x 258–1398, y 170–1530) and shown at 0.78 — sharper than the CN 1x cut (2x source, still < 1.5).
 * That crop leaves the page's blank bands free for the four EN labels (long English strings).
 * Scan f4–64 strictly uniform; four L-brackets fire off each bbox's bottom edge (min gap 4f);
 * labels type out; status row counts SIGNALS 00/04→04/04; hold f52–120.
 * Copy: 02-copy-en §B S08 — headline 'Same night. / Nearby: ¥150–¥639',
 * caption 'Five hotels. Five valid quotes.', label 'Supplier starting-price range · 5 distinct hotels',
 * source 'Check-in 11-06 · Retrieved 5 Nov, 20:16 · RollingGo'. Hotel names/addresses are blurred in the texture.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

/* sheet = cropped EN market page content column, scaled 0.78 */
const SHEET = { x: 970, y: 10, s: 0.78, cropX: 258, cropY: 170 };
const PAGE = { w: 1440, h: 1530 };
const CROP = { w: 1140, h: 1360 };
const WO = { w: CROP.w * SHEET.s, h: CROP.h * SHEET.s };
const sx = (px: number) => SHEET.x + (px - SHEET.cropX) * SHEET.s;
const sy = (py: number) => SHEET.y + (py - SHEET.cropY) * SHEET.s;

const SCAN0 = 4;
const SCAN1 = 64;
const scanY = (f: number) => SHEET.y + (WO.h - 6) * clamp01((f - SCAN0) / (SCAN1 - SCAN0));
const frameAtScanY = (y: number) => SCAN0 + ((y - SHEET.y) / (WO.h - 6)) * (SCAN1 - SCAN0);

type Box = { x: number; y: number; w: number; h: number };
type Target = { key: string; box: Box; lines: string[]; tag: { x: number; y: number; w: number }; ft: number };
const TARGETS: Target[] = (() => {
  const list: Target[] = [
    { key: 'range', box: { x: sx(278), y: sy(338), w: 620 * SHEET.s, h: 152 * SHEET.s }, lines: ['Supplier starting price', '¥150–¥639'], tag: { x: 1002, y: 266, w: 385 }, ft: 0 },
    { key: 'hotels', box: { x: sx(990), y: sy(412), w: 280 * SHEET.s, h: 62 * SHEET.s }, lines: ['Hotels returned 5'], tag: { x: 1541, y: 266, w: 308 }, ft: 0 },
    { key: 'quotes', box: { x: sx(990), y: sy(470), w: 280 * SHEET.s, h: 34 * SHEET.s }, lines: ['5 valid quotes'], tag: { x: 1541, y: 322, w: 250 }, ft: 0 },
    { key: 'mine', box: { x: sx(278), y: sy(600), w: 1100 * SHEET.s, h: 178 * SHEET.s }, lines: ['Your price position ¥520–¥760'], tag: { x: 1320, y: 488, w: 516 }, ft: 0 },
  ];
  let prev = -99;
  for (const t of [...list].sort((a, b) => a.box.y + a.box.h - (b.box.y + b.box.h))) {
    t.ft = Math.max(Math.round(frameAtScanY(t.box.y + t.box.h)), prev + 4);
    prev = t.ft;
  }
  return list;
})();
const LAST_FIRE = Math.max(...TARGETS.map((t) => t.ft));

/* rough width estimate for the typing animation (full width is fixed per tag) */
const chW = (ch: string) => {
  if (ch === '¥') return 30;
  if (ch >= 'A' && ch <= 'Z') return 23;
  if (ch >= '0' && ch <= '9') return 19;
  if (ch === ' ') return 11;
  if (ch === '.' || ch === ',' || ch === '–' || ch === '·') return 13;
  return 18;
};
const estW = (s: string) => Array.from(s).reduce((a, ch) => a + chW(ch), 0);

const Bracket: React.FC<{ box: Box; ft: number; frame: number }> = ({ box, ft, frame }) => {
  const f = frame - ft;
  if (f < 0) return null;
  const s = spring({ frame: f, fps: 30, config: { damping: 15, stiffness: 210 }, durationInFrames: 30 });
  const pad = 36 * (1 - s);
  const arm = 22 - 6 * ramp(frame, ft + 3, ft + 15);
  const op = Math.min(1, f / 3);
  const flash = ramp(frame, ft + 3, ft + 9) * (1 - ramp(frame, ft + 9, ft + 21));
  const x = box.x - pad;
  const y = box.y - pad;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  const d = [
    'M' + x + ' ' + (y + arm) + 'V' + y + 'H' + (x + arm),
    'M' + (x + w - arm) + ' ' + y + 'H' + (x + w) + 'V' + (y + arm),
    'M' + (x + w) + ' ' + (y + h - arm) + 'V' + (y + h) + 'H' + (x + w - arm),
    'M' + (x + arm) + ' ' + (y + h) + 'H' + x + 'V' + (y + h - arm),
  ].join('');
  return (
    <>
      <div
        style={{
          position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: 5,
          background: 'rgba(101,84,232,' + (0.075 * flash).toFixed(3) + ')',
          boxShadow: 'inset 0 0 0 2px rgba(101,84,232,' + (0.4 * flash).toFixed(3) + ')',
        }}
      />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: op, pointerEvents: 'none' }}>
        <path d={d} fill='none' stroke={C.violet} strokeWidth={3.2} strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    </>
  );
};

const Tag: React.FC<{ lines: string[]; x: number; y: number; w: number; ft: number; frame: number }> = ({ lines, x, y, w, ft, frame }) => {
  const s0 = ft + 5;
  if (frame < s0) return null;
  const rise = ramp(frame, s0, s0 + 12);
  const pop = ramp(frame, s0, s0 + 4);
  const flat = lines.join('');
  const typed = Math.floor(Math.min(flat.length, (frame - s0) * 2.2 + 1));
  const typing = typed < flat.length;
  let used = 0;
  const shown = lines.map((l) => {
    const n = Math.max(0, Math.min(l.length, typed - used));
    used += l.length;
    return l.slice(0, n);
  });
  const fullW = w;
  const nowW = Math.max(estW(shown[0] || ''), ...shown.slice(1).map(estW)) + 34 + (typing ? 12 : 0);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: Math.min(fullW, Math.max(70, nowW)), minHeight: 50,
        borderRadius: 8, background: C.violet, overflow: 'hidden',
        boxShadow: '0 10px 22px -12px rgba(38,28,120,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
        opacity: pop, transform: 'translateY(' + ((1 - rise) * 8).toFixed(2) + 'px)',
        padding: '7px 16px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
        fontFamily: FONT.en, fontSize: 34, fontWeight: 500, lineHeight: 1.14, color: '#fff', whiteSpace: 'pre',
      }}
    >
      {shown.map((t, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ opacity: i === 0 ? 1 : 0.92 }}>{t}</span>
          {i === shown.length - 1 && typing ? (
            <span style={{ display: 'inline-block', width: 13, height: 28, marginLeft: 3, background: 'rgba(255,255,255,0.85)' }} />
          ) : null}
        </span>
      ))}
    </div>
  );
};

export const S08: React.FC = () => {
  const frame = useCurrentFrame();
  const fired = TARGETS.filter((t) => frame >= t.ft).length;
  const done = ramp(frame, LAST_FIRE + 8, LAST_FIRE + 18);
  const scanOn = ramp(frame, SCAN0 - 3, SCAN0 + 5) * (1 - ramp(frame, SCAN1, SCAN1 + 8));
  const ly = scanY(frame);
  const scanProg = clamp01((frame - SCAN0) / (SCAN1 - SCAN0));
  const push = 1 + 0.03 * ramp(frame, 0, 120);
  const titleIn = ramp(frame, 2, 20);
  const blink = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame / 3));

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden', fontFamily: FONT.en }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push.toFixed(5) + ')', transformOrigin: '50% 52%' }}>
        {/* status row */}
        <div style={{ position: 'absolute', left: 120, top: 74, display: 'flex', alignItems: 'center', gap: 18, opacity: titleIn }}>
          <div
            style={{
              width: 13, height: 13, borderRadius: 7,
              background: done > 0.5 ? C.violet : 'rgba(101,84,232,' + (0.4 + 0.6 * blink).toFixed(2) + ')',
              boxShadow: '0 0 0 6px rgba(101,84,232,0.10)',
            }}
          />
          <span style={{ fontFamily: FONT.en, fontSize: 28, fontWeight: 600, letterSpacing: '0.14em', color: done > 0.5 ? C.violet : C.ink }}>
            {done > 0.5 ? 'MARKET READ' : 'READING'}
          </span>
          <span style={{ width: 54, height: 1, background: C.line }} />
          <span style={{ fontFamily: FONT.en, fontSize: 28, fontWeight: 500, letterSpacing: '0.12em', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
            SIGNALS <span style={{ color: fired === TARGETS.length ? C.violet : C.ink, fontWeight: 600 }}>{String(fired).padStart(2, '0')}</span> / 04
          </span>
          <div style={{ width: 170, height: 4, borderRadius: 2, background: C.line, overflow: 'hidden', marginLeft: 6 }}>
            <div style={{ width: (scanProg * 100).toFixed(1) + '%', height: '100%', background: C.violet, borderRadius: 2 }} />
          </div>
        </div>

        {/* headline */}
        <div
          style={{
            position: 'absolute', left: 120, top: 138,
            opacity: titleIn, filter: 'blur(' + ((1 - titleIn) * 7).toFixed(2) + 'px)',
            transform: 'translateY(' + ((1 - titleIn) * 16).toFixed(1) + 'px)',
            fontFamily: FONT.en, fontSize: 92, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.025em', color: C.ink, whiteSpace: 'nowrap',
          }}
        >
          <div>Same night.</div>
          <div>
            Nearby: <span style={{ fontFamily: FONT.num, fontVariantNumeric: 'tabular-nums', color: C.violet }}>¥150–¥639</span>
          </div>
        </div>

        {/* page sheet: cropped EN market content column (names/addresses blurred in texture) */}
        <div
          style={{
            position: 'absolute', left: SHEET.x, top: SHEET.y, width: WO.w, height: WO.h,
            borderRadius: 24, overflow: 'hidden', background: C.paper,
            border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          }}
        >
          <Img
            src={staticFile(PAGES.market.src)}
            style={{
              position: 'absolute', width: PAGE.w * SHEET.s, height: PAGE.h * SHEET.s, display: 'block',
              left: -SHEET.cropX * SHEET.s, top: -SHEET.cropY * SHEET.s,
            }}
          />
          {scanOn > 0.01 && (
            <>
              <div
                style={{
                  position: 'absolute', left: 0, width: WO.w, top: ly - SHEET.y - 140, height: 140, opacity: scanOn,
                  background: 'linear-gradient(180deg, rgba(101,84,232,0) 0%, rgba(101,84,232,0.05) 60%, rgba(101,84,232,0.13) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute', left: 0, width: WO.w, top: ly - SHEET.y - 2, height: 3,
                  opacity: scanOn, background: C.violet,
                  boxShadow: '0 0 10px rgba(101,84,232,0.55), 0 0 28px rgba(101,84,232,0.28)',
                }}
              />
            </>
          )}
        </div>

        {/* scan readout at the sheet's left edge */}
        {scanOn > 0.01 && (
          <div style={{ opacity: scanOn }}>
            <div
              style={{
                position: 'absolute', left: 778, top: ly - 36, width: 130, textAlign: 'right',
                fontFamily: FONT.en, fontSize: 22, fontWeight: 600, letterSpacing: '0.08em', color: C.violet,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {'Y ' + String(Math.max(0, Math.round(ly))).padStart(4, '0')}
            </div>
            <svg width={16} height={22} viewBox='0 0 16 22' style={{ position: 'absolute', left: 932, top: ly - 11 }}>
              <path d='M1 1 L15 11 L1 21 Z' fill={C.violet} />
            </svg>
          </div>
        )}

        {/* brackets + machine labels */}
        {TARGETS.map((t) => (
          <Bracket key={t.key} box={t.box} ft={t.ft} frame={frame} />
        ))}
        {TARGETS.map((t) => (
          <Tag key={t.key} lines={t.lines} x={t.tag.x} y={t.tag.y} w={t.tag.w} ft={t.ft} frame={frame} />
        ))}

        {/* source line */}
        <div
          style={{
            position: 'absolute', left: 120, top: 876, opacity: ramp(frame, 22, 40),
            fontFamily: FONT.en, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.01em', whiteSpace: 'nowrap',
          }}
        >
          Check-in 11-06 · Retrieved 5 Nov, 20:16 · RollingGo
        </div>
      </div>

      {/* caption = subtitle layer (core Caption; hidden when captions are off) */}
      <Caption text='Five hotels. Five valid quotes.' from={18} to={300} align='left' left={120} />
    </AbsoluteFill>
  );
};
