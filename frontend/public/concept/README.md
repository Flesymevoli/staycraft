# Gemini 最终设计基准

当前可运行的 UI 基准为 [index.html](index.html) 与 [demo.js](demo.js)，包含最终确认的柔紫配色、Noto Sans SC 第 3 款和 Outfit 字体。文案、演示数据、组件结构和交互应直接查阅并运行这些源码。

在 `frontend/` 启动 Web 开发服务后访问 `/concept/index.html`；线上静态演示入口为 [staycraft.online/try](https://staycraft.online/try)。静态 demo 不连接 API、认证或业务数据。

原始来源文件名为 `staycraft_fonts.html`，SHA-256：`914a7094bc34eb5949b68f67fa7dc8e9cbee642c254af2c088d4e819113ed140`。协作时以本目录的可运行源码为入口，不依赖个人临时目录。

桌面端对应设计变量见 [desktop-design-tokens.css](../../src/components/desktop-design-tokens.css)。后确认的品牌资源在 [brand/](../brand/)：`StayCraft-sidebar-HD.png`、`StayCraft-main-HD.png`，桌面原生图标在 [desktop/assets/](../../desktop/assets/)。保留现有字体及许可证。

原稿运行效果与后续用户确认的调整共同用于验收；设计变量或静态截图不能替代实际交互检查。
