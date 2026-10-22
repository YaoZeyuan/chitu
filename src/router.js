import { createRouter, createWebHistory } from "vue-router";

// SPA 统一入口: /game /plot /branch /play 均为前端路由, 各视图懒加载
// (原 plot/branch/play/game 独立 html 页面已收束, 旧地址经 redirect 兼容)
const routes = [
  { path: "/", name: "home", component: () => import("./views/HomeView.vue") },
  { path: "/game", name: "game", component: () => import("./views/GameView.vue") },
  { path: "/plot", name: "plot", component: () => import("./views/PlotView.vue") },
  { path: "/branch", name: "branch", component: () => import("./views/BranchView.vue") },
  { path: "/play", name: "play", component: () => import("./views/PlayView.vue") },
  { path: "/game.html", redirect: "/game" },
  { path: "/plot/branch", redirect: "/branch" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach(() => {
  window.scrollTo(0, 0);
});

export default router;
