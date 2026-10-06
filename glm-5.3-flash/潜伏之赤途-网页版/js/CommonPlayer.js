function CommonPlayer(){
    this.userInfos={
        /*uid:0,//用户uid
        uname:"", //昵称
        account_info:"",
        account_type:"",
        angel_logo:0,
        author_level:"",
        avatar:"",
        client_type:"",
        email:"",
        login_type:"",
        mobile:"",
        nick_name:"",
        nick_name_set:0,
        regdate:"",
        screen_game_ad:0,
        screen_scroll_ad:0,
        session_loginday:"",
        status:"",
        super_title:"",
        temp_vip_end_time:"",
        temp_vip_level:"",
        user_exp:"",
        user_level:"",
        username:"",
        vip_level:"",
        flower:"",
        fresh_flower_num:0, //真实的花
        num:0, //总花数
        sum:0,//总花数（包括分享的.5的花）
        tanhua_flower_num:0,//昙花
        wild_flower_num:0 //野花*/
    };
    this.flower = {
        fresh_flower_num:0, //真实的花
        num:0, //总花数
        sum:0,//总花数（包括分享的.5的花）
        tanhua_flower_num:0,//昙花
        wild_flower_num:0 //野花*/
    };//用户的花
    this.flower_unlock = parseInt(flower_unlock);//鲜花锁
    this.platform; //各端  -1 未知   0 网页  1 iOS 2 安卓  3 终端锁定版  4 手机站 5 后台  6 C#工具  7 h5工具  8 bbs  9 H5联运
    this.channel_id = channel_id;//主站还是橙光+
    this.loginStatus = false;//false 为未登陆状态， true，登录
    this.countServer;
    this.goWXShare;
    this.goWXMainPage;
    this.login; //登录
    this.gameMenu;//菜单
    this.sendFlower;//打赏界面所有数据获得
    this.aspect_ratio = parseInt(aspect_ratio);//960*540  1028*720  800*600  540*960
    this.rotate_screen = false;
    this.isVertical = this.aspect_ratio == 3;//是不是竖屏
    this.gameWidth =$(window).width(); //屏幕可视区宽度
    this.gameHeight =$(window).height(); //屏幕可视区高度
    this.timesTrampSys= 0;//系统时间戳
    this.timesTrampLocal = 0;//本地时间
}
var commonPlayer =  new CommonPlayer ();