# Staycraft 受控部署验收

更新：2026-10-23。当前准备的是经营端v1受控验收版本；尚未公开发布。功能事实以CURRENT_BASELINE、TODO及发布检查报告为准。

## 发布组成

Vercel项目Root Directory选`frontend`，框架Next.js，Node.js 24.x。安装`npm ci`，构建`npm run check`（已在vercel.json配置）。其他Node平台执行同样命令后`npm start`，反向代理提供HTTPS；不要公开运行开发服务器。部署产物、源码与环境变量应来自同一次版本，更新公开变量后重新构建。

Next.js和Supabase即可运行经营资料、房型/图片、客房、预订、入住/退房、取消审核、站内消息及预订指标。FastAPI是回复草稿可选服务；未部署它时可继续人工回复。仓库内旧SQLite/native演示不是线上依赖。

## 配置

| 变量 | 线上设置 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 目标项目HTTPS地址 |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | sb_publishable_公开key；绝不可填secret或service-role |
| HOMESTAY_LOCAL_DATA | 0 |
| STAYCRAFT_HOSTED | 非Vercel平台设1；Vercel自动检测 |
| STAYCRAFT_OPERATOR_SAMPLE / STAYCRAFT_QA_AUTH_FIXTURES / STAYCRAFT_QA_FORMAL_STAYS | 不设置；误设1会拒绝启动 |
| WORKSPACE_BACKEND_URL | 可选；部署草稿服务后填其HTTPS地址，否则不设置 |

不要上传.env.local、backend/.env或本机数据。NEXT_PUBLIC_变量属于浏览器公开配置。正式模型开关保持关闭；部署草稿服务也不等于获得真实资料模型调用授权。

Supabase项目当前为husrpqalpjjswpvrkxet。一账号一民宿，首次登录创建自己的空容器；邮箱密码登录，尚无前端自助注册或密码找回。测试账号由管理员在Auth控制台准备；不要用本机demo@example.invalid账户尝试线上登录。

## 发布前统一检查

在frontend运行：

```powershell
npm ci
npx playwright install chromium
npm run release:check
```

统一检查先做lint/build，再串行运行隔离QA；测试都使用虚构夹具，不运行真实订单写入脚本，也不调用模型。端口3104须空闲。结果写入被Git忽略的`frontend/qa-release-report.json`，首次失败即停止。单独执行`npm audit --omit=dev --audit-level=high`核对生产依赖；可复现计算测试与浏览器版本跟随lockfile。CI执行相同流程，但不会自动部署。

发布检查不等于真实账号与域名验收。授权发布后，先创建受部署保护的预览环境，完成下面清单，再确定是否转稳定版本。

## 实际部署环境验收

1. 配置HTTPS域名与访问保护；在Supabase Auth更新Site URL。当前没有OAuth/邮件回调流程，不声称注册找回已支持。
2. 用专用虚构测试账号A登录；未登录页面与API不可访问。退出后刷新、返回工作台应要求重新登录。
3. 保存虚构资料，上传房型图片、添加/编辑房号，刷新检查持久化。使用账号B确认看不到A的资料、图片、订单和会话。
4. 只在专用测试民宿上创建客人预订/消息，核对经营端同步；确认入住、退房转待清洁、清洁撤销、逾期取消批准/拒绝以及重复操作。
5. 检查7/28天预订指标、中文/英文切换及手机宽度。正式营业额仅计当前账号已完成订单；空月为0、读取失败显示重试，不得显示本机演示金额。
6. 检查404与异常恢复、健康检查`/api/health`、禁止收录标记。健康检查只表示进程可用；数据库状态需以上业务验收确认。

2026-10-23只读核对：相关7张公开业务表RLS开启，6个预订/入住/审核/客人接口公开包装为security invoker；room-photos私有。当前远端有11条迁移记录，前期控制台初始化和本地迁移时间戳存在历史差异，详见supabase/README；不要盲目db push。安全扫描仍提醒Auth泄漏密码保护未启用；管理员可在账号安全设置中评估开启。

## 本版能力边界

- 正式可用：资料/房型/客房、图片、直订与分房、订单、入住退房、取消审批、站内人工消息、日期待办、预订占用率/进度与规则分析。
- 正式营业额/月历/收入结构读取当前民宿已完成订单；demo@example.invalid仍为本机隔离进程，不能打开测试开关部署。
- 尚未完成：市场探索来源、首页问AI/完整处理记录、客人评分反馈、前端注册/密码找回。保留原任务，不暗中删除或声称实现。
- 客人站仅为受控数据来源；尚无完整IP反滥用、订单跨设备找回与商用客服保障。无真实付款或退款，不作为面向陌生客人的商用预订平台。

## 回滚与更新

发布记录绑定Git提交和环境配置。页面问题回退到前一已验证部署；代码回滚不回滚或删除订单、图片。数据库使用增量迁移、先备份、再前向修复，禁止自动降级或重新执行初始化SQL。

用户允许后可从固定Git版本建立预览；目前未向GitHub推送本轮提交、未创建Vercel项目或域名、未公开发布。检查点和验证日志见DEVELOPMENT_STATUS、ROLLBACK。
