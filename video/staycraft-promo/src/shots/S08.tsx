import React from 'react';
import { AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption } from '../core/ui';

/**
 * S08 · 市场页扫描（750–870f，4.0s）
 * Card: effects/scanline-annotate-focus · demo demos/effects/scanline-annotate-focus/ScanlineAnnotateFocus.tsx
 * 机器色改 violet #6554e8（layout.ts 量测 bbox）；150f → 120f 压缩。
 * 页面整页 1440×1580 以 0.66 放在 fog 台上（Lead 裁决 2026-11-05：1580 高在 1080 内 1.0 放不下，降档为整页 0.66 右置、可读性优先、不裁 ¥ 数字）；扫描 f4–64 严格匀速；
 * 四角按 bbox 下缘反算触发（最小间隔 4f）；标签放在页面空白带、逐字打出；标签不压 ¥ 数字。
 * hold f71–120（≥30f）。
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

/* 整页 sheet：1440×1580 缩到 0.66，左栏留给大字与标签 */
const SHEET = { x: 920, y: 3, s: 0.66 };
const WO = { w: 1440 * SHEET.s, h: 1580 * SHEET.s };
const sx = (px: number) => SHEET.x + px * SHEET.s;
const sy = (py: number) => SHEET.y + py * SHEET.s;
const sw = (w: number) => w * SHEET.s;

const SCAN0 = 4;
const SCAN1 = 64;
const scanY = (f: number) => SHEET.y + (WO.h - 8) * clamp01((f - SCAN0) / (SCAN1 - SCAN0));
const frameAtScanY = (y: number) => SCAN0 + ((y - SHEET.y) / (WO.h - 8)) * (SCAN1 - SCAN0);

type Box = { x: number; y: number; w: number; h: number };
type Target = { key: string; box: Box; lines: string[]; tag: { x: number; y: number; w: number }; ft: number };
const TARGETS: Target[] = (() => {
  const list: Target[] = [
    { key: 'range', box: { x: sx(279), y: sy(350), w: sw(600), h: sw(200) }, lines: ['供应商起价范围 ¥124–¥621'], tag: { x: 1118, y: 226, w: 470 }, ft: 0 },
    { key: 'count', box: { x: sx(1018), y: sy(420), w: sw(300), h: sw(140) }, lines: ['返回酒店 5', '有效报价 5 条'], tag: { x: 1540, y: 384, w: 250 }, ft: 0 },
    { key: 'mine', box: { x: sx(279), y: sy(618), w: sw(1100), h: sw(200) }, lines: ['你的房价位置', '¥520–¥760'], tag: { x: 1268, y: 431, w: 254 }, ft: 0 },
    { key: 'list', box: { x: sx(279), y: sy(834), w: sw(1098), h: sw(557) }, lines: ['报价列表 · 5 家'], tag: { x: 1550, y: 927, w: 300 }, ft: 0 },
  ];
  let prev = -99;
  for (const t of [...list].sort((a, b) => a.box.y + a.box.h - (b.box.y + b.box.h))) {
    t.ft = Math.max(Math.round(frameAtScanY(t.box.y + t.box.h)), prev + 4);
    prev = t.ft;
  }
  return list;
})();
const LAST_FIRE = Math.max(...TARGETS.map((t) => t.ft));

const cjkW = (ch: string) => (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 34 : 19);
const estW = (s: string) => Array.from(s).reduce((a, ch) => a + cjkW(ch), 0);

/* ── 取景角标：外扩 44 → 0 spring（一次过冲），臂长晚 3f 收一档 ─────────── */
const Bracket: React.FC<{ box: Box; ft: number; frame: number }> = ({ box, ft, frame }) => {
  const f = frame - ft;
  if (f < 0) return null;
  const s = spring({ frame: f, fps: 30, config: { damping: 15, stiffness: 210 }, durationInFrames: 30 });
  const pad = 44 * (1 - s);
  const arm = 24 - 7 * ramp(frame, ft + 3, ft + 15);
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
          position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: 6,
          background: 'rgba(101,84,232,' + (0.075 * flash).toFixed(3) + ')',
          boxShadow: 'inset 0 0 0 2px rgba(101,84,232,' + (0.4 * flash).toFixed(3) + ')',
        }}
      />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: op, pointerEvents: 'none' }}>
        <path d={d} fill='none' stroke={C.violet} strokeWidth={3.5} strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    </>
  );
};

/* ── 机器标签：violet 底白字，逐字打出（~2.2 字/帧），签条随字长出 ────────── */
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
        position: 'absolute', left: x, top: y, width: Math.min(fullW, Math.max(60, nowW)), minHeight: 50,
        borderRadius: 8, background: C.violet, overflow: 'hidden',
        boxShadow: '0 10px 22px -12px rgba(38,28,120,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
        opacity: pop, transform: 'translateY(' + ((1 - rise) * 8).toFixed(2) + 'px)',
        padding: '7px 16px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
        fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, lineHeight: 1.12, color: '#fff', whiteSpace: 'pre',
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
  const done = ramp(frame, LAST_FIRE + 6, LAST_FIRE + 14);
  const scanOn = ramp(frame, SCAN0 - 3, SCAN0 + 5) * (1 - ramp(frame, SCAN1, SCAN1 + 8));
  const ly = scanY(frame);
  const scanProg = clamp01((frame - SCAN0) / (SCAN1 - SCAN0));
  const push = 1 + 0.03 * ramp(frame, 0, 120);
  const titleIn = ramp(frame, 2, 20);
  const blink = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame / 3));

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden', fontFamily: FONT.zh }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push.toFixed(5) + ')', transformOrigin: '50% 52%' }}>
        {/* ── 左栏：状态行 / 大字 / 来源 ── */}
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
          <div style={{ width: 180, height: 4, borderRadius: 2, background: C.line, overflow: 'hidden', marginLeft: 6 }}>
            <div style={{ width: (scanProg * 100).toFixed(1) + '%', height: '100%', background: C.violet, borderRadius: 2 }} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute', left: 120, top: 148,
            opacity: titleIn, filter: 'blur(' + ((1 - titleIn) * 7).toFixed(2) + 'px)',
            transform: 'translateY(' + ((1 - titleIn) * 16).toFixed(1) + 'px)',
            fontSize: 104, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.02em', color: C.ink, whiteSpace: 'nowrap',
          }}
        >
          <div>同一天</div>
          <div>
            周边 <span style={{ fontFamily: FONT.num, fontVariantNumeric: 'tabular-nums', color: C.violet }}>¥124–¥621</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute', left: 120, top: 856, opacity: ramp(frame, 24, 42),
            fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.01em', whiteSpace: 'nowrap',
          }}
        >
          入住 11-06 · 查询 11/5 15:36 · RollingGo
        </div>

        {/* ── 页面 sheet（fog 上的纸） ── */}
        <div
          style={{
            position: 'absolute', left: SHEET.x, top: SHEET.y, width: WO.w, height: WO.h,
            borderRadius: 26, overflow: 'hidden', background: C.paper,
            border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          }}
        >
          <Img src={staticFile(PAGES.market.src)} style={{ width: WO.w, height: WO.h, display: 'block' }} />
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

        {/* ── 扫描游标读数：Y 坐标 + 三角游标（机器视线） ── */}
        {scanOn > 0.01 && (
          <div style={{ opacity: scanOn }}>
            <div
              style={{
                position: 'absolute', left: 760, top: ly - 36, width: 120, textAlign: 'right',
                fontFamily: FONT.en, fontSize: 22, fontWeight: 600, letterSpacing: '0.08em', color: C.violet,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {'Y ' + String(Math.max(0, Math.round(ly))).padStart(4, '0')}
            </div>
            <svg width={16} height={22} viewBox='0 0 16 22' style={{ position: 'absolute', left: 892, top: ly - 11 }}>
              <path d='M1 1 L15 11 L1 21 Z' fill={C.violet} />
            </svg>
          </div>
        )}

        {/* ── 取景角标 + 机器标签 ── */}
        {TARGETS.map((t) => (
          <Bracket key={t.key} box={t.box} ft={t.ft} frame={frame} />
        ))}
        {TARGETS.map((t) => (
          <Tag key={t.key} lines={t.lines} x={t.tag.x} y={t.tag.y} w={t.tag.w} ft={t.ft} frame={frame} />
        ))}
      </div>

      {/* 底部白雾 scrim：caption 可读 + sheet 收口 */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 190,
          background: 'linear-gradient(180deg, rgba(244,244,246,0) 0%, rgba(244,244,246,0.9) 55%, #f4f4f6 100%)',
        }}
      />
      <Caption text='5 家独立酒店的有效报价。' from={16} to={300} align='left' left={100} bottom={70} />
    </AbsoluteFill>
  );
};
