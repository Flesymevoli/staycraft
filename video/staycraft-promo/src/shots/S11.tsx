import React from 'react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, R, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption, YellowMark } from '../core/ui';
import { REPORT_SEAM } from './S10';

/**
 * S11 · 报告三拍（1020–1200f，6.0s）
 * Card: ui-entrance/doc-park-left-pill-deal · demo demos/ui-entrance/doc-park-left-pill-deal/DocParkLeftPillDeal.tsx
 * 报告页左驻留（Lead 裁决：0.9 缩放、视口顶 2282→2408、占画面约 52% 宽，可读性优先；慢滚 0.7px/f）；右侧三张白底描边药丸按 T0=0.26/0.48/0.70 慢发牌；
 * 每张下字幕逐词加深、下一张前淡出；文档内依据句划线 + 细线连药丸；f140–150 黄线；f150–180 相机 1.02 轻推。
 * 文档区 = 报告「优先决策」（依据句与三药丸语义对应）；S10→S11 同页连续（REPORT_SEAM）。
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

const PAGE = { x0: REPORT_SEAM.pageX, top0: REPORT_SEAM.pageTop, scrollV: 0.7 };
const PARK = { toX: -287, toScale: 0.9, dur: 30 };
/* f150–180 元素层峰值：整层相机 1.0→1.02 轻推（transformOrigin 46% 50% = 883.2,540） */
const PUSH_END = 1.02;
const PUSH_O = { x: 883.2, y: 540 };
const END_TOP = PAGE.top0 + PAGE.scrollV * 179; // 2407.3
/**
 * S11 末帧（f179）的屏幕等效机位（已含 f150–180 的 1.02 轻推）—— S12 从这里接力，
 * 把它当作 translate(x, -scale*top) scale(scale) origin 0 0 直接使用即与 S11 末帧完全重合。
 */
export const S11_EXIT = {
  x: PUSH_O.x * (1 - PUSH_END) + PUSH_END * PARK.toX,
  scale: PUSH_END * PARK.toScale,
  top: (-(PUSH_O.y * (1 - PUSH_END)) + PUSH_END * PARK.toScale * END_TOP) / (PUSH_END * PARK.toScale),
} as const;
const PX = 1080;
const PW = 620;
const PH = 116;
const PILL_T0 = [47, 86, 126];
const PILL_Y = [250, 440, 630];
const PILL_TEXT: string[][] = [['空档在 ', '8–10 日'], ['不是整周缺客'], ['先补这三晚']];
const CAPTIONS: string[][] = [
  ['依据：', '8 日', '到 10 日', '的空档'],
  ['依据：', '而不是', '整周', '平均用力'],
  ['依据：', '可以先', '针对', '这三晚'],
];

/* 文档内依据句（页面坐标：x0/x1/y，1440 宽页面空间） */
const EVIDENCE = [
  { x0: 380, x1: 600, y: 2612, h: 22, color: C.yellow, alpha: 0.62 },
  { x0: 380, x1: 1070, y: 2657, h: 22, color: C.violet, alpha: 0.12 },
  { x0: 380, x1: 872, y: 2688, h: 22, color: C.violet, alpha: 0.12 },
];
/* 药丸 ← 依据句：A(优先把8日到10日的空档补上) → 丸1；B(可以先针对这三晚…) → 丸3；C(而不是整周平均用力) → 丸2 */
const LEADER = [
  { ev: 0, pill: 0 },
  { ev: 2, pill: 1 },
  { ev: 1, pill: 2 },
];

const mix = (p: number, a: [number, number, number], b: [number, number, number]) => {
  const q = clamp01(p);
  const r = Math.round(a[0] + (b[0] - a[0]) * q);
  const g = Math.round(a[1] + (b[1] - a[1]) * q);
  const bl = Math.round(a[2] + (b[2] - a[2]) * q);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
};
const DIM_WORD: [number, number, number] = [110, 110, 120];
const INK_WORD: [number, number, number] = [70, 70, 80];

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
        display: 'flex', alignItems: 'center', paddingLeft: 42, paddingRight: 36,
        opacity: o, transform: 'translateY(' + ((1 - b) * 14).toFixed(2) + 'px) scale(' + (0.94 + 0.06 * b).toFixed(4) + ')',
        transformOrigin: '50% 50%',
      }}
    >
      {i === 0 ? <div style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 6, borderRadius: 3, background: C.yellow }} /> : null}
      <div style={{ fontFamily: FONT.zh, fontSize: 72, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: C.ink, whiteSpace: 'pre', display: 'flex', alignItems: 'baseline' }}>
        {PILL_TEXT[i].map((t, k) => (
          <span key={k}>
            {i === 0 && k === 1 ? <YellowMark from={t0 + 6} height={0.5}>{t}</YellowMark> : t}
          </span>
        ))}
      </div>
    </div>
  );
};

const PillCaption: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const cs = PILL_T0[i] + 12;
  const ce = i < 2 ? PILL_T0[i + 1] - 6 : 176;
  const show = seg(frame, cs, cs + 4, Easing.out(Easing.quad));
  const inn = seg(frame, cs, cs + (ce - cs) * 0.72, Easing.out(Easing.quad));
  const out = seg(frame, ce - 6, ce, Easing.out(Easing.quad));
  const words = CAPTIONS[i];
  const st = 1 / (words.length + 1);
  return (
    <div
      style={{
        position: 'absolute', left: PX + 6, top: PILL_Y[i] + PH + 14, display: 'flex', alignItems: 'baseline',
        opacity: show * (1 - out), fontFamily: FONT.zh, whiteSpace: 'nowrap',
      }}
    >
      {words.map((w, k) => {
        const q = clamp01((inn - k * st) / 0.42);
        return (
          <span key={k} style={{ fontSize: 40, fontWeight: 500, color: mix(q, DIM_WORD, INK_WORD), letterSpacing: '0.01em', marginRight: 4 }}>
            {w}
          </span>
        );
      })}
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
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden', fontFamily: FONT.zh }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push.toFixed(5) + ')', transformOrigin: '46% 50%' }}>
        {/* ── 报告页（左驻留 + 常驻慢滚） ── */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: 1440, height: PAGES.report.h,
            transformOrigin: '0 0', transform: pageT,
            borderRadius: R.card, overflow: 'hidden', background: C.fog,
            border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          }}
        >
          <Img src={staticFile(PAGES.report.src)} style={{ width: 1440, height: PAGES.report.h, display: 'block' }} />
        </div>

        {/* ── 依据句划线（页面空间 → 屏幕空间，随驻留/滚动移动） ── */}
        {EVIDENCE.map((ev, i) => {
          const evIdx = LEADER.findIndex((l) => l.ev === i);
          const at = PILL_T0[evIdx >= 0 ? LEADER[evIdx].pill : i];
          const draw = seg(frame, at + 2, at + 12, Easing.out(Easing.cubic));
          const ce = LEADER[evIdx] ? (LEADER[evIdx].pill < 2 ? PILL_T0[LEADER[evIdx].pill + 1] - 6 : 176) : 176;
          const fade = 1 - seg(frame, ce - 6, ce, Easing.out(Easing.quad));
          if (draw <= 0 || fade <= 0) return null;
          const x = tx + s * ev.x0;
          const y = ty + s * ev.y;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: x, top: y, width: s * (ev.x1 - ev.x0) * draw, height: s * ev.h,
                background: ev.color, opacity: ev.alpha * fade, borderRadius: 2, mixBlendMode: ev.color === C.yellow ? 'multiply' : 'normal',
              }}
            />
          );
        })}

        {/* ── 依据引线：斜体细线，从依据句右端连到药丸左缘 ── */}
        {LEADER.map((l, k) => {
          const ev = EVIDENCE[l.ev];
          const at = PILL_T0[l.pill];
          const draw = seg(frame, at + 4, at + 14, Easing.out(Easing.cubic));
          const ce = l.pill < 2 ? PILL_T0[l.pill + 1] - 6 : 176;
          const fade = 1 - seg(frame, ce - 6, ce, Easing.out(Easing.quad));
          if (draw <= 0 || fade <= 0) return null;
          const ax = tx + s * ev.x1;
          const ay = ty + s * (ev.y + ev.h + 2);
          const bx = PX - 10;
          const by = PILL_Y[l.pill] + PH / 2;
          const d = 'M ' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' C ' + (ax + 90).toFixed(1) + ' ' + ay.toFixed(1) + ', ' + (bx - 110).toFixed(1) + ' ' + by.toFixed(1) + ', ' + bx.toFixed(1) + ' ' + by.toFixed(1);
          return (
            <svg key={k} width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55 * fade }}>
              <path d={d} fill='none' stroke={C.violet} strokeWidth={1.5} strokeLinecap='round' pathLength={1} strokeDasharray='1 1' strokeDashoffset={(1 - draw).toFixed(4)} />
              <circle cx={ax} cy={ay} r={3.4} fill={C.violet} opacity={Math.min(1, draw * 2)} />
            </svg>
          );
        })}

        {/* ── 右栏：小字 + 三药丸 + 字幕 + 黄线 ── */}
        <div
          style={{
            position: 'absolute', left: PX, top: 196, display: 'flex', alignItems: 'center', gap: 12,
            opacity: metaIn, fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.02em',
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 6, background: C.violet, display: 'inline-block' }} />
          报告建议 · 高优先级
        </div>
        {[0, 1, 2].map((i) => (
          <Pill key={'p' + i} i={i} frame={frame} />
        ))}
        {[0, 1, 2].map((i) => (
          <PillCaption key={'c' + i} i={i} frame={frame} />
        ))}
        <div
          style={{
            position: 'absolute', left: 1060, top: 244, width: 6, height: 536, borderRadius: 3,
            background: C.yellow, transform: 'scaleY(' + yellowLine.toFixed(4) + ')', transformOrigin: 'top center',
          }}
        />
      </div>

      {/* 底部白雾 scrim（caption 可读） */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 240,
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 55%, #ffffff 100%)',
        }}
      />
      <Caption text='结论、原因、建议，一条条给。' from={134} to={300} bottom={70} />
    </AbsoluteFill>
  );
};
