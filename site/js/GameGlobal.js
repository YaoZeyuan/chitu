/**
 * Created by lilinlin on 2017/5/24.
 */
function GameGlobal (){
    var self = this;
    this.Silence = false; //默认不是静音
    this.FontSpeed = "centre"; //fast---centre---low 默认一般
}
var gameGlobal = new GameGlobal();


//字体速度
window.controlFontSpeed = function (val){
    if(mark.WEB){
        //fast---centre---low
        if(val == "fast"){
            //超快字速
            gameGlobal.FontSpeed = val;

        }else if(val == "center"){
            //较快字速
            gameGlobal.FontSpeed = val;
        }else{
            //正常字速
            gameGlobal.FontSpeed = val;
        }
        WebFontSpeedControl&&WebFontSpeedControl(gameGlobal.FontSpeed);
    }

}
//静音
window.controlSilence = function (muted){
    if(mark.WEB){
        //设置静音
        if(muted){
            //静音
            gameGlobal.Silence = true;
        }else{
            //取消静音
            gameGlobal.Silence = false;
        }
        WebAudioControl&&WebAudioControl(gameGlobal.Silence);
    }
}

//菜单WEB的时候，全屏退出全屏
window.changeGameScreen = function (fullScreen){
    if(mark.WEB){
        if(fullScreen){
            //全屏啦
            commonPlayer.gameMenu.fullScreen = true;
        }else{
            //退出全屏啦
            commonPlayer.gameMenu.fullScreen = false;
        }
        WebUserChangeData&&WebUserChangeData(commonPlayer.gameMenu.fullScreen);
    }
}
//获取一个随机数，在max,min之间
//max 需大于 min
//如果输入 10，则产生 0~9 的数
//如果输入 4,10，则产生 4~9 的数
//如果输入 40,10，则返回 false
window.MathRandom = function (min,max){
    var rand=false;
    rand=Math.floor(Math.random()*max);
    if(!(min==undefined) && (max>=min)){
        rand=Math.floor(Math.random()*(max-min)+min);
    }else if(max<min){
        return false;
    }
    return rand;
}