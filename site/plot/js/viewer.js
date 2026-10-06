/* 潜伏之赤途 · 剧情速览  viewer.js */
(function () {
  "use strict";
  var D = window.PLOT_DATA;
  var ORDER = Object.keys(D.stories)
    .map(Number)
    .filter(function (id) { return D.utility.indexOf(id) < 0; })
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
    return "index.html?" + q.toString() + (anchor ? "#" + anchor : "");
  }

  function navigate(s, p, anchor, push) {
    var url = buildURL(s, p, anchor);
    if (push !== false) history.pushState({ s: s, p: p }, "", url);
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
          break;
        }
        case "pic": {
          if (ctx.scene && ctx.scene.querySelector(".sprites")) { addSprite(ctx.scene, it); break; }
          var p = el("div", "pic-inline item");
          p.innerHTML = it.img
            ? '<img src="' + it.img + '" alt="' + esc(it.name) + '" loading="lazy">'
            : '<span class="pic-missing">[缺图] ' + esc(it.name) + "</span>";
          container.appendChild(p);
          break;
        }
        case "hide": {
          if (ctx.scene && it.slot) {
            var old = ctx.scene.querySelector('.sprite[data-slot="' + it.slot + '"]');
            if (old) old.remove();
          }
          break;
        }
        case "text": {
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
              if (o.to) gotoStory(o.to, o.id);
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
            } else {
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
    head.appendChild(el("div", "meta",
      "章节 " + sid + " · " + s.items.length + " 段内容 · " + s.choices + " 个选项 · " + s.endings + " 个结局"));
    main.appendChild(head);

    renderItems(s.items, main, { scene: null });

    // 上一章 / 下一章
    var pos = ORDER.indexOf(sid);
    var nav = el("div", "page-nav");
    var prev = el("button", "btn", pos > 0 ? "← 上一章：" + D.stories[ORDER[pos - 1]].name : "（已是第一章）");
    prev.disabled = pos <= 0;
    if (pos > 0) prev.addEventListener("click", function () { gotoStory(ORDER[pos - 1]); });
    var next = el("button", "btn primary", pos < ORDER.length - 1 ? "下一章：" + D.stories[ORDER[pos + 1]].name + " →" : "（已是最后一章）");
    next.disabled = pos >= ORDER.length - 1;
    if (pos < ORDER.length - 1) next.addEventListener("click", function () { gotoStory(ORDER[pos + 1]); });
    nav.appendChild(prev); nav.appendChild(next);
    main.appendChild(nav);
    main.appendChild(el("div", "footer-note",
      '潜伏之赤途 · 剧情速览 · 由 <a href="branch.html">剧情分支图</a> 可查看全局结构'));

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

  /* ---------------- TOC ---------------- */
  ORDER.forEach(function (id) {
    var s = D.stories[id];
    var o = document.createElement("option");
    o.value = id;
    o.textContent = s.name + "（" + id + "）";
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
  history.replaceState({ s: u.s, p: u.p }, "", location.href);
  render(u.s, u.p, u.hash);
})();
