import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import type { FC, ReactNode } from 'react';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { Caption, Grain } from '../core/ui';

/**
 * S06 · 两本账 (585–660f, 2.5s)
 * card-flip-reveal（两卡版，参数照 demos/transition/card-flip-reveal：4f 预备 + 16f 翻 + spring damping15、
 * 194° 过冲、12f 错峰、侧棱 56–124° 受光带随角度扫过、面按 |cos| 压暗）。
 * 正面 = PC-01 / PC-03 顶部真实裁片；翻面 = 结论大数字；黄中缝线来自 S05 的 T4b。
 * 末 8f 右卡缩小 + dim（T9）：静置 rect 480×300 → ×0.875 = 420×262.5 ≈ handoff.ts cardAt {1140,470,420,260}。
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// 卡片静置 480×300；右卡 T9 缩到 0.875（≈ cardAt 420×262.5，中心不变）
const CW = 480;
const CH = 300;
const Y = 450;
const LEFT_X = 330; // 中心 570
const RIGHT_X = 1110; // 中心 1350 = handoff cardAt 中心
const T9_SCALE = 0.875;
const SEAM_X = 960;

// 正面裁片：560×350 原生像素 → 卡片 480×300（K≈0.857，1x 纹理只降不升）；
// 左右卡都从指标单元格边界起裁，避免半个数字/半个字被卡边切断
const CROP_W = 560;
const CROP_H = 350;
const K = CW / CROP_W;

const angleAt = (f: number, s: number) => {
  const t = f - s;
  if (t <= 0) return 0;
  if (t < 4) return -10 * ramp(t, 0, 4, EASE.out);
  if (t < 20) return -10 + 204 * ramp(t, 4, 20, Easing.bezier(0.55, 0, 0.3, 1));
  const settle = spring({ frame: t - 20, fps: 30, config: { damping: 15, stiffness: 190, mass: 1 } });
  return 194 - 14 * settle;
};

// 面受光：面按偏离正面压暗；56–124° 区间一道随角度从左扫到右的窄受光（物理光照，不是额外 glint）
const FaceLight: FC<{ angle: number; dark: boolean }> = ({ angle, dark }) => {
  const c = Math.abs(Math.cos((angle * Math.PI) / 180));
  const shade = (1 - c) * (dark ? 0.5 : 0.38);
  const band = Math.max(0, 1 - Math.abs(angle - 90) / 34);
  const pos = Math.min(1, Math.max(0, (angle - 56) / 68)) * 140 - 20;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: shade, pointerEvents: 'none' }} />
      {band > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: band * (dark ? 0.4 : 0.3),
            background: 'linear-gradient(100deg, rgba(255,255,255,0) ' + (pos - 14) + '%, rgba(255,255,255,0.85) ' + pos + '%, rgba(255,255,255,0) ' + (pos + 14) + '%)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </>
  );
};

const FrontFace: FC<{ src: string; cropX: number; cropY: number; pageH: number }> = ({ src, cropX, cropY, pageH }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: 26,
      overflow: 'hidden',
      background: '#ffffff',
      border: '1px solid ' + C.line,
      boxShadow: SHADOW.card,
    }}
  >
    <Img
      src={staticFile(src)}
      style={{ position: 'absolute', left: -cropX * K, top: -cropY * K, width: 1440 * K, height: pageH * K, display: 'block' }}
    />
    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }} />
  </div>
);

const BackFace: FC<{ kicker: string; value: string; valueSize: number; subLines: string[]; land: number }> = ({
  kicker,
  value,
  valueSize,
  subLines,
  land,
}) => {
  const f = useCurrentFrame();
  const num = ramp(f, land - 6, land + 2, EASE.out);
  const label = ramp(f, land, land + 6, EASE.out);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 26,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%)',
        border: '1px solid ' + C.line,
        boxShadow: SHADOW.card,
        padding: '28px 30px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: label }}>
        <span style={{ width: 9, height: 9, borderRadius: 5, background: C.violet, display: 'inline-block' }} />
        <span style={{ fontFamily: FONT.zh, fontSize: 34, fontWeight: 600, color: C.violet, letterSpacing: '0.02em' }}>{kicker}</span>
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: FONT.num,
          fontSize: valueSize,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: C.ink,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          transform: 'scale(' + (1.08 - 0.08 * num) + ')',
          transformOrigin: 'left center',
        }}
      >
        {value}
      </div>
      <div style={{ position: 'absolute', left: 30, right: 26, bottom: 26 }}>
        {subLines.map((t, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT.zh,
              fontSize: 34,
              fontWeight: 500,
              lineHeight: 1.35,
              color: i === 0 ? C.ink : C.muted,
              opacity: label,
              transform: 'translateY(' + (1 - label) * 8 + 'px)',
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

const FlipCard: FC<{ side: 'left' | 'right'; frame: number; front: ReactNode; back: ReactNode; s: number }> = ({ side, frame, front, back, s }) => {
  const angle = angleAt(frame, s);
  const lift = Math.max(0, Math.sin((Math.min(180, Math.max(0, angle)) * Math.PI) / 180));
  const enter = Math.min(1, Math.max(0, (frame - s) / 20));
  const offset = (1 - enter) * 70;
  const x = side === 'left' ? LEFT_X + offset : RIGHT_X - offset;
  // T9：右卡背面缩小 + dim，末帧视觉 rect ≈ handoff cardAt
  const t9 = side === 'right' ? ramp(frame, 67, 75, EASE.inOut) : 0;
  const shrink = 1 - (1 - T9_SCALE) * t9;
  const dim = 1 - 0.3 * t9;
  const fadeIn = ramp(frame, 0, 5, EASE.out);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: Y,
        width: CW,
        height: CH,
        perspective: 1600,
        opacity: fadeIn * dim,
        transform: 'scale(' + shrink + ')',
        transformOrigin: 'center center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: 'translateZ(' + lift * 60 + 'px) rotateY(' + angle + 'deg)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', backfaceVisibility: 'hidden' }}>
          {front}
          <FaceLight angle={angle} dark />
        </div>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {back}
          <FaceLight angle={180 - angle} dark={false} />
        </div>
      </div>
    </div>
  );
};

const PressLine: FC<{ children: ReactNode; start: number }> = ({ children, start }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.zh,
        fontSize: 96,
        fontWeight: 700,
        lineHeight: 1.16,
        letterSpacing: '-0.02em',
        color: C.ink,
        whiteSpace: 'nowrap',
        opacity: p,
        filter: p >= 0.999 ? undefined : 'blur(' + (1 - p) * 6 + 'px)',
        transform: 'translateY(' + (1 - p) * 16 + 'px)',
      }}
    >
      {children}
    </div>
  );
};

export const S06: FC = () => {
  const f = useCurrentFrame();
  // 中缝线从 S05 的整高黄线收进两卡之间（避免穿过大字）
  const seamMorph = ramp(f, 0, 20, EASE.inOut);
  const seamTop = 220 + (Y - 220) * seamMorph;
  const seamH = 640 + (CH - 640) * seamMorph;
  const seamOp = 1 - 0.5 * ramp(f, 20, 40, EASE.inOut) - 0.15 * ramp(f, 67, 75, EASE.inOut);
  const markP = ramp(f, 38, 50, EASE.inOut);
  const labelIn = ramp(f, 54, 64, EASE.out);
  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* 黄中缝线：S05 T4b 交接（960,540 / 4×640）→ 收进两卡之间 */}
      <div
        style={{
          position: 'absolute',
          left: SEAM_X - 2,
          top: seamTop,
          width: 4,
          height: seamH,
          borderRadius: 2,
          background: C.yellow,
          opacity: seamOp,
          boxShadow: '0 0 22px rgba(255,220,50,0.45)',
        }}
      />

      {/* 两本账：左卡已完成 / 右卡未来已订 */}
      <FlipCard
        side="left"
        s={0}
        frame={f}
        front={<FrontFace src="textures/app-workbench.png" cropX={279} cropY={240} pageH={1000} />}
        back={<BackFace kicker="已完成 · 上周" value="¥2,717.66" valueSize={84} subLines={['5 间夜', '平均成交 ¥543.53']} land={20} />}
      />
      <FlipCard
        side="right"
        s={12}
        frame={f}
        front={<FrontFace src="textures/app-analysis.png" cropX={839} cropY={355} pageH={1530} />}
        back={<BackFace kicker="未来已订" value="¥10,802.33" valueSize={76} subLines={['19 间夜']} land={32} />}
      />

      {/* 大字：已订的 / 不等于已赚的（「已赚的」黄块） */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 176, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PressLine start={27}>已订的</PressLine>
        <PressLine start={31}>
          <span>不等于</span>
          <span style={{ position: 'relative', display: 'inline-block', padding: '0 6px' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '0.04em',
                height: '0.56em',
                background: C.yellow,
                borderRadius: 4,
                transform: 'scaleX(' + markP + ')',
                transformOrigin: 'left center',
              }}
            />
            <span style={{ position: 'relative' }}>已赚的</span>
          </span>
        </PressLine>
      </div>

      {/* caption */}
      <Caption text="上周完成 5 间夜，¥2,717.66。" from={48} to={80} bottom={92} />

      {/* 小字 */}
      <div
        style={{
          position: 'absolute',
          right: 140,
          bottom: 30,
          fontFamily: FONT.zh,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: C.muted,
          opacity: labelIn,
        }}
      >
        完成房费 ≠ 实收 / 利润
      </div>

      <Grain opacity={0.015} />
    </AbsoluteFill>
  );
};
