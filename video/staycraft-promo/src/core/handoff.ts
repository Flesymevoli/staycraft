/**
 * Cross-shot hand-off constants. Adjacent shots that continue the same camera or
 * the same document read these numbers so the seam lands in exactly the same
 * screen position. Keep in sync with the two shot files that share a seam.
 */

export const HANDOFF = {
  /** S01 four-pane device collapses to this horizontal white seam; S02 bloom opens from here */
  s01_to_s02: {
    seam: { x: 1405, y: 550, w: 910, h: 2 },
    glow: '#ffffff',
  },
  /** S05 low-point pop ends on this yellow line; S06 opens with it (motion-a owns both) */
  s05_to_s06: {
    line: { x: 958, y: 220, w: 4, h: 640, cx: 960, cy: 540 },
  },
  /** S06 right card freezes here (scale .86 / opacity .70 at f67-75); S07 receives it */
  s06_to_s07: {
    cardAt: { x: 1140, y: 470, w: 420, h: 260, scale: 0.86, opacity: 0.7 },
    nodeAt: { x: 360, y: 420, w: 420, h: 260 },
  },
  /** Report page viewport tops in page px (1440 x 3839 report sheet) */
  reportScrollY: { s11Start: 2282, s11End: 2408, s12Start: 2408, s12End: 2540, s13: 2540 },
  /** S13 push: report sheet exits upward, promo sheet enters from bottom */
  s13_push: { shift: 1080, overlap: 40 },
  /** S14 -> S15 pill match cut (shape/proportion match, not a position match) */
  s14_to_s15: { pill: { x: 960, y: 780, w: 340, h: 84 } },
  /** S15 exports this exact screen rect for the promo draft card; S16 f0 continues from it */
  s15_to_s16: { card: { x: 1640, y: 330, scale: 0.62, rot: -8 } },
} as const;
