# 03 · 分镜：StayCraft concept demo · 60s EN promo（16 镜 / 1800f）

> 创意导演（creative-director）｜v1（2026-11-13）
> 配套：01-visual-direction.md（柔焦决策环）、02-copy-en.md（英文屏幕文案 v1，待重映射镜号）、capture/layout-fixed.json（权威，scrollY=0）、capture/text-en.json、public/textures/*、02-copy-en.md v2.1（已按 16 镜锁版）。
> 硬约束：1920×1080 / 30fps / 1800f / 120BPM（1 拍 15f）；**英文版；无旁白、无字幕轨**；结尾 QR（https://staycraft.online）；真实 logo；数据全部来自 demo；不虚构功能。
> 设计原则：每镜一个主动作；每功能一个"看懂时刻"+≥30f hold；连续转场不硬切；整画面冲击 ≤2；底部 140px 留白给用户未来 GPT 字幕。

---

## 0. 资产与坐标约定

- **坐标**：capture/layout-fixed.json（**scrollY=0 权威测量**；layout-en.json 有 111px 滚动偏移，**不要用**）。1440×900 CSS，页面坐标含侧栏（x=0 为页面左缘），三个 view section 均 y=111：
  - KPI 行 (281, 200.89, 1114×162.03)；hero bento (281, 380.92, 710.13×447.72)；仪表 (1011.13, 380.92, 383.88×324.58)；action (1011.13, 725.5, 383.88×335.33)；evidence (281, 1152.83, 710.13×312.23)；opportunity (281, 848.64, 347.06×284.19)。
  - analysis：KPI 行 (281, 200.89, 1114×162.03)；trend (281, 380.92, 710.13×413.64)；table (1011.13, 380.92, 383.88×460.56)。
  - explore：stats (281, 200.89, 710.13×288)；median trend (1011.13, 200.89, 383.88×257.16)；quotes (281, 506.89, 1114×460.64)。
- **素材**：app-*-full.png 整页 2x（workbench 1440×1530 / analysis 1440×906 / explore 1440×1033 CSS）；page-*.png 内容区 2x（1114 CSS 宽）；cards/*.png 单卡 2x；hi/ 为 3x 卡裁片（hero/gauge/action 等）。卡 macro 1.4–1.7x 用 2x 足够；超过 2x 用 hi/。
- **屏幕文案**：02-copy-en.md 锁版；本表写"建议使用/是否叠"；UI 已可读时不重复叠 headline（见 §4 映射）。
- **安全区**：底部中央 140px 留给未来字幕；片中设计文字放**顶部/左上编辑区（x 80–1100, y 60–240）**或卡片上方留白；允许跨页面左上空白，必要时加柔紫 scrim；**不压 UI 文字**；左侧窄栏只放 kicker/small；QR 不放底部边角。
- **标题与卡片可读区**：卡片 macro 的标题放卡片上方/左上，不与卡内标题/数字重叠；S05/S15 卡片下移到 y≈260–280，给 2 行 96px 标题留出上带（详见各镜）。

---

## 1. 16 镜总览（帧界全部为 15f 倍数；关键边界落小节线）

| # | 帧区间 | 时长 | 段落 | 内容一句话 | 主素材 | 能量 |
|---|---|---|---|---|---|---|
| S01 | 0–90 | 3.0s | I 品牌钩子 | 柔焦仪表 bokeh + logo + "The week, in one view." | workbench-09 + StayCraft-main-HD | 2.5 |
| S02 | 90–210 | 4.0s | I 工作台出场 | 工作台 4 指标 + 页面建立 | app-workbench-full | 3.5 |
| S03 | 210–330 | 4.0s | II AI 诊断 | Core Judgment：周六满、周日 1 间、试 +¥40 | workbench-04 | 6.0 |
| S04 | 330–450 | 4.0s | II AI 诊断 | 68.6% 径向仪表 + 距 80% 目标 4 间夜 | workbench-09 | 5.5 |
| S05 | 450–555 | 3.5s | II AI 诊断 | 证据：OTA / PMS / EVT | workbench-08 | 5.0 |
| S06 | 555–660 | 3.5s | II AI 诊断 | 行动计划 2/3：+¥40 Done | workbench-10 | 6.0 |
| S07 | 660–780 | 4.0s | III 数据核对 | 侧栏轨道滑到 Business Data | app shell → app-analysis-full | 4.5 |
| S08 | 780–900 | 4.0s | III 数据核对 | 4 个 KPI：68.6 / 24-35 / ¥12,800 / ¥533.33 | page-analysis 上部 | 5.5 |
| S09 | 900–1020 | 4.0s | III 数据核对 | 日报折线：11/14 100%、11/15 80% | analysis-04 | 6.0 |
| S10 | 1020–1080 | 2.0s | III 数据核对 | 每日明细表 + 15/9/11 | analysis-05 | 4.5 |
| S11 | 1080–1200 | 4.0s | IV 市场调研 | 侧栏滑到 Market Quotes，4 家同日样本 | app shell → app-explore-full | 5.0 |
| S12 | 1200–1320 | 4.0s | IV 市场调研 | 中位 ¥540 / 中间带 ¥488–594 / 本店 ¥420–580 | explore-00 | 6.0 |
| S13 | 1320–1410 | 3.0s | IV 市场调研 | 7 日中位线：周六 ¥540 | explore-01 | 5.5 |
| S14 | 1410–1500 | 3.0s | IV 市场调研 | 建议：周六不降，周日试 ¥520–540 | explore-00 下部 | 6.5 |
| S15 | 1500–1620 | 4.0s | V 闭环 | 4 家报价 → "Four quotes. One decision." → 回行动计划 | explore-02 → workbench-10 | 7.0 |
| S16 | 1620–1800 | 6.0s | V 品牌/QR | 官方 footer + logo + QR + staycraft.online | StayCraft-main-HD + qr-staycraft | 5.5 |

---

## 2. 逐镜分镜表

### S01 · 品牌钩子（0–90f，3.0s）

- **画面**：柔紫径向舞台（#efedf8→#f7f8fa）；右侧 70% 放 workbench-09 径向仪表卡（blur 14、scale 1.16、缓慢呼吸 ±1%）；左/上：Real HD logo lockup（StayCraft-main-HD.png，宽 620px，x=120,y=200）、kicker「STAYCRAFT · DECISION WORKBENCH」28px（y=400）、标题「The week, / in one view.」112px ink（x=120,y=450，2 行）；左下 small「Concept demo · fictional data」34px muted（x=120,y≈920，非底部中央）。末 24f：logo 与仪表一起失焦/退后，焦点开始转向 workbench 页面。
- **镜头**：固定 + 极缓推 1.0→1.04；无 orbit。
- **图形/排版**：logo 从 0.98→1 落定（24f）；标题逐词 mask 揭示（12f）；仪表 blur 14→6（最后 20f）；黄色只让仪表周末段有一次 1.04 呼吸（唯一黄色用途）。
- **屏幕文案（建议）**：标题「The week, / in one view.」；kicker 同上；small「Concept demo · fictional data」。02 的 S01 块。
- **声音点**：BGM bar 1–2（0–120f）低频 pad 无 kick；f0 轻 air；f60 一道 soft focus whoosh；f84 logo 落定 light tick。
- **转场出**：T1 柔焦对焦 → S02（无黑场，画面向右下推入工作台）。
- **验收帧**：f36（标题+logo 落定）、f78（焦点转移/仪表开始退后）。

### S02 · 工作台出场（90–210f，4.0s）

- **画面**：app-workbench-full 页面右置（x=480，zoom 1.0；**只取 y≥80，完全避开顶栏中文按钮与账号区**）；可见 sidebar logo/导航 + 页面标题 + 4 个 KPI 卡；相机 y 从 100 下移到 260，再微推 1.0→1.03；左侧编辑栏：kicker「DECISION WORKBENCH · 2026-11-10 — 11-16」、标题「One week, / four numbers.」。KPI 卡数值在 1.0 下可读（¥18,450 / 42 / ¥439.29 / ¥12,800·24/35）。
- **镜头**：PageCam 2.5D 下移 + 轻推；视线正视（信息密集 Q6）。
- **图形/排版**：四张 KPI 卡依次轻微升起（stagger 6f，阴影加深一次，回位）；标题逐词 blur-in；kicker 淡入。
- **屏幕文案**：标题「One week, / four numbers.」；kicker 日期；无 bottom text。02 的 S02 块（可选 room-type strip 不放，留给 S03）。
- **声音点**：BGM bar 3（f120）kick 进入；页面 settle whoosh；4 个 KPI 各一声极轻 tick（stagger 6f，不连发机枪；间隔 6f 可辨）。
- **转场出**：T1 柔焦对焦 → S03（相机推向 hero 卡）。
- **验收帧**：f130（KPI 行+标题）、f200（推近 hero 前）。

### S03 · Core Judgment（210–330f，4.0s）

- **画面**：workbench-04（hero composite card，CSS 711×449）在画面右侧放大到 1500×947（x=380,y=140）；左侧 kicker「AI DIAGNOSIS · CORE JUDGMENT」；**不叠 headline**（卡内已有完整判断句，重复会双重信息）；黄色手绘 underline 在「Sunday has 1 room left」下（宽约卡内 260px，2px），tooltip「11/14 Sat · 100% booked / Nearby median ¥540/night」是 UI 自带，保持原样；底部房型收入三列在 hold 时可见（可选只留上半）。
- **镜头**：微推 1.0→1.05；从卡头到判断句的轻微 pan；无 orbit。
- **图形/排版**：卡落定（scale 1.02→1，12f）；黄色 underline 12f 画出；判断句行尾在 f~285 停；chart 线从左到右 mask 18f（真实线不重绘）。
- **屏幕文案**：02 的 S03 块 headline 不用（UI 已说）；仅 kicker + 黄色标注（标注文字用 UI 原句，不新增）。
- **声音点**：BGM bar 4.5（f210）低频 riser 到 bar 5（f240）轻 hit；underline 笔触；f285 判断落定一记 soft hit（元素层，不砸画面）。
- **转场出**：T1 柔焦对焦 → S04（仪表从柔焦中浮现）。
- **验收帧**：f255（判断句+underline 中段）、f300（hold）。

### S04 · 68.6% 径向仪表（330–450f，4.0s）

- **画面**：workbench-09（gauge card，CSS 384×326）放大到 900×764（x=860,y=160），±6° orbit；kicker「7-DAY BOOKED OCCUPANCY · ON TRACK」在左侧；**无 headline**（68.6% 是卡内大字）；黄色 ring 只给周末段一次 pop；不在数字上叠字。左侧编辑栏可放 small「4 room-nights from the 80% target.」34px（UI 原句）。
- **镜头**：orbit ±6°（60f 匀速，唯一 orbit）；同时 1.0→1.04 推近。
- **图形/排版**：卡片从柔焦中出现（12f）；68.6% DOM count-up 一次 0→68.6%（18f，与真实数字同位，**必须裁在数字区域，不覆盖**）；f395 黄色段一次 ring；f420 全静止。
- **屏幕文案**：kicker；small 原句；02 的 S02/S07 数据标签可复用，不新增。
- **声音点**：instrument swell（低频）；count-up 轻机械 tick（约 6 声，间隔 3f）；ring 一声 sparkle（单点）。
- **转场出**：T4 仪表光圈（弧段扩大）→ S05 备选；实际用 T1 → S05（光圈只作一次元素层）。
- **验收帧**：f380（count 中）、f430（hold+ring）。

### S05 · 证据（450–555f，3.5s）

- **画面**：workbench-08（detector card，CSS 711×314）放大到 1450×640（x=400,y=280）；顶部/左上标题「Every recommendation / has a source.」96px（x=80,y=70，2 行，上带）；kicker「DETECTOR SIGNALS & EVIDENCE · CONFIDENCE HIGH」；相机从 OTA 行 pan 到 PMS 行（EVT 在下方柔焦 60%，不强调，避免三行同权）。
- **镜头**：lateral pan 0.3 屏/秒 + 微推 1.0→1.04；EVT 行 blur 6（选择性柔焦）。
- **图形/排版**：卡片抬升（T5）；OTA/PMS 两行错峰 8f 微亮；¥488/night 与 92.5% 用 violet 细 underline（非黄色，证据不是决策点）。
- **屏幕文案**：标题；kicker；UI 三行原值；02 S04 的 3 组 labels 只在 UI 内出现，不另叠。
- **声音点**：卡抬升 air；两行 tick（2 声，间隔 8f）；EVT 无音（柔焦）。
- **转场出**：T1 柔焦对焦 → S06。
- **验收帧**：f500（标题+OTA）、f540（PMS 落定）。

### S06 · 行动计划（555–660f，3.5s）

- **画面**：workbench-10（action plan，CSS 384×336）放大到 880×770（x=900,y=160）；左侧标题「From judgment / to action.」96px（02 S05）；kicker「ACTION PLAN · 2 OF 3 DONE」；相机从卡头下摇到三条行动；第一条「Raise Sunday Riverside Double rate by ¥40 — Done」用黄色 ring（唯一黄色用途，因为它是决策点）；其余两条 violet/中性。
- **镜头**：2.5D 下摇（y 140→260）+ 微推；无 orbit。
- **图形/排版**：卡抬升；+¥40 与 2/3 各一次轻亮；Done 勾选框 UI 原样，不重绘。
- **屏幕文案**：标题；kicker；UI 三条原文；02 S05 的 labels 不另叠。
- **声音点**：勾选 2 声真实 click（非游戏音）；卡落定轻 tick。
- **转场出**：T2 侧栏轨道滑移 → S07（相机拉回 app shell）。
- **验收帧**：f600（+¥40/勾选）、f645（三条可见）。

### S07 · 切换到 Business Data（660–780f，4.0s）

- **画面**：相机从 action plan 拉回 app-workbench-full 全貌（右侧页面）；左侧 nav 栏 active pill 从「Workbench」滑到「Business Data」（用真实 UI 侧栏；active pill 用 DOM 叠层在两页间滑动，8f out-cubic）；内容区从 workbench 交叉淡化到 analysis（12f）；右侧页面换成 app-analysis-full（zoom 1.0，取 y≥80 避开顶栏）；左侧标题「Before you act, / verify the numbers.」96px（02 S06），kicker「BUSINESS DATA & BOOKINGS」。
- **镜头**：PageCam 拉远 1.05→1.0 + 横向随 nav 轻移；无硬切。
- **图形/排版**：nav pill 滑移（8f）；页面 crossfade（12f）；标题先 blur-out 再 blur-in；内容切换时柔焦兜底 6px。
- **屏幕文案**：标题；kicker；02 S06 的 small（页面 subtitle）可放页面内，不另叠。
- **声音点**：nav 切换真实 click（轻）；页面 crossfade soft whoosh；BGM bar 12（f660）进副歌前一拍。
- **转场出**：T1 柔焦对焦 → S08（推进 KPI 行）。
- **验收帧**：f700（nav 滑移中）、f760（analysis 页面+标题）。

### S08 · Business Data KPI 行（780–900f，4.0s）

- **画面**：page-analysis 上部（KPI 行，CSS 1114 宽）放大到 1600 宽（x=320,y=120）；四卡：68.6% (+8.4)、24/35（11 open）、¥12,800 (+12.1)、¥533.33（Peak ¥590）；左侧 kicker「BOOKED OCCUPANCY · 11/10 → 11/16」；**不叠 headline**（数值本身是主角；02 S07 headline 与 UI 重复，见评审）；yellow ring 只给 68.6% 一次（唯一黄色用途）。
- **镜头**：横向 pan 从 68.6 到 ¥533.33（0.4 屏/秒）+ 微推；四卡清晰。
- **图形/排版**：四卡依次 6f 微亮；68.6% ring pop；其余数值不动。
- **屏幕文案**：kicker；02 S07 的 small 可不用（UI 已有）；数据全部 UI。
- **声音点**：4 声轻 tick（间隔 8f）；ring 单点 sparkle。
- **转场出**：T1 柔焦对焦 → S09（推入折线卡）。
- **验收帧**：f820（68.6+ring）、f880（四卡完整）。

### S09 · 日报折线（900–1020f，4.0s）

- **画面**：analysis-04（trend card，CSS 711×415）放大到 1450×846（x=380,y=120）；左侧标题「One night full. / One night opens.」96px（02 S08 的 ALT；避免与 S03「1 room left」重复，保留"满→开"的对比）；kicker「DAILY BOOKED OCCUPANCY · 11/10 → 11/16」。黄色 ring 依次落在 11/14 100%、11/15 80% 两点（每点一次 pop，**同一镜两个 ring 只算一次"黄色用途"**：都是周末/决策点）。
- **镜头**：微推 1.0→1.05，从卡头到折线中段；基线保持水平（正视）。
- **图形/排版**：折线 mask 从左到右 18f（真实线不重绘）；100%/80% 两个 UI 数字在 ring 内不叠 DOM；卡内 15/9/11 三行在底部保持可见到 hold。
- **屏幕文案**：标题；kicker；02 S08 的 small「15 weekday · 9 weekend · 11 open.」放 S10，不在此叠。
- **声音点**：chart reveal 轻 shimmer；两个 ring 各一声 tick（间隔 12f）；BGM bar 15（f840）持续。
- **转场出**：T1 柔焦对焦 → S10（下摇到明细表）。
- **验收帧**：f960（折线+100% ring）、f1000（80% ring+hold）。

### S10 · 每日明细表（1020–1080f，2.0s）

- **画面**：analysis-05（table card，CSS 384×462）放大到 820×987（x=930,y=40）；左侧 small「15 weekday nights · 9 weekend nights · 11 open.」34px（02 S08 small）+ kicker「DAILY FIGURES BREAKDOWN」；**不叠 headline**；相机从表头下摇到 11-14 Sat / 11-15 Sun 两行（5/0 / 4/1）；两行用极淡 yellow 底（一次用途）与真实 UI 高亮一致。
- **镜头**：2.5D 下摇 + 微推 1.0→1.04；表行保持可读（680px 宽内 32px+ 字）。
- **图形/排版**：表头/行不重绘；相机 pan 让 5/0、4/1 两行在 hold 时居画面。
- **屏幕文案**：kicker；small；UI 表原样。
- **声音点**：两行 tick（2 声）；页面持续低纸声；无 riser。
- **转场出**：T2 侧栏轨道滑移 → S11（相机拉回 app shell，nav 切 Market Quotes）。
- **验收帧**：f1040（Sat/Sun 行）、f1070（hold）。

### S11 · 切换到 Market Quotes（1080–1200f，4.0s）

- **画面**：相机拉回 app shell；nav pill 从「Business Data」滑到「Market Quotes」（8f）；页面从 analysis crossfade 到 explore（12f）；右侧 app-explore-full（zoom 1.0，取 y≥80 避开顶栏）；左侧标题「Four nearby stays, / same date.」96px（02 S09）；kicker「NEARBY MARKET RESEARCH · CHECK-IN 2026/11/14」。
- **镜头**：拉远 + 横移；页换时 6px 柔焦兜底。
- **图形/排版**：nav pill 滑移；页面 crossfade；标题 blur-out/in；market 页 header 的「4 stays · 4 valid calendar quotes」在 UI 内可读。
- **屏幕文案**：标题；kicker；02 S09 的 small 不另叠（UI 有）。
- **声音点**：nav click；crossfade soft whoosh；BGM bar 19（f1080）进副歌/新段。
- **转场出**：T1 柔焦对焦 → S12。
- **验收帧**：f1120（nav 中）、f1170（market 页面+标题）。

### S12 · 市场三个数（1200–1320f，4.0s）

- **画面**：explore-00（stats card，CSS 711×289）放大到 1500×610（x=360,y=210）；左侧 kicker「DAILY SAMPLE STATS · 4 VALID QUOTES」；**不叠 headline**（¥540 / ¥488–594 / ¥420–580 是卡内大字；02 S10 headline 与 UI 重复，见评审）；黄色 underline 只在 ¥540 下（唯一用途）；相机从 ¥540 横 pan 到 ¥420–580，再回 ¥540。
- **镜头**：横向 pan + 微推 1.0→1.04；速度慢，让三个数可读。
- **图形/排版**：¥540 DOM count-up 一次（0→540，18f，与 UI 数字同位）；黄色 underline 12f；卡抬升。
- **屏幕文案**：kicker；02 S10 的 small 可不用；数据 UI。
- **声音点**：count-up 轻 tick（约 5 声）；underline 笔触；¥540 落定一记 soft tick（元素层）。
- **转场出**：T1 柔焦对焦 → S13（推入中位线卡）。
- **验收帧**：f1240（¥540+underline）、f1300（三个数完整）。

### S13 · 7 日中位线（1320–1410f，3.0s）

- **画面**：explore-01（median trend，CSS 384×259）放大到 880×594（x=880,y=250）；左侧 annotation「SATURDAY MEDIAN ¥540」（32px label + yellow 短线指向点，UI 原值）；**不叠 headline**；相机从曲线左段推到 11/14 点；与 S09 的折线做同坐标/同基线 match cut（T3）。
- **镜头**：微推 1.0→1.06 + 从右向左轻移；点保持画面中部。
- **图形/排版**：曲线 mask 从右往左揭示 18f（真实线不重绘）；¥540 黄色点一次 ring；11/14 label 原样。
- **屏幕文案**：annotation 一项（32–36px，非大字）；kicker 可省（S12 已有），或放「7-DAY SAMPLE MEDIAN TREND」28px。
- **声音点**：曲线 reveal shimmer；ring tick；BGM bar 22（f1260）持续。
- **转场出**：T1 柔焦对焦 → S14（从趋势推回到建议）。
- **验收帧**：f1350（¥540 点+ring）、f1390（hold）。

### S14 · 市场建议（1410–1500f，3.0s）

- **画面**：explore-00 下半部（advice box，真实 UI 圆角紫边）放大裁切到 1450×520（x=380,y=280）；左侧标题「Keep Saturday firm. / Test ¥520–¥540.」96px（02 S11）；kicker「RATE ADVISORY · REMAINING SUNDAY ROOM」；UI 建议句「Sample median is ¥540. Keep Saturday rates firm and test ¥520–¥540 on the remaining Sunday room.」在卡内可读；黄色 underline 只在 ¥520–¥540 下（唯一用途）。
- **镜头**：微推 1.0→1.05；从卡头到建议句；最后 30f 完全静止。
- **图形/排版**：黄 underline 12f；卡抬升；UI 数字不动。
- **屏幕文案**：标题；kicker；02 S11 small 可省（UI 已有完整建议句）。
- **声音点**：BGM bar 24（f1380）落一记轻 hit（元素层）；underline 笔触；hold 静。
- **转场出**：T1 柔焦对焦 → S15（推回报价列表）。
- **验收帧**：f1440（建议句+underline）、f1485（hold）。

### S15 · 四家报价 + 闭环（1500–1620f，4.0s）

- **画面**：explore-02（quotes list，CSS 1114×462）放大到 1550×643（x=250,y=280）；顶部/左上标题「Four quotes. / One decision.」96px（x=80,y=60，2 行，上带；已由 02 v2.1 采纳）；kicker「NEARBY STAY QUOTES · 4 VALID QUOTES」；相机从 row #1（¥568 +¥48）横 pan 到 row #3（¥620 +¥60），row #1 的 Quote Snapshot Conditions 展开态保留（真实 UI，作为"可追溯"证据）；最后 40f：画面从报价列表拉回柔紫舞台，workbench-10 action plan 以 0.82 透明度浮到右侧，黄色 ring 回到「+¥40 Done」→ 闭环；随后仪表光圈 T4 扩满进入结尾。
- **镜头**：横向 pan 0.3 屏/秒；末 40f 拉远 + 右侧 action plan 卡片浮入（无硬切）。
- **图形/排版**：报价行三行错峰 8f 微亮；row #1 展开态 UI 原样；末 20f 一条 violet 细线从报价行连回 action plan 的 +¥40（DOM 线，2px，随光圈淡出）。
- **屏幕文案**：标题「Four quotes. / One decision.」（02 v2.1 已采纳）；kicker；UI 报价与条件原样。
- **声音点**：报价行 tick ×3（间隔 8f）；BGM bar 26（f1500）riser；f1580 闭环轻 hit + air；f1600 光圈 whoosh。
- **转场出**：T4 仪表光圈 → S16。
- **验收帧**：f1540（报价行+标题）、f1590（闭环/action plan 浮入）。

### S16 · 品牌 + QR（1620–1800f，6.0s）

- **画面**：柔紫径向底（#efedf8→#f7f8fa）铺满；左/中左：StayCraft-main-HD.png（宽 680px，x=180,y=300）；右侧白卡（560×620，圆角 26px，轻影，x=1180,y=200）内：qr-staycraft.png 260×260 居中，上下留白；白卡下方/内部：「Scan to explore StayCraft」32px、「staycraft.online」34px（violet）；**左中下**：「Clearer signals. / Better decisions.」96px（官方 footer，x=180,y≈640，两行结束 y≈860，不进入底部 140px 安全区）；左下 small「Concept demo · fictional data」32px muted（x=180,y≈920，左缘，非底部中央）。**无其他文字/无第二 tagline/无中文；QR 面不动效，只做静态 + 周围柔光。**
- **镜头**：1.0→1.02 极缓推；无 orbit。
- **图形/排版**：logo 落定（0.98→1，24f）；QR 白卡从 1.04→1（18f）；footer 两行逐词压印（18f）；最后 45f 完全静止。
- **屏幕文案**：官方 footer；QR 两行；demo small。
- **声音点**：BGM bar 28（f1680）尾段衰减；logo/QR 落定 sparkle 单点；f1755–1800 只留 BGM 余响（给用户后期叠字幕/配音留空间）。
- **转场出**：片尾静止（不接下一镜）。
- **验收帧**：f1700（logo+QR 落定）、f1760（footer hold/QR 可扫）。

---

## 3. 手法、冲击、hold 预算

| 镜 | 主手法 | 是否唯一主角 | 信息 hold |
|---|---|---|---|
| S01 | 柔焦 logo/仪表 bokeh | 是（只有此镜做 logo+仪表叠） | 30f |
| S02 | 页面建立 + KPI 逐卡轻亮 | 是 | 20f（KPI 可读） |
| S03 | 卡片 hero + 黄色 underline | 是 | 30f（判断落定） |
| S04 | 径向仪表 orbit + count-up | 是（全片唯一 orbit） | 30f |
| S05 | 证据卡 macro pan | 是 | 20f（两行） |
| S06 | 行动计划下摇 + 勾选 | 是 | 30f（+¥40/2/3） |
| S07 | 侧栏 nav 轨道滑移 | 是（第 1 次） | 20f |
| S08 | KPI 横 pan + 68.6 ring | 是 | 20f |
| S09 | 日报折线 reveal + 双 ring | 是 | 30f（100/80） |
| S10 | 明细表下摇 | 是 | 15f（Sat/Sun 行） |
| S11 | 侧栏 nav 轨道滑移 | 是（第 2 次） | 20f |
| S12 | 三数横 pan + ¥540 count-up | 是 | 30f（三数） |
| S13 | 中位线 match + 点 ring | 是 | 30f（¥540） |
| S14 | 建议句 macro + underline | 是 | 30f（建议） |
| S15 | 报价列表 pan + 闭环 | 是 | 30f（闭环） |
| S16 | 品牌/QR 定版 | 是 | 45f（QR/logo） |

- **整画面级冲击 2 处**：S15 闭环（f1580，光圈/光球扩满）与 S16 收尾 bloom（f1690，logo/QR 落定）；其余全部元素层。
- **呼吸位**：S01 尾 20f、S03/S04/S06/S09/S12/S14 各 30f、S15 30f、S16 45f。
- **无字幕/输出**：不加 caption/SRT；底部 140px 无设计文字；字幕由用户后期用 GPT 添加。
- **相机**：无手持、无 crash zoom、无整画面节拍泵。

---

## 4. 与 02-copy-en.md 的映射（v2.1 已 1:1 对齐 03）

02-copy-en.md v2.1 已按本 03 的 16 镜逐镜锁版；下表只列**特殊状态**（避免二次叠字）：

| 03 镜 | 02 v2.1 状态 | 屏幕使用 |
|---|---|---|
| S01 | headline + kicker + small | 用「The week, / in one view.」；官方 landing 句只作 ALT |
| S02 | headline + kicker | 用「One week, / four numbers.」；KPI 数字 UI 自带 |
| S03 | **no headline** + kicker | kicker「AI DIAGNOSIS · CORE JUDGMENT」；卡内判断句承担正文 |
| S04 | **no headline** + small | small「4 room-nights from the 80% target.」+ UI |
| S05 | headline + kicker | 「Every recommendation / has a source.」；evidence labels 只在 UI 内 |
| S06 | headline + kicker | 「From judgment / to action.」；三条 action UI 自带 |
| S07 | headline + kicker | 「Before you act, / verify the numbers.」 |
| S08 | **no headline** + kicker | 四 KPI 是主角；只 kicker |
| S09 | headline + kicker | 「One night full. / One night opens.」（或 ALT 100%/80%） |
| S10 | **no headline** + small | small「15 weekday · 9 weekend · 11 open.」；表只特写 Sat/Sun |
| S11 | headline + kicker | 「Four nearby stays, / same date.」 |
| S12 | **no headline** + kicker | 三个大数是主角；只 kicker |
| S13 | **no headline** + annotation | annotation「SATURDAY MEDIAN ¥540」32–36px |
| S14 | headline + kicker | 「Keep Saturday firm. / Test ¥520–¥540.」 |
| S15 | headline + kicker | 「Four quotes. / One decision.」（已采纳；不补第 4 行价格） |
| S16 | 官方 footer + QR + small | 不加第二 tagline / 不加「STAYCRAFT」kicker（logo 已承担） |

## 5. 验收帧与自检

- 每镜 2 个验收帧：S01 f36/f78；S02 f130/f200；S03 f255/f300；S04 f380/f430；S05 f500/f540；S06 f600/f645；S07 f700/f760；S08 f820/f880；S09 f960/f1000；S10 f1040/f1070；S11 f1120/f1170；S12 f1240/f1300；S13 f1350/f1390；S14 f1440/f1485；S15 f1540/f1590；S16 f1700/f1760。
- 自检：① 全片无中文可读（尤其顶栏/AI 输入框）；② 所有数字与 demo 一致，无旧片数字；③ 每个功能 hold ≥30f；④ 底部 140px 无关键文字；⑤ QR 实测扫码；⑥ logo 未重绘/未改色；⑦ 无硬切接缝（转场逐缝检查）；⑧ 2x 纹理推近文字锐；⑨ 无字幕轨、无 VO；⑩ 无旧片 logo/素材/文案。

## 6. 实现状态与剩余风险

**已确认（Lead 2026-11-13）**：QR 已用 qrcode 重新生成（1024px、errorCorrection M、内容 https://staycraft.online）；BGM 沿用 public/audio/bgm/staycraft-60s.wav（120BPM）；S01/S16 均可用真实 logo；SFX 钉帧由 Lead 统一做（core/sfx.ts），03 的 sound points 只作语义参考；02 v2.1 已按 16 镜锁版；03 已按现版放行给 motion。
**剩余风险**：
- S04/S12 count-up 必须像素级覆盖真实数字；对不齐就放弃 count-up，只做 ring/underline（不要双数字）。
- S10 明细表 2s：只突出 11/14 Sat、11/15 Sun 两行，其余行做纹理；不整表密读。
- S01/S16 small 放左缘（非底部中央）；S16 footer 两行结束 y≈860，不进底部 140px。
- 顶栏「中文」与 AI Assistant 输入区必须裁掉/遮住；全片无中文可读。
- QR 终检需实测扫码到 https://staycraft.online。
