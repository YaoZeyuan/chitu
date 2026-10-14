# -*- coding: utf-8 -*-
"""从 public/plot/js/data.js 抽取剧情分支图，生成独立的 branches.json
用法: python task_plan/build_branches_json.py
"""
import io
import json
import re
import datetime

SRC = "public/plot/js/data.js"
DST = "public/plot/js/branches.json"


def strip_html(x):
    x = re.sub(r"<[^>]+>", "", x)
    x = re.sub(r"\s+", " ", x).strip()
    return x


def main():
    s = io.open(SRC, encoding="utf-8").read()
    d = json.loads(s[s.index("{"):].rstrip().rstrip(";"))
    stories = d["stories"]
    graph = d["graph"]

    nodes = []
    for n in graph["nodes"]:
        sid = str(n["id"])
        story = stories.get(sid)
        summary = ""
        if story:
            for it in story.get("items", []):
                if it.get("t") == "text" and it.get("x"):
                    summary = strip_html(it["x"])[:80]
                    break
        nodes.append({
            "id": n["id"],
            "name": n["name"],
            "chapter": bool(n.get("synthetic")) is False and bool(re.match(r"^第.+[章话]", n["name"])),
            "choices": n.get("choices", 0),
            "endings": n.get("endings", 0),
            "events": n.get("n", 0),
            "summary": summary,
        })
        # 合成/节拍节点自带摘要(块内第一段文本), 优先使用
        if n.get("summary"):
            nodes[-1]["summary"] = n["summary"]
        # 顶层直接结局数(剧终判定: 含结局但都是选项块内结局的不算剧终)
        if n.get("direct") is not None:
            nodes[-1]["direct"] = n["direct"]
        # 条件判断菱形节点
        if n.get("cond"):
            nodes[-1]["cond"] = True
            nodes[-1]["story"] = n.get("story")
            nodes[-1]["page"] = n.get("page", n.get("story"))
        # 关键选择节拍节点
        if n.get("beat"):
            nodes[-1]["beat"] = True
            nodes[-1]["story"] = n.get("story")
            nodes[-1]["page"] = n.get("page", n.get("story"))
            nodes[-1]["anchor"] = n.get("anchor", "")
        # 内联分支节点(选项无跳转目标但带剧情内容): 透传附加字段
        if n.get("synthetic"):
            nodes[-1].update({
                "synthetic": True,
                "story": n.get("story"),
                "page": n.get("page", n.get("story")),
                "anchor": n.get("anchor", ""),
                "dead": bool(n.get("dead")),
            })

    edges = [{"f": e["f"], "t": e["t"], "l": e.get("l", "")} for e in graph["edges"]]

    out = {
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "source": "public/plot/js/data.js",
        "entry": d["entry"],
        "nodes": nodes,
        "edges": edges,
    }
    io.open(DST, "w", encoding="utf-8").write(
        json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    )
    print("nodes:", len(nodes), "edges:", len(edges), "->", DST)


if __name__ == "__main__":
    main()
