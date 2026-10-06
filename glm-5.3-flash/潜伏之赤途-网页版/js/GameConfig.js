/*
 * M_C:c服务器
 * M_M：主站的
 * M_RESOUSE:资源服务器
 * M_IMG:图片路径
 * */
var M_C_SERVER_URL,
    M_M_SERVER_URL,
    M_RESOUSE_SERVER_URL,
    M_IMG_SERVER_URL,
    M_WC_SERVER_URL, //世界语言
    M_CG_URL,
    M_PIC_URL;


var is_test_server =  false; //true 测试环境  false  正式环境
var http_ser = window.location.protocol;


function GameConfig(){
    var self = this;
    if(channel_id.length>0){
        //sdk
        this.channel_id = GetQueryStrParent("channel_id")||"0";
        //非主站
        if(is_test_server){
            //测试环境
            M_CG_URL = "//move-test-cg.66rpg.com/";
        }else{
            //debug 正式
            M_CG_URL = "//cgv2.66rpg.com/";
        }
        //debug 正式
        M_C_SERVER_URL = cUrl;
        M_M_SERVER_URL = webUrl;
        M_IMG_SERVER_URL = "//c1.cgyouxi.com/website/";
        M_WC_SERVER_URL = "//testwcdn.66rpg.com/";
    }else{
        //主站
        var href = window.location.href;
        var is_server = "zs";
        if(href.toLowerCase().indexOf("local-m")!=-1){
            is_server = "local-m";
        }else if(href.toLowerCase().indexOf("test-m")!=-1){
            is_server = "test-m";
        }else if(href.toLowerCase().indexOf("local-www")!=-1){
            is_server = "local-www";
        }else if(href.toLowerCase().indexOf("test-www")!=-1){
            is_server = "test-www";
        }else if(href.toLowerCase().indexOf("debug-www")!=-1){
            is_server = "debug-www";
        }else if(href.toLowerCase().indexOf("debug-m")!=-1){
            is_server = "debug-m";
        }else{
            is_server = "zs";
        }

        /*if(is_server == "test-www"||is_server == "local-www"){
            M_M_SERVER_URL = webUrl; //'http://www.66rpg.com',
        }else if(is_server == "test-m"||is_server == "local-m"){
            M_M_SERVER_URL = mUrl;//'//m.66rpg.com'
        }*/

        //主站
        if(is_server == "local-www"||is_server == "local-m"){
            M_C_SERVER_URL = cUrl;
            M_M_SERVER_URL = "//test-www.66rpg.com";
            //本地
            M_IMG_SERVER_URL = "../../public/";
            M_WC_SERVER_URL = "//testwcdn.66rpg.com/";
            M_CG_URL = "//move-test-cg.66rpg.com/";
            M_PIC_URL ="//pic.cgyouxi.com/";
        }else if(is_server == "test-www"||is_server == "test-m"){
            //测试环境
            M_C_SERVER_URL = '' + http_ser + cUrl;
            M_M_SERVER_URL = '' + http_ser + webUrl;
            //本地
            M_IMG_SERVER_URL = "../../public/";
            M_WC_SERVER_URL = "//testwcdn.66rpg.com/";
            M_CG_URL = "//move-test-cg.66rpg.com/";
            M_PIC_URL ="//pic.cgyouxi.com/";
        }else if(is_server == "debug-www"||is_server == "debug-m"){
            //debug 正式
            M_C_SERVER_URL = '' + http_ser + cUrl;
            M_M_SERVER_URL = '' + http_ser + webUrl;
            M_IMG_SERVER_URL = "//c1.cgyouxi.com/website/";
            M_WC_SERVER_URL = "//testwcdn.66rpg.com/";
            M_CG_URL = "//debug-cg.66rpg.com/";
            M_PIC_URL ="//pic.cgyouxi.com/";
        }else{
            //正式
            M_C_SERVER_URL = '' + http_ser + cUrl;
            M_M_SERVER_URL = '' + http_ser + webUrl;
            M_IMG_SERVER_URL = "//c1.cgyouxi.com/website/";
            M_WC_SERVER_URL = "//testwcdn.66rpg.com/";
            M_CG_URL = "//cgv2.66rpg.com/";
            M_PIC_URL ="//pic.cgyouxi.com/";
        }
    }
}
var gameConfig = new GameConfig();




//配置的地址
function GamePath (){
    /*-----------开始：统计各种----------*/
    //自造数据 --流量
    this.GAME_FLOW = M_CG_URL+"api/oweb_log.php";
    //获取公钥
    this.UP_GAME_GET_KEY = M_C_SERVER_URL+"/collect/v1/index/getkey";
    //上报游戏运行时长
    this.UP_GAME_RUN_TIME = M_C_SERVER_URL+"/collect/v1/index/runtime";
    //游戏服务器时间
    this.GAME_SYSTEM_TIME = M_M_SERVER_URL+"/api/tool?action=get_server_time";
    //上报UV
    this.UP_GAME_UV = M_C_SERVER_URL+"/collect/v1/index/set_match_game_uv";
    //上报PV
    this.UP_GAME_PV= M_C_SERVER_URL+"/collect/v1/index/set_game_pv_post";
    /*-----------结束：分享、鲜花、用户----------*/

    /*-----------开始：分享、鲜花、用户----------*/
    //用户给游戏送的花数
    this.FLOWER_GAME_ALL_FLOWER = M_M_SERVER_URL+"/ajax/game/game_flower_by_me.json";
    //分享加鲜花
    this.FLOWER_SHARE_PLUS_FLOWER = M_M_SERVER_URL+"/ajax/share/share_game.json";
    //彩虹币购买鲜花
    this.FLOWER_CHB_BUY_FLOWER = M_M_SERVER_URL+"/ajax/pay/flower.json";
    //送花
    this.FLOWER_SEND_FLOWER = M_M_SERVER_URL+"/ajax/contains/flower.json";
    //所有奖励配置信息
    this.FLOWER_SHARE_ALL_INFO = M_M_SERVER_URL+"/ajax/share/all_share_award_conf.json";
    //获得本次分享配置
    this.FLOWER_SHARE_NOW_FLOWER = M_M_SERVER_URL+"/ajax/share/share_award_conf.json";
    // 获得彩虹币 积分 鲜花
    this.USER_CJH_INFO =M_M_SERVER_URL+"/ajax/user/get_flower.json";
    //获取用户信息
    this.USER_INFO =M_M_SERVER_URL+"/ajax/user/getUserInfo.json";
    /*-----------结束：分享、鲜花、用户----------*/

    /*-----------开始：游戏内容----------*/
    //获取map.bin
    //this.GET_MAP_BIN = M_MAP_URL+"api/oapi_map.php";
    //获取游戏信息
    this.GAME_GET_GAME_INFO = M_M_SERVER_URL+"/ajax/game/get_game_info.json";
    //游戏分享的链接
    this.GAME_SHARE_HREF = M_M_SERVER_URL+"/game";
    //游戏更新日志
    this.GAME_UPDATE_LOG = M_M_SERVER_URL+"/ajax/game/update_log_list.json";
    //游戏服务器时间
    this.GAME_SYSTEM_TIME = M_M_SERVER_URL+"/api/tool?action=get_server_time";
    //游戏任务
    this.GAME_TASK_CONTENT = M_M_SERVER_URL+"/ajax/task/game_task_point.json";
    //游戏周边
    this.GAME_AS_CONTENT = M_M_SERVER_URL+"/ajax/game/get_user_code_state";
    //游戏的完结信息
    this.GAME_LINK_OVER = M_M_SERVER_URL+"/ajax/game/get_game_link.json";
    //获取游戏的评论
    this.GAME_COMMENT = M_M_SERVER_URL+"/ajax/comment/comments.json";
    //获取游戏的精品评论
    this.GAME_FINE_COMMEN = M_M_SERVER_URL+"/ajax/comment/fine_comments.json";
    /*-----------结束：游戏内容----------*/

    /*-----------开始：橙光菜单----------*/
    //获取点赞数目
    this.GET_THUMBS_NUM = M_M_SERVER_URL+"/ajax/game/score_sum.json";
    //获取点赞状态
    this.GET_THUMBS_STATE = M_M_SERVER_URL+ "/ajax/game/score_by_me.json";
    //上传点赞
    this.UP_THUMBS = M_M_SERVER_URL+ "/ajax/game/score.json";
    //获取关注状态
    this.GET_ATTENTION_STATE = M_M_SERVER_URL+"/ajax/follow/status.json";
    //去关注
    this.UP_ATTENTION = M_M_SERVER_URL+ "/ajax/follow/create.json";
    //取消关注
    this.UP_ATTENTION_CANCEL = M_M_SERVER_URL + "/ajax/follow/delete.json";
    //获取收藏状态
    this.GET_COLLECT_STATE = M_M_SERVER_URL + "/ajax/favorite/isfaved.json";
    //去收藏
    this.UP_COLLECT = M_M_SERVER_URL+"/ajax/favorite/create.json";
    //取消收藏
    this.UP_COLLECT_CANCEL = M_M_SERVER_URL+"/ajax/favorite/destory.json";
    /*-----------结束：橙光菜单----------*/

    /*-----------web开始时广告----------*/
    this.Game_AD = M_M_SERVER_URL+"/ajax/ad/get_flash_ad_list.json";

    this.GAT_ABOX_FLOWER_BY_ME = M_M_SERVER_URL+"/api/client"
    /*-----------结束----------*/
}
var GAME_PATH =  new GamePath(); //所有用到的路径









