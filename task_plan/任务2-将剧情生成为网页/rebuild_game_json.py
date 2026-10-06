# -*- coding: utf-8 -*-
"""
从 game_raw.json (游戏引擎原始指令流) 按真实语义重建 game.json。

背景: 旧 game.json 由早期脚本解析 raw 而来, 存在多处失真:
  - raw 101 (选项UI指令, 携带全部选项文本) 被误解析为一个 dialogue 事件
  - raw 102 (选项组汇合标记, 每组恰好一个) 全部 291 个被丢弃
  - raw 206 (跳转) 的 2 参数格式 (无条件跳转) 的 target 丢失
  - raw 400/402 (显示/移动图片) 的槽位与站位参数丢失
  - raw 200/201 (if/elseif) 的条件展示文本偶发丢失 (cond 字段存成了 '0'/'1')

本脚本逐条指令重新映射, 关键结构语义 (来自对 raw 数据的全面验证):
  - 事件自带 Indent (引擎嵌套层级): 101(prompt) 在层级 I, 其后 N 个 108(选项标签)
    在层级 I+1, 各选项块内容在层级 >I+1, 102(汇合标记) 在层级 I 收束整组。
  - 101 与 102 全局各 291 个, 一一对应; 108 共 812 个 = 全部选项数。
  - 206 两种格式: 3 参数 {0:变量,1:值,2:'NNN:名'} = 条件跳转;
    2 参数 {0:剧情号,1:'NNN:名'} = 无条件跳转。
  - 400/402 图片定位: 400 的 argv[9] 与 402 的 argv[10] 均含 'x,y,宽%,高%,alpha'
    (部件数 6 或 7, x 在下标 2 / 3 起, 两种布局均已兼容)。
  - 212 为检查类菜单标签 (无 prompt, 配合 204/循环使用), 109 为点击等待, 均保留。

输出 schema 与旧版兼容 (stories[].events[].{i,type,...}), 新增 ind 字段,
并新增 choice_prompt / merge / menu_label 等类型。旧文件备份为 game.json.bak-v1。

用法: python rebuild_game_json.py   (幂等, 可重复运行)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
GAME_RAW = os.path.join(ROOT, "glm-5.3-flash", "game_raw.json")
GAME_JSON = os.path.join(ROOT, "glm-5.3-flash", "game.json")

LABEL_RE = re.compile(r"^\s*:\s*\[(.*)\]\s*的剧情\s*$")


def clean_label(t):
    """':[老师，不是我！...] 的剧情' -> '老师，不是我！...'"""
    m = LABEL_RE.match(t or "")
    return m.group(1).strip() if m else (t or "").strip()


def parse_pos(parts, x_i, y_i):
    """从 'a,b,x,y,宽%,高%,alpha' 类部件串解析坐标。部件布局有两种:
    6 部件 (背景): [名,0,0,100%,100%,alpha] -> x_i=2 起
    7 部件 (立绘): [槽位,?,x,y,宽%,高%,alpha] -> x_i=2 起
    调用处传入正确的起始下标。"""

    def num(idx, default=0.0):
        if idx >= len(parts):
            return default
        s = parts[idx].strip().replace("%", "")
        try:
            return float(s)
        except ValueError:
            return default

    x, y = num(x_i), num(y_i)
    w, h = num(x_i + 2, 100.0), num(x_i + 3, 100.0)
    alpha = num(x_i + 4, 255.0)
    if w <= 0:
        w = 100.0
    if h <= 0:
        h = 100.0
    return x, y, w, h, alpha


def convert_event(code, e):
    """raw 事件 -> 结构化事件 dict (不含 i/ind, 由调用方补充)。无法识别时返回 None。"""
    a = e.get("Argv", {}) or {}

    def keys_by_int():
        return sorted(a, key=lambda x: int(x)) if a else []

    if code == 100:   # 正文/旁白
        return {"type": "narration", "text": a.get("2", "")}
    if code == 101:   # 选项UI指令: 全部选项文本
        return {"type": "choice_prompt", "opts": [a[k] for k in keys_by_int()]}
    if code == 102:   # 选项组汇合标记
        return {"type": "merge"}
    if code == 107:   # 章节标记 (如 'ORG-E-T | 001')
        return {"type": "note", "text": a.get("0", "")}
    if code == 108:   # 选项标签
        return {"type": "choice", "idx": int(a.get("0", 0) or 0), "text": clean_label(a.get("1", ""))}
    if code == 109:   # 点击等待
        return {"type": "click_wait"}
    if code == 200:   # if (argv[5] 为条件展示文本)
        return {"type": "if", "cond": a.get("5", "")}
    if code == 201:   # elseif
        return {"type": "elseif", "cond": a.get("0", "")}
    if code == 202:
        return {"type": "loop_start"}
    if code == 203:
        return {"type": "loop_end"}
    if code == 204 or code == 205:
        return {"type": "op", "code": code, "argv": a}
    if code == 206:   # 跳转
        if "2" in a:  # 3 参数: 条件跳转
            return {"type": "jump", "target": a.get("2", ""), "var": a.get("0", ""), "val": a.get("1", "")}
        return {"type": "jump", "target": a.get("1", "")}
    if code == 207:   # 变量赋值 (argv[4] 为表达式)
        return {"type": "set_var", "expr": a.get("4", "")}
    if code == 208:   # 结局
        return {"type": "game_over"}
    if code == 209:
        return {"type": "loop_break"}
    if code == 210:   # 等待
        return {"type": "wait", "ms": a.get("0", "")}
    if code == 211:   # else
        return {"type": "else"}
    if code == 212:   # 检查类菜单标签 (无 prompt)
        return {"type": "menu_label", "idx": int(a.get("0", 0) or 0), "text": clean_label(a.get("2", ""))}
    if code == 251:   # 子剧情调用
        return {"type": "substory", "name": a.get("1", "")}
    if code == 301:
        return {"type": "weather", "argv": a}
    if code == 302:
        return {"type": "shake", "argv": a}
    if code == 303:
        return {"type": "flash", "argv": a}
    if code == 400:   # 显示图片 (背景/立绘)
        img = a.get("1", "")
        p9 = (a.get("9") or "").split(",")
        if len(p9) >= 6:
            x, y, w, h, alpha = parse_pos(p9, 2, 3)
        else:
            x, y, w, h, alpha = 0.0, 0.0, 100.0, 100.0, 255.0
        return {"type": "show_pic", "img": img, "slot": a.get("0", ""),
                "x": x, "y": y, "w": w, "h": h, "alpha": alpha}
    if code == 401:   # 隐藏图片
        return {"type": "hide_pic", "index": a.get("0", "")}
    if code == 402:   # 移动图片 (含目标坐标)
        img = a.get("1", "")
        p10 = (a.get("10") or "").split(",")
        # p10: '槽位,图,@毫秒,x,y,宽%,高%,alpha'
        at = next((i for i, p in enumerate(p10) if p.strip().startswith("@")), None)
        if at is not None and len(p10) >= at + 5:
            x, y, w, h, alpha = parse_pos(p10, at + 1, at + 2)
        else:
            x, y, w, h, alpha = 0.0, 0.0, 100.0, 100.0, 255.0
        return {"type": "move_pic", "img": img, "slot": a.get("0", ""),
                "x": x, "y": y, "w": w, "h": h, "alpha": alpha, "ms": a.get("9", "")}
    if code == 501:
        return {"type": "bgm", "file": a.get("0", "")}
    if code == 502:
        return {"type": "se", "file": a.get("0", "")}
    if code == 504:
        return {"type": "bgs", "file": a.get("0", "")}
    if code == 505:
        return {"type": "bgm_fadeout", "ms": a.get("0", "")}
    if code == 506:
        return {"type": "stop_se"}
    if code == 508:
        return {"type": "bgs_fadeout", "ms": a.get("0", "")}
    return None


def main():
    raw = json.load(open(GAME_RAW, encoding="utf-8"))
    headr = raw.get("Headr", {})

    stories_out = []
    dropped = {}
    n_prompt = n_label = n_merge = 0
    problems = []

    for sid in sorted(raw["stories"], key=int):
        s = raw["stories"][sid]
        events = []
        for k in sorted(s["_events"], key=int):
            e = s["_events"][k]
            ev = convert_event(e["Code"], e)
            if ev is None:
                dropped[e["Code"]] = dropped.get(e["Code"], 0) + 1
                continue
            ev["i"] = int(k)
            ev["ind"] = e.get("Indent", 0)
            events.append(ev)
            if ev["type"] == "choice_prompt":
                n_prompt += 1
            elif ev["type"] == "choice":
                n_label += 1
            elif ev["type"] == "merge":
                n_merge += 1
        stories_out.append({
            "id": int(sid),
            "name": s.get("Name", ""),
            "eventCount": len(events),
            "events": events,
        })

    # ---- 结构自检: 每个选项组的标签数与 prompt 选项数一致, 汇合标记收束整组 ----
    for st in stories_out:
        evs = st["events"]
        for idx, e in enumerate(evs):
            if e["type"] != "choice_prompt":
                continue
            ind = e["ind"]
            n = len(e["opts"])
            # 收集本组标签: 从 prompt 之后、汇合标记(层级==ind)之前的同层级 choice
            labels = []
            j = idx + 1
            while j < len(evs):
                if evs[j]["ind"] <= ind:      # 回到 prompt 层级 => 汇合(或异常)
                    break
                if evs[j]["ind"] == ind + 1 and evs[j]["type"] == "choice":
                    labels.append(j)
                j += 1
            if len(labels) != n:
                problems.append("story %d prompt@%d: 期望 %d 个标签, 实际 %d" % (st["id"], e["i"], n, len(labels)))
            # 汇合标记应紧随整组 (层级回到 ind 且类型为 merge)
            if j < len(evs) and evs[j]["type"] != "merge":
                problems.append("story %d prompt@%d: 组后无汇合标记, 下一个事件是 %s@ind%d" % (st["id"], e["i"], evs[j]["type"], evs[j]["ind"]))

    if problems:
        print("结构自检发现问题 %d 处:" % len(problems))
        for p in problems[:20]:
            print("  ", p)
        sys.exit(1)

    out = {
        "generated": __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M"),
        "generator": "task_plan/任务2-将剧情生成为网页/rebuild_game_json.py",
        "meta": {"title": headr.get("title", ""), "width": headr.get("GWidth"), "height": headr.get("GHeight")},
        "stories": stories_out,
    }
    with open(GAME_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print("OK: game.json 重建完成  stories=%d" % len(stories_out))
    print("  choice_prompt=%d  choice标签=%d  merge=%d" % (n_prompt, n_label, n_merge))
    print("  丢弃事件(无阅读价值): %s" % (dropped or "无"))


if __name__ == "__main__":
    main()
