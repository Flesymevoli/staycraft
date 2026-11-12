import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import type { FC, ReactNode } from 'react';
import { C, EASE, FONT } from '../core/theme';
import { Grain } from '../core/ui';

/**
 * S01 · 夜桌·四格窗 (0–180f, 6.0s)
 * ink 夜场；2×2 圆角窗格由线生长成取景装置；四张抽象纸片随三拍问题依次落进窗格
 * （订单行 / 七日格 / 乱序价格 / 空白草稿纸）。末 15f 四格纵向收拢成一条白缝 + 星光首亮。
 * 节奏参照 brand-ink-open（装置描画 + 落定 hold）与 blur-slide（三通道同步文字上浮）；
 * 本镜无配方卡（docs/04 §2 自定义装置），几何来自 logo 四格窗母题。
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// ───────────── 装置几何（屏幕坐标，1920×1080）─────────────
const WIN = { x: 950, y: 140, w: 910, h: 820, gap: 28, r: 24 };
const PW = (WIN.w - WIN.gap) / 2; // 441
const PH = (WIN.h - WIN.gap) / 2; // 396
const WIN_CX = WIN.x + WIN.w / 2; // 1405
const WIN_CY = WIN.y + WIN.h / 2; // 550
// 收拢终点 = 装置中心（handoff.ts HANDOFF.s01_to_s02.seam = 1405,550,910,2）
const SEAM = { x: WIN_CX, y: WIN_CY, w: WIN.w };
const panePos = (i: number) => ({
  x: (i % 2) * (PW + WIN.gap),
  y: Math.floor(i / 2) * (PH + WIN.gap),
});

const NIGHT_CAPTION = '#b9b9c2';
const NIGHT_LABEL = '#83838d';
const FRAME_LINE = 'rgba(139,124,246,0.52)';
const PAPER = '#f8f7f2';
const INK_PAPER = 'rgba(24,24,27,';

// ───────────── 文字压印（blur-slide 三通道同一进度 + 压印 scale）─────────────
const PressLine: FC<{ text: string; start: number; size?: number; color?: string; weight?: number }> = ({
  text,
  start,
  size = 104,
  color = '#ffffff',
  weight = 700,
}) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.zh,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.16,
        letterSpacing: '-0.02em',
        color,
        whiteSpace: 'nowrap',
        opacity: p,
        filter: p >= 0.999 ? undefined : 'blur(' + (1 - p) * 6 + 'px)',
        transform: 'translateY(' + (1 - p) * 16 + 'px) scale(' + (1 + (1 - p) * 0.06) + ')',
        transformOrigin: 'left center',
      }}
    >
      {text}
    </div>
  );
};

// ───────────── 纸片（夜景：纸白 + 轻微浮沉，无 UI 卡片感）─────────────
const Slip: FC<{ start: number; baseRot: number; paperOpacity: number; children: ReactNode }> = ({
  start,
  baseRot,
  paperOpacity,
  children,
}) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  const age = Math.max(0, f - start);
  const float = Math.sin((age / 60) * Math.PI * 2) * 5;
  const rot = baseRot + Math.sin((age / 75) * Math.PI * 2) * 0.55;
  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        top: 24,
        width: PW - 48,
        height: PH - 48,
        borderRadius: 6,
        background: PAPER,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 22px 54px -18px rgba(0,0,0,0.65)',
        borderTop: '1px solid rgba(255,255,255,0.9)',
        opacity: p * paperOpacity,
        transform: 'translateY(' + ((1 - p) * 26 + float) + 'px) rotate(' + rot + 'deg) scale(' + (0.965 + 0.035 * p) + ')',
        filter: p >= 0.999 ? undefined : 'blur(' + (1 - p) * 6 + 'px)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

// ① 订单行纹理：细横线 + 金额列（抽象 bars，不虚构金额）
const OrdersSlip: FC<{ start: number; paperOpacity: number }> = ({ start, paperOpacity }) => {
  const f = useCurrentFrame();
  const rows = [0.5, 0.36, 0.46, 0.3, 0.4];
  const checkP = ramp(f, start + 22, start + 30, EASE.inOut);
  return (
    <Slip start={start} baseRot={-1.6} paperOpacity={paperOpacity}>
      <div style={{ position: 'absolute', left: 30, top: 24, width: 94, height: 8, borderRadius: 2, background: INK_PAPER + '0.22)' }} />
      <div style={{ position: 'absolute', left: 30, top: 40, width: 56, height: 5, borderRadius: 2, background: INK_PAPER + '0.10)' }} />
      {rows.map((w, i) => {
        const rowIn = ramp(f, start + 8 + i * 2, start + 14 + i * 2, EASE.out);
        return (
          <div key={i} style={{ position: 'absolute', left: 30, right: 30, top: 76 + i * 50, height: 40, opacity: rowIn }}>
            <div style={{ position: 'absolute', left: 0, top: 4, width: w * 100 + '%', height: 7, borderRadius: 2, background: INK_PAPER + '0.16)' }} />
            <div style={{ position: 'absolute', left: 0, top: 19, width: (w * 100 * 0.56) + '%', height: 4, borderRadius: 2, background: INK_PAPER + '0.09)' }} />
            <div style={{ position: 'absolute', right: 0, top: 9, width: 60, height: 8, borderRadius: 2, background: INK_PAPER + '0.13)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: INK_PAPER + '0.07)' }} />
          </div>
        );
      })}
      <svg width={PW - 48} height={PH - 48} viewBox={'0 0 ' + (PW - 48) + ' ' + (PH - 48)} style={{ position: 'absolute', inset: 0 }}>
        <path
          d="M196 128 l15 17 l32 -40"
          fill="none"
          stroke={C.yellow}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - checkP}
          opacity={0.92}
        />
      </svg>
    </Slip>
  );
};

// ② 七日格：11-05 — 11-11，11-08 空格 + 黄笔圈
const CalendarSlip: FC<{ start: number; paperOpacity: number }> = ({ start, paperOpacity }) => {
  const f = useCurrentFrame();
  const days = ['5', '6', '7', '8', '9', '10', '11'];
  const cellW = 68;
  const cellH = 62;
  const gapX = 12;
  const gapY = 14;
  const gridX = 28;
  const gridY = 74;
  const cells = days.map((_, i) => ({ x: gridX + (i % 4) * (cellW + gapX), y: gridY + Math.floor(i / 4) * (cellH + gapY) }));
  const low = cells[3]; // 11-08
  const circleP = ramp(f, start + 26, start + 38, EASE.inOut);
  const dots = [3, 2, 4, 0, 1, 2, 3];
  return (
    <Slip start={start} baseRot={1.8} paperOpacity={paperOpacity}>
      <div style={{ position: 'absolute', left: 28, top: 24, fontFamily: FONT.zh, fontSize: 25, fontWeight: 600, color: INK_PAPER + '0.48)', letterSpacing: '0.04em' }}>
        11 月
      </div>
      {cells.map((c, i) => {
        const cp = ramp(f, start + 10 + i * 2, start + 20 + i * 2, EASE.out);
        const cellDots = Array.from({ length: dots[i] });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: cellW,
              height: cellH,
              borderRadius: 9,
              border: '1px solid ' + INK_PAPER + '0.14)',
              background: 'rgba(255,255,255,0.55)',
              opacity: cp,
            }}
          >
            <div style={{ position: 'absolute', left: 8, top: 6, fontFamily: FONT.en, fontSize: 19, fontWeight: 600, color: INK_PAPER + '0.55)' }}>
              {days[i]}
            </div>
            {cellDots.map((_, k) => (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: 9 + (k % 2) * 13,
                  bottom: 9 + Math.floor(k / 2) * 9,
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  background: INK_PAPER + '0.22)',
                }}
              />
            ))}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: gridX + 3 * (cellW + gapX), top: gridY + cellH + gapY, width: cellW, height: cellH, borderRadius: 9, border: '1px dashed ' + INK_PAPER + '0.12)' }} />
      <svg width={PW - 48} height={PH - 48} viewBox={'0 0 ' + (PW - 48) + ' ' + (PH - 48)} style={{ position: 'absolute', inset: 0 }}>
        <ellipse
          cx={low.x + cellW / 2}
          cy={low.y + cellH / 2}
          rx={cellW / 2 + 11}
          ry={cellH / 2 + 8}
          fill="none"
          stroke={C.yellow}
          strokeWidth={3.4}
          strokeLinecap="round"
          transform={'rotate(-3 ' + (low.x + cellW / 2) + ' ' + (low.y + cellH / 2) + ')'}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - circleP}
          opacity={0.95}
        />
      </svg>
    </Slip>
  );
};

// ③ 乱序价格数字（¥124 / ¥257 / ¥621 / ¥760 —— 全部来自冻结快照）
const PricesSlip: FC<{ start: number; paperOpacity: number }> = ({ start, paperOpacity }) => {
  const f = useCurrentFrame();
  const items = [
    { t: '¥124', x: 26, y: 52, rot: -7, size: 46 },
    { t: '¥257', x: 212, y: 96, rot: 5, size: 42 },
    { t: '¥621', x: 34, y: 176, rot: -3, size: 44 },
    { t: '¥760', x: 196, y: 236, rot: 6, size: 50 },
  ];
  const markP = ramp(f, start + 22, start + 34, EASE.inOut);
  return (
    <Slip start={start} baseRot={-1.1} paperOpacity={paperOpacity}>
      {items.map((it, i) => {
        const p = ramp(f, start + 8 + i * 4, start + 16 + i * 4, EASE.out);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: it.x,
              top: it.y,
              fontFamily: FONT.num,
              fontSize: it.size,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              color: i === 3 ? INK_PAPER + '0.78)' : INK_PAPER + '0.56)',
              opacity: p,
              transform: 'translateY(' + (1 - p) * 10 + 'px) rotate(' + it.rot + 'deg) scale(' + (0.94 + 0.06 * p) + ')',
            }}
          >
            {it.t}
          </div>
        );
      })}
      <svg width={PW - 48} height={PH - 48} viewBox={'0 0 ' + (PW - 48) + ' ' + (PH - 48)} style={{ position: 'absolute', inset: 0 }}>
        <path
          d="M30 232 c40 -9 92 -11 136 -5 c18 2 30 5 40 9"
          fill="none"
          stroke={INK_PAPER + '0.22)'}
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - markP}
        />
      </svg>
    </Slip>
  );
};

// ④ 空白草稿纸（S02「收进一张视图」的伏笔，不能省）
const BlankSlip: FC<{ start: number; paperOpacity: number }> = ({ start, paperOpacity }) => (
  <Slip start={start} baseRot={0.8} paperOpacity={paperOpacity}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{ position: 'absolute', left: 30, right: 30, top: 74 + i * 44, height: 1, background: INK_PAPER + '0.075)' }} />
    ))}
    <div style={{ position: 'absolute', left: 30, top: 40, width: 8, height: 8, borderRadius: 4, background: INK_PAPER + '0.10)' }} />
  </Slip>
);

// ───────────── 窗格描画 ─────────────
const PaneFrame: FC<{ index: number; paperOpacity: number }> = ({ index, paperOpacity }) => {
  const f = useCurrentFrame();
  const draw = ramp(f, index * 3, index * 3 + 16, EASE.inOut);
  return (
    <svg width={PW} height={PH} viewBox={'0 0 ' + PW + ' ' + PH} style={{ position: 'absolute', inset: 0 }}>
      <rect
        x={1}
        y={1}
        width={PW - 2}
        height={PH - 2}
        rx={WIN.r}
        fill="none"
        stroke={FRAME_LINE}
        strokeWidth={2}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

// 星光：4 角星 + 两道射线（全片 3 次之一，单点）
const Star: FC<{ p: number }> = ({ p }) => {
  const sc = interpolate(p, [0, 0.55, 1], [0.35, 1.16, 1], clamp);
  const op = interpolate(p, [0, 0.3], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: SEAM.x - 70,
        top: SEAM.y - 47,
        width: 140,
        height: 94,
        opacity: op,
        transform: 'scale(' + sc + ')',
        transformOrigin: 'center center',
        filter: 'drop-shadow(0 0 18px rgba(255,220,50,0.55)) drop-shadow(0 0 46px rgba(255,220,50,0.28))',
      }}
    >
      <svg width={140} height={94} viewBox="0 0 140 94">
        <path d="M70 3 C72.5 33 83 44 112 47 C83 50 72.5 61 70 91 C67.5 61 57 50 28 47 C57 44 67.5 33 70 3 Z" fill={C.yellow} />
        <line x1={2} y1={47} x2={22} y2={47} stroke={C.yellow} strokeWidth={3} strokeLinecap="round" />
        <line x1={118} y1={47} x2={138} y2={47} stroke={C.yellow} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </div>
  );
};

// ───────────── 三拍文字 ─────────────
type Beat = {
  lines: [string, string];
  caption: string;
  label: string;
  in1: number;
  in2: number;
  capIn: number;
  capOut: number;
  labIn: number;
  labOut: number;
  out: number;
};

const BEATS: Beat[] = [
  {
    lines: ['一周的订单', '散了几个地方？'],
    caption: '周一晚十点，订单还没对完。',
    label: 'OTA · 微信 · Excel',
    in1: 8,
    in2: 12,
    capIn: 8,
    capOut: 52,
    labIn: 14,
    labOut: 52,
    out: 54,
  },
  {
    lines: ['哪晚空着', '只能翻日历'],
    caption: '翻来覆去，还是拿不准。',
    label: '11 月 · 手写日历（虚构）',
    in1: 66,
    in2: 70,
    capIn: 68,
    capOut: 112,
    labIn: 74,
    labOut: 112,
    out: 112,
  },
  {
    lines: ['周边多少钱', '一个个平台翻'],
    caption: '比完价，笔记写满一页。',
    label: '比价笔记 · 11 月（虚构）',
    in1: 126,
    in2: 130,
    capIn: 128,
    capOut: 160,
    labIn: 134,
    labOut: 160,
    out: 156,
  },
];

const BeatText: FC<{ beat: Beat; collapseFade: number }> = ({ beat, collapseFade }) => {
  const f = useCurrentFrame();
  const outP = ramp(f, beat.out, beat.out + 6, EASE.inOut);
  const beatOpacity = 1 - outP;
  if (beatOpacity <= 0.001) return null;
  const capIn = ramp(f, beat.capIn, beat.capIn + 10, EASE.out);
  const capOut = 1 - ramp(f, beat.capOut, beat.capOut + 8, EASE.soft);
  const captionOpacity = capIn * capOut;
  const labIn = ramp(f, beat.labIn, beat.labIn + 10, EASE.out);
  const labOut = 1 - ramp(f, beat.labOut, beat.labOut + 8, EASE.soft);
  const leadP = ramp(f, beat.capIn - 4, beat.capIn + 6, EASE.inOut);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: beatOpacity * collapseFade }}>
      <div style={{ position: 'absolute', left: 140, top: 462, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PressLine text={beat.lines[0]} start={beat.in1} />
        <PressLine text={beat.lines[1]} start={beat.in2} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 762,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: captionOpacity,
          transform: 'translateY(' + (1 - capIn) * 10 + 'px)',
        }}
      >
        <div style={{ width: 34 * leadP, height: 2, background: 'rgba(255,255,255,0.38)' }} />
        <div style={{ fontFamily: FONT.zh, fontSize: 56, fontWeight: 500, lineHeight: 1.4, color: NIGHT_CAPTION, whiteSpace: 'nowrap' }}>
          {beat.caption}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 852,
          fontFamily: FONT.zh,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: NIGHT_LABEL,
          opacity: labIn * labOut,
          transform: 'translateY(' + (1 - labIn) * 8 + 'px)',
        }}
      >
        {beat.label}
      </div>
    </div>
  );
};

// ───────────── 主镜 ─────────────
export const S01: FC = () => {
  const f = useCurrentFrame();

  // 极缓推近（画幅中心为原点，末帧白缝仍钉在装置中心）
  const push = 1 + 0.03 * ramp(f, 0, 180, EASE.inOut);

  // 四格纵向收拢：162–174 → 一条 910 宽、2px 高的白缝；星光 170 首亮
  const collapse = ramp(f, 162, 174, EASE.inOut);
  const sy = 1 - 0.978 * collapse;
  const paperOpacity = 1 - ramp(f, 162, 168, EASE.inOut);
  const seamP = ramp(f, 166, 176, EASE.inOut);
  const seamW = SEAM.w * seamP;
  const starP = ramp(f, 169, 177, EASE.out);
  const collapseFade = 1 - ramp(f, 156, 162, EASE.inOut);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      {/* 夜场：单点 violet 光（裁进画幅），不做泛光 */}
      <div
        style={{
          position: 'absolute',
          left: WIN.x + PW + WIN.gap - 60,
          top: WIN.y - 140,
          width: 900,
          height: 900,
          background: 'radial-gradient(closest-side, rgba(101,84,232,0.20), rgba(101,84,232,0.06) 52%, rgba(101,84,232,0) 72%)',
          opacity: 0.55 + 0.25 * ramp(f, 0, 30, EASE.out),
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 78% 72% at 50% 48%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.34) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, transform: 'scale(' + push + ')', transformOrigin: '960px 540px' }}>
        {/* 装置：四格窗 */}
        <div
          style={{
            position: 'absolute',
            left: WIN.x,
            top: WIN.y,
            width: WIN.w,
            height: WIN.h,
            transform: 'scale(1, ' + sy + ')',
            transformOrigin: 'center center',
          }}
        >
          {[0, 1, 2, 3].map((i) => {
            const pos = panePos(i);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: PW,
                  height: PH,
                  borderRadius: WIN.r,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.018)',
                  opacity: paperOpacity,
                }}
              >
                {i === 1 ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(closest-side, rgba(101,84,232,0.22), rgba(101,84,232,0.04) 60%, rgba(101,84,232,0) 78%)',
                      opacity: ramp(f, 18, 40, EASE.out),
                    }}
                  />
                ) : null}
                {i === 0 ? <OrdersSlip start={8} paperOpacity={paperOpacity} /> : null}
                {i === 1 ? <CalendarSlip start={66} paperOpacity={paperOpacity} /> : null}
                {i === 2 ? <PricesSlip start={126} paperOpacity={paperOpacity} /> : null}
                {i === 3 ? <BlankSlip start={138} paperOpacity={paperOpacity} /> : null}
                <PaneFrame index={i} paperOpacity={paperOpacity} />
              </div>
            );
          })}
        </div>

        {/* 三拍文字 */}
        {BEATS.map((b, i) => (
          <BeatText key={i} beat={b} collapseFade={collapseFade} />
        ))}

        {/* 白缝（handoff: 1405,550 / 910×2） */}
        <div
          style={{
            position: 'absolute',
            left: SEAM.x - seamW / 2,
            top: SEAM.y - 1,
            width: seamW,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 0 18px rgba(255,255,255,0.85), 0 0 64px rgba(255,255,255,0.45), 0 0 150px rgba(255,255,255,0.22)',
            opacity: seamP,
          }}
        />

        {/* 星光首亮：全片 1/3 */}
        {f >= 168 ? <Star p={starP} /> : null}
      </div>

      <Grain opacity={0.03} />
    </AbsoluteFill>
  );
};
