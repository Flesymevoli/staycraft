import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { HANDOFF } from '../core/handoff';
import { ANALYSIS } from '../core/layout';
import { Caption } from '../core/ui';

/**
 * S12 · What it does not claim (1200–1290f, 90f) — card: list-reveal (ui-entrance)
 * EN adaptation (01-en-facts §3.4, 02-copy-en S12): there is no English report
 * page, so the honesty beat uses the product's OWN English caveats printed on the
 * analysis page — "Imported channels may be incomplete…" and "Current recorded
 * bookings: not a forecast of final occupancy." Two violet evidence bars sit on
 * the real caveat lines; four readable cards restate them.
 *
 * COPY: only from docs/02-copy-en.md (v1 draft; swap strings when v-final lands).
 *   headline  : It also names / its blind spots.
 *   caption   : The product states its limits.
 *   label     : Product caveats · English UI
 *   cards     : Channels may be incomplete / Not a forecast / Not cash receipts / No live OTA data
 * Camera: continues S11's analysis-page framing (S11_EXIT, EN) and pulls back
 * to the full page over 26f; scrim + gutter gradient fade in over 10f so the
 * cut never reads as a white flash.
 *
 * list-reveal 降档 (90f shot): 4 items / stagger 5f / window 18f / container drift
 * 40px (+20 → −20, linear, no recentre). Item motion identical to the card demo:
 * scale .82→1 + y 44→0 + blur 8→0 + soft back 1.5%, opacity min(1, lin·2.2).
 */
const DUR = 90;
const SOFT_BACK = Easing.bezier(0.3, 1.18, 0.5, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** copy — docs/02-copy-en.md §B S12 (recommended column) */
const COPY = {
  title: ['It also names', 'its blind spots.'],
  caption: 'The product states its limits.',
  label: 'Product caveats · English UI',
  cards: [
    { n: 'e1', t: 'Channels may be incomplete' },
    { n: 'e2', t: 'Not an occupancy forecast' },
    { n: 'e3', t: 'Not cash receipts' },
    ],
};

/**
 * S11 (EN) exit framing — motion-b exports S11_EXIT from './S11' once the EN S11
 * is locked; until then this placeholder keeps the pull-back structure in place.
 * Same convention as the CN cut: translate(x, -scale*top) scale(scale), origin 0 0.
 */
const S11_EXIT = { x: -300, scale: 0.9, top: 250 };
/** final framing: analysis page full width, caveat lines (page y≈330 / 1105) on screen */
const PAGE_END = { x: 240, scale: 1, top: 280 };

const CARD_START = 10;
const CARD_STAGGER = 5;
const CARD_WIN = 18;

/** real caveat lines on the EN analysis page (page px, 1440 grid) */
const CAVEAT_BARS = [
  { x: 278, y: 318, w: 744, h: 24 },
  { x: 294, y: 1094, w: 622, h: 24 },
];

export const S12: React.FC = () => {
  const f = useCurrentFrame();

  // camera: pull back from S11's parked framing into the full analysis page (26f)
  const camP = EASE.inOut(clamp01(f / 26));
  const pageX = lerp(S11_EXIT.x, PAGE_END.x, camP);
  const pageS = lerp(S11_EXIT.scale, PAGE_END.scale, camP);
  const pageTop = lerp(S11_EXIT.top, PAGE_END.top, camP);
  const pageTY = -pageS * pageTop;
  // scrim / gutter / bottom band fade in together (no white flash at the cut)
  const scrimP = EASE.out(clamp01(f / 10));

  // container drift: +20 → −20, linear, never re-centres (list-reveal "breathing")
  const drift = 20 - 40 * clamp01(f / (DUR - 1));

  const lineP = (start: number) => interpolate(f, [start, start + 18], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out,
  });
  const t1 = lineP(12);
  const t2 = lineP(17);
  const labelP = interpolate(f, [6, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* ── analysis page (EN), continuing S11's sheet framing ── */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: 1440, height: ANALYSIS.page.h,
          transform: `translate(${pageX.toFixed(2)}px, ${pageTY.toFixed(2)}px) scale(${pageS.toFixed(4)})`,
          transformOrigin: '0 0',
          borderRadius: 26, overflow: 'hidden', background: C.paper,
          border: '1px solid ' + C.line,
          boxShadow: '0 0 120px -40px rgba(24,24,27,0.20)',
        }}
      >
        <Img
          src={staticFile(ANALYSIS.page.src)}
          style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: ANALYSIS.page.h, display: 'block', filter: 'saturate(0.85)' }}
        />
        {/* violet evidence bars sitting on the two real caveat lines (machine layer) */}
        {CAVEAT_BARS.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h,
              background: `rgba(101,84,232,${(0.10 + 0.05 * i).toFixed(3)})`,
              borderLeft: '3px solid ' + C.violet,
              borderRadius: 4,
              opacity: labelP,
            }}
          />
        ))}
        {/* fog scrim over the page: fades in with the camera move */}
        <AbsoluteFill style={{ background: C.fog, opacity: 0.5 * scrimP }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0.6) 0%, rgba(244,244,246,0) 26%)', opacity: scrimP }} />
      </div>

      {/* left gutter fades the page into fog so the headline sits on clean paper */}
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(244,244,246,0.988) 0%, rgba(244,244,246,0.988) 33%, rgba(244,244,246,0.9) 37%, rgba(244,244,246,0.35) 43%, rgba(244,244,246,0) 47%)', opacity: scrimP }} />
      {/* bottom band so the caption sits on clean fog */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(244,244,246,0) 60%, rgba(244,244,246,0.9) 76%, rgba(244,244,246,1) 84%)', opacity: scrimP }} />

      {/* ── headline (left) ── */}
      <div style={{ position: 'absolute', left: 120, top: 200, width: 900 }}>
        {COPY.title.map((line, i) => {
          const p = i === 0 ? t1 : t2;
          return (
            <div
              key={line}
              style={{
                fontFamily: FONT.en, fontSize: 96, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.025em',
                color: C.ink, whiteSpace: 'nowrap',
                opacity: p, filter: `blur(${(1 - p) * 6}px)`,
                transform: `translateY(${(1 - p) * 14}px) scale(${(1.06 - 0.06 * p).toFixed(4)})`,
                transformOrigin: 'left center',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* ── label: these are the product's real English caveats ── */}
      <div
        style={{
          position: 'absolute', left: 1230, top: 238,
          fontFamily: FONT.en, fontSize: 34, fontWeight: 500, letterSpacing: '0.01em',
          color: C.violet, opacity: labelP, transform: `translateY(${(1 - labelP) * 8}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        {COPY.label}
      </div>

      {/* ── four caveat cards, drifting container ── */}
      <div style={{ position: 'absolute', left: 1230, top: 300, width: 640, transform: `translateY(${drift.toFixed(2)}px)` }}>
        {COPY.cards.map((it, i) => {
          const t0 = CARD_START + i * CARD_STAGGER;
          const lin = clamp01((f - t0) / CARD_WIN);
          const p = SOFT_BACK(lin);
          const blur = (1 - EASE.out(lin)) * 8;
          return (
            <div
              key={it.n}
              style={{
                position: 'relative', height: 104, marginBottom: 18,
                borderRadius: 19,
                background: 'rgba(255,255,255,0.97)',
                border: '1px solid ' + C.line,
                boxShadow: SHADOW.card,
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '0 26px', boxSizing: 'border-box',
                opacity: Math.min(1, lin * 2.2),
                filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
                transform: `translateY(${((1 - p) * 44).toFixed(2)}px) scale(${(0.82 + 0.18 * p).toFixed(4)})`,
                transformOrigin: 'left center',
              }}
            >
              <div style={{ fontFamily: FONT.en, fontSize: 28, fontWeight: 600, color: C.violet, width: 40, flex: 'none' }}>
                {it.n}
              </div>
              <div style={{ fontFamily: FONT.en, fontSize: 36, fontWeight: 500, color: C.muted, whiteSpace: 'nowrap' }}>
                {it.t}
              </div>
            </div>
          );
        })}
      </div>

      <Caption text={COPY.caption} from={45} to={999} bottom={84} />
    </AbsoluteFill>
  );
};
