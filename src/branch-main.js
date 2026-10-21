import { inject } from "@vercel/analytics";
import G6 from "@antv/g6";

inject();

/* ---------------- 数据 ---------------- */
async function load() {
  var VV = "?v=20261020b";   // 数据版本: 更新数据后同步改这里, 避免浏览器缓存旧 json
  var res = await fetch("/plot/js/branches.json" + VV, { cache: "no-cache" });
  if (!res.ok) throw new Error("branches.json 加载失败: " + res.status);
  var data = await res.json();
  // LLM 精选数据(摘要覆盖 + 关键抉择标记); 加载失败不阻塞, 退回机械摘要
  try {
    var r2 = await fetch("/plot/js/llm_curated.json" + VV, { cache: "no-cache" });
    if (r2.ok) data.curated = await r2.json();
  } catch (e) { /* ignore */ }
  // 变量元数据与每故事条件变量引用(节点详情「变量状态」用); 失败不阻塞
  try {
    var r3 = await fetch("/plot/js/branch_vars.json" + VV, { cache: "no-cache" });
    if (r3.ok) data.varsData = await r3.json();
  } catch (e) { /* ignore */ }
  return data;
}

load().then(init).catch(function (err) {
  console.error(err);
  document.getElementById("graph-scroll").innerHTML =
    '<p style="padding:24px;color:#a4322a;white-space:pre-wrap">分支图加载失败：' +
    err.message + "\n" + String(err.stack || "").split("\n").slice(0, 5).join("\n") + "</p>";
});

/* ---------------- 初始化 ---------------- */
function init(data) {
  var entry = data.entry;

  // URL query 定位: ?s=<节点id>, 与 /plot 页的参数名保持一致, 便于互相跳转
  // /play 顶栏「分支图」会带 ?s=<当前故事>&expand=all 跳入: 自动切到对应章节树、全部展开并居中定位
  var urlNodeId = null;
  var urlExpandAll = false;
  (function () {
    var q = new URLSearchParams(location.search);
    var v = q.get("s");
    if (v && /^\d+$/.test(v)) urlNodeId = Number(v);
    if (q.get("expand") === "all") urlExpandAll = true;
  })();

  var nodeById = {};
  data.nodes.forEach(function (n) { nodeById[n.id] = n; });

  /* ---------- LLM 精选合并 ---------- */
  // curated: { "<id>": ["≤36字摘要", key0/1] }; 摘要覆盖机械摘要, key=1 并入关键抉择视图
  var curatedKey = {};
  if (data.curated) {
    Object.keys(data.curated).forEach(function (k) {
      var id = Number(k), c = data.curated[k];
      if (!nodeById[id]) return;
      if (c[0]) nodeById[id].summary = c[0];
      if (c[1]) curatedKey[id] = true;
    });
  }
  var edges = data.edges.filter(function (e) {
    return nodeById[e.f] && nodeById[e.t];
  });

  // 出边表: 用于判定"剧情结束"(全图出度0)与树划分遍历顺序
  var outMap = {};
  edges.forEach(function (e) { (outMap[e.f] = outMap[e.f] || []).push(e); });
  var terminal = {};
  data.nodes.forEach(function (n) { terminal[n.id] = !outMap[n.id] || !outMap[n.id].length; });

  /* ---------- 章节树划分 ---------- */
  // 每章一棵树: 序章树含入口; 从入口按剧情流(出边顺序)DFS, 遇第一~六章节点切换所属树。
  // 章节id与剧情先后不一致(如第五章id=52在第六章id=46之后才被访问到), DFS首达即归属。
  var CHAPTERS = ["序章", "第一章", "第二章", "第三章", "第四章", "第五章", "第六章"];
  var idByName = {};
  data.nodes.forEach(function (n) {
    if (CHAPTERS.indexOf(n.name) >= 0) idByName[n.name] = n.id;
  });
  var switchIdx = {}; // 第一~六章节点 -> 树号1..6 (序章树号0, 含入口)
  for (var k = 1; k < CHAPTERS.length; k++) switchIdx[idByName[CHAPTERS[k]]] = k;

  var treeOf = {};
  (function assignTrees() {
    var visited = {};
    var stack = [{ id: entry, tree: 0 }];
    while (stack.length) {
      var it = stack.pop();
      if (visited[it.id]) continue;
      visited[it.id] = true;
      var tr = switchIdx[it.id] != null ? switchIdx[it.id] : it.tree;
      treeOf[it.id] = tr;
      var outs = outMap[it.id] || [];
      for (var i = outs.length - 1; i >= 0; i--) {
        if (!visited[outs[i].t]) stack.push({ id: outs[i].t, tree: tr });
      }
    }
    // 未被跳转引用的节点沿入边归入来源树(图边可能缺一些中转)
    var changed = true;
    while (changed) {
      changed = false;
      edges.forEach(function (e) {
        if (treeOf[e.t] == null && treeOf[e.f] != null) { treeOf[e.t] = treeOf[e.f]; changed = true; }
      });
    }
    // 真孤儿(如未被任何剧情引用的"连响四枪")归入"其他"树
    data.nodes.forEach(function (n) { if (treeOf[n.id] == null) treeOf[n.id] = CHAPTERS.length; });
  })();

  var hasOrphan = data.nodes.some(function (n) { return treeOf[n.id] === CHAPTERS.length; });

  // 视图列表: 序章 / 第一~六章 / [其他] / 全景
  var views = CHAPTERS.map(function (name, k) { return { label: name, tree: k }; });
  if (hasOrphan) views.push({ label: "其他", tree: CHAPTERS.length });
  views.push({ label: "全景", tree: "all" });

  /* ---------- 样式 ---------- */
  var COLORS = {
    entry: { stroke: "#a4322a", fill: "#a4322a", label: "#ffffff", summary: "#f0d4cf" },
    chapter: { stroke: "#2b5d8a", fill: "#e8f0f7", label: "#1d3d59" },
    ending: { stroke: "#7a5a12", fill: "#f5ecd4", label: "#5a4310" },
    end: { stroke: "#a4322a", fill: "#fdecea", label: "#8a1f14" },   // 剧终(无后续节点, 红色便于区分)
    normal: { stroke: "#a89b7d", fill: "#fffdf8", label: "#1d1b17", summary: "#635d50" },
    proxy: { stroke: "#2e7d32", fill: "#e8f5e9", label: "#1b5e20" }, // 跨章节跳转占位
  };
  var GREEN = "#2e7d32";
  var BLUE = "#4a6fa5";
  var FONT = '"Noto Serif SC","Songti SC","SimSun",serif';

  var chapterSet = {};
  CHAPTERS.forEach(function (name) {
    if (idByName[name] != null) chapterSet[idByName[name]] = true;
  });

  // 是否有跨章节树的出边(如章节尾跳转到下一章)
  function jumpsCross(id) {
    return (outMap[id] || []).some(function (e) { return treeOf[e.t] !== treeOf[id]; });
  }

  // 剧终判定: 真实节点看顶层直接结局(direct), 合成节点看 dead 标记; 且不跳转到下一章
  function isDeadEnd(id) {
    var n = nodeById[id];
    return (n.direct > 0 || n.dead === true) && !jumpsCross(id);
  }

  function nodeType(id) {
    if (id === entry) return "entry";
    if (chapterSet[id]) return "chapter";
    if (isDeadEnd(id)) return "end";
    if (nodeById[id].endings > 0) return "ending";
    return "normal";
  }

  // 卡片节点: 标题 + 一句话摘要 + 统计, 不点开面板即可读懂剧情走向
  G6.registerNode("card", {
    draw: function (cfg, group) {
      var w = cfg.cardW, h = cfg.cardH;
      var rect = group.addShape("rect", {
        attrs: {
          x: -w / 2, y: -h / 2, width: w, height: h,
          fill: cfg.cardFill, stroke: cfg.cardStroke,
          lineWidth: cfg.cardLw || 1.5, radius: 10,
          shadowBlur: 4, shadowColor: "rgba(60,50,30,0.12)",
          cursor: "pointer",
        },
        name: "card-rect",
      });
      group.addShape("text", {
        attrs: {
          x: -w / 2 + 12, y: -h / 2 + (cfg.cardSummary ? 18 : h / 2 - (cfg.cardMeta ? 16 : 0)),
          text: cfg.cardTitle, fontSize: 16, fontWeight: 600,
          fill: cfg.cardLabel, fontFamily: FONT,
          textAlign: "left", textBaseline: "middle", cursor: "pointer",
        },
        name: "card-title",
      });
      if (cfg.cardSummary) {
        group.addShape("text", {
          attrs: {
            x: -w / 2 + 12, y: -h / 2 + 40, text: cfg.cardSummary,
            fontSize: 13, fill: cfg.cardSummaryColor || "#7a756a", fontFamily: FONT,
            textAlign: "left", textBaseline: "middle", cursor: "pointer",
          },
          name: "card-summary",
        });
      }
      if (cfg.cardMeta) {
        group.addShape("text", {
          attrs: {
            x: -w / 2 + 12, y: h / 2 - 12, text: cfg.cardMeta,
            fontSize: 12, fill: cfg.cardMetaColor || "#93897a", fontFamily: FONT,
            textAlign: "left", textBaseline: "middle", cursor: "pointer",
          },
          name: "card-meta",
        });
      }
      return rect;
    },
  }, "single-node");

  function makeNode(id) {
    var n = nodeById[id];
    var type = nodeType(id);
    var c = COLORS[type];
    // 条件判断: 菱形, 便于与剧情节点区分
    if (n.cond) {
      var cl = footLit(id);
      return {
        id: String(id),
        nodeType: type,
        raw: n,
        label: n.name,
        type: "diamond",
        size: [230, 86],
        style: {
          stroke: footOn && !cl ? "#d8d2c4" : (footOn ? "#d9822b" : "#6a5a8a"),
          fill: footOn && !cl ? "#f2efe8" : (footOn ? "#fdf2e3" : "#f2eef8"),
          lineWidth: footOn ? (cl ? 3 : 1) : 1.5,
          shadowBlur: 4, shadowColor: "rgba(60,50,30,0.12)",
        },
        labelCfg: { style: { fill: footOn && !cl ? "#a59f90" : "#4a3a6a", fontSize: 15, fontFamily: FONT } },
      };
    }
    // 其余全部为卡片: 标题 + 摘要 + 统计
    var title = n.name + (storyHasKids[id] ? (isExpanded(id) ? " ▾" : " ▸") : "");
    var summary = n.summary || "";
    if (summary.length > 44) summary = summary.slice(0, 43) + "…";
    var meta = [];
    if (n.events) meta.push("事件 " + n.events);
    if (n.choices) meta.push("选项 " + n.choices);
    if (n.beat && !n.events && !n.choices) meta.push("抉择点");
    var h = summary ? 72 : meta.length ? 56 : 44;
    // 足迹模式: 走过的描边橙色加粗, 没走的整体褪色
    var lit = footLit(id);
    if (footOn && !lit) {
      return {
        id: String(id), nodeType: type, raw: n, type: "card",
        cardW: 280, cardH: h, cardTitle: title, cardSummary: summary,
        cardMeta: meta.join(" · "),
        cardFill: "#f2efe8", cardStroke: "#d8d2c4", cardLabel: "#a59f90",
        cardSummaryColor: "#b8b2a2", cardMetaColor: "#c5bfae", cardLw: 1,
      };
    }
    return {
      id: String(id),
      nodeType: type,
      raw: n,
      type: "card",
      cardW: 280, cardH: h,
      cardTitle: title,
      cardSummary: summary,
      cardMeta: meta.join(" · "),
      cardFill: c.fill,
      cardStroke: footOn ? "#d9822b" : c.stroke,
      cardLabel: c.label,
      cardSummaryColor: c.summary,
      cardLw: footOn ? 3 : (type === "end" || type === "ending" ? 2.5 : 2),
    };
  }

  // 跨章节跳转的占位小节点(点击切到目标章节树并定位)
  function makeProxyNode(targetId) {
    var c = COLORS.proxy;
    return {
      id: "x" + targetId,
      nodeType: "proxy",
      targetId: targetId,
      label: "→ " + nodeById[targetId].name,
      size: [150, 40],
      style: {
        stroke: c.stroke, fill: c.fill, lineWidth: 1.5,
        lineDash: [4, 3], radius: 8,
      },
      labelCfg: { style: { fill: c.label, fontSize: 15, fontFamily: FONT } },
    };
  }

  function makeEdge(e, cross, proxyId, pi, pn) {
    var m = { source: String(e.f), target: String(proxyId || e.t) };
    // 同对节点间的多条平行边(不同选项走向同一去向)用 offset 扇形分开, 避免重叠成一条
    var off = pn > 1 ? (pi - (pn - 1) / 2) * 14 : 0;
    m.style = {
      stroke: BLUE, lineWidth: 2, radius: 16, offset: off,
      // G6.Arrow.triangle 是函数, 须传路径串, 直接传函数会导致 Path 构造崩溃
      endArrow: { path: "M 0,0 L 12,6 L 0,12 Z", fill: BLUE },
    };
    if (e.l) m.label = e.l.length > 14 ? e.l.slice(0, 13) + "…" : e.l;
    m.labelCfg = {
      autoRotate: true,
      style: {
        fill: "#8a5a11", fontSize: 14,
        background: { fill: "#fffdf8", padding: [3, 6, 3, 6], radius: 4 },
      },
    };
    if (cross) {
      // 跨章节跳转: 绿色, 保留平行边 offset
      m.style.stroke = GREEN;
      m.style.endArrow = { path: "M 0,0 L 12,6 L 0,12 Z", fill: GREEN };
      m.labelCfg.style.fill = "#1b5e20";
      m.labelCfg.style.background = { fill: "#e8f5e9", padding: [3, 6, 3, 6], radius: 4 };
    }
    if (footOn && !(footLit(e.f) && footLit(e.t))) {
      // 足迹模式: 未走过的边褪色
      m.style.stroke = "#ddd6c8";
      m.style.endArrow = { path: "M 0,0 L 12,6 L 0,12 Z", fill: "#ddd6c8" };
      m.labelCfg.style.fill = "#b8b2a2";
      if (m.labelCfg.style.background) m.labelCfg.style.background.fill = "#f5f2ec";
    }
    return m;
  }

  /* ---------- 当前视图状态 ---------- */
  var currentView = views[0];
  var curNodeIds = {};   // 视图内真实节点id集合
  var curEdges = [];     // 视图内真实边(含跨树边, 用于高亮与面板)
  var graph = null;
  var selectedId = null;
  var showAll = false;   // 全部展开/收起(按钮)
  var expanded = {};     // 用户点击展开的小节 story id -> true
  var keyOnly = false;   // 只看关键抉择(分叉/汇合/条件/剧终, 线性推进压缩)
  if (urlExpandAll) showAll = true;  // ?expand=all: 等效"全部展开"按钮(rebuild 时按钮状态自动同步)
  var footOn = true;     // 我的足迹: 高亮纯文本模式(/play)走过的路径; 默认开启, 记住手动关闭
  try { footOn = localStorage.getItem("qf_foot_on") !== "0"; } catch (e) { }
  var footStories = {};  // 已访问故事 sid -> 1 (来自 localStorage)
  var footChoices = {};  // 选项 anchor -> 已选下标数组
  function loadFoot() {
    try { footStories = JSON.parse(localStorage.getItem("qf_foot_story") || "{}"); } catch (e) { footStories = {}; }
    try { footChoices = JSON.parse(localStorage.getItem("qf_foot_choice") || "{}"); } catch (e) { footChoices = {}; }
  }
  loadFoot();
  // 足迹判定: beat 有选中记录, 或其所属故事被访问过
  function footLit(id) {
    if (!footOn) return true;
    var n = nodeById[id];
    if (!n) return true;
    if (n.beat && n.anchor && footChoices[n.anchor]) return true;
    var sid = n.page != null ? n.page : (n.story != null ? n.story : id);
    return !!(footStories[sid] || footStories[id]);
  }

  /* ---------- 节点变量状态(跳转 /play 前可设定初始值) ---------- */
  var VARS_META = (data.varsData && data.varsData.vars) || {};    // vid -> {n,kind,p}
  var STORY_VARS = (data.varsData && data.varsData.storyVars) || {}; // sid -> [vid..]
  var VAR_ASSIGNS = (data.varsData && data.varsData.assign) || {};   // vid -> 出现赋值的故事 sid 列表
  var VAR_USES = (data.varsData && data.varsData.uses) || {};        // vid -> [[故事 sid, 条件原文], ...]
  var CH_MARKS = (data.varsData && data.varsData.marks) || {};       // 章标记故事 sid -> 名称
  var VAR_SHOW_MAX = 10; // 详情面板默认最多展示的变量数, 其余可展开

  var nodeSidOf = function (n) { return n.story != null ? n.story : (n.page != null ? n.page : n.id); };

  // 章节归属: 故事属于其之前(含自身)最近的章标记故事(sid 顺序即剧情顺序, 第五/六章编号错位与 play 端一致)
  var markSids = Object.keys(CH_MARKS).map(Number).sort(function (a, b) { return a - b; });
  var chCache = {};
  function chapterOfSid(sid) {
    if (chCache[sid] != null) return chCache[sid];
    var ch = markSids[0] != null ? markSids[0] : 0;   // 无前置章标记(介绍段)归第一个章节
    for (var i = 0; i < markSids.length; i++) {
      if (markSids[i] <= sid) ch = markSids[i]; else break;
    }
    chCache[sid] = ch;
    return ch;
  }

  // 变量面板过滤(按剧情逻辑, 不再沿图 BFS 汇总全部下游):
  //   ① 只展示在本节点(含本身)之前已触发过赋值的变量
  //   ② 该变量须在本节点之后、且限定在节点所在章节内仍被条件使用(跨章才用的不展示)
  function nodeVarRows(id) {
    var sid = Number(nodeSidOf(nodeById[id]) || id);
    var ch = chapterOfSid(sid);
    var rows = [];
    Object.keys(VARS_META).forEach(function (vidStr) {
      var assigns = (VAR_ASSIGNS[vidStr] || []).map(Number);
      if (!assigns.some(function (a) { return a <= sid; })) return;      // 节点前未触发
      var uses = (VAR_USES[vidStr] || []).filter(function (u) {
        return Number(u[0]) >= sid && chapterOfSid(Number(u[0])) === ch;  // 本章节后续使用
      });
      if (!uses.length) return;
      rows.push({ v: Number(vidStr), uses: uses });
    });
    return rows;
  }

  // 脚注: 变量说明 = 本章节后续各条件分支的走向(满足→什么剧情 / 否则→什么剧情), 悬停可见
  function varFootnote(uses) {
    var lines = [], seen = {};
    uses.forEach(function (u) {
      var hint = (u[2] || "").replace(/^数值：?\[[^\]]*\]\s*/, "");   // hint 已含条件, 去掉重复前缀
      var m = /]\s*(≥|≤|＞|＜|＝|≠|>=|<=|==|!=|>|<|=)\s*(.+)$/.exec(u[1]);
      var line = hint || (m ? m[1] + " " + m[2].trim() : u[1]);
      if (!seen[line]) { seen[line] = 1; lines.push(line); }
    });
    if (!lines.length) return "";
    var chName = CH_MARKS[String(chapterOfSid(Number(uses[0][0])))] || "";
    return "变量作用 · 本章节(" + chName + ")后续分支:\n" + lines.slice(0, 8).join("\n");
  }

  // 已保存节点参数: FIFO 队列, 上限 10 个节点, 最近使用在前; 默认值(0)不落盘
  var LS_NODEVARS = "qf_branch_nodevars";
  function loadNodeVarQueue() {
    try {
      var a = JSON.parse(localStorage.getItem(LS_NODEVARS) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function persistNodeVarQueue(q) {
    try { localStorage.setItem(LS_NODEVARS, JSON.stringify(q.slice(0, 10))); } catch (e) { }
  }
  function savedNodeVars(id) {
    var q = loadNodeVarQueue();
    for (var i = 0; i < q.length; i++) if (q[i].n === id) return q[i].v || {};
    return null;
  }
  function upsertNodeVars(id, sel) {
    var q = loadNodeVarQueue().filter(function (e) { return e.n !== id; });
    var v = {};
    Object.keys(sel).forEach(function (k) { if (sel[k] !== 0) v[k] = sel[k]; });
    if (Object.keys(v).length) q.unshift({ n: id, v: v });
    persistNodeVarQueue(q);
    return q;
  }

  function buildPlayUrl(id, sel) {
    var raw = nodeById[id];
    var sid = raw.page || raw.story || id;
    var parts = [];
    Object.keys(sel || {}).forEach(function (k) { if (sel[k] !== 0) parts.push(k + ":" + sel[k]); });
    return "/play?s=" + sid + (parts.length ? "&v=" + parts.join(",") : "");
  }

  // 节拍/合成/条件节点归属小节; 小节收起时折叠到小节节点上
  var storyHasKids = {}; // 有可展开剧情的小节
  data.nodes.forEach(function (n) {
    if ((n.synthetic || n.beat || n.cond) && n.story != null) storyHasKids[n.story] = true;
  });
  function isExpanded(sid) { return showAll || expanded[sid] || keyOnly; }
  function collapseId(id) {
    var n = nodeById[id];
    if (n && (n.synthetic || n.beat || n.cond) && n.story != null && !isExpanded(n.story)) return n.story;
    return id;
  }

  // 关键抉择视图: 只保留 章节入口/小节锚点(有下挂剧情)/条件菱形/剧终,
  // 其余具体剧情节点压缩成直达边(沿途带上第一个选项文字), 仿 articy:draft 的分层 Flow
  function computeKeyEdges(v, keep) {
    var inTree = function (id) { return v.tree === "all" || treeOf[id] === v.tree; };
    var key = {};
    data.nodes.forEach(function (n) {
      if (!inTree(n.id)) return;
      if (n.id === entry || chapterSet[n.id] || n.cond || isDeadEnd(n.id)
          || storyHasKids[n.id] || curatedKey[n.id]) key[n.id] = true;
    });
    Object.keys(key).forEach(function (k) { keep[Number(k)] = true; });
    var adj = {};
    edges.forEach(function (e) {
      if (inTree(e.f) && inTree(e.t)) (adj[e.f] = adj[e.f] || []).push(e);
    });
    var out = [];
    Object.keys(key).forEach(function (uStr) {
      var u = Number(uStr);
      var seen = {}; seen[u] = true;
      var queue = [{ id: u, l: "" }];
      while (queue.length) {
        var cur = queue.shift();
        (adj[cur.id] || []).forEach(function (e) {
          if (seen[e.t]) return;
          seen[e.t] = true;
          var l = cur.l || e.l;
          if (key[e.t]) out.push({ f: u, t: e.t, l: l });
          else queue.push({ id: e.t, l: l });
        });
      }
    });
    return out;
  }

  function buildView(v) {
    var inTree = function (id) { return v.tree === "all" || treeOf[id] === v.tree; };
    var keep = {};   // 视图内真实节点id
    var edgeList;
    if (keyOnly) {
      edgeList = computeKeyEdges(v, keep);
    } else {
      data.nodes.forEach(function (n) { if (inTree(n.id)) keep[n.id] = true; });
      edgeList = edges;
    }
    var nodes = [], viewEdges = [];
    var proxyAdded = {};
    curNodeIds = keep;
    curEdges = [];
    data.nodes.forEach(function (n) {
      if (!keep[n.id]) return;
      // 节拍/分支/条件节点仅在其所属小节展开时显示
      var collapse = (n.synthetic || n.beat || n.cond) && !isExpanded(n.story);
      if (!collapse) nodes.push(makeNode(n.id));
    });
    // 边端点折叠: 收起小节的节拍/分支/条件边重挂到小节节点; 去重、丢弃自环
    var pairTotal = {}, pairIdx = {}, seenEdge = {};
    edgeList.forEach(function (e0) {
      var e = { f: e0.f, t: e0.t, l: e0.l || "" };
      var f = collapseId(e.f), t = collapseId(e.t);
      if (f === t) return;
      var sk = f + "-" + t + "-" + e.l;
      if (seenEdge[sk]) return;
      seenEdge[sk] = 1;
      var k = f + "-" + t;
      pairTotal[k] = (pairTotal[k] || 0) + 1;
    });
    edgeList.forEach(function (e0) {
      var e = { f: e0.f, t: e0.t, l: e0.l || "" };
      var f = collapseId(e.f), t = collapseId(e.t);
      if (f === t) return;
      var sk = f + "-" + t + "-" + e.l;
      if (!seenEdge[sk]) return;
      seenEdge[sk] = 0;  // 消费标记, 重复边只取一条
      var k = f + "-" + t;
      var pi = pairIdx[k] || 0;
      pairIdx[k] = pi + 1;
      var m = { f: f, t: t, l: e.l };
      curEdges.push(m);
      viewEdges.push(makeEdge(m, false, null, pi, pairTotal[k]));
    });
    // 跨树边(章节树视图内以占位节点表示)
    edgeList.forEach(function (e0) {
      var e = { f: e0.f, t: e0.t, l: e0.l || "" };
      var f = collapseId(e.f), t = collapseId(e.t);
      if (f === t || !inTree(f) || inTree(t)) return;
      var m = { f: f, t: t, l: e.l };
      curEdges.push(m);
      if (v.tree === "all") {
        viewEdges.push(makeEdge(m, true));
      } else {
        if (!proxyAdded[t]) { proxyAdded[t] = true; nodes.push(makeProxyNode(t)); }
        viewEdges.push(makeEdge(m, true, "x" + t));
      }
    });
    return { nodes: nodes, edges: viewEdges };
  }

  /* ---------- 面板 ---------- */
  var panel = document.getElementById("panel");
  var PANEL_EMPTY = '<div class="panel-empty">点击图中任意章节节点<br>查看详情与跳转关系<br><br>节点较多时默认收起细节<br>点击带 ▸ 的章节/小节节点<br>可展开/收起其下剧情<br><br>红色节点 = 剧终 · 菱形 = 条件判断<br>绿色连线 = 跳转其他章节<br>边上文字 = 触发跳转的选项</div>';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function clearSelect() {
    selectedId = null;
    graph.findAll("node", function () { return true; }).forEach(function (it) {
      graph.clearItemStates(it);
    });
    graph.findAll("edge", function () { return true; }).forEach(function (it) {
      graph.clearItemStates(it);
    });
    syncUrl(null);
    panel.innerHTML = PANEL_EMPTY;
  }

  function highlight(id) {
    var linkedIds = {};
    curEdges.forEach(function (e) {
      if (e.f === id) linkedIds[e.t] = true;
      if (e.t === id) linkedIds[e.f] = true;
    });
    graph.findAll("node", function (it) {
      var m = it.get("model");
      if (m.nodeType === "proxy") {
        var rel = linkedIds[m.targetId] || m.targetId === id;
        graph.setItemState(it, rel ? "highlight" : "dim", true);
        graph.setItemState(it, rel ? "dim" : "highlight", false);
        return false;
      }
      var nid = Number(m.id);
      var r = nid === id || linkedIds[nid];
      graph.setItemState(it, r ? "highlight" : "dim", true);
      graph.setItemState(it, r ? "dim" : "highlight", false);
      return false;
    });
    graph.findAll("edge", function (it) {
      var m = it.get("model");
      var sid = Number(m.source);
      var tid = Number(String(m.target).replace(/^x/, ""));
      var r = sid === id || tid === id;
      graph.setItemState(it, r ? "highlight" : "dim", true);
      graph.setItemState(it, r ? "dim" : "highlight", false);
      return false;
    });
  }

  // URL 同步: 点击节点时把 ?s= 写入地址栏(不触发导航), 清除选择时移除
  function syncUrl(id) {
    try {
      var url = location.pathname + (id != null ? "?s=" + id : "");
      history.replaceState(null, "", url);
    } catch (e) { /* ignore */ }
  }

  function openPanel(id) {
    selectedId = id;
    syncUrl(id);
    var raw = nodeById[id];
    if (!raw) return;
    highlight(id);

    var outEdges = curEdges.filter(function (e) { return e.f === id; });
    var inEdges = curEdges.filter(function (e) { return e.t === id; });
    var h = "";
    h += '<div class="panel-head"><strong>' + esc(raw.name) + "</strong>";
    h += '<span class="tags">';
    if (id === entry) h += '<em class="tag tag-entry">入口</em>';
    if (chapterSet[id]) h += '<em class="tag tag-chapter">章节</em>';
    if (storyHasKids[id]) h += '<em class="tag tag-chapter">' + (isExpanded(id) ? "点击收起剧情 ▾" : "点击展开剧情 ▸") + "</em>";
    if (raw.synthetic) h += '<em class="tag tag-chapter">分支内容</em>';
    if (raw.cond) h += '<em class="tag tag-chapter">条件判断</em>';
    if (raw.beat) h += '<em class="tag tag-chapter">关键选择</em>';
    if (isDeadEnd(id)) h += '<em class="tag tag-ending">剧终</em>';
    else if (raw.endings > 0) h += '<em class="tag tag-ending">含结局标记</em>';
    h += "</span>";
    h += '<button class="btn" id="close-panel">关闭</button></div>';
    h += '<div class="panel-body"><div class="panel-info">';
    h += '<p class="meta">事件 ' + raw.events + " · 选项 " + raw.choices + " · 结局标记 " + raw.endings + "</p>";
    if (raw.summary) h += '<p class="summary">' + esc(raw.summary) + "</p>";
    // 内联分支/节拍节点: 跳到其选项所在页面并锚点定位到该选项; 菱形节点跳到所在章节页
    var viewUrl;
    if ((raw.synthetic || raw.beat) && raw.anchor) viewUrl = "/plot?s=" + (raw.page || raw.story) + "#" + raw.anchor;
    else if (raw.synthetic || raw.cond || raw.beat) viewUrl = "/plot?s=" + (raw.page || raw.story);
    else viewUrl = "/plot?s=" + id;
    // 变量状态: 按剧情逻辑过滤(本节点前已触发 + 本章节后续使用), 可在跳转前设定开局初始值(默认 0)
    var panelSel = {};          // vid -> 当前选择值(默认 0)
    var dvars = nodeVarRows(id);
    var savedEntry = savedNodeVars(id) || {};
    dvars.forEach(function (r) {
      panelSel[r.v] = savedEntry[r.v] != null ? Number(savedEntry[r.v]) : 0;
    });
    var playUrl = buildPlayUrl(id, panelSel);
    h += '<p class="btn-row"><a class="btn primary" id="play-link" href="' + playUrl + '" target="_blank">▶ 从这里开始玩</a>'
       + '<a class="btn" href="' + viewUrl + '" target="_blank">进入速览 →</a></p>';
    h += '<p class="meta">「开始玩」进入纯文本模式(可回退、记录足迹); 速览直达 /plot 对应剧情节点</p>';
    if (dvars.length) {
      h += '<div class="var-sec" id="panel-vars">';
      h += '<div class="var-head">变量状态 <span>仅列本节点前已触发且本章节后续会用的变量 · 点击设定开局初始值</span>';
      h += '<em class="tag var-kept-tag' + (dvars.some(function (r) { return panelSel[r.v] !== 0; }) ? "" : " hidden") + '">已存参数</em>';
      h += "</div>";
      h += '<div class="var-list">';
      dvars.forEach(function (r, vi) {
        var v = r.v;
        var meta = VARS_META[String(v)];
        var extra = vi >= VAR_SHOW_MAX ? " var-extra hidden" : "";
        var rowSaved = panelSel[v] !== 0 ? " var-saved" : "";
        var fn = varFootnote(r.uses);
        h += '<div class="var-row' + rowSaved + extra + '" data-var="' + v + '">';
        h += '<span class="var-name" title="变量#' + v + '">' + esc(meta.n);
        if (fn) h += '<sup class="var-fn" title="' + esc(fn) + '">?</sup>';
        h += "</span>";
        h += '<span class="var-btns">';
        meta.p.forEach(function (pv) {
          var lab = meta.kind === "bool" ? (pv === 0 ? "否" : "是") : String(pv);
          h += '<button type="button" class="vbtn' + (panelSel[v] === pv ? " on" : "") + '" data-v="' + pv + '">' + lab + "</button>";
        });
        h += "</span></div>";
      });
      if (dvars.length > VAR_SHOW_MAX) {
        h += '<button type="button" class="var-more">还有 ' + (dvars.length - VAR_SHOW_MAX) + " 项变量 ▾</button>";
      }
      h += "</div></div>";
    }
    h += "</div>";

    // 来源（左）与去向（右）横向排列; 跨树目标标注 ↗, 点击后切换章节树
    function listCol(title, list, dir) {
      var s = '<div class="list-col"><h4>' + title + " (" + list.length + ")</h4><ul>";
      list.forEach(function (e) {
        var other = dir === "out" ? e.t : e.f;
        var cross = treeOf[other] !== currentView.tree && currentView.tree !== "all";
        s += '<li><a href="#" data-goto="' + other + '">' + esc(nodeById[other].name) + (cross ? " ↗" : "") + "</a>";
        if (e.l) s += ' <span class="choice">【' + esc(e.l) + "】</span>";
        s += "</li>";
      });
      if (!list.length) s += '<li class="none">无</li>';
      return s + "</ul></div>";
    }
    h += '<div class="panel-lists">';
    h += listCol("来源", inEdges, "in");
    h += listCol("去向", outEdges, "out");
    h += "</div></div>";
    panel.innerHTML = h;
    panel.scrollTop = 0;

    document.getElementById("close-panel").addEventListener("click", clearSelect);
    panel.querySelectorAll("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        gotoNode(Number(a.dataset.goto));
      });
    });

    // ---- 变量状态区交互 ----
    var varSec = document.getElementById("panel-vars");
    if (varSec) {
      function refreshVarUi() {
        var kept = false;
        varSec.querySelectorAll(".var-row").forEach(function (row) {
          var vid = Number(row.dataset.var);
          var isNonDefault = panelSel[vid] !== 0;
          row.classList.toggle("var-saved", isNonDefault);
          if (isNonDefault) kept = true;
          row.querySelectorAll(".vbtn").forEach(function (x) {
            x.classList.toggle("on", Number(x.dataset.v) === panelSel[vid]);
          });
        });
        var tag = varSec.querySelector(".var-kept-tag");
        if (tag) tag.classList.toggle("hidden", !kept);
        var link = document.getElementById("play-link");
        if (link) link.href = buildPlayUrl(id, panelSel);
      }
      varSec.querySelectorAll(".var-row").forEach(function (row) {
        var vid = Number(row.dataset.var);
        row.querySelectorAll(".vbtn").forEach(function (b) {
          b.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            panelSel[vid] = Number(b.dataset.v);
            upsertNodeVars(id, panelSel);  // 队列: 最近使用在前, 超过 10 个踢最旧
            refreshVarUi();
          });
        });
      });
      var moreBtn = varSec.querySelector(".var-more");
      if (moreBtn) moreBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        var folded = moreBtn.textContent.indexOf("▾") >= 0;
        varSec.querySelectorAll(".var-extra").forEach(function (r) { r.classList.toggle("hidden", !folded); });
        moreBtn.textContent = folded ? "收起变量 ▴" : "还有 " + (dvars.length - VAR_SHOW_MAX) + " 项变量 ▾";
      });
    }
  }

  /* ---------- 视图切换与节点定位 ---------- */
  function focusNode(id) {
    var item = graph.findById(String(id));
    if (!item) return;
    graph.clearItemStates(item);
    openPanel(id);
    // 居中到屏幕中间, 方便浏览
    graph.focusItem(item, true, { easing: "easeCubic", duration: 400 });
  }

  function gotoNode(id) {
    if (currentView.tree === "all" || treeOf[id] === currentView.tree) {
      focusNode(id);
      return;
    }
    switchView(treeOf[id], id);
  }

  function updateTabs() {
    document.querySelectorAll("#chapter-quick button").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.view) === views.indexOf(currentView));
    });
  }

  var pendingFocus = null;

  // 章节树起始节点: 该树内无同树入边的节点(优先章节标题节点本身)
  function treeStart(tree) {
    if (tree === "all" || tree == null) return null;
    var hasIn = {};
    edges.forEach(function (e) {
      if (treeOf[e.f] === tree && treeOf[e.t] === tree) hasIn[e.t] = true;
    });
    var cands = data.nodes.filter(function (n) {
      return treeOf[n.id] === tree && !hasIn[n.id];
    });
    if (!cands.length) return null;
    cands.sort(function (a, b) {
      var ca = chapterSet[a.id] ? 0 : 1, cb = chapterSet[b.id] ? 0 : 1;
      return ca - cb || a.id - b.id;
    });
    return cands[0].id;
  }

  function rebuild() {
    if (graph) { graph.destroy(); graph = null; }
    selectedId = null;
    panel.innerHTML = PANEL_EMPTY;
    var vd = buildView(currentView);

    graph = new G6.Graph({
      container: "graph-scroll",
      renderer: "canvas",
      // 注意：不要开 fitView: true —— 它会在布局完成后异步再缩放一次，覆盖手动视图
      animate: false,
      plugins: [
        new G6.Minimap({
          container: "graph-minimap",
          type: "delegate",
          size: [170, 110],
          delegateStyle: { fill: "#a4322a", stroke: "#a4322a" },
          viewportClassName: "graph-minimap-viewport",
        }),
      ],
      modes: { default: ["drag-canvas", "scroll-canvas", "drag-node"] },
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
        labelCfg: { style: { fontSize: 20, fontFamily: FONT } },
      },
      nodeStateStyles: {
        highlight: { stroke: "#a4322a", lineWidth: 2, shadowBlur: 10 },
        dim: { opacity: 0.25 },
      },
      defaultEdge: {
        type: "polyline",
        style: {
          stroke: BLUE, lineWidth: 2, radius: 16,
          // G6.Arrow.triangle 是函数, 须传路径串, 直接传函数会导致 Path 构造崩溃
          endArrow: { path: "M 0,0 L 12,6 L 0,12 Z", fill: BLUE },
        },
        labelCfg: {
          autoRotate: true,
          style: {
            fill: "#8a5a11", fontSize: 14,
            background: { fill: "#fffdf8", padding: [3, 6, 3, 6], radius: 4 },
          },
        },
      },
      edgeStateStyles: {
        highlight: { stroke: "#a4322a", lineWidth: 2 },
        dim: { opacity: 0.12 },
      },
    });

    graph.data({ nodes: vd.nodes, edges: vd.edges });

    function afterLayout() {
      graph.off("afterlayout", afterLayout);
      graph.fitView(40);
      // 可读下限: 章节视图 0.5(大图不强缩全图, 滚动浏览配合小地图, 需纵览可手动缩小);
      // 全景视图以纵览结构为主, 只挡住 0.15 以下的极端缩小
      var MIN_ZOOM = currentView.tree === "all" ? 0.15 : 0.5;
      var z = graph.getZoom();
      if (z > 1.2) graph.zoomTo(1.2);
      if (pendingFocus != null) {
        var it = graph.findById(String(pendingFocus));
        if (it) graph.focusItem(it, false);
        // 展开小节后全图 fitView 会缩得过小, 以画布中心(focusItem 已把节点居中)为锚放大
        if (graph.getZoom() < 0.5) {
          graph.zoomTo(0.85, { x: graph.get("width") / 2, y: graph.get("height") / 2 });
        }
        openPanel(pendingFocus);
        pendingFocus = null;
      } else {
        // 无指定焦点时定位到章节起始节点, 免去每次切换后手工挪视图
        var start = treeStart(currentView.tree);
        if (start != null) {
          var sit = graph.findById(String(start));
          if (sit) {
            graph.focusItem(sit, false);
            if (graph.getZoom() < MIN_ZOOM) {
              // 全图塞不下: 起始节点保持居中, 放大到可读缩放, 其余靠滚动漫游
              graph.zoomTo(MIN_ZOOM, { x: graph.get("width") / 2, y: graph.get("height") / 2 });
            } else {
              // 缩放足够时才把画布上移, 让起始节点停在视口顶部附近
              graph.translate(0, -graph.get("height") * 0.35);
            }
          }
        }
      }
    }
    graph.on("afterlayout", afterLayout);

    graph.on("node:click", function (evt) {
      var m = evt.item.get("model");
      if (m.nodeType === "proxy") { gotoNode(m.targetId); return; }
      var nid = Number(m.id);
      // 点击小节/章节节点: 展开/收起其下具体剧情节点
      if (storyHasKids[nid]) {
        if (expanded[nid]) delete expanded[nid];
        else expanded[nid] = true;
        pendingFocus = nid;
        rebuild();
        return;
      }
      openPanel(nid);
    });
    graph.on("canvas:click", clearSelect);

    // 缩放工具按钮(可能不存在, 防御)
    var zin = document.getElementById("zin");
    var zout = document.getElementById("zout");
    var zreset = document.getElementById("zreset");
    if (zin) zin.onclick = function () { graph.zoom(1.2); };
    if (zout) zout.onclick = function () { graph.zoom(1 / 1.2); };
    if (zreset) zreset.onclick = function () {
      graph.fitView(40);
      var z = graph.getZoom();
      if (z > 1.2) graph.zoomTo(1.2);
    };

    graph.render();
    updateDetailBtn();
    updateKeyBtn();
    window.__graph = graph;
  }

  // "显示全部节点 / 仅显示小节" 切换按钮
  var detailBtn = document.getElementById("toggle-detail");
  function updateDetailBtn() {
    if (!detailBtn) return;
    detailBtn.textContent = showAll ? "全部收起" : "全部展开";
    detailBtn.classList.toggle("active", showAll);
  }
  if (detailBtn) detailBtn.addEventListener("click", function () {
    showAll = !showAll;
    rebuild();
  });

  // "只看关键抉择" 切换按钮
  var keyBtn = document.getElementById("toggle-key");
  function updateKeyBtn() {
    if (!keyBtn) return;
    keyBtn.textContent = keyOnly ? "显示完整分支" : "只看关键抉择";
    keyBtn.classList.toggle("active", keyOnly);
  }
  if (keyBtn) keyBtn.addEventListener("click", function () {
    keyOnly = !keyOnly;
    rebuild();
  });

  // "我的足迹" 切换按钮(高亮纯文本模式走过的路径)
  var footBtn = document.getElementById("toggle-foot");
  function updateFootBtn() {
    if (!footBtn) return;
    footBtn.textContent = footOn ? "隐藏足迹" : "我的足迹";
    footBtn.classList.toggle("active", footOn);
  }
  updateFootBtn();  // 默认开启时同步按钮初始态
  if (footBtn) footBtn.addEventListener("click", function () {
    footOn = !footOn;
    try { localStorage.setItem("qf_foot_on", footOn ? "1" : "0"); } catch (e) { }
    loadFoot(); // 回来可能有新足迹
    updateFootBtn();
    rebuild();
  });

  function switchView(tree, focusId) {
    var v = views.filter(function (x) { return x.tree === tree; })[0];
    if (!v) return;
    currentView = v;
    updateTabs();
    if (focusId != null) pendingFocus = focusId;
    rebuild();
  }

  /* ---------- 顶栏章节快捷按钮(树切换) ---------- */
  var quickBox = document.getElementById("chapter-quick");
  views.forEach(function (v, idx) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = v.label;
    b.dataset.view = idx;
    b.title = v.tree === "all" ? "显示全部章节树" : "查看「" + v.label + "」章节树";
    b.addEventListener("click", function () { switchView(v.tree); });
    quickBox.appendChild(b);
  });
  updateTabs();

  /* ---------- 章节定位下拉(按章节树分组排序) ---------- */
  var toc = document.getElementById("jump-toc");
  var list = data.nodes.filter(function (n) { return chapterSet[n.id] || n.endings > 0; });
  list.sort(function (a, b) {
    var ta = treeOf[a.id], tb = treeOf[b.id];
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
  list.forEach(function (n) {
    var opt = document.createElement("option");
    opt.value = n.id;
    var treeLabel = treeOf[n.id] < CHAPTERS.length ? CHAPTERS[treeOf[n.id]] : "其他";
    opt.textContent = "〔" + treeLabel + "〕" + (n.endings > 0 && !chapterSet[n.id] ? "▸ " : "") + n.name;
    toc.appendChild(opt);
  });
  toc.addEventListener("change", function () {
    gotoNode(Number(toc.value));
  });

  // 带 ?s= 访问: 切到对应章节树并定位该节点(必要时展开其所属小节)
  if (urlNodeId != null && nodeById[urlNodeId]) {
    var st0 = nodeById[urlNodeId].story;
    if (st0 != null) expanded[st0] = true;
    if (treeOf[urlNodeId] !== currentView.tree) {
      var v0 = views.filter(function (x) { return x.tree === treeOf[urlNodeId]; })[0];
      if (v0) { currentView = v0; updateTabs(); }
    }
    pendingFocus = urlNodeId;
  }

  rebuild();
}
