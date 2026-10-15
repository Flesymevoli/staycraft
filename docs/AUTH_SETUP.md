# 登录与民宿访问联调

这是**应用开发**的联调说明，和 `deliverables/` 中的课程交付件分开。当前尚无 Supabase 项目，以下配置和迁移**没有执行**；五页 `/native-*` 仍是公开演示。

1. 建立开发用 Supabase 项目，在 Auth 中启用邮箱密码登录，创建至少两个测试用户。不要使用真实客人资料。
2. 在 Supabase SQL Editor 或迁移工具中执行 `supabase/migrations/202610150001_property_access.sql`。用管理员权限创建两家测试民宿，再分别为测试用户插入 `property_memberships`。不要把管理员密钥交给浏览器或提交到 Git。
3. 将 `frontend/.env.example` 复制为 `frontend/.env.local`，填入项目 URL 和 **publishable key**。在后端进程环境中设置相同的 `SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY`。这两个是公开配置；`service_role` / secret key 不应放在前端。
4. 运行 `npm run dev`，访问 `/login`。用测试账号登录后检查 `/app`，刷新确认会话仍在；退出后访问 `/app` 应回到 `/login`。
5. 用登录会话的 access token 向 `GET /v1/properties/{property_id}/access` 发送 `Authorization: Bearer <token>`。所属民宿应返回角色；另一家民宿应返回 403；无令牌或失效令牌应返回 401；认证服务不可用时应返回 503。这个令牌不可写入仓库、截图或日志。

`/app` 目前只是正式应用占位工作台；完整的 Mine、Work 数据接入属于下一开发模块。没有完成上述真实联调前，`TODO.md` 第 2 项保持未勾选。
