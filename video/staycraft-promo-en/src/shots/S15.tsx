import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { HANDOFF } from '../core/handoff';
import { Caption, YellowMark } from '../core/ui';

/**
 * S15 · Human check (1530–1620f, 90f) — card: radial-ripple-phone-chips (effects)
 * EN adaptation (01-en-facts §3.7, 02-copy-en S15/E5): the phone shows the real EN
 * mobile promotion page cropped to the "Promotion copy" area. The baked-in floating
 * tab bar band and the Chinese AI blocks are never in frame: the screen is built from
 * page 640–760 (Promotion copy heading + Simple/Social) and page 845–1150 (Dates row
 * + Generate + Saved drafts); between them sits the Social sample card carried over
 * from S14, labelled "Sample copy · English edition" (the demo never generated English).
 *
 * Chips Rooms / Rates / Wording; the camera leans to Generate, presses it, and a hint
 * bar restates the human-check principle. T8: the mobile promotion-chrome card flies
 * out along the brand arc to HANDOFF.s15_to_s16 (same constant S16 reads).
 */
const DUR = 90;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// phone geometry (same as CN cut)
const FRAME = 12;
const BLACK = 8;
const PW = 420;
const PH = 940;
const PX = 1250;
const PY = 70;
const SCREEN_W = PW - (FRAME + BLACK) * 2; // 380
const SRC_W = 390;
const SCREEN_H = PH - (FRAME + BLACK) * 2; // 900
const SCALE = SCREEN_W / SRC_W; // 0.9744
const STATUS_H = 52;

/** EN mobile page crops (page px, 390-wide grid) */
const CROP_A = { y: 640, h: 120 };   // Promotion copy heading + Simple/Social
const CROP_B = { y: 845, h: 305 };   // Dates row + Generate + Saved drafts
const A_H = CROP_A.h * SCALE;
const B_H = CROP_B.h * SCALE;
const A_TOP = STATUS_H;
const DOM_TOP = A_TOP + A_H + 26;
const DOM_H = 305;
const B_TOP = DOM_TOP + DOM_H + 20;
/** Generate button centre in screen-local coords (page 45..148 x, 884..915 y) */
const GEN = { x: ((45 + 148) / 2) * SCALE, y: B_TOP + (899.5 - CROP_B.y) * SCALE };

// T8 hand-off: S16 picks the mobile promo card up exactly here (handoff.ts)
const T8 = HANDOFF.s15_to_s16.card;

const COPY = {
  headline: ['Before you post,', 'check the details.'],
  caption: 'You check. Then post.',
  hint: 'Check rooms, rates and wording.',
  small: 'Human in the loop · product principle',
  sample: 'Sample copy · English edition',
  social: ['We came for one night.', 'Stayed for the quiet.'],
};

const CHIPS = [
  { label: 'Rooms', t0: 14, y: 330 },
  { label: 'Rates', t0: 22, y: 500 },
  { label: 'Wording', t0: 30, y: 670 },
];

const ChipIcon: React.FC<{ kind: number }> = ({ kind }) => (
  <div
    style={{
      width: 52, height: 52, borderRadius: 26, flex: 'none', background: C.violetFog,
      border: '1px solid rgba(101,84,232,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.violet} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {kind === 0 && <><path d="M3 18V8.5A1.5 1.5 0 0 1 4.5 7H14v11" /><path d="M14 10h5.5A1.5 1.5 0 0 1 21 11.5V18" /><path d="M3 18h18M6.5 18v-3.5h4V18" /></>}
      {kind === 1 && (
        <text x={12} y={17} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize={15} fontWeight={700} fill={C.violet} stroke="none">¥</text>
      )}
      {kind === 2 && <><path d="M5 7H19M12 7V18" /><path d="M8.5 18h7" /></>}
    </svg>
  </div>
);

export const S15: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / (DUR - 1);

  // phone rises (pre-rolled 10f so the cut frame is not empty), then slow orbit
  const rise = interpolate(f, [-10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const phoneY = (1 - rise) * 120;
  const phoneOp = Math.min(1, rise * 2.2);
  const orbit = 5 * Math.sin(t * Math.PI * 2);

  // camera leans to Generate (1 → 1.06, ≤1.08 hard cap)
  const push = interpolate(f, [26, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const pushScale = 1 + 0.06 * push;
  const pushY = -10 * push;

  // click
  const press = interpolate(f, [44, 47, 51], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rippleT = interpolate(f, [44, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const checkedP = interpolate(f, [48, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // annotation hint bar appears after the click
  const hintP = interpolate(f, [52, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const labelP = interpolate(f, [62, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // headline (3 visual lines; copy sentence kept intact)
  const l1 = interpolate(f, [-6, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const l2 = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const l3 = interpolate(f, [4, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // T8: mobile promo chrome card leaves the phone and flies along the arc (72–89)
  const flyT = interpolate(f, [72, DUR - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.2, 0.44, 1) });
  const flyFrom = { x: 1450, y: 560, s: 1.2, r: 0 };
  const fc = { x: lerp(flyFrom.x, T8.x, flyT), y: lerp(flyFrom.y, T8.y, flyT) };
  const fs = lerp(flyFrom.s, T8.scale, flyT);
  const fr = lerp(flyFrom.r, T8.rot, flyT);
  const flyOp = f < 72 ? 0 : Math.min(1, (f - 72) / 4);
  const arcY = -Math.sin(flyT * Math.PI) * 60;
  // T8 card = the same EN mobile promotion-chrome crop S16 will carry as its mobile element
  const T8CARD = { w: 300, h: 92, s: 300 / 390 };

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 34% 52% at 74% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)' }} />

      {/* ── headline (left) ── */}
      <div style={{ position: 'absolute', left: 120, top: 226, width: 1000 }}>
        {COPY.headline.map((line, i) => {
          const p = i === 0 ? l1 : i === 1 ? l2 : l3;
          return (
            <div
              key={line}
              style={{
                fontFamily: FONT.en, fontSize: 96, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em',
                color: C.ink, whiteSpace: 'nowrap',
                opacity: p, filter: `blur(${(1 - p) * 6}px)`,
                transform: `translateY(${(1 - p) * 14}px) scale(${(1.06 - 0.06 * p).toFixed(4)})`,
                transformOrigin: 'left center',
              }}
            >
              {i === 2 ? <>wording.</> : line}
            </div>
          );
        })}
      </div>

      {/* ── hint bar: DOM annotation anchored to Generate ── */}
      <div style={{ position: 'absolute', left: 120, top: 690, opacity: hintP }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 16, padding: '20px 30px',
            borderRadius: 18, background: 'rgba(255,255,255,0.97)', border: '1px solid ' + C.line,
            boxShadow: SHADOW.card, fontFamily: FONT.en, fontSize: 34, fontWeight: 500, color: C.inkSoft, whiteSpace: 'nowrap',
            transform: `translateY(${(1 - hintP) * 14}px)`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: C.violet, flex: 'none' }} />
          {COPY.hint}
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: hintP }}>
        <path d="M790 752 H1000 L1358 659" fill="none" stroke={C.violet} strokeWidth={1.5} strokeDasharray="6 7" opacity={0.55} />
      </svg>

      {/* ── phone ── */}
      <div
        style={{
          position: 'absolute', left: PX, top: PY, width: PW, height: PH,
          opacity: phoneOp,
          transform: `translateY(${phoneY.toFixed(2)}px) rotate(${orbit.toFixed(2)}deg) scale(${pushScale.toFixed(4)})`,
          transformOrigin: '50% 52%',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, borderRadius: 64, boxShadow: '0 4px 10px rgba(24,24,27,0.16), 0 50px 90px -30px rgba(24,24,27,0.34), 0 110px 150px -60px rgba(24,24,27,0.22)' }} />
        <div style={{ position: 'absolute', left: -3.5, top: 190, width: 5, height: 60, borderRadius: 3, background: 'linear-gradient(90deg,#8e8e98,#c9c9d1,#8e8e98)' }} />
        <div style={{ position: 'absolute', left: -3.5, top: 268, width: 5, height: 60, borderRadius: 3, background: 'linear-gradient(90deg,#8e8e98,#c9c9d1,#8e8e98)' }} />
        <div style={{ position: 'absolute', right: -3.5, top: 232, width: 5, height: 100, borderRadius: 3, background: 'linear-gradient(90deg,#8e8e98,#c9c9d1,#8e8e98)' }} />
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 60, padding: FRAME, boxSizing: 'border-box',
            background: 'linear-gradient(145deg,#d9d9df 0%,#9f9fa9 30%,#c7c7cf 55%,#82828c 80%,#b7b7c1 100%)',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.4), inset 0 0 0 3px rgba(24,24,27,0.22)',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 52, background: '#0f0f12', padding: BLACK, boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 44, background: '#fafafa', overflow: 'hidden' }}>
              {/* status bar */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: STATUS_H, background: '#fafafa', zIndex: 3 }}>
                <div style={{ position: 'absolute', left: 30, top: 16, fontFamily: FONT.en, fontSize: 18, fontWeight: 650, color: C.ink, letterSpacing: '0.01em' }}>9:41</div>
                <div style={{ position: 'absolute', right: 26, top: 20, display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                  {[6, 9, 12].map((h, i) => <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: C.ink }} />)}
                  <div style={{ marginLeft: 5, width: 24, height: 12, borderRadius: 3, border: '1.5px solid rgba(24,24,27,0.45)', boxSizing: 'border-box', padding: 1.5 }}>
                    <div style={{ width: '72%', height: '100%', borderRadius: 2, background: C.ink }} />
                  </div>
                </div>
                <div style={{ position: 'absolute', left: '50%', top: 10, width: 96, height: 28, marginLeft: -48, borderRadius: 14, background: '#0d0d10' }} />
              </div>

              {/* crop A: Promotion copy heading + Simple/Social (real EN page 640–760) */}
              <div style={{ position: 'absolute', left: 0, top: A_TOP, width: SCREEN_W, height: A_H, overflow: 'hidden' }}>
                <Img
                  src={staticFile('textures/m-promotion.png')}
                  style={{ position: 'absolute', left: 0, top: -CROP_A.y * SCALE, width: SRC_W * SCALE, height: 1286 * SCALE, display: 'block' }}
                />
              </div>

              {/* the Social sample card carried over from S14 (DOM copy, clearly labelled) */}
              <div
                style={{
                  position: 'absolute', left: 16, top: DOM_TOP, width: SCREEN_W - 32, height: DOM_H,
                  background: '#ffffff', border: '1px solid ' + C.line, borderRadius: 18, boxSizing: 'border-box',
                  padding: '16px 18px', display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: FONT.en, fontSize: 22, fontWeight: 600, color: C.violet, letterSpacing: '0.01em' }}>Promotion copy · Social</div>
                  </div>
                <div style={{ marginTop: 14, fontFamily: FONT.en, fontSize: 30, fontWeight: 600, lineHeight: 1.28, color: C.ink, letterSpacing: '-0.02em' }}>
                  <div>{COPY.social[0]}</div>
                  <div>Stayed for the quiet.</div>
                </div>
                <div style={{ marginTop: 'auto', fontFamily: FONT.en, fontSize: 20, fontWeight: 500, color: C.muted }}>
                  {COPY.sample}
                </div>
              </div>

              {/* crop B: Dates row + Generate + Saved drafts (real EN page 845–1150) */}
              <div style={{ position: 'absolute', left: 0, top: B_TOP, width: SCREEN_W, height: B_H, overflow: 'hidden' }}>
                <Img
                  src={staticFile('textures/m-promotion.png')}
                  style={{ position: 'absolute', left: 0, top: -CROP_B.y * SCALE, width: SRC_W * SCALE, height: 1286 * SCALE, display: 'block' }}
                />
              </div>

              {/* click ripple on Generate */}
              {rippleT > 0 && rippleT < 1 ? (
                <div
                  style={{
                    position: 'absolute', left: GEN.x - 42 * rippleT, top: GEN.y - 42 * rippleT,
                    width: 84 * rippleT, height: 84 * rippleT, borderRadius: '50%', boxSizing: 'border-box',
                    border: `3px solid ${C.violet}`, opacity: (1 - rippleT) * 0.95,
                    background: 'radial-gradient(circle, rgba(101,84,232,0) 55%, rgba(101,84,232,0.14) 100%)', zIndex: 4,
                  }}
                />
              ) : null}
              {/* checked state */}
              {checkedP > 0 ? (
                <div
                  style={{
                    position: 'absolute', left: GEN.x + 48, top: GEN.y - 58,
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(101,84,232,0.30)',
                    boxShadow: '0 8px 18px -10px rgba(24,24,27,0.25)',
                    opacity: checkedP, transform: `translateY(${(1 - checkedP) * 8}px)`,
                    fontFamily: FONT.en, fontSize: 22, fontWeight: 600, color: C.violet, whiteSpace: 'nowrap', zIndex: 4,
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 20 20"><path d="M4 10.5 L8.2 15 L16 5.5" fill="none" stroke={C.violet} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Checked
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── three chips: spring pop from the phone side, then float ── */}
      {CHIPS.map((chip, i) => {
        const s = spring({ frame: f - chip.t0, fps, config: { damping: 13, stiffness: 190 } });
        const slide = interpolate(f, [chip.t0, chip.t0 + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
        const floatIn = interpolate(f, [chip.t0 + 18, chip.t0 + 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.soft });
        const fl = Math.sin(t * Math.PI * 2 * 2 + i * 1.8) * 8 * floatIn;
        return (
          <div
            key={chip.label}
            style={{
              position: 'absolute', left: 930, top: chip.y, opacity: Math.min(1, Math.max(0, (f - chip.t0) / 5)),
              transform: `translateX(${((1 - slide) * 26).toFixed(2)}px) translateY(${fl.toFixed(2)}px) scale(${(0.8 + 0.2 * s).toFixed(4)})`,
              transformOrigin: 'left center',
              display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px 12px 12px', borderRadius: 999,
              background: 'linear-gradient(180deg,#ffffff 0%,#fbfbfd 100%)',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 0 0 1px rgba(24,24,27,0.05), 0 3px 6px rgba(24,24,27,0.06), 0 26px 50px -18px rgba(24,24,27,0.26)',
              fontFamily: FONT.en, fontSize: 36, fontWeight: 600, letterSpacing: '-0.01em', color: C.ink, whiteSpace: 'nowrap',
            }}
          >
            <ChipIcon kind={i} />
            {chip.label}
          </div>
        );
      })}

      {/* ── T8: the mobile promotion-chrome card flies out to the S16 hand-off ── */}
      {flyOp > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: fc.x - T8CARD.w / 2, top: fc.y - T8CARD.h / 2 + arcY,
            width: T8CARD.w, height: T8CARD.h,
            transform: `rotate(${fr.toFixed(2)}deg) scale(${fs.toFixed(4)})`,
            transformOrigin: 'center center',
            borderRadius: 14, overflow: 'hidden',
            border: '1px solid rgba(24,24,27,0.08)',
            boxShadow: '0 22px 44px -16px rgba(24,24,27,0.3), 0 4px 10px rgba(24,24,27,0.1)',
            opacity: flyOp,
            backgroundImage: `url(${staticFile('textures/m-promotion.png')})`,
            backgroundSize: `${390 * T8CARD.s}px ${1286 * T8CARD.s}px`,
            backgroundPosition: `0px ${-CROP_A.y * T8CARD.s}px`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#fff',
          }}
        />
      ) : null}

      {/* ── left annotations ── */}
      <div style={{ position: 'absolute', left: 120, bottom: 176, opacity: labelP, fontFamily: FONT.en, fontSize: 34, fontWeight: 500, letterSpacing: '0.01em', color: C.muted }}>
        {COPY.small}
      </div>
      <Caption text={COPY.caption} from={56} to={999} bottom={72} align="left" left={120} />
    </AbsoluteFill>
  );
};
