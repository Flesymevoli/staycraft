import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { CardFloat, FocusRack, GlowOrb, LineLink, Ring } from '../core/overlays';
import { Kicker } from '../core/ui';

/**
 * S15 · Four quotes → one decision (1500–1620f, 120f)
 * Card: cards/explore-02, macro 1550×643 at (250,316) (03 geometry). Headline
 * "Four quotes. / One decision." 96px top-left; kicker. Camera drifts left across
 * the list while rows #1→#3 glow in sequence (8f stagger; row #1's expanded
 * "Quote Snapshot Conditions" stays as the traceable evidence). Last 40f: the list
 * pulls back to the soft stage, the real Action Plan (workbench-10) floats in at
 * 0.82 opacity on the right, one yellow ring lands on "+¥40 — Done" and a 2px
 * violet line closes the loop from the quotes; the gauge-iris bloom expands into
 * S16 (impact #1, peak f1580 = rel 80). Final 30f completely still.
 *
 * UI data (verbatim): Wuzhen Water Lane Riverside Boutique ¥568/night (+¥48) ·
 * Xitang Misty Rain Courtyard Inn ¥488 (0.0) · Jiangnan Waterside Design Resort
 * ¥620 (+¥60) · Action Plan 2/3 "Raise Sunday Riverside Double rate by ¥40 — Done".
 */
const CARD = { x: 250, y: 316, w: 1550, h: 643 };
const K = CARD.w / 1114; // display px per card CSS px (1.391) — texture is 2x
const PLAN = { x: 1180, y: 330, w: 440, h: 385 };
/** actual row bands of this captured card (CSS px): #1, then the expanded
 * "Quote Snapshot Conditions" evidence, #2, #3 — measured from the texture. */
const ROWS = [
  { top: 86, h: 42 },
  { top: 312, h: 42 },
  { top: 388, h: 42 },
];

/** final pull-back framing (camera transform about the frame centre) */
const PULL = { tx: -408.8, ty: -78.7, zoom: 0.72 };

export const S15: React.FC = () => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const kick = interpolate(f, [2, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const h1 = interpolate(f, [6, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const h2 = interpolate(f, [9, 23], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // camera: slow horizontal drift across the list, then the last-40f pull back
  const pan = interpolate(f, [12, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const pull = interpolate(f, [68, 88], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const tx = -80 * pan * (1 - pull) + PULL.tx * pull;
  const ty = PULL.ty * pull;
  const zoom = (1 + 0.04 * pan) * (1 - pull) + PULL.zoom * pull;
  // editorial text leaves as the list pulls back
  const textOut = interpolate(f, [58, 72], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  // action plan floats in (0.82 opacity, no hard cut)
  const planP = interpolate(f, [72, 86], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const ringP = interpolate(f, [80, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const lineP = interpolate(f, [76, 86], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  // impact #1: gauge iris / bloom expands over the frame (peak f1580 = rel 80)
  const bloom = interpolate(f, [68, 80, 88, 90], [0, 0.55, 0.3, 0.16], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // T4: at the very end the light iris fills the frame → S16 opens inside the light
  const iris = interpolate(f, [100, 119], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const lift = interpolate(f, [0, 20], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1150px 800px at 56% 42%, #f8f7ff 0%, #efedf8 58%, #f2f3f5 100%)', overflow: 'hidden' }}>
      <GlowOrb x={1310} y={430} r={470} from={40} to={70} opacity={0.35} />

      <Kicker
        text="NEARBY STAY QUOTES · 4 VALID QUOTES"
        size={28}
        style={{ position: 'absolute', left: 120, top: 48, opacity: kick * textOut, transform: `translateY(${(1 - kick) * 8}px)` }}
      />
      <div style={{ position: 'absolute', left: 120, top: 84, opacity: textOut }}>
        <div style={{ fontFamily: FONT.en, fontSize: 96, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', color: C.ink, whiteSpace: 'nowrap', opacity: h1, transform: `translateY(${(1 - h1) * 14}px)` }}>
          Four quotes.
        </div>
        <div style={{ fontFamily: FONT.en, fontSize: 96, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', color: C.ink, whiteSpace: 'nowrap', opacity: h2, transform: `translateY(${(1 - h2) * 14}px)` }}>
          One decision.
        </div>
      </div>

      {/* quotes list (camera layer) */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: '960px 540px' }}>
        <FocusRack from={0} dur={14} blurFrom={10} style={{ position: 'absolute', inset: 0 }}>
          <CardFloat src="textures/cards/explore-02.png" cssW={CARD.w} cssH={CARD.h} x={CARD.x} y={CARD.y + (1 - enter) * 24} radius={26} shadow={lift}>
            {ROWS.map((row, i) => {
              const t0 = 14 + i * 8;
              const glow = interpolate(f, [t0, t0 + 9, t0 + 21], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute', left: 14, top: row.top * K, width: CARD.w - 28, height: row.h * K,
                    borderRadius: 14,
                    background: 'linear-gradient(90deg, rgba(101,84,199,0.08), rgba(101,84,199,0) 62%)',
                    opacity: glow * 0.7,
                    pointerEvents: 'none',
                  }}
                />
              );
            })}
          </CardFloat>
        </FocusRack>
      </div>

      {/* 2px violet line: quotes → action plan (closing the loop) */}
      <div style={{ position: 'absolute', inset: 0, opacity: lineP }}>
        <LineLink x1={1128} y1={470} x2={1178} y2={464} from={76} dur={10} color={C.violet} width={2} curve={0} opacity={0.8} />
      </div>

      {/* real Action Plan card floats in on the right at 0.82 opacity */}
      <div
        style={{
          position: 'absolute', left: PLAN.x, top: PLAN.y + (1 - planP) * 34, opacity: planP * 0.82,
          transform: `scale(${0.98 + 0.02 * planP})`, transformOrigin: 'left top',
        }}
      >
        <CardFloat src="textures/cards/workbench-10.png" cssW={PLAN.w} cssH={PLAN.h} x={0} y={0} radius={24} shadow={1}>
          {/* one yellow use: ring on "+¥40 — Done" (the decision point) */}
          <div style={{ position: 'absolute', inset: 0, opacity: ringP }}>
            <Ring x={50} y={122} w={60} h={38} from={80} radius={10} thickness={3} />
          </div>
        </CardFloat>
      </div>

      {/* T4: the light fills the frame in the last 20f (S16 starts inside it) */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 56% 46%, rgba(255,255,255,0.98) 0%, rgba(240,236,255,0.85) 38%, rgba(236,231,255,0.4) 62%, rgba(239,237,248,0) 80%)',
          opacity: 0.9 * iris,
          transform: `scale(${0.35 + 2.2 * iris})`,
          pointerEvents: 'none',
        }}
      />

      {/* impact #1: soft violet/white iris expanding over the whole frame */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 56% 46%, rgba(255,255,255,0.9) 0%, rgba(236,231,255,0.45) 42%, rgba(239,237,248,0) 74%)',
          opacity: bloom,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
