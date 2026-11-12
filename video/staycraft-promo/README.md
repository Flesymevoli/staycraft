# StayCraft · 60s 产品宣传片（video-shotcraft / Remotion）

> 一支 60.0 秒、1920×1080、30fps 的 StayCraft 品牌宣传片。
> 视觉方向「白盒取景器」：把产品白底界面当"纸"摆在雾灰台上，用 logo 的四格窗 / 星光 / 三柱 / 弧线做全片动效母题；
> 叙事从民宿经营者的夜桌问题出发，经数据看清、AI 主动调查、市场报价、报告结论，落到推广与品牌收尾。

## 成片

| 文件 | 说明 |
|---|---|
| `out/staycraft-promo.mp4` | 交付版（BGM + SFX，已做 -14.6 LUFS / -2.3 dBTP 母带） |
| `out/staycraft-promo-nobgm.mp4` | 无 BGM 版（保留 SFX，-26.7 LUFS / -2.9 dBTP） |
| `out/_raw-bgm.mp4` / `_raw-nobgm.mp4` | 母带前的 Remotion 原始渲染（留档，可对比/回滚） |
| `out/qa/` | 逐镜验收静帧（含终检用关键帧） |

规格：H.264 + AAC，1920×1080，30fps，1800 帧 = 60.0s。
时间线以 120BPM 卡点：1 beat = 15f，1 bar = 60f；全片 30 小节。

## 如何重新渲染

```bash
cd video/staycraft-promo
npm install                       # 首次
npx remotion render src/index.ts StayCraftPromo out/staycraft-promo.mp4
npx remotion render src/index.ts StayCraftPromo out/staycraft-promo-nobgm.mp4 --props=props-nobgm.json
```

- 渲染需要 Chromium；`remotion.config.ts` 里 `Config.setBrowserExecutable` 指向本机 Chrome（换机器时改这一行，或删除让它自动下载 headless shell）。
- 若系统临时目录受限，先把 `TEMP/TMP` 指向工程内目录（本机实测 Remotion 预编码需要可写的临时目录）。
- 单帧验收：`npx remotion still src/index.ts StayCraftPromo out/qa/xxx.png --frame=435`
- 交付版在原始渲染后做了一次母带（防削波）：ffmpeg -i raw.mp4 -c:v copy -af "volume=-3.4dB,alimiter=limit=0.76:attack=5:release=60:level=disabled" -c:a aac -b:a 320k -ar 48000 final.mp4（nobgm 用 volume=-1.5dB，其余相同）。重新渲染后如需同样响度，按此命令再过一次。
- 实测输出音轨相对视频有 +1.28 帧（AAC priming，约 42.7ms）的系统延迟，属正常封装延迟，低于感知阈值；未对此做负帧补偿。

## 工程结构

```
src/
  index.ts / Root.tsx            注册 Composition StayCraftPromo（1800f, 30fps, 1920×1080）
  StayCraftPromo.tsx             主时间线：按 SHOTS 挂 Sequence + BGM + SFX 层 + 全局纸纹
  core/
    beat.ts                      FPS / 120BPM / beatF / barF
    timeline.ts                  SHOTS（唯一事实源：16 镜 from/duration + 总长校验）
    theme.ts                     色板 / 字体 / 缓动 / 阴影 / 字号档
    ui.tsx                       Caption / Title / Kicker / YellowMark / Grain / Rule / Pill / Num
    PageCam.tsx                  2.5D 真实页面相机 + PaperSheet（截图当纸）
    layout.ts                    截图页尺寸与页面内区域实测 bbox（1440 CSS px 坐标系）
    handoff.ts                   相邻镜头交接常量（接缝屏幕坐标 / 报告页 scrollY / T8 手递）
    sfx.ts                       中央 SFX 钉帧表（按峰值帧反算 from，含输出偏移常量）
    AudioBed.tsx                 BGM 与 SFX 播放层
  shots/S01.tsx … S16.tsx        16 个镜头（每个导出一个 React 组件）
public/
  brand/staycraft-logo.png       原始品牌 logo（未改色/重绘）
  textures/*.png                 真实产品页面截图（来自冻结快照 artifacts/app-screenshots-2026-11-05）
  audio/bgm/staycraft-60s.wav    60s BGM（120BPM 定版）
  audio/sfx/                     Freesound CC0 音效 + audio-manifest.json + FREESOUND-CREDITS.md
  fonts/Outfit.ttf               英文/数字字体
docs/
  00-product-brief.md            产品简报（含数据冻结口径）
  01-visual-direction.md         视觉方向 / 镜头语言 / 转场 / 字体 / 图表规则
  02-narrative-copy.md           叙事与文案锁定版（逐镜文案）
  04-storyboard-draft.md         16 镜分镜 + 帧级时间轴 + SFX 语义 + 验收帧 + 实现偏差记录
  team/                          多 Agent 协作任务书（创意导演 / 文案策划 / 动态设计师 A-B-C）
  REVIEW-PACKAGE.md              独立终检输入清单
analysis/                        素材量测、BGM 节拍分析、SFX 搜索记录、渲染脚本
```

## 素材与合规

- **真实页面截图**：来自用户提供的 `artifacts/app-screenshots-2026-11-05/`（2026-11-05 15:37 冻结快照）。
  片中所有产品页面镜头都是真实截图（PageCam/PaperSheet/裁片），没有手搓复刻产品 UI。
  手搓部分仅限页面之外的注记、抽象装置、卡片背面、品牌几何。
- **数据**：全部为产品内「虚构演示」数据；片中保留「模拟经营数据 / 示例数据均为虚构演示」提示。
  不包含真实客户姓名、地址、手机号、密钥；市场酒店名与地址保持截图中的模糊状态。
- **BGM**：Mixkit Stock Music Free License（免署名可商用）。原曲 Tech House（约 124BPM），
  为卡点剪辑成 60s 并以 atempo 精确重映射至 120BPM；片段来自同一曲目的四个段落（intro / groove / breakdown / final），
  后期可替换 `public/audio/bgm/staycraft-60s.wav`（保持 120BPM、首拍对齐 0）。完整出处见 `analysis/` 与 `public/audio/ATTRIBUTION-note.md`。
- **SFX**：Freesound CC0，逐条来源 / 许可 / 峰值分析见 `public/audio/sfx/audio-manifest.json` 与 `FREESOUND-CREDITS.md`。
  全部为真实物件拟音（纸、金属、快门、开关、键盘、笔触），未使用游戏音包/合成提示音。

## 动效工作台（可选）

本机 Windows 默认不允许创建符号链接（EPERM），node workbench/scripts/open.mjs <工程> 无法自动链接工程。
开启 Windows「开发者模式」或管理员终端后重跑该命令即可打开可视化工作台（http://localhost:5198）；
工作台清单已写在 src/workbench.ts（shots / sfx / bgm 与 Main.tsx 同源）。

## 独立终检与修复

- 终检报告：docs/REVIEW-REPORT.md（独立 subagent，P0=0；初版 P1=4）
- P1 修复与复测：docs/REVIEW-FIXES.md（音画偏移补偿 1.33f、S15 手机改引流版、S11 依据对比度、S09 括线下移，另修 S04 乘式 ≈、轻音音量、room tone 裁切、S16 顶部裁切与三处接缝）

## 已知实现降档（详见 docs/04 §11）

1x 截图（无 2x 重采）→ 纹理 zoom 上限 1.15；S05 由急推改为遮罩揭示 + 黄点 pop + 相机位移；
S08 整页 0.66 右置；S11 报告页 0.9、文档占 52% 宽；S15 hold 28f；S16 去 crane rotateX（保 T8 手递）；
S14 控件特写为「UI 语义放大」重绘（非复刻页面）。所有降档均有画面证据与终检记录。