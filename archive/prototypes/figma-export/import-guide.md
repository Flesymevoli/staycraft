# figma-export 说明（导出产物，非源文件）

本目录是把《手机原型_柔白新版_v2.html》转成 Figma 用图的过程产物与工具。
生成时间：2026-09-23。未修改任何源文件。

## 内容

- 01-home-full.png ～ 05-profile-full.png：五页整页长图（宽 390px），
  依次为 Home / Work / Analysis / Explore / Mine(My Homestay)。
  每张都是页面完整滚动高度的无缝拼接，底部导航只在最底部出现一次。
- capture-v2.cjs：用 Playwright 渲染新版单文件并分块截图的脚本。
- stitch.py：把分块截图拼成整页长图（依赖 Pillow）。
- manifest.json：每页高度与分块偏移记录。
- cua-run.cjs：Computer Use 驱动 Figma 桌面端的控制脚本（list/text/shot/click/key/type）。

## 手动导入 Figma（兜底步骤）

1. 打开 Figma 桌面端，新建 Design file（或 Ctrl+N）。
2. 把本目录 5 张 `*-full.png` 一起拖进画布。
3. 全选后右键 → Tidy up（或手动排成一行），可自行加页面标题。

## 重新生成

node "figma-export/capture-v2.cjs" 之后运行
python "figma-export/stitch.py"（运行时自带的 node / python 路径见项目历史记录）。
