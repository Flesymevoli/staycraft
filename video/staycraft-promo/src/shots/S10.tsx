import React from 'react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, R, SHADOW } from '../core/theme';
import { PAGES } from '../core/layout';
import { Caption } from '../core/ui';

/**
 * S10 · 报告标题（960–1020f，2.0s）
 * Card: typography/marker-underline-title · demo demos/typography/marker-underline-title/MarkerUnderlineTitle.tsx
 * paper 白场；PC-12 报告页 sheet 从右滑入（1.0，不放大，Q2）；DOM 引文两行 96px 即主文字；
 * 马克黄下划线只给第②行的「11 月 8 日至 10 日」（左低右高微上斜，10f 一笔）；f30–60 hold 30f。
 * S10→S11 同页连续：REPORT_SEAM 由 S11 读取（同一页、同一 scroll）。
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / Math.max(1e-6, b - a)));
const ramp = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));

/** 报告页在 S10 末 / S11 初所处的页面坐标（1440 宽页面空间，1:1） */
export const REPORT_SEAM = { pageX: 240, pageTop: 2282 } as const;
const PAGE_TOP = REPORT_SEAM.pageTop;

const Line: React.FC<{ from: number; delay: number; children: React.ReactNode }> = ({ from, delay, children }) => {
  const p = ramp(from, delay, delay + 14);
  return (
    <div
      style={{
        opacity: p,
        filter: 'blur(' + ((1 - p) * 6).toFixed(2) + 'px)',
        transform: 'translateY(' + ((1 - p) * 14).toFixed(1) + 'px) scale(' + (1 + (1 - p) * 0.025).toFixed(4) + ')',
        transformOrigin: 'left center',
      }}
    >
      {children}
    </div>
  );
};

/* 马克笔下划线：变宽笔形 + 毛糙边（确定性 seed），从左到右 10f 一笔画完 */
const Marker: React.FC<{ progress: number }> = ({ progress }) => {
  const p = clamp01(progress);
  return (
    <svg
      width='100%' height='0.30em' viewBox='0 0 100 20' preserveAspectRatio='none'
      style={{ position: 'absolute', left: '-0.05em', right: '-0.05em', bottom: '-0.16em', overflow: 'visible', mixBlendMode: 'multiply' }}
    >
      <defs>
        <clipPath id='s10-marker-clip'>
          <rect x={0} y={-4} width={Math.max(0.01, p * 102)} height={28} />
        </clipPath>
        <filter id='s10-marker-dry' x='-5%' y='-40%' width='110%' height='180%' colorInterpolationFilters='sRGB'>
          <feTurbulence type='fractalNoise' baseFrequency='0.06 0.6' numOctaves={2} seed={7} result='warp' />
          <feDisplacementMap in='SourceGraphic' in2='warp' scale={1.6} xChannelSelector='R' yChannelSelector='G' />
        </filter>
      </defs>
      <g clipPath='url(#s10-marker-clip)'>
        <path
          d='M2 16.2 C 20 15.1, 44 13.2, 66 10.6 C 80 9.1, 92 7.4, 98 6.6'
          fill='none' stroke={C.yellow} strokeWidth={8} strokeLinecap='round' vectorEffect='non-scaling-stroke' filter='url(#s10-marker-dry)'
        />
        <path
          d='M3 18.4 C 24 17.4, 47 15.6, 69 13.1 C 83 11.5, 93 10.1, 98 9.4'
          fill='none' stroke={C.yellow} strokeWidth={3.4} strokeLinecap='round' vectorEffect='non-scaling-stroke' opacity={0.75}
        />
      </g>
    </svg>
  );
};

export const S10: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = ramp(frame, 0, 10);
  const card = ramp(frame, 8, 20);
  const underline = seg(frame, 20, 30, Easing.out(Easing.cubic));
  const labelIn = ramp(frame, 20, 30);
  const pageX = 240 + (1 - slide) * 1680;

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden', fontFamily: FONT.zh }}>
      {/* ── 报告页 sheet（1.0，从右滑入） ── */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: 1440, height: 1080,
          transform: 'translateX(' + pageX.toFixed(2) + 'px)',
          borderRadius: R.card, overflow: 'hidden', background: C.fog,
          border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
        }}
      >
        <Img
          src={staticFile(PAGES.report.src)}
          style={{ position: 'absolute', left: 0, top: -PAGE_TOP, width: 1440, height: PAGES.report.h, display: 'block' }}
        />
        {/* 页面压暗，让 DOM 引文成为唯一读得懂的字（04 §7.1：同文两现抢焦点） */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.30)' }} />
      </div>

      {/* ── 引文卡（纸白底 + 1px 边 + 两层影）：两行 96px 即主文字 ── */}
      <div
        style={{
          position: 'absolute', left: 330, top: 196, width: 1260, minHeight: 400,
          background: C.paper, border: '1px solid ' + C.line, borderRadius: R.card, boxShadow: SHADOW.sheet,
          padding: '46px 50px 42px', boxSizing: 'border-box',
          opacity: card,
          transform: 'translateY(' + ((1 - card) * 18).toFixed(1) + 'px) scale(' + (1 + (1 - card) * 0.03).toFixed(4) + ')',
          transformOrigin: '50% 40%',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', color: C.ink, whiteSpace: 'nowrap' }}>
          <Line from={frame} delay={8}>未来七天已订出过半</Line>
          <Line from={frame} delay={12}>
            <span>空档在 </span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              11 月 8 日至 10 日
              <Marker progress={underline} />
            </span>
          </Line>
        </div>
        <div
          style={{
            marginTop: 22, display: 'flex', alignItems: 'center', gap: 14,
            fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.muted, letterSpacing: '0.02em',
            opacity: labelIn,
          }}
        >
          <span style={{ width: 26, height: 2, background: C.violet, display: 'inline-block' }} />
          报告标题原文 · 模拟经营数据
        </div>
      </div>

      {/* 底部白雾 scrim：caption 可读，同时给 sheet 一个收口 */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 300,
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.94) 44%, #ffffff 74%)',
        }}
      />
      <Caption text='先给结论，再给依据。' from={18} to={300} bottom={72} />
    </AbsoluteFill>
  );
};
