import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { GlowOrb } from '../core/overlays';
import { WordTitle } from '../core/ui';

/**
 * S16 · Brand + QR close (1620–1800f, 180f)
 * Soft violet stage (#efedf8 → #f7f8fa); real HD logo (width 680, x=180, y=300);
 * white QR card 560×620 (radius 26, soft shadow) at (1180,200) — QR 260×260 static
 * and scannable, labels "Scan to explore StayCraft" 32px / "staycraft.online" 34px
 * violet; official footer "Clearer signals. / Better decisions." 96px (x=180,
 * y=640, two lines end ≈860, outside the bottom-centre 140px safe strip); small
 * "Concept demo · fictional data" 32px muted at (180,920).
 * Camera 1.0→1.02, no orbit. Logo lands 0.98→1 (24f), QR card 1.04→1 (18f),
 * footer word-stamps, soft bloom at f≈1690 (impact #2). Last 45f completely still.
 */
const LOGO = { x: 180, y: 300, w: 680 };
const QR = { x: 1180, y: 200, w: 560, h: 620 };

export const S16: React.FC = () => {
  const f = useCurrentFrame();
  // camera: very slow push, fully settled well before the final hold
  const push = interpolate(f, [0, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const zoom = 1 + 0.02 * push;

  // seam from S15's closing bloom, then the entrance landings
  // S15's closing light iris: S16 opens inside the light and settles into the stage
  const seam = interpolate(f, [0, 14], [0.88, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const logoIn = interpolate(f, [2, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const logoScale = interpolate(f, [2, 26], [0.98, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const qrIn = interpolate(f, [8, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const qrScale = interpolate(f, [8, 26], [1.04, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const smallIn = interpolate(f, [58, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  // impact #2: soft bloom as logo/QR land (peak f1690 = rel 70), then static
  const bloom = interpolate(f, [56, 70, 88, 104], [0, 0.32, 0.16, 0.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1150px 820px at 52% 46%, #f8f6ff 0%, #efedf8 60%, #f2f3f5 100%)', overflow: 'hidden' }}>
      <GlowOrb x={780} y={470} r={720} from={40} to={70} opacity={0.42} />
      <GlowOrb x={1410} y={440} r={480} from={50} to={80} opacity={0.26} />

      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '960px 540px' }}>
        {/* real logo lockup (transparent HD PNG, never recoloured) */}
        <div
          style={{
            position: 'absolute', left: LOGO.x, top: LOGO.y, width: LOGO.w,
            opacity: logoIn, transform: `scale(${logoScale})`, transformOrigin: 'left center',
          }}
        >
          <Img src={staticFile('brand/StayCraft-main-HD.png')} style={{ width: LOGO.w, display: 'block' }} />
        </div>

        {/* QR card: static scannable QR + the two lines only */}
        <div
          style={{
            position: 'absolute', left: QR.x, top: QR.y, width: QR.w, height: QR.h,
            background: C.card, borderRadius: 26, border: '1px solid ' + C.lineStrong,
            boxShadow: '0 16px 44px rgba(24,24,28,0.10), 0 3px 12px rgba(43,34,73,0.05)',
            opacity: qrIn, transform: `scale(${qrScale})`, transformOrigin: '50% 40%',
          }}
        >
          <div style={{ position: 'absolute', left: (QR.w - 260) / 2, top: 84, width: 260, height: 260 }}>
            <Img src={staticFile('brand/qr-staycraft.png')} style={{ width: 260, height: 260, display: 'block' }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 396, textAlign: 'center', fontFamily: FONT.en, fontSize: 32, fontWeight: 600, color: C.ink }}>
            Scan to explore StayCraft
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 448, textAlign: 'center', fontFamily: FONT.mono, fontSize: 34, fontWeight: 500, color: C.violet, letterSpacing: '0.01em' }}>
            staycraft.online
          </div>
        </div>

        {/* official footer (bottom-left, outside the bottom-centre safe strip) */}
        <WordTitle
          lines={['Clearer signals.', 'Better decisions.']}
          from={22}
          size={96}
          stagger={5}
          style={{ position: 'absolute', left: 180, top: 640 }}
        />

        {/* small print (left edge) */}
        <div
          style={{
            position: 'absolute', left: 180, top: 920,
            fontFamily: FONT.en, fontSize: 32, fontWeight: 500, color: C.muted,
            opacity: smallIn, transform: `translateY(${(1 - smallIn) * 8}px)`,
          }}
        >
          Concept demo · fictional data
        </div>

        {/* impact #2: soft light bloom on the lockup, not a white flash */}
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse 62% 54% at 52% 46%, rgba(255,255,255,0.95) 0%, rgba(238,233,255,0.5) 44%, rgba(239,237,248,0) 76%)',
            opacity: bloom,
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>

      {/* seam from S15's closing bloom (fades out over the first 16f) */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 66% 58% at 56% 46%, rgba(255,255,255,0.85) 0%, rgba(236,231,255,0.4) 46%, rgba(239,237,248,0) 76%)',
          opacity: seam,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
