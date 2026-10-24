# 开发接续速览

更新：2026-10-24。这是可覆盖的接续索引，不是历史日志或新的产品规范。随后读TODO与CURRENT_BASELINE；只按需查看其他文档。先核对git状态，以下提交/数据是检查点，不是永远不变的实时状态。

## 当前停在哪里

- 2026-10-25：Cloudflare已并行部署至https://staycraft.staycraft-yuuno.workers.dev，Vercel保留。CLI授权成功；普通演示登录、Home/Work及Analysis数据/月历已验证。AI三个开关仍0，等待新目的地Secret许可；无需重新登录授权。完整验收及关闭VPN实测未完成，见CLOUDFLARE_DEPLOYMENT.md。

- 本轮落实工作页入口和区块调整：工作页顺序为客房概览→需优先处理→客人消息（列表上方自动回复开关）→预订订单；移除独立自动化处理/重复转人工列表，历史订单入口在订单列表底部。移除工作页客人预订链接，预订端作为独立关联网页保留，新入口待确定。
- 本轮修改基点：`cfc05e7`；上线状态需以最新Git/Vercel检查为准。线上：https://staycraft-teal.vercel.app。
- Work客房概览置顶，主订单仅未入住/待处理；已入住、完成、取消进入`/app/bookings/history`。取消待审核留主列表，未知状态不误归历史。
- Work/Analysis/Explore/Mine已移除可见大标题/介绍，保留顶栏小标签/语言按钮及无障碍h1。Home与详情/历史标题保留。
- 前两个核心功能主流程已实现；不能说所有场景均已验收。Explore推广、外部来源和满意度未完成。

## 下一步及停止边界

1. 优先补TODO A2b/A3b：真实浏览器双账号切换、数据隔离、完整现场按钮流程；先检查已有证据，避免重复写入云端验收订单。
2. 账号隔离要验证退出/切换后的列表、详情和刷新，不把SQL回滚测试或HTTP成功当浏览器完成。无法取得第二账号正常会话时如实记录缺口，不绕过登录、不重置账号密码。
3. 外部分析来源A4仍需选定可靠来源；Explore第三功能和客人反馈暂缓。客人端返回经营端入口尚未做，只是候选需求。

## 验证与上线证据

- 本轮工作页归并：构建与自动回复、历史订单两组隔离回归通过，390px截图已查看；未重跑完整29项。

- `a8135b4`：`npm run release:check`构建及29项隔离检查通过。
- `cfc05e7`：`npm run check`及`qa-ui-parity.cjs`、`qa-booking-details.cjs`、`qa-work-booking-history.cjs`通过；中英320/390/658/1280，390px截图已查看。本次未重跑整套29项。
- cfc05e7生产部署`dpl_EhNvzR7jaCLNUQSonwaCW5EcpLdj` Ready，唯一URL`https://staycraft-8atxdnoby-yuuno.vercel.app`；主域名四页正常Auth HTML均200，隐藏标题class存在、intro不存在、语言按钮保留。最后布局截图是隔离环境，不是线上浏览器截图。
- 此前生产已实测正常登录、订单详情、双语跨页、收入日历/日明细；正式接口已验证预订→清洁→入住→退房→完成收入、幂等和取消释放。完整双账号浏览器验收仍未完成。
- 75项后端测试、数据库回滚套件、依赖审计为此前证据；历史细节按需查DEVELOPMENT_STATUS，不用每轮重读。

## 环境与数据

- GitHub：`Flesymevoli/staycraft`，main；Vercel：`yuuno/staycraft`，Root Directory=`frontend`，Next/Node24。main推送会自动部署，单纯整理文档不需要主动部署。
- 云端演示账号是独立正常Auth账号，登录信息及初始化说明见PERSISTENT_DEMO；不依赖3106。截至上线验收：6客房、16订单、10完成、营业额5680元；最初14单/5160是导入基线，不能当当前总数。日期推移会改变未来预订指标。
- 本机3106仅隔离内存样本，重启重置且模型关闭；3101正式本机进程可能仍用旧构建，先核对再使用。
- 不重跑种子/初始化，不删除验收订单或审计，不覆盖原个人账号。代码回退不等于数据回退。
- 密钥仅在忽略环境文件或Vercel服务端Secret；不得输出、写入文档、Git或前端。用户已授权指定DeepSeek数据调用、线上分析/可开关自动回复和部署，不重复索要同范围授权。

## 常用接续方式

- Git：`git -c safe.directory='C:/个人/学习/ENT207/Homestay AI assistant' status --short`。保留未跟踪operator-desktop.css、根scripts/、tmp/，禁止自动全量加入。
- 前端检查在frontend执行；修改前读frontend/AGENTS.md及相关已安装Next文档。隔离QA使用3104，顺序运行；三项模型开关显式设0，避免继承正式.env.local产生付费调用。
- 浏览器用CUA。Edge连接曾不稳定，IAB外网页也可能超时；旧tab跨部署失效时刷新后重试，不能用HTTP验证冒充视觉验收。
- CLI已登录Vercel；若需要发布状态，先找现有CLI/认证，不重新申请设备登录或读取输出密钥。
- 回滚：标题模块前置a8135b4，历史订单模块前置cfc2ad0；详见ROLLBACK。保留云端数据与环境配置。

## 文档维护分工

SESSION_HANDOFF只保留当前接续信息；TODO维护完成/未完成；CURRENT_BASELINE维护规则；UI_PARITY_AUDIT维护视觉约束；DEVELOPMENT_STATUS追加真实验证。发现旧状态冲突时修正文案，不以追加相反段落代替整理。README按用户要求仅简短项目背景，不塞入以上开发细节。
