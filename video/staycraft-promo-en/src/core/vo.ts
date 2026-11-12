import { FPS } from './beat';

export type VoSegment = { id: string; file: string; from: number; durationInFrames: number };

/** English male VO segments, generated with edge-tts (en-US-ChristopherNeural) and
 * trimmed of leading/trailing silence; each fits its shot window (see
 * audio/vo/manifest-vo.json). */
export const VO: VoSegment[] = [
  { id: 'vo-s01', file: 'audio/vo/vo-s01.mp3', from: 9, durationInFrames: 162 },
  { id: 'vo-s02', file: 'audio/vo/vo-s02.mp3', from: 189, durationInFrames: 63 },
  { id: 'vo-s03', file: 'audio/vo/vo-s03.mp3', from: 294, durationInFrames: 56 },
  { id: 'vo-s04', file: 'audio/vo/vo-s04.mp3', from: 384, durationInFrames: 94 },
  { id: 'vo-s05', file: 'audio/vo/vo-s05.mp3', from: 504, durationInFrames: 63 },
  { id: 'vo-s06', file: 'audio/vo/vo-s06.mp3', from: 590, durationInFrames: 44 },
  { id: 'vo-s07', file: 'audio/vo/vo-s07.mp3', from: 669, durationInFrames: 54 },
  { id: 'vo-s08', file: 'audio/vo/vo-s08.mp3', from: 759, durationInFrames: 97 },
  { id: 'vo-s09', file: 'audio/vo/vo-s09.mp3', from: 879, durationInFrames: 50 },
  { id: 'vo-s10', file: 'audio/vo/vo-s10.mp3', from: 963, durationInFrames: 54 },
  { id: 'vo-s11', file: 'audio/vo/vo-s11.mp3', from: 1029, durationInFrames: 147 },
  { id: 'vo-s12', file: 'audio/vo/vo-s12.mp3', from: 1209, durationInFrames: 58 },
  { id: 'vo-s13', file: 'audio/vo/vo-s13.mp3', from: 1299, durationInFrames: 58 },
  { id: 'vo-s14', file: 'audio/vo/vo-s14.mp3', from: 1389, durationInFrames: 88 },
  { id: 'vo-s15', file: 'audio/vo/vo-s15.mp3', from: 1539, durationInFrames: 50 },
  { id: 'vo-s16', file: 'audio/vo/vo-s16.mp3', from: 1629, durationInFrames: 128 },
];

/** BGM ducking: 0.86 normally, 0.40 under narration with 6f ramps. */
export const bgmVolumeAt = (frame: number): number => {
  if (!VO.length) return 0.86;
  const ramp = 6;
  let duck = 0;
  for (const seg of VO) {
    const a = seg.from - ramp;
    const b = seg.from + seg.durationInFrames + ramp;
    const t = frame < a || frame > b ? 0 : Math.min(1, Math.min((frame - a) / ramp, (b - frame) / ramp));
    duck = Math.max(duck, t);
  }
  return 0.86 - 0.54 * duck;
};

export { FPS };
