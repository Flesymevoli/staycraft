# Staycraft 受控部署验收

更新：2026-10-23。当前交付范围是日常运营助手与分析决策助手的自家数据基础版本。代码准备、Git同步、实际部署和模型启用分别验收；当前未公开部署。

## 发布组成

Vercel导入GitHub仓库，Root Directory选frontend、Next.js、Node.js 24.x。安装npm ci，构建npm run check（vercel.json已配置）。其他Node平台构建后npm start，使用HTTPS反向代理，不公开开发服务器。

Next.js与Supabase承载核心资料/图片/客房/订单/入住退房/取消审核/站内消息、受限自动回复、聚合经营助手及指标收入。FastAPI仅为可选的旧回复草稿服务，SQLite/native不是线上依赖。

## 配置

| 变量 | 线上设置 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 目标项目HTTPS地址 |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | publishable公开key，绝不填secret/service-role |
| HOMESTAY_LOCAL_DATA | 0 |
| STAYCRAFT_HOSTED | 非Vercel托管设1，Vercel自动检测 |
| STAYCRAFT_OPERATOR_SAMPLE / STAYCRAFT_QA_AUTH_FIXTURES / STAYCRAFT_QA_FORMAL_STAYS | 不设置，误设1会拒绝托管启动 |
| FORMAL_AUTO_REPLY_ENABLED | 0；正式自动发送需另获授权 |
| FORMAL_MODEL_ENABLED / MODEL_ENABLED | 0；正式真实资料模型调用需另获授权 |
| MODEL_BASE_URL / MODEL_NAME / MODEL_API_KEY | 可选，仅服务端，未授权启用时不需要配置 |
| WORKSPACE_BACKEND_URL | 可选HTTPS草稿服务地址，否则留空 |

不上传.env.local、backend/.env、本机数据库或测试配置。NEXT_PUBLIC变量会公开到浏览器；模型密钥绝不使用该前缀。MODEL_BASE_URL为Chat Completions基础地址（请求追加/chat/completions），是否含/v1取决于供应商。DeepSeek请求明确关闭thinking并要求JSON；不能假定其他供应商支持相同扩展。

Supabase现有项目husrpqalpjjswpvrkxet，一账号一民宿。首次登录创建空容器，专用测试账号由管理员在Auth准备。demo@example.invalid/staycraft-demo只存在本机隔离进程，不能用于线上登录。不要复制样本开关到托管环境。

## 发布前检查

在frontend运行：

```powershell
npm ci
npx playwright install chromium
npm audit --omit=dev --audit-level=high
npm run release:check
```

统一检查先构建，再串行27项隔离QA，端口3104须空闲，报告写入忽略的qa-release-report.json。使用虚构夹具，不运行真实订单脚本、不消费模型、不迁移线上数据库。GitHub CI执行同样检查而不部署。

可选接口验证：仅使用已获授权的固定虚构资料；把密钥放在本机忽略文件，设置STAYCRAFT_MODEL_ENV为该文件路径，再设置RUN_PAID_MODEL_TEST=1并运行node scripts/qa-ai-live.cjs。最多两次有输出上限的分类/排序调用，不读云端资料；不要加入默认发布检查。扩展评估node scripts/qa-ai-evaluation.cjs同样须RUN_PAID_MODEL_TEST=1，最多8次请求，11个固定虚构场景；报告qa-ai-evaluation-report.json由Git忽略，不能当全面质量分数。node scripts/qa-ai-workspace-live.cjs为同样opt-in的隔离Next页面链路检查：3104端口，虚构内存适配器，最多两次模型请求，外网仅放行所配置模型接口；不改变3101/3106或真实账号设置。2026-10-23已使用DeepSeek deepseek-flash完成两次固定虚构资料请求，分类/排序结果均有效；正式模型与发送开关保持0。模型名与基础地址按[官方接入文档](https://api-docs.deepseek.com/quick_start)配置，换供应商需重验。

## 实际环境验收（待授权发布后）

1. 先创建受保护预览，配置HTTPS与Supabase Auth Site URL；当前无OAuth/邮件回调流程。
2. 专用虚构账号A登录、退出、刷新及返回保护；账号B不可看到A的资料/图片/订单/会话/处理记录。
3. 保存虚构资料、上传图片、添加/编辑客房，刷新核对；通过客人入口创建订单和消息，确认同步。
4. 验证入住、退房转待清洁、撤销清洁、取消批准/拒绝与重复操作；核对事务记录，无资金动作。
5. 检查7/28指标、快照金额、已完成订单营业额/月历、空月和失败重试、Home/Work关联提醒、双语与手机布局。
6. 若另获正式自动发送/模型授权，仅在测试民宿验证开关、人工接管/恢复、缺资料/敏感请求转人工、暂停与资料变化阻止在途发送，检查审计和失败恢复。不要为验证而开启所有现有账号。
7. 检查404/恢复、禁止索引、/api/health。健康检查只代表进程可用，不替代数据库业务验收。

数据库15条已应用迁移及历史版本映射见supabase/README。10张主要业务表RLS、私有图片和受限RPC已核对；Auth泄漏密码保护仍有既有提醒，可由管理员评估启用。不要重放初始化、盲目db push或清理真实数据。

## 边界与回滚

外部市场来源、反馈满意度、推广助手未完成；当前分析解释自家数据，可选模型只做受限分类或排序，不制造市场事实。示例配置仍默认关闭模型与发送。用户已授权当前账号本机3101启用两项能力，实际密钥仅在忽略的.env.local；Vercel配置不会因此自动变化，公开部署仍需授权。

发布绑定Git提交与环境配置。页面问题回退已验收代码；数据库备份后用增量迁移前向修复，保留订单/图片/审计，不自动降级。Git同步不构成公开发布授权。详情见RELEASE_READINESS、ROLLBACK和TODO。
