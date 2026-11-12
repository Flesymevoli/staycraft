# 虚构订单样本

这些数据用于本地隔离样本或明确的测试账号，不得导入真实经营账号。文件夹名是脚本路径；当前产品所称“demo 版”仍指 Gemini 静态演示。

## 生成与导入

在 `frontend/` 执行：

```sh
node scripts/demo-data/generate-demo-orders.cjs
```

生成器读取 [operator-sample-data.cjs](../operator-sample-data.cjs) 的房型、房号和已有预订，按当前日期生成 `orders-baseline.csv` 与 `orders-update.csv`。它会覆盖这两个生成文件；调整样本逻辑请改生成器，不手改生成结果。

样本的房型、房号必须与导入目标一致；用于新测试账号时先准备匹配的房型和客房。上传后先核对预览，再确认导入，不将固定演示数据视为当前账号的真实经营事实。

CSV 字段、大小与行数限制以 [booking-csv.ts](../../src/lib/booking-csv.ts) 为准，列为：

```text
channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at
```

先导入 baseline，再导入 update，用于验证重复订单、改期、取消和新增；以生成器输出与页面预览为准。金额是订单总额，不是实收；取消记录保留历史，未分房记录不能自动冒充分房完成。

隔离演练脚本为 [qa-demo-e2e.cjs](../qa-demo-e2e.cjs)，使用内存夹具、关闭模型。脚本的存在或历史结果不代表当前页面已经通过验收；按任务检查兼容性后再运行。通用运行方式见 [frontend/README.md](../../README.md)。
