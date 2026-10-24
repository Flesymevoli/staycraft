# Cloudflare 并行部署

更新：2026-10-25。用户授权新增 Cloudflare 部署，同时保留 Vercel。已上线：https://staycraft.staycraft-yuuno.workers.dev 。

Worker：staycraft；当前版本：3c737077-f19a-4fb6-8360-663a39ca2c3d。普通演示账号登录、Home/Work数据读取、Analysis营业额5680元和月历及预订指标已在真实浏览器验证。两站共用原数据库，未重跑种子或修改业务数据。

## 当前准备

- Next 16.4.2 + OpenNext Cloudflare 1.20.13 + Wrangler 4.152.0。独立 wrangler.jsonc，原 Vercel 配置保留。
- cf:build / cf:preview / cf:deploy 统一走 scripts/cloudflare.cjs。适配器会生成含本地环境的 next-env.mjs，构建后清空该文件；预览和部署拒绝未清理产物。密钥只通过远端 Secret 配置，不上传本机 .env。
- 本地 .dev.vars 仅有公开 Supabase URL/publishable key，已忽略；.open-next、.wrangler 同样忽略。
- 新增工具的 glob/undici 使用同主版本安全补丁 overrides，zod 更新；npm audit 当前0漏洞。
- 初次 Workers 构建和 dry-run 通过，压缩约2739 KiB；本地运行 /login、/api/health 200，匿名业务接口401、旧原型和缺property客人页404。尚未验收真实登录后的 Workers 流程。
- Next Node.js proxy 在适配器中属实验支持，需要补正常账号登录、Cookie与权限验收。

## 待完成

1. 官方设备码授权已完成，CLI已登录。不要再次发送旧链接或设备码。仅部署所需权限已能完成发布，无需补齐CLI提示的全部默认权限。
2. Worker已配置公开Supabase连接；模型三个开关为0。迁移DeepSeek Secret的异步确认仍待用户回复，不复用仅对Vercel的Secret许可。
3. 仍需完整订单/消息操作、图片、跨账号隔离及关闭VPN实测。当前浏览器成功不等于大陆全网络可达；本机命令行TLS失败也不能据此认定浏览器不可用。
4. 当前手动CLI部署，未配置Cloudflare Git自动构建。main推送仍会触发Vercel更新，不改DNS/删服务/重跑种子。

assets.run_worker_first=true，确保静态资源也先经过应用访问规则，避免旧原型绕过代理保护。构建、lint、dry-run与依赖审计通过；本轮未重跑整套29项发布检查。模块前置回滚点2145b51；Cloudflare独立回退不改变Vercel部署。

回滚：移除本模块Cloudflare配置与工具依赖，恢复package锁文件；云端业务数据不变。不自动添加用户operator-desktop.css、根scripts/或tmp/。
