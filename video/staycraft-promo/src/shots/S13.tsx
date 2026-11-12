import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { HANDOFF } from '../core/handoff';
import { PROMO, REPORT } from '../core/layout';
import { Caption } from '../core/ui';

/**
 * S13 · 合上报告 → 推广 (1290–1380f, 90f) — card: bottom-push-stack-wipe (transition, T6)
 * The report sheet is physically pushed out of frame by the promo chapter rising
 * from the bottom edge: both layers share one heavy ease-out (26f), the new
 * chapter carries its own #f6f5fb paper tint and a 40px contact shadow on the
 * seam. Nothing inside the chapters moves during the push; the annotations
 * (yellow audience frame + AI badge + the audience line) only arrive after the
 * chapter has landed.
 *
 * 材料：#f6f5fb 淡紫纸为章节底（替代 demo 的饱和章色，01 §3.1 violet-fog 档），
 * PC-07 真实截图作为"纸"钉在章内绝对坐标。44px 接缝影 + 2px 受光边 = 顶出物性。
 */
const DUR = 90;
const PUSH = 26;
const HEAVY = Easing.bezier(0.12, 0.9, 0.2, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** promo chapter geometry: real page sheet at 1.0 inside the tinted chapter */
const SHEET = { x: 240, y: 60, w: 1440, h: 1020 };
/** measured bboxes (layout.ts) → screen space inside the promo chapter */
const AUD = {
  x: SHEET.x + PROMO.audienceCard.x - 8,
  y: SHEET.y + PROMO.audienceCard.y - 8,
  w: PROMO.audienceCard.w + 16,
  h: PROMO.audienceCard.h + 16,
};
const AUD_PERIM = 2 * (AUD.w + AUD.h);

export const S13: React.FC = () => {
  const f = useCurrentFrame();
  const p = clamp01((f - 0) / PUSH);
  const push = HEAVY(p);

  const reportOut = -1080 * push;
  const promoIn = 1080 * (1 - push);

  // annotations land only after the chapter has settled (f30+)
  const frameP = interpolate(f, [28, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const badgeP = interpolate(f, [34, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const pillP = interpolate(f, [38, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const t1 = interpolate(f, [28, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const t2 = interpolate(f, [32, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  const seam = clamp01(push);

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* ── outgoing chapter: the report (same paper position as S12) ── */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${reportOut.toFixed(2)}px)` }}>
        <div
          style={{
            position: 'absolute', left: 240, top: 0, width: 1440, height: 1080, overflow: 'hidden',
            background: C.paper, borderLeft: '1px solid ' + C.line, borderRight: '1px solid ' + C.line,
            boxShadow: '0 0 120px -40px rgba(24,24,27,0.20)',
          }}
        >
          <Img
            src={staticFile(REPORT.page.src)}
            style={{
              position: 'absolute', left: 0, top: -HANDOFF.reportScrollY.s12End,
              width: 1440, height: REPORT.page.h, display: 'block', filter: 'saturate(0.85)',
            }}
          />
          <AbsoluteFill style={{ background: 'rgba(244,244,246,0.46)' }} />
        </div>
      </div>

      {/* seam veil: S12's title + uncertainty cards clear as the report starts to close (6f) */}
      <AbsoluteFill style={{ background: '#f6f5fb', opacity: 0.8 * (1 - EASE.out(clamp01(f / 6))), pointerEvents: 'none' }} />

      {/* ── incoming chapter: promo page on a tinted paper ── */}
      <AbsoluteFill style={{ transform: `translateY(${promoIn.toFixed(2)}px)`, background: '#f6f5fb' }}>
        {/* contact shadow on the seam: evidence that the new chapter pushed the old one out */}
        <div
          style={{
            position: 'absolute', top: -40, left: 0, right: 0, height: 40,
            background: 'linear-gradient(to top, rgba(90,63,214,0.16), rgba(90,63,214,0.05) 45%, rgba(90,63,214,0))',
            opacity: seam,
          }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.9)', opacity: seam }} />

        {/* real PC-07 as the paper of the new chapter (fixed absolute coords) */}
        <div
          style={{
            position: 'absolute', left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h,
            overflow: 'hidden', borderRadius: 26, background: C.paper,
            border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          }}
        >
          <Img
            src={staticFile(PROMO.page.src)}
            style={{ position: 'absolute', left: 0, top: 0, width: SHEET.w, height: PROMO.page.h, display: 'block' }}
          />
        </div>

        {/* scrim: the lower half of the page becomes paper for the title */}
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, rgba(246,245,251,0) 500px, rgba(246,245,251,0.82) 620px, #f6f5fb 700px)',
            pointerEvents: 'none',
          }}
        />

        {/* ── yellow frame around the recommended-audience card (8f draw) ── */}
        {frameP > 0 ? (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <rect
              x={AUD.x} y={AUD.y} width={AUD.w} height={AUD.h} rx={22}
              fill="none" stroke={C.yellow} strokeWidth={5}
              strokeDasharray={AUD_PERIM}
              strokeDashoffset={AUD_PERIM * (1 - frameP)}
              opacity={0.95}
            />
          </svg>
        ) : null}

        {/* AI badge (DOM re-read of the tiny UI badge) */}
        <div
          style={{
            position: 'absolute',
            left: SHEET.x + 1180, top: SHEET.y + 226,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 22px', borderRadius: 999,
            background: C.violetFog, border: '1px solid rgba(101,84,232,0.28)',
            color: C.violet, fontFamily: FONT.zh, fontSize: 34, fontWeight: 600, letterSpacing: '0.02em',
            opacity: badgeP, transform: `translateY(${(1 - badgeP) * 10}px) scale(${(0.94 + 0.06 * badgeP).toFixed(3)})`,
            boxShadow: '0 8px 20px -12px rgba(101,84,232,0.35)',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: C.violet, display: 'inline-block' }} />
          AI 建议
        </div>

        {/* audience sentence: the UI line made readable (label >= 34px), docked under the highlighted card */}
        <div
          style={{
            position: 'absolute', left: 1000, top: 512,
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '15px 30px', borderRadius: 999,
            background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(101,84,232,0.22)',
            boxShadow: SHADOW.card,
            fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.inkSoft, whiteSpace: 'nowrap',
            opacity: pillP, transform: `translateY(${(1 - pillP) * 12}px)`,
          }}
        >
          <span style={{ width: 26, height: 2, background: C.violet, display: 'inline-block' }} />
          注重安静与私密的小团体或家庭
        </div>
        {/* hairline from the highlighted card down to the note */}
        <div style={{ position: 'absolute', left: 1261, top: 505, width: 1.5, height: 8, background: 'rgba(101,84,232,0.4)', opacity: pillP }} />

        {/* ── title: lower left, on the tinted paper ── */}
        <div style={{ position: 'absolute', left: 140, top: 620, width: 900 }}>
          {['把空档', '写成一份邀请'].map((line, i) => {
            const t = i === 0 ? t1 : t2;
            return (
              <div
                key={line}
                style={{
                  fontFamily: FONT.zh, fontSize: 100, fontWeight: 700, lineHeight: 1.12,
                  letterSpacing: '-0.02em', color: C.ink,
                  opacity: t,
                  filter: `blur(${(1 - t) * 6}px)`,
                  transform: `translateY(${(1 - t) * 14}px) scale(${(1.06 - 0.06 * t).toFixed(4)})`,
                  transformOrigin: 'left center',
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        <Caption text="AI 结合民宿特色与客源，起草文案。" from={45} to={999} bottom={84} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
