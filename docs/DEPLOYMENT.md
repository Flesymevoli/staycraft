# Staycraft 部署准备

当前只准备部署经营端资料、客房、订单和日程闭环，没有执行部署或公开发布。客人端主要作为数据入口；完整经营演示样本将单独维护，不将示例当真实用户资料。

## 最小部署组成

Vercel项目根目录选frontend，框架Next.js，Node.js 24.x。frontend/vercel.json使用npm ci安装、npm run check进行lint和构建。当前云端闭环只需要Next.js和Supabase，不要求部署FastAPI；AI/SQLite示例服务保持独立。

根网址进入/app，未登录转/login。健康检查/api/health仅验证服务运行，不冒充数据库可用。配置NEXT_PUBLIC_SUPABASE_URL和NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY；不要上传.env.local，不要用secret/service_role key替代公开key。

HOMESTAY_LOCAL_DATA必须为0；Vercel自动启用托管模式，其他Node平台设置STAYCRAFT_HOSTED=1。缺配置或错误启用本机数据会阻止托管服务启动。公开变量改变后重新构建部署。

托管模式关闭/native-*、/legacy、旧HTML、/api/demo/*、/api/local/*及不带property的独立客人原型；登录页隐藏原型链接。本机保留示例。后续若需在线展示完整示例经营端，应单独准备明确标记的演示环境与固定数据，不能直接放开真实账号数据边界。

## 数据和账号

现有Supabase已应用客房、图片与direct_bookings迁移。早期控制台初始化与CLI历史尚未完全对账，不盲目db push或重复建表。新环境先核对迁移再准备Auth测试账号。一个有效账号首次访问会自动建立自己的唯一空民宿，无需手工配置成员；尚无前端自助注册页面。

当前使用邮箱密码登录，没有OAuth回调。部署后将实际域名配置为Supabase Auth Site URL；以后新增邮件验证/找回密码时，再逐项配置实际回调地址，不将这些功能标为已实现。

先用受控测试账号、虚构资料验收，发布前确定部署保护和邀请范围。匿名直订尚缺完整反滥用限流及浏览器丢失后订单找回，不作为面向陌生客人的商用服务。课程以经营端示例为主，客人端不接收付款。

## 发布与回退

先运行npm run check。经营端回归：scripts/qa-room-cloud.cjs、qa-workspace-bookings.cjs、qa-workspace.cjs、qa-property-profile.cjs、qa-room-import.cjs、qa-hosted.cjs，脚本必须串行运行以免3104端口冲突。

更新预览环境后检查登录、保存图片/房间、订单、日期日程、退出；两个真实账号的浏览器隔离仍需发布前验证。确认后才更新稳定演示版本；尚未执行任何部署。

页面问题回退到上一已验证部署或Git提交。数据库不随代码自动降级，不删除用户订单和图片；结构变更采用增量迁移、先备份、再前向修复。

## 官方资料

[Vercel项目根目录](https://vercel.com/docs/monorepos)、[环境变量](https://vercel.com/docs/environment-variables)、[Node版本](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。


站内消息补充（2026-10-22）：guest_conversations迁移已应用，Next与Supabase即可运行本站留言/人工回复，不增加FastAPI部署依赖。回复回执仅代表写入本站会话，尚无推送、已读、会话找回或历史分页；客人每分钟及单会话限额不是完整IP反滥用方案，仍按受控演示定位。AI草稿后续独立接入，当前不向模型发送真实资料。


草稿服务补充（2026-10-22）：资料/客房/订单/站内人工消息仍只需Next+Supabase；准备回复草稿另需FastAPI。Next配置WORKSPACE_BACKEND_URL（本机http://127.0.0.1:8014，托管必须HTTPS），后端配置SUPABASE_URL和publishable key，用已验证用户访问令牌读取RLS资料。HOMESTAY_LOCAL_DATA=0。前后端均不需要service-role/secret key。

后端FORMAL_MODEL_ENABLED默认0，与旧MODEL_ENABLED分开；当前本机二者都为0，因此只生成资料规则建议。以后取得数据范围授权并配置允许的模型后，才同时启用两个开关，密钥只在FastAPI环境。模型超时或返回无效内容回退规则并标注，所有结果仍需人工审核。草稿后端不可用不影响站内人工回复；目前没有部署FastAPI或网页到公网。
