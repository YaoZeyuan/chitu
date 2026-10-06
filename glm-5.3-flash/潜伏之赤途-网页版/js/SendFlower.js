function SendFlower() {
    var self = this;
    this.userCoin = 11;
    var ismod = false;
    this.sendFlowerState = function (callBack, type,paramsJson) {
        this.sendFlwStateFn = callBack;
        if (mark.ANDROID) {
            if (typeof window.org_box == 'undefined') {
            } else {
                if (!type) {
                    type = 7;
                }                
                if(window.org_box.sendFlowerUsedWeb){
                    window.org_box.sendFlowerUsedWeb(paramsJson,"flower",!commonPlayer.isVertical,parseInt(gIndex),"浏览器-引擎送花");
                }else{
                    if (ismod == "true") { //为mod而加
                        window.org_box.newMenuSendFlower(!commonPlayer.isVertical, parseInt(gIndex), modId, parseInt(type));
                    } else {
                        window.org_box.newMenuSendFlower(!commonPlayer.isVertical, parseInt(gIndex), "", parseInt(type));
                    }
                }
            }
        } else if (mark.WEB) {
            //flash打赏----要用
            //xx
            window.parent.asUserOperate.sendFlowerWindow(type);
        } else {
            if (self.userCoin && self.userCoin.coin2) {
                callBack && callBack(self.userCoin.coin2.coin_count,type);
            } else {
                var url = GAME_PATH.USER_CJH_INFO;
                var data = {};
                var sucfn = function (res) {
                    if (res.status == 1) {
                        self.userCoin = res.data;
                        callBack && callBack(self.userCoin.coin2.coin_count,type);
                    } else {
                        callBack && callBack(-1,type);
                    }
                };
                var errfn = function () {
                    callBack && callBack("error");
                };
                if (type) {
                    data.flower_place = type;
                }
                getAjax(url, "get", data, sucfn, errfn, true, type);
            }
        }
    };
    //鲜花打赏按钮
    this.up_Sent_Flower = function (num, callBack, type) {
        var url = GAME_PATH.FLOWER_SEND_FLOWER;
        var data = {
            gindex: gIndex,
            num: num
        };
        if (type) {
            data.flower_place = type;
        }
        var sucfn = function (data) {
            if (data.status == 1) {
                self.userCoin.coin2.coin_count -= parseInt(num);
                commonPlayer.flower.num += parseInt(num);
                commonPlayer.flower.sum += parseInt(num);
                commonPlayer.flower.fresh_flower_num += parseInt(num);
                self.userCoin.coin1.coin_count += (30 * num);
                callBack && callBack("送花成功了");
            } else if (data.status == -2000) {
                //spTitle
                callBack && callBack(data.status);
            } else {
                callBack && callBack(data.status);
            }
        };
        var errfn = function () {
            callBack && callBack("error");
        };
        getAjax(url, "get", data, sucfn, errfn, true, type);
    };
    //充值按钮
    this.go_To_Pay = function () {
        var mainFrameDiv = document.getElementById("mainFrameDiv");

        if (!mainFrameDiv) {
            var mainFrameDiv = document.createElement("div");
            mainFrameDiv.id = "mainFrameDiv";
            document.body.appendChild(mainFrameDiv);
        }
        mainFrameDiv.style.display = "block";
        creatIfram(webUrl + "/home/pay?platForm=h5", mainFrameDiv);
    }
}

commonPlayer.sendFlower = new SendFlower();


//盒子中+flash 打赏游戏
function aBoxSendFlowerCall(val) {
    try {
        if (mark.ANDROID) {
            if (typeof window["org_box"] == 'undefined') {

            } else {
                setTimeout(function () {
                    commonPlayer.login.getFlower(function () {
                        //打赏回来，刷新界面
                        WebUserChangeData && WebUserChangeData();
                    });
                }, 1500);
            }
            return;
        }
        var valInt = parseInt(val);
        if (commonPlayer.flower) {
            commonPlayer.flower.num += valInt;
            commonPlayer.flower.fresh_flower_num += valInt;
            commonPlayer.flower.sum += valInt;
            //加一个和尚的回调，要去各种刷新，重新取数据
            console.log("鲜花打赏回调", commonPlayer.flower);
            WebUserChangeData && WebUserChangeData();
        }
    } catch (e) {

    }
}