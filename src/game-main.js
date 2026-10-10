import { inject } from "@vercel/analytics";

// game.html 构建入口：游戏逻辑全部保持原有静态脚本不变，
// 仅注入 Vercel Analytics，使 /game.html 的访问也被统计
inject();
