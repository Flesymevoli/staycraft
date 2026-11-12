import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, SHADOW } from '../core/theme';
import { useFilmOptions } from '../core/options';

const LOGO_W = 760;

/**
 * S02 品牌接棒 (180–285f, 105f).
 * T1 tail: opens on the white seam of S01, the flash blooms out into paper.
 * Logo stamp -> tagline -> hold 30f -> the underline grows and keeps going right
 * (T2 hands the line to S03, where it becomes the top edge of the workspace window).
 */
export const S02: React.FC = () => {
  const { captions: captionsOn } = useFilmOptions();
  const f = useCurrentFrame();

  // flash bloom (0-16)
  const bloom = interpolate(f, [0, 14], [1, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const bloomScale = interpolate(f, [0, 16], [0.25, 1.6], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  // logo entrance (18-40), then hold
  const logoIn = interpolate(f, [18, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const logoScale = interpolate(logoIn, [0, 1], [1.14, 1]);
  const logoBlur = (1 - logoIn) * 10;

  // tagline lines
  const l1 = interpolate(f, [42, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const l2 = interpolate(f, [48, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const captionIn = interpolate(f, [64, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });

  // underline: draws under tagline then extends off to the right (hands to S03)
  const underline = interpolate(f, [80, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const extend = interpolate(f, [92, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const underlineW = 560 * underline + extend * 2100;

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
      {/* single-point violet glow behind the wordmark (Q4: one point, clipped by frame) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 330,
          width: 1100,
          height: 700,
          marginLeft: -550,
          background: 'radial-gradient(closest-side, rgba(101,84,232,0.16), rgba(101,84,232,0.05) 55%, rgba(101,84,232,0) 72%)',
          opacity: interpolate(f, [18, 44, 86], [0, 1, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      />

      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            fontFamily: FONT.en,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '0.22em',
            color: C.muted,
            opacity: logoIn,
            marginBottom: 46,
          }}
        >
          AI DECISION WORKBENCH · STAYCRAFT
        </div>
        <div style={{ opacity: logoIn, filter: `blur(${logoBlur}px)`, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('brand/staycraft-logo.png')} style={{ width: LOGO_W, display: 'block' }} />
        </div>

        <div style={{ marginTop: 70, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: FONT.en,
              fontSize: 104,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.14,
              color: C.ink,
              opacity: l1,
              filter: `blur(${(1 - l1) * 6}px)`,
              transform: `translateY(${(1 - l1) * 16}px)`,
            }}
          >
            See your business.
          </div>
          <div
            style={{
              fontFamily: FONT.en,
              fontSize: 104,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.14,
              color: C.ink,
              opacity: l2,
              filter: `blur(${(1 - l2) * 6}px)`,
              transform: `translateY(${(1 - l2) * 16}px)`,
            }}
          >
            Plan your next move.
          </div>
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: FONT.en,
            fontSize: 56,
            display: captionsOn ? 'block' : 'none',
            fontWeight: 500,
            color: C.muted,
            opacity: captionIn,
            transform: `translateY(${(1 - captionIn) * 10}px)`,
          }}
        >
          Bookings, rates, quotes — one view.
        </div>
      </div>

      {/* T2: the line under the tagline grows and keeps going right into S03 */}
      <div style={{ position: 'absolute', left: '50%', marginLeft: -underlineW / 2, top: 856, height: 6, width: underlineW, background: C.ink, borderRadius: 3, boxShadow: SHADOW.float }} />

      {/* bloom: white light seam opening out of S01 */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            left: 1405,
            top: 550,
            width: 960,
            height: 960,
            marginLeft: -480,
            marginTop: -480,
            background: C.paper,
            opacity: bloom,
            transform: `scale(${bloomScale})`,
            borderRadius: 480,
            boxShadow: '0 0 200px 90px rgba(255,255,255,1)',
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};