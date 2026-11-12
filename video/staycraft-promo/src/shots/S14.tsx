import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { PROMO } from '../core/layout';
import { Caption, YellowMark } from '../core/ui';

/**
 * S14 · 推广两版 (1380–1530f, 150f) — card: segmented-thumb-hero (interaction)
 * 控件即主角：1080×220 语义放大重绘（比例/圆角/字重按 PC-07，不是复刻页面），
 * 130px 描边光标画外滑入 → 按下（0.86 + 涟漪）→ 白 thumb 严格 8f 滑到「引流版」→
 * 新图标 spring 弹出 / 旧图标 6f 塌缩 width 归零。随后草稿窗原地换内容（label +
 * 真实裁片 + 引文一起切到引流版），相机"拉回整页"：真实 PC-08 页从雾中浮现，
 * 控件退场，草稿卡留在场上变成 72px 引文卡（引文即本镜主文字）。
 *
 * 卡内命门全部保留：控件 1080×220 / thumb 8f out(cubic) + 橡皮筋 + 速度模糊 /
 * 光标 24f from off-frame / press 0.86 + 12f 涟漪 / 新图标 spring(d10,s220) /
 * 旧图标 width 同步归零 / 收尾 hold 30f。1x 素材不放大：整页 0.85（≤1.15）。
 */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

const INK = '#18181b';
const DIM = '#8e9097';

// control geometry (semantic close-up)
const CW = 1080;
const CH = 220;
const PAD = 16;
const SEGW = (CW - PAD * 2) / 2;
const TH = CH - PAD * 2;
const CTRL_LEFT = (1920 - CW) / 2;
const CTRL_TOP = 190;

// timeline (relative to shot start 1380)
const CURSOR_IN = 40;
const CLICK = 64;
const SLIDE = 66;
const SLIDE_END = 74;

const ArrowCursor: React.FC<{ x: number; y: number; press: number; opacity: number }> = ({ x, y, press, opacity }) => (
  <svg
    width={130}
    height={150}
    viewBox="0 0 26 30"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - press * 0.14})`,
      transformOrigin: '15% 10%',
      filter: `drop-shadow(0 ${2 - press}px ${3 - press}px rgba(16,18,24,0.22)) drop-shadow(0 ${12 - press * 6}px ${18 - press * 6}px rgba(16,18,24,0.20))`,
    }}
  >
    <path d="M4 2 L4 24 L9.5 18.5 L13 27 L16.8 25.4 L13.3 17 L21 17 Z" fill="#fff" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const PenIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M9 12 H31 M9 20 H31 M9 28 H21" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const SparkIcon: React.FC<{ size: number; color: string; accent: string }> = ({ size, color, accent }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M20 5 L23.4 15.6 L34 19 L23.4 22.4 L20 33 L16.6 22.4 L6 19 L16.6 15.6 Z" stroke={color} strokeWidth={2.6} strokeLinejoin="round" />
    <circle cx={31} cy={30} r={3.4} fill={accent} />
  </svg>
);

export const S14: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // control springs in from +200px (pre-rolled by 8f so the cut frame is not empty)
  const floatT = spring({ frame: f + 8, fps, config: { damping: 14, stiffness: 120, mass: 0.9 } });
  const ctrlY = interpolate(floatT, [0, 1], [200, 0]);

  // cursor: 24f ease-out from off-frame
  const curT = interpolate(f, [CURSOR_IN, CURSOR_IN + 24], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const curX = lerp(2040, 1202, curT);
  const curY = lerp(1260, 310, curT);
  const press = interpolate(f, [CLICK, CLICK + 3, CLICK + 7], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cursorOut = interpolate(f, [92, 102], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // thumb: exactly 8f, out(cubic); lead/trail rubber band + 1.5% settle
  const slide = (fr: number) => interpolate(fr, [SLIDE, SLIDE_END], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const settle = (fr: number) => (fr < SLIDE_END ? 0 : 0.015 * Math.sin(Math.min(1, (fr - SLIDE_END) / 6) * Math.PI) * (1 - Math.min(1, (fr - SLIDE_END) / 6)));
  const leadAt = (fr: number) => slide(fr) + settle(fr);
  const trailAt = (fr: number) => interpolate(fr, [SLIDE, SLIDE_END], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) + settle(fr);
  const thumbT = slide(f);
  const thumbL = PAD + trailAt(f) * SEGW;
  const thumbR = PAD + SEGW + leadAt(f) * SEGW;
  const thumbV = slide(f + 0.5) - slide(f - 0.5);
  const thumbBlur = Math.min(6, Math.abs(thumbV) * 0.06 * SEGW);

  // 到位：新图标 spring 弹出、旧图标 6f 塌缩（width 同步归零）
  const iconIn = spring({ frame: f - SLIDE_END, fps, config: { damping: 10, stiffness: 220, mass: 0.6 } });
  const newIcon = f >= SLIDE_END ? iconIn : 0;
  const oldIcon = interpolate(f, [SLIDE, SLIDE + 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });

  // ripple at cursor tip
  const rippleT = interpolate(f, [CLICK, CLICK + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });

  // labels: colour follows thumb position continuously
  const compAmt = clamp01((thumbT - 0.2) / 0.6);

  // draft window enters just after the control (same stage)
  const cardIn = interpolate(f, [-4, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // content swap: label / real crop / quote change together right after the thumb lands
  const labelSwap = interpolate(f, [74, 84], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.soft });
  const cropSwap = interpolate(f, [74, 86], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const simpleIn = interpolate(f, [40, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const simpleOut = interpolate(f, [74, 82], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const trafficIn = interpolate(f, [78, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // pull back: control leaves, the real page resolves; the draft card stays and becomes the quote card
  const stripOut = interpolate(f, [92, 108], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const controlOut = interpolate(f, [94, 108], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const pageP = interpolate(f, [94, 116], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const captionP = interpolate(f, [104, 118], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  const labelTop = lerp(190, 119, stripOut);
  const quoteTop = lerp(244, 165, stripOut);
  const metaTop = lerp(356, 267, stripOut);

  const labelStyle = (activeAmt: number): React.CSSProperties => ({
    fontFamily: FONT.zh,
    fontWeight: 650,
    fontSize: 60,
    letterSpacing: '-0.02em',
    color: lerpHex(DIM, C.violet, activeAmt),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    width: SEGW,
    height: TH,
    position: 'relative',
    zIndex: 2,
  });

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* soft stage light */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 42% 46% at 50% 32%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)' }} />

      {/* real PC-08 page resolves when the camera pulls back (0.85, 1x-safe) */}
      <div
        style={{
          position: 'absolute', left: 348, top: -1150, width: 1224, height: 2189,
          overflow: 'hidden', borderRadius: 26, background: C.paper,
          border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          opacity: pageP, filter: `blur(${((1 - pageP) * 14).toFixed(2)}px)`,
        }}
      >
        <Img
          src={staticFile(PROMO.pageTraffic.src)}
          style={{ position: 'absolute', left: 0, top: 0, width: 1224, height: PROMO.pageTraffic.h * 0.85, display: 'block' }}
        />
      </div>

      {/* bottom fog band: keeps the caption off the page footer */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0) 800px, rgba(244,244,246,0.9) 940px, #f4f4f6 1000px)', pointerEvents: 'none' }} />

      {/* segmented control (track / thumb / labels) */}
      <div
        style={{
          position: 'absolute', left: CTRL_LEFT, top: CTRL_TOP + ctrlY, width: CW, height: CH,
          borderRadius: CH / 2,
          background: 'linear-gradient(180deg, #dedee5 0%, #eaeaef 100%)',
          border: '1px solid rgba(20,22,28,0.13)',
          boxShadow: 'inset 0 2px 6px rgba(16,18,24,0.12), inset 0 -1px 0 rgba(255,255,255,0.8), 0 1px 0 rgba(255,255,255,0.9), 0 34px 80px -26px rgba(16,18,24,0.30)',
          opacity: Math.min(1, floatT * 1.5) * controlOut,
          transform: `translateY(${(-24 * (1 - controlOut)).toFixed(2)}px) scale(${(1 - 0.02 * (1 - controlOut)).toFixed(4)})`,
          display: 'flex', alignItems: 'center', padding: PAD, boxSizing: 'border-box',
        }}
      >
        {/* white thumb: light-catch top edge; rubber-band width + velocity blur */}
        <div
          style={{
            position: 'absolute', left: thumbL, top: PAD, width: Math.max(0, thumbR - thumbL), height: TH,
            borderRadius: TH / 2,
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), 0 0 0 1px rgba(20,22,28,0.07), 0 2px 5px rgba(16,18,24,0.10), 0 14px 30px -8px rgba(16,18,24,0.24)',
            filter: thumbBlur > 0.4 ? `blur(${thumbBlur.toFixed(2)}px)` : undefined,
            zIndex: 1,
          }}
        />
        {/* 简约版 */}
        <div style={labelStyle(1 - compAmt)}>
          <span style={{ display: 'inline-flex', transform: `scale(${Math.max(0, oldIcon)})`, width: oldIcon < 0.05 ? 0 : 54, flex: 'none' }}>
            <PenIcon size={54} color={lerpHex(DIM, C.violet, 1 - compAmt)} />
          </span>
          简约版
        </div>
        {/* 引流版 */}
        <div style={labelStyle(compAmt)}>
          <span style={{ display: 'inline-flex', transform: `scale(${Math.max(0, newIcon)})`, width: newIcon < 0.05 ? 0 : 54, flex: 'none' }}>
            <SparkIcon size={54} color={lerpHex(DIM, C.violet, compAmt)} accent={C.violet} />
          </span>
          引流版
        </div>
      </div>

      {/* click ripple: 3px accent ring, locked to the click point, above the thumb */}
      {rippleT > 0 && rippleT < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: 1222 - 130 * rippleT, top: 320 - 130 * rippleT,
            width: 260 * rippleT, height: 260 * rippleT,
            borderRadius: '50%', boxSizing: 'border-box',
            border: `3px solid ${C.violet}`,
            background: 'radial-gradient(circle, rgba(101,84,232,0) 50%, rgba(101,84,232,0.12) 100%)',
            opacity: (1 - rippleT) * 0.9,
            zIndex: 5,
          }}
        />
      ) : null}

      {/* draft card: window into the real 推广草稿 → after the pull-back it is the 72px quote card */}
      <div
        style={{
          position: 'absolute', left: 370, top: lerp(520, 458, stripOut), width: 1180, height: 420,
          borderRadius: 26, overflow: 'hidden', background: C.paper,
          border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          opacity: cardIn, transform: `translateY(${((1 - cardIn) * 26).toFixed(2)}px)`,
        }}
      >
        {/* top strip: the real 推广草稿 card (simple → traffic crossfade in place, then leaves) */}
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 170, overflow: 'hidden', background: '#fbfbfd', opacity: 1 - stripOut }}>
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${staticFile(PROMO.page.src)})`,
              backgroundSize: `1440px ${PROMO.page.h}px`,
              backgroundPosition: `-${PROMO.draftsCard.x - 20}px -${PROMO.draftsCard.y - 12}px`,
              backgroundRepeat: 'no-repeat',
              opacity: 1 - cropSwap,
            }}
          />
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${staticFile(PROMO.pageTraffic.src)})`,
              backgroundSize: `1440px ${PROMO.pageTraffic.h}px`,
              backgroundPosition: `-${PROMO.draftsCard.x - 20}px -${PROMO.draftsCard.y - 12}px`,
              backgroundRepeat: 'no-repeat',
              opacity: cropSwap,
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,0.96) 100%)' }} />
        </div>
        {/* readable label */}
        <div style={{ position: 'absolute', left: 56, top: labelTop, fontFamily: FONT.zh, fontSize: 34, fontWeight: 600, letterSpacing: '0.02em', color: C.violet }}>
          <span style={{ opacity: 1 - labelSwap }}>推广草稿 · 简约版</span>
          <span style={{ position: 'absolute', left: 0, top: 0, opacity: labelSwap }}>推广草稿 · 引流版</span>
        </div>
        {/* the quote (the shot's main text layer, 72px) */}
        <div
          style={{
            position: 'absolute', left: 56, right: 56, top: quoteTop,
            fontFamily: FONT.zh, fontSize: 72, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.02em',
            color: C.ink, whiteSpace: 'nowrap',
          }}
        >
          <span style={{ position: 'absolute', left: 0, top: 0, opacity: simpleIn * simpleOut, transform: `translateY(${(1 - simpleIn) * 14}px)` }}>
            周末想出发？先把房间<YellowMark from={48}>问明白</YellowMark>。
          </span>
          <span style={{ position: 'absolute', left: 0, top: 0, opacity: trafficIn, transform: `translateY(${(1 - trafficIn) * 14}px)` }}>
            旅行偶尔改个计划，<YellowMark from={90}>也挺好</YellowMark>。
          </span>
        </div>
        {/* meta line */}
        <div style={{ position: 'absolute', left: 56, top: metaTop, fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.muted }}>
          <span style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - labelSwap, whiteSpace: 'nowrap' }}>适合日常宣传，方便客人留言问房。</span>
          <span style={{ position: 'absolute', left: 0, top: 0, opacity: labelSwap, whiteSpace: 'nowrap' }}>用场景和故事开头，适合社交平台分享。</span>
        </div>
      </div>

      <ArrowCursor x={curX} y={curY} press={press} opacity={cursorOut} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', opacity: captionP }}>
        <Caption text="同一个空档，两种说法。" from={104} to={999} bottom={48} />
      </div>
    </AbsoluteFill>
  );
};
