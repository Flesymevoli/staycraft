export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1800;

// BGM: 60s edit of Mixkit tech-house, time-remapped to exactly 120 BPM.
export const BPM = 120;
export const BEAT_F = 15; // at 30fps, 120BPM
export const BAR_F = 60; // 4/4
export const TOTAL_BEATS = 120;
export const TOTAL_BARS = 30;

// Measured phase of the first downbeat in the rendered 60s audio bed (seconds).
// Refined by re-analysing the exported audio; keep as the single audio offset source.
export const BGM_T0_SEC = 0.008;

/** frame of beat n (n may be fractional). */
export const beatF = (n: number): number => Math.round(BGM_T0_SEC * FPS + n * BEAT_F);
/** frame of bar n (4 beats). */
export const barF = (n: number): number => beatF(n * 4);
/** frame of a wall-clock second. */
export const secF = (s: number): number => Math.round(s * FPS);
