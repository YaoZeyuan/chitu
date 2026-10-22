<template>
  <header class="topbar" @click="onTopbarClick">
    <h1>潜伏之赤途 <small>剧情分支图</small></h1>
    <nav id="chapter-quick" title="快捷定位章节"></nav>
    <select id="jump-toc" title="定位章节"></select>
    <button type="button" class="btn" id="toggle-key" title="只显示分叉、汇合、条件与剧终节点，线性推进压缩成直达边">只看关键抉择</button>
    <button type="button" class="btn" id="toggle-foot" title="高亮纯文本模式(/play)中走过的剧情与选择，走过的亮色、没走的灰暗">我的足迹</button>
    <a class="btn" href="/play" target="_blank" title="纯文本阅读模式：可回退、记录足迹">▶ 纯文本模式</a>
    <button type="button" class="btn" id="toggle-detail" title="切换精简/完整视图">显示全部节点</button>
    <span class="spacer"></span>
    <a class="btn" href="/plot" target="_blank">剧情速览</a>
  </header>
  <div class="branch-wrap" @click="onGraphClick">
    <div class="graph-area">
      <div class="graph-scroll" id="graph-scroll"></div>
      <div id="graph-legend">
        <span><i class="lg lg-entry"></i>入口</span>
        <span><i class="lg lg-chapter"></i>章节</span>
        <span><i class="lg lg-beat"></i>关键选择</span>
        <span><i class="lg lg-cond"></i>条件判断</span>
        <span><i class="lg lg-end"></i>剧终(不跳转下一章)</span>
        <span><i class="lg lg-green"></i>跳转其他章节</span>
        <span class="lg-note">边上文字 = 触发跳转的选项 · 无文字 = 线性剧情推进</span>
      </div>
      <div id="graph-minimap" title="微缩图 · 点击可定位"></div>
      <div class="graph-tools">
        <button class="btn" id="zin" title="放大">＋</button>
        <button class="btn" id="zout" title="缩小">－</button>
        <button class="btn" id="zreset" title="重置视图">⟲ 重置</button>
      </div>
    </div>
    <aside class="side-panel" id="panel">
      <div class="panel-empty">点击图中任意节点<br>查看详情与跳转关系<br><br>滚轮滚动 · 拖拽平移<br>＋/－ 缩放</div>
    </aside>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import { usePageCss } from "../page-assets";
import { ensureVarPopover } from "../var-popover";

const css = usePageCss(["/plot/css/style.css?v=20261020b"]);
let mod = null;

onMounted(async () => {
  css.inject();
  document.body.classList.add("page-full");
  try {
    mod = await import("../branch-main.js");
    await mod.run();
  } catch (e) {
    console.error(e);
  }
});
onUnmounted(() => {
  document.body.classList.remove("page-full");
  if (mod) mod.destroy();
  css.remove();
});

// 变量脚注: 点击 ? 弹出 Arco 气泡说明(内容为 openPanel 渲染的 data-tip)
function onGraphClick(ev) {
  const fn = ev.target && ev.target.closest && ev.target.closest(".var-fn");
  if (fn && fn.dataset.tip) {
    ev.stopPropagation();
    ensureVarPopover().show(fn, fn.dataset.tip);
  }
}
function onTopbarClick() { /* 占位: 面板在 graph 区外, 不需要处理 */ }
</script>
