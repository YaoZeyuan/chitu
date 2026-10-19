/* 潜伏之赤途 · 纯文本 Play 引擎
 *
 * 设计要点:
 * - 确定性执行: 给定 初始状态+选择链(chain), 剧情走向完全可重算;
 *   回退/恢复进度 = 截断 chain + 从头「重建」(rebuild 模式: 全量瞬时渲染文本与媒体,
 *   观感是历史对话都在, 只是进度回到了指定分支), chain 耗尽即切回 live 直播。
 * - chain 记录: [{s:故事id, k:'c'|'p', v:选项/调查点下标, t:文字, a:选项anchor}]
 *   k='c' 选项, k='p' 调查点/问答菜单(v=-1 表示退出项)。
 * - 足迹(全局累计): qf_foot_story 已访问故事, qf_foot_choice 选项 anchor→已选下标,
 *   供 /plot/branch 的「我的足迹」高亮层读取。
 */
(function () {
  "use strict";

  // v2: 剧本结构升级(调查/问答菜单重构+数值链补全)后旧链可能与新结构错位, 直接弃用
  var LS_CHAIN = "qf_play_chain.v2";
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
  var mode = "live";        // live | rebuild (重建: 瞬时渲染历史, chain 耗尽转 live)
  var waiting = false;      // 停在文本等待点击
  var ended = false;        // 剧终
  var curStory = 0;
  var curStoryName = "";
  var mediaOn = true;
  var flowEl, stageEl, histEl, histListEl, toastEl;
  var paraTarget = null;   // 调查点文本收纳目标(面板内展开区), null 时写入对话流
  var invCur = null;       // 当前展开的调查点 {node, idx, box}

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
  // 变量 id 统一归一化为十进制整数, 避免 "09"/"9"/"009" 等填充差异导致读写错位
  function vid(s) { return parseInt(s, 10); }
  function evalExpr(expr) {
    var m = String(expr || "").match(/数值：?\[(\d+)[^\]]*\]\s*(≥|≤|＞|＜|＝|≠|>=|<=|==|!=|>|<|=)\s*(.+)$/);
    if (!m) return true; // 无法解析的条件按真处理, 保证流程不卡死
    var lv = vars[vid(m[1])] || 0;
    var rhs = m[3].trim();
    var rm = rhs.match(/^数值：?\[(\d+)/);
    var rv = rm ? (vars[vid(rm[1])] || 0) : (parseFloat(rhs) || 0);
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
    var m = String(expr || "").match(/\[(\d+)[^\]]*\]\s*(\+=|-=|＋=|－=|=|＋|－|\+|-)\s*(.+)$/);
    if (!m) return;
    var id = vid(m[1]), op = m[2], rhs = m[3].trim();
    var rm = rhs.match(/^数值：?\[(\d+)/);
    var rv = rm ? (vars[vid(rm[1])] || 0) : (parseFloat(rhs) || 0);
    // 分支图种子粘性: 故事开局的"清零初始化"不覆盖种子值,
    // 种子语义 = 「走到该节点时已累计的取值」, 后续 += 在其上累加
    if (op === "=" && rv === 0 && seedVars && seedVars[id] != null) return;
    if (op === "=" ) vars[id] = rv;
    else if (op === "+" || op === "＋" || op === "+=" || op === "＋=") vars[id] = (vars[id] || 0) + rv;
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
    var parent = paraTarget || flowEl;
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
    parent.appendChild(p);
    scrollWin();
  }
  function appendTrans(name) {
    // 转场要显示名称(枪声/黑屏渐入渐出等), 否则死亡环节剧情不完整;
    // 仅当上一条是同名转场时才去重
    var label = "── " + (name || "……") + " ──";
    var last = flowEl.lastElementChild;
    if (last && last.classList && last.classList.contains("trans") && last.textContent === label) return;
    var d = document.createElement("div");
    d.className = "trans";
    d.textContent = label;
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

  var lastBgNode = null;   // 最近一次背景图节点: 媒体从关到开时补放当前场景
  function applyMedia(node) {
    if (node.t === "pic" && node.bg) lastBgNode = node;  // 无论开关都记录, 开媒体时补放
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
    // 开局场景为空时(冷启动/?s=定位): 预应用开场直线段的第一个背景图,
    // 原游戏此时继承标题画面/上一场景的图, 不然首几段文字没有画面
    if (!stageEl.style.backgroundImage) {
      for (var k = 0; k < st.items.length; k++) {
        var n = st.items[k];
        if (n.t === "choice" || n.t === "cond" || n.t === "invest" ||
            n.t === "jump" || n.t === "end" || n.t === "break") break;
        if (n.t === "pic" && n.bg) { applyMedia(n); break; }
      }
    }
    frames = [{ items: st.items, i: 0 }];
    footStory(curStory);
  }

  function stopBgm() { if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; } }

  function step() {
    waiting = false;
    while (frames.length) {
      var fr = frames[frames.length - 1];
      if (fr.i >= fr.items.length) {
        if (fr.inv && !fr.brkDone) {
          if (!fr.anchor) frames.pop();  // 调查点/退出项体帧: 弹出后回面板
          // 调查点体执行完毕: 答案收纳到面板展开区, 不再留在对话流
          if (invCur && invCur.node === fr.inv) {
            invCur.node.answers = invCur.node.answers || {};
            invCur.node.answers[invCur.idx] = invCur.box.innerHTML;
            invCur = null;
            paraTarget = null;
          }
          // anchor 锚帧: 常驻栈上, 作为 loop_break 的截断点; 玩家操作驱动后续
          if (mode === "rebuild") {
            if (!consumeInvestEntry(fr.inv)) return; // chain 耗尽→转live并停
          } else {
            showInvest(fr.inv);
            return;
          }
        } else {
          frames.pop();
        }
        continue;
      }
      var node = fr.items[fr.i++];
      switch (node.t) {
        case "text":
          if (mode === "live") { appendPara(node); waiting = true; return; }
          appendPara(node);   // rebuild: 历史文本瞬时补齐
          break;
        case "trans":
          appendTrans(node.name);
          break;
        case "pic": case "hide": case "bgm": case "bgmstop": case "se":
          applyMedia(node);   // rebuild 也应用媒体: 退回/恢复后背景立绘不丢
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
          frames.push({ items: node.body, i: 0, isSeq: true, brk: true });
          break;
        case "break":
          // loop_break: 截断到最近的「循环边界帧」(调查面板锚帧/序列帧)并标记退出,
          // 锚帧本身保留在栈上(耗尽时按 brkDone 直接放行), 外层选择体/条件体不受影响。
          for (var fi = frames.length - 1; fi >= 0; fi--) {
            if (frames[fi].brk) {
              frames[fi].brkDone = true;
              frames[fi].i = frames[fi].items.length;  // 边界帧剩余项不再执行
              frames.length = fi + 1;
              break;
            }
          }
          if (invCur) {  // 调查中途被打断: 已有内容存为答案, 收纳状态复位
            invCur.node.answers = invCur.node.answers || {};
            invCur.node.answers[invCur.idx] = invCur.box.innerHTML;
            invCur = null;
            paraTarget = null;
          }
          break;
        case "jump": {
          if (node.utility) {
            // 工具剧情(黑屏渐入渐出/枪响等): 转场效果, 不切故事
            appendTrans(node.uname || "……");
            break;
          }
          if (node.to != null && DATA.stories[node.to]) {
            startStory(node.to);
          } else { finishReplay(); flowEnd(); return; }
          break;
        }
        case "end":
          finishReplay();
          showEnd();
          return;
        case "choice": {
          if (mode === "rebuild") {
            var e = chain[chainIdx];
            if (e && e.k === "c") {
              chainIdx++;
              var ro = node.opts[e.v] || { body: [], txt: "" };
              appendPicked(ro.txt || "");
              frames.push({ items: ro.body, i: 0 });
              if (chainIdx >= chain.length) finishReplay();
              break;
            }
            finishReplay();   // 链耗尽: 此处就是续玩点
          }
          showChoices(node);
          return;
        }
        case "invest":
          // 锚帧: pre 播完弹出面板并常驻栈上; loop_break 截断至此并标记 brkDone 放行
          frames.push({ items: node.pre || [], i: 0, inv: node, brk: true, anchor: true });
          break;
        default:
          break;
      }
    }
    // 帧栈耗尽: 剧情流自然结束
    finishReplay();
    flowEnd();
  }

  // 重建/恢复中消费一条调查或问答记录; 返回 false 表示 chain 耗尽(已切换 live 并停在面板)
  function consumeInvestEntry(inv) {
    var e = chain[chainIdx];
    if (e && e.k === "p") {
      chainIdx++;
      if (e.v >= 0 && inv.points[e.v]) {
        investVisited[e.v] = true;
        // 文本收纳到 detached 展开区, 结束后存入 answers, 由面板统一渲染
        var box = document.createElement("div");
        invCur = { node: inv, idx: e.v, box: box };
        paraTarget = box;
        frames.push({ items: inv.points[e.v].body, i: 0, inv: inv });
      } else if (e.v < 0 && inv.exit) {
        frames.push({ items: inv.exit.body, i: 0, inv: inv, isSeq: true });
      }
      if (chainIdx >= chain.length) finishReplay();
      return true;
    }
    finishReplay();
    showInvest(inv);
    return false;
  }

  function finishReplay() {
    mode = "live";
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
    // 同一次调查共用一个面板(原地刷新), 不再每次追加新面板堆积对话流
    var box;
    if (node._panel && node._panel.isConnected) {
      box = node._panel;
      box.innerHTML = "";
    } else {
      box = document.createElement("div");
      box.className = "opts invest";
      node._panel = box;
      flowEl.appendChild(box);
    }
    pendingBox = box;
    var tip = document.createElement("div");
    tip.style.cssText = "font-size:13px;color:var(--muted);margin-bottom:4px";
    tip.textContent = "可自由调查以下地点:";
    box.appendChild(tip);
    node.points.forEach(function (p, idx) {
      var b = document.createElement("button");
      b.dataset.idx = idx;
      b.innerHTML = (investVisited[idx] ? "✓ " : "") + esc(p.name);
      if (investVisited[idx]) { b.className = "point-visited"; b.disabled = true; }  // 已调查过: 禁止重复
      else {
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          pickInvest(idx);
        });
      }
      box.appendChild(b);
      // 已调查的点: 答案展开在选项下方
      if (investVisited[idx] && node.answers && node.answers[idx]) {
        var ans = document.createElement("div");
        ans.className = "invest-answer";
        ans.innerHTML = node.answers[idx];
        box.appendChild(ans);
      }
    });
    var endBtn = document.createElement("button");
    endBtn.className = "opt-end";
    if (node.exit) {
      endBtn.innerHTML = "✦ " + esc(node.exit.name);
      endBtn.title = "问完所有问题后才可离开, 否则会被劝回";
    } else {
      endBtn.textContent = "结束调查 →";
    }
    endBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      pickInvest(-1);
    });
    box.appendChild(endBtn);
    scrollWin();
  }

  function pickInvest(idx) {
    var node = pendingInvest;
    disableBox();
    footStory(curStory);
    pendingInvest = null;
    if (idx >= 0) {
      investVisited[idx] = true;
      var label = "调查:" + node.points[idx].name;
      chain.push({ s: curStory, k: "p", v: idx, t: label });
      persistChain();
      renderHistory();
      // 答案展开区: 插在刚点的选项下方, 该点文本收纳于此
      var box = document.createElement("div");
      box.className = "invest-answer";
      var btn = node._panel && node._panel.querySelector('button[data-idx="' + idx + '"]');
      if (btn) btn.insertAdjacentElement("afterend", box);
      invCur = { node: node, idx: idx, box: box };
      paraTarget = box;
      frames.push({ items: node.points[idx].body, i: 0, inv: node });
    } else {
      paraTarget = null;
      var label2 = node.exit ? node.exit.name : "结束调查";
      chain.push({ s: curStory, k: "p", v: -1, t: label2 });
      persistChain();
      renderHistory();
      if (node.exit) {
        // 问答菜单的退出项: 体内条件决定放行(loop_break)或劝回(回到面板)
        frames.push({ items: node.exit.body, i: 0, inv: node, isSeq: true });
      }
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
    finishReplay();
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
  var seedVars = null; // 分支图带来的初始变量(?v=9:8,10:1), 仅新局生效, 回退重建不受影响
  function persistChain() { lsSet(LS_CHAIN, chain); lsSet(LS_RUNSTART, runStart); }

  function replayAll(startSid, forceLive) {
    stopBgm();
    clearFlow();
    resetStage();
    investVisited = {};
    pendingChoice = null;
    pendingInvest = null;
    ended = false;
    vars = {};
    var resume = chain.length > 0;   // 有选择链: rebuild 重建历史; 无链: 从头直播
    mode = resume ? "rebuild" : "live";
    if (seedVars && !resume) {
      Object.keys(seedVars).forEach(function (k) { vars[k] = seedVars[k]; });
      appendSeedNote();
    }
    chainIdx = 0;
    waiting = false;
    startStory(startSid);
    step();
  }

  // 分支图初始变量提示(变量名来自 branch_vars.json, 加载失败则显示编号)
  function appendSeedNote() {
    var meta = window.__VARS_META__ || {};
    var parts = Object.keys(seedVars).map(function (k) {
      return (meta[k] ? meta[k].n : "变量#" + k) + " = " + seedVars[k];
    });
    var d = document.createElement("div");
    d.className = "seed-note";
    d.textContent = "⚑ 分支图初始变量: " + parts.join(" · ");
    flowEl.appendChild(d);
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
    replayAll(startSid, true);
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
      else if (lastBgNode) applyMedia(lastBgNode);  // 后开媒体: 补放当前场景背景
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
      // 带参数: 从指定故事开新局; ?v=9:8,10:1 设定初始变量(来自 /plot/branch 节点详情)
      startSid = Number(m[1]);
      runStart = startSid;
      chain = [];
      var mv = decodeURIComponent(location.search).match(/[?&]v=([\d:,]+)/);
      if (mv) {
        seedVars = {};
        mv[1].split(",").forEach(function (p) {
          var kv = p.split(":");
          var vId = parseInt(kv[0], 10), vVal = parseInt(kv[1], 10);
          if (!isNaN(vId) && !isNaN(vVal)) seedVars[vId] = vVal;
        });
      }
      replayAll(runStart, true);
      var st = DATA.stories[startSid];
      appendTrans(st.name);
      toast("已定位到「" + st.name + "」, 开新局" +
        (seedVars ? "(已设 " + Object.keys(seedVars).length + " 项初始变量)" : ""));
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
        replayAll(runStart, true);
      }
    }
  }

  // no-cache: 剧本数据更新后浏览器必须重新协商, 避免玩到旧剧本
  Promise.all([
    fetch("/play/js/script.json?v=20261019b", { cache: "no-cache" }),
    fetch("/plot/js/branch_vars.json?v=20261019b", { cache: "no-cache" })
      .catch(function () { return null; }),
  ])
    .then(function (rs) {
      var r = rs[0];
      if (!r.ok) throw new Error("script.json 加载失败: " + r.status);
      return Promise.all([r.json(), rs[1] && rs[1].ok ? rs[1].json() : null]);
    })
    .then(function (out) {
      window.__PLAY_DATA__ = out[0];
      if (out[1]) window.__VARS_META__ = out[1].vars || {};
      boot();
    })
    .catch(function (e) {
      document.body.innerHTML = "<p style='padding:40px'>剧本数据加载失败: " + esc(e.message) + "</p>";
    });
})();
