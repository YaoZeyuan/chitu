/* 潜伏之赤途 · 剧情速览  viewer.js */
(function () {
  "use strict";
  var D = window.PLOT_DATA;
  // ORDER 只含正式章节(排除工具剧情与拆分支线节点), 用于 TOC 与上一章/下一章
  var ORDER = Object.keys(D.stories)
    .map(Number)
    .filter(function (id) {
      return D.utility.indexOf(id) < 0 && !D.stories[id].split;
    })
    .sort(function (a, b) { return a - b; });

  var main = document.getElementById("main");
  var toc = document.getElementById("toc");
  var crumbs = document.getElementById("crumbs");
  var audio = new Audio();
  audio.loop = true;
  var activeMarkerId = null;
  var curStory = null;

  /* ---------------- URL 状态 ---------------- */
  // ?s=<storyId>&p=<id.id.id...>  p 为访问路径(含当前)，#c9-26 定位到具体选项
  function parseURL() {
    var q = new URLSearchParams(location.search);
    var s = parseInt(q.get("s"), 10);
    if (!D.stories[s] || D.utility.indexOf(s) >= 0) s = ORDER[0];
    var p = (q.get("p") || "").split(".").map(Number).filter(function (x) { return D.stories[x]; });
    if (p[p.length - 1] !== s) p.push(s);
    return { s: s, p: p, hash: location.hash.slice(1) };
  }

  function buildURL(s, p, anchor) {
    var q = new URLSearchParams();
    q.set("s", s);
    if (p && p.length) q.set("p", p.join("."));
    // 绝对路径：页面挂在 /plot 下，相对写法会被解析成 /index.html
    return "/plot?" + q.toString() + (anchor ? "#" + anchor : "");
  }

  function navigate(s, p, anchor, push) {
    var url = buildURL(s, p, anchor);
    if (push !== false) {
      // depth 记录应用内导航层数: >0 说明上一步也是本应用页面, 可安全 history.back()
      var depth = (history.state && history.state.depth) || 0;
      history.pushState({ s: s, p: p, depth: depth + 1 }, "", url);
    }
    render(s, p, anchor);
  }

  window.addEventListener("popstate", function (ev) {
    var st = ev.state;
    if (st && st.s) { render(st.s, st.p, null); return; }
    var u = parseURL();
    render(u.s, u.p, u.hash);
  });

  /* ---------------- 渲染 ---------------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var CHAPTER_CARD_RE = /^(序章|尾声|终章|第.+[章话])(\.[a-zA-Z]+)?$/;
  var CANVAS_W = 960, CANVAS_H = 540;

  function addSprite(scene, it) {
    var row = scene.querySelector(".sprites");
    if (!row) return;
    if (it.slot) {
      var old = row.querySelector('.sprite[data-slot="' + it.slot + '"]');
      if (old) old.remove();
    }
    var img;
    if (it.img) {
      img = el("img", "sprite" + (CHAPTER_CARD_RE.test(it.name || "") ? " overlay" : ""));
      img.src = it.img;
      img.alt = it.name;
      img.loading = "lazy";
    } else {
      img = el("span", "sprite pic-missing", "[缺图] " + esc(it.name));
    }
    if (it.slot) img.dataset.slot = it.slot;
    // 站位: 游戏画布 960x540, x/y 为像素偏移, w/h 为缩放百分比; 转成场景百分比保证响应式对位
    var wx = Number(it.w), hx = Number(it.h), xx = Number(it.x) || 0, yy = Number(it.y) || 0;
    var isFull = (wx >= 100 && hx >= 100 && !xx && !yy) || isNaN(wx) || isNaN(hx);
    if (!isFull) {
      img.style.left = "calc(50% + " + (xx / CANVAS_W * 100).toFixed(2) + "%)";
      img.style.top = "calc(50% + " + (yy / CANVAS_H * 100).toFixed(2) + "%)";
      img.style.width = wx.toFixed(2) + "%";
      img.style.height = hx.toFixed(2) + "%";
      img.style.transform = "translate(-50%,-50%)";
    }
    row.appendChild(img);
  }

  function renderItems(items, container, ctx) {
    items.forEach(function (it) {
      switch (it.t) {
        case "bg": {
          // 同名背景重复显示(如双槽位黑屏)不重复开新场景
          if (ctx.scene && ctx.scene.dataset.bgname === it.name) break;
          var b = el("div", "scene item" + (it.img ? "" : " noimg"));
          b.dataset.bgname = it.name || "";
          if (it.img) b.style.backgroundImage = "url('" + it.img + "')";
          b.appendChild(el("div", "sprites"));
          b.appendChild(el("span", "bg-name", "🖼 " + esc(it.name)));
          container.appendChild(b);
          ctx.scene = b;
          ctx.dirty = false;
          break;
        }
        case "pic": {
          // 全屏图(如 眼睛.png/红屏.png)在游戏里是盖住整个画面的画面切换；
          // 若此前已渲染过文本，当前场景卡早已"过期"，应新开续场景卡保证图文顺序一致
          var wx2 = Number(it.w), hx2 = Number(it.h);
          var xx2 = Number(it.x) || 0, yy2 = Number(it.y) || 0;
          var isFullPic = (wx2 >= 100 && hx2 >= 100 && !xx2 && !yy2)
            || isNaN(wx2) || isNaN(hx2);
          if (ctx.scene && ctx.scene.querySelector(".sprites") && !(isFullPic && ctx.dirty)) {
            addSprite(ctx.scene, it);
            break;
          }
          if (ctx.scene && isFullPic && ctx.dirty) {
            // 续场景卡：沿用当前背景，图片出现在其叙事位置
            var c2 = el("div", "scene item");
            c2.dataset.bgname = ctx.scene.dataset.bgname || "";
            if (ctx.scene.style.backgroundImage) {
              c2.style.backgroundImage = ctx.scene.style.backgroundImage;
            }
            c2.appendChild(el("div", "sprites"));
            c2.appendChild(el("span", "bg-name", "🖼 " + esc(c2.dataset.bgname)));
            container.appendChild(c2);
            ctx.scene = c2;
            addSprite(c2, it);
            ctx.dirty = false;
            break;
          }
          var p = el("div", "pic-inline item");
          p.innerHTML = it.img
            ? '<img src="' + it.img + '" alt="' + esc(it.name) + '" loading="lazy">'
            : '<span class="pic-missing">[缺图] ' + esc(it.name) + "</span>";
          container.appendChild(p);
          break;
        }
        case "hide": {
          // 阅读视图: hide 不改变画面(场景保留出场角色合影), 同槽位换人由 show 替换
          break;
        }
        case "text": {
          ctx.dirty = true; // 场景卡之后出现过文本, 后续全屏图应另起续场景卡
          if (it.sp) {
            container.appendChild(el("div", "txt-dlg item", '<span class="spk">【' + esc(it.sp) + "】</span>" + it.x));
          } else {
            container.appendChild(el("p", "txt-narr item", it.x));
          }
          break;
        }
        case "bgm": {
          var row = el("div", "bgm-row item");
          row.dataset.bgm = it.name || "";
          var btn = el("button", "play", "▶");
          btn.type = "button";
          btn.addEventListener("click", function () { toggleBgm(row, it.f); });
          row.appendChild(btn);
          row.appendChild(el("span", "", "♪ " + esc(it.name || "(未知BGM)")));
          if (!it.f) btn.disabled = true;
          container.appendChild(row);
          break;
        }
        case "bgmstop": {
          container.appendChild(el("div", "bgm-stop item", "♪～ 音乐淡出"));
          break;
        }
        case "cond": {
          var label = it.kind === "if" ? "如果" : it.kind === "elseif" ? "否则如果" : "否则";
          var c = el("div", "cond-line item");
          c.innerHTML = '<span class="tag">' + label + (it.cond ? "：" + esc(it.cond) : "") + "</span>";
          container.appendChild(c);
          break;
        }
        case "loopstart": container.appendChild(el("div", "loop-line item", "⎡ 循环开始 ⎤")); break;
        case "loopend": container.appendChild(el("div", "loop-line item", "⎣ 循环结束 ⎦")); break;
        case "loopbreak": container.appendChild(el("div", "loop-line item", "↺ 跳出循环")); break;
        case "jump": {
          var j = el("span", "jump-chip item", "⇒ 跳转剧情：" + esc(it.name || it.to));
          j.id = it.id;
          j.addEventListener("click", function () { gotoStory(it.to, it.id); });
          container.appendChild(j);
          break;
        }
        case "sub": {
          var s3 = el("span", "jump-chip sub-chip item", "≫ 调用子剧情：" + esc(it.name || it.to));
          s3.id = it.id;
          s3.addEventListener("click", function () { gotoStory(it.to, it.id); });
          container.appendChild(s3);
          break;
        }
        case "end": {
          var e2 = el("div", "end-block item");
          e2.id = it.id;
          e2.innerHTML = "GAME OVER<small>—— 剧终 ——</small>";
          container.appendChild(e2);
          break;
        }
        case "choice": {
          var box = el("div", "choice-box item");
          box.id = it.opts[0] && it.opts[0].id;
          box.appendChild(el("div", "cb-title", "◆ 选 项 ◆"));
          it.opts.forEach(function (o) {
            var opt = el("div", "opt");
            var head = el("div", "opt-head");
            var ob = el("button", "opt-btn", esc(o.txt || "(空选项)"));
            ob.type = "button";
            ob.addEventListener("click", function () {
              if (o.to) { gotoStory(o.to, o.id); return; }
              // 无跳转: 有独立剧情块则滚到块内(与游戏一致, 块内可含 GAME OVER),
              // 真正无独立剧情的选项才进入后续主线
              var body = opt.querySelector(".opt-body");
              if (body) body.scrollIntoView({ behavior: "smooth", block: "start" });
              else scrollNext(box);
            });
            head.appendChild(ob);
            if (o.to) {
              var toName = D.stories[o.to] ? D.stories[o.to].name : o.to;
              var badge = el("button", "opt-to", "→ " + esc(toName));
              badge.type = "button";
              badge.title = "跳转到该章节";
              badge.addEventListener("click", function () { gotoStory(o.to, o.id); });
              head.appendChild(badge);
            }
            opt.appendChild(head);
            if (o.items && o.items.length) {
              var body = el("div", "opt-body");
              renderItems(o.items, body, ctx);
              opt.appendChild(body);
            } else if (!o.to) {
              // 无独立剧情且无跳转才提示直接进入后续; 拆分支线选项由右侧按钮进入
              opt.appendChild(el("div", "opt-empty", "（此选项无独立剧情，直接进入后续）"));
            }
            box.appendChild(opt);
          });
          container.appendChild(box);
          break;
        }
      }
    });
  }

  function scrollNext(box) {
    var next = box.nextElementSibling;
    if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function gotoStory(to, anchor) {
    var u = parseURL();
    var p = u.p.slice();
    if (p[p.length - 1] !== to) p.push(to);
    navigate(to, p, null, true);
  }

  function render(sid, path, anchor) {
    var s = D.stories[sid];
    curStory = sid;
    stopBgm();
    document.title = "潜伏之赤途 · " + s.name + " · 剧情速览";
    main.innerHTML = "";

    var head = el("div", "story-head");
    head.appendChild(el("h2", "", esc(s.name)));
    if (s.split) {
      var pname = D.stories[s.parent] ? D.stories[s.parent].name : s.parent;
      head.appendChild(el("div", "meta",
        "支线节点 · 拆分自「" + esc(pname) + "」· " + s.items.length + " 段内容 · "
        + s.choices + " 个选项 · " + s.endings + " 个结局"));
    } else {
      head.appendChild(el("div", "meta",
        "章节 " + sid + " · " + s.items.length + " 段内容 · " + s.choices + " 个选项 · " + s.endings + " 个结局"));
    }
    main.appendChild(head);

    renderItems(s.items, main, { scene: null });

    // 上一章 / 下一章 (拆分支线节点不参与章节排序, 显示返回按钮)
    var nav = el("div", "page-nav");
    if (s.split) {
      var back = el("button", "btn primary", "← 返回选项所在章节");
      back.addEventListener("click", function () {
        // 优先浏览器回退(保留来路顺序); 无应用内历史(直达链接进入)才跳父章节
        if (history.state && history.state.depth > 0) { history.back(); return; }
        var u = parseURL();
        var idx = u.p.lastIndexOf(s.parent);
        var p = idx >= 0 ? u.p.slice(0, idx + 1) : [s.parent];
        navigate(s.parent, p, null, true);
      });
      nav.appendChild(back);
    } else {
      var pos = ORDER.indexOf(sid);
      var prev = el("button", "btn", pos > 0 ? "← 上一章：" + D.stories[ORDER[pos - 1]].name : "（已是第一章）");
      prev.disabled = pos <= 0;
      if (pos > 0) prev.addEventListener("click", function () { gotoStory(ORDER[pos - 1]); });
      var next = el("button", "btn primary", pos < ORDER.length - 1 ? "下一章：" + D.stories[ORDER[pos + 1]].name + " →" : "（已是最后一章）");
      next.disabled = pos >= ORDER.length - 1;
      if (pos < ORDER.length - 1) next.addEventListener("click", function () { gotoStory(ORDER[pos + 1]); });
      nav.appendChild(prev); nav.appendChild(next);
    }
    main.appendChild(nav);
    main.appendChild(el("div", "footer-note",
      '潜伏之赤途 · 剧情速览 · 由 <a href="/plot/branch">剧情分支图</a> 可查看全局结构'));

    // TOC & 面包屑
    toc.value = String(sid);
    renderCrumbs(path || []);

    if (anchor) {
      var t = document.getElementById(anchor);
      if (t) { setTimeout(function () { t.scrollIntoView({ block: "start" }); }, 60); return; }
    }
    window.scrollTo(0, 0);
  }

  function renderCrumbs(p) {
    crumbs.innerHTML = "";
    if (!p || p.length <= 1) { crumbs.style.display = "none"; return; }
    crumbs.style.display = "flex";
    crumbs.appendChild(el("span", "", "访问路径："));
    p.forEach(function (id, i) {
      if (i) crumbs.appendChild(el("span", "", "→"));
      var a = el("a", "", esc(D.stories[id] ? D.stories[id].name : id));
      a.href = "javascript:void(0)";
      a.addEventListener("click", function () {
        navigate(id, p.slice(0, i + 1), null, true);
      });
      crumbs.appendChild(a);
    });
  }

  /* ---------------- 剧情出现顺序 ---------------- */
  // 章节id≠剧情先后(如第五章id=52却发生在第六章id=46之前)。
  // 从入口按跳转/选项的出现顺序遍历得到真实剧情序, 拆分节点也作为路径中转参与遍历
  var PLOT_ORDER = (function () {
    var order = [], seen = {};
    function walk(items) {
      items.forEach(function (it) {
        if (it.t === "jump" && it.to && !seen[it.to]) {
          seen[it.to] = true; order.push(it.to);
        } else if (it.t === "choice") {
          it.opts.forEach(function (o) {
            if (o.to && !seen[o.to]) { seen[o.to] = true; order.push(o.to); }
            walk(o.items || []);
          });
        }
      });
    }
    if (D.stories[D.entry]) { seen[D.entry] = true; order.push(D.entry); }
    for (var i = 0; i < order.length; i++) walk(D.stories[order[i]].items);
    // 未被任何跳转引用的章节(防御)按 id 序补在末尾
    Object.keys(D.stories).map(Number).forEach(function (id) {
      if (!seen[id] && D.utility.indexOf(id) < 0) { seen[id] = true; order.push(id); }
    });
    return order;
  })();

  /* ---------------- TOC ---------------- */
  // 按剧情出现先后排序, 前缀序号方便定位
  ORDER.slice()
    .sort(function (a, b) { return PLOT_ORDER.indexOf(a) - PLOT_ORDER.indexOf(b); })
    .forEach(function (id, idx) {
      var s = D.stories[id];
      var o = document.createElement("option");
      o.value = id;
      o.textContent = (idx + 1) + ". " + s.name + "（" + id + "）";
      toc.appendChild(o);
    });
  toc.addEventListener("change", function () { gotoStory(parseInt(toc.value, 10)); });

  /* ---------------- BGM 控制 ---------------- */
  function toggleBgm(row, src) {
    if (activeMarkerId === row && !audio.paused) { stopBgm(); return; }
    stopBgm();
    if (audio.src.indexOf(src) < 0 || audio.error) audio.src = src;
    audio.play().then(function () {
      activeMarkerId = row;
      row.classList.add("playing");
      row.querySelector(".play").textContent = "❚❚";
    }).catch(function () { /* 加载失败静默 */ });
  }

  function stopBgm() {
    audio.pause();
    if (activeMarkerId) {
      activeMarkerId.classList.remove("playing");
      var b = activeMarkerId.querySelector(".play");
      if (b) b.textContent = "▶";
    }
    activeMarkerId = null;
  }

  document.getElementById("stop-bgm").addEventListener("click", stopBgm);

  // 滚动越过下一个 BGM 标记时暂停（不自动播放新曲）
  var scrollTimer = null;
  window.addEventListener("scroll", function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      if (!activeMarkerId || audio.paused) return;
      var rows = Array.prototype.slice.call(main.querySelectorAll(".bgm-row"));
      var lastAbove = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].getBoundingClientRect().top < 120) lastAbove = rows[i];
        else break;
      }
      if (lastAbove && lastAbove !== activeMarkerId) stopBgm();
    }, 250);
  }, { passive: true });

  /* ---------------- 启动 ---------------- */
  var u = parseURL();
  history.replaceState({ s: u.s, p: u.p, depth: 0 }, "", location.href);
  render(u.s, u.p, u.hash);
})();
