// 各路由视图按需注入/卸载自己的 CSS <link>, 避免多套样式互相污染
export function usePageCss(hrefs) {
  let added = [];
  const inject = () => {
    hrefs.forEach((href) => {
      if (document.querySelector(`link[data-page-css="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.pageCss = href;
      document.head.appendChild(link);
      added.push(link);
    });
  };
  const remove = () => {
    added.forEach((l) => l.remove());
    added = [];
  };
  return { inject, remove };
}

// 动态加载经典脚本(去重)
export function loadScript(src) {
  window.__loadedScripts = window.__loadedScripts || {};
  if (window.__loadedScripts[src]) return window.__loadedScripts[src];
  const p = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("脚本加载失败: " + src));
    document.head.appendChild(s);
  });
  window.__loadedScripts[src] = p;
  return p;
}
