# -*- coding: utf-8 -*-
"""
构建 script：把 glm-5.3-flash/game.json (橙光剧情结构化数据) 转换为网页用的 data.js
输出:
  site/plot/js/data.js  —— 速览版 + 分支图共用的数据
用法:
  python build_data.py            # 从仓库根目录或本目录运行均可
可重复运行(幂等)。

game.json 由 rebuild_game_json.py 从 game_raw.json 重建 (2026-10-07 起):
  - 选项组以 choice_prompt(带全部选项文本) + 连续 choice(标签) + merge(汇合) 表达;
  - 事件带 ind (引擎原始 Indent 嵌套层级), 选项块边界由层级判定;
  - jump 的 2 参数/3 参数格式均已还原 target;
  - show_pic/move_pic 携带槽位与站位 (x,y,w,h,alpha, 画布 960x540);
  - if/elseif 的 cond 即条件展示文本。
本脚本不再读取 game_raw.json 打补丁。
"""
import json
import os
import re
import sys
import urllib.parse
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME_JSON = os.path.join(ROOT, "glm-5.3-flash", "game.json")
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
    rel = f.replace("BGM/", "audio/bgm/").replace("SE/", "audio/se/").replace("BGS/", "audio/se/")
    if not os.path.exists(os.path.join(SITE, rel)):
        return None, os.path.basename(f)
    encoded = "/".join(urllib.parse.quote(p) for p in rel.split("/"))
    return "../" + encoded, os.path.basename(f)

# ---------------------------------------------------------------- 文本处理
COLOR_RE = re.compile(r"\\c\[(\d+),(\d+),(\d+)\]")
DEFAULT_COLOR = (242, 255, 255)

def soften_for_light_bg(r, g, b):
    """游戏原色是为深色背景设计的(如纯黄)。
    适配浅色阅读底：保留色相，压低亮度/饱和度，保证可读。"""
    import colorsys
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    l = min(l, 0.34)
    s = min(s, 0.80)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return "#%02x%02x%02x" % (round(r2 * 255), round(g2 * 255), round(b2 * 255))

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
            out.append('<span style="color:%s">' % soften_for_light_bg(*rgb))
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

# 工具剧情(系统函数/黑屏渐入渐出/慢入慢出/一声枪响)，不作为分支图节点与跳转目标
UTILITY = {3, 4, 5, 6, 47, 48, 51}

# ---------------------------------------------------------------- 线性化
def parse_jump_target(t):
    m = re.match(r"(\d+):(.*)", t or "")
    if not m:
        return None, t or ""
    return int(m.group(1)), m.group(2)

def parse_range(events, lo, hi, sid, stats):
    """把 [lo,hi) 事件区间线性化为 item 列表。

    选项组语义 (引擎 Indent 层级驱动, 由 rebuild_game_json.py 结构自检保证):
    - choice_prompt 位于层级 I, 携带全部 N 个选项文本;
    - 其后恰好 N 个 choice 标签位于层级 I+1, 依次为各选项;
    - 每个选项块 = 标签之后、首个层级 <= I+1 的事件之前的区间
      (下一同级标签或汇合标记 merge 均满足该条件, 嵌套选项组整块含于其中);
    - 消费完全部标签后应遇到 merge (层级 I), 消费之。"""
    items = []
    i = lo
    while i < hi:
        e = events[i]
        t = e["type"]
        if t == "choice_prompt":
            n = len(e["opts"])
            i += 1
            opts = []
            for _k in range(n):
                if i >= hi or events[i]["type"] != "choice":
                    break  # 数据异常防御(rebuild 自检已保证不会发生)
                lab = events[i]
                j = i + 1
                while j < hi and events[j]["ind"] > lab["ind"]:
                    j += 1
                block = parse_range(events, i + 1, j, sid, stats)
                to, _to_name = find_first_jump(block)
                opts.append({
                    "txt": lab.get("text", ""),
                    "items": block,
                    "to": to,
                    "id": "c%d-%d" % (sid, lab["i"]),
                })
                i = j
            if i < hi and events[i]["type"] == "merge":
                i += 1
            items.append({"t": "choice", "opts": opts})
            stats["choices"] += len(opts)
            continue
        if t == "choice":
            # 防御: 未挂靠选项组的标签 (正常数据不应出现), 单选项成组
            j = i + 1
            while j < hi and events[j]["ind"] > e["ind"]:
                j += 1
            block = parse_range(events, i + 1, j, sid, stats)
            to, _to_name = find_first_jump(block)
            items.append({"t": "choice", "opts": [{
                "txt": e.get("text", ""),
                "items": block,
                "to": to,
                "id": "c%d-%d" % (sid, e["i"]),
            }]})
            stats["choices"] += 1
            i = j
            continue
        if t == "narration":
            items.append({"t": "text", "sp": "", "x": fmt_text(e.get("text", ""))})
        elif t == "show_pic":
            img, name = resolve_img(e.get("img"))
            if name:
                kind = "bg" if "background" in (e.get("img") or "").lower() or (img and "/background/" in img) else "pic"
                it2 = {"t": kind, "img": img, "name": name}
                if kind == "pic":
                    it2.update({"slot": e.get("slot", ""), "x": e.get("x", 0.0), "y": e.get("y", 0.0),
                                "w": e.get("w", 100.0), "h": e.get("h", 100.0)})
                items.append(it2)
        elif t == "hide_pic":
            items.append({"t": "hide", "slot": e.get("index", "")})
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
            items.append({"t": "cond", "kind": "if", "cond": e.get("cond", "")})
        elif t == "elseif":
            items.append({"t": "cond", "kind": "elseif", "cond": e.get("cond", "")})
        elif t == "else":
            items.append({"t": "cond", "kind": "else", "cond": ""})
        elif t == "loop_break":
            items.append({"t": "loopbreak"})
        elif t == "loop_start":
            items.append({"t": "loopstart"})
        elif t == "loop_end":
            items.append({"t": "loopend"})
        # 其余类型(wait/se/bgs/move_pic/substory/note/click_wait/merge/menu_label/
        # set_var/weather/shake/flash/op/bgs_fadeout/stop_se) 阅读视图略过
        i += 1
    return items

def find_first_jump(items):
    """在选项块里找第一个有效 jump(跳过工具剧情目标)，返回 (story_id 或 None, 名字)。
    命中的 jump 会被标记 used——它已由选项的 to 边代表, collect_edges 不再重复收集。"""
    for it in items:
        if it["t"] == "jump":
            if it.get("to") in UTILITY:
                continue
            it["used"] = True
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

    # 边去重: 不同选项组中的同名选项跳同一目标时只保留一条
    seen_edge = set()
    dedup = []
    for e in edges:
        k = (e["f"], e["t"], e["l"])
        if k in seen_edge:
            continue
        seen_edge.add(k)
        dedup.append(e)
    edges = dedup

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
    if it["t"] == "jump" and it.get("to") and it["to"] not in UTILITY and not it.get("used"):
        edges.append({"f": sid, "t": it["to"], "i": it.get("id", ""), "l": ""})
    elif it["t"] == "choice":
        for o in it["opts"]:
            if o.get("to") and o["to"] not in UTILITY:
                edges.append({"f": sid, "t": o["to"], "i": o["id"], "l": o["txt"][:20]})
            # 无论选项自身是否有跳转, 都继续深入其块内收集嵌套选项组的边
            collect_edges_all(o["items"], sid, edges)

def collect_edges_all(items, sid, edges):
    for it in items:
        collect_edges(it, sid, edges)

if __name__ == "__main__":
    main()
