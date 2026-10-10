//标记开始
/* -1 未知   0 网页  1 iOS 2 安卓  3 终端锁定版  4 手机站 5 后台  6 C#工具  7 h5工具  8 bbs  9 H5联运*/

//截取?Path
function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return (r[2]);
    return null;
}

var gIndex;  //游戏的id;
function Mark() {
    var self = this;
    this.ANDROID = false;
    this.H5 = false;
    this.WEB = false;
    this.IOS = false;
    var ohp = GetQueryString("ohp");
    if (ohp) {
        //获取gindex
        var href = window.location.href;
        var isPara = href.split('?');
        if (isPara[1]) {
            var num = href.split('/');
            gIndex = num[num.length - 1].split('?')[0];
        } else {
            var num = href.split('/');
            gIndex = num[num.length - 1];
        }
    } else {
        var href = window.location.href;
        var isPara = href.split('?');
        if (isPara[0]) {
            var num = isPara[0].split('/');
        } else {
            var num = isPara[0].split('/');
        }
        gIndex = num[num.length - 1];

        if (gIndex.toLowerCase().indexOf(".") != -1) {
            var gIndexArr = gIndex.split(".");
            gIndex = gIndexArr[0];
        }
    }


    this.init = function () {
        var plantMark = GetQueryString("mark");
        if (plantMark == "isFlash") {
            this.WEB = true;
            commonPlayer.platform = 0;
        } else if (plantMark && plantMark.toLowerCase() == "ios") {
            this.IOS = true;
            commonPlayer.platform = 1;
        } else if (plantMark == "android") {
            this.ANDROID = true;
            commonPlayer.platform = 2;
        } else {
            this.H5 = true;
            commonPlayer.platform = 4;
        }
    };
    this.sdkInit = function () {
        var plantMark = GetQueryString("platform");
        if (plantMark == "0") {
            this.WEB = true;
            commonPlayer.platform = 0;
        } else if (plantMark == "1") {
            //this.IOS = "ios";
            this.IOS = true;
            commonPlayer.platform = 1;
        } else if (plantMark == "2") {
            this.ANDROID = true;
            commonPlayer.platform = 2;
        } else {
            this.H5 = true;
            commonPlayer.platform = 4;
        }
    }
    //如果是主站
    if (channel_id.length > 0) {
        this.sdkInit();
    } else {
        this.init();
    }
}

var mark = new Mark(); //标识  去初始化标识


//为转屏而加
window.addEventListener("resize", resizeGame, false);
$(function () {
    //页面加载完成的时候去看手机现在是横着呢还是竖着呢
    resizeGame();
})


//截取父级?Path
function GetQueryStrParent(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.parent.location.search.substr(1).match(reg);
    if (r != null) return (r[2]);
    return null;
}

//插入ifram
function creatIfram(src, parentDom) {
    var iframe = document.getElementById("iframe_pay");
    //var iframe = $('#iframe_pay', parent.document);
    if (iframe) {
        iframe.src = src;
        iframe.style.display = "block";
    } else {
        iframe = document.createElement('iframe');
        iframe.id = "iframe_pay";
        iframe.src = src;
        iframe.style.height = "100%";
        iframe.style.width = "100%";
        iframe.style.frameborde = 0;
        iframe.style.scrolling = "yes";
        iframe.style.display = "block";
        iframe.style.position = "absolute";
        iframe.style.top = 0;
        parentDom.appendChild(iframe);
    }
    iframe.onload = function () {

    }
    iframe.onerror = function () {
        sLoading.showAlert("请求失败，请检查网络情况并重试！");
    }
}

function resizeGame() {
    //竖屏游戏
    var winWidth = $(window).width();
    var winHeight = $(window).height();

    function rotateGame(rotate_screen) {
        if (rotate_screen) {
            commonPlayer.rotate_screen = true;
            commonPlayer.gameWidth = $(window).height(); //屏幕可视区宽度
            commonPlayer.gameHeight = $(window).width(); //屏幕可视区高度
        } else {
            commonPlayer.rotate_screen = false;
            commonPlayer.gameWidth = $(window).width(); //屏幕可视区宽度
            commonPlayer.gameHeight = $(window).height(); //屏幕可视区高度
        }

    }

    if (commonPlayer.isVertical) {
        if (winHeight > winWidth) {
            //没转
            rotateGame(false);
        } else {
            //转了
            rotateGame(true);
        }
    } else {
        if (winWidth > winHeight) {
            //没转
            rotateGame(false);
        } else {
            //转了
            rotateGame(true);
        }
    }
    if (!commonPlayer.channel_id) {
        gameShare.ReDirectSharetes();
    }
}


//ajax
window.getAjax = function (url, type, data, suc, err, isJsonP) {
    //,async需要异步可以加
    if (isJsonP) {
        $.ajax({
                url: url, type: "get", data: data, dataType: "jsonp", jsonp: "jsonCallBack",
                success: function (data) {
                    suc && suc(data);
                }, error: function (data) {
                    err && err(data);
                }
            }
        );
    } else {
        $.ajax({
                url: url, type: type, data: data, dataType: "json",
                success: function (data) {
                    suc && suc(data);
                },
                error: function (data) {
                    err && err(data);
                }
            }
        );
    }
};


function getWXminiGindex (callBack){
    var url=window.location.protocol+"//www.66rpg.com/ajax/program/get_program";
    var data = {
        gindex:window.gIndex,
        program:1
    }
    getAjax(url,"json",data, function (result) {
        if(parseInt(result.status) == 1&&result.data&&result.data.gindex){
            callBack&&callBack(true);
        }else{
            callBack&&callBack(false);
        }
    }, function (data) {
        alert("网络异常，请刷新重试！")
    },true);
}

