import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 模拟 vercel.json 中的 rewrite: /plot -> /plot/index.html, /play -> /play/index.html, /branch -> /branch/index.html
// （Vite dev/preview 不读 vercel.json，需要自己补）
function plotIndexRewrite() {
  function handler(req, res, next) {
    for (const p of ["/plot", "/play", "/branch"]) {
      if (req.url === p || req.url?.startsWith(p + "?")) {
        req.url = req.url.replace(p, p + "/index.html");
        break;
      }
    }
    next();
  }
  return {
    name: "plot-index-rewrite",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [vue(), plotIndexRewrite()],
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
      // 多页入口：首页(Vue SPA) + 游戏页 + 剧情两页(原静态逻辑，仅注入 analytics)
      input: {
        main: "index.html",
        game: "game.html",
        "plot/index": "plot/index.html",
        "plot/branch": "plot/branch.html",   // 旧地址跳转壳 → /branch(保留以兼容收藏/外链)
        "branch/index": "branch/index.html",
        "play/index": "play/index.html",
      },
    },
  },
  server: {
    // 5173 落在本机 Hyper-V 保留端口段(5129-5228)内，改用 3070
    port: 3070,
    host: "127.0.0.1",
  },
});
