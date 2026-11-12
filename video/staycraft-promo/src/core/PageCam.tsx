import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { FONT } from './theme';

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
 * 2.5D camera over a real page screenshot. The page lives in its own CSS-pixel
 * space (1440 wide for the captured desktop app). zoom=1 means 1 source CSS px
 * renders as 1 output px; the storyboard caps zoom at 1.15 because the source
 * captures are 1x (see docs/01 §6.2).
 *
 * children are page-space overlays, positioned with the same 1440-wide px grid
 * as the screenshots (use src/core/layout.ts regions).
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
  saturate?: number;
  background?: string;
}> = ({ src, pageW = 1440, pageH, keys, children, frame: frameProp, ease = Easing.bezier(0.33, 0, 0.15, 1), blur = 0, saturate = 1, background = '#ffffff' }) => {
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transformOrigin: `${960}px ${540}px`,
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
          }}
        >
          {page}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A real page screenshot placed on the fog stage as a "sheet of paper". */
export const PaperSheet: React.FC<{
  src: string;
  pageH: number;
  width?: number;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  shadow?: boolean;
  children?: React.ReactNode;
}> = ({ src, pageH, width = 1440, x = 0, y = 0, rotate = 0, scale = 1, shadow = true, children }) => {
  const ratio = width / 1440;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: pageH * ratio,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        transformOrigin: 'center center',
        borderRadius: 26,
        overflow: 'hidden',
        border: '1px solid #e1e1e7',
        background: '#fff',
        boxShadow: shadow ? '0 2px 6px rgba(24,24,27,0.05), 0 30px 80px -30px rgba(24,24,27,0.18)' : undefined,
        fontFamily: FONT.zh,
      }}
    >
      <Img src={staticFile(src)} style={{ width: '100%', height: '100%', display: 'block' }} />
      {children}
    </div>
  );
};
