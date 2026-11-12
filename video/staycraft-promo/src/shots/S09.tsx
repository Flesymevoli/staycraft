import React from 'react';
import { AbsoluteFill, Easing, spring, useCurrentFrame } from 'remotion';
import { C, FONT } from '../core/theme';
import { Caption } from '../core/ui';

/**
 * S09 · 价格位置（870–960f，3.0s）
 * Card: data/timeline-travel · demo demos/data/timeline-travel/TimelineTravel.tsx
 * 改版为「价格轴装置」：无页面 chrome / 无浏览器窗 / 无卡片底，只留刻度 + 报价点 + 区间带。
 * 相机沿轴缓起→冲刺→急刹（输入断点 [0,0.15,0.88,1]→输出 [0,0.055,0.9,1]），f50 急停，f50–60 推近 1.28。
 * 5 个报价点 f7/14/21/26/30 依次弹立（间隔递减）；区间带 520–760 f30–42 展开；
 * 黄括注 f40–52、chip f46–56、violet 细下划线 f50–58、caption f54；hold f56–90（34f）。
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

/* 世界坐标：¥100 → x 120，¥800 → x 2920（4px / ¥），轴 y = 700（定义域 100–800 是视觉留白） */
const AXIS_Y = 700;
const X0 = 120;
const PXPY = 4;
const wx = (yen: number) => X0 + (yen - 100) * PXPY;
const WX = { left: 120, right: 2920 };
const CAM = { startCx: 0, endCx: 2280 };

const inOutQuad = Easing.inOut(Easing.quad);
/* 变速曲线：输入断点 [0,0.15,0.88,1] → 输出 [0,0.055,0.9,1]（逐段 inOutQuad） */
const travelEase = (t: number) => {
  const K: [number, number][] = [[0, 0], [0.15, 0.055], [0.88, 0.9], [1, 1]];
  const q = clamp01(t);
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i][0];
    const b = K[i][1];
    const c = K[i + 1][0];
    const d = K[i + 1][1];
    if (q <= c || i === K.length - 2) {
      const u = clamp01((q - a) / Math.max(1e-6, c - a));
      return b + (d - b) * inOutQuad(u);
    }
  }
  return 1;
};

/* 弹立帧：低四价在相机掠过时依次弹起（8/13/18/23），¥621 在进入画面中央时弹起（34） */
const QUOTES = [
  { yen: 124, at: 7 },
  { yen: 187, at: 14 },
  { yen: 212, at: 21 },
  { yen: 257, at: 26 },
  { yen: 621, at: 30 },
];
const BAND = { from: 520, to: 760 };

const QuotePoint: React.FC<{ frame: number; yen: number; at: number; cx: number; zoom: number }> = ({ frame, yen, at, cx, zoom }) => {
  if (frame < at) return null;
  const s = spring({ frame: frame - at, fps: 30, config: { damping: 11, stiffness: 160, mass: 0.9 }, durationInFrames: 26 });
  const x = wx(yen);
  const stem = 80 * Math.min(1.08, s);
  /* 出画时淡出：避免标签被画幅左边裁成半个字 */
  const screenX = 960 + (x - cx) * zoom;
  const edge = clamp01((screenX - 20) / 90);
  if (edge <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: 0, opacity: edge }}>
      <div style={{ position: 'absolute', left: -1.5, top: AXIS_Y - 10, width: 3, height: 20, background: C.violet, borderRadius: 2, opacity: clamp01(s) }} />
      <div style={{ position: 'absolute', left: -1, top: AXIS_Y - stem, width: 2, height: stem, background: C.violet, opacity: 0.55 }} />
      <div
        style={{
          position: 'absolute', left: 0, top: AXIS_Y - stem - 70, transform: 'translate(-50%, 0) scale(' + clamp01(0.6 + s * 0.4).toFixed(3) + ')',
          transformOrigin: '50% 100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: clamp01(s * 1.3),
        }}
      >
        <div
          style={{
            fontFamily: FONT.num, fontVariantNumeric: 'tabular-nums', fontSize: 40, fontWeight: 600,
            color: C.violet, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
          }}
        >
          {'¥' + yen}
        </div>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: C.violet, boxShadow: '0 0 0 5px rgba(101,84,232,0.14)' }} />
      </div>
    </div>
  );
};

const Axis: React.FC<{ frame: number }> = ({ frame }) => {
  const on = ramp(frame, 0, 18);
  const majors: number[] = [];
  for (let v = 100; v <= 800; v += 100) majors.push(v);
  const minors: number[] = [];
  for (let v = 100; v <= 800; v += 25) if (v % 100 !== 0) minors.push(v);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 3040, height: 1080 }}>
      <div
        style={{
          position: 'absolute', left: WX.left, top: AXIS_Y - 1, width: WX.right - WX.left, height: 2,
          background: C.ink, opacity: 0.32 * on, transform: 'scaleX(' + on.toFixed(4) + ')', transformOrigin: 'left center',
        }}
      />
      {minors.map((v: number) => (
        <div key={'m' + v} style={{ position: 'absolute', left: wx(v) - 2, top: AXIS_Y - 2, width: 4, height: 4, borderRadius: 2, background: C.ink, opacity: 0.22 * on }} />
      ))}
      {majors.map((v: number) => (
        <React.Fragment key={'M' + v}>
          <div style={{ position: 'absolute', left: wx(v) - 1, top: AXIS_Y, width: 2, height: 12, background: C.ink, opacity: 0.4 * on }} />
          <div
            style={{
              position: 'absolute', left: wx(v), top: AXIS_Y + 22, transform: 'translateX(-50%)',
              fontFamily: FONT.num, fontVariantNumeric: 'tabular-nums', fontSize: 34, fontWeight: 500,
              color: C.muted, opacity: on, letterSpacing: '-0.01em',
            }}
          >
            {v === 100 ? '¥100' : v === 800 ? '¥800' : '¥' + v}
          </div>
        </React.Fragment>
      ))}
      <svg width={3040} height={1080} style={{ position: 'absolute', inset: 0, opacity: on, pointerEvents: 'none' }}>
        <path
          d={'M ' + (WX.left - 56) + ' ' + (AXIS_Y - 56) + ' C ' + (WX.left - 16) + ' ' + (AXIS_Y - 26) + ', ' + (WX.left - 16) + ' ' + (AXIS_Y + 26) + ', ' + (WX.left - 56) + ' ' + (AXIS_Y + 56)}
          fill='none' stroke={C.yellow} strokeWidth={6} strokeLinecap='round'
        />
        <path
          d={'M ' + (WX.right + 56) + ' ' + (AXIS_Y - 56) + ' C ' + (WX.right + 16) + ' ' + (AXIS_Y - 26) + ', ' + (WX.right + 16) + ' ' + (AXIS_Y + 26) + ', ' + (WX.right + 56) + ' ' + (AXIS_Y + 56)}
          fill='none' stroke={C.yellow} strokeWidth={6} strokeLinecap='round'
        />
      </svg>
    </div>
  );
};

export const S09: React.FC = () => {
  const frame = useCurrentFrame();
  const travel = clamp01(frame / 50);
  const cx = CAM.startCx + travelEase(travel) * (CAM.endCx - CAM.startCx);
  const zoom = 1 + 0.28 * ramp(frame, 50, 60);
  const titleIn = ramp(frame, 2, 20);
  const bandP = ramp(frame, 30, 42);
  /* 区间带从区间中点向两端展开，避免读成进度条 */
  const bandMidW = (wx(BAND.from) + wx(BAND.to)) / 2;
  const bandFrom = bandMidW - (bandMidW - wx(BAND.from)) * bandP;
  const bandTo = bandMidW + (wx(BAND.to) - bandMidW) * bandP;
  const chipIn = ramp(frame, 46, 56);
  const underline = seg(frame, 50, 58, Easing.out(Easing.cubic));
  const ring = seg(frame, 46, 60, Easing.out(Easing.cubic));
  const bracketP = seg(frame, 40, 52, Easing.out(Easing.cubic));
  const labelIn = ramp(frame, 38, 50);
  const bandMid = bandMidW;

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden', fontFamily: FONT.zh }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: 'translate(' + (960 - cx * zoom).toFixed(2) + 'px, ' + (540 - 540 * zoom).toFixed(2) + 'px) scale(' + zoom.toFixed(5) + ')',
          transformOrigin: '0 0',
        }}
      >
        <Axis frame={frame} />
        {bandP > 0.001 && (
          <div
            style={{
              position: 'absolute', left: bandFrom, top: AXIS_Y - 14, width: Math.max(2, bandTo - bandFrom), height: 28,
              borderRadius: 14, background: C.violet, opacity: 0.94,
              boxShadow: '0 6px 18px -8px rgba(101,84,232,0.6)',
            }}
          />
        )}
        {ring > 0.001 && ring < 0.999 && (
          <div
            style={{
              position: 'absolute', left: bandMid, top: AXIS_Y,
              width: 20 + 180 * ring, height: 20 + 180 * ring, marginLeft: -(10 + 90 * ring), marginTop: -(10 + 90 * ring),
              borderRadius: '50%', border: '2px solid ' + C.violet, opacity: 0.32 * (1 - ring),
            }}
          />
        )}
        {QUOTES.map((q) => (
          <QuotePoint key={q.yen} frame={frame} yen={q.yen} at={q.at} cx={cx} zoom={zoom} />
        ))}
        <div
          style={{
            position: 'absolute', left: wx(BAND.from), top: AXIS_Y - 64, opacity: labelIn,
            fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.02em', whiteSpace: 'nowrap',
          }}
        >
          本店挂牌价 · 5 间在售
        </div>
        <svg width={3040} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <path
            d={'M ' + wx(BAND.from) + ' ' + (AXIS_Y + 72) + ' V ' + (AXIS_Y + 104) + ' H ' + (wx(BAND.from) + (wx(BAND.to) - wx(BAND.from)) * bracketP) + ' V ' + (AXIS_Y + 72)}
            fill='none' stroke={C.yellow} strokeWidth={6} strokeLinecap='round' strokeLinejoin='round'
            opacity={bracketP > 0 ? 1 : 0}
          />
        </svg>
      </div>
      <div
        style={{
          position: 'absolute', left: 140, top: 116,
          opacity: titleIn, filter: 'blur(' + ((1 - titleIn) * 6).toFixed(2) + 'px)',
          transform: 'translateY(' + ((1 - titleIn) * 14).toFixed(1) + 'px)',
          fontSize: 104, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.02em', color: C.ink,
        }}
      >
        <div>我的价格</div>
        <div>
          落在<span style={{ position: 'relative', display: 'inline-block' }}>区间内
            <div
              style={{
                position: 'absolute', left: '-0.02em', right: '-0.02em', bottom: '-0.06em', height: 3,
                background: C.violet, transform: 'scaleX(' + underline.toFixed(4) + ')', transformOrigin: 'left center',
              }}
            />
          </span>
        </div>
      </div>
      <Caption text='挂牌 ¥520–760，与周边范围重叠。' from={54} to={300} bottom={64} />
    </AbsoluteFill>
  );
};
