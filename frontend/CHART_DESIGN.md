# 图表设计依据（2026-11-05，本地未发布）

## 选型与移植

使用 lieflat-charts 的图表模式，不生成独立报告。实际应用仍为 React 组件，沿用原有经营数据与交互。

- L3 Barcode Lollipop（lupi-gallery.html / Ninety days as a barcode）：为约90天记录与通栏叙事设计；当前默认7天及28天数据不需要密集全高条码，未采用。
- F3 Hairline Area（basics-gallery.html / Concurrent users, filled with days）：适合30–60天形态；当前需要逐日点选、明显保留缺失均价断点，面积语义不如点线清楚，未采用。
- **F2 Hairline Line（basics-gallery.html / Thirty days of sign-ups；脚本 B2 hairline line）**：采用。保留 SVG 路径、日历地板逐日刻度、周末空心点、相隔峰值标注、基于比例的坐标与 draw reveal。转换为 React JSX，真实四指标共用一个可切换图表，不增加重复图表。长期间仍保留全部每日数据，由滑条逐日读取。

原模板默认数据已全部替换；没有随机值。零金额为零、无订单均价为 null 且断线；历史房量未知不绘制占用率。显示选中值与期间汇总，保留拖动和原生滑条键盘交互。SVG 坐标矩阵处理桌面留白缩放；入场观察器会断开，reduced-motion 时无绘制动画。

## 一套品牌色

Custom 角色：BG #ffffff、TXT #172b4d、MUT #586b85、GRID #dde6f1、DATA #2873cc、HERO #087f8c、PEAK #164d92。

蓝色表示每日数据，深蓝强调实际高值点，青色仅表示当前选择；周末同时以空心编码，不依赖颜色区分。移除旧彩虹线。收入日历属于保留的日期操作控件，不另套整年热力模板；改成同一蓝色明度阶梯，数值越大色越深，选择仍有轮廓，保留逐日金额/详情及月切换。

## 本轮验证

TypeScript 与 booking-trend 定向 ESLint 通过。qa-chart-presentation.cjs 验证四指标、缺失断线、历史未知、空数据、单日、过期选择及可访问标签；qa-rich-data.cjs 验证四指标数值、金额分与缺失均价区分。浏览器视觉及触控由主 Agent 在最终整合构建后验证；以上不代替真机验证。

2026-11-05：沿用 F2 Hairline 结构；折线与柱图采用共享蓝紫角色，选中点保留青色，峰值深色。数据计算与空值语义不变。
黄色补充：工作日蓝紫、周末明亮黄；折线保持蓝紫连线、周末黄底深色描边，峰值文字仍深色；保留日期及图例，不仅依赖颜色。

2026-11-05最新覆盖：选中点/指示线/滑条统一蓝紫#6554e8，周末黄#ffdc32、细蓝紫边；不再使用青色选中或棕色描边。
