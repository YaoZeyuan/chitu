/**
 * Created by heshang on 2017/6/3.
 */
var OAudio = (function () {
    var self;
    function OAudio() {
        self = this;
        this.bgm = document.createElement("audio");
        this.bgm.volume = 0;
        this.bgm.onended = function () {
            this.bgmOver();
        }.bind(this);
        // this.bgm.loop = true;
        this.bgs = document.createElement("audio");
        this.bgs.volume = 0;
        this.bgs.loop = true;
        this.se = document.createElement("audio");
        this.se.volume = 0;
        this.se.loop = false;
        this.voice = document.createElement("audio");
        this.voice.volume = 0;
        this.voice.loop = false;
        this.bgmVolume = 0.8;
        this.bgsVolume = 0.8;
        this.seVolume = 0.8;
        this.voiceVolume = 0.8;
        // var body = document.getElementById("layaCanvas");
        // var clickBody = function () {
        //     body.removeEventListener("click",clickBody);
        //     clickBody = null;
        //     body = null;
        //
        // }
        //
        // body.addEventListener("click",clickBody);
    }
    function checkVolume(v) {
        if(isNaN(v)){
            return 0;
        }else{
            if(v<=0){
                return 0;
            }else{
                return v;
            }
        }
    }
    OAudio.prototype = {
        init:function () {
            try{
                if(self.bgm.currentTime || self.bgs.currentTime || self.se.currentTime || self.voice.currentTime){
                    return;
                }
                self.playBGM("",0);
                self.playBGS("",0);
                self.playSE("",0);
                self.playVoice("",0);
            }catch (e){
                console.log(e+"音乐问题");
            }
        },
        /*****音量控制*/
        bgmV:function (v) {
            this.bgmVolume = checkVolume(v);
            this.bgm.volume = this.bgmVolume;
        },
        bgsV:function (v) {
            this.bgsVolume = checkVolume(v);
            this.bgs.volume = this.bgsVolume;
        },
        seV:function (v) {
            this.seVolume = checkVolume(v);
            this.se.volume = this.seVolume;
        },
        voiceV:function (v) {
            this.voiceVolume = checkVolume(v);
            this.voice.volume = this.voiceVolume;
        },
        /*****播放控制*/
        pauseBGM:function () {
            this.bgm.pause();
        },
        pauseBGS:function () {
            this.bgs.pause();
        },
        pauseSE:function () {
            this.se.pause();
        },
        pauseVoice:function () {
            this.voice.pause();
        },
        playBGM:function (src,volume) {
            if(src !== this.bgm.src){
                this.bgm.src = src;
            }
            this.bgm.load();
            this.bgm.play();
            if(volume!=null){
                this.bgmV(volume);
            }
        },
        bgmOver:function () {
            if(this.bgmComplete){
                this.bgmComplete.callBack && this.bgmComplete.callBack.call(this.bgmComplete.caller);
                return;
            }
            this.bgm.load();
            this.bgm.play();
        },
        playBGS:function(src,volume){
            if(src !== this.bgs.src){
                this.bgs.src = src;
            }
            this.bgs.load();
            this.bgs.play();
            if(volume!=null){
                this.bgsV(volume);
            }
        },
        playSE:function(src,volume){
            if(src !== this.se.src){
                this.se.src = src;
            }
            this.se.load();
            this.se.play();
            if(volume!=null){
                this.seV(volume);
            }
        },
        playVoice:function(src,volume){
            if(src !== this.voice.src){
                this.voice.src = src;
            }
            this.voice.load();
            this.voice.play();
            if(volume!=null){
                this.voiceV(volume);
            }
        },
        //静音非静音
        setMuted:function (isMuted) {
            this.bgm.muted = isMuted;
            this.bgs.muted = isMuted;
            this.se.muted = isMuted;
            this.voice.muted = isMuted;
        },
        stopAll:function () {
            // self.setMuted(true);
            if(!this.bgm.paused)
            {
                this.bgm.pause();
            }
            if(!this.bgs.paused){
                this.bgs.pause();
            }
            if(!this.se.paused){
                this.se.pause();
            }
            if(!this.voice){
                this.voice.pause();
            }
        },
        resumeAll:function () {
            this.bgm.play();
            this.bgs.play();
            this.se.play();
            this.voice.play();
        },
        resumeBGM:function () {
            if(this.bgm.paused)
            {
                this.bgm.play();
            }
            if(this.bgs.paused){
                this.bgs.play();
            }
        }
    }
    return OAudio;
})();