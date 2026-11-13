export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1800;

// Reused 60s BGM edit (Mixkit tech-house, time-remapped to exactly 120 BPM).
export const BPM = 120;
export const BEAT_F = 15;
export const BAR_F = 60;
export const TOTAL_BEATS = 120;
export const TOTAL_BARS = 30;
export const BGM_T0_SEC = 0.008;

export const beatF = (n: number): number => Math.round(BGM_T0_SEC * FPS + n * BEAT_F);
export const barF = (n: number): number => beatF(n * 4);
export const secF = (s: number): number => Math.round(s * FPS);
