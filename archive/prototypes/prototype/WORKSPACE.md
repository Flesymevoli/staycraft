# Work 页面原型

第二个页面：Work。现已连接 Home / Work / Analysis；Create 与 My Homestay 仍为简化预览。

- 打开 `../手机首页预览.html`，点击底部第二个图标进入 Work。
- Review reply / Review draft：展开可编辑草稿；Confirm & save 后移入 Done，并同步首页摘要。
- Working 下方的 Demo: finish analysis：模拟分析完成，转入 Needs you。
- Done 中 Property information updated：打开早餐时间变更底部弹层。
- View property：仅展示简化的民宿资料预览，不代表第三个完整页面。
- 中英切换、键盘操作、减少动态效果偏好均支持。
- 状态仅保存在当前页面会话；刷新或 Reset demo 恢复初始数据。没有真实 AI、OTA、发送、发布或调价。
- 运行根目录 `export-preview.ps1` 可重新打包离线 HTML。UI_STYLE.md 按用户要求暂不更新。

验收：`qa-work.cjs` 检查确认流程、时间线、分析状态、详情弹层、语言、导航、重置，以及窄屏/横屏溢出。
