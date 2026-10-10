import { createRouter, createWebHistory } from "vue-router";
import Home from "./App.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    // 游戏页为独立的静态构建入口 /game.html，这里仅做跳转兼容
    { path: "/game", redirect: "/game.html" },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

export default router;
