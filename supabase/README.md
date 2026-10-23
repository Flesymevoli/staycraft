# Supabase 当前结构与迁移

更新：2026-10-23。仅属Staycraft自主开发；课程Softr数据独立。当前模型为一个Auth账号拥有一家民宿，不再使用早期成员归属方案。

## 当前结构

- properties.owner_user_id唯一，资料在property_details。
- room_types与rooms为房型/实际客房规范化来源；property_inventory旧快照只读兼容。
- direct_bookings含住宿日期、订单价格快照、预订/取消审核状态、显式stay_state及入住/退房时间。
- conversations/messages提供站内会话；reply_drafts保留人工审核草稿。
- room-photos为私有桶，图片只能通过获授权路径读取。

2026-10-23只读核对：properties/property_details/room_types/rooms/direct_bookings/conversations/messages均启用RLS；预订指标、入住/退房、取消审核、直订与客人消息公开RPC包装为invoker，内部权限检查保留。未修改真实订单或账号。完整字段见migrations，当前范围见docs/CURRENT_BASELINE.md。

## 远端迁移记录

当前项目husrpqalpjjswpvrkxet，Management API返回的记录如下。本地同名SQL时间戳可能不同，不能据此推断未执行。

| 远端版本 | 名称 |
|---|---|
| 20261022002652 | property_inventory |
| 20261022002912 | direct_bookings |
| 20261022012130 | single_account_property |
| 20261022012849 | normalized_rooms |
| 20261022013109 | booking_room_index |
| 20261022100854 | guest_conversations |
| 20261022134911 | conversation_reply_drafts |
| 20261022141826 | booking_metrics |
| 20261023023304 | booking_stays |
| 20261023024506 | cancellation_review |
| 20261023024604 | guest_review_projection |
| 20261023093937 | reply_automation |
| 20261023094124 | reply_automation_fact_gate |
| 20261023094716 | booking_amounts |
| 20261023095944 | operation_activity |

早期properties/property_details由控制台初始化，未完整登记CLI历史。不要重跑local/staycraft-setup.sql、不要直接db push、不要删除表来修复迁移历史。新环境需要按依赖核对所有SQL、扩展、grants、RLS及存储；迁移历史对账必须比较实际schema后单独处理。当前发布使用已核对的现有项目，不声称空白项目一键重建已验收。

supabase/tests为事务回滚夹具，原验证结果见docs/DEVELOPMENT_STATUS.md；它们不替代实际两账号浏览器隔离验收。安全扫描仍有Auth泄漏密码保护未启用提醒。

## 回滚

代码可回退Git检查点；数据库不自动降级。先导出备份，保留订单与图片，用增量前向修复。营业额已只读接通当前账号已完成订单；正式模型/自动发送仍关闭。部署步骤见docs/DEPLOYMENT.md。

2026-10-23自动化增量：本地20261023093119_reply_automation对应远端20261023093937；另有reply_automation_fact_gate加数据库敏感请求硬校验。新增reply_automation_settings（默认false）、reply_automation_events（owner RLS、claim不授予读取），conversations人工接管字段与messages自动来源字段。匿名RPC仅凭客人自己的会话能力处理最新问题，回复由数据库当前时间事实构造，不接收任意文案。public包装函数为invoker，受限definer在private；SQL验证supabase/tests/reply_automation.sql始终rollback。不盲目重复旧迁移。

后续增量booking_amounts扩展同一stable invoker指标RPC的金额/均价字段；operation_activity由private受限trigger记录真实事务结果，authenticated仅SELECT+owner RLS，无写入授权，无历史回填。验证脚本booking_amounts.sql、booking_amount_cents.sql、operation_activity.sql均为虚构事务回滚。


新增迁移本地→远端映射：20261023093119→20261023093937（reply_automation）、20261023094052→20261023094124（fact_gate）、20261023094403→20261023094716（booking_amounts）、20261023095440→20261023095944（operation_activity）。当前15条远端记录；本地与远端名称/结构需一起核对，时间戳差异不表示待执行。新增设置/自动事件/操作记录均启用owner RLS，审计不能由普通客户端伪造。真实账号自动设置保持关闭。
