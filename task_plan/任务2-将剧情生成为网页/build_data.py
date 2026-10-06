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

def load_raw_jump2():
    """raw code 206 有两种格式:
       3 参数 {0:变量,1:值,2:'NNN:名'} = 条件跳转; 2 参数 {0:剧情号,1:'NNN:名'} = 无条件跳转。
       game.json 解析时只处理了 3 参数格式, 2 参数格式的 target 丢失, 这里按 (story, index) 补回。"""
    raw = json.load(open(GAME_RAW, encoding="utf-8"))
    table = {}
    for sid, s in raw["stories"].items():
        for k, e in s["_events"].items():
            if e["Code"] == 206 and "2" not in e["Argv"]:
                table[(int(sid), int(k))] = e["Argv"].get("1", "")
    return table

JUMP2 = load_raw_jump2()

def load_raw_choice_prompts():
    """raw code 101 = 选项UI指令, argv 数字键按序排列即全部选项文本。
    game.json 把它误解析成了一个 dialogue 事件 (speaker=选项0, text=选项1, 其余选项丢失),
    紧跟其后的 choice 事件其实是各选项的标签 (raw code 108)。
    这里按 (story, index) 补回完整选项列表, 用于: ①跳过误标的 dialogue ②校验选项组完整性。"""
    raw = json.load(open(GAME_RAW, encoding="utf-8"))
    table = {}
    for sid, s in raw["stories"].items():
        for k, e in s["_events"].items():
            if e["Code"] == 101:
                a = e["Argv"]
                table[(int(sid), int(k))] = [a[key] for key in sorted(a, key=lambda x: int(x))]
    return table

PROMPTS = load_raw_choice_prompts()

def load_raw_merge_marks():
    """raw code 102 = 选项组汇合标记 (每组恰好一个, 紧跟最后选项块之后)。
    game.json 把它整个丢掉了, 按 (story, index) 记回, 用于精确界定最后选项块的结束位置。"""
    raw = json.load(open(GAME_RAW, encoding="utf-8"))
    table = {}
    for sid, s in raw["stories"].items():
        idxs = sorted(int(k) for k, e in s["_events"].items() if e["Code"] == 102)
        if idxs:
            table[int(sid)] = idxs
    return table

MERGES = load_raw_merge_marks()

def load_pic_slots():
    """raw code 400(显示图片) 携带槽位与站位参数。
    argv[9] 格式: '槽位,?,x,y,宽%,高%,alpha' (如 '6 , ,-120 ,135 ,80% ,80% ,255')。
    game.json 丢失了这些信息, 按 (story, index) 补回, 用于速览版把立绘按原始站位合成进背景场景。"""
    raw = json.load(open(GAME_RAW, encoding="utf-8"))
    table = {}
    for sid, s in raw["stories"].items():
        for k, e in s["_events"].items():
            if e["Code"] != 400:
                continue
            a = e["Argv"]
            p9 = (a.get("9") or "").split(",")
            try:
                pos = {
                    "slot": a.get("0", ""),
                    "x": float(p9[2]) if len(p9) > 2 and p9[2].strip() else 0.0,
                    "y": float(p9[3]) if len(p9) > 3 and p9[3].strip() else 0.0,
                    "w": float(p9[4].replace("%", "")) if len(p9) > 4 and p9[4].strip() else 100.0,
                    "h": float(p9[5].replace("%", "")) if len(p9) > 5 and p9[5].strip() else 100.0,
                }
            except ValueError:
                pos = {"slot": a.get("0", ""), "x": 0.0, "y": 0.0, "w": 100.0, "h": 100.0}
            if not pos["w"] or pos["w"] <= 0:
                pos["w"] = 100.0
            if not pos["h"] or pos["h"] <= 0:
                pos["h"] = 100.0
            table[(int(sid), int(k))] = pos
    return table

PIC_SLOT = load_pic_slots()

# 工具剧情(系统函数/黑屏渐入渐出/慢入慢出/一声枪响)，不作为分支图节点与跳转目标
UTILITY = {3, 4, 5, 6, 47, 48, 51}

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

def _merge_in_gap(sid, lo_idx, hi_idx):
    """raw 索引区间 (lo_idx, hi_idx] 内是否存在 102 汇合标记"""
    for r in MERGES.get(sid, ()):
        if r > hi_idx:
            break
        if r > lo_idx:
            return True
    return False

def _group_extent(events, p, hi, sid):
    """prompt 位于 p 的选项组整体跨度, 返回组末尾(102 汇合标记)之后的下标"""
    n = len(PROMPTS[(sid, events[p]["i"])])
    i = p + 1
    while i < hi and events[i]["type"] == "note":
        i += 1
    for k in range(n):
        if k < n - 1:
            i = _scan_block_end(events, i + 1, hi, sid)
        else:
            i = _scan_last_end(events, i + 1, hi, sid)
    return i

def _scan_block_end(events, start, hi, sid):
    """非最后选项块的结束位置 = 下一个同级标签所在下标 (嵌套选项组整组跳过)"""
    j = start
    while j < hi:
        t = events[j]["type"]
        if t == "dialogue" and (sid, events[j]["i"]) in PROMPTS:
            j = _group_extent(events, j, hi, sid)
            continue
        if t == "choice":
            return j
        j += 1
    return hi

def _scan_last_end(events, start, hi, sid):
    """最后选项块的结束位置 = 102 汇合标记处。
    game.json 无 102 事件, 通过相邻事件的 raw 索引间隙判断; 嵌套选项组整组跳过。"""
    j = start
    prev_raw = events[start - 1]["i"] if start > 0 else -1
    while j < hi:
        e = events[j]
        if _merge_in_gap(sid, prev_raw, e["i"]):
            return j
        t = e["type"]
        if t == "dialogue" and (sid, e["i"]) in PROMPTS:
            j = _group_extent(events, j, hi, sid)
            prev_raw = events[j - 1]["i"] if j > 0 else -1
            continue
        if t == "choice":
            return j  # 防御: 无 prompt 的标签, 视作边界
        prev_raw = e["i"]
        j += 1
    return hi

def parse_range(events, lo, hi, sid, stats):
    """把 [lo,hi) 事件区间线性化为 item 列表。

    选项组语义(递归下降, 由 raw 结构精确驱动):
    - raw 101(选项UI) 在 game.json 中被误标为 dialogue, 此处跳过并以 choice 节点替代;
    - 其后有恰好 N=len(选项) 个 choice 标签(108), 依次为各选项;
    - 每个选项块延伸到下一个同级标签; 最后一个选项块延伸到 102 汇合标记;
    - 选项块内可嵌套更深的选项组, 按脚本顺序线性渲染。"""
    items = []
    i = lo
    while i < hi:
        e = events[i]
        t = e["type"]
        if t == "dialogue" and (sid, e["i"]) in PROMPTS:
            n = len(PROMPTS[(sid, e["i"])])
            i += 1
            while i < hi and events[i]["type"] == "note":
                i += 1
            opts = []
            for k in range(n):
                if i >= hi or events[i]["type"] != "choice":
                    break  # 数据异常防御
                lab = events[i]
                if k < n - 1:
                    j = _scan_block_end(events, i + 1, hi, sid)
                else:
                    j = _scan_last_end(events, i + 1, hi, sid)
                block = parse_range(events, i + 1, j, sid, stats)
                to, _to_name = find_first_jump(block)
                opts.append({
                    "txt": clean_choice_text(lab.get("text", "")),
                    "items": block,
                    "to": to,
                    "id": "c%d-%d" % (sid, lab["i"]),
                })
                i = j
            items.append({"t": "choice", "opts": opts})
            stats["choices"] += len(opts)
            continue
        if t == "choice":
            # 防御: 未挂靠选项组的标签 (正常数据不应出现), 单选项成组
            j = _scan_last_end(events, i, hi, sid)
            block = parse_range(events, i + 1, j, sid, stats)
            to, _to_name = find_first_jump(block)
            items.append({"t": "choice", "opts": [{
                "txt": clean_choice_text(e.get("text", "")),
                "items": block,
                "to": to,
                "id": "c%d-%d" % (sid, e["i"]),
            }]})
            stats["choices"] += 1
            i = j
            continue
        if t in ("narration", "dialogue"):
            items.append({"t": "text", "sp": e.get("speaker", ""), "x": fmt_text(e.get("text", ""))})
        elif t == "show_pic":
            img, name = resolve_img(e.get("img"))
            if name:
                kind = "bg" if "background" in (e.get("img") or "").lower() or (img and "/background/" in img) else "pic"
                it2 = {"t": kind, "img": img, "name": name}
                if kind == "pic":
                    it2.update(PIC_SLOT.get((sid, e["i"]), {"slot": "", "x": 0.0, "y": 0.0, "w": 100.0, "h": 100.0}))
                items.append(it2)
        elif t == "hide_pic":
            items.append({"t": "hide", "slot": e.get("index", "")})
        elif t == "bgm":
            f, name = resolve_audio(e.get("file"))
            items.append({"t": "bgm", "f": f, "name": name})
        elif t == "bgm_fadeout":
            items.append({"t": "bgmstop"})
        elif t == "jump":
            target = e.get("target") or JUMP2.get((sid, e["i"]), "")
            to, to_name = parse_jump_target(target)
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
