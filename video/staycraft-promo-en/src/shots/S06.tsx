import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import type { FC, ReactNode } from 'react';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { Caption, Grain } from '../core/ui';

/**
 * S06 · Booked vs still open (585–660f, 2.5s) — EN fallback cut
 * The EN demo does not expose a readable "Completed booking value" card (collapsed accordion
 * / capture failed), so the two books become: **Booked (19 / 35 · ¥10,802.33)** vs
 * **Still open (16 room nights · 8–10 Nov gap)**, per Lead-approved fallback.
 * card-flip-reveal（4f 预备 + 16f 翻 + spring d15、194° 过冲、12f 错峰、侧棱 56–124° 受光带、面按 |cos| 压暗）。
 * 正面 = EN analysis 页真实 UI 裁片（左：Booking progress + Booked amount 两格；右：折线低谷 11-08 附近）。
 * 末 8f 右卡缩小 + dim（T9）：右卡背 = "Still open / 16 room nights"，S07 按此接。
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

const CW = 480;
const CH = 300;
const Y = 450;
const LEFT_X = 330; // center 570
const RIGHT_X = 1110; // center 1350 = handoff cardAt center
const T9_SCALE = 0.875;
const SEAM_X = 960;
const PAGE_W = 1440;
const PAGE_H = 1530;

const angleAt = (f: number, s: number) => {
  const t = f - s;
  if (t <= 0) return 0;
  if (t < 4) return -10 * ramp(t, 0, 4, EASE.out);
  if (t < 20) return -10 + 204 * ramp(t, 4, 20, Easing.bezier(0.55, 0, 0.3, 1));
  const settle = spring({ frame: t - 20, fps: 30, config: { damping: 15, stiffness: 190, mass: 1 } });
  return 194 - 14 * settle;
};

const FaceLight: FC<{ angle: number; dark: boolean }> = ({ angle, dark }) => {
  const c = Math.abs(Math.cos((angle * Math.PI) / 180));
  const shade = (1 - c) * (dark ? 0.5 : 0.38);
  const band = Math.max(0, 1 - Math.abs(angle - 90) / 34);
  const pos = Math.min(1, Math.max(0, (angle - 56) / 68)) * 140 - 20;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: shade, pointerEvents: 'none' }} />
      {band > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: band * (dark ? 0.4 : 0.3),
            background: 'linear-gradient(100deg, rgba(255,255,255,0) ' + (pos - 14) + '%, rgba(255,255,255,0.85) ' + pos + '%, rgba(255,255,255,0) ' + (pos + 14) + '%)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </>
  );
};

/** one real EN page crop, placed inside the card front */
const Crop: FC<{ cropX: number; cropY: number; cropW: number; cropH: number; k: number; left: number; top: number }> = ({
  cropX,
  cropY,
  cropW,
  cropH,
  k,
  left,
  top,
}) => (
  <div style={{ position: 'absolute', left, top, width: cropW * k, height: cropH * k, overflow: 'hidden', borderRadius: 10, border: '1px solid ' + C.line, background: '#fff' }}>
    <Img
      src={staticFile('textures/app-analysis.png')}
      style={{ position: 'absolute', left: -cropX * k, top: -cropY * k, width: PAGE_W * k, height: PAGE_H * k, display: 'block' }}
    />
  </div>
);

/** left front: Booking progress (19 / 35) + Booked amount (¥10,802.33), two real metric cells */
const FrontBooked: FC = () => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', background: '#ffffff', border: '1px solid ' + C.line, boxShadow: SHADOW.card }}>
    <Crop cropX={561} cropY={360} cropW={277} cropH={128} k={1.08} left={8} top={8} />
    <Crop cropX={838} cropY={360} cropW={277} cropH={128} k={1.08} left={8} top={154} />
    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }} />
  </div>
);

/** right front: daily occupancy chart around the 11-08 low point (real texture) */
const FrontOpen: FC = () => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', background: '#ffffff', border: '1px solid ' + C.line, boxShadow: SHADOW.card }}>
    <Crop cropX={700} cropY={870} cropW={320} cropH={200} k={1.5} left={0} top={0} />
    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }} />
  </div>
);

const BackFace: FC<{ kicker: string; value: string; valueSize: number; subLines: string[]; land: number }> = ({
  kicker,
  value,
  valueSize,
  subLines,
  land,
}) => {
  const f = useCurrentFrame();
  const num = ramp(f, land - 6, land + 2, EASE.out);
  const label = ramp(f, land, land + 6, EASE.out);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 26,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%)',
        border: '1px solid ' + C.line,
        boxShadow: SHADOW.card,
        padding: '28px 30px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: label }}>
        <span style={{ width: 9, height: 9, borderRadius: 5, background: C.violet, display: 'inline-block' }} />
        <span style={{ fontFamily: FONT.en, fontSize: 30, fontWeight: 600, color: C.violet, letterSpacing: '0.02em' }}>{kicker}</span>
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: FONT.num,
          fontSize: valueSize,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: C.ink,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          transform: 'scale(' + (1.08 - 0.08 * num) + ')',
          transformOrigin: 'left center',
        }}
      >
        {value}
      </div>
      <div style={{ position: 'absolute', left: 30, right: 26, bottom: 26 }}>
        {subLines.map((t, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT.en,
              fontSize: 34,
              fontWeight: 500,
              lineHeight: 1.35,
              color: i === 0 ? C.ink : C.muted,
              opacity: label,
              transform: 'translateY(' + (1 - label) * 8 + 'px)',
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

const FlipCard: FC<{ side: 'left' | 'right'; frame: number; front: ReactNode; back: ReactNode; s: number }> = ({ side, frame, front, back, s }) => {
  const angle = angleAt(frame, s);
  const lift = Math.max(0, Math.sin((Math.min(180, Math.max(0, angle)) * Math.PI) / 180));
  const enter = Math.min(1, Math.max(0, (frame - s) / 20));
  const offset = (1 - enter) * 70;
  const x = side === 'left' ? LEFT_X + offset : RIGHT_X - offset;
  // T9: right card shrinks + dims for the S07 hand-off (content = Still open / 16 room nights)
  const t9 = side === 'right' ? ramp(frame, 67, 75, EASE.inOut) : 0;
  const shrink = 1 - (1 - T9_SCALE) * t9;
  const dim = 1 - 0.3 * t9;
  const fadeIn = ramp(frame, 0, 5, EASE.out);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: Y,
        width: CW,
        height: CH,
        perspective: 1600,
        opacity: fadeIn * dim,
        transform: 'scale(' + shrink + ')',
        transformOrigin: 'center center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: 'translateZ(' + lift * 60 + 'px) rotateY(' + angle + 'deg)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', backfaceVisibility: 'hidden' }}>
          {front}
          <FaceLight angle={angle} dark />
        </div>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {back}
          <FaceLight angle={180 - angle} dark={false} />
        </div>
      </div>
    </div>
  );
};

const PressLine: FC<{ children: ReactNode; start: number }> = ({ children, start }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.en,
        fontSize: 96,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        color: C.ink,
        whiteSpace: 'nowrap',
        opacity: p,
        filter: p >= 0.999 ? undefined : 'blur(' + (1 - p) * 6 + 'px)',
        transform: 'translateY(' + (1 - p) * 16 + 'px)',
      }}
    >
      {children}
    </div>
  );
};

export const S06: FC = () => {
  const f = useCurrentFrame();
  const seamMorph = ramp(f, 0, 20, EASE.inOut);
  const seamTop = 220 + (Y - 220) * seamMorph;
  const seamH = 640 + (CH - 640) * seamMorph;
  const seamOp = 1 - 0.5 * ramp(f, 20, 40, EASE.inOut) - 0.15 * ramp(f, 67, 75, EASE.inOut);
  const markP = ramp(f, 38, 50, EASE.inOut);
  const labelIn = ramp(f, 54, 64, EASE.out);
  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: SEAM_X - 2,
          top: seamTop,
          width: 4,
          height: seamH,
          borderRadius: 2,
          background: C.yellow,
          opacity: seamOp,
          boxShadow: '0 0 22px rgba(255,220,50,0.45)',
        }}
      />

      {/* left book: booked (19 / 35 · ¥10,802.33) */}
      <FlipCard
        side="left"
        s={0}
        frame={f}
        front={<FrontBooked />}
        back={<BackFace kicker="Booked" value="19 / 35" valueSize={96} subLines={['¥10,802.33', '19 room nights']} land={20} />}
      />
      {/* right book: still open (16 room nights · 8–10 Nov) */}
      <FlipCard
        side="right"
        s={12}
        frame={f}
        front={<FrontOpen />}
        back={<BackFace kicker="Still open" value="16" valueSize={120} subLines={['room nights · 8–10 Nov']} land={32} />}
      />

      {/* headline: Booked. / Still open. (yellow marker on the gap word "open") */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 176, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PressLine start={27}>Booked.</PressLine>
        <PressLine start={31}>
          <span>{'Still '}</span>
          <span style={{ position: 'relative', display: 'inline-block', padding: '0 8px' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '0.04em',
                height: '0.56em',
                background: C.yellow,
                borderRadius: 4,
                transform: 'scaleX(' + markP + ')',
                transformOrigin: 'left center',
              }}
            />
            <span style={{ position: 'relative' }}>open.</span>
          </span>
        </PressLine>
      </div>

      <Caption text="Nineteen room nights booked. Sixteen still open." from={48} to={80} bottom={92} />

      <div
        style={{
          position: 'absolute',
          right: 140,
          bottom: 30,
          fontFamily: FONT.en,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: C.muted,
          opacity: labelIn,
        }}
      >
        Demo data · bookings, not revenue.
      </div>

      <Grain opacity={0.015} />
    </AbsoluteFill>
  );
};
