# Staycraft

民宿经营工作台。目前已接通基本资料、房型/客房图片、直接预订、订单和日期日程。正式AI咨询、入住退房、逾期取消审核动作、经营分析和市场探索尚未完成。

## 运行与部署

使用Node.js 24，在frontend目录运行npm ci、npm run dev。正式入口/app需要Supabase公开URL/key和已关联民宿账号，变量见frontend/.env.example。npm run check执行lint与构建，npm start运行构建后服务。

根网址进入正式工作台，未登录转登录页。Vercel项目根目录为frontend，配置与限制见[部署说明](docs/DEPLOYMENT.md)。只完成部署准备，尚未公开发布。

## 正式数据与示例

/app使用授权云端数据；本机/native-*为独立虚构示例。课程交付件在deliverables，历史原型在archive，不与正式用户资料混用。经营演示优先，客人端主要作为数据来源：工作台生成的带property参数链接才读取云端；普通/guest仍是独立原型。

backend是FastAPI/SQLite示例和AI试验服务，不是本轮云端闭环的部署依赖。密钥只保存在私有环境中；正式部署关闭本机演示接口。

[PRD](docs/PRD.md)、[设计](docs/DESIGN.md)、[架构](docs/ARCHITECTURE.md)、[开发进展](docs/DEVELOPMENT_STATUS.md)、[回滚方案](docs/ROLLBACK.md)。逐模块测试并保存Git回滚点，不随代码回滚删除数据。
