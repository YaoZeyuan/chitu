/**
 * Created by kongwen on 2017/3/14.
 * 库引用
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var OSprite = /** @class */ (function (_super) {
    __extends(OSprite, _super);
    function OSprite() {
        var _this = _super.call(this) || this;
        _this.tag = null;
        return _this;
        // this.loadImage("");
    }
    OSprite.prototype.clone = function () {
        var tempSp = new OSprite();
        tempSp.texture = this.texture;
        tempSp.filters = this.filters;
        tempSp.x = this.x;
        tempSp.y = this.y;
        tempSp.size(this.width, this.height);
        return tempSp;
    };
    OSprite.prototype.getDataSource = function (imageType, quality, w, h) {
        if (imageType === void 0) { imageType = "image/png"; }
        if (quality === void 0) { quality = null; }
        if (w === void 0) { w = GloableData.getInstance().gameMainData.Headr.GWidth; }
        if (h === void 0) { h = GloableData.getInstance().gameMainData.Headr.GHeight; }
        try {
            var str = void 0;
            str = this.drawToCanvas(w, h, 0, 0).getCanvas().toDataURL(imageType, quality);
            return str;
        }
        catch (e) {
            return "";
        }
    };
    OSprite.prototype.thumbSnap = function (tw, th) {
        var w = GloableData.getInstance().gameMainData.Headr.GWidth;
        var h = GloableData.getInstance().gameMainData.Headr.GHeight;
        var hc = this.drawToCanvas(w, h, 0, 0);
        var s = new OSprite().scale(tw / w, th / h);
        s.graphics.drawTexture(new laya.resource.Texture(hc));
        return s.drawToCanvas(tw, th, 0, 0);
    };
    OSprite.prototype.osize = function (width, height) {
        this.size(width, height);
    };
    OSprite.prototype.addEventLisner = function (type, caller, lisner) {
        this.on(type, caller, lisner, [this]);
    };
    OSprite.prototype.removeEventLisner = function (type, caller, lisner, onceOnly) {
        if (onceOnly === void 0) { onceOnly = false; }
        this.off(type, caller, lisner, onceOnly);
    };
    OSprite.prototype.removeChildByNode = function (a) {
        if (a) {
            a.offAll();
            this.removeChild(a);
        }
    };
    //删除所有子节点
    OSprite.prototype.removeAllChild = function () {
        while (this._childs && this._childs.length > 0) {
            this.removeChildByNode(this._childs.shift());
        }
    };
    //包括自身删除
    OSprite.prototype.removeAll = function () {
        this.offAll();
        this.destroy(true);
    };
    OSprite.prototype.dispose = function () {
        this.offAll();
        this.destroy(true);
    };
    return OSprite;
}(laya.display.Sprite));
var OTexture = /** @class */ (function (_super) {
    __extends(OTexture, _super);
    function OTexture(bitmap, uv) {
        return _super.call(this, bitmap, uv) || this;
    }
    return OTexture;
}(laya.resource.Texture));
var OButton = /** @class */ (function (_super) {
    __extends(OButton, _super);
    function OButton(str, isClick, isSetSize) {
        if (isClick === void 0) { isClick = true; }
        if (isSetSize === void 0) { isSetSize = true; }
        var _this = _super.call(this) || this;
        _this.back = new OImage();
        _this.isClick = true;
        _this.isSetSize = true;
        _this.isClick = isClick;
        _this.isSetSize = isSetSize;
        if (typeof (str) == "string") {
            _this.state1Src = str;
            _this.state2Src = null;
            _this.state3Src = null;
        }
        else if (str) {
            _this.state1Src = str[0];
            _this.state2Src = str[1];
            _this.state3Src = str[2];
            _this.on(GameEvent.MOUSE_OVER, _this, _this.overEvent);
            _this.on(GameEvent.MOUSE_OUT, _this, _this.outEvent);
            _this.on(GameEvent.MOUSE_UP, _this, _this.upEvent);
            _this.on(GameEvent.MOUSE_DOWN, _this, _this.downEvent);
            _this.on(GameEvent.BLUR, _this, _this.upEvent);
        }
        // this.mouseThrough=true;
        // this.mouseEnabled=true;
        // this.back.mouseThrough=true;
        // this.back.mouseEnabled=true;
        _this.addChild(_this.back);
        if (_this.state1Src) {
            _this.showImage(_this.state1Src);
        }
        return _this;
    }
    OButton.prototype.showImage = function (str) {
        if (typeof (str) == "string") {
            if (str == "") {
                return;
            }
            if (ORG.loader.getRes(str)) {
                this.back.texture = ORG.loader.getRes(str);
                if (this.isClick) {
                    this.size(this.back.texture.width, this.back.texture.height);
                }
            }
            else {
                ORG.loader.load(str, OHandler.create(this, this.loadState1Ok, [str]), null, OLoader.IMAGE);
            }
        }
        else {
            // this.back = str;
            this.removeChild(this.back);
            this.back = str;
            this.addChildAt(this.back, 0);
            if (this.isClick) {
                if (this.isSetSize) {
                    this.back.size(str.width, str.height);
                    this.size(str.width, str.height);
                }
            }
        }
        // let image:OImage = new OImage();
        // image.loadImage(str,0,0,1,1,Hand ler.create(this,this.loadState1Ok))
    };
    OButton.prototype.loadState1Ok = function (e) {
        this.back.texture = ORG.loader.getRes(e);
        if (this.isClick && this.back.texture) {
            this.size(this.back.texture.width, this.back.texture.height);
        }
    };
    //鼠标经过第二态
    OButton.prototype.overEvent = function () {
        if (this.state2Src) {
            this.showImage(this.state2Src);
        }
    };
    //鼠标移出
    OButton.prototype.outEvent = function () {
        this.showImage(this.state1Src);
    };
    //鼠标抬起
    OButton.prototype.upEvent = function () {
        this.showImage(this.state1Src);
    };
    //鼠标按下第三态
    OButton.prototype.downEvent = function () {
        if (!this.state3Src && this.state2Src) {
            this.showImage(this.state2Src);
        }
        else if (this.state3Src) {
            this.showImage(this.state3Src);
        }
    };
    OButton.prototype.updateURL = function (str) {
        if (str == "") {
            this.size(0, 0);
        }
        if (typeof (str) == "string" && str != this.state1Src) {
            this.state1Src = str;
            this.state2Src = null;
            this.state3Src = null;
        }
        else if (typeof (str) != "string" && str) {
            if (str[0] != this.state1Src) {
                this.state1Src = str[0];
            }
            if (str[1] != this.state2Src) {
                this.state2Src = str[1];
            }
            if (str[2] != this.state3Src) {
                this.state3Src = str[2];
            }
        }
        if (this.state1Src) {
            this.showImage(this.state1Src);
        }
    };
    OButton.prototype.getUrl = function () {
        return this.state1Src;
    };
    OButton.prototype.click = function (caller, call) {
        if (this.isClick) {
            this.on(GameEvent.CLICK, caller, function (args, e) {
                // e.stopPropagation();
                call.call(caller, args, [e]);
            }, [this]);
        }
    };
    OButton.prototype.removeAll = function () {
        this.destroy(true);
        this.offAll();
    };
    Object.defineProperty(OButton.prototype, "setText", {
        set: function (str) {
            if (!this.title) {
                this.title = new OText();
                this.title.text = str;
                this.title.x = (this.width - this.title.width) / 2;
                this.title.y = (this.height - this.title.height) / 2;
                var temp_y = GloableData.getInstance().getFontDiffy(this.title.font, this.title.fontSize);
                this.title.y -= temp_y;
            }
            else {
                this.title.text = str;
            }
        },
        enumerable: true,
        configurable: true
    });
    OButton.prototype.setTitle = function (title) {
        if (!this.title) {
            this.title = title;
            this.title.x = (this.width - title.width) / 2;
            this.title.y = (this.height - title.height) / 2;
            this.addChild(title);
        }
        else {
            this.title.x = (this.width - title.width) / 2;
            this.title.y = (this.height - title.height) / 2;
            this.title.text = title.text;
        }
        var temp_y = GloableData.getInstance().getFontDiffy(this.title.font, this.title.fontSize);
        this.title.y -= temp_y;
    };
    return OButton;
}(OSprite));
var OMouseEvent = /** @class */ (function (_super) {
    __extends(OMouseEvent, _super);
    function OMouseEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OMouseEvent.getInstance = function () {
        return laya.events.MouseManager.instance;
    };
    return OMouseEvent;
}(laya.events.MouseManager));
var OTextInput = /** @class */ (function (_super) {
    __extends(OTextInput, _super);
    function OTextInput() {
        var _this = _super.call(this) || this;
        _this.tag = null;
        return _this;
    }
    OTextInput.prototype.oprompt = function (str) {
        this.prompt = str;
    };
    OTextInput.prototype.osize = function (width, height) {
        this.size(width, height);
    };
    OTextInput.prototype.osettype = function (str) {
        this.type = str;
    };
    OTextInput.prototype.addEventLisner = function (type, calller, call) {
        this.on(type, calller, call, [this]);
    };
    return OTextInput;
}(laya.ui.TextInput));
// class OButton extends laya.ui.Button {
// }
var OImage = /** @class */ (function (_super) {
    __extends(OImage, _super);
    function OImage() {
        return _super.call(this) || this;
    }
    OImage.prototype.setGrid = function (str) {
        this.sizeGrid = str;
    };
    OImage.prototype.getDataSource = function (imageType, quality, w, h) {
        if (imageType === void 0) { imageType = "image/png"; }
        if (quality === void 0) { quality = null; }
        try {
            var str = void 0;
            str = this.drawToCanvas(w, h, 0, 0).getCanvas().toDataURL(imageType, quality);
            return str;
        }
        catch (e) {
            return "";
        }
    };
    /**
     *需要先设置缩放 在设置
     * */
    OImage.prototype.setGrid1 = function (str, t) {
        this.gridBack = new OImage();
        this.gridTexturn = t;
        //this.sizeGrid = str;
        var posArr = str.split(',');
        var top = parseInt(posArr[0]);
        var right = parseInt(posArr[1]);
        var bottom = parseInt(posArr[2]);
        var left = parseInt(posArr[3]);
        this.imgArr = [];
        this.imgArr[0] = new OImage();
        this.imgArr[1] = new OImage();
        this.imgArr[2] = new OImage();
        this.imgArr[3] = new OImage();
        this.imgArr[4] = new OImage();
        this.imgArr[5] = new OImage();
        this.imgArr[6] = new OImage();
        this.imgArr[7] = new OImage();
        this.imgArr[8] = new OImage();
        var w = this.gridTexturn.sourceWidth;
        var h = this.gridTexturn.sourceHeight;
        var center = w - left - right;
        var middle = h - top - bottom;
        //左上
        this.createTexture(0, 0, left, top, this.imgArr[0]);
        //上中
        this.createTexture(left, 0, center, top, this.imgArr[1]);
        //右上
        this.createTexture(w - right, 0, right, top, this.imgArr[2]);
        //中左
        this.createTexture(0, top, left, middle, this.imgArr[3]);
        //中中
        this.createTexture(left, top, center, middle, this.imgArr[4]);
        //中右
        this.createTexture(w - right, top, right, middle, this.imgArr[5]);
        //下左
        this.createTexture(0, h - bottom, left, h - bottom - middle, this.imgArr[6]);
        //下中
        this.createTexture(left, h - bottom, center, h - bottom - middle, this.imgArr[7]);
        //下右
        this.createTexture(w - right, h - bottom, right, h - bottom - middle, this.imgArr[8]);
        for (var i in this.imgArr) {
            this.gridBack.addChild(this.imgArr[i]);
        }
        this.addChild(this.gridBack);
    };
    OImage.prototype.setGridWH = function (w, h) {
        this.gridBack.size(w, h);
        this.size(w, h);
        //0,2,6,8不拉伸
        var cw = w - this.imgArr[0].width - this.imgArr[2].width;
        var ch = h - this.imgArr[0].height - this.imgArr[6].height;
        //1，7横向拉伸 ，2,8 改变横坐标
        this.imgArr[1].scaleX = cw / this.imgArr[1].width;
        this.imgArr[7].scaleX = cw / this.imgArr[7].width;
        this.imgArr[1].width = cw;
        this.imgArr[7].width = cw;
        this.imgArr[2].x = Math.floor(this.imgArr[1].x + this.imgArr[1].width);
        this.imgArr[8].x = Math.floor(this.imgArr[7].x + this.imgArr[7].width);
        //3，5纵向拉伸，6,8改变纵左边
        this.imgArr[3].scaleY = ch / this.imgArr[3].height;
        this.imgArr[5].scaleY = ch / this.imgArr[5].height;
        this.imgArr[3].height = ch;
        this.imgArr[5].height = ch;
        this.imgArr[6].y = Math.floor(this.imgArr[3].y + this.imgArr[3].height);
        this.imgArr[8].y = Math.floor(this.imgArr[5].y + this.imgArr[5].height);
        //4 横纵拉伸，5变横坐标，7改纵坐标
        this.imgArr[4].scaleX = cw / this.imgArr[4].width;
        this.imgArr[4].scaleY = ch / this.imgArr[4].height;
        this.imgArr[4].width = cw;
        this.imgArr[4].height = ch;
        this.imgArr[5].x = Math.floor(this.imgArr[4].x + this.imgArr[4].width);
        this.imgArr[7].y = Math.floor(this.imgArr[4].y + this.imgArr[4].height);
    };
    OImage.prototype.createTexture = function (x, y, w, h, p) {
        p.texture = OTexture.create(this.gridTexturn, x, y, w, h);
        p.x = x;
        p.y = y;
        p.size(w, h);
    };
    return OImage;
}(laya.ui.Image));
var OByteArray = /** @class */ (function (_super) {
    __extends(OByteArray, _super);
    function OByteArray() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OByteArray;
}(laya.utils.Byte));
var OText = /** @class */ (function (_super) {
    __extends(OText, _super);
    function OText(unSys) {
        var _this = _super.call(this) || this;
        _this.tag = null;
        _this.font = "微软雅黑";
        _this.texts = new Array();
        if (unSys) {
            return _this;
        }
        return _this;
    }
    Object.defineProperty(OText.prototype, "allText", {
        get: function () {
            return this.texts;
        },
        enumerable: true,
        configurable: true
    });
    OText.prototype.addtext = function (text) {
        if (!GloableData.getInstance().fontBitmapData.isUserBitMap) {
            text.y -= GloableData.getInstance().sysFontDifY;
        }
        this.texts.push(text);
        this.addChild(text);
    };
    Object.defineProperty(OText.prototype, "getHeight", {
        get: function () {
            return this.height;
        },
        enumerable: true,
        configurable: true
    });
    OText.prototype.gettext = function (index) {
        if (this.texts[index]) {
            return this.texts[index];
        }
        return null;
    };
    OText.prototype.updateText = function (texts) {
        if (this.texts != texts) {
            // this.texts = texts;
            this.cleanTexts();
            this.removeChildren();
            for (var i in texts) {
                this.addtext(texts[i]);
            }
        }
    };
    OText.prototype.cleanTexts = function () {
        while (this.texts.length > 0) {
            var temp = this.texts.shift();
            if (temp.parent) {
                temp.parent.removeChild(temp);
            }
            temp.dispose();
            temp = null;
        }
        this.removeChildren();
        this.texts = [];
    };
    OText.prototype.dispose = function () {
        this.removeChildren();
        this.destroy(true);
    };
    return OText;
}(laya.display.Text));
var OHttpRequest = /** @class */ (function (_super) {
    __extends(OHttpRequest, _super);
    function OHttpRequest() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OHttpRequest;
}(laya.net.HttpRequest));
var OLoaderManager = /** @class */ (function (_super) {
    __extends(OLoaderManager, _super);
    function OLoaderManager() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OLoaderManager;
}(laya.net.LoaderManager));
var OLoader = /** @class */ (function (_super) {
    __extends(OLoader, _super);
    function OLoader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OLoader;
}(laya.net.Loader));
var OLocalStorage = /** @class */ (function (_super) {
    __extends(OLocalStorage, _super);
    function OLocalStorage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OLocalStorage;
}(laya.net.LocalStorage));
// class OMovieClip extends laya.ani.swf.MovieClip {
// }
// class OAnimation extends laya.display.Animation {
// }
// class OAnimationPlayerBase extends laya.display.AnimationPlayerBase {
// }
var OEvent = /** @class */ (function (_super) {
    __extends(OEvent, _super);
    function OEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OEvent;
}(laya.events.Event));
var OEventDispatcher = /** @class */ (function (_super) {
    __extends(OEventDispatcher, _super);
    function OEventDispatcher() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OEventDispatcher;
}(laya.events.EventDispatcher));
// class OSound extends laya.media.Sound {
// }
var OSoundManager = /** @class */ (function (_super) {
    __extends(OSoundManager, _super);
    function OSoundManager() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OSoundManager;
}(laya.media.SoundManager));
var OSoundChannel = /** @class */ (function (_super) {
    __extends(OSoundChannel, _super);
    function OSoundChannel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OSoundChannel;
}(laya.media.SoundChannel));
var OTween = /** @class */ (function (_super) {
    __extends(OTween, _super);
    function OTween() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OTween;
}(laya.utils.Tween));
var ORectangle = /** @class */ (function (_super) {
    __extends(ORectangle, _super);
    function ORectangle() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ORectangle;
}(laya.maths.Rectangle));
var OPoint = /** @class */ (function (_super) {
    __extends(OPoint, _super);
    function OPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OPoint;
}(laya.maths.Point));
var OStage = /** @class */ (function (_super) {
    __extends(OStage, _super);
    function OStage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OStage;
}(laya.display.Stage));
var OHandler = /** @class */ (function (_super) {
    __extends(OHandler, _super);
    function OHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OHandler;
}(laya.utils.Handler));
var OBox = /** @class */ (function (_super) {
    __extends(OBox, _super);
    function OBox() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OBox;
}(laya.ui.Box));
var OList = /** @class */ (function (_super) {
    __extends(OList, _super);
    function OList() {
        return _super.call(this) || this;
    }
    OList.prototype.addCell = function (cell) {
        _super.prototype.addCell.call(this, cell);
    };
    Object.defineProperty(OList.prototype, "listcontent", {
        get: function () {
            return this._content;
        },
        enumerable: true,
        configurable: true
    });
    return OList;
}(laya.ui.List));
var OHScrollBar = /** @class */ (function (_super) {
    __extends(OHScrollBar, _super);
    function OHScrollBar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OHScrollBar;
}(laya.ui.HScrollBar));
var OHSlider = /** @class */ (function (_super) {
    __extends(OHSlider, _super);
    function OHSlider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OHSlider;
}(laya.ui.HSlider));
var OProgressBar = /** @class */ (function (_super) {
    __extends(OProgressBar, _super);
    function OProgressBar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OProgressBar;
}(laya.ui.ProgressBar));
var OPanel = /** @class */ (function (_super) {
    __extends(OPanel, _super);
    function OPanel() {
        return _super.call(this) || this;
    }
    return OPanel;
}(laya.ui.Panel));
var ORG = /** @class */ (function () {
    function ORG() {
    }
    Object.defineProperty(ORG, "loader", {
        get: function () {
            if (Laya.loader) {
                return Laya.loader;
            }
        },
        enumerable: true,
        configurable: true
    });
    ORG.reloader = function () {
    };
    // public static loader: OLoaderManager = new OLoaderManager();
    ORG.org_timer = new laya.utils.Timer();
    ORG.Tween = new OTween();
    return ORG;
}());
