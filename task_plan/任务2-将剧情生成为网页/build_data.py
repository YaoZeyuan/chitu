# -*- coding: utf-8 -*-
"""
构建 script：把 glm-5.3-flash/game.json (橙光剧情结构化数据) 转换为网页用的 data.js
输出:
  site/plot/js/data.js  —— 速览版 + 分支图共用的数据
用法:
  python build_data.py            # 从仓库根目录或本目录运行均可
可重复运行(幂等)。
"""
import json
import os
import re
import sys
import urllib.parse
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME_JSON = os.path.join(ROOT, "glm-5.3-flash", "game.json")
GAME_RAW = os.path.join(ROOT, "glm-5.3-flash", "game_raw.json")
SITE = os.path.join(ROOT, "site")
OUT_DIR = os.path.join(SITE, "plot", "js")

# ---------------------------------------------------------------- 资源索引
def build_graphics_index():
    """basename(小写) -> [相对 site 的实际路径, ...]，按 background/half 优先排序"""
    idx = {}
    base = os.path.join(SITE, "graphics")
    for dirpath, _, files in os.walk(base):
        for f in files:
            rel = os.path.relpath(os.path.join(dirpath, f), SITE).replace("\\", "/")
            idx.setdefault(f.lower(), []).append(rel)
    prio = {"background": 0, "half": 1, "ui": 2, "other": 3, "button": 4}
    for k in idx:
        idx[k].sort(key=lambda p: (prio.get(p.split("/")[1], 9), p))
    return idx

GRAPHICS = build_graphics_index()

def resolve_img(ref):
    """'Background/轮船1.jpg' -> ('../graphics/background/%E8...jpg', '轮船1.jpg') 或 (None, name)"""
    if not ref:
        return None, None
    name = os.path.basename(ref.strip())
    hits = GRAPHICS.get(name.lower())
    if not hits:
        return None, name
    rel = hits[0]
    # 相对 site/plot/ 的路径
    encoded = "/".join(urllib.parse.quote(p) for p in rel.split("/"))
    return "../" + encoded, name

def resolve_audio(f):
    """'BGM/xxx.mp3' -> ('../audio/bgm/xxx.mp3', 'xxx.mp3')"""
    if not f:
        return None, None
    rel = f.replace("BGM/", "audio/bgm/").replace("SE/", "audio/se/")
    if not os.path.exists(os.path.join(SITE, rel)):
        return None, os.path.basename(f)
    encoded = "/".join(urllib.parse.quote(p) for p in rel.split("/"))
    return "../" + encoded, os.path.basename(f)

# ---------------------------------------------------------------- 文本处理
COLOR_RE = re.compile(r"\\c\[(\d+),(\d+),(\d+)\]")
DEFAULT_COLOR = (242, 255, 255)

def fmt_text(s):
    """橙光标记 -> HTML"""
    if not s:
        return ""
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    out, open_spans = [], 0
    pos = 0
    for m in COLOR_RE.finditer(s):
        seg = s[pos:m.start()]
        out.append(_plain(seg))
        rgb = tuple(int(x) for x in m.group(1, 2, 3))
        if rgb == DEFAULT_COLOR:
            if open_spans:
                out.append("</span>")
                open_spans -= 1
        else:
            out.append('<span style="color:rgb(%d,%d,%d)">' % rgb)
            open_spans += 1
        pos = m.end()
    out.append(_plain(s[pos:]))
    out.append("</span>" * open_spans)
    return "".join(out)

def _plain(s):
    s = s.replace("\\n", "<br>").replace("\n", "<br>")
    s = re.sub(r"\\\.+", "", s)          # \. 逐字显示标记
    s = re.sub(r"\\(\|+)", lambda m: "…" * min(len(m.group(1)), 2), s)  # \| 停顿
    s = s.replace("\\!", "")
    return s

# ---------------------------------------------------------------- 条件文本(从 raw 补)
def load_raw_cond():
    """story_id -> event_index -> 条件显示文本 (raw code 200 argv[5])"""
    raw = json.load(open(GAME_RAW, encoding="utf-8"))
    table = {}
    for sid, s in raw["stories"].items():
        m = {}
        for k, e in s["_events"].items():
            if e["Code"] == 200:
                txt = e["Argv"].get("5", "")
                if txt:
                    m[int(k)] = txt
        if m:
            table[int(sid)] = m
    return table

RAW_COND = load_raw_cond()

def cond_text(story_id, e):
    c = e.get("cond", "")
    if c in ("", "0", "1"):
        t = RAW_COND.get(story_id, {}).get(e.get("i", -1))
        if t:
            return t
    return c or ""

# ---------------------------------------------------------------- 线性化
def parse_jump_target(t):
    m = re.match(r"(\d+):(.*)", t or "")
    if not m:
        return None, t or ""
    return int(m.group(1)), m.group(2)

def parse_range(events, lo, hi, sid, stats):
    """把 [lo,hi) 事件区间线性化为 item 列表。choice 块递归。"""
    items = []
    i = lo
    while i < hi:
        e = events[i]
        t = e["type"]
        if t == "choice":
            opts = []
            while i < hi and events[i]["type"] == "choice":
                # 选项块边界: 下一个 choice / jump / game_over(含) / 区间末尾
                j = i + 1
                while j < hi:
                    tj = events[j]["type"]
                    if tj == "choice":
                        break
                    if tj in ("jump", "game_over"):
                        j += 1
                        break
                    j += 1
                block = parse_range(events, i + 1, j, sid, stats)
                to, _to_name = find_first_jump(block)
                opts.append({
                    "txt": clean_choice_text(events[i].get("text", "")),
                    "items": block,
                    "to": to,
                    "id": "c%d-%d" % (sid, events[i]["i"]),
                })
                i = j
            items.append({"t": "choice", "opts": opts})
            stats["choices"] += len(opts)
            continue
        elif t in ("narration", "dialogue"):
            items.append({"t": "text", "sp": e.get("speaker", ""), "x": fmt_text(e.get("text", ""))})
        elif t == "show_pic":
            img, name = resolve_img(e.get("img"))
            if name:
                kind = "bg" if "background" in (e.get("img") or "").lower() or (img and "/background/" in img) else "pic"
                items.append({"t": kind, "img": img, "name": name})
        elif t == "bgm":
            f, name = resolve_audio(e.get("file"))
            items.append({"t": "bgm", "f": f, "name": name})
        elif t == "bgm_fadeout":
            items.append({"t": "bgmstop"})
        elif t == "jump":
            to, to_name = parse_jump_target(e.get("target"))
            items.append({"t": "jump", "to": to, "name": to_name, "id": "j%d-%d" % (sid, e["i"])})
        elif t == "game_over":
            items.append({"t": "end", "id": "e%d-%d" % (sid, e["i"])})
            stats["endings"] += 1
        elif t == "if":
            items.append({"t": "cond", "kind": "if", "cond": cond_text(sid, e)})
        elif t == "elseif":
            items.append({"t": "cond", "kind": "elseif", "cond": cond_text(sid, e)})
        elif t == "else":
            items.append({"t": "cond", "kind": "else", "cond": ""})
        elif t == "loop_break":
            items.append({"t": "loopbreak"})
        elif t == "loop_start":
            items.append({"t": "loopstart"})
        elif t == "loop_end":
            items.append({"t": "loopend"})
        # 其余类型(wait/shake/flash/se/hide_pic/move_pic/substory/note/op/set_var/weather/loop_end) 阅读视图略过
        i += 1
    return items

def clean_choice_text(t):
    # ":[老师，不是我！...] 的剧情" -> "老师，不是我！..."
    t = re.sub(r"^\s*:\s*", "", t or "")
    t = re.sub(r"\s*的剧情\s*$", "", t)
    if t.startswith("[") and t.endswith("]"):
        t = t[1:-1]
    return t.strip()

def find_first_jump(items):
    """在选项块里找第一个 jump，返回 (story_id 或 None, 名字)"""
    for it in items:
        if it["t"] == "jump":
            return it["to"], it.get("name", "")
        if it["t"] == "choice":
            for o in it["opts"]:
                r = find_first_jump(o["items"])
                if r[0] is not None:
                    return r
    return None, ""

# ---------------------------------------------------------------- 主流程
def main():
    data = json.load(open(GAME_JSON, encoding="utf-8"))
    stories_out = {}
    edges = []
    nodes = []

    UTILITY = {3, 4, 5, 6, 47, 48, 51}  # 系统函数/黑屏渐入渐出/慢入慢出/一声枪响
    for s in data["stories"]:
        sid = s["id"]
        stats = {"choices": 0, "endings": 0}
        items = parse_range(s["events"], 0, len(s["events"]), sid, stats)
        stories_out[str(sid)] = {
            "id": sid,
            "name": s["name"],
            "items": items,
            "choices": stats["choices"],
            "endings": stats["endings"],
        }
        # 收集 jump 边
        for it in items:
            collect_edges(it, sid, edges)
        if sid not in UTILITY:
            nodes.append({
                "id": sid,
                "name": s["name"],
                "n": s["eventCount"],
                "choices": stats["choices"],
                "endings": stats["endings"],
            })

    out = {
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "entry": 1,
        "utility": sorted(UTILITY),
        "stories": stories_out,
        "graph": {"nodes": nodes, "edges": edges},
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    js = "/* 自动生成于 %s, 由 task_plan/任务2-将剧情生成为网页/build_data.py 产生, 请勿手改 */\n" % out["generated"]
    js += "window.PLOT_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(os.path.join(OUT_DIR, "data.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print("OK: site/plot/js/data.js  stories=%d nodes=%d edges=%d" % (len(stories_out), len(nodes), len(edges)))

def collect_edges(it, sid, edges):
    if it["t"] == "jump" and it.get("to"):
        edges.append({"f": sid, "t": it["to"], "i": it.get("id", ""), "l": ""})
    elif it["t"] == "choice":
        for o in it["opts"]:
            if o.get("to"):
                edges.append({"f": sid, "t": o["to"], "i": o["id"], "l": o["txt"][:20]})
            else:
                collect_edges_all(o["items"], sid, edges)

def collect_edges_all(items, sid, edges):
    for it in items:
        collect_edges(it, sid, edges)

if __name__ == "__main__":
    main()
