import { createApp } from "vue";
import { inject } from "@vercel/analytics";
import App from "./App.vue";
import router from "./router";
import "./style.css";

// 注入 Vercel Analytics（在 Vercel 生产环境自动上报，本地开发自动跳过）
// 配合 vue-router 使用时，SPA 内的路由切换会自动作为 page view 上报
inject();

createApp(App).use(router).mount("#app");
