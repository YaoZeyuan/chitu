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
SITE = os.path.join(ROOT, "public")  # 2026-10-10: site/ 已改名 public/
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

# 选项嵌套超过此深度(层级>3)的选项块拆为独立故事节点, 方便浏览
SPLIT_DEPTH = 3
SPLIT_ID_BASE = 1000  # 拆分节点 id 从 1001 起, 避开真实章节 1-66

# ---------------------------------------------------------------- 深嵌套拆分
def _count_items(items):
    """统计块内选项数与结局数"""
    ch = en = 0
    for it in items:
        if it["t"] == "choice":
            for o in it["opts"]:
                ch += 1
                c, e = _count_items(o.get("items") or [])
                ch += c
                en += e
        elif it["t"] == "end":
            en += 1
    return ch, en

def _clear_used(items):
    """清除块内 jump 的 used 标记——拆分后这些 jump 的图边改由原故事收集"""
    for it in items:
        if it["t"] == "jump":
            it.pop("used", None)
        elif it["t"] == "choice":
            for o in it["opts"]:
                _clear_used(o.get("items") or [])

def _has_nav(items):
    """块内是否含跳转或选项(点击后有后续导航)。
    纯展示块(仅文本/图片/音乐/结局)无论多深都不拆分, 原地展示。"""
    for it in items:
        if it["t"] in ("jump", "choice"):
            return True
    return False

def split_deep(items, depth, sid, story_name, stories_out, extract_ids,
               counter, extracted_blocks, dup_names):
    """递归遍历 items, 把深度 > SPLIT_DEPTH 且含后续导航的选项块抽成独立故事节点。

    depth: 当前 items 的嵌套深度(顶层=1), choice 选项块深度 = depth+1。
    被抽出的块整体搬入新节点(其中更深的嵌套随节点整体下降, 无需再拆),
    原选项就地替换为指向新节点的跳转(o.to=nid, o.items 清空, o.split 标记)。
    命名: 父节点名-选项文本 (父节点为章节时即 章节名-选项, 嵌套再拆则为
    章节-上级选项-选项 的链式格式); 重名追加 -1/-2/-3 序号。"""
    for it in items:
        if it["t"] != "choice":
            continue
        for o in it["opts"]:
            blk = o.get("items") or []
            if depth + 1 > SPLIT_DEPTH and blk and _has_nav(blk):
                counter[0] += 1
                nid = SPLIT_ID_BASE + counter[0]
                name = story_name + "-" + (o.get("txt") or "选项")
                dup = dup_names.get(name, 0)
                dup_names[name] = dup + 1
                if dup:
                    name += "-%d" % dup
                ch, en = _count_items(blk)
                _clear_used(blk)
                stories_out[str(nid)] = {
                    "id": nid, "name": name, "split": True, "parent": sid,
                    "items": blk, "choices": ch, "endings": en,
                }
                extract_ids.add(nid)
                extracted_blocks.append((sid, blk))
                o["to"] = nid
                o["items"] = []
                o["split"] = True
            else:
                split_deep(blk, depth + 1, sid, story_name, stories_out,
                           extract_ids, counter, extracted_blocks, dup_names)

def extract_names(stories_out):
    return {v["name"] for v in stories_out.values() if v.get("split")}

# ---------------------------------------------------------------- 线性化
def parse_jump_target(t):
    m = re.match(r"(\d+):(.*)", t or "")
    if not m:
        return None, t or ""
    return int(m.group(1)), m.group(2)

def parse_range(events, lo, hi, sid, stats, in_choice=False):
    """把 [lo,hi) 事件区间线性化为 item 列表。

    in_choice: 当前是否在选项块内(用于区分直接结局/选项块内结局,
    剧终节点判定只看顶层直接结局, 选项块内结局由分支图合成节点表达)。

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
                block = parse_range(events, i + 1, j, sid, stats, True)
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
            items.append({"t": "choice", "opts": opts, "prompt": list(e["opts"])})
            stats["choices"] += len(opts)
            continue
        if t == "choice":
            # 防御: 未挂靠选项组的标签 (正常数据不应出现), 单选项成组
            j = i + 1
            while j < hi and events[j]["ind"] > e["ind"]:
                j += 1
            block = parse_range(events, i + 1, j, sid, stats, True)
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
        elif t == "dialogue":
            items.append({"t": "text", "sp": e.get("speaker", ""), "x": fmt_text(e.get("text", ""))})
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
        elif t == "substory":
            to, to_name = parse_jump_target(e.get("name"))
            items.append({"t": "sub", "to": to, "name": to_name, "id": "s%d-%d" % (sid, e["i"])})
        elif t == "jump":
            to, to_name = parse_jump_target(e.get("target"))
            items.append({"t": "jump", "to": to, "name": to_name, "id": "j%d-%d" % (sid, e["i"])})
        elif t == "game_over":
            items.append({"t": "end", "id": "e%d-%d" % (sid, e["i"])})
            stats["endings"] += 1
            if not in_choice:
                stats["direct_ends"] += 1  # 顶层直接结局(剧终判定依据)
        elif t == "if":
            items.append({"t": "cond", "kind": "if", "cond": e.get("cond", ""), "id": "d%d-%d" % (sid, e["i"])})
        elif t == "elseif":
            items.append({"t": "cond", "kind": "elseif", "cond": e.get("cond", ""), "id": "d%d-%d" % (sid, e["i"])})
        elif t == "else":
            items.append({"t": "cond", "kind": "else", "cond": "", "id": "d%d-%d" % (sid, e["i"])})
        elif t == "loop_break":
            items.append({"t": "loopbreak"})
        elif t == "loop_start":
            items.append({"t": "loopstart"})
        elif t == "loop_end":
            items.append({"t": "loopend"})
        # 其余类型(wait/se/bgs/move_pic/note/click_wait/merge/menu_label/
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

# ---------------------------------------------------------------- 内联分支图节点
# 选项无跳转目标但带剧情内容(死局结局/汇回主线的分支内容): 为其创建图节点,
# 命名 "章节-大节点-选项文本"(重名加 -1/-2), 死局块标 dead 供前端紫色标记
CHAPTERS = ["序章", "第一章", "第二章", "第三章", "第四章", "第五章", "第六章"]
SYNTH_BASE = 2000  # 内联分支节点 id 从 2001 起(1000+ 已被拆分节点占用)
COND_BASE = 3000   # 条件判断菱形节点 id 从 3001 起
BEAT_BASE = 4000   # 关键选择节拍链节点 id 从 4001 起

def collect_beats(items, beats):
    """按事件顺序收集故事内全部选项组(含嵌套), 供节拍链构建。
    DFS 顺序即事件顺序(嵌套块在事件流中连续)。"""
    for it in items:
        if it["t"] == "choice":
            beats.append(it)
            for o in it["opts"]:
                collect_beats(o.get("items") or [], beats)

def collect_conds(items, src_id, conds_out, seen, page_id=None):
    """线性扫描: cond 后(中间仅隔展示类事件)紧跟有效 jump -> 菱形条件节点。
    命中的 jump 标记 used, 其直接边改由 菱形节点 表达。
    展示类 item(text/bg/pic/hide/bgm/sub)不断开配对; choice/循环/结局断开。
    page_id: 速览页所在故事(拆分节点内容在其自身页), 缺省=src_id。"""
    if page_id is None:
        page_id = src_id
    pending = None
    last_cond_text = ""   # 最近一次非空 if/elseif 条件, 供 else(空条件) 分支借用
    for it in items:
        t = it["t"]
        if t == "cond":
            pending = it
            if it.get("cond"):
                last_cond_text = it["cond"]
        elif t == "jump":
            to = it.get("to")
            if pending is not None and to and to not in UTILITY:
                # else 分支条件文本为空: 借用所属 if 的条件, 且成立/不成立语义相反
                inverted = pending["kind"] == "else" and not pending.get("cond")
                cond_text = pending["cond"] or (last_cond_text if inverted else "")
                key = (src_id, cond_text, to)
                if key not in seen:
                    seen.add(key)
                    it["used"] = True
                    conds_out.append({
                        "id": COND_BASE + len(conds_out) + 1,
                        "src": src_id, "story": src_id,
                        "page": page_id,
                        "cond": cond_text, "to": to,
                        "anchor": pending.get("id", ""),
                        "inverted": inverted,
                    })
            pending = None
        elif t == "choice":
            pending = None
            for o in it["opts"]:
                collect_conds(o.get("items") or [], src_id, conds_out, seen, page_id)
        elif t in ("end", "loopbreak", "loopstart", "loopend"):
            pending = None

def _blk_count(items):
    """统计块内 (文本数, 选项数, 是否含结局标记)"""
    t = c = 0
    end = False
    for it in items:
        if it["t"] == "text":
            t += 1
        elif it["t"] == "end":
            end = True
        elif it["t"] == "choice":
            for o in it["opts"]:
                c += 1
                t2, c2, e2 = _blk_count(o.get("items") or [])
                t += t2
                c += c2
                end = end or e2
    return t, c, end

def _first_text(items, limit=70):
    """块内第一段纯文本(去html标签), 作为节点卡片的一句话摘要"""
    for it in items:
        if it["t"] == "text" and it.get("x"):
            x = re.sub(r"<[^>]+>", "", it["x"])
            x = re.sub(r"\s+", " ", x).strip()
            if x:
                return x[:limit]
    return ""

def _block_text(items, limit=800):
    """块内全部文本(去html标签拼接), 供 LLM 精选摘要用(不进 branches.json)"""
    parts = []
    for it in items:
        if it["t"] == "text" and it.get("x"):
            x = re.sub(r"<[^>]+>", "", it["x"])
            x = re.sub(r"\s+", " ", x).strip()
            if x:
                parts.append(x)
    return " / ".join(parts)[:limit]

def collect_inline(items, src_id, container, base_parts, chain, synths):
    """递归遍历故事/分支块: 无跳转目标的选项创建图节点, 挂在 src_id 下。
    src_id: 图上边的起点(真实故事id或外层合成节点id);
    container: 选项框所在页面的故事id(用于速览锚点链接)。"""
    for it in items:
        if it["t"] != "choice":
            continue
        for o in it["opts"]:
            blk = o.get("items") or []
            if o.get("to") is None and blk:
                t, c, end = _blk_count(blk)
                if c == 0 and not end:
                    # 纯信息展示块(只是几段对话, 无后续选项也无结局): 不上图,
                    # 其嵌套选项组仍递归处理, chain 带上本选项文本保留命名上下文
                    collect_inline(blk, src_id, container, base_parts,
                                   chain + [o.get("txt", "")], synths)
                    continue
                nid = SYNTH_BASE + len(synths) + 1
                synths.append({
                    "id": nid, "src": src_id, "story": container,
                    "anchor": o["id"], "txt": o.get("txt", ""),
                    "base_parts": list(base_parts),
                    "chain": list(chain) + [o.get("txt", "")],
                    "end": end, "events": t, "choices": c,
                    "summary": _first_text(blk),
                    "_blktext": _block_text(blk),
                })
                collect_inline(blk, nid, container, base_parts,
                               chain + [o.get("txt", "")], synths)
            else:
                collect_inline(blk, src_id, container, base_parts, chain, synths)

# ---------------------------------------------------------------- 主流程
def main():
    data = json.load(open(GAME_JSON, encoding="utf-8"))
    stories_out = {}
    edges = []
    nodes = []

    for s in data["stories"]:
        sid = s["id"]
        stats = {"choices": 0, "endings": 0, "direct_ends": 0}
        items = parse_range(s["events"], 0, len(s["events"]), sid, stats)
        stories_out[str(sid)] = {
            "id": sid,
            "name": s["name"],
            "items": items,
            "choices": stats["choices"],
            "endings": stats["endings"],
        }
        if sid not in UTILITY:
            nodes.append({
                "id": sid,
                "name": s["name"],
                "n": s["eventCount"],
                "choices": stats["choices"],
                "endings": stats["endings"],
                "direct": stats["direct_ends"],  # 顶层直接结局数(剧终判定)
            })

    # 深嵌套拆分: 嵌套>3层的选项块抽成独立节点(先于边收集)。
    # 拆出的块整体搬入新节点, 其内部可能仍有>3层嵌套, 故以不动点方式反复拆分
    extract_ids = set()
    counter = [0]
    extracted_blocks = []  # (原故事id, 被抽出的块)
    dup_names = {}         # 拆分节点重名计数 → -1/-2/-3
    while True:
        before = counter[0]
        for sid_s in list(stories_out.keys()):
            sid = int(sid_s)
            if sid in UTILITY:
                continue
            split_deep(stories_out[sid_s]["items"], 1, sid,
                       stories_out[sid_s]["name"], stories_out,
                       extract_ids, counter, extracted_blocks, dup_names)
        if counter[0] == before:
            break

    # 内联分支节点 + 条件菱形节点: 先于边收集(菱形节点需标记 used jump)
    synths = []
    conds = []
    seen_cond = set()
    for sid_s, st in stories_out.items():
        sid = int(sid_s)
        if sid in UTILITY:
            continue
        if st.get("split"):
            # 拆分节点不是图节点: 边/锚点挂在 parent 小节下,
            # 内容页仍在拆分故事自身页(page), 供速览锚点链接
            collect_conds(st["items"], st["parent"], conds, seen_cond, sid)
            collect_inline(st["items"], st["parent"], sid, [st["name"]], [], synths)
        else:
            collect_conds(st["items"], sid, conds, seen_cond)
            collect_inline(st["items"], sid, sid, [st["name"]], [], synths)
    for c in conds:
        edges.append({"f": c["src"], "t": c["id"], "i": c.get("anchor", ""), "l": ""})
        # else 分支借用 if 条件命名: jump 走的是条件不成立的一侧
        jump_label = "不成立" if c.get("inverted") else "成立"
        edges.append({"f": c["id"], "t": c["to"], "i": "", "l": jump_label})
    for s in synths:
        edges.append({"f": s["src"], "t": s["id"], "i": s["anchor"], "l": s["txt"][:20]})
    if conds:
        print("  条件菱形节点: %d 个(id %d+)" % (len(conds), COND_BASE + 1))
    if synths:
        print("  内联分支节点: %d 个(id %d+)" % (len(synths), SYNTH_BASE + 1))

    # 折叠锚点归属: 拆分节点不上图, 其内容在图上归属 parent 小节
    # (嵌套拆分的 parent 可能仍是拆分节点, 沿 parent 链找到真实图节点)
    def root_of(sid):
        while True:
            st = stories_out.get(str(sid))
            p = st.get("parent") if st else None
            if p is None:
                return sid
            sid = p

    for s in synths:
        s["page"] = s["story"]        # 速览页: 拆分故事自身页
        s["story"] = root_of(s["story"])  # 图上归属: parent 小节

    # 收集 jump 边: 真实故事的顶层 + 被拆出块内的 jump(归属原故事, 保持分支图为章节粒度)
    for sid_s, st in stories_out.items():
        sid = int(sid_s)
        if sid in extract_ids or sid in UTILITY:
            continue
        for it in st["items"]:
            collect_edges(it, sid, edges, extract_ids)
    for sid, blk in extracted_blocks:
        collect_edges_all(blk, sid, edges, extract_ids)

    if extract_ids:
        nodes_split = sum(1 for v in stories_out.values() if v.get("split"))
        print("  深嵌套拆分: %d 个选项块 -> 独立节点(id %d+)" % (nodes_split, SPLIT_ID_BASE + 1))

    # 菱形节点记录: 前端以菱形渲染
    for c in conds:
        nodes.append({
            "id": c["id"], "name": c["cond"][:20], "n": 0,
            "choices": 0, "endings": 0,
            "cond": True, "story": c["story"], "page": c.get("page", c["story"]),
        })

    # 关键选择节拍链: 把章节内部全部选项组按剧情顺序串成可见的链,
    # 选项出边/合成节点边改挂到对应节拍, 线性推进边挂到其前最近的节拍,
    # 使"从上一章到下一章之间经历了哪些选择"在图上可见。
    beats = []
    for sid_s, st in stories_out.items():
        if int(sid_s) in UTILITY:
            continue
        collect_beats(st["items"], beats)

    def _anchor_key(s):
        m = re.match(r"[cs](\d+)-(\d+)", s or "")
        return (int(m.group(1)), int(m.group(2))) if m else None

    beat_of_anchor = {}   # 选项锚点 -> 节拍节点 id
    beats_by_sid = {}     # sid -> [(事件序号, 节拍id, choice item)]
    for it in beats:
        key = _anchor_key(it["opts"][0]["id"])
        if key is None:
            continue
        beats_by_sid.setdefault(key[0], []).append((key[1], it))
    nid = BEAT_BASE
    for sid in sorted(beats_by_sid):
        ordered = []
        for ev, it in sorted(beats_by_sid[sid]):
            nid += 1
            ordered.append((ev, nid, it))
            for o in it["opts"]:
                beat_of_anchor[o["id"]] = nid
            nodes.append({
                "id": nid,
                "name": "◆" + "/".join(o.get("txt", "") for o in it["opts"])[:18],
                "n": 0, "choices": len(it["opts"]), "endings": 0,
                "beat": True, "story": root_of(sid), "page": sid,
                "anchor": it["opts"][0]["id"],
                "_opttext": " / ".join(o.get("txt", "") for o in it["opts"]),
            })
        beats_by_sid[sid] = ordered
    # 重挂边: 选项边/合成边 -> 对应节拍; 无文字线性 jump/条件边 -> 其前最近的节拍
    for e in edges:
        if e["i"] in beat_of_anchor:
            e["f"] = beat_of_anchor[e["i"]]
            continue
        m2 = re.match(r"[jd](\d+)-(\d+)", e["i"] or "")
        if m2 and not e["l"]:
            lst = [b for b in beats_by_sid.get(int(m2.group(1)), []) if b[0] < int(m2.group(2))]
            if lst:
                e["f"] = lst[-1][1]
    # 链: 小节 -> 节拍1 -> 节拍2 -> ...
    for sid, ordered in beats_by_sid.items():
        prev = root_of(sid)
        for ev, bnid, it in ordered:
            edges.append({"f": prev, "t": bnid, "i": "", "l": ""})
            prev = bnid
    # 兜底: 无出边的节拍(链尾且故事经条件/结局收尾)连回所在小节, 避免"去向: 无"
    out_cnt = {}
    for e in edges:
        out_cnt[e["f"]] = out_cnt.get(e["f"], 0) + 1
    for sid, ordered in beats_by_sid.items():
        if ordered:
            bnid = ordered[-1][1]
            if not out_cnt.get(bnid):
                edges.append({"f": bnid, "t": root_of(sid), "i": "", "l": ""})
    # 汇回主线: 非死局的合成节点(分支内容)在其选项之后汇入主流程,
    # 连到该选项之后的下一个节拍(无则连回章节节点), 避免"去向: 无"
    for s in synths:
        if s["end"]:
            continue
        key = _anchor_key(s["anchor"])
        target = None
        if key:
            nxt = [b for b in beats_by_sid.get(key[0], []) if b[0] > key[1]]
            if nxt:
                target = nxt[0][1]
        if target is None:
            target = s["story"]
        edges.append({"f": s["id"], "t": target, "i": "", "l": ""})
    # 条件菱形补全"不成立"走向: 条件之后未跳转则继续主线,
    # 连到条件之后的下一个节拍(无则连回章节节点), 与"成立"跳转边并列
    for c in conds:
        key = _anchor_key(c.get("anchor"))
        target = None
        if key:
            nxt = [b for b in beats_by_sid.get(key[0], []) if b[0] > key[1]]
            if nxt:
                target = nxt[0][1]
        if target is None:
            target = c["src"]
        # inverted(else 借用 if 条件)时, 主线兜底边走的是条件成立侧(if 分支, 通常接剧终)
        fallback_label = "成立" if c.get("inverted") else "不成立"
        edges.append({"f": c["id"], "t": target, "i": "", "l": fallback_label})
    if beats:
        print("  关键选择节拍: %d 个(id %d+)" % (len(set(beat_of_anchor.values())), BEAT_BASE + 1))

    # 合成节点命名: "章节-大节点-选项链" (重名 -1/-2/-3)
    # 章节归属: 沿最终边从入口 DFS, 途经章节名节点时切换当前章节
    adj = {}
    for e in edges:
        adj.setdefault(e["f"], []).append(e["t"])
    real_names = {int(k): v["name"] for k, v in stories_out.items() if not v.get("split")}
    ch_of = {}
    chapter_set = set(CHAPTERS[1:])
    stack = [(1, "序章")]
    seen = set()
    while stack:
        nid, ch = stack.pop()
        if nid in seen:
            continue
        seen.add(nid)
        ch_of[nid] = ch
        cur = real_names[nid] if real_names.get(nid) in chapter_set else ch
        for t in reversed(adj.get(nid, [])):
            if t not in seen:
                stack.append((t, cur))
    seen_names = {}
    for s in synths:
        ch = ch_of.get(s["src"], "序章")
        parts = list(s["base_parts"])
        # 拆分节点名自带章节前缀, 去重避免 "第五章-第五章-..."
        for cap in CHAPTERS:
            if parts and parts[0].startswith(cap + "-"):
                parts[0] = parts[0][len(cap) + 1:]
                break
        if parts and parts[0] == ch:
            parts = parts[1:]  # 大节点名即章节名, 避免重复
        name = "-".join([ch] + parts + s["chain"])
        seen_names[name] = seen_names.get(name, 0) + 1
        if seen_names[name] > 1:
            name += "-%d" % (seen_names[name] - 1)
        s["name"] = name
        nodes.append({
            "id": s["id"], "name": name, "n": s["events"],
            "choices": s["choices"], "endings": 1 if s["end"] else 0,
            "synthetic": True, "story": s["story"], "page": s.get("page", s["story"]), "anchor": s["anchor"],
            "dead": s["end"], "summary": s.get("summary", ""),
            "_blktext": s.get("_blktext", ""),
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

    # LLM 精选输入: 节点原始文本(仅本地用, 以 _ 开头的字段不进 branches.json)
    llm_out = os.path.join(os.path.dirname(SITE), "task_plan", "llm_curate")
    os.makedirs(llm_out, exist_ok=True)
    llm_nodes = []
    for n in nodes:
        text = n.pop("_blktext", "") or n.pop("_opttext", "")
        if not text and n["name"] in CHAPTERS:
            # 章节/小节节点: 复用其故事全文
            text = _block_text(stories_out[str(n["id"])]["items"])
        if text:
            llm_nodes.append({"id": n["id"], "name": n["name"], "text": text})
    with open(os.path.join(llm_out, "nodes_input.json"), "w", encoding="utf-8") as f:
        json.dump(llm_nodes, f, ensure_ascii=False, indent=1)
    print("  LLM 精选输入: %d 个节点 -> task_plan/llm_curate/nodes_input.json" % len(llm_nodes))

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

def collect_edges(it, sid, edges, extract_ids=frozenset()):
    if it["t"] == "jump" and it.get("to") and it["to"] not in UTILITY \
            and it["to"] not in extract_ids and not it.get("used"):
        edges.append({"f": sid, "t": it["to"], "i": it.get("id", ""), "l": ""})
    elif it["t"] == "choice":
        for o in it["opts"]:
            if o.get("to") and o["to"] not in UTILITY and o["to"] not in extract_ids:
                edges.append({"f": sid, "t": o["to"], "i": o["id"], "l": o["txt"][:20]})
            # 无论选项自身是否有跳转, 都继续深入其块内收集嵌套选项组的边
            collect_edges_all(o["items"], sid, edges, extract_ids)

def collect_edges_all(items, sid, edges, extract_ids=frozenset()):
    for it in items:
        collect_edges(it, sid, edges, extract_ids)

if __name__ == "__main__":
    main()
