# 动态设计师共同任务书（StayCraft 60s 宣传片）

## 项目背景
StayCraft 60s 产品宣传片，Remotion 4.0.484 工程：`C:\个人\学习\ENT207\Homestay AI assistant\video\staycraft-promo`。
- 成片 1920×1080 / 30fps / 1800 帧（60.0s）/ 120BPM 卡点（1 beat = 15f，1 bar = 60f）。
- 视觉方向「白盒取景器」：白/雾灰纸面 + 真实产品截图当"纸" + 紫 #6554e8 / 黄 #ffdc32 信号色 + logo 四格窗/星光/三柱/弧线母题；夜→晨→日光。
- 模式：video-shotcraft 自主自由创作；创意导演（01/04）与文案策划（02）已定稿，Lead 已裁决：不补采 2x 截图（1x + 降级）、S05 已降级、两处整画面冲击（S02/S16）。

## 必读顺序
1. `docs/00-product-brief.md` — 产品事实、数据冻结口径
2. `docs/01-visual-direction.md` — 视觉系统/相机/转场/字体/图表/文案规则（重点 §3–§6、§8）
3. `docs/02-narrative-copy.md` — **文案锁定版 v-final r2**：逐镜文案、字号、黄色/紫色语义、§9 屏幕呈现方式
4. `docs/04-storyboard-draft.md` — **制作放行 v2**：§1.3 分镜表、§2 逐镜卡与 §2.1 实现要点/截图区域、§4 手法唯一性、§5 帧级时间轴、§7.1 验收帧与翻车点
5. 你负责镜头的配方卡全文 + 按卡内“参考实现”定位的准确 demo TSX：
   - 卡：`C:\Users\86299\.agents\skills\video-shotcraft\references\shots\<category>\<card>.md`
   - demo：`C:\Users\86299\.agents\skills\video-shotcraft\demos\<card>\*.tsx`（共享件在 demos/_fixtures/）
   - category 见 `docs/gallery-index.md`
   卡上的“已知坑/命门”参数不得降档；允许按本片适配，但必须读准确 demo TSX，不得凭卡名新写。

## 可用核心组件（直接 import，不要修改）
- `src/core/theme.ts` — C（颜色）、FONT、EASE、SHADOW、TYPE
- `src/core/beat.ts` — FPS / beatF / barF / DURATION
- `src/core/timeline.ts` — SHOTS（唯一事实源，含 from/duration）
- `src/core/PageCam.tsx` — PageCam（1440 宽页面坐标 2.5D 相机，zoom 上限 1.15）、PaperSheet（真实截图当纸）
- `src/core/ui.tsx` — Caption / Title / Kicker / YellowMark / Grain / Rule / Pill / Num / useWindow / sheetStyle / clamp01
- `src/core/layout.ts` — Lead 维护：截图页尺寸与页面内区域 bbox（先用 04 §2.1 目测值，Lead 校准后会通知）
- `src/core/handoff.ts` — Lead 维护：相邻镜头交接常量（跨设计师接缝用）

## 素材
- `public/textures/`：app-workbench.png（1440×1000）、app-workbench-report.png（1440×4398）、app-analysis.png（1440×1530）、app-market.png（1440×1580）、app-promo-simple.png（1440×2575）、app-promo-traffic.png（1440×2575）、app-report.png（1440×3839）、app-import.png（1440×4799）、app-rooms.png（1440×1371）、m-*.png（390 宽）、landing-hero.png（1440×900）
- `public/brand/staycraft-logo.png`（2172×724 原始 logo，不重绘、不改色、不加效果）
- 字体：中文 "Microsoft YaHei"，英文/数字 Outfit（Main 已加载；正文组件已设好 fontFamily）

## 写作与视觉纪律
- 只写分配给你的 shot 文件：每个 `export const Sxx: React.FC = () => ...`，渲染整帧（内部 AbsoluteFill，可自行设置背景）。
- 不改 src/core、src/StayCraftPromo.tsx、src/shots/index.ts、docs、别人的 shot 文件。需要核心改动先给 Lead 发消息。
- 禁 `Math.random()` / `Date.now()` / 网络请求；伪随机固定种子，逐帧可复现。
- 数据与文案一字不改按 02 §5 / §3；黄色只给「空档/关键判断」，紫色只给「机器/数据/AI」；全片文字黄块 ≤6 处。
- 1x 截图纹理 zoom ≤1.15；文字有效字高：大字 ≥96px、caption ≥56px、标签 ≥34px；截图内小字当纹理。
- 产品既有页面必须用真实截图（PageCam/PaperSheet/裁切），不手搓复刻产品 UI；手搓只允许页面外的注记、抽象装置、卡片背面、品牌几何。
- hold/呼吸、单镜一个主动作、手法不重复：以 04 §4 与 §7.1 为准。

## 自检与渲染（硬要求）
1. 每次编辑后 `npx tsc --noEmit -p tsconfig.json`（在 video/staycraft-promo 下）必须通过。
2. 静帧自检：
```
npx remotion still src/index.ts StayCraftPromo out/qa/<shot>-<frame>.png --frame=<绝对帧> --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```
当前沙箱默认阻止 Chromium，需临时提权：调用 pwsh 时带 `sandbox_permissions: "danger-full-access"` 与中文 justification（例：「按用户授权，仅在本机 video/staycraft-promo 内做 Remotion 静帧自检，不改原项目」）。把 2–3 个验收帧合成一条命令批量渲；渲染后用 read_image 看静帧、对照 04 §7.1「本镜最容易翻车的点」自查，不合格就改。
3. 提权被拒时不要反复重试：把状态发给 Lead，由 Lead 统一渲染。

## 交付与协作
- 每完成一个镜头给 Lead（target: lead）发简报：镜头号 / 文件 / 所用卡片与 demo TSX 路径 / 2 个验收帧号与静帧路径 / 已知问题与风险 / 需要校准的坐标。
- 全部完成后 complete 共享任务并汇总。
- 创意疑问问 creative-director（已空闲可唤醒），跨镜头风格/核心组件问题问 Lead。