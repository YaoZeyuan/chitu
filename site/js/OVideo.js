/**
 * Created by 七夕小雨 on 2014/11/23.
 */

function OVideo() {
    var self = this;
    this._video;//video控制对象
    this._x;//画布中的x坐标
    this._y;//画布中的y坐标
    this._width;//播放区域的宽度
    this._height;//播放区域的高度
    this._playtime = -1;//正在播放的时间
    this._src;//正在播放的视频的路径
    this._playfinish;//是否播放结束
    this._starttime;//视频开始播放时间
    this._endtime;//视频结束播放时间
    this._isloop;//视频播放完后是否循环
    this._talklist;//对话列表（用于插入回放中）
    this._ismove;//是否可以移动视频
    this._moveFlg;
    this._totalframe;//移动视频的总帧数
    this._movestartx = 0;//移动视频开始的x
    this._moveendx = 0;//移动视频结束的x
    this._movestarty = 0;//移动视频开始的y
    this._moveendy = 0;//移动视频结束的y
    this._movestartw = 0;
    this._movestarth = 0;
    this._moveendw = 0;
    this._moveendh = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.moveW = 0;
    this.moveH = 0;
    this._visible = true;//是否显示
    this._iswaitfinish;//是否等待播放结束
    this._clicktype = 0;//是否等待播放结束
    this._isfinishpic;//播放完后是否留在屏幕上
    this._isstop; //是否暂停

    this._scoure = null;//存放的视频的scoure

    self.talkJumpTimeArr = [];
    self.newTalkJumpTimeArr = [];
    self.talkJumpMsgArr = [];


    //自加上
    this.isFinish = false; //控制视频事件结束与否
    this.openPlayFlg = true;
    this.toPlayFlg = false;
    this.isClear = false;
    this.videoVisible = false;
    var gameCanvas;
    var videomask;
    var videomaskBG
    var videoText;
    var loadTexts = "正在拼命加载资源，请耐心等候";

    var oVideoArr = new Object();

    var type = 0;//0走链接 1走base64  2走blob

    var newWidth;
    var newHeight;
    var gGameWidth;
    var gGameHeight;
    var zoom;
    var updateTimer;

    function initValue() {
        newWidth = window.innerWidth;
        newHeight = window.innerHeight;
        gGameWidth = GloableData.getInstance().gameInfo.gGameWidth;
        gGameHeight = GloableData.getInstance().gameInfo.gGameHeight;
        if (GloableData.getInstance().isIos) {
            zoom = GloableData.getInstance().gameInfo.gGameHeight / newWidth;//540
        } else {
            zoom = GloableData.getInstance().gameInfo.gGameWidth / newWidth; //960
        }

        gameCanvas = document.getElementById("layaCanvas");
        videomask = document.getElementById('videomask');
        videomaskBG = document.getElementById('videomaskBG');
        videoText = document.getElementById('videoText');

        updateTimer = setInterval(self.update, 1000 / 30);
        $("#videos").click(function () {
            self.touchVideo();
        });

        var orien = window.screen.orientation.angle == 90;

        gameCanvas.style.position = "fixed";
        gameCanvas.style.zIndex = "0";
        $("#videos")[0].style.position = "fixed";
        $("#videos")[0].style.zIndex = "1";

        //Portrait && Landscape
        $(window).on("orientationchange", function (event) {
            orien = window.screen.orientation.angle == 90;
            var divs = [
                document.getElementById('videomask'),
                document.getElementById('videoText'),
                document.getElementById("videos")
            ]
            divs.forEach(function (p1, p2, p3) {
                p1.style.msTransformOrigin = "0 0";
                p1.style.webkitTransformOrigin = "0 0";
                p1.style.mozTransformOrigin = "0 0";
                p1.style.oTransformOrigin = "0 0";

                var str = 'rotate(' + (!orien ? 0 : -90) + 'deg)';
                p1.style.transform = str;
                p1.style.msTransform = str;
                p1.style.mozTransform = str;
                p1.style.webkitTransform = str;
                p1.style.oTransform = str;

                p1.style.top = orien ? Math.min(window.innerHeight, window.innerWidth) + 'px' : '0px';
            })
        });
        //normalize
        orien = window.screen.orientation.angle == 90;
        var divs = [
            document.getElementById('videomask'),
            // document.getElementById('videoText'),
            document.getElementById("videos")
        ]
        divs.forEach(function (p1, p2, p3) {
            p1.style.msTransformOrigin = "0 0";
            p1.style.webkitTransformOrigin = "0 0";
            p1.style.mozTransformOrigin = "0 0";
            p1.style.oTransformOrigin = "0 0";

            var str = 'rotate(' + (!orien ? 0 : -90) + 'deg)';
            p1.style.transform = str;
            p1.style.msTransform = str;
            p1.style.mozTransform = str;
            p1.style.webkitTransform = str;
            p1.style.oTransform = str;

            p1.style.top = orien ? Math.min(window.innerHeight, window.innerWidth) + 'px' : '0px';

            videoText.style.left = orien ? "-20%" : "";
            videoText.style.top = orien ? "" : "80%";
        })
        document.getElementById("videos").style.width = orien ? window.innerHeight + 'px' : window.innerWidth + 'px';
        document.getElementById("videos").style.height = orien ? window.innerWidth + 'px' : window.innerHeight + 'px';
        //
        if (orien) {
            videoText.style.top = "160%";
        } else {
            // videoText.style.left = "-20%";
        }

        // if (orien) {
        //     var divs = [
        //         document.getElementById('videomask'),
        //         document.getElementById('videoText'),
        //         document.getElementById("videos")
        //     ]
        //
        //     document.getElementById("videos").style.msTransformOrigin="0 0";
        //     document.getElementById("videos").style.webkitTransformOrigin="0 0";
        //     document.getElementById("videos").style.mozTransformOrigin="0 0";
        //     document.getElementById("videos").style.oTransformOrigin="0 0";
        //
        //     document.getElementById("videos").style.transform = 'rotate(-90deg)';
        //     document.getElementById("videos").style.msTransform = 'rotate(-90deg)';
        //     document.getElementById("videos").style.mozTransform = 'rotate(-90deg)';
        //     document.getElementById("videos").style.webkitTransform = 'rotate(-90deg)';
        //     document.getElementById("videos").style.oTransform = 'rotate(-90deg)';
        //
        //     document.getElementById("videos").style.width = window.innerHeight;
        //     document.getElementById("videos").style.height = window.innerWidth;
        //     document.getElementById("videos").style.top = window.innerHeight;
        //     document.getElementById("videos").style.left = '0px';
        // } else {
        //     document.getElementById("videos").style.width = window.innerWidth;
        //     document.getElementById("videos").style.height = window.innerHeight;
        //     document.getElementById("videos").style.top = '0px';
        //     document.getElementById("videos").style.left = '0px';
        // }
    }

    function getC() {
        //判断浏览器 设置type值
        var bType = 0;//0走链接 1走base64  2走blob
        var browser = {
            versions: function () {
                var u = navigator.userAgent, app = navigator.appVersion;
                var regStr_chrome = /chrome\/[\d.]+/gi;
                return {
                    trident: u.indexOf('Trident') > -1, //IE内核
                    presto: u.indexOf('Presto') > -1, //opera内核
                    webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
                    gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
                    mobile: !!u.match(/AppleWebKit.*Mobile.*/) || !!u.match(/AppleWebKit/), //是否为移动终端
                    ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
                    android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
                    iPhone: u.indexOf('iPhone') > -1 || u.indexOf('Mac') > -1, //是否为iPhone或者QQHD浏览器
                    iPad: u.indexOf('iPad') > -1, //是否iPad
                    webApp: u.indexOf('Safari') == -1, //是否web应该程序，没有头部与底部
                    chrome: u.indexOf('Chrome') > -1,
                    ucBrowser: u.indexOf('UCBrowser') > -1,
                    lieBao: u.indexOf('LieBao') > -1,
                    samsung: u.indexOf('SamsungBrowser') > -1,
                    chromeVersion: u.match(regStr_chrome),
                    appA: app,
                };
            }()
        }

        if (browser.versions.android || browser.versions.iPhone) {//移动端
            if (browser.versions.android) {//安卓端
                if (browser.versions.ucBrowser || browser.versions.lieBao) {//UC、猎豹浏览器  base64;
                    //使用base64
                    bType = 1;
                } else {//其他浏览器
                    // var isWebview = webview;
                    // if (isWebview) {
                    //     使用base64
                    // bType = 1;
                    // return bType;
                    // }
                    var version = 0;
                    var u = navigator.userAgent;
                    if (browser.versions.chrome) {
                        var version = parseInt(browser.versions.chromeVersion.toString().substr(7, 2));
                        // alert(version);
                    }
                    if (version > 40) {
                        //使用base64;
                        bType = 1;
                    } else {
                        //使用链接
                        bType = 0;
                    }
                }
            } else if (browser.versions.iPhone) {//ios端
                //使用blob
                bType = 2;
            } else {//其他端
                //使用链接
                bType = 0;
            }
        } else {//pc端
            //使用blob
            bType = 2;
        }
        return bType;
    }

    this.orgRunTime = null;
    this.drawLoadingVideo = function () {
        videoText.style.fontSize = parseInt(23 / 1.8) + "px";
        videoText.style.color = "#777777";
        videoText.style.fontFamily = "微软雅黑";
        videoText.innerHTML = loadTexts;
    }
    this.init = function () {
        type = getC();
        // alert(type);
    };
    this.init();
    this.VedioManager = {
        //播放   600
        play: function (args) {
            self.eventLine = args;
            initValue();
            self.isFinish = false;
            self.isClear = false;
            self._visible = true;
            args = args.data.Argv,
                self._isfinishpic = args[10];
            self._iswaitfinish = args[11];
            if (self._iswaitfinish == 1) {
                self._isloop = parseInt(args[12]);
                self._clicktype = parseInt(args[13]);
                if (self._clicktype == 3) {
                    self._talklist = args[14];
                    self.drawTalklist();
                }
            }
            //开始时间，结束时间
            if (parseInt(args[7]) == 1) {
                self._starttime = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[8])) / 1000;
            } else {
                self._starttime = parseInt(args[8]) / 1000;
            }
            self._endtime = parseInt(args[9]) / 1000;

            self._src = GloableData.getInstance().getFileListItemURL(("graphics/" + args[0]).toLowerCase());
            self._video = document.getElementById("videos");
            //设置scoure；
            if (!self._scoure) {
                //self._scoure = $('<source>');
                self._scoure = document.createElement("source");
                self._scoure.type = 'video/mp4';
                self._scoure.src = self._src;
                if (self._video) {
                    self._video.appendChild(self._scoure);
                }
            } else {
                self._scoure.type = 'video/mp4';
                self._scoure.src = self._src;
            }
            self._video.setAttribute('autoplay', 'true');
            self._video.setAttribute('class', "videos video-js");
            self._video.muted = true;
            //mainDiv.appendChild(self._video);
            self._video.load();

            self.drawLoadingVideo();
            videomask.style.display = "block";
            videoText.style.display = "block";
            videomaskBG.style.display = "block";
            videomask.style.zIndex = '1';
            videoText.style.zIndex = '2';
            self._video.style.display = "none";
            function getEnd(video) {
                var end = 0;
                try {
                    end = video.buffered.end(0) || 0;
                    end = parseInt(end * 1000 + 1) / 1000
                } catch (e) {
                }
                return end;
            }

            self._video.onloadeddata = function () {
                // 暂停，但下载还在继续
                self._video.style.display = "none";
                var duration = self._video.duration;

                var tempFrame = 0;
                var tempTime = 0;
                // 启动定时器检测视频下载进度
                var timer = setInterval(function () {
                    if (self._video) {
                        var end = getEnd(self._video);

                        if (parseInt(end) < parseInt(duration)) {
                            tempFrame++;
                            tempTime++;
                            var tempTxt = loadTexts;
                            var temp = "......";
                            temp = temp.substr(0, tempFrame);
                            tempTxt = tempTxt + temp;
                            if (tempFrame == 6) {
                                tempFrame = 0;
                            }
                            self._video.currentTime = end;
                            videoText.innerHTML = tempTxt;
                            if (tempTime == 60) {
                                self._video.currentTime = self._starttime;
                                self._video.play();
                                self.toPlayFlg = true;
                                clearInterval(timer);
                            }
                            return
                        }
                        // 下载完了，开始播放吧
                        self._video.currentTime = self._starttime;
                        self._video.play();
                        self.toPlayFlg = true;
                        clearInterval(timer);
                    } else {
                        clearInterval(timer);
                    }
                }, 1000)
            }


            if (GloableData.getInstance().isIos && mark != "ios") {
                //ios
                self.drawCanvasDate(args);
            } else {
                //androd
                self.videoDomDate(args);
            }
        },
        // 601
        controller: function (args) {
            self.eventLine = args;
            args = args.data.Argv;
            if (!self.isClear) {
                switch (parseInt(args[0])) {
                    case 0:
                        //0 关闭
                        self.clear();
                        break;
                    case 1:
                        //1暂停或继续；
                        if (parseInt(args[1]) == 1) {
                            //暂停视频
                            self.toPlayFlg = false;
                            self._video.pause();

                        } else {
                            //播放视频
                            self.toPlayFlg = true;
                            self._video.play();
                        }
                        break;
                    case 2:
                        //2设置可见--显示或隐藏
                        if (parseInt(args[1]) == 1) {
                            //可见
                            self.visible = true;
                        } else {
                            //隐藏
                            self.visible = false;
                        }
                        break;
                    case 3:
                        //3移动视频
                        //this.event.Argv =["3",  "0","500","600",   "0","100","100",   "120"];
                        var moveDate = args[1].split(",");
                        self.move = moveDate;
                        break;
                    case 4:
                        //4跳转播放
                        ovideo.toJumpPlay(args);
                        break;
                    case 5:
                        //5获取播放时间
                        /*0:"5";1:"1,1";2:"当前播放秒数 赋值给数值：[2]"*/
                        var timer = args[1].split(",");
                        if (parseInt(timer[0]) == 1) {
                            //秒
                            var curTimer = self.currentTime;
                        } else {
                            //毫秒
                            var curTimer = self.currentTime * 1000;
                        }
                        console.log('5获取播放时间---',curTimer);
                        GloableData.getInstance().dGameSystem.vars.setVar(timer[1], curTimer);
                        break;
                }
            } else {
                self.isFinish = true;
            }
        }
    };
    //andarod
    this.videoDomDate = function (args) {
        //xy
        if (parseInt(args[1]) == 1) {
            self._x = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[2])) / zoom;
            self._y = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[3])) / zoom;
        } else {
            self._x = parseInt(args[2] / zoom);
            self._y = parseInt(args[3] / zoom);
        }
        //wh
        if (parseInt(args[4]) == 1) {
            self._width = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[5])) / zoom;
            self._height = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[6])) / zoom;
        } else {
            self._width = parseInt(args[5] / zoom);
            self._height = parseInt(args[6] / zoom);
        }
        //是正着还是竖着
        // self._video.style.zIndex = -1;
        // self.drawVideo(self._video);
        // self.resizeVideo(self._video);

    };
    //ios
    this.drawCanvasDate = function (args) {
        //xy
        if (parseInt(args[1]) == 1) {
            self._x = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[2]));
            self._y = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[3]));
        } else {
            self._x = parseInt(args[2]);
            self._y = parseInt(args[3]);
        }
        //wh
        if (parseInt(args[4]) == 1) {
            self._width = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[5]));
            self._height = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(args[6]));
        } else {
            self._width = parseInt(args[5]);
            self._height = parseInt(args[6]);
        }
    };
    //对话
    this.drawTalklist = function () {
        var talklistArr = [];
        if (self._talklist) {
            //"2000|2秒-!,5000|5秒"
            talklistArr = self._talklist.split("-!,");
            for (var i = 0; i < talklistArr.length; i++) {
                var talkMsgIndex = talklistArr[i].indexOf("|");
                var talkJumpTime = talklistArr[i].substring(0, talkMsgIndex);
                var talkMsg = talklistArr[i].substring(talkMsgIndex + 1, talklistArr[i].length);
                self.talkJumpTimeArr.push(talkJumpTime / 1000);
                self.newTalkJumpTimeArr.push(talkJumpTime / 1000);
                self.talkJumpMsgArr.push(talkMsg);
            }
        }
    };

    //画视频
    this.drawVideo = function (div, width, height, x, y) {
        if (div.getAttribute("name") == "text") {
            //为视频加载延迟图   字    做处理！
            if (GloableData.getInstance().isIos && mark != "ios") {
                var paddingLeft = parseInt(this._width / zoom / 6);
                div.style.width = this._width / zoom - paddingLeft + 'px';
                div.style.height = this._height / zoom + 'px';
                div.style.lineHeight = this._height / zoom + 'px';
                div.style.paddingLeft = paddingLeft + 'px';
            } else {
                var paddingLeft = parseInt(this._width / 6);
                div.style.width = this._width - paddingLeft + 'px';
                div.style.height = this._height + 'px';
                div.style.lineHeight = this._height + 'px';
                div.style.paddingLeft = paddingLeft + 'px';
            }
        } else if (div.getAttribute("name") == "loadImg") {
            if (GloableData.getInstance().isIos && mark != "ios") {
                div.style.width = this._width / zoom + 'px';
                div.style.height = this._height / zoom + 'px';
            } else {
                div.style.width = this._width + 'px';
                div.style.height = this._height + 'px';
                div.style.lineHeight = this._height + 'px';
            }
        } else {
            div.style.width = this._width + 'px';
            div.style.height = this._height + 'px';
            div.style.lineHeight = this._height + 'px';
        }
    };
    //画遮罩；
    this.drawMask = function (div) {
        if (div.getAttribute("name") == "text") {
            //为视频加载延迟图   字    做处理！
            var paddingLeft = parseInt(gGameWidth / zoom / 6);
            div.style.width = gGameWidth / zoom - paddingLeft + 'px';
            div.style.height = gGameHeight / zoom + 'px';
            div.style.lineHeight = gGameHeight / zoom + 'px';
            div.style.paddingLeft = paddingLeft + 'px';
        } else if (div.getAttribute("name") == "loadImg") {
            div.style.width = gGameWidth / zoom + 'px';
            div.style.height = gGameHeight / zoom + 'px';
            div.style.lineHeight = gGameHeight / zoom + 'px';
        } else {
            div.style.width = this._width + 'px';
            div.style.height = this._height + 'px';
            div.style.lineHeight = this._height + 'px';
        }
    };
    this.update = function () {
        if (!self._video) {
            return;
        }
        //视频移动
        if (this._ismove) {
            this._totalframe--;
            this._x = this._x + this.moveX;
            this._y = this._y + this.moveY;
            this._width = this._width + this.moveW;
            this._height = this._height + this.moveH;
            if (this._totalframe <= 0) {
                this._ismove = false;
            }
        }
        if (self.toPlayFlg) {
            self.toPlay();
        }
    };
    //去播放
    this.toPlay = function () {
        if (this.openPlayFlg) {
            //开始播放
            if (self._starttime != null) {
                if (self._video.duration <= self._starttime) {
                    self._starttime = self._video.duration;
                }
                self._video.play();
                if (self._video.currentTime >= self._starttime) {
                    self._video.style.display = "block";
                    this.openPlayFlg = false;
                    self._video.muted = false;
                    this.isFinish = false;
                }
            }
        } else {
            //等待播完，还是不等待播完
            if (self._endtime != null) {
                if (self._video.currentTime > self._starttime) {
                    videomask.style.display = "none";
                    videomask.style.display = "none";
                    videomaskBG.style.display = "none";
                }
                if (GloableData.getInstance().isIos && mark != "ios") {
                    //ios
                    g.drawImage(self._video, self._x, self._y, self._width, self._height);
                }
                self._playtime = self._video.currentTime;
                if (self._video.duration <= self._endtime) {
                    self._endtime = self._video.duration;
                }
                if (self._iswaitfinish == 1) {
                    //等待
                    self.isFinish = false;
                    if (this._talklist) {
                        if (self.talkJumpTimeArr.length > 0) {
                            if (self._playtime >= self.newTalkJumpTimeArr[self.newTalkJumpTimeArr.length - self.talkJumpMsgArr.length]) {
                                tv.system.replay.Add(self.talkJumpMsgArr[0]);
                                self.talkJumpMsgArr.shift();
                            }
                        }
                    }
                } else {
                    //不等
                    self.isFinish = true;
                }
                // 到规定的时间了
                if (self._playtime >= self._endtime) {
                    //播放完留在画面上  1是
                    if (this._isloop == 1) {
                        //循环；
                        this.toPlayFlg = true;
                        self._video.currentTime = self._starttime;
                    } else {
                        self._video.pause();
                        console.log('到时间了完--',self._playtime);
                        toEnd();
                    }
                }
            } else {
                if (self._video.ended) {
                    toEnd();
                }
            }
            function toEnd() {
                self._video.muted = true;
                self._playtime = -1;
                self.toPlayFlg = false;
                self.openPlayFlg = true;
                self._playfinish = true;
                if (self._isfinishpic == 1) {
                    //播放完留在画面上
                    self.isFinish = true;
                } else {
                    self.clear();
                }
            }
        }
    };
    //点击事件
    this.touchVideo = function () {
        //0不处理；1 暂停 2 关闭 3 对话表
        if (this._video && !this.openPlayFlg) {
            switch (this._clicktype) {
                case 0:
                    //0不处理
                    break;
                case 1:
                    //1 暂停
                    if (self._video.paused == false) {
                        self._video.pause();
                    } else {
                        self._video.play();
                    }
                    break;
                case 2:
                    //2 关闭
                    self.clear();
                    break;
                case 3:
                    //3 对话表
                    if (this._talklist) {
                        //时间|文本，时间|文本
                        if (self._video.currentTime) {
                            for (var i = 0; i < self.newTalkJumpTimeArr.length; i++) {
                                if (self._video.currentTime > self.newTalkJumpTimeArr[i]) {
                                    self.talkJumpTimeArr.shift();
                                    //self.talkJumpMsgArr.shift();
                                }
                            }
                        }
                        if (self.talkJumpTimeArr[0]) {
                            self._video.currentTime = self.talkJumpTimeArr[0];
                            self._video.play();
                            //tv.system.replay.Add(self.talkJumpMsgArr[0]);
                            if (self.talkJumpTimeArr.length == 0) {
                                return;
                            }
                        }
                    }
                    break;
            }

        }
    };
    //跳转视频
    this.toJumpPlay = function (args) {
        //单位为秒
        this.openPlayFlg = true;
        this._starttime = args[1];
        this.toPlayFlg = true;
    };
    this._moveFlg = false;

    //视频显示--给外部用
    this.videoShow = function () {
        this._visible = this.videoVisible;
        this._ismove = this._moveFlg;
        this.toPlayFlg = this._isstop;
        if (this.toPlayFlg) {
            this._video.play();
        }
    };
    //视频隐藏--给外部用
    this.videoHide = function () {
        //显示
        this.videoVisible = this._visible;
        this._visible = false;
        //移动
        this._moveFlg = this._ismove;
        this._ismove = false;
        //停
        this._isstop = this.toPlayFlg;
        this.toPlayFlg = false;
        this._video.pause();
    };
    //清空
    this.clear = function () {
        self.eventLine && self.eventLine.finish();
        clearInterval(updateTimer);
        this.isClear = true;
        document.getElementById("videomask").style.display = "none";
        document.getElementById("videomaskBG").style.display = "none";
        document.getElementById("videoText").style.display = "none";
        $(".videos").each(function () {
            this.currentTime = 0.01;
            try {
                this.pause();
                this.muted = true;
            } catch (e) {

            }
            this.style.zIndex = -1;
            this.style.width = 1 + 'px';
            this.style.height = 1 + 'px';
            this.loop = false;
        });
        this._width = 0;
        this._height = 0;
        this._x = 0;
        this._y = 0;
        this._starttime = 0;
        this._endtime = 0;
        this._ismove = false;
        this._isloop = 0;
        this.isFinish = true;
        this.openPlayFlg = true;
        this.toPlayFlg = false;
        this._video = null;
        if (this.oPlayIcon) {
            this.oPlayIcon.dispose();
        }
        this._clicktype = 0;
        this._talklist = "";
        this.talkJumpTimeArr = [];
        this.talkJumpMsgArr = [];
    };
    this.saveData = function (obj) {
        console.log(self._video);
        if (!self._video) {
            obj.have = "isNull";
            return;
        }
        if (GloableData.getInstance().isIos && mark != "ios") {
            //ios
            obj._x = this._x;//画布中的x坐标
            obj._y = this._y;//画布中的y坐标
            obj._width = this._width;//播放区域的宽度
            obj._height = this._height;//播放区域的高度   4

            obj._playtime = this._playtime;//正在播放的时间
            obj._src = this._src;//正在播放的视频的路径
            obj._playfinish = this._playfinish;//是否播放结束  7

            obj._starttime = this._starttime;//视频开始播放时间
            obj._endtime = this._endtime;//视频结束播放时间   9

            obj._isloop = this._isloop;//视频播放完后是否循环  10

            obj._moveFlg = this._moveFlg;//是否可以移动视频
            obj._totalframe = this._totalframe;
            obj._movestartx = this._movestartx;//移动视频开始的x
            obj._moveendx = this._moveendx;//移动视频结束的x
            obj._movestarty = this._movestarty;//移动视频开始的y
            obj._moveendy = this._moveendy;//移动视频结束的y
            obj._movestartw = this._movestartw;//移动视频开始的w
            obj._movestarth = this._movestarth;//移动视频开始的h
            obj._moveendw = this._moveendw;//移动视频结束的w
            obj._moveendh = this._moveendh;//移动视频结束的h   20
            obj.moveX = this.moveX;
            obj.moveY = this.moveY;
            obj.moveW = this.moveW;
            obj.moveH = this.moveH;
        } else {
            obj._x = this._x * zoom;//画布中的x坐标
            obj._y = this._y * zoom;//画布中的y坐标
            obj._width = this._width * zoom;//播放区域的宽度
            obj._height = this._height * zoom;//播放区域的高度   4

            obj._playtime = this._playtime;//正在播放的时间
            obj._src = this._src;//正在播放的视频的路径
            obj._playfinish = this._playfinish;//是否播放结束  7

            obj._starttime = this._starttime;//视频开始播放时间
            obj._endtime = this._endtime;//视频结束播放时间   9

            obj._isloop = this._isloop;//视频播放完后是否循环  10

            obj._moveFlg = this._moveFlg;//是否可以移动视频
            obj._totalframe = this._totalframe;
            obj._movestartx = this._movestartx * zoom;//移动视频开始的x
            obj._moveendx = this._moveendx * zoom;//移动视频结束的x
            obj._movestarty = this._movestarty * zoom;//移动视频开始的y
            obj._moveendy = this._moveendy * zoom;//移动视频结束的y
            obj._movestartw = this._movestartw * zoom;//移动视频开始的w
            obj._movestarth = this._movestarth * zoom;//移动视频开始的h
            obj._moveendw = this._moveendw * zoom;//移动视频结束的w
            obj._moveendh = this._moveendh * zoom;//移动视频结束的h   20
            obj.moveX = this.moveX * zoom;
            obj.moveY = this.moveY * zoom;
            obj.moveW = this.moveW * zoom;
            obj.moveH = this.moveH * zoom;

        }
        obj._visible = this.videoVisible;//是否显示
        obj._iswaitfinish = this._iswaitfinish;//是否等待播放结束
        obj._clicktype = this._clicktype;//是否等待播放结束
        obj._isfinishpic = this._isfinishpic;//播放完后是否留在屏幕上
        obj._isstop = this._isstop; //是否暂停   25
        obj.isClear = this.isClear;
        if (this._talklist) {
            this._talklist = this._talklist.replace(/\|/g, encodeURI("|"));
        } else {
            this._talklist = "";
        }
        obj._talklist = this._talklist;//移动视频的总帧数   26

    };
    this.loadData = function (str) {
        var arr = str.split("|");
        if (arr[0] == "isNull") {
            return;
        }
        console.log(arr);
        if (arr[5].match('.mp4')) {
            if (GloableData.getInstance().isIos && mark != "ios") {
                this._x = Number(arr[0]);//画布中的x坐标
                this._y = Number(arr[1]);//画布中的y坐标
                this._width = Number(arr[2]);//播放区域的宽度
                this._height = Number(arr[3]);//播放区域的高度   4

                this._playtime = Number(arr[4]);//正在播放的时间
                this._src = arr[5];//正在播放的视频的路径
                this._playfinish = Number(arr[6]);//是否播放结束   7

                this._starttime = Number(arr[7]);//视频开始播放时间
                this._endtime = Number(arr[8]);//视频结束播放时间    9

                this._isloop = eval(arr[9]);//视频播放完后是否循环   10

                this._ismove = eval(arr[10]);//是否可以移动视频
                this._totalframe = Number(arr[11]);//移动视频的总帧数
                this._movestartx = Number(arr[12]);//移动视频开始的x
                this._moveendx = Number(arr[13]);//移动视频结束的x
                this._movestarty = Number(arr[14]);//移动视频开始的y
                this._moveendy = Number(arr[15]);//移动视频结束的y
                this._movestartw = Number(arr[16]);//移动视频开始的w
                this._movestarth = Number(arr[17]);//移动视频开始的h
                this._moveendw = Number(arr[18]);//移动视频结束的w
                this._moveendh = Number(arr[19]);//移动视频结束的h   20
                this.moveX = Number(arr[20]);
                this.moveY = Number(arr[21]);
                this.moveW = Number(arr[22]);
                this.moveH = Number(arr[23]);
            } else {
                this._x = Number(arr[0]) / zoom;//画布中的x坐标
                this._y = Number(arr[1]) / zoom;//画布中的y坐标
                this._width = Number(arr[2]) / zoom;//播放区域的宽度
                this._height = Number(arr[3]) / zoom;//播放区域的高度   4

                this._playtime = Number(arr[4]);//正在播放的时间
                this._src = arr[5];//正在播放的视频的路径
                this._playfinish = Number(arr[6]);//是否播放结束   7

                this._starttime = Number(arr[7]);//视频开始播放时间
                this._endtime = Number(arr[8]);//视频结束播放时间    9

                this._isloop = eval(arr[9]);//视频播放完后是否循环   10

                this._ismove = eval(arr[10]);//是否可以移动视频
                this._totalframe = Number(arr[11]);//移动视频的总帧数
                this._movestartx = Number(arr[12]) / zoom;//移动视频开始的x
                this._moveendx = Number(arr[13]) / zoom;//移动视频结束的x
                this._movestarty = Number(arr[14]) / zoom;//移动视频开始的y
                this._moveendy = Number(arr[15]) / zoom;//移动视频结束的y
                this._movestartw = Number(arr[16]) / zoom;//移动视频开始的w
                this._movestarth = Number(arr[17]) / zoom;//移动视频开始的h
                this._moveendw = Number(arr[18]) / zoom;//移动视频结束的w
                this._moveendh = Number(arr[19]) / zoom;//移动视频结束的h   20
                this.moveX = Number(arr[20]) / zoom;
                this.moveY = Number(arr[21]) / zoom;
                this.moveW = Number(arr[22]) / zoom;
                this.moveH = Number(arr[23]) / zoom;
            }

            this._visible = eval(arr[24]);//是否显示
            this._iswaitfinish = eval(arr[25]);//是否等待播放结束
            this._clicktype = eval(arr[26]);//是否等待播放结束
            this._isfinishpic = eval(arr[27]);//播放完后是否留在屏幕上
            this.toPlayFlg = eval(arr[28]); //是否暂停   25
            this.isClear = eval(arr[29]);
            if (arr[30]) {
                this._talklist = arr[30].replace(/\%7C/g, "|");
                this.drawTalklist();
            } else {
                this._talklist = "";//对话列表（用于插入回放中）
            }
            if (self._src.match('.mp4')) {
                self._video = document.getElementById("videos");
                console.log(self._video);
            }
            if (GloableData.getInstance().isIos && mark != "ios") {

            } else {
                this.drawVideo(self._video);
            }


            if (this._ismove) {
                this._moveFlg = true;
            } else {
                this._moveFlg = false;
            }
            if (this._visible) {
                this.videoVisible = true;
            } else {
                this.videoVisible = false;
            }
        }
    };
    //暂时不用
    this.FindVideo = function (src) {
        var theVideo = null;
        //var haveVideo = false;
        $(".videos").each(function () {
            if (this.src == src) {
                //haveVideo = true;
                theVideo = this;
            } else {
                this.pause();
                this.style.zIndex = -1;
                this.style.width = 1 + 'px';
                this.style.height = 1 + 'px';
                this.loop = false;
            }
        });
        return theVideo;

    }
    //暂时不用
    function getBlobBase64(blob, callBack) {
        var a = new FileReader();
        a.onload = function () {
            callBack && callBack(this.result);
            //var source = $("<source>");
            //source[0].src = this.result;
            //$("#video-bg").append(source);
            console.log(this.result);
        }
        a.readAsDataURL(blob);
    }
}

OVideo.prototype = {
    get width() {
        return this._video.width;
    },
    set width(val) {
        this._video.width = val;
    },
    get x() {
        return this._x;
    },
    set x(val) {
        this._x = val;
    },
    get currentTime() {
        if (this.toPlayFlg) {
            console.log(this._playtime);
            return this._playtime;
        } else {
            return -1;
        }
    },
    set currentTime(val) {
        //this._video.currentTime = val;
    },
    get visible() {
        return this._video._visible;
    },
    set visible(val) {
        this._visible = val;
    },
    get move() {

    },
    set move(val) {
        this._ismove = true;
        this._movestartx = this._x;
        this._movestarty = this._y;
        this._movestartw = this._width;
        this._movestarth = this._height;
        if (GloableData.getInstance().isIos && mark != "ios") {
            //ios
            if (val[0] == 1) {
                this._moveendx = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[1]));
                this._moveendy = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[2]));
            } else {
                this._moveendx = val[1];
                this._moveendy = val[2];
            }
            if (val[3] == 1) {
                this._moveendw = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[4]));
                this._moveendh = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[5]));
            } else {
                this._moveendw = val[4];
                this._moveendh = val[5];
            }
        } else {
            //androd
            if (val[0] == 1) {
                this._moveendx = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[1])) / zoom;
                this._moveendy = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[2])) / zoom;
            } else {
                this._moveendx = val[1] / zoom;
                this._moveendy = val[2] / zoom;
            }
            if (val[3] == 1) {
                this._moveendw = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[4])) / zoom;
                this._moveendh = GloableData.getInstance().dGameSystem.vars.getVar(parseInt(val[5])) / zoom;
            } else {
                this._moveendw = val[4] / zoom;
                this._moveendh = val[5] / zoom;
            }

        }

        this._totalframe = parseInt(val[6]) / 2;
        this.moveX = (this._moveendx - this._movestartx) / this._totalframe;
        this.moveY = (this._moveendy - this._movestarty) / this._totalframe;
        this.moveW = (this._moveendw - this._movestartw) / this._totalframe;
        this.moveH = (this._moveendh - this._movestarth) / this._totalframe;
    }

};