<template>
  <header class="topbar">
    <h1>潜伏之赤途 <small>剧情速览</small></h1>
    <select id="toc" title="选择章节"></select>
    <span class="spacer"></span>
    <button class="btn" id="stop-bgm" title="停止音乐">■ 停止音乐</button>
    <a class="btn" href="/play" target="_blank">▶ 纯文本模式</a>
    <a class="btn" href="/branch" target="_blank">剧情分支图</a>
  </header>
  <div class="crumbs" id="crumbs"></div>
  <main class="viewer" id="main"></main>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import { usePageCss, loadScript } from "../page-assets";

const css = usePageCss(["/plot/css/style.css?v=20261020b"]);
let mod = null;

onMounted(async () => {
  css.inject();
  document.body.classList.add("page-full");
  try {
    await loadScript("/plot/js/data.js");   // 设置 window.PLOT_DATA
    const url = "/plot/js/viewer.js"; mod = await import(/* @vite-ignore */ url);
    mod.run();
  } catch (e) {
    console.error(e);
  }
});
onUnmounted(() => {
  document.body.classList.remove("page-full");
  if (mod) mod.destroy();
  css.remove();
});
</script>
