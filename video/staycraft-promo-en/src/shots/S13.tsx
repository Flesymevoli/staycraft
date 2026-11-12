import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { ANALYSIS, PROMO } from '../core/layout';

/**
 * S13 · Report → promotion (1290–1380f, 90f) — card: bottom-push-stack-wipe (transition, T6)
 * EN adaptation (01-en-facts §3.5, 02-copy-en S13): the analysis page is pushed out
 * by the EN promotion page chapter (#f6f5fb). Only English chrome is framed:
 * "Promotion plans" at the top and the "Promotion copy" card (yellow highlight).
 * The Chinese AI audience body is covered by a paper note (the film's headline),
 * exactly like the CN cut covers report text with paper — nothing Chinese is readable.
 *
 * COPY: docs/02-copy-en.md (v1 draft — swap when v-final).
 *   headline: Turn the gap / into an invitation.
 *   caption : The plan starts from / the property's details.
 *   label   : Promotion plans · AI suggestion
 * Push: 26f heavy ease-out, both sheets move together, 40px contact shadow on the
 * seam + 2px light edge. Nothing inside the chapters moves during the push.
 */
const DUR = 90;
const PUSH = 26;
const HEAVY = Easing.bezier(0.12, 0.9, 0.2, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** S12 end framing: analysis page full width, viewport top 280 page px */
const REPORT_VIEW = { x: 240, scale: 1, top: 280 };
/** incoming chapter: EN promotion page sheet, top of page cropped (Chinese demo header out) */
const SHEET = { x: 240, y: 0, w: 1440, h: 1080, inner: -40 };
/** paper note pasted over the Who-to-reach / Nearby block (hides the Chinese AI body) */
const STRIP = { x: 280, y: 125, w: 1360, h: 520 };
/** yellow frame around the Promotion copy card: page (288,692,1100,310) → screen +8 */
const FRAME = { x: 520, y: 644, w: 1116, h: 326 };
const FRAME_PERIM = 2 * (FRAME.w + FRAME.h);

const COPY = {
  headline: ['Turn the gap', 'into an invitation.'],
  caption: ['Two drafts, from', 'your details.'],
  label: 'Promotion plans · AI suggestion',
};

export const S13: React.FC = () => {
  const f = useCurrentFrame();
  const push = HEAVY(clamp01(f / PUSH));

  const frameP = interpolate(f, [28, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const stripP = interpolate(f, [28, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const labelP = interpolate(f, [32, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const h1 = interpolate(f, [34, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const h2 = interpolate(f, [38, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const c1 = interpolate(f, [46, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const c2 = interpolate(f, [50, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // seam veil: S12's cards/headline clear as the report closes (6f, same as CN)
  const veil = 0.8 * (1 - EASE.out(clamp01(f / 6)));

  const reportTY = REPORT_VIEW.scale * REPORT_VIEW.top;
  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* ── outgoing chapter: analysis page, exactly at S12's end framing ── */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(-1080 * push).toFixed(2)}px)` }}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: 1440, height: ANALYSIS.page.h,
            transform: `translate(${REPORT_VIEW.x}px, ${-reportTY}px) scale(${REPORT_VIEW.scale})`,
            transformOrigin: '0 0',
            borderRadius: 26, overflow: 'hidden', background: C.paper, border: '1px solid ' + C.line,
            boxShadow: '0 0 120px -40px rgba(24,24,27,0.20)',
          }}
        >
          <Img src={staticFile(ANALYSIS.page.src)} style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: ANALYSIS.page.h, display: 'block', filter: 'saturate(0.85)' }} />
          <AbsoluteFill style={{ background: C.fog, opacity: 0.5 }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0.6) 0%, rgba(244,244,246,0) 26%)' }} />
        </div>
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(244,244,246,0.988) 0%, rgba(244,244,246,0.988) 33%, rgba(244,244,246,0.9) 37%, rgba(244,244,246,0.35) 43%, rgba(244,244,246,0) 47%)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0) 60%, rgba(244,244,246,0.9) 76%, rgba(244,244,246,1) 84%)' }} />
      </div>

      {/* seam veil before the new chapter lands */}
      {veil > 0.001 ? <AbsoluteFill style={{ background: '#f6f5fb', opacity: veil, pointerEvents: 'none' }} /> : null}

      {/* ── incoming chapter: EN promotion page on tinted paper ── */}
      <AbsoluteFill style={{ transform: `translateY(${(1080 * (1 - push)).toFixed(2)}px)`, background: '#f6f5fb' }}>
        {/* contact shadow on the seam: the new chapter physically pushes the old one out */}
        <div
          style={{
            position: 'absolute', top: -40, left: 0, right: 0, height: 40,
            background: 'linear-gradient(to top, rgba(90,63,214,0.16), rgba(90,63,214,0.05) 45%, rgba(90,63,214,0))',
            opacity: 1 - push,
          }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.9)', opacity: 1 - push }} />

        {/* real EN promotion page as the chapter's paper; header 40px cropped out */}
        <div
          style={{
            position: 'absolute', left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h,
            overflow: 'hidden', borderRadius: 26, background: C.paper,
            border: '1px solid ' + C.line, boxShadow: SHADOW.sheet,
          }}
        >
          <Img
            src={staticFile(PROMO.page.src)}
            style={{ position: 'absolute', left: 0, top: SHEET.inner, width: 1440, height: PROMO.page.h, display: 'block' }}
          />
        </div>

        {/* paper note: headline + caption, pasted over the Chinese AI body */}
        <div
          style={{
            position: 'absolute', left: STRIP.x, top: STRIP.y, width: STRIP.w, height: STRIP.h,
            background: C.paper, border: '1px solid ' + C.line, borderRadius: 26, boxShadow: SHADOW.sheet,
            opacity: stripP, transform: `translateY(${((1 - stripP) * 26).toFixed(2)}px)`,
          }}
        >
          <div style={{ position: 'absolute', left: 56, top: 34, fontFamily: FONT.en, fontSize: 34, fontWeight: 500, letterSpacing: '0.01em', color: C.violet, opacity: labelP }}>
            {COPY.label}
          </div>
          {COPY.headline.map((line, i) => {
            const p = i === 0 ? h1 : h2;
            return (
              <div
                key={line}
                style={{
                  position: 'absolute', left: 56, top: 84 + i * 106, fontFamily: FONT.en, fontSize: 96, fontWeight: 700,
                  lineHeight: 1.1, letterSpacing: '-0.025em', color: C.ink, whiteSpace: 'nowrap',
                  opacity: p, filter: `blur(${(1 - p) * 6}px)`,
                  transform: `translateY(${(1 - p) * 14}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
          {COPY.caption.map((line, i) => {
            const p = i === 0 ? c1 : c2;
            return (
              <div
                key={line}
                style={{
                  position: 'absolute', left: 56, top: 330 + i * 81, fontFamily: FONT.zh, fontSize: 58, fontWeight: 500,
                  lineHeight: 1.4, color: C.muted, whiteSpace: 'nowrap', opacity: p, transform: `translateY(${(1 - p) * 10}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* yellow frame around the Promotion copy card (8f draw) */}
        {frameP > 0 ? (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <rect
              x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx={26}
              fill="none" stroke={C.yellow} strokeWidth={5}
              strokeDasharray={FRAME_PERIM}
              strokeDashoffset={FRAME_PERIM * (1 - frameP)}
              opacity={0.95}
            />
          </svg>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
