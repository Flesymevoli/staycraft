import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import React from 'react';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { ANALYSIS, MARKET, PROMO, REPORT } from '../core/layout';
import type { Rect } from '../core/layout';
import { HANDOFF } from '../core/handoff';

/**
 * S16 · 品牌收尾 (1620–1800f, 180f) — card: outro-group-photo-launch (outro)
 * 全片能量最高点：六枚真实元素裁片沿品牌黄弧线飞入围成半环，落定后字标先退后
 * 排（opacity −12% / saturate −8%），tagline 两行压印，原始 logo PNG 760px 整枚
 * 压印（f99–101 曝光脉冲 = 整画面冲击 #2），hold 45f，末 20f 极缓推近 1→1.01。
 *
 * T8：S15 的推广草稿卡在 f90 停在这个手递点的屏幕坐标上，S16 从同一位置接住
 * （S15_TO_S16），沿同一条弧线飞进合影队列 —— 接缝无跳变。
 * 适配（已记录）：demo 的 crane rotateX 4°→0 与整层 scale 1.06→1 会破坏 T8 手递的
 * 屏幕坐标，因此改用"整层 scale 1.02→1.0 的前 24f 落机位"（位置与大小在交接帧
 * 已反算补偿）；元素飞入的真过冲 bezier(0.34,1.4,0.44,1)、方向性运动模糊、
 * 落地压实、舞台光、≤20 颗确定性金尘均按卡保留。字标段用整枚 logo PNG。
 */
const DUR = 180;
const FLY_EASE = Easing.bezier(0.34, 1.4, 0.44, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── deterministic dust (20 motes; all params index-derived) ──
const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 439 + 137) % 1920,
  y0: (i * 613 + 271) % 1080,
  rise: 0.26 + (i % 5) * 0.1,
  swayAmp: 9 + (i % 4) * 5,
  swayFreq: 0.022 + (i % 3) * 0.008,
  phase: (i * 0.83) % (Math.PI * 2),
  size: 2.8 + (i % 3) * 1.0,
  opacity: 0.34 + ((i * 7) % 5) * 0.09,
}));

// ── local directional motion blur (adapted from the recipe's SpeedBlur) ──
const SpeedBlur: React.FC<{ vx: number; vy?: number; amount?: number; max?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  vx, vy = 0, amount = 0.3, max = 22, children, style,
}) => {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const speed = Math.hypot(vx, vy);
  const sd = Math.min(max, speed * amount);
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };
  if (sd < 0.35) return <div style={{ ...fill, ...style }}>{children}</div>;
  const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
  const id = 'sb-' + rid;
  return (
    <div style={{ ...fill, ...style }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} edgeMode="none" />
        </filter>
      </svg>
      <div style={{ ...fill, transform: `rotate(${deg}deg)`, filter: `url(#${id})` }}>
        <div style={{ ...fill, transform: `rotate(${-deg}deg)` }}>{children}</div>
      </div>
    </div>
  );
};

// ── real-screenshot element crop ──
const Crop: React.FC<{ src: string; pageH: number; r: Rect; s: number; pageW?: number }> = ({ src, pageH, r, s, pageW = 1440 }) => (
  <div
    style={{
      position: 'absolute', inset: 0, backgroundColor: '#fff',
      backgroundImage: `url(${staticFile(src)})`,
      backgroundSize: `${pageW * s}px ${pageH * s}px`,
      backgroundPosition: `${-r.x * s}px ${-r.y * s}px`,
      backgroundRepeat: 'no-repeat',
    }}
  />
);

/** 四格窗小卡：品牌母题（几何，不是截图；01 §3.3 窗格 = 信息来源） */
const WindowCard: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#ffffff', borderRadius: 18, padding: 16, boxSizing: 'border-box' }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10 }}>
      {[0, 1, 2, 3].map((k) => (
        <div
          key={k}
          style={{
            borderRadius: 10,
            border: '2px solid ' + C.violetDeep,
            background: k === 3 ? 'rgba(255,220,50,0.92)' : 'rgba(101,84,232,0.04)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)',
          }}
        />
      ))}
    </div>
  </div>
);

type FlyEl = {
  key: string;
  w: number;
  h: number;
  cx: number;
  cy: number;
  start: { x: number; y: number };
  rotFinal: number;
  rotStart: number;
  cue: number;
  startScale: number;
  fadeIn: number;
  node: React.ReactNode;
};

// arcs: ellipse centre (960,560) rx 680 ry 480, from 165° to 15°
const ARC = { cx: 960, cy: 560, rx: 680, ry: 480 };
const arcPt = (deg: number) => ({
  x: ARC.cx + ARC.rx * Math.cos((deg * Math.PI) / 180),
  y: ARC.cy - ARC.ry * Math.sin((deg * Math.PI) / 180),
});
const A1 = arcPt(165);
const A2 = arcPt(15);

export const S16: React.FC = () => {
  const f = useCurrentFrame();

  // camera settles into its position over the first 24f, then keeps a very slow push
  const slowPush = interpolate(f, [36, 158], [0, 0.012], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const camScale = 1.02 - 0.02 * EASE.out(clamp01(f / 24)) + slowPush;
  const INV = 1 / 1.02;

  const T8 = HANDOFF.s15_to_s16.card;
  const promoStart = {
    x: 960 + (T8.x - 960) * INV,
    y: 540 + (T8.y - 540) * INV,
    scale: T8.scale * INV,
    rot: T8.rot,
  };

  const ELS: FlyEl[] = [
    {
      key: 'promo', w: 300, h: 158, cx: 1481, cy: 251,
      start: { x: promoStart.x, y: promoStart.y },
      rotFinal: -4, rotStart: promoStart.rot, cue: 0, startScale: promoStart.scale, fadeIn: 1,
      node: <Crop src={PROMO.pageTraffic.src} pageH={PROMO.pageTraffic.h} r={PROMO.draftsCard} s={0.2732} />,
    },
    {
      key: 'phone', w: 210, h: 377, cx: 303, cy: 436,
      start: { x: -140, y: 540 }, rotFinal: -6, rotStart: -15, cue: 6, startScale: 1.12, fadeIn: 0,
      node: <Crop src={'textures/m-promo.png'} pageH={2694} r={{ x: 0, y: 0, w: 390, h: 700 }} s={210 / 390} pageW={390} />,
    },
    {
      key: 'window', w: 260, h: 205, cx: 410, cy: 205,
      start: { x: 150, y: -210 }, rotFinal: 3, rotStart: 9, cue: 9, startScale: 1.12, fadeIn: 0,
      node: <WindowCard />,
    },
    {
      key: 'chart', w: 340, h: 202, cx: 700, cy: 165,
      start: { x: 590, y: -290 }, rotFinal: -2, rotStart: -8, cue: 12, startScale: 1.12, fadeIn: 0,
      node: <Crop src={ANALYSIS.page.src} pageH={ANALYSIS.page.h} r={ANALYSIS.chartCard} s={340 / 1118} />,
    },
    {
      key: 'price', w: 340, h: 133, cx: 1612, cy: 430,
      start: { x: 2080, y: 520 }, rotFinal: 4, rotStart: 11, cue: 15, startScale: 1.12, fadeIn: 0,
      node: <Crop src={MARKET.page.src} pageH={MARKET.page.h} r={{ x: 279, y: 834, w: 1098, h: 430 }} s={340 / 1098} />,
    },
    {
      key: 'report', w: 330, h: 187, cx: 1240, cy: 158,
      start: { x: 1500, y: -170 }, rotFinal: 2, rotStart: 8, cue: 18, startScale: 1.12, fadeIn: 0,
      node: <Crop src={REPORT.page.src} pageH={REPORT.page.h} r={{ x: 352, y: 560, w: 740, h: 420 }} s={330 / 740} />,
    },
  ];

  const posAt = (el: FlyEl, fr: number) => {
    const t = interpolate(fr, [el.cue, el.cue + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE });
    return [lerp(el.start.x, el.cx, t), lerp(el.start.y, el.cy, t)];
  };

  // recede: settled elements step back when the wordmark takes the stage
  const recede = interpolate(f, [70, 82], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // arc draws with the flight, then fades
  const arcP = interpolate(f, [0, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const arcOp = interpolate(f, [30, 52], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // tagline + logo + pulse
  const tag1 = interpolate(f, [75, 93], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const tag2 = interpolate(f, [79, 97], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const stamp = interpolate(f, [99, 113], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const stampIn = interpolate(f, [99, 101], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const stampBlur = interpolate(f, [99, 104], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const stageLight = interpolate(f, [34, 72, 100, 110, 124], [0, 0.22, 0.56, 0.72, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = interpolate(f, [99, 100, 101.5], [0, 0.46, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const smallP = interpolate(f, [102, 116], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const pushT = clamp01((f - 160) / 20);
  const finalPush = 1 + 0.01 * EASE.inOut(pushT);

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
      {/* warm paper stage: barely-there radial + vignette, then the closing push */}
      <AbsoluteFill style={{ transform: `scale(${finalPush.toFixed(5)})`, transformOrigin: '50% 50%' }}>
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 64% at 50% 46%, #ffffff 0%, #ffffff 52%, #f7f7f9 100%)' }} />

        {/* stage light behind the logo */}
        {stageLight > 0 ? (
          <AbsoluteFill
            style={{
              background: 'radial-gradient(860px 470px at 960px 492px, rgba(255,246,214,0.92), rgba(255,246,214,0.42) 52%, rgba(255,246,214,0) 76%)',
              opacity: stageLight,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {/* ── group photo layer (shares the 24f camera settle) ── */}
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${camScale.toFixed(5)})`, transformOrigin: '960px 540px' }}>
          {/* brand arc: the flight trajectory, 6px yellow, only as motion */}
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: arcOp, pointerEvents: 'none' }}>
            <path
              d={`M ${A1.x.toFixed(1)} ${A1.y.toFixed(1)} A 680 480 0 0 1 ${A2.x.toFixed(1)} ${A2.y.toFixed(1)}`}
              fill="none" stroke={C.yellow} strokeWidth={6} strokeLinecap="round"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arcP}
            />
          </svg>

          {ELS.map((el) => {
            if (f < el.cue) return null;
            const t = interpolate(f, [el.cue, el.cue + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE });
            const opacity = el.fadeIn > 0 ? el.fadeIn : interpolate(f, [el.cue, el.cue + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const air = Math.max(0, 1 - t);
            const x = el.start.x * (1 - t) + el.cx * t;
            const y = el.start.y * (1 - t) + el.cy * t;
            const rot = el.rotStart * (1 - t) + el.rotFinal * t;
            const scale = lerp(el.startScale, 1, t);
            const [vx, vy] = [posAt(el, f + 0.5)[0] - posAt(el, f - 0.5)[0], posAt(el, f + 0.5)[1] - posAt(el, f - 0.5)[1]];
            const land = interpolate(f, [el.cue + 9, el.cue + 12, el.cue + 16], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const shadow = air > 0.01
              ? `0 ${10 + 26 * air}px ${24 + 46 * air}px rgba(30,25,18,${0.16 + 0.1 * air}), 0 2px 6px rgba(30,25,18,0.08)`
              : '0 10px 24px rgba(30,25,18,0.16), 0 2px 6px rgba(30,25,18,0.08)';
            return (
              <SpeedBlur key={el.key} vx={vx} vy={vy} amount={0.3} max={22}>
                <div
                  style={{
                    position: 'absolute', left: el.cx - el.w / 2, top: el.cy - el.h / 2, width: el.w, height: el.h,
                    transform: `translate(${(x - el.cx).toFixed(2)}px, ${(y - el.cy).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${(scale * (1 - 0.015 * land)).toFixed(4)})`,
                    transformOrigin: 'center center',
                    borderRadius: 18, overflow: 'hidden',
                    border: '1px solid rgba(24,24,27,0.07)',
                    boxShadow: land > 0.01 ? `0 ${10 - 5 * land}px ${24 - 12 * land}px rgba(30,25,18,${0.16 + 0.06 * land}), 0 2px 6px rgba(30,25,18,${0.08 + 0.06 * land})` : shadow,
                    opacity: opacity * (1 - 0.12 * recede),
                    filter: `saturate(${(1 - 0.08 * recede).toFixed(3)})`,
                  }}
                >
                  {el.node}
                </div>
              </SpeedBlur>
            );
          })}
        </div>

        {/* gold dust in front of the group photo (≤20, deterministic) */}
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {DUST.map((d, i) => {
            const y = (((d.y0 - f * d.rise) % 1080) + 1080) % 1080;
            const x = d.x + Math.sin(f * d.swayFreq + d.phase) * d.swayAmp;
            const twinkle = 0.7 + 0.3 * Math.sin(f * 0.21 + d.phase * 3);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', left: x, top: y, width: d.size, height: d.size, borderRadius: '50%',
                  background: 'rgba(255,214,66,0.9)',
                  opacity: d.opacity * twinkle * 0.9,
                  boxShadow: `0 0 ${d.size * 2.5}px ${d.size * 0.6}px rgba(255,214,66,0.55)`,
                }}
              />
            );
          })}
        </AbsoluteFill>

        {/* ── tagline (f75–99, two lines 96px 压印) ── */}
        <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 662, left: 0, right: 0, textAlign: 'center' }}>
            {['看清信息', '让经营更有方向'].map((line, i) => {
              const p = i === 0 ? tag1 : tag2;
              return (
                <div
                  key={line}
                  style={{
                    fontFamily: FONT.zh, fontSize: 96, fontWeight: 700, lineHeight: 1.14, letterSpacing: '-0.02em', color: C.ink,
                    opacity: p, filter: `blur(${(1 - p) * 6}px)`,
                    transform: `translateY(${(1 - p) * 16}px) scale(${(1.06 - 0.06 * p).toFixed(4)})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>

        {/* ── original logo PNG: 760px, whole-stamp, no recolour/no per-letter ── */}
        <div
          style={{
            position: 'absolute', left: 960, top: 500, width: 760, marginLeft: -380, marginTop: -126.5,
            opacity: stampIn,
            transform: `scale(${(1.06 - 0.06 * stamp).toFixed(4)})`,
            filter: `blur(${((1 - stampBlur) * 9).toFixed(2)}px)`,
          }}
        >
          <Img src={staticFile('brand/staycraft-logo.png')} style={{ width: 760, display: 'block' }} />
        </div>

        {/* exposure pulse on the stamp: whole-frame冲击 #2, 2.5f, not a white flash */}
        {pulse > 0 ? (
          <AbsoluteFill
            style={{
              background: 'radial-gradient(ellipse 70% 62% at 50% 46%, rgba(255,248,226,0.95) 0%, rgba(255,248,226,0.55) 38%, rgba(255,248,226,0.16) 62%, rgba(255,248,226,0) 78%)',
              opacity: pulse,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {/* small print */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 966, textAlign: 'center',
            fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, letterSpacing: '0.02em', color: C.muted,
            opacity: smallP, transform: `translateY(${(1 - smallP) * 8}px)`,
          }}
        >
          示例数据均为虚构演示
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
