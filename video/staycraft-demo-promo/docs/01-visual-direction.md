# 01 · 视觉方向：柔焦决策环 / Soft-Focus Decision Loop

> 角色：创意导演（creative-director）｜版本 v1（2026-11-13）
> 项目：video/staycraft-demo-promo（新 demo · 英文版 · 60s）
> 依据：Lead 的新任务与 demo 事实（2026-11-13）；capture/layout-fixed.json（权威，scrollY=0）；capture/text-en.json；public/textures/*（2x）；02-copy-en.md v2（已按 16 镜锁版）；旧片 video/staycraft-promo 保留不动。
> 硬约束：1920×1080 / 30fps / 1800f / 120BPM（1 拍 15f）；**只做英文版；成片不烧字幕、无旁白**；只保留 BGM/SFX 与结尾 QR（https://staycraft.online）；三个功能必须各有清楚"看懂"时刻；数据全部来自 demo；不虚构功能；logo 用真实文件。
> 本文只定方向与系统，具体镜头见 03-storyboard.md；屏幕文案以 02-copy-en.md 锁版为准。

---

## 0. 一句话判断：**演化，不换方向**

旧片是「White Viewfinder / 纸片舞台」——白盒、纸张、墨、夜桌、四格窗，靠"把页面当纸摆起来"建立电影感。新 demo 自己的视觉是**柔紫/白底、20–26px 圆角卡、轻投影、Outfit + Noto、径向仪表、轻发光球**。它已经有完整的"产品世界"，不需要再另造一个舞台。

**结论：视觉语言演化（Evolve），不做彻底换向。**
- **继承**（旧片已验证的纪律）：真实页面截图 + 2.5D PageCam、屏幕文字的排版纪律、关键信息 hold、连续转场、整画面冲击 ≤3、一镜一个主动作。
- **演化**（新 demo 的原生语言）：舞台从"白盒/纸"变成 **demo 自己的柔焦产品世界**；从墨/纸/四格窗改成 **白卡 + 柔紫底 + 径向仪表 + 柔焦光球**；从"取景窗"改成"**柔焦决策环**"。
- **丢弃**：夜桌 ink 场、纸张材质、四格窗装置、旧片数据、旧片 tagline、旧片镜头卡编号。
- **不采用**：赛博霓虹、玻璃拟态、金色奢华、粒子大屏、全屏渐变海报、逐拍整画面泵。

一句话主张：**一支"把一周的决策链看清"的片子——三条证据线在同一张柔焦画面里逐层对焦，最后收在一个可执行的判断上。**

---

## 1. 三个候选方向（只选一个）

### A ·「柔焦决策环 / Soft-Focus Decision Loop」（推荐）

| 维度 | 内容 |
|---|---|
| 核心隐喻 | 一周的经营是一条**决策链**：工作台给出判断 → 经营数据核对事实 → 周边市场给出参照 → 回到工作台执行。三次"对焦"把模糊变成清楚；最后一次回到起点，闭环。 |
| 舞台/材质 | 舞台就是 demo 本身：外层柔紫雾面（#efedf8→#f7f8fa）+ 右侧产品页/浮动白卡；白卡是 20–26px 圆角、1px 细边、极轻浮影的"实体屏幕"；柔焦（blur）是"还没看清"的视觉状态；无纸、无墨、无玻璃。 |
| 色彩与用法 | 白/柔紫为底，violet 作为系统/AI/图表的结构色，**黄 #ffdc32 只做"决策/注意点"的唯一强调色**（周末/满房/1 间/¥540/+¥40）；语义色（绿/橙/红）只存在于真实 UI 内部，不做片中图形色。 |
| 字体 | Outfit（全片英文）；标题 96–132px、句首大写；数字 tabular；一屏一个标题；无字幕、无中文。 |
| 镜头语言 | PageCam 真实页面推拉摇移 + 卡片 macro + 一次俯拍卡阵 + 一次 ±8° 仪表环绕 + 柔焦转场；相机稳、速度慢，信息密集镜头正视（Q6）。 |
| 动效性格 | 主时长 24–30f；入场 bezier(0.22,0.61,0.36,1)；过冲仅卡片落位 1.02；squash 0；focus rack 12–15f；信息落定 ≥30f。 |
| 与品牌一致性 | 色板/圆角/材质/字体全部来自 demo 的 CSS tokens 与真实界面；产品页面是主角；"柔焦"来自 demo 的柔紫光和径向仪表语言；没有另造皮肤。 |
| 风险 | 纯 UI 特写容易"太平"；必须在每个功能给一个可读的"看懂时刻"和一个明确峰值；柔焦过度会像没对上焦，需按镜头验收。 |

### B ·「一单到底 / One Decision Case File」

| 维度 | 内容 |
|---|---|
| 核心隐喻 | 不拍"产品导览"，只拍"周日 1 间房的那次 +¥40 决策"的案卷：证据一张张上桌，判断逐步成立。 |
| 舞台/材质 | 暖白案卷桌面、卡片像证据纸、紫色印章/批注、手写标记；俯拍 + 侧拍为主。 |
| 色彩与用法 | 暖白 + violet 批注 + 黄色荧光笔；比 A 更编辑、更"人"。 |
| 镜头语言 | 俯拍桌面、卡片飞入排布、macro 批注、盖章式落定；少用整页 2.5D。 |
| 动效性格 | 主时长 30–36f；纸张/印章的物理落定；过冲 1.03；更慢。 |
| 与品牌一致性 | 报告/证据感强，但会把 demo 的"柔紫产品世界"替换成"纸本案卷"；Business Data / Market 两张页面会被降为"附件"，三个功能的可视化清晰度不如 A。 |
| 风险 | 与旧片 A 方向太像（又会回到纸/墨），且弱化 demo 的原生视觉；实现上要手搓纸张/印章，成本高。 |

### C ·「活体仪表盘 / Living Dashboard」

| 维度 | 内容 |
|---|---|
| 核心隐喻 | 一周的经营是一台活着的仪表：曲线呼吸、数字流动、光球在数据间穿梭。 |
| 舞台/材质 | 深色/柔紫发光场、粒子、光带、体积光、3D 卡阵；高频运动。 |
| 色彩与用法 | violet 发光为主、yellow 脉冲、暗场对比；颜色多、光效多。 |
| 镜头语言 | drone/穿越/orbit/速度线/连续大动作；高能。 |
| 动效性格 | 主时长 16–20f；过冲 1.08；squash 0.15；逐拍脉冲。 |
| 与品牌一致性 | demo 是浅色、平面、克制的；C 的暗场发光会把产品读成另一家公司，且容易落入"大屏模板"；用户明确要"清晰展现功能"，高能运动反而伤可读性。 |
| 风险 | 光效/粒子极易廉价（Q4/R4）；与 demo 真实 UI 反差大；60s 里做不出高级暗场。 |

**选定 A**，并吸收 B 的"单一线索"（周日的 1 间房 → +¥40 → 市场 ¥540 → 回到行动），拒绝 B/C 的材质与能量语言。
理由：① demo 自己的视觉已经足够强，A 是唯一"从产品生长"的方向；② 三个功能在 A 里各有一个页面、一个可读时刻，符合"清晰展现功能"；③ 旧片纪律可复用，工程风险最低；④ 60s 内"柔焦→清楚→闭环"本身是一条完整的视觉叙事。

---

## 2. 视觉系统

### 2.1 舞台与材质

- **舞台 = demo 的柔紫世界**：外层底 #efedf8→#f2f3f5 的柔和径向渐变，右侧放产品页/浮动卡；不出现桌面、纸张、桌面投影、暗场。
- **产品页 = 右置的"实体屏"**：页面为 1440 CSS 宽（2x 纹理），默认放在画面右侧；**标题/kicker 放顶部/左上编辑区（x 80–1100, y 60–240）**，可跨页面左上空白，必要时加柔紫 scrim；页面自身有 1px #eceef2 边和两层轻影（0 12px 32px rgba(24,24,28,.09)），不重绘 UI。
- **卡片 = 被拿起来的屏幕**：卡片 macro 镜头里，卡片从页面中"浮起"（scale 1.0→1.02、阴影加深），落回时压回；这是全片唯一允许的"物理感"，幅度小、无弹跳。
- **柔焦**：未聚焦的卡片/页面加 blur 6–14px + 降饱和 0.85；焦点卡片保持 0 blur。柔焦是叙事状态（还没看清/正在核对），不是装饰。
- **光**：只有两处发光——AI 光球（violet 径向 glow，柔和不刺眼）与径向仪表弧；所有光裁进卡片圆角或画幅；无粒子群、无泛光扫卡。
- **纹理**：极轻 grain（opacity 0.01–0.02）只为压渐变 banding，不做胶片感。

### 2.2 色板（取自 demo CSS tokens，克制扩展）

| Token | Hex | 片中用法 | 规则 |
|---|---|---|---|
| paper / surface | #ffffff | 卡片、产品页底 | 主表面；不改成米白/蓝白 |
| canvas | #f7f8fa | 页面内容区底 | 产品页内部原样 |
| stage / outer | #efedf8 → #f2f3f5 | 片外柔紫舞台 | 只做背景，不盖 UI |
| ink | #27272e | 标题、正文 | 标题首选 ink |
| ink-secondary | #454652 | 副标题 | 不用于大字 |
| muted | #71727e | 标签/来源 | 小字 |
| line | #eceef2 / #dfe2e8 | 卡片边、分隔 | 1px |
| violet | #5546d9 | 导航、AI、主按钮、结构线 | 片中层：UI/系统/AI |
| chart-violet | #6554e8 | 折线/图表 | 真实图表原色，不改 |
| violet-soft / pill | #f3f2fc / #ebe9fb | 侧栏、选中底、chip | 只作底 |
| yellow | #ffdc32 | **唯一强调色**：周末点、满房/1 间、¥540、+¥40、关键日期 | 每镜最多 1 处注意力；≤画面 5% |
| emerald / amber / coral | #1e7045 / #85581A / #a63636（配浅底） | 真实 UI 状态 pill | **只在 UI 截图内**，片中图形/文字不用 |

**禁用**：纯黑 #000、金色/香槟、霓虹青/品红、玻璃拟态、全屏渐变海报、暗场粒子、荧光绿。

### 2.3 一个强调色规则（全片唯一）

**黄色 = 决策/注意点，紫色 = 系统/AI/图表。**
- 黄色只在"需要观众做判断"的地方出现：满房/1 间房、¥540、+¥40、8–10 日、周末点；**每镜最多一次用途**，不连续两镜同位置出现。
- 紫色是结构色：导航高亮、图表、AI 光球、证据线；**不作为强调色**，不让紫色和黄色在同一元素上抢。
- 绿/橙/红只属于真实 UI 状态（On Track / Near Full / Vacancy Risk 等），不做片中强调；观众看到它们时，它们是产品的一部分，不是片子的修辞。
- 片头/片尾不额外加"品牌紫块/黄块"；logo 原图自带黄，不再补色。

### 2.4 字体与屏幕排版

- **字体**：Outfit（英文全部）；工程内 public/fonts/Outfit.ttf，加 delayRender 等字体就绪。数字 tabular-nums。中文不出现（见 §4.4）。
- **层级**：
  - Display 112–132px / 600–700 / 行高 1.08 / 字距 −0.03em：片头、品牌句。
  - Headline 88–104px / 600 / 1.12：每镜一句。
  - Kicker 28–30px / 600 / 大写 / 0.12em：页面名、日期、状态。
  - Label 32–36px / 500：来源、示例标注。
  - 数字：96–160px / 600 / tabular；金额与百分比不重排、不四舍五入。
- **排版纪律**：一屏一个主标题；标题最多 2 行、每行 ≤6 words；标题放**顶部/左上编辑区（x 80–1100, y 60–240）**或卡片上方留白，可跨页面左上空白（必要时柔紫 scrim），**不压 UI 文字**；左侧 360–480px 窄栏只放 kicker/small；一镜最多 3 个文字层。
- **无字幕预留**：用户之后会用 GPT 加字幕，本片**底部 140px 中央安全区留给未来字幕**；片中设计文字放左上/左侧编辑栏/卡片上方，不放底部中央。
- **无中文可读**：全片英文；截图里若出现"中文"切换按钮、AI 输入框中文 placeholder、中文页面残留，必须裁掉/模糊/遮盖（见 §4.4）。

### 2.5 镜头语言

| 语法 | 参数 | 用途 |
|---|---|---|
| PageCam 2.5D 推/拉 | page 1440 CSS 宽；zoom 0.9–1.15；24–40f | 整页建立、页面间移动 |
| 卡片 macro 推 | 卡片按 CSS 1.4–1.7x 显示；24–30f | Core Judgment / gauge / action / market stats |
| 横向 pan（页面） | 0.8–1.2 屏宽/秒；稳 | KPI 行、报价列表 |
| 俯拍卡阵 | 20–35° 俯角，卡片平放 | 片头 gauge bokeh / 结尾元素 |
| 仪表 orbit | ±8°，60–75f，匀速 | 68.6% 径向仪表（全片唯一 orbit） |
| 柔焦 rack | blur 14→0，12–15f；配 1.02 缩放 | 主要转场/入焦 |
| 相机约束 | 无 handheld；无 crash zoom；无 3D 大透视文字；速度慢 | 全片 |

### 2.6 连续转场逻辑（6 式，逐接缝选型）

> 原则：一个接缝只用一式；转场帧从相邻镜头预算里划；不硬切堆叠。

| 编号 | 名称 | 机制 | 用在哪 |
|---|---|---|---|
| T1 | 柔焦对焦（Focus Rack） | 当前卡/页面 blur 0→10、下一目标 10→0，同时 1.02 缩放；无黑场 | S01→S02、S03→S04、S05→S06、S12→S13、S14→S15 |
| T2 | 侧栏轨道滑移（Nav Rail Glide） | 相机拉回页面全貌，左侧导航 active pill 从 Workbench 滑到 Business Data / Market Quotes，内容区交叉淡化；再推进新页 | S06→S07、S10→S11 |
| T3 | 同一条线（Shared Chart Match） | 工作台 hero 迷你折线 → Business Data 日报折线 → Market 7 日中位线，三张图在同一屏幕坐标/同一 baseline 上对位；只换 card 与轴，不重绘曲线 | S03→S09 概念上的"同一条周线"，S09→S13 实拍 match |
| T4 | 仪表光圈（Gauge Iris） | 68.6% 径向仪表的一段弧扩大成圆形遮罩，圈内换成下一场景；与 demo 的弧形刻度同构 | S15→S16（S04→S05 为备选） |
| T5 | 卡片抬升（Card Lift / Return） | 卡片从页面浮起、落回真实槽位；用阴影和 1.02 scale 代替位移 | S03、S08、S12、S14 |
| T6 | 光球交棒（Glow Orb Handoff） | AI 光球从工作台漂到导航，再散成页面的一层柔光；不粒子化 | S02→S03、S15→S16 备选 |

**禁用**：白闪、负片、震屏、whip pan（本片气质不需要）；整画面冲击全片 ≤2 处（S15 闭环 + S16 收尾 bloom），其余全部元素层。

### 2.7 动效性格 tokens（一个品牌一种嗓音）

| Token | 值 |
|---|---|
| 主入场时长 | 24f（卡/标题），30f（整页） |
| 入场 easing | cubic-bezier(0.22, 0.61, 0.36, 1) |
| 相机 easing | cubic-bezier(0.33, 0, 0.15, 1) |
| 过冲 | 仅卡片落位 1.02；文字/图表不过冲 |
| squash | 0（无压扁） |
| focus rack | 12–15f，blur 14→0 或反向；与 1.02 缩放同起同收 |
| hold | 信息落定 ≥30f；品牌/QR ≥45f |
| 批量/错峰 | 卡阵/行入场 stagger 8f，末段加速，收尾静止 15f |
| 相机速度 | 推拉 ≤1.2%/f；页面 pan ≤1.2 屏/秒；无手持抖动 |

### 2.8 图表与数据动效规则

1. **真实截图是唯一图表来源**：不重绘折线、不改数据、不做"假生长"；动效只用相机、遮罩、highlight、DOM 注记。
2. **line reveal**：对真实折线所在卡做 clip-path 从左到右揭示（18–24f），线本身不动；揭示后给周末点一次黄色 ring pop（scale 1.18→1，6f）。
3. **数字**：只允许两处 DOM count-up——68.6%（S04）与 ¥540（S12）；其余数字用真实 UI 数字，不加滚动。count-up 必须与真实数字同位，落定后 ≥30f。
4. **highlight**：黄色 2–4px 手绘感 underline/圆环标在真实数据点上；每镜最多 1 个；不覆盖数字本身。
5. **卡片数据一致**：同一数字在不同页面出现（68.6% / 24/35 / ¥12,800）必须来自同一冻结快照；禁止四舍五入/重排货币。
6. **end card**：QR 是静态图，不加动效到码面；只做周围柔光/卡片落定。

### 2.9 声音（无 VO / 无字幕）

- BGM：沿用工程内 public/audio/bgm/staycraft-60s.wav（120BPM，60s）；若 Lead 换曲，节拍映射随 03 重排。**无旁白、无字幕轨。**
- SFX 语义：focus rack = soft whoosh（短、低频）；卡片抬升 = 纸/卡轻 air；数据揭示 = 轻 tick/笔触；状态勾选 = 真实 UI 点击/确认拟音（非游戏音）；仪表 = 低频 swell；QR/logo = 单点 sparkle + 收尾余响。
- 每一镜至多 2 个 SFX 语义点；关键转折（S07、S11、S15）给一次 riser/whoosh，但不用重击；全片无"逐拍砸画面"。
- 留白：S16 最后 2s 只留 BGM 尾音 + QR sparkle 余响，方便用户后期叠字幕/配音。
---

## 3. 全片能量曲线与三个"看懂时刻"

| 段落 | 帧段 | 时长 | 能量（0–10） | 职责 | 峰值/呼吸 |
|---|---|---|---|---|---|
| I 品牌/钩子 | 0–210 | 7.0s | 2.5 → 4 | 柔焦钩子 → 工作台出场；给出"这周 68.6%"的第一印象 | 低开，S02 末尾起势 |
| II AI 诊断（Workbench） | 210–660 | 15.0s | 4 → 6.5 | Core Judgment → 仪表 → 证据 → 行动计划；**看懂时刻 1** | S03 判断落定；S05 行动勾选 |
| III 数据核对（Business Data） | 660–1080 | 14.0s | 4.5 → 6 | 导航切换 → KPI → 日报折线 → 明细表；**看懂时刻 2** | S09 100%/80% 折线；S10 11 间空夜 |
| IV 市场调研（Market Quotes） | 1080–1500 | 14.0s | 5 → 6.5 | 导航切换 → 三个市场数 → 中位线 → 建议 → 报价列表；**看懂时刻 3** | S13 中位线 ¥540；S14 建议落定 |
| V 闭环 + 品牌 | 1500–1800 | 10.0s | 6.5 → 7 → 5 | 回工作台/行动计划闭环 → 品牌 + QR；结尾安静 | S15 闭环峰值；S16 QR hold |

**三个"看懂时刻"（必须各有 ≥30f 的静止/低动）：**
1. S03/S05：AI 判断 + 行动——"周六满房、周日还剩 1 间，试 +¥40"，并已进入行动计划。
2. S09：数据核对——"11/14 100%、11/15 80%；15 个工作日间夜 / 9 个周末间夜 / 11 间可售"。
3. S14：市场建议——"4 家同日期报价；中位 ¥540；本店 ¥420–580 与样本带重叠；周六不降，周日试 ¥520–540"。

**呼吸位**：S01 尾部 20f、S03 判断 hold 30f、S05 勾选 hold 30f、S09 折线 hold 30f、S10 末尾 15f、S12 三个数 hold 30f、S14 建议 hold 30f、S15 闭环 hold 30f、S16 QR hold 45f。
**整画面级冲击**：全片 **2 处**——S15 闭环（仪表光圈扩满+光球 bloom，1 次）、S16 结尾 bloom（logo/QR 落定）。其余全部元素层；无逐拍泵、无震屏。

---

## 4. 素材、坐标与合规

### 4.1 素材与坐标系（唯一口径）

- **截图**：public/textures/ 2x（app-*-full.png 为整页 2x；page-*.png 为内容区 2x；cards/*.png 为单卡 2x）。
- **坐标**：capture/layout-fixed.json（**scrollY=0 的权威测量**；layout-en.json 有 111px 滚动偏移，**不要再用它定卡位**）。1440×900 CSS 栅格，三个 view 的 section 均 y=111：KPI 行 (281,200.89,1114×162.03)；hero bento (281,380.92,710.13×447.72)；gauge (1011.13,380.92,383.88×324.58)；action (1011.13,725.5,383.88×335.33)；evidence (281,1152.83,710.13×312.23)；analysis trend (281,380.92,710.13×413.64)；table (1011.13,380.92,383.88×460.56)；explore stats (281,200.89,710.13×288)；median trend (1011.13,200.89,383.88×257.16)；quotes (281,506.89,1114×460.64)。
- **纹理尺寸**：app-workbench-full 1440×1530 CSS、app-analysis-full 1440×906、app-explore-full 1440×1033；page-* 为 1114 宽内容区；cards/* 单卡 2x；public/textures/hi/ 为 3x 卡裁片（hero/gauge/action 等）。卡片 macro 1.4–1.7x CSS 用 2x 足够；**超过 2x 用 hi/ 3x**。
- **文字口径**：capture/text-en.json 为准；所有数字不重排、不四舍五入、不换货币格式。

### 4.2 数据事实（只允许这些，来自 demo）

- Workbench KPI：Completed Room Revenue **¥18,450**（+14.2%，已核实完成住宿）；Sold Room Nights **42**（+5）；Achieved Room Rate **¥439.29**（Weekend +18%）；Future Booked Value **¥12,800**（24/35 nights）。
- Core Judgment：**Saturday is sold out & Sunday has 1 room left: test a ¥40 Sunday rate increase**；Nearby Saturday median **¥540**（+25.5% vs midweek）；11/14 Sat 100% booked。
- 7-Day Booked Occupancy：**68.6%**，24 booked / 35 capacity，4 room-nights from 80% target，Peer avg 62%，On Track。
- Action Plan：**2 / 3**；Raise Sunday Riverside Double rate by ¥40（Done）；Verify Room 202（Done）；Publish Wuzhen Ginkgo WeChat copy（Planned）。
- Business Data KPI：**68.6%**（+8.4%），**24/35**（11 open），**¥12,800**（+12.1%），**¥533.33**（Peak ¥590）。
- Daily trend：11/10–11/16；11/14 Sat **100%**；11/15 Sun **80%**；15 weekday nights（42.9%）/ 9 weekend nights（25.7%）/ 11 open（31.4%）。
- Daily table：11/14 Sat 5 booked / 0 open / ¥2,950.00；11/15 Sun 4 / 1 / ¥2,480.00；其余见 text-en。
- Market：4 stays · 4 valid quotes；Sample Median **¥540 / night**；Middle 50% Band **¥488–¥594**；Your Listed Rates **¥420–¥580**；quote rows Wuzhen Water Lane **¥568 (+¥48)**、Xitang Misty Rain **¥488 (0.0)**、Jiangnan Waterside **¥620 (+¥60)**；7-day median **¥440/430/450/490/540/510/460**。
- 禁用：旧片全部数字（¥2,717.66 / ¥10,802.33 / ¥1,579 / ¥124–¥621 / ¥150–¥639 / 54.3% / 19-35 等）；"profit / cash received / live OTA"；真实酒店/客人姓名（demo 的虚构报价名按 UI 原文，不改写）。

### 4.3 品牌资产与结尾

- logo 用 **public/brand/StayCraft-main-HD.png**（4032×1040，真实 HD lockup），不重绘/不改色/不加发光；显示宽度 560–680px；白底/柔紫底都可。
- QR 用 **public/brand/qr-staycraft.png**（1024×1024；Lead 已于 2026-11-13 用 qrcode 重新生成，errorCorrection M，内容 https://staycraft.online）；结尾卡 QR 尺寸 220–260px；与码面留 12–16px 白边；终检仍需实测扫码。
- 结尾文案锁：**Clearer signals. / Better decisions.**（官方 EN footer）+ **Scan to explore StayCraft** / **staycraft.online** + **Concept demo · fictional data**；不追加第二个 tagline/第二个 URL/中文。
- 片头 S01 使用同一 logo 与 **Concept demo · fictional data**；不放旧片 logo 文件。

### 4.4 无中文可读（硬要求）

- 截图里有三处中文风险：① 顶栏右侧"中文"切换按钮；② AI Assistant 卡输入框中文 placeholder（例："Ask me anything / 询问空房、房价或待办..."）；③ 顶栏 Host 邮箱/账号信息（虽为 demo 邮箱，仍不展示）。
- 处理：**所有镜头不框顶栏**；需要 app shell 时只取 sidebar + 内容区；AI Assistant 卡不入画或把输入区裁掉/模糊；若不可避免，用同色柔紫卡/模糊遮住，不能出现任何可读中文。
- 侧栏导航已是英文（Workbench / Business Data / Market Quotes / Promotion Studio），可用；logo 内无中文。
- 画面内的 "Ctrip" 是 demo 自己的来源标签，保持 UI 原文，但只做纹理/小字，不做"集成"宣称；不出现真实 OTA 账号、订单号、客人信息。

### 4.5 无字幕/无旁白的设计影响

- 用户之后用 GPT 加字幕与配音：成片**不烧字幕轨**；未来字幕会落在底部中央，设计中**底部 140px 不放关键文字/关键 UI**。
- 屏幕设计文字只承担"标题/kicker/说明"，不承担逐句旁白；单条标题 ≤6 words/line，观众不暂停也能读。
- 无音效叙事缺口：每一镜至少有一个视觉"事件"（对焦/揭示/勾选/高亮），不能靠声音解释。

---

## 5. 风格帧（styleframe）说明

> 不渲染视频、不写 Remotion 代码；由动态设计师用 HTML/CSS 出 3 张 1920×1080 静帧验证字体、色板、材质、柔焦与构图。

1. **SF-A（S01 品牌钩子）**：柔紫径向底（#efedf8→#f7f8fa）；右侧 60% 放 workbench-09 仪表卡（blur 14px、scale 1.2）；左侧编辑栏：logo lockup 620px 宽、kicker「STAYCRAFT · DECISION WORKBENCH」、标题「The week, / in one view.」112px ink；左下 small「Concept demo · fictional data」34px muted。验证：柔焦是否像"失焦"而不是"糊"；logo 与背景分离是否干净。
2. **SF-B（S09 数据核对）**：右侧 app-analysis-full（zoom 1.0，取 KPI 行 + 折线卡）；左侧编辑栏：kicker「BUSINESS DATA & BOOKINGS」、标题「One night full. / One night opens.」96px；折线卡上 100%/80% 黄 ring；底部 140px 空。验证：真实页面文字是否锐、黄 ring 是否裁在点内、左侧标题是否与页面抢。
3. **SF-C（S16 结尾）**：柔紫→白底；logo HD 640px；右侧 QR 白卡 240px（圆角 26px、轻影）；「Scan to explore StayCraft」/「staycraft.online」；下方官方 footer「Clearer signals. / Better decisions.」96px；small「Concept demo · fictional data」。验证：QR 扫描、logo 比例、底部留白、无多余文字。

---

## 6. 实现风险与降级

| 风险 | 等级 | 影响 | 降级 |
|---|---|---|---|
| 纯 UI 特写"平" | 中 | 全片节奏 | 每 2–3 镜插一个卡片 macro/仪表 orbit；关键数字至少 2 处 count-up；S15 闭环给一次 full bloom |
| 柔焦过度/像没对上焦 | 中 | S01/S07/S11 | 焦点卡 blur=0；非焦点 blur ≤10；验收帧检查"主体边缘是否清楚" |
| 截图中文残留 | 中 | 合规 | 不框顶栏；AI 卡裁掉/遮住；渲染帧逐帧检查 |
| 卡片/页面 2x 推近发虚 | 低 | macro | 2x 纹理 + 卡片 macro 1.4–1.7x；不超过 2x；必要时用 cards/*.png |
| 数据被误读（"自动调价"） | 中 | 合规 | 文案只说 test/plan，不说 auto-apply；行动项显示 Done 是 demo 状态，不宣称系统自动执行 |
| QR 编码错误 | 中 | 交付 | Lead 已重新生成；终检需实测扫码到 https://staycraft.online |
| 未来字幕压 UI | 低 | 交付后 | 底部 140px 安全区；S16 QR/文字不放底部中央 |

---

## 7. 与 02 / 03 的接口与已确认状态

- **02 文案**：02-copy-en.md v2 已按 16 镜锁版；本文只给标题槽位与字数上限；最终句子以 02 v2 为准。**UI 已说清的句子不再叠**：S03/S04/S08/S10/S12/S13 不设 headline；S04 无 copy 块。
- **03 分镜**：16 镜、0–1800f、120BPM；每个 shot 的卡片/坐标/镜头/声音见 03；**已由 Lead 按现版放行给 motion 开工**。
- **已确认（Lead 2026-11-13）**：① QR 已重新生成并指向 https://staycraft.online；② BGM 沿用 public/audio/bgm/staycraft-60s.wav（120BPM）；③ 片头 S01 与片尾 S16 都可用真实 logo；④ 片尾只保留官方 footer + QR + Concept demo 标注；⑤ 无字幕/无 VO，底部 140px 安全区保留。
- **实现口径**：坐标用 capture/layout-fixed.json（layout-en 有 111px 滚动偏移，不要用）；2x 纹理 + hi/ 3x 卡裁片；SFX 钉帧由 Lead 统一做（core/sfx.ts），03 的 sound points 只作语义参考。
