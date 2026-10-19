# -*- coding: utf-8 -*-
"""从 public/play/js/script.json 提取变量元数据与每故事的条件变量引用,
生成 public/plot/js/branch_vars.json, 供 /plot/branch 节点详情的「变量状态」使用。
用法: python task_plan/build_branch_vars.py
"""
import io
import json
import re
import collections

SRC = "public/play/js/script.json"
DST = "public/plot/js/branch_vars.json"

RE_ASSIGN = re.compile(r"\[(\d+)[^\]]*\]\s*(\+=|-=|=)\s*(.+)$")
RE_COND = re.compile(r"数值：?\[(\d+)[^\]]*\]\s*(≥|≤|＞|＜|＝|≠|>=|<=|==|!=|>|<|=)\s*(.+)$")
RE_NAME_IN_ASSIGN = re.compile(r"^\[(\d+):([^\]]+)\]")
RE_NAME_IN_COND = re.compile(r"数值：?\[(\d+):([^\]]+)\]")
RE_RHS_VAR = re.compile(r"^数值：?\[(\d+)")


def walk_items(items, fn):
    for it in items:
        if not isinstance(it, dict):
            continue
        fn(it)
        for k in ("body", "pre"):
            if it.get(k):
                walk_items(it[k], fn)
        ex = it.get("exit")
        if isinstance(ex, dict) and ex.get("body"):
            walk_items(ex["body"], fn)
        for b in it.get("branches", []) or []:
            walk_items(b.get("body") or [], fn)
        for o in it.get("opts", []) or []:
            walk_items(o.get("body") or [], fn)
        for p in it.get("points", []) or []:
            walk_items(p.get("body") or [], fn)


def main():
    d = json.load(io.open(SRC, encoding="utf-8"))
    names = collections.defaultdict(set)
    plus_consts = collections.defaultdict(int)   # += 常量累计 -> 估算上限
    eq_consts = collections.defaultdict(set)     # = 常量赋值
    has_inc = collections.defaultdict(bool)      # 出现 += / -=
    range_conds = collections.defaultdict(set)   # >=/<=/>/</>=/<= 阈值
    eq_conds = collections.defaultdict(set)      # ＝/≠ 阈值
    story_vars = collections.defaultdict(set)    # story sid -> 条件引用的变量

    def collect(items, sv=None):
        def fn(it):
            t = it.get("t")
            if t == "assign":
                m = RE_ASSIGN.match(it.get("expr", "") or "")
                if not m:
                    return
                vid = int(m.group(1))
                op, rhs = m.group(2), m.group(3).strip()
                nm = RE_NAME_IN_ASSIGN.match(it["expr"])
                if nm:
                    names[vid].add(nm.group(2).strip())
                if op == "=":
                    if not RE_RHS_VAR.match(rhs):
                        try:
                            eq_consts[vid].add(int(float(rhs)))
                        except ValueError:
                            pass
                else:
                    has_inc[vid] = True
                    if not RE_RHS_VAR.match(rhs):
                        try:
                            plus_consts[vid] += abs(int(float(rhs)))
                        except ValueError:
                            pass
            elif t == "cond":
                for b in it.get("branches", []) or []:
                    c = b.get("cond", "") or ""
                    m = RE_COND.match(c)
                    if not m:
                        continue
                    vid = int(m.group(1))
                    op, rhs = m.group(2), m.group(3).strip()
                    nm = RE_NAME_IN_COND.match(c)
                    if nm:
                        names[vid].add(nm.group(2).strip())
                    if RE_RHS_VAR.match(rhs):
                        continue
                    try:
                        val = int(float(rhs))
                    except ValueError:
                        continue
                    if op in ("＝", "=", "==", "≠", "!="):
                        eq_conds[vid].add(val)
                    else:
                        range_conds[vid].add(val)
                    if sv is not None:
                        sv.add(vid)

        walk_items(items, fn)

    story_vars_out = {}
    for sid, st in d["stories"].items():
        sv = set()
        collect(st.get("items", []), sv)
        if sv:
            story_vars_out[str(sid)] = sorted(sv)

    # ---- 变量元数据与预设值 ----
    vars_out = {}
    for vid in sorted(set(names) | set(eq_conds) | set(range_conds) | set(eq_consts)):
        nm = "/".join(sorted(names.get(vid, []))[:2]) or ("变量#" + str(vid))
        if re.match(r"^[\d\s/]+$", nm):
            nm = "变量#" + str(vid)
        is_count = has_inc.get(vid) or bool(range_conds.get(vid))
        if is_count:
            presets = sorted(set([0]) | range_conds.get(vid, set()) | eq_conds.get(vid, set()))
            mx = plus_consts.get(vid, 0)
            if mx > 0:
                presets.append(mx)
            presets = sorted(set(presets))
            presets = [p for p in presets if p >= 0]
            # 超过 6 个时: 保留 0、上限, 其余均匀抽
            if len(presets) > 6:
                keep = {0, presets[-1]}
                mid = [p for p in presets if p not in keep]
                step = max(1, len(mid) // 4)
                keep |= set(mid[::step][:4])
                presets = sorted(keep)
            vars_out[str(vid)] = {"n": nm, "kind": "count", "p": presets}
        else:
            vals = sorted(set(eq_conds.get(vid, set())) | eq_consts.get(vid, set()))
            vals = sorted(set([0]) | set(v for v in vals if 0 <= v <= 99)) or [0, 1]
            # 只可能取 0 的变量(仅被重置、从不构成有效分支)不提供编辑, 过滤掉
            if set(vals) <= {0}:
                continue
            kind = "bool" if set(vals) <= {0, 1} else "enum"
            vars_out[str(vid)] = {"n": nm, "kind": kind, "p": vals[:8]}

    out = {"vars": vars_out, "storyVars": story_vars_out}
    io.open(DST, "w", encoding="utf-8").write(
        json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    )
    print("vars:", len(vars_out), " stories with conds:", len(story_vars_out), "->", DST)


if __name__ == "__main__":
    main()
