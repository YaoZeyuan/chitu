# 潜伏之赤途 · 网页版

《潜伏之赤途》是橙光游戏平台（66rpg）上的经典文字冒险游戏（游戏 ID 2992）。本项目将其改造为**可在线游玩、可读剧本、可看分支图的静态网页项目**，并把游戏剧本完整解析为可检索的 JSON / Markdown。

## 在线访问

**https://chitu.yaozeyuan.online**

| 页面 | 地址 | 说明 |
|---|---|---|
| 游戏本体 | `/` `/game` | 原版橙光播放器，资源全部本地化，可完整游玩 |
| 剧情速览 | `/plot` | 剧本阅读版：按章节分页、选项可展开、支持章节导航与历史回退 |
| 剧情分支图 | `/plot/branch` | 全剧情流程图：序章~第六章每章一棵树，剧终红色、条件判断菱形、跨章跳转绿色 |

## 本地开发

项目基于 **Vite + pnpm + Vue 3**（多页应用 MPA），静态资源位于 `public/`：

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发服务器 http://127.0.0.1:3070
pnpm build        # 构建输出到 dist/
pnpm preview      # 本地预览构建产物
```

> `public/start-server.bat` 是早期纯静态方案的启动脚本，现已由 Vite 取代，仅作留存。

## 项目结构

```
├── index.html / game.html      # MPA 构建入口（导航页 / 游戏页）
├── plot/                       # 剧情速览 & 分支图页面模板
├── public/                     # 静态资源根（游戏本体 + 剧本数据 + plot JS）
│   ├── data/game.json          # 播放器实际加载的结构化剧本
│   ├── graphics/ audio/ font/  # 本地化的游戏资源（381 个，无外部依赖）
│   └── plot/js/                # data.js(速览+图共用) / branches.json(分支图) / viewer.js
├── src/                        # Vue 入口与路由、branch-main.js(G6 分支图)
├── glm-5.3-flash/game.json     # rebuild_game_json.py 的输出(语义化事件)
├── task_plan/                  # 数据流水线脚本与任务记录
└── resource/                   # 可读版剧本、原始 game_raw.json、资源 URL 映射
```

## 剧本数据流水线

从橙光二进制到网页展示，数据经三层加工（脚本均幂等可重跑）：

1. **`game.bin` → `resource/game_raw.json`**：给 `main.min.js` 打补丁（`resource/_patch_main_js.py`），用橙光官方解析逻辑无损导出（66 个剧情、8558 条事件）。
2. **`task_plan/任务2-.../rebuild_game_json.py` → `glm-5.3-flash/game.json`**：按语义分类（对话带说话人/旁白/选项组/跳转/条件/图片/音频），选项组以层级缩进结构表达。
3. **`task_plan/任务2-.../build_data.py` → `public/plot/js/data.js`**：生成网页视图与分支图共用数据，包括：
   - 深嵌套拆分：嵌套超过 3 层的选项块拆为独立节点（id 1000+），不动点迭代保证完全展开；
   - 内联分支节点：无跳转目标的选项块（死局结局 / 汇回主线内容）上图（id 2000+），纯信息展示块自动过滤；
   - 条件菱形节点：条件跳转（好感度判断等）以独立菱形节点呈现（id 3000+）。
4. **`task_plan/build_branches_json.py` → `public/plot/js/branches.json`**：抽取分支图数据供前端 G6 渲染。

## 分支图设计要点

- **章节树**：序章~第六章每章一棵树，切换章节自动定位到本章起始节点；
- **配色语义**：入口红底白字、章节标题蓝边、剧终（含顶层直接结局且不跨章跳转）红色、条件判断菱形浅紫、跨章跳转绿色边；
- **交互**：节点点击弹出详情（来源/去向列表、进入速览锚点直达选项位置）、微缩图、缩放工具、章节快捷按钮与定位下拉。

## 部署

托管于 Vercel（`vercel.json`：输出 `dist/`、cleanUrls、`/plot` 重写），推送 master 后自动部署；全站接入 `@vercel/analytics` 统计。早期 GitHub Pages 方案见 `DEPLOY.md`。

## 资源来源与致谢

- 游戏原始资源仍在橙光 CDN 上（`dlcdn1.cgyouxi.com/shareres/{md5前2位}/{md5}`），本地资源与线上同源，映射关系见 `resource/原始资源URL映射.csv`。
- 本地 Electron 版打包者为社区玩家（"天空的梦" 修复 bug 的流传包），本项目的网页版即从该包解包改造而来。
- 游戏版权归原作者及橙光平台所有，本项目仅作学习交流与存档用途。

## 项目过程

从网页版加载机制逆向到本地化改造，再到剧本可视化，全程与 AI 协作完成（[对话记录](./对话记录-潜伏之赤途-2026-10-06.md)、[项目手记](./项目手记.md)）。
