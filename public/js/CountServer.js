/*var pTime=30;//控制有效操作
var runTime=0;//控制运行时长
var upT=0.3;//上报时间间隔（分钟）
/!*var upT=2;//上报时间间隔（分钟）*!/*/
var systemTime=new Object();

function CountServer(){
    var self = this;
    var key;//秘钥
    //流量统计
    this.allFileNum=0;
    this.allFlow=0;

    //流量统计wmod
    this.allWmodArr={};
    //运行时长统计
    this.pTime=30;//控制有效操作
    this.runTime=0;//控制运行时长
    this.upT = 2;//上报时间间隔（分钟）
    //duration of a call
    this.durationCall = function(){
        this.pTime = 30;
    }

    //统计游戏时长  游戏的有效时长
    this.gamePlayTime = function(){
        if(commonPlayer.userInfos.uid <= 0 && !window.org_box){
            return;
        }
        var LocalChaTime = 0;
        this.uid = commonPlayer.userInfos.uid;
        if(this.uid == 0 && window.org_box){
            //todo 修改用户的uid
            this.uid = window.org_box.GetUid();
        }
        if(window.iOSinfo && !this.uid){
            this.uid = window.iOSinfo.uid;
        }
        //上报服务器的秒数
        var postT = self.upT*60;
        //获取公钥
        var hours=new Date().getHours();
        //首次获取公钥
        self.getServerKey(function(){
            //进入游戏先报一次
            self.initUPTimer();
            try{
                //第一次进入页面寻找 runtime
                var localRunTime = window.localStorage.getItem("runtime");
                //如果有值 立马上报一次  然后消除缓存
                if(localRunTime){
                    var objStr=localRunTime.split('|');
                    if(objStr.length>1){

                        //老数据 先上提一次
                        self.upRunTimeAjax();
                        //再来一次确保已清除老数据
                        window.localStorage.removeItem("runtime");
                    }
                }
                //永远不会停的游戏时长 定时器 1/s
                setInterval(function () {
                    self.pTime-=1;
                    if(self.pTime<=0){
                        self.pTime = 0;
                    }else{
                        postT-=1;
                        self.runTime += 1;
                        LocalChaTime++;
                        if(LocalChaTime == 5){
                            localRunTime = window.localStorage.getItem("gameRuntime");
                            //如果有
                            if(localRunTime&&(localRunTime.indexOf("/")!=-1||localRunTime.indexOf("\\")!=-1||localRunTime.indexOf("|")!=-1||localRunTime.indexOf("null")!=-1||localRunTime.indexOf("_")!=-1||localRunTime.indexOf(":") == -1)) {
                                localRunTime = null;
                            }

                            if(localRunTime){
                                try{
                                    localRunObj = JSON.parse(localRunTime);
                                }catch(e) {
                                    window.localStorage.removeItem("gameRuntime");
                                    localRunObj = {};
                                    localRunObj[gIndex] = 0;
                                }
                                if(localRunObj[gIndex]){
                                    //接着记录
                                    localRunObj[gIndex] = self.runTime;
                                }else{
                                    //没有插入
                                    localRunObj[gIndex] = LocalChaTime;
                                    self.runTime = LocalChaTime;
                                }

                            }else{
                                //如果没有
                                window.localStorage.removeItem("gameRuntime");
                                var localRunObj = {};
                                localRunObj[gIndex] = LocalChaTime;
                                self.runTime = LocalChaTime;
                            }
                            var localRunStr = JSON.stringify(localRunObj);
                            window.localStorage.setItem("gameRuntime",localRunStr);
                            LocalChaTime = 0;
                        }
                    }

                    //控制上报时间
                    if(postT<=0){
                        //2分钟上报时间到
                        self.upRunTimeAjax();
                        postT=self.upT*60;
                    }
                    //每隔一小时获取一次key
                    var h=new Date().getHours();
                    if(h!=hours){
                        hours=h;
                        self.getServerKey();
                    }
                },1000);
            } catch(e) {
                setInterval(function () {
                    self.pTime-=1;
                    if(self.pTime<=0){
                        self.pTime=0;
                    }else{
                        postT-=1;
                        self.runTime += 1;
                    }
                    //控制上报时间
                    if(postT<=0){
                        //2分钟上报时间到
                        self.upRunTimeAjax();
                        postT=self.upT*60;
                    }
                    //每隔一小时获取一次key
                    var h=new Date().getHours();
                    if(h!=hours){
                        hours=h;
                        self.getServerKey();
                    }
                },1000);
            }
        });
    };
    this.sendBoxTime = function(str){
         if(window["org_box"] && window["org_box"].updateGameTime){
            try{
                var t_o = JSON.parse(str);
                window["org_box"].updateGameTime(parseInt(t_o["run"][gIndex]));
            }catch(e){
                // alert(e);
                console.error(e);
            }
        }
    }
    //上报游戏时长 运行时间ajax
    this.upRunTimeAjax = function(){
        if(commonPlayer.userInfos.uid <= 0){
            return;
        }
        //先初始化存储器 准备str
        var str="";  //新建字符串
        var upStr=window.localStorage.getItem("runtime");
        var newUpStr = window.localStorage.getItem("gameRuntime")||"";
        var objArr=new Array();
        var objIndexArr=new Array();

        if(upStr){
            //有数据  748794_120|
            var objStr=upStr.split('|');
            for(var i = 0;i<objStr.length;i++){
                if(objStr[i].length>1){
                    objIndexArr.push(objStr[i].split('_')[0]);
                    objArr.push(objStr[i].split('_')[1]);
                }
            }
            /*for(var i=0;i<objArr.length;i++){
                newUpStr+='"'+objIndexArr[i]+'"'+':'+objArr[i]+',';
            }*/
            var json ={};
            if(objIndexArr.length>0&&objArr.length>0){
                for(var i=0;i<objArr.length;i++){
                    json[''+objIndexArr[i]]= objArr[i];
                }
                newUpStr = JSON.stringify(json);
                str='{"run":'+newUpStr+'}';
            }
            window.localStorage.removeItem("runtime");
        }else{
            //新数据
            if(newUpStr){
                if(newUpStr.indexOf("/")!=-1||newUpStr.indexOf("|")!=-1||newUpStr.indexOf("null")!=-1||newUpStr.indexOf("_")!=-1){
                    //为错误数据加容错
                    window.localStorage.removeItem("gameRuntime");
                    str = '{"run":{'+gIndex+':'+self.runTime+'}}'
                }else{
                    str = '{"run":'+newUpStr+'}';
                }
            }else{
                str = '{"run":{'+gIndex+':'+self.runTime+'}}'
            }
        }
        //确定用户 uid
        if(parseInt(this.uid)!=commonPlayer.userInfos.uid){
            this.uid = commonPlayer.userInfos.uid;
        }
		if(this.uid == 0 && window.org_box){
            //todo 修改用户的uid
            this.uid = window.org_box.GetUid();
        }
        if(window.iOSinfo && !this.uid){
            this.uid = window.iOSinfo.uid;
        }
        var url=GAME_PATH.UP_GAME_RUN_TIME;
        var obj = {};
        obj.data=str;
        obj.uid=this.uid;
        obj.ts=Math.round(new Date().getTime()/1000);
        obj.check=md5(obj.data+this.uid+obj.ts+key);
        obj.platform = 3 ;//代表H5不分平台
        obj.channel_id=gameConfig.channel_id||0;
        //如果有效操作的情况下，上报
        this.sendBoxTime(str);
        if(this.pTime>0){
            getAjax(url,"post",obj,function(result){
                if(result.status==1){
                    //上报成功清空uid gindex对应数据
                   window.localStorage.removeItem("gameRuntime");
                }else{
                    //上报失败，记录下来，下一次上报上去
                    if(newUpStr){
                        newUpStr = newUpStr;
                        window.localStorage.setItem("gameRuntime",newUpStr);
                    }else{
                        var failStr = '{'+gIndex+':'+self.runTime+'}';
                        failStr = failStr;
                        window.localStorage.setItem("gameRuntime",failStr);
                    }
                }
                self.runTime=0;
            },function(){
                //上报失败，记录下来，下一次上报上去
                if(newUpStr){
                    //newUpStr = JSON.stringify(newUpStr);
                    window.localStorage.setItem("gameRuntime",newUpStr);
                }else{
                    var failStr = '{'+gIndex+':'+self.runTime+'}';
                    //failStr = JSON.stringify(failStr);
                    window.localStorage.setItem("gameRuntime",failStr);
                }
            },false);
        }
    };
    //初次进入游戏，上报一秒,只上报一次
    this.initUPTimer = function(){
        
        var url=GAME_PATH.UP_GAME_RUN_TIME;
        var obj = {};
        var newUpStr = {};
        newUpStr[""+gIndex]=1;
        obj.data='{"run":'+JSON.stringify(newUpStr)+'}';
        obj.uid=this.uid;
        obj.ts=Math.round(new Date().getTime()/1000);
        obj.check=md5(obj.data+this.uid+obj.ts+key);
        obj.platform = 3 ;//代表H5不分平台
        obj.channel_id=gameConfig.channel_id||0;
        this.sendBoxTime(obj.data);
        getAjax(url,"post",obj,function(result){
            if(result.status==1){
                //上报成功清空uid gindex对应数据
                console.log("进入游戏，第一次上报成功")
            }else{
                console.log("进入游戏，第一次上报失败")
            }
        },function(){
            //上报失败，记录下来，下一次上报上去
            console.log("进入游戏，第一次上报 接口报错")

        },false);
    };

    //获取公钥
    this.getServerKey = function(callBack){
        //获取公钥
        var date=new Date().getDate();
        var url=GAME_PATH.UP_GAME_GET_KEY;
        var data = {
            uid:this.uid,
            data:date,
            check:""
        };
        //首次获取公钥
        getAjax(url,"get",data,function(result){
            if(result.status == 1){
                key=result.data;
                //看本地是否有缓存，有就上传一次
                var haveLocal=window.localStorage.getItem(self.uid+gIndex+"time");
                if(haveLocal!=null){
                    self.upRunTimeAjax();
                }
                callBack&&callBack();
            }
        },function(){
            console.log("获取秘钥失败");
        },false)
    };
    //统计全端游戏的运行量
    this.gameDuration = function(){
        var gameQuality=2;
        if(parseInt(quality) == 31){
            gameQuality = 1;
        }else{
            gameQuality = 2;
        }
        var url = GAME_PATH.GAME_FLOW;
        var data = {
            status:0, //int  审核状态
            op : 5001,//int  [5001:h5操作｜3001:ios|4001:android|0:web+QQ游戏大厅]
            token : "",//string  可以为空,但是必须要带上
            gindex :gIndex ,//int   游戏ID
            guid : guid,//string  游戏工程ID
            name : encodeURI(document.title),//string  经过urlencode后的游戏名称
            channel_id :commonPlayer.channel_id||0,//int  合作方渠道id(橙光:0)
            group_id : 0,//sint  wmod group_id(暂无)
            definition : gameQuality,//int  清晰度1低清 2高清,在index
            engine: 2, //int  引擎1flash  2H5
            uid  : commonPlayer.userInfos.uid||0,
            platform : commonPlayer.platform//string  平台  -1未知   0网页  1iOS 2安卓  3终端锁定版  4手机站  5后台  6C#工具  7h5工具  8bbs  9H5联运

        };
        getAjax(url,"get",data,function(result){
            console.log(result);
        },function(data){
            console.log("流量统计失败");
        },false);
    };
    //运行次数
    this.gameCount = function(){

    };
    //累加流量+文件数
    this.submitAllFlow = function(allFlow,allFileNum,groupID,wmodId){
        if(wmodId){
            if(!this.allWmodArr[wmodId]){
                this.allWmodArr[wmodId] = {
                    allFlow:0,
                    allFileNum:0
                }
            }
            this.allWmodArr[wmodId].allFlow += parseInt(allFlow);
            this.allWmodArr[wmodId].allFileNum += parseInt(allFileNum);
            if(this.allWmodArr[wmodId].allFlow > 10*1024*1024){
                this.gameFlow("",groupID,wmodId);
            }
            this.allWmodArr[wmodId].allFlow = 0;
            this.allWmodArr[wmodId].allFileNum = 0;
            return;
        }
        this.allFlow += parseInt(allFlow);
        this.allFileNum+= parseInt(allFileNum);
        //console.log('流量统计',this.allFlow,this.allFileNum,this.allFlow>10*1024*1024);
        if(this.allFlow > 10*1024*1024){
            this.gameFlow();
        }
        this.allFlow = 0;
        this.allFileNum = 0;
    }
    //流量统计 统计全端游戏的流量与打开文件数
    this.gameFlow = function(ref,groupId,wmodId){
        ref = ref?ref:"";
        groupId = groupId?groupId:0;
        wmodId = wmodId?wmodId:0;
        //allFlow==流量数===allFileNum ==文件数
        var fb = wmodId?this.allWmodArr[wmodId].allFlow:this.allFlow;
        var fc = wmodId?this.allWmodArr[wmodId].allFileNum:this.allFileNum;
        var url = GAME_PATH.GAME_FLOW;
        var data = {
            op         : 201,//int     201 所有端操作
            guid       : guid,//string  游戏工程ID
            fb         : fb,//int     流量[单位字节]
            fc         : fc,//int     打开文件数
            token      : "",//string  可以为空,但是必须要带上
            ref        : ref,//string  [ios|android|h5|](其它渠道传channel_id) (channel_id:0 橙光主站)
            channel_id : commonPlayer.channel_id,//int    渠道ID
            group_id   : groupId,//int    wmod group_id(暂无)
            wmod_id    : wmodId,
            platform   : commonPlayer.platform//string  平台  -1未知   0网页  1iOS 2安卓  3终端锁定版  4手机站  5后台  6C#工具  7h5工具  8bbs  9H5联运
        }
        getAjax(url,"get",data,function(result){
            console.log(result);
        },function(data){
            console.log("流量统计失败");
        },false);
    };
    this.getServerTime = function(callBack){
        //这个地方获取一次系统时间和本地时间戳
        var url = GAME_PATH.GAME_SYSTEM_TIME;
        var data = {};
        getAjax(url,"get",data,function(result){
            if(parseInt(result.status) == 1){
                commonPlayer.timesTrampSys = parseInt(result.data.timestramp);//系统时间戳
                callBack&&callBack(commonPlayer.timesTrampSys);
            }else{
                commonPlayer.timesTrampSys=-1;
                callBack&&callBack(commonPlayer.timesTrampSys);
            }
        },function(){
            commonPlayer.timesTrampSys=-1;
            callBack&&callBack(commonPlayer.timesTrampSys);
        },true);
    };
    this.setRunTime = function(){
        setInterval(function(){
            if(commonPlayer.timesTrampSys !=-1){
                commonPlayer.timesTrampSys++;
            }
            //为游戏暴露出来的定时器
            //intervalRun&&intervalRun();
        },1000)
    };
    this.getWXPlayTime = function() {
        if (!commonPlayer.loginStatus) {
            return;
        }
        // upload run time every 2 minutes
        var postT = self.upT * 60;
        //first upload when enter game
        self.initWXUploadTimer();
        setInterval(function () {
            self.runTime += 1;
            postT-=1;
            if(postT<=0){
                //upload run time
                self.uploadWXGameRunTime();
                postT = self.upT * 60;
            }
        }, 1000);
    };
    this.initWXUploadTimer = function() {
        if (!commonPlayer.loginStatus) {
            return;
        }
        var url = HttpURL.WX_PROGRAM_CG_RUNTIME_URL;
        var obj = {};
        obj.uid = commonPlayer.userInfos.uid;
        obj.gindex = gIndex;
        obj.readingTime = 1;
        getAjax(url,"post",obj,function(result){
            if(result.retCode == 1){
                //上报成功清空uid gindex对应数据
                console.log("进入游戏，第一次上报成功")
            }else{
                console.log("进入游戏，第一次上报失败")
            }
        },function(){
            //上报失败，记录下来，下一次上报上去
            console.log("进入游戏，第一次上报 接口报错")

        },false);
    };
    this.uploadWXGameRunTime = function() {
        if (!commonPlayer.loginStatus) {
            return;
        }

        var url = HttpURL.WX_PROGRAM_CG_RUNTIME_URL;
        var obj = {};
        obj.uid = commonPlayer.userInfos.uid;
        obj.gindex = gIndex;
        obj.readingTime = self.runTime;
        getAjax(url,"post",obj,function(result){
            if(result.retCode == 1){
                self.runTime=0;
            }else{
                //上报失败，记录下来，下一次上报上去
                console.log("游戏时长上报失败，未上报累计时长：" + self.runTime + " s")
            }
        },function(){
            //上报失败，记录下来，下一次上报上去
            console.log("游戏时长上报失败，未上报累计时长：" + self.runTime + " s")
        },false);
    };
}
commonPlayer.countServer = new CountServer();