# BGM 来源与改动记录

- 文件：`public/audio/bgm/staycraft-60s.wav`（48kHz / 16-bit / stereo / 60.000s）
- 来源：video-shotcraft 技能自带 BGM 备选 `assets/audio/bgm/bgm-tech-house.mp3`
  （Mixkit Stock Music Free License，免署名可商用；技能仓库 ATTRIBUTION 标注为 Tech House，librosa 实测约 123.996 BPM）。
- 改动：为卡点编排剪成 60s —— 取原曲 4 个段落（bar 0–3 / 8–22 / 40–46 / 24–31），
  逐段 atempo=0.96777315 精确重映射到 120BPM，concat 后 apad 到 60.000s，首尾做 0.25s/0.9s 淡入淡出。
  结果是「intro → drop → groove → breakdown → final」的 30 小节结构，与分镜幕界 6s / 34s / 46s 对齐。
- 原始素材不是无损母带，此处为 MP3 解码后的重编辑版本；发布商用前建议按 Mixkit 许可复核。
- 视频内所有音效见 `public/audio/sfx/FREESOUND-CREDITS.md`（CC0）。
