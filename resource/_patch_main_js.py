# -*- coding: utf-8 -*-
"""给 main.min.js 打补丁：game.bin 加载改为 data/game.json，在原模块作用域内复原官方解析器产物。
三处锚点替换，每个锚点必须恰好出现一次，否则中止不动文件。"""
import sys, io

MAIN = sys.argv[1] if len(sys.argv) > 1 else 'main.min.js'
src = io.open(MAIN, encoding='utf-8').read()

A1 = """        }, t.prototype.loadFile = function (t) {
            var e = this;
            ORG.loader.load(t, OHandler.create(this, function (t) {"""
B1 = """        }, t.prototype.loadFile = function (t) {
            var e = this;
            if ("string" == typeof t && t.indexOf("game.bin") >= 0) return e.loadGameJSON("data/game.json"), void 0;
            ORG.loader.load(t, OHandler.create(this, function (t) {"""

A2 = "GloableData.getInstance().gameMainData = new org_data.DMain(t), t.clear();"
B2 = "GloableData.getInstance().gameMainData = t.__jsonMode ? this.buildMainFromJSON(t.json) : new org_data.DMain(t), t.clear();"

A3 = "}, t.prototype.mallBinprogress = function (t) {}, t.prototype.readGameBin = function (t) {"

NEW_METHODS = """}, t.prototype.loadGameJSON = function (t) {
            var e = this;
            ORG.loader.load(t, OHandler.create(this, function (t) {
                var i = "string" == typeof t ? JSON.parse(t) : t;
                e.readGameBin({ __jsonMode: !0, json: i, readCString: function () { return "ORGDAT" }, clear: function () { } })
            }), OHandler.create(this, this.gbProgress, null, !1), "text", 0, !1)
        }, t.prototype.buildMainFromJSON = function (json) {
            function numKeyArr(v) {
                var keys = Object.keys(v);
                if (0 == keys.length) return !1;
                for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (!/^\\d+$/.test(k) || +k != i) return !1 }
                return !0
            }
            var protoList = [];
            for (var cn in org_data) {
                try {
                    var cls = org_data[cn];
                    if ("function" == typeof cls && cls.prototype) {
                        var d = new cls(null), ks = Object.keys(d);
                        ks.length > 0 && protoList.push({ keys: ks, proto: cls.prototype })
                    }
                } catch (e) { }
            }
            function tryProto(o) {
                var ks = Object.keys(o);
                if (0 == ks.length) return;
                for (var i = 0; i < protoList.length; i++) {
                    var dk = protoList[i].keys, all = !0;
                    for (var j = 0; j < dk.length; j++) if (-1 == ks.indexOf(dk[j])) { all = !1; break }
                    if (all) { Object.setPrototypeOf(o, protoList[i].proto); return }
                }
            }
            function revive(v) {
                if (null == v || "object" != typeof v) return v;
                if (v instanceof Array) { for (var i = 0; i < v.length; i++) v[i] = revive(v[i]); return v }
                if (numKeyArr(v)) { var r = [], keys = Object.keys(v); for (var i = 0; i < keys.length; i++) r[i] = revive(v[keys[i]]); return r }
                for (var k in v) v[k] = revive(v[k]);
                tryProto(v);
                return v
            }
            var root = Object.create(org_data.DMain.prototype);
            root.Headr = revive(json.Headr), root.System = revive(json.System), root.projectName = json.projectName;
            try { mgr.DataMgr.instance.bd.set("popMsg.ver", json.Headr && json.Headr.ver > 104 ? 2 : 1) } catch (e) { }
            var stories = new Dictionary;
            for (var k in json.stories) {
                var s = json.stories[k], st = Object.create(org_data.DStory.prototype);
                st.Name = s.Name, st.ID = s.ID;
                var evs = revive(s._events);
                for (var i = 0; i < evs.length; i++) evs[i].tpos = i;
                st._events = evs, stories.add(s.ID, st)
            }
            return root.stories = stories, root
        }, t.prototype.mallBinprogress = function (t) {}, t.prototype.readGameBin = function (t) {"""

for name, a in [('锚点1(loadFile)', A1), ('锚点2(DMain构造)', A2), ('锚点3(mallBinprogress)', A3)]:
    n = src.count(a)
    if n != 1:
        print('FAIL: %s 出现 %d 次（期望 1），文件未修改' % (name, n)); sys.exit(1)

src = src.replace(A1, B1).replace(A2, B2).replace(A3, NEW_METHODS)
io.open(MAIN, 'w', encoding='utf-8', newline='').write(src)
print('OK: 3 处补丁已写入', MAIN)
