import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // 游戏本体等静态资源原样放 public/，构建时整体拷贝到 dist/
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // 多页入口：首页(Vue SPA) + 游戏页(原静态逻辑，仅注入 analytics)
      input: {
        main: "index.html",
        game: "game.html",
      },
    },
  },
  server: {
    port: 5173,
  },
});
