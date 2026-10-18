/* 潜伏之赤途 · 纯文本 Play 引擎
 *
 * 设计要点:
 * - 确定性执行: 给定 初始状态+选择链(chain), 剧情走向完全可重算;
 *   回退 = 截断 chain + 从头静默重放(不渲染文本, 数值变量随之恢复)。
 * - chain 记录: [{s:故事id, k:'c'|'p', v:选项/调查点下标, t:文字, a:选项anchor}]
 *   k='c' 选项, k='p' 调查点(v=-1 表示结束调查)。
 * - 足迹(全局累计): qf_foot_story 已访问故事, qf_foot_choice 选项 anchor→已选下标,
 *   供 /plot/branch 的「我的足迹」高亮层读取。
 */
(function () {
  "use strict";

  var LS_CHAIN = "qf_play_chain";
  var LS_FOOT_S = "qf_foot_story";
  var LS_FOOT_C = "qf_foot_choice";
  var LS_MEDIA = "qf_play_media";
  var LS_RUNSTART = "qf_play_runstart";

  var DATA = null;
  var KEY_ANCHORS = {};

  var vars = {};            // 数值变量: "8" -> 5
  var frames = [];          // 执行帧栈 [{items, i, inv?, isSeq?}]
  var chain = [];           // 本局选择链
  var chainIdx = 0;         // 重放游标
  var mode = "live";        // live | replay
  var waiting = false;      // 停在文本等待点击
  var ended = false;        // 剧终
  var curStory = 0;
  var curStoryName = "";
  var mediaOn = true;
  var flowEl, stageEl, histEl, histListEl, toastEl;

  var bgmAudio = null;

  // ---------------------------------------------------------------- utils
  function $(id) { return document.getElementById(id); }
  function lsGet(k, d) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
    catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 满/隐私模式忽略 */ }
  }
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add("hidden"); }, 1800);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function scrollFlow() { flowEl.scrollTop = flowEl.scrollHeight; }
  // flow 所在容器滚动: 让最新内容可见
  function scrollWin() {
    var r = flowEl.getBoundingClientRect();
    if (r.bottom > window.innerHeight + 60) window.scrollTo(0, document.body.scrollHeight);
  }

  // ---------------------------------------------------------------- 表达式求值
  function evalExpr(expr) {
    var m = String(expr || "").match(/数值：?\[(\d+)[^\]]*\]\s*(≥|≤|＞|＜|＝|≠|>=|<=|==|!=|>|<|=)\s*(.+)$/);
    if (!m) return true; // 无法解析的条件按真处理, 保证流程不卡死
    var lv = vars[m[1]] || 0;
    var rhs = m[3].trim();
    var rm = rhs.match(/^数值：?\[(\d+)/);
    var rv = rm ? (vars[rm[1]] || 0) : (parseFloat(rhs) || 0);
    switch (m[2]) {
      case "＝": case "=": case "==": return lv === rv;
      case "≠": case "!=": return lv !== rv;
      case "≥": case ">=": case ">": return lv >= rv;
      case "≤": case "<=": return lv <= rv;
      case "＞": return lv > rv;
      case "＜": return lv < rv;
      default: return true;
    }
  }
  function applyAssign(expr) {
    var m = String(expr || "").match(/\[(\d+)[^\]]*\]\s*(=|\+|-|＋|－)\s*(.+)$/);
    if (!m) return;
    var id = m[1], op = m[2], rhs = m[3].trim();
    var rm = rhs.match(/^数值：?\[(\d+)/);
    var rv = rm ? (vars[rm[1]] || 0) : (parseFloat(rhs) || 0);
    if (op === "=") vars[id] = rv;
    else if (op === "+" || op === "＋") vars[id] = (vars[id] || 0) + rv;
    else vars[id] = (vars[id] || 0) - rv;
  }

  // ---------------------------------------------------------------- 足迹
  function footStory(sid) {
    if (mode !== "live") return;
    var f = lsGet(LS_FOOT_S, {});
    f[sid] = 1;
    lsSet(LS_FOOT_S, f);
  }
  function footChoice(anchor, idx) {
    if (mode !== "live" || !anchor) return;
    var f = lsGet(LS_FOOT_C, {});
    var arr = f[anchor] || [];
    if (arr.indexOf(idx) < 0) arr.push(idx);
    f[anchor] = arr;
    lsSet(LS_FOOT_C, f);
  }

  // ---------------------------------------------------------------- 渲染
  function appendPara(node) {
    var p = document.createElement("p");
    p.className = node.who ? "dlg" : "nar";
    if (node.who) {
      var w = document.createElement("span");
      w.className = "who";
      w.textContent = node.who;
      p.appendChild(w);
    }
    var span = document.createElement("span");
    span.innerHTML = node.h || "";
    p.appendChild(span);
    flowEl.appendChild(p);
    scrollWin();
  }
  function appendTrans(name) {
    var last = flowEl.lastElementChild;
    if (last && last.classList && (last.classList.contains("trans") || last.classList.contains("flash-text"))) return; // 连续转场只显示一个
    var d = document.createElement("div");
    d.className = "trans";
    d.textContent = "◆";
    d.title = name || "";
    flowEl.appendChild(d);
  }
  function appendPicked(txt) {
    var d = document.createElement("div");
    d.className = "picked";
    d.textContent = "▶ " + txt;
    flowEl.appendChild(d);
  }
  function clearFlow() { flowEl.innerHTML = ""; }
  function resetStage() {
    stageEl.innerHTML = "";
    stageEl.style.backgroundImage = "";
  }

  function applyMedia(node) {
    if (!mediaOn) return;
    if (node.t === "pic") {
      if (node.bg) {
        // 换场景: 旧场景的立绘全部清掉, 只保留新背景
        stageEl.querySelectorAll("img.spic").forEach(function (i) { i.remove(); });
        stageEl.style.backgroundImage = 'url("' + node.img + '")';
      } else {
        var slot = node.slot || "";
        var hit = stageEl.querySelector('img[data-slot="' + slot + '"]');
        if (hit) {
          hit.src = node.img;   // 同槽位替换, 不叠加
        } else {
          var img = document.createElement("img");
          img.className = "spic";
          img.src = node.img;
          img.dataset.slot = slot;
          stageEl.appendChild(img);
        }
      }
    } else if (node.t === "hide") {
      var hit = stageEl.querySelector('img[data-slot="' + node.slot + '"]');
      if (hit) hit.remove();
    } else if (node.t === "bgm") {
      if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
      bgmAudio = new Audio(node.f);
      bgmAudio.loop = true;
      bgmAudio.volume = 0.55;
      bgmAudio.play().catch(function () { /* 自动播放限制, 点击后恢复 */ });
    } else if (node.t === "bgmstop") {
      if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
    } else if (node.t === "se") {
      if (mediaOn) { var a = new Audio(node.f); a.volume = 0.7; a.play().catch(function () {}); }
    }
  }

  // ---------------------------------------------------------------- 执行引擎
  function startStory(sid) {
    var st = DATA.stories[sid];
    if (!st) { flowEnd(); return; }
    curStory = Number(sid);
    curStoryName = st.name;
    frames = [{ items: st.items, i: 0 }];
    footStory(curStory);
  }

  function stopBgm() { if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; } }

  function step() {
    waiting = false;
    while (frames.length) {
      var fr = frames[frames.length - 1];
      if (fr.i >= fr.items.length) {
        frames.pop();
        if (fr.inv) {
          // 调查点内容执行完毕, 回到调查面板
          if (mode === "replay") {
            if (!consumeInvestEntry(fr.inv)) return; // chain 耗尽→转live并停
          } else {
            showInvest(fr.inv);
            return;
          }
        }
        continue;
      }
      var node = fr.items[fr.i++];
      switch (node.t) {
        case "text":
          if (mode === "live") { appendPara(node); waiting = true; return; }
          break;
        case "trans":
          if (mode === "live") appendTrans(node.name);
          break;
        case "pic": case "hide": case "bgm": case "bgmstop": case "se":
          if (mode === "live") applyMedia(node);
          break;
        case "assign":
          applyAssign(node.expr);
          break;
        case "cond": {
          var chosen = node.branches[node.branches.length - 1];
          for (var bi = 0; bi < node.branches.length - 1; bi++) {
            if (evalExpr(node.branches[bi].cond)) { chosen = node.branches[bi]; break; }
          }
          frames.push({ items: chosen.body, i: 0 });
          break;
        }
        case "seq":
          frames.push({ items: node.body, i: 0, isSeq: true });
          break;
        case "break":
          while (frames.length) {
            var popped = frames.pop();
            if (popped.isSeq) break;
          }
          break;
        case "jump": {
          if (node.utility) {
            // 工具剧情(黑屏渐入渐出/枪响等): 转场效果, 不切故事
            if (mode === "live") appendTrans(node.uname || "……");
            break;
          }
          if (node.to != null && DATA.stories[node.to]) {
            startStory(node.to);
          } else { flowEnd(); return; }
          break;
        }
        case "end":
          if (mode === "replay") finishReplay();
          showEnd();
          return;
        case "choice":
          if (mode === "replay") {
            var e = chain[chainIdx];
            if (e && e.k === "c") {
              chainIdx++;
              footChoice(node.opts[e.v] ? node.opts[e.v].a : "", e.v);
              frames.push({ items: (node.opts[e.v] || { body: [] }).body, i: 0 });
              break;
            }
            finishReplay();
          }
          showChoices(node);
          return;
        case "invest":
          if (mode === "replay") {
            if (node.pre && node.pre.length) frames.push({ items: node.pre, i: 0, inv: node });
            else if (consumeInvestEntry(node)) break; else return;
            break;
          }
          if (node.pre && node.pre.length) { frames.push({ items: node.pre, i: 0, inv: node }); break; }
          showInvest(node);
          return;
        default:
          break;
      }
    }
    // 帧栈耗尽: 剧情流自然结束
    flowEnd();
  }

  // 重放中消费一条调查记录; 返回 false 表示 chain 耗尽(已切换 live 并停在调查面板)
  function consumeInvestEntry(inv) {
    var e = chain[chainIdx];
    if (e && e.k === "p") {
      chainIdx++;
      if (e.v >= 0 && inv.points[e.v]) {
        frames.push({ items: inv.points[e.v].body, i: 0, inv: inv });
        return true;
      }
      return true; // v=-1 结束调查, 回到外层继续
    }
    finishReplay();
    showInvest(inv);
    return false;
  }

  function finishReplay() {
    mode = "live";
    var badge = $("replay-badge");
    if (badge) badge.remove();
    document.body.classList.remove("replaying");
  }

  // ---------------------------------------------------------------- 交互 UI
  var pendingChoice = null;
  var pendingInvest = null;
  var pendingBox = null;
  var investVisited = {};
  function disableBox() {
    if (!pendingBox) return;
    pendingBox.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
    pendingBox = null;
  }

  function showChoices(node) {
    pendingChoice = node;
    pendingInvest = null;
    var box = document.createElement("div");
    box.className = "opts";
    pendingBox = box;
    node.opts.forEach(function (o, idx) {
      var b = document.createElement("button");
      b.innerHTML = esc(o.txt);
      if (KEY_ANCHORS[o.a]) b.innerHTML = "★ " + esc(o.txt);
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        pickChoice(idx);
      });
      box.appendChild(b);
    });
    flowEl.appendChild(box);
    scrollWin();
  }

  function pickChoice(idx) {
    if (!pendingChoice) return;
    var o = pendingChoice.opts[idx];
    disableBox();
    footStory(curStory);
    pendingChoice = null;
    chain.push({ s: curStory, k: "c", v: idx, t: o.txt, a: o.a });
    persistChain();
    footChoice(o.a, idx);
    renderHistory();
    appendPicked(o.txt);
    frames.push({ items: o.body, i: 0 });
    step();
  }

  function showInvest(node) {
    pendingInvest = node;
    pendingChoice = null;
    var box = document.createElement("div");
    box.className = "opts invest";
    pendingBox = box;
    var tip = document.createElement("div");
    tip.style.cssText = "font-size:13px;color:var(--muted);margin-bottom:4px";
    tip.textContent = "可自由调查以下地点:";
    box.appendChild(tip);
    node.points.forEach(function (p, idx) {
      var b = document.createElement("button");
      b.innerHTML = (investVisited[idx] ? "✓ " : "") + esc(p.name);
      if (investVisited[idx]) b.className = "point-visited";
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        pickInvest(idx);
      });
      box.appendChild(b);
    });
    var endBtn = document.createElement("button");
    endBtn.className = "opt-end";
    endBtn.textContent = "结束调查 →";
    endBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      pickInvest(-1);
    });
    box.appendChild(endBtn);
    flowEl.appendChild(box);
    scrollWin();
  }

  function pickInvest(idx) {
    var node = pendingInvest;
    disableBox();
    footStory(curStory);
    pendingInvest = null;
    var label = idx >= 0 ? "调查:" + node.points[idx].name : "结束调查";
    chain.push({ s: curStory, k: "p", v: idx, t: label });
    persistChain();
    renderHistory();
    appendPicked(label);
    if (idx >= 0) {
      investVisited[idx] = true;
      frames.push({ items: node.points[idx].body, i: 0, inv: node });
    }
    step();
  }

  function showEnd() {
    ended = true;
    stopBgm();
    var card = document.createElement("div");
    card.className = "endcard";
    var h = document.createElement("h2");
    h.textContent = "剧 终";
    card.appendChild(h);
    var btns = document.createElement("div");
    btns.className = "end-btns";
    mkBtn(btns, "↩ 退回上一选择", function () { back(1); });
    mkBtn(btns, "★ 退回最近关键抉择", function () { backToKey(); });
    mkBtn(btns, "⟲ 从头开始", function () { restart(); });
    mkBtn(btns, "查看分支图", function () { location.href = "/plot/branch"; });
    card.appendChild(btns);
    flowEl.appendChild(card);
    scrollWin();
  }

  function flowEnd() {
    if (mode === "replay") finishReplay();
    var card = document.createElement("div");
    card.className = "endcard";
    var h = document.createElement("h2");
    h.textContent = "本段剧情完";
    card.appendChild(h);
    var p = document.createElement("p");
    p.style.cssText = "font-size:13px;color:var(--muted)";
    p.textContent = "此处没有后续分支。可去分支图选择其他路线, 或退回之前的选择。";
    card.appendChild(p);
    var btns = document.createElement("div");
    btns.className = "end-btns";
    mkBtn(btns, "↩ 退回上一选择", function () { back(1); });
    mkBtn(btns, "查看分支图", function () { location.href = "/plot/branch?s=" + curStory; });
    card.appendChild(btns);
    flowEl.appendChild(card);
    scrollWin();
  }

  function mkBtn(parent, txt, fn) {
    var b = document.createElement("button");
    b.textContent = txt;
    b.addEventListener("click", function (ev) { ev.stopPropagation(); fn(); });
    parent.appendChild(b);
  }

  // ---------------------------------------------------------------- 回退/重开
  var runStart = 1;   // 本局开局故事: 回退重放必须从这里开始(前段 set_var 才能正确恢复)
  function persistChain() { lsSet(LS_CHAIN, chain); lsSet(LS_RUNSTART, runStart); }

  function replayAll(startSid) {
    stopBgm();
    clearFlow();
    resetStage();
    investVisited = {};
    pendingChoice = null;
    pendingInvest = null;
    ended = false;
    vars = {};
    chainIdx = 0;
    waiting = false;
    var resume = chain.length > 0;   // 有选择链才需要静默重放, 否则从头直播
    mode = resume ? "replay" : "live";
    document.body.classList.toggle("replaying", resume);
    if (resume) {
      var badge = document.createElement("div");
      badge.id = "replay-badge";
      badge.textContent = "回放中…";
      document.body.appendChild(badge);
    }
    startStory(startSid);
    step();
  }

  function back(n) {
    if (!chain.length) { toast("没有可退回的选择"); return; }
    chain = chain.slice(0, Math.max(0, chain.length - n));
    persistChain();
    renderHistory();
    replayAll(runStart);
    if (chain.length === 0) toast("已退回到起点");
    else toast("已退回 " + n + " 步");
  }

  function backToKey() {
    for (var i = chain.length - 1; i >= 0; i--) {
      if (chain[i].k === "c" && chain[i].a && KEY_ANCHORS[chain[i].a]) {
        chain = chain.slice(0, i);
        persistChain();
        renderHistory();
        replayAll(runStart);
        toast("已退回到最近的关键抉择");
        return;
      }
    }
    toast("本局还没有经过关键抉择");
  }

  function restart() {
    chain = [];
    persistChain();
    renderHistory();
    replayAll(startSid);
    toast("已重新开始");
  }

  // ---------------------------------------------------------------- 历史侧栏
  function renderHistory() {
    histListEl.innerHTML = "";
    chain.forEach(function (e, idx) {
      var li = document.createElement("li");
      if (e.k === "c" && e.a && KEY_ANCHORS[e.a]) li.className = "key";
      var a = document.createElement("a");
      var st = DATA.stories[e.s];
      var sname = st ? st.name : ("故事" + e.s);
      var s = document.createElement("span");
      s.className = "h-story";
      s.textContent = (e.k === "p" ? "🔍 " : "") + sname;
      a.appendChild(s);
      a.appendChild(document.createTextNode((e.k === "c" ? "◆ " : "") + e.t));
      a.title = "点击退回到这一步之前";
      a.addEventListener("click", function () {
        chain = chain.slice(0, idx);
        persistChain();
        renderHistory();
        replayAll(runStart);
        toast("已退回");
      });
      li.appendChild(a);
      histListEl.appendChild(li);
    });
  }

  // ---------------------------------------------------------------- 输入
  function advance() {
    if (ended) return;
    if (waiting) {
      waiting = false;
      step();
    }
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    if (ev.key === " " || ev.key === "Enter") {
      ev.preventDefault();
      advance();
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      back(1);
    }
  });

  // ---------------------------------------------------------------- 顶栏按钮
  function bindTopbar() {
    $("btn-back").addEventListener("click", function () { back(1); });
    $("btn-key").addEventListener("click", backToKey);
    $("btn-restart").addEventListener("click", restart);
    $("btn-history").addEventListener("click", function () {
      histEl.classList.toggle("hidden");
      this.classList.toggle("active");
    });
    var mediaBtn = $("btn-media");
    function paintMedia() {
      mediaBtn.textContent = mediaOn ? "🖼 媒体:开" : "🖼 媒体:关";
      mediaBtn.classList.toggle("active", mediaOn);
      $("stage-wrap").classList.toggle("hidden-stage", !mediaOn);
    }
    mediaOn = lsGet(LS_MEDIA, true);
    paintMedia();
    mediaBtn.addEventListener("click", function () {
      mediaOn = !mediaOn;
      lsSet(LS_MEDIA, mediaOn);
      paintMedia();
      if (!mediaOn) stopBgm();
    });
  }

  // ---------------------------------------------------------------- 启动
  var startSid = 1;

  function boot() {
    flowEl = $("flow");
    stageEl = $("stage");
    histEl = $("history");
    histListEl = $("hist-list");
    toastEl = $("toast");
    flowEl.addEventListener("click", function (ev) {
      if (ev.target.closest("button, a")) return;
      advance();
    });
    bindTopbar();

    DATA = window.__PLAY_DATA__;
    DATA.keyAnchors.forEach(function (a) { KEY_ANCHORS[a] = true; });

    var m = location.search.match(/[?&]s=(\d+)/);
    if (m && DATA.stories[m[1]]) {
      // 带参数: 从指定故事开新局
      startSid = Number(m[1]);
      runStart = startSid;
      chain = [];
      replayAll(runStart);
      var st = DATA.stories[startSid];
      appendTrans(st.name);
      toast("已定位到「" + st.name + "」, 开新局");
    } else {
      startSid = DATA.entry || 1;
      chain = lsGet(LS_CHAIN, []);
      if (chain.length) {
        renderHistory();
        runStart = lsGet(LS_RUNSTART, DATA.entry || 1);
        if (!DATA.stories[runStart]) runStart = DATA.entry || 1;
        replayAll(runStart);
        toast("已恢复上局进度 (" + chain.length + " 个选择)");
      } else {
        runStart = DATA.entry || 1;
        replayAll(runStart);
      }
    }
  }

  fetch("/play/js/script.json")
    .then(function (r) {
      if (!r.ok) throw new Error("script.json 加载失败: " + r.status);
      return r.json();
    })
    .then(function (d) {
      window.__PLAY_DATA__ = d;
      boot();
    })
    .catch(function (e) {
      document.body.innerHTML = "<p style='padding:40px'>剧本数据加载失败: " + esc(e.message) + "</p>";
    });
})();
