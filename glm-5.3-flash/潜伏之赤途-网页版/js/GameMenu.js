function GameMenu(){
    var updateListData; //更新日志
    var gameOverData;//结局信息
    var gameLinkData;//友情链接
    var gameCommentData ={};//游戏评论
    var fineCommentData = {};//精品评论
    var self = this;

    this.gameInfoData;//游戏简介
    this.updateListData; //更新日志
    this.gameOverData;//结局信息
    this.gameLinkData;//友情链接
    this.gameCommentData ={};//游戏评论
    this.fineCommentData = {};//精品评论

    //this.stateInfo = {userToGame:{},gameInfo:{}}; //初始化时给出去的值  gameInfo游戏简介   userToGame点赞，关注，收藏

    this.author_uid = 0;//作者uid

    this.thumbsNum = 0;//点赞数
    this.thumbsState = 0;//点赞状态
    this.attentionState = 0;//关注状态
    this.collectNum =0;//收藏数
    this.collectState = 0; //收藏状态

    this.thumbsStateFlag = false;
    this.attentionStateFlag = false;
    this.collectStateFlag = false;

    this.thumsAllMsg=['您已经点过赞了哦！','','',''];
    this.attentionAllMsg = [""];
    this.collectAllMsg = [];


    this.thumsMsg = "";
    this.attentionMsg = "";
    this.collectMsg = "";

    this.stateCallBack = null; //初始化的回调
    this.userMenuStateFn = null; //状态们的回调

    this.fullScreen = false; //不是全屏

    this.uid = 0;

    //获取游戏数据 游戏简介
    this.get_Game_Info = function(callBack){
        if(this.gameInfoData){
            //如果有菜单信息，直接抛回去，如果没有去请求数据
            callBack&&callBack(this.gameInfoData);
        }else{
            var url = GAME_PATH.GAME_GET_GAME_INFO;
            var data = {
                gindex:gIndex,
                all:1
            };
            getAjax(url,"get",data,function(result){
                //获取信息成功
                if(parseInt(result.status) == 1){
                    self.gameInfoData = result.data.game;
                    self.author_uid = result.data.game.author_uid;
                    callBack&&callBack(self.gameInfoData);
                }else{
                    console.log(result.msg)
                }
            },function(){
                //error
                console.log("获取游戏简介失败");

            },true)
        }
    };
    //更新日志
    this.get_Update_List=function(callBack){
        if(updateListData){
            callBack&&callBack(updateListData);
        }else{
            var url = GAME_PATH.GAME_UPDATE_LOG;
            var data = {
                gindex:gIndex,
                game_flg:1
            };
            getAjax(url,"get",data,function(result){
                //获取信息成功
                if(parseInt(result.status) == 1){
                    updateListData = result.data;
                    callBack&&callBack(updateListData);
                }else{
                    console.log(result.msg)
                }
            },function(){
                //error
                console.log("获取更新日志失败");

            },true)

        }
    };
    this.commentBut = function(callBack){
        if(mark.WEB){
            window.parent.asUserOperate.jumpComment();
        }else{
            callBack&&callBack();
        }
    };
    //查看更多
    this.MoreBut = function(callBack){
        if(mark.ANDROID){
            if(typeof window.org_box == 'undefined'){
                callBack&&callBack("盒子失败了")
            }else{
                window.org_box.newMenuGameDetail(!commonPlayer.isVertical,parseInt(gIndex));
            }
            return;
        }else{
            callBack&&callBack("查看更多")
        }
    };
    //分享按钮
    this.shareBut = function(callBack){
        if(mark.ANDROID){
            if(typeof window.org_box == 'undefined'){
                callBack&&callBack("调盒子失败喽")
            }else{
                callBack&&callBack("调盒子喽");
                gname = commonPlayer.gameMenu.gameInfoData.gname;
                window.org_box.newMenuShare(!commonPlayer.isVertical,parseInt(gIndex),gname);
            }
            return;
        }else if(mark.WEB){
            callBack&&callBack("调web喽");
            window.parent.asUserOperate.shareBox();
            return;
        }else{
            gameShare.init();
        }
    }
    //分享按钮 退出按钮====flash 全屏按钮
    this.ExitBut = function(callBack){
        if(mark.ANDROID){
            if(typeof window.org_box == 'undefined'){
            }else{
                window.org_box.exitGame(!commonPlayer.isVertical);
            }
            return;
        }else if(mark.WEB){
            //全屏
            if(window.parent.asUserOperate.windowChange()){
                //全屏
                window.parent.asUserOperate.quitFullScreen();
                callBack&&callBack();
            }else{
                //退出全屏
                window.parent.asUserOperate.fullScreen();
                callBack&&callBack();
            }
            return;
        }
        var a = confirm("确定要退出作品吗？");
        if(a){
            var Exiturl = mUrl+"/game/mobileDown/"+gIndex;
            window.location.href= Exiturl;
        }
    };
    //获取结局信息==友情链接
    this.get_Over_Info = function(callBack){
        if(gameOverData){
            callBack&&callBack(gameOverData)
        }else{
            var url = GAME_PATH.GAME_LINK_OVER;
            var data = {
                gindex:gIndex
            };
            getAjax(url,"get",data,function(result){
                //获取信息成功
                if(parseInt(result.status) == 1){
                    var data  = result.data;
                    gameOverData = data.ending_info;
                    gameLinkData = data.friendly_link;
                    callBack&&callBack(gameOverData);
                }else{
                    console.log(result.msg)
                }
            },function(){
                //error
                console.log("获取结局信息==友情链接失败")

            },true)
        }
    }
    // 获取游戏评论
    this.get_Game_Comment=function(page,count,callBack){
        var getPage = page;
        var getCount = count;
        if(gameCommentData[""+getPage]){
            callBack&&callBack(gameCommentData[""+getPage]);
        }else{
            var url = GAME_PATH.GAME_COMMENT;
            var data = {
                gindex: gIndex,
                page: getPage,
                limit: getCount,
                call_source: "game",
                fine : 1,
                desc : 1
            };
            getAjax(url,"get",data,function(result){
                //获取信息成功
                if(parseInt(result.status) == 1 || parseInt(result.status) == 8){
                    var data = result.data;
                    gameCommentData[""+getPage] = data.comments;
                    callBack&&callBack(gameCommentData[""+getPage]);
                }else{

                    console.log(result.msg)
                }
            },function(){
                //error
                console.log("获取游戏评论失败")

            },true)
        }
    }
    //获取精品评论
    this.get_Fine_Comment = function(page,count,callBack){
        var getPage = page;
        var getCount = count;
        if(fineCommentData[""+getPage]){
            callBack&&callBack(fineCommentData[""+getPage]);
        }else{
            var url = GAME_PATH.GAME_FINE_COMMEN;
            var data = {
                gindex: gIndex,
                page: getPage,
                limit: getCount,
                call_source: "game",
                fine : 1,
                desc : 1
            };
            var sucfn = function(result){
                //获取信息成功
                if(parseInt(result.status) == 1){
                    var data = result.data;
                    fineCommentData[""+getPage] = data.comments;
                    callBack&&callBack(fineCommentData[""+getPage]);
                }else{
                    console.log(result.msg)
                }
            };
            var errfn = function(result){
                //error
                console.log("获取精品评论失败"+result)
            };
            getAjax(url,"get",data,sucfn,errfn,true)
        }
    }
    //初始化 点赞，打赏，关注
    this.gameMenuState = function(callBack){
        this.stateCallBack = callBack;
        this.uid = commonPlayer.userInfos.uid;

        self.get_Game_Info(function(){
            //获取游戏信息
            self.get_Thumbs_Num(function(){ //获取点赞数目
                self.get_Collect_Num(function(){  //获取收藏数目
                    if(commonPlayer.channel_id ==""){
                        //主站去初始化状态
                        self.get_Menu_state(function(){
                            self.stateCallBack&&self.stateCallBack();
                        });
                    } else {
                        //橙光+sdk
                        return;
                    }
                })
            })
        });
    };
    this.get_Menu_state = function(callBack){
        this.userMenuStateFn = callBack;
        if(commonPlayer.loginStatus){
            //登陆了
            if(mark.WEB){
                //isFlash
                //window.parent.NewGame.menuUserState(1);
                if(commonPlayer.userInfos.uid !=0){
                    window.parent.NewGame.loadComplete();
                }else{
                    this.clearMenuState();
                    self.userMenuStateFn&&self.userMenuStateFn();
                }
            }else if (mark.ANDROID){
                //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                window.org_box.orgMeunFun(0,parseInt(gIndex),parseInt(self.author_uid));
                window.org_box.orgMeunFun(3,parseInt(gIndex),parseInt(self.author_uid));
                window.org_box.orgMeunFun(6,parseInt(gIndex),parseInt(self.author_uid));
            }else{
                //m站
                self.get_Thumbs_State(function(){  //获取点赞状态
                    self.get_Attention_State(function(){  //获取关注状态
                        self.get_Collect_State(function(){  //获取收藏状态
                            self.userMenuStateFn&&self.userMenuStateFn();
                        })
                    })
                });
            }
        }else{
            //没登陆
            self.thumbsState = 0;
            self.attentionState = 0;
            self.collectState=0;
            this.userMenuStateFn&&this.userMenuStateFn();
        }
    };


    //获取点赞数目
    this.get_Thumbs_Num = function(callBack){
        if(self.thumbsNum>1){
            callBack&&callBack();
        }else{
            if(mark.WEB){
                self.thumbsNum = parseInt(window.parent.asUserOperate.gameDetail().detail.like_sum);  //点赞数目
                callBack&&callBack();
            }else{
                var url = GAME_PATH.GET_THUMBS_NUM;
                var data = {
                    gindex : gIndex
                };
                var sucfn = function(data){
                    if(parseInt(data.status)==1){
                        self.thumbsNum = parseInt(data.data);
                        callBack&&callBack();
                    }else{
                        console.log(data.msg)
                    }
                };
                var errfn = function(){
                    console.log("获取点赞数目---error")
                };
                getAjax(url,"get",data,sucfn,errfn,true);
            }
        }
    };
    //获取点赞状态
    this.get_Thumbs_State = function(callBack){
        var url = GAME_PATH.GET_THUMBS_STATE;
        var data = {
            gindex :gIndex
        };
        var sucfn = function(data){
            // status === 0 未点赞  1 点赞
            if(parseInt(data.status)==1){
                self.thumbsState = 1;//??值为什么没定
                callBack&&callBack(data);
            }else{
                self.thumbsState = 0;//??值为什么没定
                callBack&&callBack(data);
            }
        };
        var errfn = function(){
            console.log("获取点赞状态---error");
        };
        getAjax(url,"get",data,sucfn,errfn,true);

    };
    //上传点赞
    this.up_Thumbs = function(callBack){
        this.up_Thumbs_Fn = callBack;
        if(commonPlayer.loginStatus) {
            //如果没有登录
            //去登陆
            if(this.author_uid == commonPlayer.userInfos.uid){
                self.thumbsState = 0;
                self.thumsMsg = "作者本人不可点赞哦！";
                self.up_Thumbs_Fn&&self.up_Thumbs_Fn(self.thumsMsg,this.thumbsState,self.thumbsNum);
                return;
            }

            if (this.thumbsState == 1) {
                this.thumsMsg = "您已经点过赞了哦！";
                this.up_Thumbs_Fn && this.up_Thumbs_Fn(this.thumsMsg,this.thumbsState,self.thumbsNum);
            } else {
                if (mark.WEB) {
                    if (this.thumbsState == 0) {
                        //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                        window.parent.asUserOperate.asUserBtn("dz", "点赞");
                    }
                } else if (mark.ANDROID) {
                    if (typeof window.org_box == 'undefined') {
                        this.up_Thumbs_Fn && this.up_Thumbs_Fn("方法不存在呀");
                    } else {
                        if (this.thumbsState == 0) {
                            //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                            window.org_box.orgMeunFun(7, parseInt(gIndex), parseInt(this.author_uid));
                        }
                    }
                } else {
                    var url = GAME_PATH.UP_THUMBS;
                    var data = {
                        gindex: gIndex
                    };
                    var sucfn = function (data) {
                        if(data.status == 1){
                            self.thumbsState = 1;
                            self.thumbsNum+=1;
                            self.thumsMsg = '点赞成功！';
                            self.up_Thumbs_Fn&&self.up_Thumbs_Fn(self.thumsMsg,self.thumbsState,self.thumbsNum);
                        }else{
                            //-100  作者本人不可点赞
                            self.thumbsState = 0;
                            self.up_Thumbs_Fn&&self.up_Thumbs_Fn(data.msg,self.thumbsState,self.thumbsNum);
                        }
                    };
                    var errfn = function () {
                        console.log("去点赞==error");
                    };
                    getAjax(url, "get", data, sucfn, errfn, true);
                }
            }
        }
    };
    //获取关注状态
    this.get_Attention_State = function(callBack){
        //登录后去获得收藏状态
        var url =GAME_PATH.GET_ATTENTION_STATE;
        //"status 1 已关注 ; 0 未关注 ; -2  失败"
        var data = {
            uid2 :self.author_uid
        };
        var sucfn = function(data){
            if(data.status ==1){
                //0：拉黑 1：关注  2:被删除的助理(仍关注) 3:助理(仍关注) 101：无关注
                if(data.data.self_status == 1||data.data.self_status == 2||data.data.self_status == 3){
                    self.attentionState = 1;
                }else{
                    self.attentionState = 0;
                }
            }else if(data.status == -2){
                //目标用户ID和自身ID相同
                self.attentionState = -2;
            }else{
                self.attentionState = 0;
            }
            callBack&&callBack(data);
        };
        var errfn = function(){
            console.log("获取关注状态--error");
        };
        getAjax(url,"get",data,sucfn,errfn,true);
    };

    //点击关注按钮
    this.attention_Btn = function(callBack){
        this.attention_Btn_Fn = callBack;
        if(commonPlayer.loginStatus) {
            if(this.author_uid == commonPlayer.userInfos.uid){
                self.attentionState = 0;
                self.attentionMsg = "作者本人不可关注哦！";
                self.attention_Btn_Fn&&self.attention_Btn_Fn(self.attentionMsg,self.attentionState);
                return;
            }

            if(mark.ANDROID){
                if(typeof window.org_box == 'undefined'){
                    self.attention_Btn_Fn&&self.attention_Btn_Fn("盒子方法找不到");
                }else{
                    if(self.attentionState == 101 || this.attentionState == 0){
                        //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                        window.org_box.orgMeunFun(4,parseInt(gIndex),parseInt(self.author_uid));
                    }else if(self.attentionState == 1){
                        //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                        window.org_box.orgMeunFun(5,parseInt(gIndex),parseInt(self.author_uid));
                    }
                }
            }else if(mark.WEB){
                if(self.attentionState == 101 || this.attentionState == 0){
                    //关注
                    window.parent.asUserOperate.asUserBtn("gz","关注");
                }else{
                    //取消关注
                    window.parent.asUserOperate.asUserBtn("qxgz","取消关注");
                }
            }else{
                if(self.attentionState == 101 || this.attentionState == 0){
                    //关注
                    self.up_Attention(function(data){
                        if(data.status ==1){
                            //添加关注成功
                            self.attentionState = 1;
                            self.attentionMsg = "关注成功！";
                            self.attention_Btn_Fn&&self.attention_Btn_Fn(self.attentionMsg,self.attentionState);

                        }else{
                            self.attentionState = 0;
                            self.attentionMsg = "关注失败啦！";
                            self.attention_Btn_Fn&&self.attention_Btn_Fn(self.attentionMsg,self.attentionState);
                        }
                    })
                }else if(self.attentionState == -2){
                    self.attentionState = -2;
                    self.attentionMsg = "作者本人不可关注哦！";
                    self.attention_Btn_Fn&&self.attention_Btn_Fn(self.attentionMsg,self.attentionState)
                }else{
                    //取消关注
                    self.up_Attention_cancel(function(data){
                        if(data.status ==1){
                            //取消关注成功
                            self.attentionState = 0;
                            self.attentionMsg = "取消关注成功！";
                            self.attention_Btn_Fn&&self.attention_Btn_Fn(self.attentionMsg,self.attentionState)
                        }else {
                            self.attentionMsg = "取消关注失败！";
                            self.attention_Btn_Fn&&self.attention_Btn_Fn(self.attentionMsg,self.attentionState)
                        }
                    })
                }
            }
        }
    };
    //去关注
    this.up_Attention= function (callBack) {
        var url = GAME_PATH.UP_ATTENTION;
        var data = {
            uid2 :self.author_uid,
            platform: 4
        };
        var sucfn = function(data){
            callBack&&callBack(data);
        };
        var errfn = function(){
            console.log("去关注接口错误")
        };
        getAjax(url,"get",data,sucfn,errfn,true);
    };
    //取消关注
    this.up_Attention_cancel= function (callBack) {
        var url = GAME_PATH.UP_ATTENTION_CANCEL;
        var data = {
            uid2 :self.author_uid,
            platform: 4
        };
        var sucfn = function(data){
            callBack&&callBack(data);
        };
        var errfn = function(){
            console.log("取消关注接口报错")
        };
        getAjax(url,"get",data,sucfn,errfn,true);
    };

    //获取收藏数目
    this.get_Collect_Num = function(callBack){
        if(this.collectNum > 0){
            callBack&&callBack();
        }else{
            if(mark.WEB){
                this.collectNum = parseInt(window.parent.asUserOperate.gameDetail().detail.collect_sum); //;   收藏
            }else{
                this.collectNum = parseInt(gamefv_times);
            }
            callBack&&callBack();
        }
    };
    //获取收藏状态
    this.get_Collect_State = function(callBack){
        //登录后去获得收藏状态
        var url =GAME_PATH.GET_COLLECT_STATE;
        //"status 1 收藏 ; 0 未收藏 ; -2  失败"
        var data = {
            gindex :gIndex
        };
        var sucfn = function(data){
            self.collectState = data.status;
            callBack&&callBack(data);
        };
        var errfn = function(){

        };
        getAjax(url,"get",data,sucfn,errfn,true);
    };
    //收藏按钮
    this.collect_Btn = function(callBack){
        this.collect_Btn_Fn = callBack;
        if(commonPlayer.loginStatus) {
            if (this.author_uid == commonPlayer.userInfos.uid) {
                self.collectState = 0;
                self.collectMsg = "作者本人不可收藏哦！";
                self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg,self.collectState,self.collectNum);
                return;
            }
            if (mark.ANDROID) {
                if (typeof window.org_box == 'undefined') {
                    this.collect_Btn_Fn && this.collect_Btn_Fn("盒子方法报错");
                } else {
                    if (self.collectState == 0) { //去收藏
                        //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                        window.org_box.orgMeunFun(1, parseInt(gIndex), parseInt(self.author_uid));
                    } else if (self.collectState == 1) { //取消收藏
                        //盒子 type 值：0 : 查看收藏状态 1：收藏 2：取消收藏 3：查看关注状态 4：关注5：取消关注 6：查看点赞状态  7：点赞
                        window.org_box.orgMeunFun(2, parseInt(gIndex), parseInt(self.author_uid));
                    }
                }
            } else if (mark.WEB) {
                if (self.collectState == 0) {
                    window.parent.asUserOperate.asUserBtn("sc", "收藏");
                } else if (self.collectState == 1) {
                    window.parent.asUserOperate.asUserBtn("sc", "取消收藏");
                }
            } else {
                if (self.collectState == 0) {
                    self.up_Collect(function (result) {
                        if (parseInt(result.status) == 1) {
                            //添加成功
                            self.collectState = 1;
                            self.collectNum += 1;
                            self.collectMsg = "收藏成功";
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        } else if (parseInt(result.status) == -2) {
                            //不能自己收藏自己
                            self.collectState = 0;
                            self.collectMsg = "" + result.msg;
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        } else {
                            self.collectState = 0;
                            self.collectMsg = "" + result.msg;
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        }
                    })
                } else if (self.collectState == 1) {
                    self.up_Collect_cancel(function (result) {
                        //取消收藏成功
                        if (result.status == 1) {
                            //取消收藏成功
                            self.collectState = 0;
                            self.collectNum -= 1;
                            self.collectMsg = "取消收藏成功";
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        } else if (result.status == -2) {//取消收藏失败
                            self.collectMsg = '' + result.msg;
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        } else if (result.status == 0) {//已经取消收藏
                            self.collectMsg = "已经取消收藏";
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        } else {//其他情况
                            self.collectMsg = '' + result.msg;
                            self.collect_Btn_Fn && self.collect_Btn_Fn(self.collectMsg, self.collectState, self.collectNum);
                        }
                    });
                }
            }
        }
    }
    //去收藏
    this.up_Collect= function (callBack) {
        var url = GAME_PATH.UP_COLLECT;
        var data = {
            gindex :gIndex,
            platform: 4
        };
        var sucfn = function(result){
            callBack&&callBack(result)
        };
        var errfn = function(){
            console.log("收藏接口不通");
        };
        getAjax(url,"get",data,sucfn,errfn,true);
    };
    //取消收藏
    this.up_Collect_cancel= function (callBack) {
        var url = GAME_PATH.UP_COLLECT_CANCEL;
        var data = {
            gindex :gIndex,
            platform: 4

        };
        var sucfn = function(data){
            callBack(data);
        };
        var errfn = function(){

        };
        getAjax(url,"get",data,sucfn,errfn,true);
    };
    this.clearMenuState = function(){
        this.collectState = 0;
        this.attentionState = 0;
        this.thumbsState = 0;
    };

}
commonPlayer.gameMenu =  new GameMenu ();
//如果是作者
function isAuthorMenuUserState(){
        var gameMenu = commonPlayer.gameMenu;
        gameMenu.thumbsState = 0;
        gameMenu.attentionState = 0;
        gameMenu.collectState=0;
        gameMenu.userMenuStateFn&&gameMenu.userMenuStateFn();
}
//盒子调用方法
function aBoxCallSCGMenuUserState(type,res){
    var gameMenu = commonPlayer.gameMenu;
    switch (type){
        case 0://查看收藏状态
            if(res == 1){
                gameMenu.collectState = 1;
            }else if(res == -2){
                gameMenu.collectState = -2;
            }else{
                gameMenu.collectState = 0;
            }
            gameMenu.collectStateFlag = true;
            break;
        case 1://收藏
            if(res == 1){
                //收藏成功
                gameMenu.collectMsg = "收藏成功！";
                gameMenu.collectNum+=1;
                gameMenu.collectState = 1;
                gameMenu.collect_Btn_Fn&&gameMenu.collect_Btn_Fn(gameMenu.collectMsg,gameMenu.collectState,gameMenu.collectNum);
            }else if(res == 6){
                //收藏成功
                gameMenu.collectMsg = "收藏成功！";
                gameMenu.collectNum+=1;
                gameMenu.collectState = 1;
                gameMenu.collect_Btn_Fn&&gameMenu.collect_Btn_Fn(gameMenu.collectMsg,gameMenu.collectState,gameMenu.collectNum);
            }else{
                gameMenu.collectMsg = "收藏失败！";
                gameMenu.collectState = 0;
                gameMenu.collect_Btn_Fn&&gameMenu.collect_Btn_Fn(gameMenu.collectMsg,gameMenu.collectState,gameMenu.collectNum);
            }
            break;
        case 2://取消收藏
            if(res == 1){
                gameMenu.collectMsg = "取消收藏成功！";
                gameMenu.collectNum-=1;
                gameMenu.collectState = 0;
                gameMenu.collect_Btn_Fn&&gameMenu.collect_Btn_Fn(gameMenu.collectMsg,gameMenu.collectState,gameMenu.collectNum);
            }else{
                gameMenu.collectMsg = "取消收藏失败！";
                gameMenu.collectState = 1;
                gameMenu.collect_Btn_Fn&&gameMenu.collect_Btn_Fn(gameMenu.collectMsg,gameMenu.collectState,gameMenu.collectNum);
            }
            break;
        case 3://查看关注状态
            if(res == 1){
                gameMenu.attentionState = 1;
            }else if(res == -201){
                gameMenu.attentionState = -2;
            }else if(res == 0||res == 101){
                gameMenu.attentionState = 0;
            }else{
                gameMenu.attentionState = 0;
            }
            gameMenu.attentionStateFlag = true;
            break;
        case 4://关注 0:拉黑      1:已关注        2:被删除的助理    3:助理    101:未关注  -201:自己
            if(res == 1){
                gameMenu.attentionMsg = "关注成功！";
                gameMenu.attentionState = 1;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }else if(res == -201){
                gameMenu.attentionMsg = "作者本人不可关注哦！";
                gameMenu.attentionState = 0;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }else if(res == 0||res == 101){
                gameMenu.attentionMsg = "未关注！";
                gameMenu.attentionState = 0;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }else{
                gameMenu.attentionMsg = "关注失败！";
                gameMenu.attentionState = 0;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }
            break;
        case 5://取消关注
            if(res == 1){
                gameMenu.attentionMsg = "取消关注失败！";
                gameMenu.attentionState = 1;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }else if(res == -201){
                gameMenu.attentionMsg = "作者本人不可关注哦！";
                gameMenu.attentionState = 0;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }else if(res == 0||res == 101){
                gameMenu.attentionMsg = "取消关注成功！";
                gameMenu.attentionState = 0;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }else{
                gameMenu.attentionMsg = "关注失败！";
                gameMenu.attentionState = 0;
                gameMenu.attention_Btn_Fn&&gameMenu.attention_Btn_Fn(gameMenu.attentionMsg,gameMenu.attentionState)
            }
            break;
        case 6://查看点赞状态
            if(res == 1){
                gameMenu.thumbsState = 1;
            }else{
                gameMenu.thumbsState = 0;
            }
            gameMenu.thumbsStateFlag = true;
            break;
        case 7://点赞
            if(mark.WEB){
                if(res == 1){
                    gameMenu.thumbsState = 1;
                    gameMenu.thumbsNum += 1;
                    gameMenu.thumsMsg = "点赞成功！";
                }else if(res == -100){
                    gameMenu.thumbsState = 0;
                    gameMenu.thumsMsg = "作者本人不可点赞哦！";
                }else{
                    gameMenu.thumsMsg = "";
                }
            }else{
                if(res == 1){
                    gameMenu.thumbsState = 1;
                    gameMenu.thumbsNum += 1;
                    gameMenu.thumsMsg = "点赞成功！";
                }else if(res == -100){
                    gameMenu.thumbsState = 0;
                    gameMenu.thumsMsg = "作者本人不可点赞哦！";
                }else{
                    gameMenu.thumsMsg = "不能重复点赞";
                }
            }
            gameMenu.up_Thumbs_Fn&&gameMenu.up_Thumbs_Fn(gameMenu.thumsMsg,gameMenu.thumbsState,gameMenu.thumbsNum);
            break;
    }
    WebUserChangeData&&WebUserChangeData();
    if(gameMenu.thumbsStateFlag&&gameMenu.attentionStateFlag&&gameMenu.collectStateFlag){
        gameMenu.thumbsStateFlag = false;
        gameMenu.attentionStateFlag = false;
        gameMenu.collectStateFlag = false;
        gameMenu.userMenuStateFn&&gameMenu.userMenuStateFn();
    }
}