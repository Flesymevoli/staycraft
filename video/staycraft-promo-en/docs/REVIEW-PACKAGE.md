# REVIEW-PACKAGE · 独立终检输入清单（StayCraft 60s 产品宣传片）

> 用途：交给独立终检 subagent（干净上下文、不参与制作、不接收制作过程解释或预期结论）。
> 复核依据：video-shotcraft 的 final-review.md 全套检查项 + aesthetic-rules.md 全文逐条。
> 记录时间：2026-11-05（终检阶段）。本文只列输入与事实，不含制作辩解、修改历史或"应该通过"的暗示。
> 若某项输入缺失：在审查报告中标记「无法验证」，不要自行推断制作基准。

---

## 1. 输入总表

| 类别 | 路径 | 说明 / 必须核对 |
|---|---|---|
| 成片（带 BGM） | video/staycraft-promo/out/staycraft-promo.mp4 | 交付时应存在；若终检时缺失，标记无法验证 A1/A8/A9 与整片节奏 |
| 成片（无 BGM，保留 SFX） | video/staycraft-promo/out/staycraft-promo-nobgm.mp4 | 与带 BGM 版出自同一时间线（Root 的 bgm inputProp；建议 --props=props-nobgm.json）；缺失则 A8 无法验证 |
| 关键帧 | video/staycraft-promo/out/qa/ | 现有每镜验收静帧，命名 qa-S01-0.png / qa-S02-205.png / ... / qa-S16-1799.png；终版关键帧若另出目录，以 Lead 交付清单为准 |
| 创作模式 | docs/00-product-brief.md §0 | 自主自由创作（video-shotcraft pipeline 阶段 0–7，不逐阶段等待确认） |
| 产品简报 | docs/00-product-brief.md | 定位、目标用户、核心问题、产品链路、数据与合规、硬约束 |
| 视觉方向 | docs/01-visual-direction.md | 选定方向 A、色板/字体/材质/几何母题、镜头/转场/字体/图表规则、§10 裁决记录 |
| 叙事与文案 / 数据口径 | docs/02-narrative-copy.md | 五幕结构、逐镜文案 v-final r2、§5 冻结数据（唯一数据口径） |
| 分镜与帧级时间轴 | docs/04-storyboard-draft.md | §1.3 分镜表、§2/§2.1 逐镜卡与截图 bbox、§3 文案槽位、§4 手法/hold/冲击预算、§5 SHOTS、§6 SFX 语义表、§7 验收帧、§11 实现偏差记录（终版） |
| 功能→镜头映射 | 本文件 §2（项目无独立 03 文档）；另见 04 §8（02 场景→16 镜映射） | F1/F2/F3 按本表逐项核对 |
| Gallery 索引（卡名/style-key 校验） | C:\Users\86299\.agents\skills\video-shotcraft\gallery\api\library.json | 核对卡名存在、style-key 与成片一致 |
| 卡片参考文档 | C:\Users\86299\.agents\skills\video-shotcraft\references\shots\<category>\<card>.md | 逐卡读取"命门/已知坑"；见 §3 |
| 配方 demo TSX | C:\Users\86299\.agents\skills\video-shotcraft\demos\... | 见 §3；S3/S4 检查动作语法/关键时值/遮罩时机是否保留 |
| 审美准则 | C:\Users\86299\.agents\skills\video-shotcraft\references\aesthetic-rules.md | 终检必须完整执行（R/Q/S/C/P 全条） |
| 终检清单 | C:\Users\86299\.agents\skills\video-shotcraft\references\final-review.md | P/F/V/S/B/D/A/Q 全项；逐条带帧号证据 |
| 数据源截图 | C:\个人\学习\ENT207\Homestay AI assistant\artifacts\app-screenshots-2026-11-05\ | PC-01/03/04/06/07/08/12、手机-07 等；manifest.json 记录 URL/尺寸；核对 D1–D5 |
| 页面纹理（工程内） | video/staycraft-promo/public/textures/ | 15 张：PC 1440 宽 1x、手机 390 宽；同名映射见工程 |
| 品牌原图 | video/staycraft-promo/public/brand/staycraft-logo.png（原文件 frontend/public/brand/staycraft-violet-yellow.png） | 核对未重绘/未改色/未反白/未加发光 |
| 音频素材与许可 | video/staycraft-promo/public/audio/bgm/staycraft-60s.wav；public/audio/sfx/audio-manifest.json；public/audio/sfx/FREESOUND-CREDITS.md | A10：素材页/作者/许可/哈希/分析记录；A6：渲染产物里每条 SFX 是否可听见 |
| 工程源码（必要时核对落地） | video/staycraft-promo/src/shots/S01.tsx … S16.tsx；src/core/* | 仅用于核对页面状态/SFX 钉帧/实现事实，不作为视觉基准 |

---

## 2. 功能→镜头映射（F1/F2/F3 核对表）

| 产品功能 / 叙事职责 | 镜头 | 画面证据（页面状态 / 素材） |
|---|---|---|
| 品牌与定位：民宿经营者的 AI 工作台 | S01、S02、S16 | S01 ink 夜桌 + 四格窗（无截图）；S02 logo 原图 + tagline；S16 元素合影 + logo hold |
| 痛点：订单散 / 空房靠猜 / 比价靠翻 | S01（三拍） | 四张抽象纸片（订单行/七日格/乱序价格/空白草稿纸）；不以第三方 UI 复刻表现 |
| 导入经营数据：订单归位、逐条核对 | S03 | PC-04 订单与导入页顶部：导入待办行飞入嵌入 + tab 切到数据概况 |
| 经营数据可视化：预订占用率/进度/金额/ADR | S04 | PC-03 四指标卡 + DOM 数字；54.3% / 19-35 / ¥10,802.33 / ¥568.54 |
| 每日占用率与周末/低谷 | S05 | PC-03 折线卡；11-08 低谷 20%、只订出 1 间、空着 4 间 |
| 预订 vs 完成两本账 | S06 | PC-01 完成指标裁片 + PC-03 预订金额裁片；正反翻面 |
| AI 主动调查（工具步骤、可追溯） | S07 | 三节点 + 飞线 + 步骤 chip（读取经营记录/查询周边报价/保存证据）；无聊天框、不提"报告" |
| 市场调研：同一天周边报价 | S08 | PC-06：供应商起价范围 ¥124–¥621、5 家、5 条有效报价、查询 11/5 15:36 |
| 本店价格在市场中的位置 | S09 | 价格轴 ¥100–¥800；5 个报价点 ¥124/187/212/257/621；本店区间 ¥520–760 重叠 |
| 报告标题与结论 | S10、S11 | PC-12 标题原文 + 三药丸（空档在 8–10 日 / 不是整周缺客 / 先补这三晚） |
| 报告的不确定性 | S12 | PC-12 原文四条：渠道不完整 / 间夜状态未知 / 周期不可比 / 无利润数据（muted） |
| 决策与推广：人群与两版文案 | S13、S14 | PC-07 建议推广人群卡 + segmented control；简约版/引流版引文 |
| 发布前由人核对 | S15 | 手机-07 下段：推广草稿 + 保存文案；chip 房态/价格/措辞；提示条 |
| 品牌收尾与合规标注 | S16 | logo 原图压印 + tagline + 「示例数据均为虚构演示」 |

---

## 3. 卡片名 / 变体 / demo TSX（S3/S4/S6 核对用）

> 基准路径：C:\Users\86299\.agents\skills\video-shotcraft\
> 参考卡：references\shots\...；demo 源码：demos\...；Gallery 样片：gallery\media\<card>.mp4（如已拉取）。

| 镜头 | 卡片名 | style-key / 变体 | 参考卡（references/shots/...） | demo TSX（demos/...） | 本片改编说明（事实） |
|---|---|---|---|---|---|
| S01 | 无（自定义装置） | — | opening/brand-ink-open.md（仅节奏参考） | 未使用 demo | 四格窗/纸片为自定义几何；非卡来源 |
| S02 | white-flash-logo-simplify-cut | white-flash-logo-simplify-cut（冲白段改编） | transition/white-flash-logo-simplify-cut.md | transition/white-flash-logo-simplify-cut/WhiteFlashLogoSimplifyCut.tsx | logo 用原始 PNG 整枚压印，不做逐字/液态层 |
| S03 | row-embed | row-embed | ui-entrance/row-embed.md | ui-entrance/row-embed/RowEmbed.tsx | 行体=真实行裁片；4 行压 3 行 |
| S04 | crane-rise-reveal | crane-rise-reveal（降档） | opening/crane-rise-reveal.md | opening/crane-rise-reveal/CraneRiseReveal.tsx | 3.0→1.0 降为 1.2→1.0；数字层用 assets/lib/DigitRoll.tsx |
| S05 | 无（降级实现） | — | camera/crash-zoom-punch.md（备选，未启用） | 未使用 demo | 遮罩揭示 + 黄点 pop + 相机 1.0→1.15；不重绘折线 |
| S06 | card-flip-reveal | card-flip-reveal（2 卡版） | transition/card-flip-reveal.md | transition/card-flip-reveal/CardFlipReveal.tsx | 三卡降两卡；正反=指标裁片→结论数字 |
| S07 | glow-flyline-moves | flyline-arc（浅底改版） | effects/glow-flyline-moves.md | effects/glow-flyline-moves/FlylineArc.tsx | 暗场改浅底；节点=真实裁片 |
| S08 | scanline-annotate-focus | scanline-annotate-focus（120f） | effects/scanline-annotate-focus.md | effects/scanline-annotate-focus/ScanlineAnnotateFocus.tsx | 机器色改 violet；PC-06 整页 0.66 右置 |
| S09 | timeline-travel | timeline-travel（价格轴改编） | data/timeline-travel.md | data/timeline-travel/TimelineTravel.tsx | 刻度轴→价格轴；弹卡→报价点；急停→本店区间 |
| S10 | marker-underline-title | marker-underline-title | typography/marker-underline-title.md | typography/marker-underline-title/MarkerUnderlineTitle.tsx | 下划线改黄；仅压 8–10 日 |
| S11 | doc-park-left-pill-deal | doc-park-left-pill-deal（3 药丸） | ui-entrance/doc-park-left-pill-deal.md | ui-entrance/doc-park-left-pill-deal/DocParkLeftPillDeal.tsx | 174f→180f；报告页 0.9 缩放/52% 宽 |
| S12 | list-reveal | list-reveal（降档 5f/18f） | ui-entrance/list-reveal.md | ui-entrance/list-reveal/ListReveal.tsx | 4 项；hold 28–35f；四条按 PC-12 原文 |
| S13 | bottom-push-stack-wipe | bottom-push-stack-wipe（单次） | transition/bottom-push-stack-wipe.md | transition/bottom-push-stack-wipe/BottomPushStackWipe.tsx | 单次推入；淡紫纸 #f6f5fb 替代饱和章 |
| S14 | segmented-thumb-hero | segmented-thumb-hero（两段） | interaction/segmented-thumb-hero.md | interaction/segmented-thumb-hero/SegmentedThumbHero.tsx | 控件 1.6x 重绘；结尾整组 0.9 退场 + 真实页 0.85 浮现 |
| S15 | radial-ripple-phone-chips | radial-ripple-phone-chips | effects/radial-ripple-phone-chips.md | effects/radial-ripple-phone-chips/RadialRipplePhoneChips.tsx | 手机内容换 手机-07 下段；chip 房态/价格/措辞 |
| S16 | outro-group-photo-launch | outro-group-photo-launch | outro/outro-group-photo-launch.md | outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx | 6 元素真实裁片；去 crane rotateX，24f 整层 settle；logo PNG 压印 |

补充参考：T7 胶囊接力（S14→S15）见 transition/shot-transitions.md 的 match-cut 口径（本片仅形状/比例匹配）；T8 元素入伙（S15→S16）为连续移交，无独立卡。
S08/S11/S12 的页面滚动与视口数值见 04 §11（2282→2408、s12End=2540）。

---

## 4. 实现事实（供核对，不作解释或判断）

1. 素材：不补采 2x；页面纹理 zoom ≤1.15；元素特写一律 1x 裁片 + DOM 重排字。
2. S05：无 crash-zoom；改「遮罩揭示 + 黄点 pop + 相机 1.0→1.15」。
3. S08：PC-06 整页 0.66 缩放、右置（1580 高放不进 1080）。
4. S11：报告页 0.9 缩放；视口顶 2282→2408；文档约占 52% 宽。
5. S12：从 2408 接续；s12End=2540（正对 e1–e4）；四条按 PC-12 原文。
6. S15：90f 镜长下 hold 28f（与 30f 预算差 2f，记录于 04 §11-6）。
7. S16：去 crane rotateX（保 T8 手递坐标），24f 整层 settle；logo 脉冲 1719–1721 仅一记亮脉冲。
8. S14：结尾整组 0.9 退场 + 真实页 0.85 浮现（原"拉回 1.2x"）。
9. T7：仅形状/比例匹配，不做真 morph。
10. 现有 out/render-draft.log 记录过一次渲染在写入阶段（write EOF）中断；终版成片以交付时 out/ 下最新 mp4 为准，缺失则按 §1 规则标"无法验证"，不据日志推断成片状态。

---

## 5. 复核口径提醒（来自 final-review / aesthetic-rules，供审查者使用）

- 逐项结论必须带帧号或截图证据；不要用"整体不错"替代逐项检查；不要为了报告好看全部标 ✓。
- 缺失输入标记「无法验证」，不要自行猜测制作基准；索引/卡片/demo/Gallery 冲突时明确报告冲突来源。
- 不要求与 Gallery 样片像素级一致，但要求保留动作语法、关键时值、遮罩时机与卡片"已知坑/命门"参数；用户点名变体（如有）必须与 style-key 一致。
- 自定义/改版实现（S01、S05、S07 浅底、S09、S14 控件、S16 logo PNG）按 final-review S6 标注实现风险，不因"有风险标注"而自动通过。
- 数据与合规：只认 02 §5 的冻结数据；旧 00 §2 / REPORT_EXAMPLE 数字不得出现；客户/个人/密钥信息零出现；「示例数据 · 虚构演示」标注保留。
- 音频：A8 两版必须同时间线；A6 以渲染产物试听为准（不看预览音量）；A3 卡点误差 ≤3f；A10 SFX 许可/来源记录完整。
- 交付前 Lead 需补齐：两版 mp4 路径、终版关键帧目录；审查报告建议输出到 video/staycraft-promo/out/review/。

---

## 6. 交付时输入补齐清单（Lead 侧）

- [ ] out/staycraft-promo.mp4（带 BGM）、out/staycraft-promo-nobgm.mp4（保留 SFX）
- [ ] 终版关键帧目录（至少每镜入场中/峰值/落定后三帧；若沿用 out/qa/ 请说明）
- [ ] 最终 SHOTS 表（如与 04 §5 有 ±6f 吸附，提供最终版）
- [ ] 音频测量记录（BGM 实测 BPM/相位、SFX 钉帧表、输出音轨偏移补偿记录）
- [ ] 审查报告输出路径
