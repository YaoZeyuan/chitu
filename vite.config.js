import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 已收束为单入口 SPA: /game /plot /branch /play 都是 vue-router 前端路由,
// dev/preview 的 history 回退由 Vite 内置 SPA fallback 处理, 不再需要自定义 rewrite 中间件。

export default defineConfig({
  plugins: [vue()],
  // 游戏本体等静态资源原样放 public/，构建时整体拷贝到 dist/
  publicDir: "public",
  build: {
    outDir: "dist",
    // 不清空重建: 本机沙箱的回收站工具清大目录经常 ETIMEDOUT, 且预览服务常驻 dist。
    // 构建产物文件名稳定, 直接覆盖即可; 线上由 Vercel 全新构建, 不受影响。
    emptyOutDir: false,
    // @antv/g-canvas、g-base 等是 ESM+CJS 混合模块, 内含裸 require("../package.json")。
    // 默认只转换纯 CJS 模块, 混合模块的 require 会漏到产物里, 线上报 require is not defined
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // 单入口: 各页面逻辑经动态 import 拆为按需加载的 chunk
      input: {
        main: "index.html",
      },
    },
  },
  server: {
    // 5173 落在本机 Hyper-V 保留端口段(5129-5228)内，改用 3070
    port: 3070,
    host: "127.0.0.1",
  },
  preview: {
    port: 8321,
    host: "127.0.0.1",
  },
});
