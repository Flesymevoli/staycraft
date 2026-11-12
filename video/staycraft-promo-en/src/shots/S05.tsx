import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { FC } from 'react';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { Grain } from '../core/ui';

/**
 * S05 · The low night (495–585f, 3.0s) — EN cut
 * 已按 04 v2 降级：不取 crash-zoom。背景 = PC-03 页面 blur 8 + dim（承接 T4 的 54.3% 穿透），
 * 前景 = 折线卡 1:1 真实纹理，clip 从左揭示（不描假线）；f30–52 相机位移 1.0→1.15（1x 上限）；
 * f50–56 黄点 pop（其他点被柔光 scrim 压暗）；标注 chip 贴真实数据点（layout.ts: 11-08 = 846,900）；
 * f84–90 T4b：黄点放大成中缝线，交给 S06（黄线 960,540 / 4×640）。
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// 折线卡在 EN 页面中的 bbox（layout.ts ANALYSIS.chartCard = 278,510,1120×665）
// 2x 纹理，显示比例 0.9（下采样）；相机缩放上限 1.22 → 纹理有效 1.098x ≤ 1.5 规则
const CARD = { pageX: 278, pageY: 510, w: 1120, h: 665 };
const DISPLAY = 0.9;
const CARD_W = CARD.w * DISPLAY;
const CARD_H = CARD.h * DISPLAY;
const CARD_LEFT = 600;
const CARD_TOP = 420;
// 11-08 低点（layout.ts lowPoint 845,899）在卡片显示坐标中的位置；相机以此为缩放原点，画面里保持不动
const FOCUS = { x: (845 - CARD.pageX) * DISPLAY, y: (899 - CARD.pageY) * DISPLAY };
const POINT = { x: CARD_LEFT + FOCUS.x, y: CARD_TOP + FOCUS.y };
// S06 中缝线（T4b 终点）
const SEAM = { x: 960, y: 220, w: 4, h: 640 };

const PressLine: FC<{ text: string; start: number; size?: number; color?: string }> = ({ text, start, size = 88, color = C.ink }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.en,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
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

const FadeText: FC<{ text: string; start: number; size?: number; color?: string; weight?: number }> = ({ text, start, size = 56, color = C.muted, weight = 500 }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 10, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.en,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.35,
        color,
        whiteSpace: 'nowrap',
        opacity: p,
        transform: 'translateY(' + (1 - p) * 10 + 'px)',
      }}
    >
      {text}
    </div>
  );
};

export const S05: FC = () => {
  const f = useCurrentFrame();

  // 折线卡揭示：clip 从左
  const reveal = ramp(f, 8, 28, EASE.inOut);
  // 相机位移：1.0 → 1.22（缩放原点是 11-08 低点）
  const zoom = 1 + 0.22 * ramp(f, 30, 52, EASE.inOut);
  // 黄点 pop（4f 起 / 6f 落定）
  const pop = ramp(f, 50, 56, EASE.out);
  const dotScale = interpolate(pop, [0, 0.6, 1], [0.35, 1.2, 1], clamp);
  const ringP = ramp(f, 51, 62, EASE.out);
  const annIn = ramp(f, 52, 58, EASE.out);
  // 背景承接 S04：先白后虚化
  const veil = 0.5 * (1 - ramp(f, 0, 6, EASE.out));
  // 其它点压暗：柔光 scrim（中心留洞）
  const focusIn = ramp(f, 52, 60, EASE.out) * 0.45;
  // T4b：黄点 → 中缝线
  const morph = ramp(f, 84, 90, EASE.inOut);
  const sceneFade = 1 - ramp(f, 82, 89, EASE.inOut);
  const seamLeft = interpolate(morph, [0, 1], [POINT.x - 13, SEAM.x - 2], clamp);
  const seamTop = interpolate(morph, [0, 1], [POINT.y - 13, SEAM.y - SEAM.h / 2], clamp);
  const seamW = interpolate(morph, [0, 1], [26, SEAM.w], clamp);
  const seamH = interpolate(morph, [0, 1], [26, SEAM.h], clamp);

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* 背景：EN analysis 页面 blur 8 + dim（T4 的共享元素环境） */}
      <div style={{ position: 'absolute', inset: 0, filter: 'blur(8px)', transform: 'scale(1.06)' }}>
        <Img
          src={staticFile('textures/app-analysis.png')}
          style={{ position: 'absolute', left: -220, top: -720, width: 2100, display: 'block' }}
        />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 0.55 }} />
      {/* 54.3% 幽灵：上一镜大数字的余像（虚化，做背景纹理） */}
      <div
        style={{
          position: 'absolute',
          left: 690,
          top: 10,
          fontFamily: FONT.num,
          fontSize: 460,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          color: C.ink,
          opacity: 0.055 * (1 - ramp(f, 0, 26, EASE.out)),
          filter: 'blur(6px)',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        54.3%
      </div>
      {/* 承接 S04 末帧白 */}
      <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: veil }} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneFade }}>
        {/* 顶部 scrim：文字带落在雾底上 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 380,
            background: 'linear-gradient(180deg, rgba(244,244,246,0.97) 0%, rgba(244,244,246,0.85) 62%, rgba(244,244,246,0) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* 折线卡：真实纹理，clip 从左揭示 + 相机位移（以低点为原点） */}
        <div
          style={{
            position: 'absolute',
            left: CARD_LEFT,
            top: CARD_TOP,
            width: CARD_W,
            height: CARD_H,
            transform: 'scale(' + zoom + ')',
            transformOrigin: FOCUS.x + 'px ' + FOCUS.y + 'px',
            clipPath: 'inset(0 ' + (1 - reveal) * 100 + '% 0 0)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 26,
              overflow: 'hidden',
              border: '1px solid ' + C.line,
              background: '#ffffff',
              boxShadow: SHADOW.sheet,
              backgroundImage: 'url(' + staticFile('textures/app-analysis.png') + ')',
              backgroundSize: 1440 * DISPLAY + 'px ' + 1530 * DISPLAY + 'px',
              backgroundPosition: -CARD.pageX * DISPLAY + 'px ' + -CARD.pageY * DISPLAY + 'px',
            }}
          >
            {/* 聚焦：其它点被柔光压暗（中心洞在 11-08） */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: focusIn,
                background:
                  'radial-gradient(circle 300px at ' + FOCUS.x + 'px ' + FOCUS.y + 'px, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 62%, rgba(255,255,255,0.92) 100%)',
              }}
            />
            {/* 黄点：DOM 圆点，压在真实数据点上 */}
            <div
              style={{
                position: 'absolute',
                left: FOCUS.x - 13,
                top: FOCUS.y - 13,
                width: 26,
                height: 26,
                borderRadius: 13,
                background: C.yellow,
                border: '3px solid #ffffff',
                boxShadow: '0 0 0 1px rgba(24,24,27,0.10), 0 6px 18px rgba(255,220,50,0.55)',
                transform: 'scale(' + dotScale + ')',
              }}
            />
            {/* 黄点扩散环（单点，一次） */}
            {ringP > 0 && ringP < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: FOCUS.x - 13 - 34 * ringP,
                  top: FOCUS.y - 13 - 34 * ringP,
                  width: 26 + 68 * ringP,
                  height: 26 + 68 * ringP,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,220,50,' + (1 - ringP) * 0.8 + ')',
                }}
              />
            ) : null}
          </div>
        </div>

        {/* 标注 chip：卡片 header 空白带里，引线连到黄点，不挡折线 */}
        <div style={{ opacity: annIn }}>
          <div
            style={{
              position: 'absolute',
              left: 1010,
              top: 430,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 22px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(101,84,232,0.28)',
              boxShadow: '0 8px 24px -12px rgba(24,24,27,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: C.violet, display: 'inline-block' }} />
            <span style={{ fontFamily: FONT.en, fontSize: 34, fontWeight: 500, color: C.ink, letterSpacing: '0.01em' }}>
              11-08 · 20% occupancy · 1 booked
            </span>
          </div>
          {/* 引线：chip → 黄点 */}
          <div style={{ position: 'absolute', left: POINT.x - 0.5, top: 486, width: 1, height: POINT.y - 16 - 486, background: C.violet, opacity: 0.55 }} />
          <div style={{ position: 'absolute', left: POINT.x - 5, top: POINT.y + 10, width: 10, height: 10, borderRadius: 5, border: '2px solid ' + C.violet, background: '#fff' }} />
        </div>

        {/* 大字 + caption + 小字：顶部文字带 */}
        <div style={{ position: 'absolute', left: 120, top: 58 }}>
          <PressLine text="8 November." start={16} />
          <PressLine text="Only one room sold." start={20} />
        </div>
        <div style={{ position: 'absolute', left: 120, top: 268 }}>
          <FadeText text="Four rooms still open." start={36} size={56} color={C.ink} weight={500} />
        </div>
        <div
          style={{
            position: 'absolute',
            right: 140,
            top: 272,
            fontFamily: FONT.en,
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: C.muted,
            opacity: ramp(f, 40, 50, EASE.out),
          }}
        >
          Daily booked occupancy · 11-08 = 20%
        </div>
      </div>

      {/* T4b：黄点放大成中缝线（交给 S06） */}
      {morph > 0 ? (
        <>
          <div style={{ position: 'absolute', inset: 0, background: C.fog, opacity: morph }} />
          <div
            style={{
              position: 'absolute',
              left: seamLeft,
              top: seamTop,
              width: seamW,
              height: seamH,
              borderRadius: 2,
              background: C.yellow,
              boxShadow: '0 0 24px rgba(255,220,50,0.55), 0 0 80px rgba(255,220,50,0.25)',
            }}
          />
        </>
      ) : null}

      <Grain opacity={0.015} />
    </AbsoluteFill>
  );
};
