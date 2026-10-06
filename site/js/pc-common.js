var pc_common_mark = GetQueryString("mark");
var tempData;
var saveDataPath;
if (pc_common_mark === "pc") {
    var fs = require('fs');
    var path = require('path');
    var electron = require('electron');
    var ipcRenderer = electron.ipcRenderer;
    ipcRenderer.on("pageProgress", function (e, obj) {
        obj = JSON.parse(obj);
        GloableData.getInstance().tempData = {};
        GloableData.getInstance().tempData.ProjectPath = obj.ProjectPath;
        GloableData.getInstance().tempData.ProjectWidth = obj.ProjectWidth;
        GloableData.getInstance().tempData.ProjectHeight = obj.ProjectHeight;
        tempData = GloableData.getInstance().tempData;
        var t_p = __dirname;
        // t_p = t_p.replace("bin", "UserData\\");
        if (obj.FilePath) {
            saveDataPath = obj.FilePath+"\\";
        } else {
            saveDataPath = __dirname.replace("bin", "UserData\\");
        }
        start();
    });
    $(function () {
        console.log("页面加载完成");
        ipcRenderer.send("pageProgress", "pageComplete");
    });
} else {
    $(function () {
       if(tempData != null){
           GloableData.getInstance().tempData = tempData;
           start('','','','','','','1');
       }
    })
    // start('0eac06a880dd92c46f102c315992a936', '63', 'isFlash', '', '32', 'web/0eac06a880dd92c46f102c315992a936/63/Game_mini.bin', '3');
    //start('b70ce88ec63ab8e14d116078f35efb44','201','isFlash','','32','web/b70ce88ec63ab8e14d116078f35efb44/201/Game_mini.bin','1')
}

function isElectron() {
    return (typeof(LoadExtension) === "undefined" && pc_common_mark === "pc")
}

function ElectronPath(name) {
    if (PCFileIsExist(GloableData.getInstance().tempData.ProjectPath + "/" + name)) {
        return (GloableData.getInstance().tempData.ProjectPath + "/" + name);
    }
    return "";
}

function PCSaveData(key, value) {
    if (isElectron()) {
        fs.writeFileSync(saveDataPath + key, value, "utf-8");
        return;
    }
    try {
        LoadExtension.SaveData(key, value);
    } catch (e) {
    }
}

function PCLoadData(key) {
    if (isElectron()) {
        if (PCFileIsExist(saveDataPath + key)) {
            return fs.readFileSync(saveDataPath + key, "utf-8");
        }
        return "";
    }
    try {
        var str = LoadExtension.ReadData(key);
        if (str != "fileName is not null" && str != "file not exit") {
            return str;
        }
        return "";
    } catch (e) {
        return "";
    }
}

function PCFileIsExist(key) {
    if (isElectron()) {

        return fs.existsSync(key);
    }
    try {
        return LoadExtension.FileIsExist(key);
    } catch (e) {
        return false;
    }

}

function PCKeyDown(key) {
    if (!Main.LOADCOMPLETE) {
        return;
    }
    OnKeyDown(key);
}

function PCKeyUP(key) {
    if (!Main.LOADCOMPLETE) {
        return;
    }
    OnKeyUp();
}