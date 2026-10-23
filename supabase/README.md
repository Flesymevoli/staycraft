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

早期properties/property_details由控制台初始化，未完整登记CLI历史。不要重跑local/staycraft-setup.sql、不要直接db push、不要删除表来修复迁移历史。新环境需要按依赖核对所有SQL、扩展、grants、RLS及存储；迁移历史对账必须比较实际schema后单独处理。当前发布使用已核对的现有项目，不声称空白项目一键重建已验收。

supabase/tests为事务回滚夹具，原验证结果见docs/DEVELOPMENT_STATUS.md；它们不替代实际两账号浏览器隔离验收。安全扫描仍有Auth泄漏密码保护未启用提醒。

## 回滚

代码可回退Git检查点；数据库不自动降级。先导出备份，保留订单与图片，用增量前向修复。营业额仍未连接正式订单，不启用真实模型调用。部署步骤见docs/DEPLOYMENT.md。
