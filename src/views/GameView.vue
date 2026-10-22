<template>
  <iframe v-if="show" class="game-frame" src="/engine.html" title="潜伏之赤途"></iframe>
</template>

<script setup>
// /game 路由: 内嵌原版橙光播放器页面(静态资源 /game/index.html, 仅进入路由时加载)
// 引擎依赖「解析期顺序执行 + jQuery ready 在全部脚本后触发」, 与 SPA 动态注入天然冲突,
// 故以 iframe 承载原页面——单入口与按需加载达成, 引擎零改动。
import { onMounted, onUnmounted, ref } from "vue";

const show = ref(false);
let added = [];
onMounted(() => {
  document.body.classList.add("page-full", "game-route");
  ["/css/public.css"].forEach((href) => {
    if (document.querySelector('link[data-page-css="' + href + '"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.pageCss = href;
    document.head.appendChild(link);
    added.push(link);
  });
  show.value = true;
});
onUnmounted(() => {
  added.forEach((l) => l.remove());
  added = [];
  document.body.classList.remove("page-full", "game-route");
});
</script>

<style scoped>
.game-frame {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #000;
  z-index: 20;
}
</style>
