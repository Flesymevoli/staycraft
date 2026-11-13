import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';

export type CamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  persp?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 2.5D camera over a captured demo page. The page lives in its own CSS-pixel
 * space (1440 wide for the full app shell; 1114 wide for the content-only
 * captures; card crops keep their measured CSS size). zoom=1 renders one source
 * CSS px as one output px. Source captures are 2x, so the shots may push zoom
 * up to 1.6 before softening.
 */
export const PageCam: React.FC<{
  src: string;
  pageW?: number;
  pageH: number;
  keys: CamKey[];
  children?: React.ReactNode;
  frame?: number;
  ease?: (t: number) => number;
  blur?: number;
  brightness?: number;
  saturate?: number;
  background?: string;
}> = ({ src, pageW = 1440, pageH, keys, children, frame: frameProp, ease = Easing.bezier(0.33, 0, 0.15, 1), blur = 0, brightness = 1, saturate = 1, background = C.stage }) => {
  const own = useCurrentFrame();
  const frame = frameProp ?? own;
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const t = a.frame === b.frame ? 1 : interpolate(frame, [a.frame, b.frame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const cx = lerp(a.cx, b.cx, t);
  const cy = lerp(a.cy, b.cy, t);
  const zoom = lerp(a.zoom, b.zoom, t);
  const rotX = lerp(a.rotX ?? 0, b.rotX ?? 0, t);
  const rotY = lerp(a.rotY ?? 0, b.rotY ?? 0, t);
  const rotZ = lerp(a.rotZ ?? 0, b.rotZ ?? 0, t);
  const persp = lerp(a.persp ?? 1600, b.persp ?? 1600, t);
  const is3D = [a, b].some((k) => k.rotX !== undefined || k.rotY !== undefined || k.rotZ !== undefined);
  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (brightness !== 1) filters.push(`brightness(${brightness})`);
  if (saturate !== 1) filters.push(`saturate(${saturate})`);

  const page = (
    <div
      style={{
        position: 'absolute',
        width: pageW,
        height: pageH,
        transform: `translate(${960 - cx * zoom}px, ${540 - cy * zoom}px) scale(${zoom})`,
        transformOrigin: '0 0',
        filter: filters.length ? filters.join(' ') : undefined,
      }}
    >
      <Img src={staticFile(src)} style={{ position: 'absolute', width: pageW, height: pageH, display: 'block' }} />
      {children}
    </div>
  );

  if (!is3D) {
    return <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: background }}>{page}</AbsoluteFill>;
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: background }}>
      <div style={{ position: 'absolute', inset: 0, perspective: `${persp}px`, perspectiveOrigin: '960px 540px' }}>
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: '960px 540px', transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)` }}>
          {page}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A captured card/sheet floating on the stage. width/height are CSS px. */
export const PaperCard: React.FC<{
  src: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  radius?: number;
  shadow?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ src, width, height, x = 0, y = 0, rotate = 0, scale = 1, radius = 24, shadow = true, children, style }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      transform: `rotate(${rotate}deg) scale(${scale})`,
      transformOrigin: 'center center',
      borderRadius: radius,
      overflow: 'hidden',
      border: '1px solid ' + C.lineStrong,
      background: C.card,
      boxShadow: shadow ? C.shadow : undefined,
      ...style,
    }}
  >
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', display: 'block' }} />
    {children}
  </div>
);

/** Type helper for page-space overlays; page space is CSS px, same grid as captures. */
export const pageText = (size: number, color: string, weight = 600): React.CSSProperties => ({
  position: 'absolute',
  fontFamily: FONT.en,
  fontSize: size,
  fontWeight: weight,
  color,
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  whiteSpace: 'nowrap',
});
