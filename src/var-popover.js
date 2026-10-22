// 变量脚注弹层: 单实例 Arco Popover, 由 vanilla 代码命令式调用
// show(anchorEl, html) 在 anchor 附近弹出富文本说明; 点击外部自动关闭
import { createApp, h, ref } from "vue";
import { Popover } from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";

let api = null;

export function ensureVarPopover() {
  if (api) return api;
  const host = document.createElement("div");
  host.className = "var-popover-host";
  document.body.appendChild(host);

  const visible = ref(false);
  const content = ref("");

  const app = createApp({
    setup() {
      return () =>
        h(
          Popover,
          {
            trigger: "click",
            position: "top",
            "popup-visible": visible.value,
            "onPopup-visible-change": (v) => { visible.value = v; },
            "content-class": "var-pop-body",
            "arrow-class": "var-pop-arrow",
          },
          {
            default: () => h("span", { id: "var-fn-anchor", style: "display:inline-block;width:1px;height:1px;" }),
            content: () => h("div", { class: "var-pop-inner", innerHTML: content.value }),
          }
        );
    },
  });
  app.mount(host);

  api = {
    show(el, html) {
      const anchorEl = document.getElementById("var-fn-anchor");
      if (!anchorEl) return;
      const r = el.getBoundingClientRect();
      Object.assign(anchorEl.style, {
        position: "fixed",
        left: Math.round(r.left + r.width / 2) + "px",
        top: Math.round(r.top) + "px",
        width: "1px",
        height: "1px",
        zIndex: -1,
      });
      content.value = html;
      visible.value = true;
    },
  };
  return api;
}
