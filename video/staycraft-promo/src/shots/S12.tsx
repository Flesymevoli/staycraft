import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { HANDOFF } from '../core/handoff';
import { REPORT } from '../core/layout';
import { Caption } from '../core/ui';
import { S11_EXIT } from './S11';

/**
 * S12 · 不确定性 (1200–1290f, 90f) — card: list-reveal (ui-entrance)
 * The report keeps being read: the page pans down to the "仍需补充的信息" block
 * while four readable list cards settle on the right. The report is dimmed
 * (saturate .85 + fog) and the document keeps drifting; only the cards "land",
 * so the beat stays quiet.
 *
 * list-reveal 降档（镜长 90f，参数记录）：4 项 / stagger 5f / 窗口 18f /
 * 容器漂移 40px（+20 → −20，匀速，末帧不回位）。逐项动作与 demo 同构：
 * scale .82→1 + y 44→0 + blur 8→0 + 软 back 1.5%，透明度 min(1, lin·2.2)。
 * 页面滚动接 HANDOFF.reportScrollY.s12Start → s12End。
 */
const DUR = 90;
const SOFT_BACK = Easing.bezier(0.3, 1.18, 0.5, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const ITEMS = [
  { n: 'e1', t: '渠道不完整' },
  { n: 'e2', t: '间夜状态未知' },
  { n: 'e3', t: '周期不可比' },
  { n: 'e4', t: '无利润数据' },
];

const CARD_START = 10;
const CARD_STAGGER = 5;
const CARD_WIN = 18;

export const S12: React.FC = () => {
  const f = useCurrentFrame();
  // camera: pull back from S11's parked doc into the full page over 26f, then hold
  const camP = EASE.inOut(clamp01(f / 26));
  const pageX = lerp(S11_EXIT.x, 240, camP);
  const pageS = lerp(S11_EXIT.scale, 1, camP);
  const pageTop = lerp(S11_EXIT.top, HANDOFF.reportScrollY.s12End, camP);
  const pageTY = -pageS * pageTop;
  // container drift: +20 → −20, linear, never re-centres (list-reveal 的"呼吸"层)
  const drift = 20 - 40 * clamp01(f / (DUR - 1));

  const lineP = (start: number) => interpolate(f, [start, start + 18], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out,
  });
  const t1 = lineP(12);
  const t2 = lineP(17);

  const labelP = interpolate(f, [6, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* ── report page: continues S11's sheet, then pulls back to the full page ── */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: 1440, height: REPORT.page.h,
          transform: `translate(${pageX.toFixed(2)}px, ${pageTY.toFixed(2)}px) scale(${pageS.toFixed(4)})`,
          transformOrigin: '0 0',
          borderRadius: 26, overflow: 'hidden', background: C.paper,
          border: '1px solid ' + C.line,
          boxShadow: '0 0 120px -40px rgba(24,24,27,0.20)',
        }}
      >
        <Img
          src={staticFile(REPORT.page.src)}
          style={{
            position: 'absolute', left: 0, top: 0, width: 1440, height: REPORT.page.h,
            display: 'block', filter: 'saturate(0.85)',
          }}
        />
        {/* 轻雾：整页压到 ~46%，文字退成纹理 */}
        {/* 轻雾 scrim：头 10f 从 0 淡到 0.46，接住 S11 的亮页而不是白闪 */}
        <AbsoluteFill style={{ background: C.fog, opacity: 0.46 * EASE.out(clamp01(f / 10)) }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0.55) 0%, rgba(244,244,246,0) 26%)' }} />
      </div>

      {/* left gutter fades the page into fog so the title sits on clean paper */}
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(244,244,246,0.988) 0%, rgba(244,244,246,0.988) 33%, rgba(244,244,246,0.9) 37%, rgba(244,244,246,0.35) 43%, rgba(244,244,246,0) 47%)' }} />
      {/* bottom band so the caption sits on clean fog, not on report text */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0) 60%, rgba(244,244,246,0.9) 76%, rgba(244,244,246,1) 84%)' }} />

      {/* ── title, in the page's left margin (gutter 240px) ── */}
      <div style={{ position: 'absolute', left: 128, top: 196, width: 520 }}>
        {['它也标出', '哪里没算清'].map((line, i) => {
          const p = i === 0 ? t1 : t2;
          return (
            <div
              key={line}
              style={{
                fontFamily: FONT.zh,
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1.16,
                letterSpacing: '-0.02em',
                color: C.ink,
                opacity: p,
                filter: `blur(${(1 - p) * 6}px)`,
                transform: `translateY(${(1 - p) * 14}px) scale(${(1.06 - 0.06 * p).toFixed(4)})`,
                transformOrigin: 'left center',
                whiteSpace: 'nowrap',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* ── small violet label: the evidence is saved ── */}
      <div
        style={{
          position: 'absolute', left: 1420, top: 258,
          fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, letterSpacing: '0.02em',
          color: C.violet, opacity: labelP, transform: `translateY(${(1 - labelP) * 8}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        依据已保存 · e1–e4
      </div>

      {/* ── four uncertainty cards, drifting container ── */}
      <div style={{ position: 'absolute', left: 1420, top: 320, width: 440, transform: `translateY(${drift.toFixed(2)}px)` }}>
        {ITEMS.map((it, i) => {
          const t0 = CARD_START + i * CARD_STAGGER;
          const lin = clamp01((f - t0) / CARD_WIN);
          const p = SOFT_BACK(lin);
          const blur = (1 - EASE.out(lin)) * 8;
          return (
            <div
              key={it.n}
              style={{
                position: 'relative',
                height: 104,
                marginBottom: 18,
                borderRadius: 19,
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid ' + C.line,
                boxShadow: SHADOW.card,
                display: 'flex', alignItems: 'center', gap: 18,
                padding: '0 26px', boxSizing: 'border-box',
                opacity: Math.min(1, lin * 2.2),
                filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
                transform: `translateY(${((1 - p) * 44).toFixed(2)}px) scale(${(0.82 + 0.18 * p).toFixed(4)})`,
                transformOrigin: 'left center',
              }}
            >
              <div style={{ fontFamily: FONT.en, fontSize: 30, fontWeight: 600, color: C.violet, width: 40, flex: 'none' }}>
                {it.n}
              </div>
              <div style={{ fontFamily: FONT.zh, fontSize: 40, fontWeight: 500, color: C.muted, whiteSpace: 'nowrap' }}>
                {it.t}
              </div>
            </div>
          );
        })}
      </div>

      <Caption text="它把不确定，也写进报告。" from={45} to={999} bottom={84} />
    </AbsoluteFill>
  );
};
