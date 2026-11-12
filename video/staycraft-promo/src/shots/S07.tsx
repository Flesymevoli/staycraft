import React from 'react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, R, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption, Kicker } from '../core/ui';
import { HANDOFF } from '../core/handoff';

/**
 * S07 · AI 调查（660–750f，3.0s）
 * Card: effects/glow-flyline-moves · demo demos/effects/glow-flyline-moves/FlylineArc.tsx
 * 浅底改版：violet 线 + 白芯 + 深色衬底（01 §8 风险项）。节点 = 真实截图 1:1 裁片。
 * 时序：S06 卡片 f0–9 缩成「经营记录」节点（T9），L1 f9–23 / L2 f22–36 / L3 f35–49，
 *       chip f49/52/55，f55–90 hold 35f（≥30f）。
 * S06→S07 交接：HANDOFF.s06_to_s07.cardAt 是 S06 右卡末帧屏幕态（scale .86 / opacity .70），
 *   nodeAt 是本镜节点落位；进入动画按 cardAt→nodeAt 的位移 + 透明度收拢，避免接缝跳变。
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

type Pt = { x: number; y: number };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const STAR_PATH = 'M20 0 C21.6 12.4 21.9 14.8 40 20 C21.9 25.2 21.6 27.6 20 40 C18.4 27.6 18.1 25.2 0 20 C18.1 14.8 18.4 12.4 20 0 Z';
const Star: React.FC<{ size: number; color: string; opacity?: number }> = ({ size, color, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ opacity, display: 'block' }}>
    <path d={STAR_PATH} fill={color} />
  </svg>
);

/* ── 节点卡：真实截图 1:1 裁片（不放大，Q2）；motion/labelOpacity/overlay 供接缝使用 ── */
const NodeCard: React.FC<{
  x: number; y: number; w: number; h: number;
  title: string; index: string;
  src: string; pageH: number;
  cropX: number; cropY: number;
  winH?: number; pad?: number; titleSize?: number; lit: number; borderLit?: number;
  motion?: React.CSSProperties; labelOpacity?: number; overlay?: React.ReactNode;
}> = ({ x, y, w, h, title, index, src, pageH, cropX, cropY, winH = 150, pad = 18, titleSize = 46, lit, borderLit, motion, labelOpacity = 1, overlay }) => {
  const dim = 0.45 + 0.55 * lit;
  const border = (borderLit ?? lit) > 0.5 ? 'rgba(101,84,232,0.32)' : C.line;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        borderRadius: R.card, background: C.paper, border: '1px solid ' + border,
        boxShadow: SHADOW.card, overflow: 'hidden', opacity: dim,
        ...motion,
      }}
    >
      <div
        style={{
          position: 'absolute', left: pad, top: pad, width: w - pad * 2, height: winH,
          borderRadius: R.nested, overflow: 'hidden', border: '1px solid ' + C.line,
          background: C.fog,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ position: 'absolute', left: -cropX, top: -cropY, width: 1440, height: pageH, display: 'block' }}
        />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(24,24,27,0.04)' }} />
      </div>
      <div
        style={{
          position: 'absolute', left: pad + 4, right: pad + 4, top: Math.min(pad + winH + 16, h - Math.round(titleSize * 1.34)),
          display: 'flex', alignItems: 'baseline', gap: 12, opacity: labelOpacity,
        }}
      >
        <span style={{ fontFamily: FONT.en, fontSize: 24, fontWeight: 600, letterSpacing: '0.14em', color: C.violet }}>
          {index}
        </span>
        <span style={{ fontFamily: FONT.zh, fontSize: titleSize, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em' }}>
          {title}
        </span>
      </div>
      {overlay}
    </div>
  );
};

/* ── 飞线：深色衬底 + violet 线 + 亮头暗尾白芯 ───────────────────────── */
const FLY_DUR = 14;
const N = 64;

const FlyLine: React.FC<{
  frame: number; start: number; color?: string;
  p0: Pt; p1: Pt; p2: Pt; p3: Pt;
}> = ({ frame, start, color = C.violet, p0, p1, p2, p3 }) => {
  if (frame < start) return null;
  const grow = clamp01((frame - start) / FLY_DUR);
  const e = Easing.out(Easing.cubic)(grow);
  const settle = ramp(frame, start + FLY_DUR, start + FLY_DUR + 10);
  const pts: Pt[] = [];
  const nDrawn = Math.max(2, Math.round(e * N) + 1);
  for (let i = 0; i < nDrawn; i++) {
    const t = Math.min(i / N, e);
    pts.push(bez(p0, p1, p2, p3, t));
  }
  const head = bez(p0, p1, p2, p3, e);
  const poly = pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const growing = frame < start + FLY_DUR;

  const core: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const tSeg = Math.min(i / N, e) / Math.max(e, 0.001);
    const grad = 0.25 + 0.75 * tSeg * tSeg;
    const op = Math.min(1, grad + (1 - grad) * settle);
    core.push(
      <line
        key={i}
        x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y}
        stroke='rgba(255,255,255,0.92)' strokeWidth={1.3} strokeLinecap='butt' strokeOpacity={op}
      />
    );
  }

  return (
    <g>
      <polyline points={poly} fill='none' stroke='rgba(24,24,27,0.16)' strokeWidth={8.5} strokeLinecap='round' strokeLinejoin='round' />
      <polyline points={poly} fill='none' stroke={color} strokeWidth={3.4} strokeLinecap='round' strokeLinejoin='round' strokeOpacity={0.95} />
      {core}
      <circle cx={p0.x} cy={p0.y} r={9} fill={color} opacity={0.14 + 0.1 * settle} />
      <circle cx={p0.x} cy={p0.y} r={3.6} fill={color} />
      {growing && (
        <g>
          <circle cx={head.x} cy={head.y} r={26} fill={color} opacity={0.16} />
          <circle cx={head.x} cy={head.y} r={10} fill={color} opacity={0.28} />
          <circle cx={head.x} cy={head.y} r={4.2} fill='#ffffff' stroke={color} strokeWidth={1.6} />
        </g>
      )}
      {!growing && (
        <g>
          <circle cx={p3.x} cy={p3.y} r={11} fill={color} opacity={0.16} />
          <circle cx={p3.x} cy={p3.y} r={4.6} fill={color} />
        </g>
      )}
      {!growing && frame < start + FLY_DUR + 14 && (
        <circle
          cx={p3.x} cy={p3.y}
          r={6 + 22 * ramp(frame, start + FLY_DUR, start + FLY_DUR + 14)}
          fill='none' stroke={color} strokeWidth={1.6}
          opacity={0.5 * (1 - ramp(frame, start + FLY_DUR, start + FLY_DUR + 14))}
        />
      )}
    </g>
  );
};

/* ── 步骤 chip ─────────────────────────────────────────────────────── */
const STEP_CHIPS = [
  { text: '读取经营记录', at: 49 },
  { text: '查询周边报价', at: 52 },
  { text: '保存证据', at: 55 },
];

const StepChip: React.FC<{ text: string; index: number; frame: number; at: number }> = ({ text, index, frame, at }) => {
  const on = ramp(frame, at, at + 8);
  return (
    <div
      style={{
        position: 'absolute', left: 120, top: 690 + index * 74, width: 344, height: 62,
        display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 20, boxSizing: 'border-box',
        borderRadius: R.pill, background: C.paper,
        border: '1px solid ' + (on > 0.5 ? 'rgba(101,84,232,0.30)' : C.line),
        boxShadow: on > 0.5 ? SHADOW.card : 'none',
        opacity: 0.34 + 0.66 * on,
      }}
    >
      <div
        style={{
          width: 26, height: 26, borderRadius: 13, flex: '0 0 auto',
          background: on > 0.5 ? C.violet : 'transparent',
          border: '1.5px solid ' + (on > 0.5 ? C.violet : C.line),
          color: '#fff', fontFamily: FONT.en, fontSize: 15, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {on > 0.45 ? '✓' : ''}
      </div>
      <span style={{ fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: on > 0.5 ? C.ink : C.muted, letterSpacing: '0.01em' }}>
        {text}
      </span>
      <span style={{ marginLeft: 'auto', marginRight: 20, fontFamily: FONT.en, fontSize: 22, fontWeight: 600, letterSpacing: '0.1em', color: on > 0.5 ? C.violet : C.muted, fontVariantNumeric: 'tabular-nums' }}>
        {String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
};

/* S06 右卡背面内容：f0 接住卡片态，随后交给节点缩略图 */
const CardBackOverlay: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%)', padding: '25px 26px',
      boxSizing: 'border-box', opacity,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: C.violet, display: 'inline-block' }} />
      <span style={{ fontFamily: FONT.zh, fontSize: 30, fontWeight: 600, color: C.violet, letterSpacing: '0.02em' }}>未来已订</span>
    </div>
    <div style={{ marginTop: 18, fontFamily: FONT.num, fontSize: 66, fontWeight: 600, color: C.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
      ¥10,802.33
    </div>
    <div style={{ position: 'absolute', left: 26, right: 23, bottom: 22, fontFamily: FONT.zh, fontSize: 30, fontWeight: 500, lineHeight: 1.35, color: C.ink }}>
      19 间夜
    </div>
  </div>
);

export const S07: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1 + 0.012 * ramp(frame, 0, 90);
  const titleIn = ramp(frame, 4, 22);
  const node = HANDOFF.s06_to_s07.nodeAt;
  const cardAt = HANDOFF.s06_to_s07.cardAt;
  const inP = seg(frame, 0, 9, Easing.inOut(Easing.cubic));
  const enterDx = (1 - inP) * (cardAt.x - node.x);
  const enterDy = (1 - inP) * (cardAt.y - node.y);
  const nodeEnterOpacity = cardAt.opacity + (1 - cardAt.opacity) * inP;
  const backFade = 1 - ramp(frame, 1, 7);
  const litB = ramp(frame, 23, 31);
  const litC = ramp(frame, 36, 44);
  const litD = ramp(frame, 49, 57);
  const steps = STEP_CHIPS.filter((c) => frame >= c.at).length;
  const counterIn = ramp(frame, 45, 53);

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden', fontFamily: FONT.zh }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push.toFixed(5) + ')', transformOrigin: '50% 52%' }}>
        {/* 文字层 */}
        <div style={{ position: 'absolute', left: 120, top: 108, opacity: titleIn, filter: 'blur(' + ((1 - titleIn) * 6).toFixed(2) + 'px)', transform: 'translateY(' + ((1 - titleIn) * 16).toFixed(1) + 'px)' }}>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.02em', color: C.ink }}>
            让 <span style={{ color: C.violet }}>AI</span> 去查
          </div>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.02em', color: C.ink }}>别再一个个翻</div>
        </div>
        <Kicker text='AI' size={28} color={C.violet} style={{ position: 'absolute', left: 1744, top: 112 }} />
        <div
          style={{
            position: 'absolute', left: 1380, top: 168, opacity: ramp(frame, 12, 28),
            fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.02em', whiteSpace: 'nowrap',
          }}
        >
          AI 调查 · 步骤可追溯
        </div>

        {/* 节点（真实截图 1:1 裁片） */}
        <NodeCard
          x={node.x} y={node.y} w={node.w} h={node.h}
          title='经营记录' index='01'
          src={PAGES.analysis.src} pageH={PAGES.analysis.h}
          cropX={735} cropY={340} winH={150} lit={1} borderLit={inP}
          motion={{
            transform: 'translate(' + enterDx.toFixed(2) + 'px, ' + enterDy.toFixed(2) + 'px)',
            opacity: nodeEnterOpacity,
            zIndex: 4,
          }}
          labelOpacity={inP}
          overlay={backFade > 0.01 ? <CardBackOverlay opacity={backFade} /> : null}
        />
        <div
          style={{
            position: 'absolute', left: 900, top: 250, width: 340, height: 210,
            borderRadius: R.card, background: C.violetFog,
            border: '1px solid rgba(101,84,232,0.26)', boxShadow: SHADOW.card,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: 0.45 + 0.55 * litB,
          }}
        >
          <Star size={34} color={C.violet} opacity={0.55 + 0.45 * litB} />
          <div style={{ fontSize: 46, fontWeight: 700, color: C.violetDeep, letterSpacing: '-0.01em' }}>AI 调查</div>
          <div style={{ fontSize: 34, fontWeight: 500, color: C.muted }}>按需调用工具</div>
        </div>
        <NodeCard
          x={1400} y={420} w={420} h={260}
          title='周边报价' index='03'
          src={PAGES.market.src} pageH={PAGES.market.h}
          cropX={279} cropY={384} winH={150} lit={litC}
        />
        <NodeCard
          x={1000} y={720} w={320} h={190}
          title='空档' index='04'
          src={PAGES.analysis.src} pageH={PAGES.analysis.h}
          cropX={760} cropY={830} winH={112} pad={14} titleSize={40} lit={litD}
        />

        {/* 接缝雾幕：f0 背景与 S06 末帧纯雾一致（S06 右卡 0.70 透明度悬在纯雾上），
            节点随雾幕淡出（f0–8）而浮现；incoming 卡 zIndex 4 在雾幕之上，接缝无跳变。 */}
        <div
          style={{
            position: 'absolute', inset: 0, background: C.fog,
            opacity: Math.max(0, 1 - ramp(frame, 0, 8)),
            zIndex: 3, pointerEvents: 'none',
          }}
        />

        {/* 飞线（3 段依次连接） */}
        <svg width={1920} height={1080} viewBox='0 0 1920 1080' style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <FlyLine frame={frame} start={9} p0={{ x: 780, y: 550 }} p1={{ x: 806, y: 486 }} p2={{ x: 856, y: 412 }} p3={{ x: 900, y: 355 }} />
          <FlyLine frame={frame} start={22} p0={{ x: 1240, y: 355 }} p1={{ x: 1316, y: 372 }} p2={{ x: 1356, y: 470 }} p3={{ x: 1400, y: 550 }} />
          <FlyLine frame={frame} start={35} p0={{ x: 1430, y: 680 }} p1={{ x: 1396, y: 714 }} p2={{ x: 1120, y: 714 }} p3={{ x: 1000, y: 720 }} />
        </svg>

        {/* 步骤 chip + 计数 */}
        {STEP_CHIPS.map((c, i) => (
          <StepChip key={c.text} text={c.text} index={i} frame={frame} at={c.at} />
        ))}
        <div
          style={{
            position: 'absolute', left: 120, top: 906, display: 'flex', alignItems: 'center', gap: 16,
            opacity: counterIn, fontFamily: FONT.en, fontSize: 28, fontWeight: 600, letterSpacing: '0.14em', color: C.violet,
          }}
        >
          <span>STEPS</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: C.ink }}>
            {String(steps).padStart(2, '0')} <span style={{ color: C.muted }}>/ 03</span>
          </span>
        </div>
      </div>

      {/* 解说 caption（C1） */}
      <Caption text='读取经营记录，按需调用工具查报价。' from={20} to={300} bottom={80} />
    </AbsoluteFill>
  );
};
