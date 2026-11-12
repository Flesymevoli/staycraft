# Demo 订单数据（虚构，隔离使用）

**全部为虚构数据**，仅用于本地演示与隔离测试，不得导入真实环境，也不代表任何真实订单。

## 由生成器产出，日期随当天平移

`node scripts/demo-data/generate-demo-orders.cjs` 生成 `orders-baseline.csv` 与 `orders-update.csv`。
**不要手改这两个 CSV**，改规则请改生成器。

两个必须满足的约束：

1. **房型/房号与演示民宿一致**（`scripts/operator-sample-data.cjs:9-14`）：`花园大床房 520/晚 · 庭院双床房 580/晚 · 湖景家庭房 760/晚`，房号 `101/102/103/201/202`（203 未启用）。金额按挂牌价 × 晚数。用其它房型名会被真实导入 RPC 拒绝。
2. **不能与演示民宿自带的预订撞房**。那批预订是"相对当天"生成的，所以固定日期的 CSV 在 Demo 当天必然冲突。生成器先读样本已占用房晚，再挑空闲房间排入。

## 结构

| 文件 | 行数 | 内容 |
|---|---|---|
| `orders-baseline.csv` | 26 | 16 单已完成住宿（近 6 周）+ 10 单未来预订 |
| `orders-update.csv` | 28 | 全量最新快照：24 单未变 + 2 单变更 + 2 单新增 |

固定模板（`frontend/src/lib/booking-csv.ts:1`）：
`channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at`
`channel` 用平台名、`external_id` 用平台单号形态、`source_updated_at` 为 ISO 时间（含 Z）。

## 二次导入的预期（单号由生成器动态分配，运行时看生成器输出）

| 类型 | 数量 | 预期 |
|---|---|---|
| 未变 | 24 | 判为重复，不重复创建 |
| 改期 | 1 | 更新现有订单的日期与房号，不新建 |
| 取消 | 1 | 标记取消并保留历史，不删除记录 |
| 新增 | 2 | 新建 |

再次导入 `orders-baseline.csv`：全部判为重复，订单与任务数量不变。

## 端到端演练

```
cd frontend
node scripts/qa-demo-e2e.cjs
```
需要能起进程与浏览器的完整权限（受限沙箱下 next start / Playwright 会 spawn EPERM）。
脚本会：清理隔离 run 存档 → 重新生成 CSV → 起 127.0.0.1:3114 非 rich 样本服务器 →
登录 → 诊断（3 信号 / 2 机会）→ 机会卡/证据面板 → 保存计划 → 刷新持久化 → 勾选 → 回看三态 →
导入 baseline → 导入 update（改期/取消/新增/重复）→ 断言改期日期与取消状态 → 截图。
它只用内存假库与假登录、关闭模型，不连接正式经营库。

## 口径提醒

- 金额是订单总额，不是实收；取消单保留原金额用于对账，不计入住宿收入。
- `room_number` 为空表示待分房，不得自动分配房间（部分历史单故意留空）。
- 这些文件不进入生产数据；演示结束不写入真实库。
