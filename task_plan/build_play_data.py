# -*- coding: utf-8 -*-
"""构建纯文本 Play 模式的剧本数据: glm-5.3-flash/game.json -> public/play/js/script.json

与 build_data.py (branch 图) 的区别:
- 保留 set_var(数值赋值) 与 menu_label(调查点)——data.js 丢失了这两类, Play 引擎靠它们才能正确求值分支;
- 保留媒体事件(pic/bgm/se)与转场(substory), 供「立绘/BGM 开关」;
- 选项块/条件块/循环块解析为嵌套 body, 引擎按帧执行;
- 附带 keyAnchors: llm_curated 标记的关键抉择对应的选项 anchor(c{sid}-{tpos}),
  供「退回最近关键抉择」与 branch 图足迹层使用。

用法: python build_play_data.py
"""
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
BUILD_DIR = os.path.join(ROOT, "task_plan", "任务2-将剧情生成为网页")
sys.path.insert(0, BUILD_DIR)
# 复用 build_data 的文本/资源处理
from build_data import (  # noqa: E402
    GRAPHICS, fmt_text, resolve_audio, resolve_img,
)

GAME_JSON = os.path.join(ROOT, "glm-5.3-flash", "game.json")
BRANCHES = os.path.join(ROOT, "public", "plot", "js", "branches.json")
CURATED = os.path.join(ROOT, "public", "plot", "js", "llm_curated.json")
OUT = os.path.join(ROOT, "public", "play", "js", "script.json")

# 工具剧情(系统函数/黑屏渐入渐出/一声枪响等), 与 build_data.py 保持一致
UTILITY = {3, 4, 5, 6, 47, 48, 51}


def abs_img(ref):
    """'Background/轮船1.jpg' -> ('/graphics/background/%E8...jpg', '轮船1.jpg')"""
    path, name = resolve_img(ref)
    if not path:
        return None, name
    return "/" + (path[3:] if path.startswith("../") else path), name


def abs_audio(f):
    path, name = resolve_audio(f)
    if not path:
        return None, name
    return "/" + (path[3:] if path.startswith("../") else path), name


# ---------------------------------------------------------------- 线性化
def parse_range(evs, lo, hi, stats):
    """把 [lo,hi) 事件区间解析为节点列表 (缩进驱动, 与 build_data.parse_range 同源语义)。
    每个节点附带 src=源事件索引, 供完整性审计(set_var 覆盖率等)。"""
    items = []
    i = lo
    while i < hi:
        e = evs[i]
        t = e["type"]
        ind = e["ind"]
        if t in ("narration", "dialogue"):
            node = {"t": "text", "h": fmt_text(e.get("text", "")), "src": e["i"]}
            if t == "dialogue" and e.get("speaker"):
                node["who"] = e["speaker"]
            items.append(node)
            i += 1
        elif t == "set_var":
            items.append({"t": "assign", "expr": e.get("expr", ""), "src": e["i"]})
            i += 1
        elif t == "choice_prompt":
            n = len(e["opts"])
            i += 1
            opts = []
            for _k in range(n):
                if i >= hi or evs[i]["type"] != "choice":
                    break
                lab = evs[i]
                anchor = "c%s-%s" % (lab.get("sid", ""), lab.get("i"))
                j = i + 1
                while j < hi and evs[j]["ind"] > lab["ind"]:
                    j += 1
                body = parse_range(evs, i + 1, j, stats)
                opts.append({"txt": lab.get("text", ""), "body": body, "a": anchor, "src": lab["i"]})
                i = j
            # 消费 merge
            if i < hi and evs[i]["type"] == "merge":
                i += 1
            items.append({"t": "choice", "opts": opts, "src": e["i"]})
            stats["choice"] += 1
        elif t in ("if", "elseif", "else"):
            # 收集同层 if/elseif/else 链
            branches = []
            while i < hi and evs[i]["type"] in ("if", "elseif", "else") and evs[i]["ind"] == ind:
                b = evs[i]
                j = i + 1
                while j < hi and evs[j]["ind"] > ind:
                    j += 1
                body = parse_range(evs, i + 1, j, stats)
                branches.append({"cond": b.get("cond", ""), "body": body, "src": b["i"]})
                i = j
            items.append({"t": "cond", "branches": branches, "src": e["i"]})
            stats["cond"] += 1
        elif t == "loop_start":
            # 找配对 loop_end (同缩进)
            depth = 0
            j = i + 1
            while j < hi:
                if evs[j]["type"] == "loop_start" and evs[j]["ind"] == ind:
                    depth += 1
                elif evs[j]["type"] == "loop_end" and evs[j]["ind"] == ind:
                    if depth == 0:
                        break
                    depth -= 1
                j += 1
            body = evs[i + 1:j]
            items.append(parse_loop(body, stats, e["i"]))
            i = j + 1
            stats["loop"] += 1
        elif t == "jump":
            # jump 可携带 var/val 隐式赋值(跳转同时记一个标志变量, 原游戏 Code 206)
            if e.get("var"):
                items.append({"t": "assign",
                              "expr": "[%03d] = %s" % (int(e["var"]), e.get("val", "0")),
                              "src": e["i"]})
            m = re.match(r"(\d+):", e.get("target", "") or "")
            to = int(m.group(1)) if m else None
            node = {"t": "jump", "to": to, "src": e["i"]}
            if to in UTILITY:
                # 工具剧情(黑屏渐入/渐出/枪响等转场效果): 播放器里只是一段效果, 直接当转场跳过
                node["utility"] = True
                node["uname"] = (e.get("target") or "").split(":", 1)[-1]
            items.append(node)
            i += 1
        elif t == "game_over":
            items.append({"t": "end", "src": e["i"]})
            i += 1
        elif t == "substory":
            items.append({"t": "trans", "name": (e.get("name") or "").split(":", 1)[-1], "src": e["i"]})
            i += 1
        elif t == "show_pic":
            img, _name = abs_img(e.get("img", ""))
            if img:
                node = {"t": "pic", "img": img, "slot": str(e.get("slot", "")), "src": e["i"]}
                if "/background/" in img.lower():
                    node["bg"] = True
                items.append(node)
            i += 1
        elif t == "hide_pic":
            items.append({"t": "hide", "slot": str(e.get("slot", "")), "src": e["i"]})
            i += 1
        elif t in ("bgm",):
            f, _n = abs_audio(e.get("file", ""))
            if f:
                items.append({"t": "bgm", "f": f, "src": e["i"]})
            i += 1
        elif t in ("se", "bgs"):
            f, _n = abs_audio(e.get("file", ""))
            if f:
                items.append({"t": "se", "f": f, "src": e["i"]})
            i += 1
        elif t in ("bgm_fadeout",):
            items.append({"t": "bgmstop", "src": e["i"]})
            i += 1
        elif t in ("move_pic", "note", "wait", "click_wait", "shake", "flash",
                   "weather", "op", "stop_se", "bgs_fadeout"):
            i += 1  # 纯表现层/系统事件, Play 模式跳过
        elif t == "loop_break":
            items.append({"t": "break", "src": e["i"]})
            i += 1
        elif t in ("merge", "choice", "loop_end"):
            i += 1  # 由上层消费, 防御性略过
        else:
            i += 1
    return items


def parse_loop(body_evs, stats, src=None):
    """循环块: menu_label→调查面板; choice_prompt→可重复问答菜单(选完跳回菜单头,
    由退出项体内的条件+loop_break 决定能否离开); 否则普通序列执行一次。"""
    has_menu = any(e["type"] == "menu_label" for e in body_evs)
    cp = next((k for k, e in enumerate(body_evs) if e["type"] == "choice_prompt"), None)
    if not has_menu and cp is None:
        return {"t": "seq", "body": parse_range(body_evs, 0, len(body_evs), stats), "src": src}
    if has_menu:
        return _parse_menu_label(body_evs, stats, src)
    return _parse_ask_menu(body_evs, cp, stats, src)


def _parse_menu_label(body_evs, stats, src=None):
    # 调查: 前导段 + 各 menu_label 点; 点间杂项(状态更新/时间推进/出口门控等)
    # 整段并入前一个调查点, 保证原游戏每次调查后的数值结算不被丢弃。
    pre = []
    k = 0
    while k < len(body_evs) and body_evs[k]["type"] != "menu_label":
        pre.append(body_evs[k])
        k += 1
    points = []
    while k < len(body_evs):
        e = body_evs[k]
        if e["type"] != "menu_label":
            k += 1  # 防御: 首个 menu_label 之前的裸杂项已在 pre
            continue
        name = (e.get("text") or "").strip()
        j = k + 1
        while j < len(body_evs):
            t2 = body_evs[j]["type"]
            ind2 = body_evs[j]["ind"]
            if (t2 == "menu_label") or (t2 in ("loop_break", "loop_end") and ind2 <= e["ind"]) \
                    or (t2 in ("if", "elseif", "else") and ind2 <= e["ind"]):
                break
            j += 1
        pts = {"name": name, "body": parse_range(body_evs, k + 1, j, stats)}
        # 点间杂项: 从 j 到下一个 menu_label(或循环体尾)整段解析, 并入本点
        j2 = j
        while j2 < len(body_evs) and body_evs[j2]["type"] != "menu_label":
            j2 += 1
        if j2 > j:
            pts["body"].extend(parse_range(body_evs, j, j2, stats))
        points.append(pts)
        k = j2
    stats["invest"] += 1
    return {"t": "invest", "pre": parse_range(pre, 0, len(pre), stats), "points": points,
            "exit": None, "src": src}


def _has_loop_break(items):
    for it in items:
        if it["t"] == "break":
            return True
        for kk in ("body", "pre"):
            if it.get(kk) and _has_loop_break(it[kk]):
                return True
        for b in it.get("branches", []):
            if _has_loop_break(b.get("body") or []):
                return True
    return False


def _parse_ask_menu(body_evs, cp, stats, src=None):
    """choice_prompt 菜单循环 → invest 节点。
    退出项 = 体内含 loop_break 的选项(原游戏的'我没有问题了'), 其条件门控原样保留。"""
    pre = parse_range(body_evs, 0, cp, stats)
    cp_ev = body_evs[cp]
    k = cp + 1
    opts = []
    for _k in range(len(cp_ev["opts"])):
        if k >= len(body_evs) or body_evs[k]["type"] != "choice":
            break
        lab = body_evs[k]
        anchor = "c%s-%s" % (lab.get("sid", ""), lab.get("i"))
        j = k + 1
        while j < len(body_evs) and body_evs[j]["ind"] > lab["ind"]:
            j += 1
        body = parse_range(body_evs, k + 1, j, stats)
        opts.append({"txt": lab.get("text", ""), "body": body, "a": anchor, "src": lab["i"]})
        k = j
    exit_opt = None
    points = []
    for o in opts:
        if exit_opt is None and _has_loop_break(o["body"]):
            exit_opt = {"name": o["txt"], "body": o["body"]}
        else:
            points.append({"name": o["txt"], "body": o["body"]})
    # 菜单选项之后的残留事件(merge/出口后结算等): 并入退出项尾部(原游戏 loop 出口后执行)
    if k < len(body_evs):
        post = parse_range(body_evs, k, len(body_evs), stats)
        if post:
            if exit_opt is not None:
                exit_opt["body"].extend(post)
            elif points:
                points[-1]["body"].extend(post)
    stats["invest"] += 1
    return {"t": "invest", "pre": pre, "points": points, "exit": exit_opt, "src": src}


def main():
    g = json.load(open(GAME_JSON, encoding="utf-8"))
    stories_out = {}
    stats = {"choice": 0, "cond": 0, "loop": 0, "invest": 0, "text": 0, "assign": 0}
    for s in g["stories"]:
        sid = str(s["id"])
        evs = []
        for e in s["events"]:
            e2 = dict(e)
            e2["sid"] = sid
            evs.append(e2)
        body = parse_range(evs, 0, len(evs), stats)
        stories_out[sid] = {"id": int(sid), "name": s.get("name") or "", "items": body}
    for st in stories_out.values():
        _count(st["items"], stats)

    # keyAnchors: llm_curated key 节点 -> beats 的 choice anchor
    key_anchors = []
    try:
        br = json.load(open(BRANCHES, encoding="utf-8"))
        cu = json.load(open(CURATED, encoding="utf-8"))
        for n in br["nodes"]:
            v = cu.get(str(n["id"]))
            if isinstance(v, list) and len(v) > 1 and v[1] and n.get("beat") and n.get("anchor"):
                key_anchors.append(n["anchor"])
    except Exception as ex:
        print("warn: keyAnchors 提取失败", ex)

    out = {"entry": 1, "stories": stories_out, "keyAnchors": sorted(set(key_anchors))}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT)
    print("stories=%d text=%d choice=%d cond=%d loop=%d assign-events ok" % (
        len(stories_out), stats["text"], stats["choice"], stats["cond"], stats["loop"]))
    print("keyAnchors=%d  script.json=%.1f MB" % (len(key_anchors), size / 1048576))


def _count(items, stats):
    for it in items:
        t = it["t"]
        if t == "text":
            stats["text"] += 1
        elif t == "assign":
            stats["assign"] += 1
        elif t == "invest":
            stats["invest"] += 1
        elif t in ("choice", "cond", "seq"):
            for o in it.get("opts", []):
                _count(o.get("body") or [], stats)
            for b in it.get("branches", []):
                _count(b.get("body") or [], stats)
            if it.get("pre"):
                _count(it["pre"], stats)
            for p in it.get("points", []):
                _count(p.get("body") or [], stats)
            _count(it.get("body") or [], stats)


if __name__ == "__main__":
    main()
