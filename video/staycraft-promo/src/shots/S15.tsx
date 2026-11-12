import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { HANDOFF } from '../core/handoff';
import { PROMO } from '../core/layout';
import { Caption, YellowMark } from '../core/ui';

/**
 * S15 · 手机确认 (1530–1620f, 90f) — card: radial-ripple-phone-chips (effects)
 * The mobile view of the same page: a 420×940 phone floats up with a light orbit,
 * three chips (房态 / 价格 / 措辞) spring in from the phone side, the camera leans
 * toward the save button, the button is pressed, a hint bar + 1px leader extend
 * from it. Then the draft card shrinks and flies along the brand arc — T8, it
 * joins the S16 group photo (same curve + same crop as S16's promo element).
 *
 * 手机截图只取下段（推广草稿 + 保存文案，page y 1430–2300）——中段被烤进截图的
 * 悬浮 tab 栏（约 y 700–800）完全不入画。手机显示宽 420（390 截图 → 0.974x ≤1.08）。
 * 镜长 90f：提示/字幕提前到 f48–62 落定，hold 62–90（28f，比 30f 预算少 2f，已报 Lead）。
 */
const DUR = 90;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// phone geometry
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
const CONTENT_H = SCREEN_H - STATUS_H; // 848
/** top of the mobile capture shown inside the screen (avoids the baked tab bar) */
const PAGE_Y0 = 1430;
/** save pill centre, local to the screen box */
const SAVE = { x: 108 * SCALE, y: STATUS_H + (2273 - PAGE_Y0) * SCALE };

// T8 hand-off: S16 picks the draft card up exactly here (screen coords, handoff.ts)
const T8 = HANDOFF.s15_to_s16.card;

const CHIPS = [
  { label: '房态', t0: 14, y: 330 },
  { label: '价格', t0: 22, y: 500 },
  { label: '措辞', t0: 30, y: 670 },
];

const ChipIcon: React.FC<{ kind: number }> = ({ kind }) => (
  <div
    style={{
      width: 52, height: 52, borderRadius: 26, flex: 'none', background: C.violetFog,
      border: '1px solid rgba(101,84,232,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.violet} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {kind === 0 && <><rect x={4} y={5} width={16} height={15} rx={3} /><path d="M8 3.5V7M16 3.5V7M4 10H20" /></>}
      {kind === 1 && (
        <text x={12} y={17} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize={15} fontWeight={700} fill={C.violet} stroke="none">¥</text>
      )}
      {kind === 2 && <><path d="M5 6.5H19M12 6.5V19" /><path d="M8.5 19h7" /></>}
    </svg>
  </div>
);

export const S15: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t = f / (DUR - 1);

  // phone rises 20f, then keeps a slow orbit (±5°) with a tiny bob
  const rise = interpolate(f, [-10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const phoneY = (1 - rise) * 120;
  const phoneOp = Math.min(1, rise * 2.2);
  const orbit = 5 * Math.sin(t * Math.PI * 2);

  // camera leans to the save button (1 → 1.06, ≤1.08 hard cap)
  const push = interpolate(f, [26, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const pushScale = 1 + 0.06 * push;
  const pushY = -10 * push;

  // click
  const press = interpolate(f, [44, 47, 51], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rippleT = interpolate(f, [44, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const savedP = interpolate(f, [48, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // annotation hint bar appears after the click
  const hintP = interpolate(f, [52, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const labelP = interpolate(f, [62, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // title
  const l1 = interpolate(f, [-6, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const l2 = interpolate(f, [-2, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // T8: the draft card shrinks out of the phone and flies along the arc (74–90)
  const flyT = interpolate(f, [72, DUR - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.2, 0.44, 1) });
  const flyFrom = { x: 1400, y: 700, s: 1.3, r: 0 };
  const fc = { x: lerp(flyFrom.x, T8.x, flyT), y: lerp(flyFrom.y, T8.y, flyT) };
  const fs = lerp(flyFrom.s, T8.scale, flyT);
  const fr = lerp(flyFrom.r, T8.rot, flyT);
  const flyOp = f < 72 ? 0 : Math.min(1, (f - 72) / 4);
  const arcY = -Math.sin(flyT * Math.PI) * 60;

  const draftCardStyle: React.CSSProperties = {
    backgroundImage: `url(${staticFile(PROMO.pageTraffic.src)})`,
    backgroundSize: `${1440 * 0.2732}px ${PROMO.pageTraffic.h * 0.2732}px`,
    backgroundPosition: `-${PROMO.draftsCard.x * 0.2732}px -${PROMO.draftsCard.y * 0.2732}px`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#fff',
  };

  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      {/* soft stage light behind the phone */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 34% 52% at 74% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)' }} />

      {/* ── title block (left) ── */}
      <div style={{ position: 'absolute', left: 120, top: 236, width: 900 }}>
        <div
          style={{
            fontFamily: FONT.zh, fontSize: 96, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.02em', color: C.ink,
            opacity: l1, filter: `blur(${(1 - l1) * 6}px)`, transform: `translateY(${(1 - l1) * 14}px) scale(${(1.06 - 0.06 * l1).toFixed(4)})`,
            transformOrigin: 'left center',
          }}
        >
          发布前
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: FONT.zh, fontSize: 96, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.02em', color: C.ink,
            opacity: l2, filter: `blur(${(1 - l2) * 6}px)`, transform: `translateY(${(1 - l2) * 14}px) scale(${(1.06 - 0.06 * l2).toFixed(4)})`,
            transformOrigin: 'left center', whiteSpace: 'nowrap',
          }}
        >
          <YellowMark from={26}>你</YellowMark>核对房态与措辞
        </div>
      </div>

      {/* ── hint bar: DOM annotation anchored to the save button ── */}
      <div style={{ position: 'absolute', left: 120, top: 700, opacity: hintP }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 16, padding: '20px 30px',
            borderRadius: 18, background: 'rgba(255,255,255,0.97)', border: '1px solid ' + C.line,
            boxShadow: SHADOW.card, fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, color: C.inkSoft, whiteSpace: 'nowrap',
            transform: `translateY(${(1 - hintP) * 14}px)`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: C.violet, flex: 'none' }} />
          发布前请核对房态与价格
        </div>
      </div>
      {/* 1px leader from the hint bar to the pressed save pill */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: hintP }}>
        <path d="M790 762 H1000 L1332 966" fill="none" stroke={C.violet} strokeWidth={1.5} strokeDasharray="6 7" opacity={0.55} />
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
        {/* two-layer landing shadow */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 64,
            boxShadow: '0 4px 10px rgba(24,24,27,0.16), 0 50px 90px -30px rgba(24,24,27,0.34), 0 110px 150px -60px rgba(24,24,27,0.22)',
          }}
        />
        {/* side keys */}
        <div style={{ position: 'absolute', left: -3.5, top: 190, width: 5, height: 60, borderRadius: 3, background: 'linear-gradient(90deg,#8e8e98,#c9c9d1,#8e8e98)' }} />
        <div style={{ position: 'absolute', left: -3.5, top: 268, width: 5, height: 60, borderRadius: 3, background: 'linear-gradient(90deg,#8e8e98,#c9c9d1,#8e8e98)' }} />
        <div style={{ position: 'absolute', right: -3.5, top: 232, width: 5, height: 100, borderRadius: 3, background: 'linear-gradient(90deg,#8e8e98,#c9c9d1,#8e8e98)' }} />
        {/* metal frame */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 60, padding: FRAME, boxSizing: 'border-box',
            background: 'linear-gradient(145deg,#d9d9df 0%,#9f9fa9 30%,#c7c7cf 55%,#82828c 80%,#b7b7c1 100%)',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.4), inset 0 0 0 3px rgba(24,24,27,0.22)',
          }}
        >
          {/* black bezel */}
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 52, background: '#0f0f12', padding: BLACK, boxSizing: 'border-box' }}>
            {/* screen */}
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 44, background: '#fafafa', overflow: 'hidden' }}>
              {/* status bar (real UI capture has none — this is the phone chrome) */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: STATUS_H, background: '#fafafa', zIndex: 3 }}>
                <div style={{ position: 'absolute', left: 30, top: 16, fontFamily: FONT.en, fontSize: 18, fontWeight: 650, color: C.ink, letterSpacing: '0.01em' }}>9:41</div>
                <div style={{ position: 'absolute', right: 26, top: 20, display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                  {[6, 9, 12].map((h, i) => <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: C.ink }} />)}
                  <div style={{ marginLeft: 5, width: 24, height: 12, borderRadius: 3, border: `1.5px solid rgba(24,24,27,0.45)`, boxSizing: 'border-box', padding: 1.5 }}>
                    <div style={{ width: '72%', height: '100%', borderRadius: 2, background: C.ink }} />
                  </div>
                </div>
                <div style={{ position: 'absolute', left: '50%', top: 10, width: 96, height: 28, marginLeft: -48, borderRadius: 14, background: '#0d0d10' }} />
              </div>
              {/* capture window: only the lower continuous band (no baked tab bar) */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: STATUS_H, height: CONTENT_H, overflow: 'hidden' }}>
                <Img
                  src={staticFile('textures/m-promo-traffic2.png')}
                  style={{
                    position: 'absolute', left: 0, top: -PAGE_Y0 * SCALE,
                    width: SRC_W * SCALE, height: 2694 * SCALE, display: 'block',
                  }}
                />
              </div>
              {/* no home bar: at this crop it would sit on the save pill (home affordance = rounded bezel) */}

              {/* click ripple on the save pill */}
              {rippleT > 0 && rippleT < 1 ? (
                <div
                  style={{
                    position: 'absolute', left: SAVE.x - 40 * rippleT, top: SAVE.y - 40 * rippleT,
                    width: 80 * rippleT, height: 80 * rippleT, borderRadius: '50%', boxSizing: 'border-box',
                    border: `3px solid ${C.violet}`, opacity: (1 - rippleT) * 0.95,
                    background: 'radial-gradient(circle, rgba(101,84,232,0) 55%, rgba(101,84,232,0.14) 100%)',
                    zIndex: 4,
                  }}
                />
              ) : null}
              {/* saved state */}
              {savedP > 0 ? (
                <div
                  style={{
                    position: 'absolute', left: SAVE.x - 80, top: SAVE.y - 84,
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(101,84,232,0.30)',
                    boxShadow: '0 8px 18px -10px rgba(24,24,27,0.25)',
                    opacity: savedP, transform: `translateY(${(1 - savedP) * 8}px)`,
                    fontFamily: FONT.zh, fontSize: 34, fontWeight: 600, color: C.violet, whiteSpace: 'nowrap', zIndex: 4,
                  }}
                >
                  <svg width={18} height={18} viewBox="0 0 20 20"><path d="M4 10.5 L8.2 15 L16 5.5" fill="none" stroke={C.violet} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  已保存
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {/* press feedback ring on the pill (DOM layer, above the screen) */}
        {press > 0.02 ? (
          <div
            style={{
              position: 'absolute',
              left: 20 + SAVE.x - 46 * press, top: 20 + SAVE.y - 46 * press,
              width: 92 * press, height: 92 * press, borderRadius: 24 * press,
              border: '2px solid ' + C.violet, opacity: press * 0.9, pointerEvents: 'none',
            }}
          />
        ) : null}
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
              position: 'absolute', left: 940, top: chip.y, opacity: Math.min(1, Math.max(0, (f - chip.t0) / 5)),
              transform: `translateX(${((1 - slide) * 26).toFixed(2)}px) translateY(${fl.toFixed(2)}px) scale(${(0.8 + 0.2 * s).toFixed(4)})`,
              transformOrigin: 'left center',
              display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px 12px 12px', borderRadius: 999,
              background: 'linear-gradient(180deg,#ffffff 0%,#fbfbfd 100%)',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 0 0 1px rgba(24,24,27,0.05), 0 3px 6px rgba(24,24,27,0.06), 0 26px 50px -18px rgba(24,24,27,0.26)',
              fontFamily: FONT.zh, fontSize: 36, fontWeight: 600, letterSpacing: '-0.01em', color: C.ink, whiteSpace: 'nowrap',
            }}
          >
            <ChipIcon kind={i} />
            {chip.label}
          </div>
        );
      })}

      {/* ── T8: the draft card leaves the phone and flies along the brand arc ── */}
      {flyOp > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: fc.x - 150, top: fc.y - 80 + arcY,
            width: 300, height: 158,
            transform: `rotate(${fr.toFixed(2)}deg) scale(${fs.toFixed(4)})`,
            transformOrigin: 'center center',
            borderRadius: 18, overflow: 'hidden',
            border: '1px solid rgba(24,24,27,0.08)',
            boxShadow: '0 22px 44px -16px rgba(24,24,27,0.3), 0 4px 10px rgba(24,24,27,0.1)',
            opacity: flyOp,
            ...draftCardStyle,
          }}
        />
      ) : null}

      {/* ── left annotations ── */}
      <div style={{ position: 'absolute', left: 120, bottom: 176, opacity: labelP, fontFamily: FONT.zh, fontSize: 34, fontWeight: 500, letterSpacing: '0.02em', color: C.muted }}>
        人做最后一步 · 产品原则
      </div>
      <Caption text="AI 起草，你核对，再发出去。" from={56} to={999} bottom={72} align="left" left={120} />
    </AbsoluteFill>
  );
};
