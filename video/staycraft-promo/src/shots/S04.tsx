import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { FC } from 'react';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { Caption, Grain, YellowMark } from '../core/ui';

/**
 * S04 · 全景 + 数字 (375–495f, 4.0s)
 * crane-rise-reveal 降档（1.15→1.0）：从 PC-03 四指标卡特写，升降臂拉至整页（sidebar + 四指标卡 + 折线卡）。
 * 第一拍大字「5 间房 / 一周 35 个间夜」压印（落定后淡出）；页面白 scrim dim 到 55%，
 * DOM 四数字用 DigitRoll 错峰升起（54.3% 黄块 / 19/35 紫 / ¥10,802.33 ink / ¥568.54 muted），
 * f85 乘式浮出，f85–120 hold。末段 T4：54.3% 放大到全屏，接 S05 的虚化页面底。
 * 卡片参数参照 demos/opening/crane-rise-reveal（zoom 上限按 1x 素材降到 1.15）。
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

const PAGE = { w: 1440, h: 1530 };
const CRANE_EASE = Easing.bezier(0.2, 0, 0.25, 1);
const MOVE_END = 30;

// 相机：特写对准四指标卡中心（838,424）1.15 → 整页 1.0 居中（720,540）
const camAt = (f: number) => {
  const p = ramp(f, 0, MOVE_END, CRANE_EASE);
  const zoom = 1.15 - 0.15 * p;
  const cx = 838 + (720 - 838) * p;
  const cy = 500 + (480 - 500) * p;
  return { left: 960 - cx * zoom, top: 540 - cy * zoom, zoom };
};

const scrim = 'linear-gradient(90deg, rgba(244,244,246,0.96) 0%, rgba(244,244,246,0.86) 34%, rgba(244,244,246,0) 62%)';

// ───────────── DigitRoll（模板同源组件，逐字滚轮；本镜压缩到 16f / 1.5f 错峰以赶上 f85）─────────────
const DIGITS = '0123456789';
const RollNumber: FC<{ value: string; start: number; size: number; color: string }> = ({ value, start, size, color }) => {
  const f = useCurrentFrame();
  const lineH = size * 1.16;
  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
      {value.split('').map((ch, i) => {
        const target = DIGITS.indexOf(ch);
        if (target < 0) {
          return (
            <span key={i} style={{ fontFamily: FONT.num, fontSize: size, fontWeight: 600, lineHeight: lineH + 'px', color, fontVariantNumeric: 'tabular-nums' }}>
              {ch}
            </span>
          );
        }
        const t = interpolate(f, [start + i * 0.5, start + i * 0.5 + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.25, 0.8, 0.25, 1),
        });
        const offset = (10 + target) * t * lineH;
        return (
          <span key={i} style={{ display: 'inline-block', height: lineH }}>
            <span style={{ display: 'block', transform: 'translateY(' + -offset + 'px)' }}>
              {(DIGITS + DIGITS).split('').map((d, j) => (
                <span
                  key={j}
                  style={{ display: 'block', fontFamily: FONT.num, fontSize: size, fontWeight: 600, lineHeight: lineH + 'px', color, fontVariantNumeric: 'tabular-nums' }}
                >
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

type Metric = { value: string; label: string; color: string; top: number; delay: number };
const METRICS: Metric[] = [
  { value: '54.3%', label: '预订占用率', color: C.ink, top: 150, delay: 38 },
  { value: '19 / 35', label: '预订进度', color: C.violet, top: 326, delay: 42 },
  { value: '¥10,802.33', label: '预订金额', color: C.ink, top: 502, delay: 46 },
  { value: '¥568.54', label: '平均预订房价', color: C.muted, top: 678, delay: 50 },
];

const PressLine: FC<{ text: string; start: number; size?: number; color?: string }> = ({ text, start, size = 96, color = C.ink }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.zh,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.16,
        letterSpacing: '-0.02em',
        color,
        whiteSpace: 'nowrap',
        opacity: p,
        filter: p >= 0.999 ? undefined : 'blur(' + (1 - p) * 6 + 'px)',
        transform: 'translateY(' + (1 - p) * 16 + 'px)',
      }}
    >
      {text}
    </div>
  );
};

export const S04: FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const pageDim = 0.6 * ramp(f, 40, 58, EASE.soft);
  const firstBeatOut = 1 - ramp(f, 48, 60, EASE.inOut);
  const scrimIn = ramp(f, 0, 14, EASE.out) * firstBeatOut;
  // 乘式
  const formulaIn = ramp(f, 78, 86, EASE.out);
  // T4：54.3% 放大到全屏
  const grow = ramp(f, 110, 120, EASE.inOut);
  const numFade = 1 - ramp(f, 106, 113, EASE.inOut);
  const hexP = ramp(f, 84, 88, EASE.out);
  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* 页面 sheet（真实截图 + 1px 边 + 26px 圆角 + 两层影） */}
      <div
        style={{
          position: 'absolute',
          left: cam.left,
          top: cam.top,
          width: PAGE.w,
          height: PAGE.h,
          transform: 'scale(' + cam.zoom + ')',
          transformOrigin: '0 0',
          borderRadius: 26,
          overflow: 'hidden',
          border: '1px solid ' + C.line,
          background: '#ffffff',
          boxShadow: SHADOW.sheet,
        }}
      >
        <Img src={staticFile('textures/app-analysis.png')} style={{ position: 'absolute', left: 0, top: 0, width: PAGE.w, height: PAGE.h, display: 'block' }} />
        {/* 页面 dim：白 scrim */}
        <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: pageDim }} />
      </div>

      {/* 左侧 scrim：第一拍大字压在移动中的页面上（§3.7 允许白/雾底 scrim） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 960,
          height: 1080,
          background: scrim,
          opacity: scrimIn,
          pointerEvents: 'none',
        }}
      />

      {/* 第一拍大字 */}
      <div style={{ position: 'absolute', left: 140, top: 300, opacity: firstBeatOut }}>
        <PressLine text="5 间房" start={0} />
        <PressLine text="一周 35 个间夜" start={4} />
      </div>

      {/* 右侧列底衬：让 DOM 数字在页面真实文字上仍干净（白 scrim，§3.7 允许） */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 1000,
          height: 1080,
          background: 'linear-gradient(270deg, rgba(255,255,255,0.66) 0%, rgba(255,255,255,0.42) 52%, rgba(255,255,255,0) 100%)',
          opacity: ramp(f, 38, 54, EASE.soft),
          pointerEvents: 'none',
        }}
      />

      {/* 第二拍：DOM 四数字（右列，右缘 1620，落在页面内） */}
      <div style={{ position: 'absolute', right: 300, top: 0, width: 700, height: 1080 }}>
        {METRICS.map((m, i) => {
          const inP = ramp(f, m.delay, m.delay + 14, EASE.out);
          const isHero = i === 0;
          const pop = isHero ? 1 + grow * 13 : 1;
          const rowOp = isHero ? 1 : numFade;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                right: 0,
                top: m.top,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                opacity: inP * rowOp,
                transform: 'translateY(' + (1 - inP) * 18 + 'px)',
                filter: inP >= 0.999 ? undefined : 'blur(' + (1 - inP) * 6 + 'px)',
              }}
            >
              <div
                style={{
                  transform: isHero ? 'scale(' + pop + ')' : undefined,
                  transformOrigin: 'center center',
                  fontSize: isHero ? 96 : undefined,
                }}
              >
                {isHero ? (
                  <YellowMark from={44}>
                    <RollNumber value={m.value} start={m.delay} size={96} color={m.color} />
                  </YellowMark>
                ) : (
                  <RollNumber value={m.value} start={m.delay} size={96} color={m.color} />
                )}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: FONT.zh,
                  fontSize: 34,
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: C.muted,
                  whiteSpace: 'nowrap',
                  opacity: isHero ? 1 - ramp(f, 108, 115, EASE.inOut) : 1,
                }}
              >
                {m.label}
              </div>
            </div>
          );
        })}

        {/* 乘式：19 间夜 × ¥568.54 = ¥10,802.33（恒等式，不编造分解数） */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 860,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            whiteSpace: 'nowrap',
            opacity: formulaIn,
            transform: 'translateY(' + (1 - formulaIn) * 12 + 'px)',
          }}
        >
          <span style={{ fontFamily: FONT.num, fontSize: 44, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>19 间夜</span>
          <span style={{ fontFamily: FONT.num, fontSize: 40, fontWeight: 500, color: C.violet }}>×</span>
          <span style={{ fontFamily: FONT.num, fontSize: 44, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>¥568.54</span>
          <span style={{ fontFamily: FONT.num, fontSize: 40, fontWeight: 500, color: C.violet }}>≈</span>
          <span style={{ fontFamily: FONT.num, fontSize: 44, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>¥10,802.33</span>
        </div>
      </div>

      {/* 小字：数据口径与示例声明（caption 下方居中，同一条底带） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 24,
          display: 'flex',
          justifyContent: 'center',
          fontFamily: FONT.zh,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: C.muted,
          opacity: hexP,
        }}
      >
        2026-11-05 — 11-11 · 示例数据
      </div>

      {/* 底部解说带：caption + 示例数据压在页面底边时保证可读 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 280,
          background: 'linear-gradient(0deg, rgba(244,244,246,0.94) 0%, rgba(244,244,246,0.72) 46%, rgba(244,244,246,0) 100%)',
          opacity: ramp(f, 52, 70, EASE.soft),
          pointerEvents: 'none',
        }}
      />

      {/* caption */}
      <Caption text="这些是预订，还不是收入。" from={60} to={110} bottom={84} />

      {/* T4 穿透时把画面推向纯白，S05 从白里浮出虚化的页面 */}
      <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 0.0 + 0.5 * ramp(f, 114, 120, EASE.inOut) }} />

      <Grain opacity={0.015} />
    </AbsoluteFill>
  );
};
