import { FPS } from './beat';

/**
 * Central SFX cue table (single source of truth, derived from the locked SHOTS
 * timeline). Each cue targets an on-screen *peak* frame; the start frame is
 * computed from the measured energy-peak position inside the source file
 * (public/audio/sfx/audio-manifest.json -> analysis.energy_peak_seconds), per
 * video-shotcraft sound-design §4.6. Output-audio latency is compensated once by
 * OUTPUT_AUDIO_OFFSET_FRAMES (measured from a rendered draft, see analysis/).
 *
 * Synthetic "game" UI tones are deliberately absent: click/slide/paper/metal are
 * real-object foley (aesthetic-rules S1).
 */

export const OUTPUT_AUDIO_OFFSET_FRAMES = 1.33; // measured +1.28..+1.33f AAC priming (analysis/audio-offset.mjs)

type Src = { file: string; dur: number; peak: number };

const S = {
  impactA: { file: 'fs-645898.mp3', dur: 1.826, peak: 0.135 },
  impactB: { file: 'fs-812709.mp3', dur: 1.885, peak: 0.275 },
  riser: { file: 'fs-859482.mp3', dur: 3.0, peak: 2.285 },
  riserHit: { file: 'fs-511874.mp3', dur: 0.471, peak: 0.455 },
  woosh: { file: 'fs-683096.mp3', dur: 1.321, peak: 0.955 },
  wooshShort: { file: 'fs-427823.mp3', dur: 0.8, peak: 0.215 },
  chop: { file: 'fs-127197.mp3', dur: 0.5, peak: 0.115 },
  shutter: { file: 'fs-270435.mp3', dur: 0.164, peak: 0.085 },
  switch: { file: 'fs-278205.mp3', dur: 0.976, peak: 0.035 },
  click: { file: 'fs-157539.mp3', dur: 0.161, peak: 0.005 },
  pop: { file: 'fs-202230.mp3', dur: 0.65, peak: 0.19 },
  popAlt: { file: 'fs-789793.mp3', dur: 0.22, peak: 0.005 },
  keys: { file: 'fs-348238.mp3', dur: 1.28, peak: 0.015 },
  pencil: { file: 'fs-277312.mp3', dur: 1.074, peak: 0.025 },
  page: { file: 'fs-749880.mp3', dur: 0.679, peak: 0.465 },
  rustle: { file: 'fs-353125.mp3', dur: 1.13, peak: 0.865 },
  metal: { file: 'fs-337865.mp3', dur: 0.672, peak: 0.125 },
  room: { file: 'fs-536792.mp3', dur: 6.74, peak: 0.625 },
  bell: { file: 'fs-534261.mp3', dur: 0.612, peak: 0.215 },
} satisfies Record<string, Src>;

export type SfxCue = {
  id: string;
  src: string;
  /** first frame of the audio file in the composition */
  from: number;
  /** clip length in frames */
  durationInFrames: number;
  volume: number;
  /** what this sound is for (kept for review / workbench) */
  note: string;
};

const peakAt = (src: Src, targetFrame: number): number =>
  Math.round(targetFrame - src.peak * FPS - OUTPUT_AUDIO_OFFSET_FRAMES);

const cue = (id: string, src: Src, targetFrame: number, volume: number, note: string): SfxCue => ({
  id,
  src: 'audio/sfx/' + src.file,
  from: peakAt(src, targetFrame),
  durationInFrames: Math.ceil(src.dur * FPS) + 2,
  volume,
  note,
});

export const SFX: SfxCue[] = [
  // ── S01 夜桌 ──────────────────────────────────────────────
  cue('s01-room', S.room, 20, 0.55, 'S01 夜场 room tone (0–180f)'),
  cue('s01-paper1', S.rustle, 26, 0.34, 'S01 第一张纸片落格'),
  cue('s01-paper2', S.page, 80, 0.30, 'S01 第二张纸片'),
  cue('s01-paper3', S.rustle, 140, 0.26, 'S01 第三张纸片'),
  cue('s01-riser', S.riser, 180, 0.38, 'S01→S02 铺垫 riser，峰值钉 S02 冲白'),
  cue('s01-bell', S.bell, 172, 0.30, 'S01 收拢后星光首亮（单点）'),
  // room tone is a 6.74s source; cut it to the S01 window (180f)
  // ── S02 品牌 ──────────────────────────────────────────────
  cue('s02-impact', S.impactA, 180, 0.62, 'S02 冲白 impact（全片峰值之一）'),
  cue('s02-logo', S.impactB, 212, 0.34, 'S02 logo 压印'),
  // ── S03 导入归位 ──────────────────────────────────────────
  cue('s03-row1', S.popAlt, 300, 0.32, 'S03 第 1 行落地'),
  cue('s03-row2', S.pop, 310, 0.26, 'S03 第 2 行落地'),
  cue('s03-row3', S.popAlt, 318, 0.22, 'S03 第 3 行落地'),
  cue('s03-tab', S.switch, 337, 0.40, 'S03 tab 胶囊切换'),
  cue('s03-page', S.rustle, 344, 0.24, 'S03 内容替换'),
  // ── S04 全景 + 数字 ───────────────────────────────────────
  cue('s04-crane', S.woosh, 396, 0.34, 'S04 升降臂拉全景'),
  cue('s04-roll1', S.click, 430, 0.22, 'S04 数字滚动 1'),
  cue('s04-roll2', S.metal, 436, 0.20, 'S04 数字滚动 2'),
  cue('s04-roll3', S.click, 442, 0.18, 'S04 数字滚动 3'),
  cue('s04-roll4', S.metal, 448, 0.16, 'S04 数字滚动 4'),
  cue('s04-formula', S.click, 460, 0.18, 'S04 乘式浮出'),
  // ── S05 折线低谷 ──────────────────────────────────────────
  cue('s05-reveal', S.pencil, 512, 1.20, 'S05 折线揭示（笔触）'),
  cue('s05-push', S.chop, 528, 0.30, 'S05 相机推向低谷'),
  cue('s05-dot', S.pop, 536, 0.46, 'S05 11-08 黄点 pop（全片唯一黄点响）'),
  cue('s05-label', S.click, 542, 0.20, 'S05 标注落定'),
  // ── S06 两本账 ────────────────────────────────────────────
  cue('s06-flip1', S.page, 597, 0.34, 'S06 左卡翻面'),
  cue('s06-flip2', S.page, 609, 0.30, 'S06 右卡翻面'),
  cue('s06-num1', S.metal, 622, 0.16, 'S06 背面数字 1'),
  cue('s06-num2', S.click, 645, 0.14, 'S06 背面数字 2'),
  // ── S07 AI 调查 ───────────────────────────────────────────
  cue('s07-line1', S.wooshShort, 672, 0.26, 'S07 飞线 1'),
  cue('s07-line2', S.wooshShort, 690, 0.22, 'S07 飞线 2'),
  cue('s07-line3', S.wooshShort, 708, 0.18, 'S07 飞线 3'),
  cue('s07-bell1', S.bell, 682, 0.22, 'S07 节点点亮 1'),
  cue('s07-bell2', S.bell, 730, 0.18, 'S07 节点点亮 2'),
  // ── S08 市场扫描 ──────────────────────────────────────────
  cue('s08-scan', S.woosh, 760, 0.18, 'S08 扫描起手'),
  cue('s08-lock1', S.metal, 770, 0.20, 'S08 四角锁定 1'),
  cue('s08-lock2', S.metal, 790, 0.18, 'S08 四角锁定 2'),
  cue('s08-lock3', S.metal, 805, 0.16, 'S08 四角锁定 3'),
  cue('s08-lock4', S.metal, 818, 0.14, 'S08 四角锁定 4'),
  cue('s08-type', S.keys, 806, 0.30, 'S08 标签打字'),
  // ── S09 价格位置 ──────────────────────────────────────────
  cue('s09-p1', S.popAlt, 878, 0.28, 'S09 报价点 1'),
  cue('s09-p2', S.popAlt, 885, 0.24, 'S09 报价点 2'),
  cue('s09-p3', S.popAlt, 891, 0.21, 'S09 报价点 3'),
  cue('s09-p4', S.popAlt, 896, 0.18, 'S09 报价点 4'),
  cue('s09-p5', S.popAlt, 900, 0.16, 'S09 报价点 5'),
  cue('s09-band', S.woosh, 918, 0.26, 'S09 区间带展开'),
  // ── S10 报告标题 ──────────────────────────────────────────
  cue('s10-page', S.page, 966, 0.30, 'S10 报告页滑入'),
  cue('s10-impact', S.impactB, 982, 0.34, 'S10 引文压印'),
  cue('s10-marker', S.pencil, 990, 1.15, 'S10 黄马克下划线'),
  // ── S11 报告三拍 ──────────────────────────────────────────
  cue('s11-scroll', S.rustle, 1030, 0.18, 'S11 文档慢滚低纸声'),
  cue('s11-pill1', S.pop, 1067, 0.28, 'S11 药丸 1'),
  cue('s11-pill2', S.pop, 1106, 0.24, 'S11 药丸 2'),
  cue('s11-pill3', S.pop, 1146, 0.20, 'S11 药丸 3'),
  cue('s11-underline1', S.pencil, 1075, 1.10, 'S11 依据划线 1'),
  cue('s11-underline2', S.pencil, 1115, 1.00, 'S11 依据划线 2'),
  // ── S12 不确定性 ──────────────────────────────────────────
  cue('s12-scroll', S.rustle, 1206, 0.20, 'S12 报告滚到不确定性'),
  cue('s12-item1', S.metal, 1225, 0.16, 'S12 第 1 条落定'),
  cue('s12-item2', S.click, 1230, 0.14, 'S12 第 2 条落定'),
  cue('s12-item3', S.metal, 1235, 0.12, 'S12 第 3 条落定'),
  cue('s12-item4', S.click, 1240, 0.16, 'S12 第 4 条落定'),
  // ── S13 合上报告 → 推广 ──────────────────────────────────
  cue('s13-push', S.woosh, 1300, 0.38, 'S13 纸张叠章顶出'),
  cue('s13-impact', S.impactA, 1316, 0.30, 'S13 接缝落定'),
  cue('s13-bell', S.bell, 1340, 0.22, 'S13 人群卡高亮'),
  // ── S14 推广两版 ──────────────────────────────────────────
  cue('s14-push', S.wooshShort, 1384, 0.26, 'S14 控件推近'),
  cue('s14-cursor', S.chop, 1436, 0.14, 'S14 光标滑入'),
  cue('s14-click', S.shutter, 1444, 0.62, 'S14 点击（全片最响 SFX，真实快门）'),
  cue('s14-thumb', S.switch, 1448, 0.34, 'S14 thumb 滑移吸附'),
  cue('s14-icon', S.pop, 1454, 0.26, 'S14 图标弹出'),
  cue('s14-change', S.wooshShort, 1460, 0.22, 'S14 内容切换'),
  // ── S15 手机确认 ──────────────────────────────────────────
  cue('s15-phone', S.wooshShort, 1540, 0.22, 'S15 手机浮入'),
  cue('s15-chip1', S.popAlt, 1550, 0.22, 'S15 chip 房态'),
  cue('s15-chip2', S.popAlt, 1560, 0.19, 'S15 chip 价格'),
  cue('s15-chip3', S.popAlt, 1570, 0.16, 'S15 chip 措辞'),
  cue('s15-save', S.click, 1580, 0.44, 'S15 保存点击'),
  cue('s15-toast', S.pop, 1588, 0.20, 'S15 提示条'),
  // ── S16 品牌收尾 ──────────────────────────────────────────
  cue('s16-el1', S.wooshShort, 1624, 0.30, 'S16 元素飞入 1'),
  cue('s16-el2', S.wooshShort, 1630, 0.27, 'S16 元素飞入 2'),
  cue('s16-el3', S.wooshShort, 1636, 0.24, 'S16 元素飞入 3'),
  cue('s16-el4', S.wooshShort, 1642, 0.21, 'S16 元素飞入 4'),
  cue('s16-el5', S.wooshShort, 1648, 0.18, 'S16 元素飞入 5'),
  cue('s16-el6', S.wooshShort, 1654, 0.15, 'S16 元素飞入 6'),
  cue('s16-riser', S.riser, 1720, 0.36, 'S16 舞台光 riser，峰值钉 logo 脉冲'),
  cue('s16-impact', S.impactA, 1720, 0.58, 'S16 logo 压印（全片最高）'),
  cue('s16-bell', S.bell, 1730, 0.34, 'S16 收尾 sparkle'),
];
// long ambience sample: trim to the S01 window instead of bleeding 25f into S02
for (const c of SFX) {
  if (c.id === 's01-room') c.durationInFrames = 180;
}
