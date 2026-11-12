import { DURATION, SHOTS } from './core/timeline';
import { SFX } from './core/sfx';
import { SHOT_COMPONENTS } from './shots';
import { StayCraftPromo } from './StayCraftPromo';

/**
 * video-shotcraft workbench manifest: the same SHOTS / SFX tables that Main.tsx
 * renders are imported here (single source of truth), so the workbench can split
 * the finished film into shots / SFX / BGM tracks without a second copy.
 */
export const WORKBENCH = {
  name: 'StayCraft · 60s product promo (EN)',
  fps: 30,
  width: 1920,
  height: 1080,
  total: DURATION,
  background: '#f4f4f6',
  shots: SHOTS.map((shot) => ({
    id: shot.id,
    label: shot.id + ' ' + shot.title,
    from: shot.from,
    duration: shot.duration,
    component: SHOT_COMPONENTS[shot.id],
  })),
  transitions: [],
  captions: [],
  overlays: [],
  sfx: SFX.map((cue) => ({
    from: cue.from,
    duration: cue.durationInFrames,
    src: cue.src,
    volume: cue.volume,
  })),
  bgm: [{ from: 0, duration: DURATION, src: 'audio/bgm/staycraft-60s.wav', volume: 0.86 }],
  original: StayCraftPromo,
};
