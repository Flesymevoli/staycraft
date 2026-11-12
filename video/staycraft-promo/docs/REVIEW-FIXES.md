# 终检 P1 修复记录与复测（Lead 侧）

> 对应独立终检报告 docs/REVIEW-REPORT.md（基于 18:36/18:37 的初版成片）。
> 本文件记录修复内容与复测帧；终检报告保持原样，不修改审查者结论。

## 修复项（4 项 P1 + 相关 P2）

| # | 终检项 | 修复 | 文件 | 复测证据 |
|---|---|---|---|---|
| 1 | A9/S5 输出音轨偏移 +1.33f | `OUTPUT_AUDIO_OFFSET_FRAMES` 0 → **1.33**（实测 AAC priming 指纹）；所有 SFX 的 `from` 由同一常量统一扣除，不逐条改帧号 | src/core/sfx.ts | 复测命令见 §2，期望均值 ≤ ±0.5f |
| 2 | S15 版本错（S14 引流版 → S15 简约版） | S15 手机截图改为 **手机-08 推广引流版**（textures/m-promo-traffic.png）；tab/草稿与 S14 引流版一致 | src/shots/S15.tsx + public/textures | out/review-final/f-1600.png |
| 3 | S11 依据不可读（#b6b6c0 ≈1.9:1） | DIM_WORD [182,182,192]→[110,110,120]、INK_WORD [98,98,108]→[70,70,80]，逐词加深后当前依据 ≥4.5:1 | src/shots/S11.tsx | out/review-final/f-1080.png / f-1170.png |
| 4 | S09 括线穿刻度 | 黄括线从 AXIS_Y+14..+46 下移到 **AXIS_Y+72..+104**；「与周边范围重叠」黄 chip 同步下移到 AXIS_Y+116 | src/shots/S09.tsx | out/review-final/f-940.png |

## 顺带修的 P2
- **S04 乘式**：19 × ¥568.54 = ¥10,802.26 与截图金额 ¥10,802.33 的舍入差 → 等号改「≈」，不再写成精确恒等；
- **A6 轻音**：pencil 源峰 -26.8dBFS，vol 0.55/0.50/0.45/0.40 → 1.20/1.15/1.10/1.00；s12-item4 click 0.10→0.16；
- **A5**：room tone 源 6.74s 越 S01 边界 25f → 裁到 180f；
- **Q11**：S02 副题 40px → 56px（≥56 字幕线）；S11 依据 40px 保留（≥34 标签线，对比度已修）；
- **S16 顶部裁切**（自查发现）：合影 chart/report 元素 cy 上移出画 → chart 115→165、report 108→158；
- **接缝**：S11→S12 白闪改 scrim 淡入；S13→S14、S14→S15 首帧空场改预卷；S06→S07 加 fog 接缝幕。

## 复测方法（音频偏移）
```bash
ffmpeg -i out/staycraft-promo-nobgm.mp4 -vn -ac 1 -ar 22050 analysis/wav/final-audio.wav
node analysis/audio-offset.mjs   # 归一化互相关，取 BGM/SFX 混合窗口的 lag
```
偏移常量来自初版实测 +1.28~1.33f（shutter +0.97 / click +1.59 / impact +1.49 / pop +1.29）；本次以 1.33 取整补偿。

## 仍保留的已知 P2（不阻断交付，记录在案）
- S02 kicker 英文大写 STAYCRAFT、冲白约 20f（规划 10f）；
- S04 页面四指标与 DOM 四数字同屏双份（dim 后作纹理，信息主体是 DOM 层）；
- S08 四个 violet 标签距页面模块略近（已从 y238 提到 y226，仍属"页面空白带"边缘）；
- S16 合影元素未包含 S03 导入页（六元素为：四窗母题/折线/报告/推广/手机/行情列表）；
- A8 两版视频流非 bit-exact（同一时间线 + 同一组件，仅 bgm inputProp 不同；277/1800 帧有低幅差异，观感一致）；
- 手机截图底部被烤入的 tab 栏在 S15 下段画面外，未入画。


## 最终交付（v4）

- 终版文件：`out/staycraft-promo.mp4`（-14.6 LUFS / -2.3 dBTP，1800f）、`out/staycraft-promo-nobgm.mp4`（-26.7 LUFS / -2.9 dBTP）；
  母带前原始渲染保留为 `out/_raw-final-bgm.mp4` / `out/_raw-final-nobgm.mp4`（本轮已清理，如需要可从 git/临时目录重渲）。
- 终版复测（从交付文件抽帧）：f=940 黄括线不再穿刻度、重复黄 chip 已删除；f=1600 手机为**引流版**（右 tab 选中、草稿「睡过那么多酒店…」），与 S14 结尾一致；f=1080 依据行对比度达标；f=475 乘式为「≈」；f=1719–1721 logo 清晰压印 + 单记暖曝光；f=1750 顶部元素完整。
- SFX 偏移复测（无 BGM 版，峰值对帧）：shutter -0.09f / click +0.28f / impact(S16) -0.12f / impact(S02) -0.12f / pop(S05) +0.29f，全部 ≤0.3f（补偿前 +1.33f）。
- 剩余已知项（不阻断交付）：S11→S12 单帧偏雾（S12 静态左雾渐变盖住入画页边，属入画式接缝）；S02 冲白约 20f；S04 页面与 DOM 数字同屏双份（页面已 dim 作纹理）；S08 标签距模块略近；S16 合影未含 S03 导入页；A8 两版视频流非 bit-exact（同时间线、仅 bgm 开关，观感一致）。
