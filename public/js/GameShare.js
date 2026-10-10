function GameShare(){
    var self = this;
    this.shareWps = null;
    this.init = function(){
        this.shareAllAwardConf(function(data,bool){
            if(bool){
                return;
            }
            var data=data.data.share_num;
            if(data){
                if(data[1].wild_flower_count){
                    var PDiv=$(".box2 .clearfix").eq(0);
                    var PDiv1=$(".box2 .clearfix").eq(0);
                    var num = data[1].wild_flower_count/100;
                    if(num!=0){
                        var div=

                            '<div><img class="icon" src="'+M_IMG_SERVER_URL+'orange/img/common/f3.png"><span class="btnAFlower1">'+num+'</span>朵花</div>';
                        PDiv.append(div);
                    }else{
                        if(data[1].integral_count==0){
                            PDiv.remove();
                        }
                    }
                }

                if(data[2].wild_flower_count){
                    var PDiv=$(".box2 .clearfix").eq(1);
                    var num = data[2].wild_flower_count/100;
                    if(num!=0) {
                        var div=

                            '<div><img class="icon" src="'+M_IMG_SERVER_URL+'orange/img/common/f3.png"><span class="btnAFlower1">'+num+'</span>朵花</div>';
                        PDiv.append(div);
                    }else{
                        if(data[2].integral_count==0){
                            PDiv.remove();
                        }
                    }
                }

                if(data[3].wild_flower_count){
                    var PDiv=$(".box2 .clearfix").eq(2);
                    var num = data[3].wild_flower_count/100;
                    if(num!=0) {
                        var div=

                            '<div><img class="icon" src="'+M_IMG_SERVER_URL+'orange/img/common/f3.png"><span class="btnAFlower1">'+num+'</span>朵花</div>';
                        PDiv.append(div);
                    }else{
                        if(data[3].integral_count==0){
                            PDiv.remove();
                        }
                    }
                }
                //
                //if(data[2].wild_flower_count)
                //    $(".btnAFlower2").html(data[2].wild_flower_count/100);
                //if(data[3].wild_flower_count)
                //    $(".btnAFlower3").html(data[3].wild_flower_count/100);
                if(data[1].integral_count){
                    var PDiv=$(".box2 .clearfix").eq(0);
                    var num = data[1].integral_count;
                    if(num!=0) {
                        var div ='<div>' +
                            '<img class="icon" src="'+M_PIC_URL+'orange/common/list/icon_color_leaf.png"><span class="btnANum1">'+num+'</span>积分' +
                            '</div>';
                        PDiv.append(div);
                    }
                }
                //var div=$('<div><img class="icon" src='+M_PIC_URL+'"/orange/common/list/icon_color_leaf.png" />积分<span class="btnANum1">0</span>分</div>');
                //$(".btnANum1").html(data[1].integral_count);
                if(data[2].integral_count){
                    var PDiv=$(".box2 .clearfix").eq(1);
                    var num = data[2].integral_count;
                    if(num!=0) {
                        var div = '<div>' +
                            '<img class="icon" src="'+M_PIC_URL+'orange/common/list/icon_color_leaf.png"><span class="btnANum1">'+num+'</span>积分' +
                            '</div>';
                        PDiv.append(div);
                    }
                }

                if(data[3].integral_count){
                    var PDiv=$(".box2 .clearfix").eq(2);
                    var num = data[3].integral_count;
                    if(num!=0) {
                        var div = '<div>' +
                            '<img class="icon" src="'+M_PIC_URL+'orange/common/list/icon_color_leaf.png"><span class="btnANum1">'+num+'</span>积分' +
                            '</div>';
                        PDiv.append(div);
                    }
                }

            }
        });
        this.shareAwardConf(function (data) {
            if(data.status!=-2){
                var getmax=data.data.share_max.getmax;
                var maxFlower=data.data.share_max.maxFlower;
                if(maxFlower&&maxFlower!="null"){
                    maxFlower=parseInt(maxFlower);
                }
                var data=data.data.integral_flower_info;
                if(data){
                    if(data.share_num){
                        var shareLen=$(".sharenum").length;
                        for(var i=0;i<shareLen;i++){
                            if(i+1==parseInt(data.share_num)){
                                //$(".sharenum").eq(i).addClass("active");
                                $(".share-modal-sp .tr").eq(i).addClass("tr_act");
                                $(".sharenum").eq(i).addClass("sharenum_act");
                                $(".arrow_icon").eq(i).addClass('arrow_icon_act');
                            }else{
                                //$(".sharenum").eq(i).removeClass("active");
                                $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                                $(".sharenum").eq(i).removeClass("sharenum_act");
                                $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                            }
                        }
                    }else{
                        for(var i=0;i<3;i++) {
                            //$(".sharenum").eq(i).removeClass("active");
                            $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                            $(".sharenum").eq(i).removeClass("sharenum_act");
                            $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                        }
                        $(".btnBFlower").html(0);
                        $(".btnBNum").html(0);
                        $("#shareCon").html("谢谢分享！");
                    }

                    if(maxFlower!=null&&getmax!=null){
                        if(maxFlower-getmax<=1.5&&maxFlower-getmax!=0){
                            $("#shareCon").html("<div>本作品最多可通过分享获得"+maxFlower+"朵花</div>" +
                                "<div>您当前已获得"+getmax+"朵花</div>")
                        }else if(maxFlower-getmax==0||maxFlower-getmax<0){
                            $("#shareCon").html("<div>分享本作品送花已达上限</div>" +
                                "<div>去分享其他作品试试看~</div>");
                            for(var i=0;i<3;i++) {
                                //$(".sharenum").eq(i).removeClass("active");
                                $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                                $(".sharenum").eq(i).removeClass("sharenum_act");
                                $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                            }
                        }else{
                            var str="";
                            if(data.wild_flower_count){
                                $(".btnBFlower").html(data.wild_flower_count/100);
                                str+='<div>为本作品送<img class="icon" src="'+M_IMG_SERVER_URL+'orange/img/common/f3.png" /><span class="btnBFlower">'+data.wild_flower_count/100+'</span>朵花</div>'
                            }
                            if(data.integral_count){
                                $(".btnBNum").html(data.integral_count);
                                str+='<div>您获得<img class="icon" src="'+M_PIC_URL+'orange/common/list/icon_color_leaf.png" />积分<span class="btnBNum">'+data.integral_count+'</span>分</div>';
                            }
                            if(!data.wild_flower_count&&!data.integral_count){
                                str="谢谢分享";
                                for(var i=0;i<3;i++) {
                                    //$(".sharenum").eq(i).removeClass("active");
                                    $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                                    $(".sharenum").eq(i).removeClass("sharenum_act");
                                    $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                                }
                            }
                            $("#shareCon").html(str);
                        }
                    }else if(!data.share_num){
                        $(".btnBFlower").html(0);
                        $(".btnBNum").html(0);
                        $("#shareCon").html("谢谢分享！");
                        for(var i=0;i<3;i++) {
                            //$(".sharenum").eq(i).removeClass("active");
                            $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                            $(".sharenum").eq(i).removeClass("sharenum_act");
                            $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                        }
                    }

                }else{
                    for(var i=0;i<3;i++) {
                        //$(".sharenum").eq(i).removeClass("active");
                        $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                        $(".sharenum").eq(i).removeClass("sharenum_act");
                        $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                    }
                    $(".btnBFlower").html(0);
                    $(".btnBNum").html(0);
                    $("#shareCon").html("谢谢分享！");
                }

            }else{
                $("#shareCon").html("您还没有登录哦，登录后分享获得奖励吧！");
                for(var i=0;i<3;i++) {
                    $(".share-modal-sp .tr").eq(i).removeClass("tr_act");
                    $(".sharenum").eq(i).removeClass("sharenum_act");
                    $(".arrow_icon").eq(i).removeClass('arrow_icon_act');
                }
            }
            $(".share-modal-sp").show(50);
            $(".share-mask").show();
            self.ReDirectSharetes();
            //$(".share-modal-box").css("top",($(".share-modal").height()-$(".share-modal-box").height())/2);
            //$(".share-modal-colse").on("click",function(){
            //    $(".share-modal").hide();
            //});
        });
    };
    /*
    * <li data-share="weibo">
     <img src="http://c1.cgyouxi.com/website/orange/img/common/share/weibo.png" />
     <div>微博</div>
     </li>
     <li data-share="qzone">
     <img src="http://c1.cgyouxi.com/website/orange/img/common/share/qzone.png" />
     <div>QQ空间</div>
     </li>
     <li data-share="qq">
     <img src="http://c1.cgyouxi.com/website/orange/img/common/share/QQ.png" />
     <div>QQ</div>
     </li>
     <li data-share="wechat">
     <img src="http://c1.cgyouxi.com/website/orange/img/common/share/wechat.png" />
     <div>微信</div>
     </li>*/

    //游戏有的花数
    this.shareGameHaveFlower=function(callBack){
        //this.url=conWebUrl+"ajax/game/game_flower_by_me.json?gindex="+this.gIndex;
        this.url=GAME_PATH.FLOWER_GAME_ALL_FLOWER+"?gindex="+gIndex;
        this.GetServiceData(this.url,"get", function (data) {
            callBack(data);
        });
    };
    //分享加鲜花
    this.shareGamePlusFlower= function (callBack,data) {
        //this.url=conWebUrl+"ajax/share/share_game.json?gindex="+this.gIndex;
        this.url=GAME_PATH.FLOWER_SHARE_PLUS_FLOWER+"?gindex="+gIndex+"&platform=4&share_channel="+data.share_channel+"&share_msg_id="+data.share_msg_id;
        this.GetServiceData(this.url,"get", function (data) {
            callBack(data);
        });
    };
    //所有奖励配置信息
    this.shareAllAwardConf= function (callBack) {
        //this.url=conWebUrl+"ajax/share/all_share_award_conf.json";
        this.url=GAME_PATH.FLOWER_SHARE_ALL_INFO;
        if(self.shareAllAwardData){
            callBack(self.shareAllAwardData,true);
        }else{
            this.GetServiceData(this.url,"get", function (data) {
                self.shareAllAwardData = data;
                callBack(data);
            });
        }
        return;
    };
    //获得本次游戏配置信息
    this.shareAwardConf= function (callBack) {
        //this.url=conWebUrl+"ajax/share/share_award_conf.json?gindex="+this.gIndex;
        this.url=GAME_PATH.FLOWER_SHARE_NOW_FLOWER+"?gindex="+gIndex;
        this.GetServiceData(this.url,"get", function (data) {
            callBack(data);
        });
    };
    /** 0402
     * 移动浏览器锁屏
     */
    this.ReDirectSharetes = function (){
        var share_div = $('#share-modal');
        var share_div_box = $('.share-modal-box');
        var loginModal=$('#sso_login_modal');
        //var toolDiv=$('.tools_popup');
       // var sendFlower=$('.send_flowers_box');
        //var  chongzhi=$('.recharge_box');

        if(share_div != null){
            if(share_div.css("display")!="none"){
                if(commonPlayer.aspect_ratio == 3){
                    //竖屏游戏
                    if(commonPlayer.rotate_screen){//转了
                        share_div.height($(window).height()).width($(window).width());
                        share_div_box.width(share_div.height() *.8);
                        share_div_box.css({'transform':'rotate(270deg)',
                                             'top':parseInt((share_div.height()-share_div_box.height())/2),
                                             "left":parseInt((share_div.width()-share_div_box.width())/2)
                                            });
                    }else{
                        //share_div.removeAttr("style");
                        share_div.height('100%').width('100%');
                        share_div_box.css({'-webkit-transform':'none',"width":share_div.width() *.8,'left':'10%','top':parseInt((share_div.height()-share_div_box.height())/2)});
                    }
                }else{
                    //横屏游戏

                    $(".share-modal-sp > .share-modal-box > .box2 ").css("width","64%");
                    $(".share-modal-sp > .share-modal-box > .box3 ").css({'padding':"0",'width':"34%"});
                    $(".share-modal-sp > .share-modal-box > .box3 > ul > li ").css({'width':"50%","margin-top":"1rem"});
                    $("#shareCon_v").css({'width':"80%"});

                    if(commonPlayer.rotate_screen){//转了
                        share_div.height($(window).height()).width($(window).width());
                        share_div_box.width(share_div.height() *.8);
                        share_div_box.css({'transform':'rotate(90deg)',
                                            'top':parseInt((share_div.height()-share_div_box.height())/2),
                                            "left":parseInt((share_div.width()-share_div_box.width())/2)
                                        });
                    }else{
                        //share_div.removeAttr("style");
                        share_div.height('100%').width('100%');
                        share_div_box.css({'-webkit-transform':'none',
                                            "width":share_div.width() *.8,
                                            'left':'10%',
                                            'top':parseInt((share_div.height()-share_div_box.height())/2)
                                            });
                    }
                }
            }
        }




        /*
         //旋转視頻前遮罩
         this.resizeVideoMask=function(div){

         if(isPhone){ //转了
             if(isVertical){
                 //竖屏
                 this.drawMask(div);
                 div.style.transform = 'rotate(270deg)';
                 div.style.msTransform = 'rotate(270deg)';
                 div.style.mozTransform = 'rotate(270deg)';
                 div.style.webkitTransform = 'rotate(270deg)';
                 div.style.oTransform = 'rotate(270deg)';
                 div.style.top = gGameWidth/zoom+gameCanvas.offsetTop+"px";
                 div.style.left = gameCanvas.offsetLeft+'px';
             }else{
                 //横屏
                 this.drawMask(div);
                 div.style.transform = 'rotate(90deg)';
                 div.style.msTransform = 'rotate(90deg)';
                 div.style.mozTransform = 'rotate(90deg)';
                 div.style.webkitTransform = 'rotate(90deg)';
                 div.style.oTransform = 'rotate(90deg)';
                 div.style.top = gameCanvas.offsetTop+"px";
                 div.style.left = gGameHeight/zoom+gameCanvas.offsetLeft+'px';
             }
         } else {
             this.drawMask(div);
             div.style.transform = 'rotate(0deg)';
             div.style.msTransform = 'rotate(0deg)';
             div.style.mozTransform = 'rotate(0deg)';
             div.style.webkitTransform = 'rotate(0deg)';
             div.style.oTransform = 'rotate(0deg)';
             div.style.top = gameCanvas.offsetTop+"px";
             div.style.left = gameCanvas.offsetLeft+'px';
             }
         };*/


        /*if(loginModal!=null){
            if(loginModal.css("display")!="none") {
                console.log('##11',commonPlayer.rotate_screen,commonPlayer.aspect_ratio);
                if (commonPlayer.rotate_screen) {
                    if(commonPlayer.aspect_ratio == 3){
                        loginModal.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            'margin-left': '100%',
                            '-webkit-transform': 'rotate(270deg)',
                            'top': -loginModal.height()+loginModal.width()
                        });
                    }else{
                        loginModal.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            '-webkit-transform': 'rotate(90deg)',
                            'top': -loginModal.height()
                        });
                    }

                } else {
                    loginModal.height('100%').width('100%').css({'-webkit-transform': 'none', 'top': '0','margin-left': '0%'});
                }
            }
        }*/
        /*if(toolDiv!=null){
            if(toolDiv.css("display")!="none") {
                console.log('##22',commonPlayer.rotate_screen,commonPlayer.aspect_ratio);
                if (commonPlayer.rotate_screen) {
                    if(commonPlayer.aspect_ratio == 3){
                        toolDiv.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            'margin-left': '100%',
                            '-webkit-transform': 'rotate(270deg)',
                            'top': -toolDiv.height()+toolDiv.width()
                        });
                    }else{
                        toolDiv.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            '-webkit-transform': 'rotate(90deg)',
                            'top': -toolDiv.height()
                        });
                    }
                } else {
                    toolDiv.height('100%').width('100%').css({'-webkit-transform': 'none', 'top': '0', 'margin-left': '0%'});
                }
            }
        }*/

        /*if(sendFlower!=null){
            if(sendFlower.css("display")!="none") {
                console.log('##22',commonPlayer.rotate_screen,commonPlayer.aspect_ratio);

                if(commonPlayer.aspect_ratio == 3){
                    $(".send_flowers_sp").css({'width':"86%","margin-left":"7%"});
                }
                if (commonPlayer.rotate_screen) {
                    if(commonPlayer.aspect_ratio == 3){
                        sendFlower.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            'margin-left': '100%',
                            '-webkit-transform': 'rotate(270deg)',
                            'top':  -sendFlower.height()+sendFlower.width()
                        });
                    }else{
                        sendFlower.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            '-webkit-transform': 'rotate(90deg)',
                            'top': -sendFlower.height()
                        });
                    }
                } else {
                    sendFlower.height('100%').width('100%').css({'-webkit-transform': 'none', 'top': '0', 'margin-left': '0'});
                }
            }
        }*/

        /*if(chongzhi!=null){
            if(chongzhi.css("display")!="none") {
                if(commonPlayer.aspect_ratio == 3){
                    $(".recharge").css({'width':"86%","margin-left":"7%"});
                }
                if (commonPlayer.rotate_screen) {
                    if(commonPlayer.aspect_ratio == 3){
                        chongzhi.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            'margin-left': '100%',
                            '-webkit-transform': 'rotate(270deg)',
                            'top': -chongzhi.height()+chongzhi.width()
                        });
                    }else{
                        chongzhi.height($(window).width()).width($(window).height()).css({
                            'transform-origin': 'left 100%',
                            '-webkit-transform': 'rotate(90deg)',
                            'top': -chongzhi.height()
                        });
                    }

                } else {
                    //横屏
                    if(window.innerHeight <= 320){
                        $('.recharge').css({'paddingBottom':'1%','width':'66%'})
                    }
                    chongzhi.height('100%').width('100%').css({'-webkit-transform': 'none', 'top': '0', 'margin-left': '0'});
                }
            }
        }*/
        var wechatEWM=$(".share-wechat-qrcode");
        if($(".share-wechat-qrcode")[0]){
            if(commonPlayer.rotate_screen){
                if(commonPlayer.aspect_ratio == 3){
                    wechatEWM.css({
                        'height':"20rem",
                        'width':'16rem',
                        'transform-origin': 'left 100%',
                        '-webkit-transform': 'rotate(270deg)',
                        "left":"90%",
                        'top': "45%"
                    });
                }else{
                    wechatEWM.css({
                        'height':"20rem",
                        'width':'16rem',
                        'margin-top':$(window).height()/2-wechatEWM.height()/2,
                        //'transform-origin': 'center center',
                        '-webkit-transform': 'rotate(90deg)',
                        'top':0,
                        "margin-left":"-8rem"
                    });
                }
            }else{
                if(commonPlayer.aspect_ratio == 3){
                    wechatEWM.css({
                        'height':"20rem",
                        'width':'16rem',
                        '-webkit-transform': 'none',
                        'left':"50%",
                        'top':"55%"
                    });
                }else{
                    wechatEWM.css({
                        'height':"20rem",
                        'width':'16rem',
                        'margin-top':"0",
                        '-webkit-transform': 'none',
                        'left':"50%",
                        'top':($(window).height()-wechatEWM.height())/2
                    });
                }
            }
        }
    }
    this.openShareWindow = function(f, e) {
        var h = [], g;
        for (g in e) {
            h.push(g + "=" + encodeURIComponent(e[g] || ""));
        }
        h = f + h.join("&");
        //window.location.href = h;
        window.open(h,"_blank");
    }
    //请求服务器获得接口对应信息
    this.GetServiceData= function (url,type,callBack) {
        var self=this;
        $.ajax({
            url:url,
            type:"get",
            dataType:"jsonp",
            jsonp: 'jsonCallBack',
            success: function (data) {
                callBack(data);
            },
            error: function (e) {
                console.log(e);
                callBack("fail")
            }
        });
    }

}
var gameShare = new GameShare();



/**
 * Created by Jeffery Wang.
 * Create Time: 2015-06-16 19:52
 * Author Link: http://blog.wangjunfeng.com
 */
var nativeShare = function (elementNode, config) {
    var self = this;
    if (!document.getElementById(elementNode)) {
        return false;
    }
    var qApiSrc = {
        lower: "http://3gimg.qq.com/html5/js/qb.js",
        higher: "http://jsapi.qq.com/get?api=app.share"
    };
    var bLevel = {
        qq: {forbid: 0, lower: 1, higher: 2},
        uc: {forbid: 0, allow: 1}
    };
    var UA = navigator.appVersion;

    self.isqqBrowser = (UA.split("MQQBrowser/").length > 1) ? bLevel.qq.higher : bLevel.qq.forbid;
    self.isucBrowser = (UA.split("UCBrowser/").length > 1) ? bLevel.uc.allow : bLevel.uc.forbid;
    self.isWeixin = false;


    var version = {
        uc: "",
        qq: ""
    };

    config = config || {};
    this.elementNode = elementNode;
    this.url = config.url || document.location.href || '';
    this.title = config.title || document.title || '';
    this.desc = config.desc || document.title || '';
    this.img = config.img || document.getElementsByTagName('img').length > 0 && document.getElementsByTagName('img')[0].src || '';
    this.img_title = config.img_title || document.title || '';
    this.from = config.from || window.location.host || '';
    this.ucAppList = {
        sinaWeibo: ['kSinaWeibo', 'SinaWeibo', 11, '新浪微博'],
        weixin: ['kWeixin', 'WechatFriends', 1, '微信好友'],
        weixinFriend: ['kWeixinFriend', 'WechatTimeline', '8', '微信朋友圈'],
        QQ: ['kQQ', 'QQ', '4', 'QQ好友'],
        QZone: ['kQZone', 'QZone', '3', 'QQ空间']
    };

    this.share = function (to_app) {
        var title = this.title, url = this.url, desc = this.desc, img = this.img, img_title = this.img_title, from = this.from;
        if (self.isucBrowser) {
            to_app = to_app == '' ? '' : (platform_os == 'iPhone' ? this.ucAppList[to_app][0] : this.ucAppList[to_app][1]);
            if (to_app == 'QZone') {
                B = "mqqapi://share/to_qzone?src_type=web&version=1&file_type=news&req_type=1&image_url="+img+"&title="+title+"&description="+desc+"&url="+url+"&app_name="+from;
                k = document.createElement("div"), k.style.visibility = "hidden", k.innerHTML = '<iframe src="' + B + '" scrolling="no" width="1" height="1"></iframe>', document.body.appendChild(k), setTimeout(function () {
                    k && k.parentNode && k.parentNode.removeChild(k)
                }, 5E3);
            }
            if (typeof(ucweb) != "undefined") {
                ucweb.startRequest("shell.page_share", [title, title, url, to_app, "", "@" + from, ""])
            } else {
                if (typeof(ucbrowser) != "undefined") {
                    ucbrowser.web_share(title, title, url, to_app, "", "@" + from, '')
                } else {
                }
            }
        } else {
            if (self.isqqBrowser && !self.isWeixin) {
                to_app = to_app == '' ? '' : this.ucAppList[to_app][2];
                var ah = {
                    url: url,
                    title: title,
                    description: desc,
                    img_url: img,
                    img_title: img_title,
                    to_app: to_app,//微信好友1,腾讯微博2,QQ空间3,QQ好友4,生成二维码7,微信朋友圈8,啾啾分享9,复制网址10,分享到微博11,创意分享13
                    cus_txt: desc
                };
                ah = to_app == '' ? '' : ah;
                if (typeof(browser) != "undefined") {
                    if (typeof(browser.app) != "undefined" && self.isqqBrowser == bLevel.qq.higher) {
                        browser.app.share(ah)
                    }
                } else {
                    if (typeof(window.qb) != "undefined" && self.isqqBrowser == bLevel.qq.lower) {
                        window.qb.share(ah)
                    } else {
                    }
                }
            } else {
            }
        }
    };

    this.html = function() {
        //var position = document.getElementById(this.elementNode);
        //var html = '<div class="label">分享到</div>'+
        //    '<div class="list clearfix">'+
        //    '<span data-app="sinaWeibo" class="nativeShare weibo"><i></i>新浪微博</span>'+
        //    '<span data-app="weixin" class="nativeShare weixin"><i></i>微信好友</span>'+
        //    '<span data-app="weixinFriend" class="nativeShare weixin_timeline"><i></i>微信朋友圈</span>'+
        //    '<span data-app="QQ" class="nativeShare qq"><i></i>QQ好友</span>'+
        //    '<span data-app="QZone" class="nativeShare qzone"><i></i>QQ空间</span>'+
        //    //'<span data-app="" class="nativeShare more"><i></i>更多</span>'+
        //    '</div>';
        //position.innerHTML = html;
    };

    this.isloadqqApi = function () {
        if (self.isqqBrowser) {
            var b = (version.qq < 5.4) ? qApiSrc.lower : qApiSrc.higher;
            var d = document.createElement("script");
            var a = document.getElementsByTagName("body")[0];
            d.setAttribute("src", b);
            a.appendChild(d)
        }
    };

    this.getPlantform = function () {
        ua = navigator.userAgent;
        if ((ua.indexOf("iPhone") > -1 || ua.indexOf("iPod") > -1)) {
            return "iPhone"
        }
        return "Android"
    };

    this.is_weixin = function () {
        var a = UA.toLowerCase();
        if (a.match(/MicroMessenger/i) == "micromessenger") {
            return true
        } else {
            return false
        }
    };

    this.getVersion = function (c) {
        var a = c.split("."), b = parseFloat(a[0] + "." + a[1]);
        return b
    };

    this.init = function () {
        platform_os = this.getPlantform();
        version.qq = self.isqqBrowser ? this.getVersion(UA.split("MQQBrowser/")[1]) : 0;
        version.uc = self.isucBrowser ? this.getVersion(UA.split("UCBrowser/")[1]) : 0;
        self.isWeixin = this.is_weixin();
        if ((self.isqqBrowser && version.qq < 5.4 && platform_os == "iPhone") || (self.isqqBrowser && version.qq < 5.3 && platform_os == "Android")) {
            self.isqqBrowser = bLevel.qq.forbid
        } else {
            if (self.isqqBrowser && version.qq < 5.4 && platform_os == "Android") {
                self.isqqBrowser = bLevel.qq.lower
            } else {
                if (self.isucBrowser && ((version.uc < 10.2 && platform_os == "iPhone") || (version.uc < 9.7 && platform_os == "Android"))) {
                    self.isucBrowser = bLevel.uc.forbid
                }
            }
        }
        this.isloadqqApi();
        if (self.isqqBrowser || self.isucBrowser) {
            //this.html();
        } else {
            //document.write('目前该分享插件仅支持手机UC浏览器和QQ浏览器');
        }
    };

    this.init();

    return this;
};





var gname = "";
var img_src="";
//为分享而加
$(function(){
    img_src = M_PIC_URL+'orange/title/'+guid+'_'+ver+'.jpg!470x270';
    var share_href = GAME_PATH.GAME_SHARE_HREF+"/"+gIndex +'?stype=1';
    $('.share-modal-colse').click(function(){
        $(".share-modal-sp").hide();
        $(".share-mask").hide();
    });
    $(".menu_close").click(function(){  //充值、送花弹窗关闭
        $(this).parents('.pop_up_box').hide();
        $("#startLogin").hide();
    });
    $(".rpg_menu ,#back_tools").click(function(event){ //阻止冒泡
        event.stopPropagation();
    });
    /*$("#back_tools").click(function(){
        $(".tools_popup").hide();
    });*/
    /*$("#buyFlower").click(function () {
        $(".send_flowers_box").hide();
        $(".recharge_box").show();
    });*/


    var boxheight=$(".share-modal-box").height;
    var scHeight=document.body.clientHeight;
    $(".share-modal-box").css("top",(scHeight-boxheight)/2);
    var config = {
        url:share_href,// 分享的网页链接
        title:gname,// 标题
        desc:'',// 描述
        img:img_src,// 图片
        img_title:gname,// 图片标题
        from:'', // 来源
        share_msg_id:0,
        share_channel:0
    };
    var shareApp=new nativeShare("share-modal",config);

    window.shareModal = function(action){
        var share_modal = $('.share-modal'),
            share_modal_box = share_modal.find('.share-modal-box');
        if(action == 'show'){
            if(share_modal.hasClass('showed')){
                return false;
            }
            share_modal.addClass('showed');
            share_modal.css({
                'display' : 'block'
            });
            share_modal_box.css({
                'margin-top' : '0',
                'margin-left' : '0',
                'margin-top' : share_modal_box.outerHeight() / -2,
                'margin-left' : share_modal_box.outerWidth() / -2
            });
        }else if(action  == 'hide'){
            share_modal.removeClass('showed');
            share_modal.css('display', 'none');
        }
        share_modal.find('.share-modal-colse').click(function(){
            window.shareModal('hide');
        });
    };
    $('.js-share').click(function(){
        window.shareModal('show');
    });

    $('.share-modal-itemlist > li').click(function(){
        //登录后分享加奖励
        var shareUrl = share_href;
        var s_uid = commonPlayer.userInfos.uid.toString();

        if ($.isEmptyObject(commonPlayer.userInfos) === false &&  s_uid ) {
            shareUrl += '&starget=' + gIndex + '&sflag=' + base64.urlEncoder(s_uid);
            gname = commonPlayer.gameMenu.gameInfoData.gname;
        }
        var play_times = commonPlayer.gameMenu.gameInfoData.play_times; //人气

        gameShare.shareWps = {
            "weibo_1":"#橙光推荐# 厉害了我的哥，最近有" + play_times + "个小伙伴都在疯玩.....（分享自@橙光官方微博）立即去玩：",
            "weibo_2":"#橙光推荐# 哈喽！推荐你一个超好玩的东西，身边人都在玩！（分享自@橙光官方微博）",
            "weibo_3":"#橙光推荐# 这是我见过的最精彩的故事，没有之一！（分享自@橙光官方微博）作品地址：",
            "qzone_4":"厉害了我的哥，最近有"+play_times+"人都在疯玩.....",
            "qzone_5":"哈喽！推荐你一个超好玩的东西，身边人都在玩！ ",
            "qzone_6":"玩着玩着，竟有身临其境的感觉，难怪这么多人玩！ ",
            "qq_7":"厉害了我的哥，最近有"+play_times+"人都在疯玩..... ",
            "qq_8":"哈喽！推荐你一个超好玩的东西，身边人都在玩！",
            "qq_9":"这是我见过的最精彩的故事，没有之一！ ",
            "wechat_10":"厉害了我的哥，最近有"+play_times+"人都在疯玩..... ",
            "wechat_11":"哈喽！推荐你一个超好玩的东西，身边人都在玩！",
            "wechat_12":"这是我见过的最精彩的故事，没有之一！"
        };
        config = {
            url:shareUrl,// 分享的网页链接
            title:'曲折的作品剧情太过瘾，橙光作品【' + gname + '】等你好久啦！戳链接马上试玩~',// 标题
            desc:'曲折的作品剧情太过瘾，橙光作品【' + gname + '】等你好久啦！戳链接马上试玩~',// 描述
            img:img_src,// 图片
            img_title:'曲折的作品剧情太过瘾，橙光作品【' + gname + '】等你好久啦！戳链接马上试玩~',// 图片标题
            from:'' // 来源
        };

        var plat = $(this).data('share')||"weibo";
        if( plat== "weibo"){
            var id = parseInt(MathRandom(1,4));
            config.share_msg_id = id;//文案id
            config.title = gameShare.shareWps["weibo_"+id];
            config.desc = gameShare.shareWps["weibo_"+id];
            config.img_title = gname;//gameShare.shareWps["weibo_"+id];
            config.share_channel = 1;


        }else if(plat== "qzone"){
            var id = parseInt(MathRandom(4,7));
            config.share_msg_id = id;
            config.title = gname;//gameShare.shareWps["qzone_"+id];
            config.desc = gameShare.shareWps["qzone_"+id];
            config.img_title = gameShare.shareWps["qzone_"+id];
            config.share_channel = 2;

        }else if(plat== "qq"){
            var id = parseInt(MathRandom(7,10));
            config.share_msg_id = id;
            config.title = gname;//gameShare.shareWps["qq_"+id];
            config.desc = gameShare.shareWps["qq_"+id];
            config.img_title = gameShare.shareWps["qq_"+id];
            config.share_channel = 3;

        }else if(plat== "wechat"){
            var id = parseInt(MathRandom(10,13));
            config.share_msg_id = id;
            config.title = gname;//gameShare.shareWps["wechat_"+id];
            config.desc = gameShare.shareWps["wechat_"+id];
            config.img_title = gameShare.shareWps["wechat_"+id];
            config.share_channel = 4;
        }
        shareUrl = shareUrl+"&platform=4&share_channel="+config.share_channel+"&share_msg_id="+config.share_msg_id;

        shareApp=new nativeShare("share-modal",config);


        switch($(this).data('share')){
            case 'weibo' :
                //if (shareApp.isqqBrowser || shareApp.isucBrowser) {
                /*if (shareApp.isqqBrowser ) {

                    shareApp.share("sinaWeibo");
                } else {*/
                    gameShare.openShareWindow('http://service.weibo.com/share/share.php?', {
                        appkey : '2pcGaX',
                        url :shareUrl,
                        title : config.title,
                        pic : img_src
                    });
                //}
                break;
            case 'qzone' :
                gameShare.openShareWindow('http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?', {
                    url: shareUrl,
                    title: config.title,
                    summary: config.desc,
                    pics: img_src,
                    desc: '超好玩，根本停不下来！'

                });
                break;
            case 'wechat' :
                //if (shareApp.isqqBrowser || shareApp.isucBrowser) {
                if(shareApp.isqqBrowser){
                    shareApp.share("weixin");
                } else {
                    var share_modal = $('.share-modal'),
                        share_modal_box = share_modal.find('.share-modal-box');
                    share_modal_box.hide();
                    shareUrl = encodeURIComponent(shareUrl);
                    $('.share-modal').append('<div class="share-wechat-qrcode" style="border-radius:8px;box-shadow: 0 0 6px 0 rgba(0,0,0,0.4);height:24rem;width:20rem;position:absolute;left:50%;top:50%;margin-left:-10rem;margin-top:-12rem;background:#FFF;"><div class="share-wechat-qrcode-close" style="position: absolute; right: -0.8rem; top: -0.8rem; height: 2rem; width: 2rem; border: 1px solid #FFF; border-radius: 1rem; box-shadow: 0 0 4px 0 rgba(0,0,0,0.6); background: url(//c1.cgyouxi.com/website/orange/img/common/share/close.png) no-repeat center center #FFF; background-size: 100%;"></div><img src="http://s.jiathis.com/qrcode.php?url=' + shareUrl + '" style="width:92%;display:block;margin:auto;margin-top:0.8rem;" /><div style="height:2rem;padding:0 4%;"><span style="vertical-align:middle;">截屏后用微信识别，分享到朋友圈</span></div></div>');
                    //$('.share-modal').append('<div class="share-wechat-qrcode" style="z-index: 11;;box-shadow: 0 0 6px 0 rgba(0,0,0,0.4);height:19rem;width:16rem;position:absolute;left:50%;top:55%;margin-left:-8rem;margin-top:-10rem;background:#FFF;">' +
                    //    '<div class="share-wechat-qrcode-close" style="position: absolute; right: -0.8rem; top: -0.8rem; height: 2rem; width: 2rem; border: 1px solid #FFF; border-radius: 1rem; box-shadow: 0 0 4px 0 rgba(0,0,0,0.6); background: url(http://c1.cgyouxi.com/website/orange/img/common/share/close.png) no-repeat center center; background-size: 100%;"></div>' +
                    //    '<img src="http://s.jiathis.com/qrcode.php?url=' + share_href + '" style="width:92%;display:block;margin:auto;margin-top:0.8rem;z-index:1;" />' +
                    //    '<div style="height:2rem;padding:0 4%;"><span style="vertical-align:middle;">截屏后用微信识别，分享到朋友圈</span></div></div>');
                    config.share_channel = -3;


                    gameShare.ReDirectSharetes();
                }
                break;
            case "qq":
                // shareUrl = encodeURIComponent(shareUrl);
                //if (shareApp.isqqBrowser || shareApp.isucBrowser) {
                if (shareApp.isqqBrowser) {
                    //this.html();
                    shareApp.share("QQ");
                }else{
                    gameShare.openShareWindow('http://connect.qq.com/widget/shareqq/index.html?', {
                        url: shareUrl,
                        title:config.title,
                        summary: config.desc,
                        pics: img_src
                    });
                }
                break;
        }

        gameShare.shareAwardConf(function (data) {
            if(data.status!=-2){
                var data=data.data.integral_flower_info;
                var share_game_data = {
                    share_channel:config.share_channel,
                    share_msg_id : config.share_msg_id
                }
                if(data&&data.share_num && data.share_num<=3){
                    gameShare.shareGamePlusFlower(function (data) {
                        if(data.status==1){
                            gameShare.shareGameHaveFlower(function (data) {
                                if(data.data){
                                    var data=data.data;
                                    if(parseFloat(data.sum)>0) {
                                        commonPlayer.flower.sum = data.sum;
                                        commonPlayer.flower.num = data.num;
                                        commonPlayer.flower.tanhua_flower_num = data.tanhua_flower_num;
                                        commonPlayer.flower.wild_flower_num = data.wild_flower_num;
                                        commonPlayer.flower.fresh_flower_num = data.fresh_flower_num;
                                    }
                                }
                            });
                        }
                    },share_game_data);
                }else{
                    gameShare.shareGamePlusFlower(function (data) {
                        if(data.status==1){
                           //添加统计
                        }
                    },share_game_data);
                }
            }
        });


    });
    $('.share-modal').delegate('.share-wechat-qrcode-close', 'click', function(){
        $('.share-wechat-qrcode').remove();
        $('.share-modal > .share-modal-box').show();
        $(".share-mask").hide();
        window.shareModal('hide');
    });
})