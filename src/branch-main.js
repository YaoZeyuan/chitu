import { inject } from "@vercel/analytics";
import G6 from "@antv/g6";

inject();
window.__branchVer = 3; // 调试：确认浏览器加载的代码版本

/* ---------------- 数据 ---------------- */
async function load() {
  const res = await fetch("/plot/js/branches.json");
  if (!res.ok) throw new Error("branches.json 加载失败: " + res.status);
  return res.json();
}

load().then(render).catch(function (err) {
  console.error(err);
  document.getElementById("graph-scroll").innerHTML =
    '<p style="padding:24px;color:#a4322a;white-space:pre-wrap">分支图加载失败：' +
    err.message + "\n" + String(err.stack || "").split("\n").slice(0, 5).join("\n") + "</p>";
});

/* ---------------- 渲染 ---------------- */
function render(data) {
  var entry = data.entry;

  var nodeById = {};
  data.nodes.forEach(function (n) { nodeById[n.id] = n; });

  // 过滤指向已删节点的边（防御）
  var edges = data.edges.filter(function (e) {
    return nodeById[e.f] && nodeById[e.t];
  });

  var COLORS = {
    entry: { stroke: "#a4322a", fill: "#a4322a", label: "#ffffff" },
    chapter: { stroke: "#2b5d8a", fill: "#e8f0f7", label: "#1d3d59" },
    ending: { stroke: "#7a5a12", fill: "#f5ecd4", label: "#5a4310" },
    normal: { stroke: "#c9c0ab", fill: "#fffdf8", label: "#2c2a26" },
  };

  // 样式直接写入 data model，渲染时就地生效（避免 render 后 updateItem 的时序问题）
  var nodes = data.nodes.map(function (n) {
    var type = "normal";
    if (n.id === entry) type = "entry";
    else if (n.endings > 0) type = "ending";
    else if (n.chapter) type = "chapter";
    var c = COLORS[type];
    return {
      id: String(n.id),
      nodeType: type,
      raw: n,
      label: n.name,
      style: {
        stroke: c.stroke,
        fill: c.fill,
        lineWidth: type === "entry" ? 2 : 1,
        radius: 9,
        shadowBlur: 4,
        shadowColor: "rgba(60,50,30,0.12)",
      },
      labelCfg: {
        style: {
          fill: c.label,
          fontSize: 13,
          fontFamily: '"Noto Serif SC","Songti SC","SimSun",serif',
        },
      },
    };
  });

  var graphEdges = edges.map(function (e) {
    var m = { source: String(e.f), target: String(e.t) };
    if (e.l) {
      m.label = e.l.length > 14 ? e.l.slice(0, 13) + "…" : e.l;
    }
    return m;
  });

  var graph = new G6.Graph({
    container: "graph-scroll",
    renderer: "canvas",
    // 注意：不要开 fitView: true —— 它会在布局完成后异步再缩放一次，
    // 覆盖掉下面手动设置的初始视图
    animate: false,
    plugins: [
      // 微缩图：右下角，方便快速定位
      new G6.Minimap({
        container: "graph-minimap",
        type: "delegate",
        size: [170, 110],
        delegateStyle: { fill: "#a4322a", stroke: "#a4322a" },
        viewportClassName: "graph-minimap-viewport",
      }),
    ],
    modes: {
      default: ["drag-canvas", "zoom-canvas", "drag-node"],
    },
    layout: {
      type: "dagre",
      rankdir: "TB",
      nodesep: 27,
      ranksep: 105,
      align: "UL",
    },
    defaultNode: {
      type: "rect",
      size: [225, 57],
      labelCfg: {
        style: {
          fontSize: 20,
          fontFamily: '"Noto Serif SC","Songti SC","SimSun",serif',
        },
      },
    },
    nodeStateStyles: {
      highlight: { stroke: "#a4322a", lineWidth: 2, shadowBlur: 10 },
      dim: { opacity: 0.25 },
    },
    defaultEdge: {
      type: "polyline",
      style: {
        // 深蓝灰，与米色背景拉开对比
        stroke: "#4a6fa5",
        lineWidth: 2,
        radius: 16,
        // 注意：G6.Arrow.triangle 是函数，须调用返回路径串；直接传函数会导致 Path 构造崩溃
        endArrow: { path: "M 0,0 L 12,6 L 0,12 Z", fill: "#4a6fa5" },
      },
      labelCfg: {
        autoRotate: true,
        style: {
          fill: "#8a5a11",
          fontSize: 14,
          background: { fill: "#fffdf8", padding: [3, 6, 3, 6], radius: 4 },
        },
      },
    },
    edgeStateStyles: {
      highlight: { stroke: "#a4322a", lineWidth: 2 },
      dim: { opacity: 0.12 },
    },
  });

  graph.data({ nodes: nodes, edges: graphEdges });

  // 布局完成后设置初始视图（render 时布局尚未算完，不能同步操作）
  function initialView() {
    graph.off("afterlayout", initialView);
    graph.fitView(40);
    if (graph.getZoom() < 0.72) graph.zoomTo(0.72);
    var it = graph.findById(String(entry));
    if (it) graph.focusItem(it, false);
  }
  graph.on("afterlayout", initialView);

  graph.render();

  /* ---------------- 交互：点击节点 ---------------- */
  var panel = document.getElementById("panel");
  var selectedId = null;

  function clearSelect() {
    if (selectedId == null) return;
    selectedId = null;
    graph.findAll("node", function () { return true; }).forEach(function (it) {
      graph.clearItemStates(it);
    });
    graph.findAll("edge", function () { return true; }).forEach(function (it) {
      graph.clearItemStates(it);
    });
    panel.innerHTML = '<div class="panel-empty">点击图中任意章节节点<br>查看详情与跳转关系</div>';
  }

  function highlight(id) {
    var linkedIds = {};
    edges.forEach(function (e) {
      if (e.f === id) linkedIds[e.t] = true;
      if (e.t === id) linkedIds[e.f] = true;
    });
    graph.findAll("node", function (it) {
      var nid = Number(it.getID());
      var rel = nid === id || linkedIds[nid];
      graph.setItemState(it, rel ? "highlight" : "dim", true);
      graph.setItemState(it, rel ? "dim" : "highlight", false);
      return false;
    });
    graph.findAll("edge", function (it) {
      var m = it.get("model");
      var rel = m.source === String(id) || m.target === String(id);
      graph.setItemState(it, rel ? "highlight" : "dim", true);
      graph.setItemState(it, rel ? "dim" : "highlight", false);
      return false;
    });
  }

  function openPanel(id) {
    selectedId = id;
    var raw = nodeById[id];
    if (!raw) return;
    highlight(id);

    var outEdges = edges.filter(function (e) { return e.f === id; });
    var inEdges = edges.filter(function (e) { return e.t === id; });
    var h = "";
    h += '<div class="panel-head"><strong>' + esc(raw.name) + "</strong>";
    h += '<span class="tags">';
    if (raw.id === entry) h += '<em class="tag tag-entry">入口</em>';
    if (raw.chapter) h += '<em class="tag tag-chapter">章节</em>';
    if (raw.endings > 0) h += '<em class="tag tag-ending">结局</em>';
    h += "</span>";
    h += '<button class="btn" id="close-panel">关闭</button></div>';
    h += '<div class="panel-body"><div class="panel-info">';
    h += '<p class="meta">事件 ' + raw.events + " · 选项 " + raw.choices + " · 结局标记 " + raw.endings + "</p>";
    if (raw.summary) h += '<p class="summary">' + esc(raw.summary) + "…</p>";
    h += '<p><a class="btn" href="/plot?s=' + id + '">进入速览 →</a></p>';
    h += "</div>"; // /.panel-info

    // 来源（左）与去向（右）横向排列
    h += '<div class="panel-lists">';
    h += '<div class="list-col">';
    h += "<h4>来源 (" + inEdges.length + ")</h4><ul>";
    inEdges.forEach(function (e) {
      h += '<li><a href="#" data-goto="' + e.f + '">' + esc(nodeById[e.f].name) + "</a></li>";
    });
    if (!inEdges.length) h += '<li class="none">无（入口节点）</li>';
    h += "</ul></div>";
    h += '<div class="list-col">';
    h += "<h4>去向 (" + outEdges.length + ")</h4><ul>";
    outEdges.forEach(function (e) {
      h += '<li><a href="#" data-goto="' + e.t + '">' + esc(nodeById[e.t].name) + "</a>";
      if (e.l) h += ' <span class="choice">【' + esc(e.l) + "】</span>";
      h += "</li>";
    });
    if (!outEdges.length) h += '<li class="none">无（终局节点）</li>';
    h += "</ul></div>";
    h += "</div>"; // /.panel-lists
    h += "</div>"; // /.panel-body
    panel.innerHTML = h;
    panel.scrollTop = 0;

    document.getElementById("close-panel").addEventListener("click", clearSelect);
    panel.querySelectorAll("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        // 居中滚动到目标节点并高亮, 方便在全局图上定位
        focusNode(Number(a.dataset.goto));
      });
    });
  }

  graph.on("node:click", function (evt) {
    openPanel(Number(evt.item.getID()));
  });

  // 点击画布空白处取消
  graph.on("canvas:click", clearSelect);

  function focusNode(id) {
    var item = graph.findById(String(id));
    if (!item) return;
    graph.clearItemStates(item);
    openPanel(id);
    graph.focusItem(item, true, { easing: "easeCubic", duration: 400 });
  }

  /* ---------------- 章节快捷按钮 ---------------- */
  var CHAPTER_NAMES = ["序章", "第一章", "第二章", "第三章", "第四章", "第五章", "第六章"];
  var quickBox = document.getElementById("chapter-quick");
  CHAPTER_NAMES.forEach(function (name) {
    var n = data.nodes.filter(function (x) { return x.name === name; })[0];
    if (!n) return;
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = name;
    b.title = "定位到「" + name + "」并居中";
    b.addEventListener("click", function () { focusNode(n.id); });
    quickBox.appendChild(b);
  });

  /* ---------------- 章节定位下拉 ---------------- */
  var toc = document.getElementById("jump-toc");
  var list = data.nodes.filter(function (n) { return n.chapter || n.endings > 0; });
  list.forEach(function (n) {
    var opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = (n.endings > 0 && !n.chapter ? "▸ " : "") + n.name;
    toc.appendChild(opt);
  });
  toc.addEventListener("change", function () {
    focusNode(Number(toc.value));
  });

  document.getElementById("zreset").addEventListener("click", function () {
    graph.fitView(40);
  });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
