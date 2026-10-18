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
    return path[3:] if path.startswith("../") else path, name  # 去掉 ../ 变绝对路径


def abs_audio(f):
    path, name = resolve_audio(f)
    if not path:
        return None, name
    return path[3:] if path.startswith("../") else path, name


# ---------------------------------------------------------------- 线性化
def parse_range(evs, lo, hi, stats):
    """把 [lo,hi) 事件区间解析为节点列表 (缩进驱动, 与 build_data.parse_range 同源语义)。"""
    items = []
    i = lo
    while i < hi:
        e = evs[i]
        t = e["type"]
        ind = e["ind"]
        if t in ("narration", "dialogue"):
            node = {"t": "text", "h": fmt_text(e.get("text", ""))}
            if t == "dialogue" and e.get("speaker"):
                node["who"] = e["speaker"]
            items.append(node)
            i += 1
        elif t == "set_var":
            items.append({"t": "assign", "expr": e.get("expr", "")})
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
                opts.append({"txt": lab.get("text", ""), "body": body, "a": anchor})
                i = j
            # 消费 merge
            if i < hi and evs[i]["type"] == "merge":
                i += 1
            items.append({"t": "choice", "opts": opts})
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
                branches.append({"cond": b.get("cond", ""), "body": body})
                i = j
            items.append({"t": "cond", "branches": branches})
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
            items.append(parse_loop(body, stats))
            i = j + 1
            stats["loop"] += 1
        elif t == "jump":
            m = re.match(r"(\d+):", e.get("target", "") or "")
            to = int(m.group(1)) if m else None
            node = {"t": "jump", "to": to}
            if to in UTILITY:
                # 工具剧情(黑屏渐入/渐出/枪响等转场效果): 播放器里只是一段效果, 直接当转场跳过
                node["utility"] = True
                node["uname"] = (e.get("target") or "").split(":", 1)[-1]
            items.append(node)
            i += 1
        elif t == "game_over":
            items.append({"t": "end"})
            i += 1
        elif t == "substory":
            items.append({"t": "trans", "name": (e.get("name") or "").split(":", 1)[-1]})
            i += 1
        elif t == "show_pic":
            img, _name = abs_img(e.get("img", ""))
            if img:
                node = {"t": "pic", "img": img, "slot": str(e.get("slot", ""))}
                if "/background/" in img.lower():
                    node["bg"] = True
                items.append(node)
            i += 1
        elif t == "hide_pic":
            items.append({"t": "hide", "slot": str(e.get("slot", ""))})
            i += 1
        elif t in ("bgm",):
            f, _n = abs_audio(e.get("file", ""))
            if f:
                items.append({"t": "bgm", "f": f})
            i += 1
        elif t in ("se", "bgs"):
            f, _n = abs_audio(e.get("file", ""))
            if f:
                items.append({"t": "se", "f": f})
            i += 1
        elif t in ("bgm_fadeout",):
            items.append({"t": "bgmstop"})
            i += 1
        elif t in ("move_pic", "note", "wait", "click_wait", "shake", "flash",
                   "weather", "op", "stop_se", "bgs_fadeout"):
            i += 1  # 纯表现层/系统事件, Play 模式跳过
        elif t in ("merge", "choice", "loop_break", "loop_end"):
            i += 1  # 由上层消费, 防御性略过
        else:
            i += 1
    return items


def parse_loop(body_evs, stats):
    """循环块: 含 menu_label 则解析为调查面板, 否则按普通序列执行一次。"""
    has_menu = any(e["type"] == "menu_label" for e in body_evs)
    if not has_menu:
        return {"t": "seq", "body": parse_range(body_evs, 0, len(body_evs), stats)}
    # 调查: 前导段 + 各 menu_label 点
    pre = []
    k = 0
    while k < len(body_evs) and body_evs[k]["type"] != "menu_label":
        pre.append(body_evs[k])
        k += 1
    points = []
    while k < len(body_evs):
        e = body_evs[k]
        if e["type"] == "menu_label":
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
            points.append(pts)
            k = j
        elif e["type"] == "loop_break":
            # 循环出口之后的段落(少数情况)——并入前导尾
            k += 1
        else:
            # 点间杂项(条件尾等)忽略——调查点内容已覆盖主要文本
            k += 1
    return {"t": "invest", "pre": parse_range(pre, 0, len(pre), stats), "points": points}


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
