/* 潜伏之赤途 · 剧情分支图  branch.js */
(function () {
  "use strict";
  var D = window.PLOT_DATA;
  var utility = {};
  D.utility.forEach(function (u) { utility[u] = true; });

  /* ---------------- 图数据 ---------------- */
  var nodes = {};            // id -> {id,name,endings,choices,n}
  D.graph.nodes.forEach(function (n) { nodes[n.id] = n; });
  var edges = D.graph.edges.filter(function (e) {
    return nodes[e.f] && nodes[e.t];   // 去掉指向工具剧情的边
  });

  var adjOut = {}, adjIn = {};
  edges.forEach(function (e) {
    (adjOut[e.f] = adjOut[e.f] || []).push(e);
    (adjIn[e.t] = adjIn[e.t] || []).push(e);
  });

  /* 层次：从入口出发的最长路径（忽略回边） */
  var layer = {};
  var ENTRY = D.entry;
  if (nodes[ENTRY]) layer[ENTRY] = 0;
  (function propagate() {
    var onstack = {}, guard = 0;
    function dfs(n) {
      if (onstack[n] || guard++ > 50000) return;
      onstack[n] = true;
      (adjOut[n] || []).forEach(function (e) {
        var m = e.t;
        if (onstack[m]) return;                    // 回边
        if (layer[m] == null || layer[m] < layer[n] + 1) {
          layer[m] = layer[n] + 1;
          dfs(m);
        }
      });
      onstack[n] = false;
    }
    dfs(ENTRY);
    // 未达节点：按入边最大层 +1，逐轮放置
    for (var round = 0; round < 5; round++) {
      var changed = false;
      Object.keys(nodes).forEach(function (id) {
        id = +id;
        if (layer[id] != null) return;
        var mx = null;
        (adjIn[id] || []).forEach(function (e) {
          if (layer[e.f] != null && (mx == null || layer[e.f] > mx)) mx = layer[e.f];
        });
        if (mx != null) { layer[id] = mx + 1; changed = true; }
      });
      Object.keys(nodes).forEach(function (id) {
        id = +id;
        if (layer[id] == null) { layer[id] = 0; changed = true; }
      });
      if (!changed) return;
    }
  })();

  /* ---------------- 布局 ---------------- */
  var NODE_H = 38, V_GAP = 46, H_GAP = 18, PAD = 40;
  var nodeW = {};
  function widthOf(n) {
    return Math.min(200, Math.max(96, n.name.length * 15 + 44));
  }
  Object.keys(nodes).forEach(function (id) { nodeW[id] = widthOf(nodes[id]); });

  var byLayer = {};
  Object.keys(nodes).map(Number).forEach(function (id) {
    (byLayer[layer[id]] = byLayer[layer[id]] || []).push(id);
  });

  // 层内排序：按父节点平均序号(两轮 barycenter)
  function barycenterPass() {
    Object.keys(byLayer).map(Number).sort(function (a, b) { return a - b; }).forEach(function (L) {
      byLayer[L].sort(function (a, b) {
        var ba = bary(adjIn[a]), bb = bary(adjIn[b]);
        return (ba == null ? 1e9 : ba) - (bb == null ? 1e9 : bb) || a - b;
      });
    });
  }
  function bary(list) {
    if (!list || !list.length) return null;
    var s = 0, c = 0;
    list.forEach(function (e) {
      var L = byLayer[layer[e.f]];
      if (L) { var i = L.indexOf(e.f); if (i >= 0) { s += i; c++; } }
    });
    return c ? s / c : null;
  }
  barycenterPass(); barycenterPass();

  var pos = {};
  var maxCols = 0;
  Object.keys(byLayer).map(Number).forEach(function (L) {
    var ids = byLayer[L];
    maxCols = Math.max(maxCols, ids.length);
    var total = ids.reduce(function (s, id) { return s + nodeW[id] + H_GAP; }, -H_GAP);
    var x = PAD + Math.max(0, (minWidth() - PAD * 2 - total) / 2);
    ids.forEach(function (id) {
      pos[id] = { x: x, y: PAD + L * (NODE_H + V_GAP) };
      x += nodeW[id] + H_GAP;
    });
  });
  function minWidth() {
    var m = 0;
    Object.keys(byLayer).forEach(function (L) {
      var w = byLayer[L].reduce(function (s, id) { return s + nodeW[id] + H_GAP; }, -H_GAP);
      m = Math.max(m, w + PAD * 2);
    });
    return Math.max(m, 900);
  }
  var W = Math.max(minWidth(), maxCols * 150 + PAD * 2);
  var maxLayer = Math.max.apply(null, Object.keys(byLayer).map(Number));
  var H = PAD * 2 + (maxLayer + 1) * (NODE_H + V_GAP);

  /* ---------------- SVG 渲染 ---------------- */
  var svgNS = "http://www.w3.org/2000/svg";
  var scroll = document.getElementById("graph-scroll");
  var svg = document.createElementNS(svgNS, "svg");
  var zoom = 1;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);

  function mk(tag, attrs) {
    var e = document.createElementNS(svgNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // 箭头
  var defs = mk("defs", {});
  var marker = mk("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  marker.appendChild(mk("path", { d: "M0,0 L10,5 L0,10 z", fill: "#a89f8a" }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  var gEdges = mk("g", {}), gNodes = mk("g", {});
  svg.appendChild(gEdges); svg.appendChild(gNodes);

  var edgeEls = {}, nodeEls = {};

  edges.forEach(function (e, idx) {
    var a = pos[e.f], b = pos[e.t];
    var xa = a.x + nodeW[e.f], ya = a.y + NODE_H / 2;
    var xb = b.x, yb = b.y + NODE_H / 2;
    var d;
    if (e.f === e.t) { // 自环
      d = "M" + (xa) + "," + (ya - 10) + " C" + (xa + 46) + "," + (ya - 50) + " " + (xa + 46) + "," + (ya + 46) + " " + (xa) + "," + (ya + 12);
    } else if (Math.abs(yb - ya) < 2 && xb < xa) { // 同层回边：从上方绕
      d = "M" + xa + "," + ya + " C" + (xa + 60) + "," + (ya - 70) + " " + (xb - 60) + "," + (yb - 70) + " " + xb + "," + yb;
    } else {
      var mx = (xa + xb) / 2;
      d = "M" + xa + "," + ya + " C" + mx + "," + ya + " " + mx + "," + yb + " " + xb + "," + yb;
    }
    var p = mk("path", { d: d, class: "gedge" + (e.l ? " choice" : ""), "marker-end": "url(#arrow)" });
    var t = D.stories[e.f] && D.stories[e.t] ? D.stories[e.f].name + " → " + D.stories[e.t].name : "";
    if (e.l) t += "\n选项：" + e.l;
    if (e.i) t += "\n(锚点 " + e.i + ")";
    p.appendChild(mk("title", {})).textContent = t;
    gEdges.appendChild(p);
    edgeEls[idx] = p;
    e._el = p; e._idx = idx;
  });

  Object.keys(nodes).map(Number).forEach(function (id) {
    var n = nodes[id], p = pos[id];
    var g = mk("g", { class: "gnode" + (n.endings > 0 ? " is-end" : "") });
    g.dataset.id = id;
    var isChapter = /^第.+[章话]/.test(n.name);
    if (isChapter) g.classList.add("is-chapter");
    if (id === ENTRY) g.classList.add("is-entry");
    g.appendChild(mk("rect", { x: p.x, y: p.y, width: nodeW[id], height: NODE_H, rx: 9 }));
    var txt = mk("text", { x: p.x + nodeW[id] / 2, y: p.y + NODE_H / 2 + 5, "text-anchor": "middle" });
    txt.textContent = n.name;
    g.appendChild(txt);
    var tip = mk("title", {});
    tip.textContent = n.name + " (#" + id + ")\n事件 " + n.n + " · 选项 " + n.choices + " · 结局 " + n.endings + "\n点击查看详情";
    g.appendChild(tip);
    g.addEventListener("click", function () { selectNode(id); });
    gNodes.appendChild(g);
    nodeEls[id] = g;
  });

  scroll.appendChild(svg);

  /* ---------------- 缩放 ---------------- */
  function applyZoom() {
    svg.setAttribute("width", W * zoom);
    svg.setAttribute("height", H * zoom);
  }
  document.getElementById("zin").addEventListener("click", function () { zoom = Math.min(2.2, zoom * 1.25); applyZoom(); });
  document.getElementById("zout").addEventListener("click", function () { zoom = Math.max(0.4, zoom / 1.25); applyZoom(); });
  document.getElementById("zreset").addEventListener("click", function () { zoom = 1; applyZoom(); });

  /* ---------------- 详情面板 ---------------- */
  var panel = document.getElementById("panel");
  var selected = null;

  function selectNode(id) {
    selected = id;
    // 高亮
    edges.forEach(function (e) {
      var rel = e.f === id || e.t === id;
      e._el.classList.toggle("hl", rel);
    });
    Object.keys(nodeEls).forEach(function (nid) {
      var rel = nid == id;
      var linked = (adjOut[id] || []).some(function (e) { return e.t == nid; }) ||
                   (adjIn[id] || []).some(function (e) { return e.f == nid; });
      nodeEls[nid].classList.toggle("dimmed", !(rel || linked));
    });
    renderPanel(id);
  }

  function clearSelect() {
    selected = null;
    edges.forEach(function (e) { e._el.classList.remove("hl"); });
    Object.keys(nodeEls).forEach(function (nid) { nodeEls[nid].classList.remove("dimmed"); });
    panel.innerHTML = '<div class="panel-empty">点击图中任意章节节点<br>查看详情、跳转关系与局部图</div>';
  }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderPanel(id) {
    var n = nodes[id];
    var out = adjOut[id] || [], inn = adjIn[id] || [];
    var h = "";
    h += '<h3>' + esc(n.name) + '</h3>';
    h += '<div class="sid">#' + id + ' · 共 ' + n.n + ' 个事件</div>';
    h += '<div class="stats"><span>选项 ' + n.choices + '</span><span>结局 ' + n.endings + '</span>' +
         (id === ENTRY ? '<span>入口章节</span>' : '') + '</div>';
    h += '<h4>去向 (' + out.length + ')</h4><ul>';
    if (!out.length) h += '<li><span class="lbl">（本章无后续跳转，是终点或需要从游戏内进入）</span></li>';
    out.forEach(function (e) {
      h += '<li>' + esc(nodes[e.t] ? nodes[e.t].name : e.t) +
           (e.l ? ' <div class="lbl">选项：' + esc(e.l) + '</div>' : '') +
           (e.i ? ' <a href="index.html?s=' + e.f + '#' + e.i + '">→ 从此处进入速览</a>' : '') + '</li>';
    });
    h += '</ul>';
    h += '<h4>来路 (' + inn.length + ')</h4><ul>';
    if (!inn.length) h += '<li><span class="lbl">（无直接来路）</span></li>';
    inn.forEach(function (e) {
      h += '<li>' + esc(nodes[e.f] ? nodes[e.f].name : e.f) +
           (e.l ? ' <div class="lbl">选项：' + esc(e.l) + '</div>' : '') + '</li>';
    });
    h += '</ul>';
    h += '<h4>局部图</h4>';
    h += '<div id="mini"></div>';
    h += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">' +
         '<button class="btn primary" id="open-viewer">在速览版中打开 →</button>' +
         '<button class="btn" id="close-panel">关闭</button></div>';
    panel.innerHTML = h;
    document.getElementById("open-viewer").addEventListener("click", function () {
      location.href = "index.html?s=" + id + "&p=" + buildPath(id);
    });
    document.getElementById("close-panel").addEventListener("click", clearSelect);
    renderMini(id, out, inn);
  }

  function buildPath(id) {
    // 沿入口的跳转链构造一个简单路径
    var path = [D.entry], cur = D.entry, guard = 0;
    while (cur !== id && guard++ < 200) {
      var outs = (adjOut[cur] || []);
      if (!outs.length) break;
      // 优先走与 id 同层方向最近的边
      cur = outs[0].t;
      if (utility[cur]) break;
      if (path.indexOf(cur) >= 0) break;
      path.push(cur);
    }
    if (path[path.length - 1] !== id) { path.push(id); }
    return path.join(".");
  }

  /* 局部小图：来路(左) — 本章(中) — 去向(右) */
  function renderMini(id, out, inn) {
    var host = document.getElementById("mini");
    if (!host) return;
    var NL = 34, GAP = 12;
    var lset = dedup(inn.map(function (e) { return e.f; }));
    var rset = dedup(out.map(function (e) { return e.t; }));
    var rows = Math.max(lset.length, rset.length, 1) ;
    var colW = [86, 96, 86];
    var w = colW[0] + colW[1] + colW[2] + 60;
    var hgt = Math.max(rows * (NL + GAP) + 20, 80);
    var s = mk("svg", { viewBox: "0 0 " + w + " " + hgt, width: "100%", class: "mini-svg" });
    function nodeBox(x, y, w2, label, hl) {
      var g = mk("g", {});
      g.appendChild(mk("rect", { x: x, y: y, width: w2, height: NL, rx: 7, fill: hl ? "#f3e2df" : "#fffdf8", stroke: hl ? "#a4322a" : "#b9b09c" }));
      var t = mk("text", { x: x + w2 / 2, y: y + NL / 2 + 4, "text-anchor": "middle", "font-size": 10.5 });
      t.textContent = label.length > 7 ? label.slice(0, 7) : label;
      g.appendChild(t);
      return g;
    }
    function yc(i, n2) { return 10 + i * (NL + GAP) + NL / 2; }
    var cx = colW[0] + 30, cy = hgt / 2;
    var mid = nodeBox(cx, cy - NL / 2, colW[1], nodes[id].name, true);
    s.appendChild(mid);
    lset.forEach(function (lid, i) {
      var y = yc(i, lset.length) - (lset.length * (NL + GAP)) / 2 + (NL + GAP) / 2;
      var y2 = Math.max(10 + NL / 2, Math.min(hgt - 10 - NL / 2, y + (hgt / 2 - y) * 0 + (cy - y) * 0 + y)); // 简单均布
      y2 = 10 + i * (NL + GAP) + NL / 2;
      s.appendChild(nodeBox(6, y2 - NL / 2, colW[0], nodes[lid].name));
      var xa = 6 + colW[0], xb = cx;
      s.appendChild(mk("path", { d: "M" + xa + "," + y2 + " C" + (xa + 18) + "," + y2 + " " + (xb - 18) + "," + cy + " " + xb + "," + cy, fill: "none", stroke: "#b9b09c", "marker-end": "url(#arrow)" }));
    });
    rset.forEach(function (rid, i) {
      var x = cx + colW[1] + 24, y2 = 10 + i * (NL + GAP) + NL / 2;
      s.appendChild(nodeBox(x, y2 - NL / 2, colW[2], nodes[rid].name));
      var xa = cx + colW[1], xb = x;
      s.appendChild(mk("path", { d: "M" + xa + "," + cy + " C" + (xa + 18) + "," + cy + " " + (xb - 18) + "," + y2 + " " + xb + "," + y2, fill: "none", stroke: "#c98a84", "marker-end": "url(#arrow)" }));
    });
    host.innerHTML = "";
    host.appendChild(s);
  }

  function dedup(a) {
    var seen = {}, r = [];
    a.forEach(function (x) { if (!seen[x]) { seen[x] = 1; r.push(x); } });
    return r;
  }

  /* ---------------- 章节定位下拉 ---------------- */
  var toc = document.getElementById("jump-toc");
  Object.keys(nodes).map(Number).sort(function (a, b) { return a - b; }).forEach(function (id) {
    var o = document.createElement("option");
    o.value = id;
    o.textContent = nodes[id].name + "（" + id + "）";
    toc.appendChild(o);
  });
  toc.addEventListener("change", function () {
    var id = parseInt(toc.value, 10);
    selectNode(id);
    var n = nodes[id], p = pos[id];
    scroll.scrollTo({ left: (p.x + nodeW[id] / 2) * zoom - scroll.clientWidth / 2, top: (p.y + NODE_H / 2) * zoom - scroll.clientHeight / 2, behavior: "smooth" });
  });

  // 默认选中入口
  selectNode(D.entry);
})();
