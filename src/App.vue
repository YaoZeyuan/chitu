<template>
  <header class="head">
    <h1>潜伏之赤途</h1>
    <div class="sub">愿我们在抵达路的末端时，都不会后悔</div>
    <div class="rule"></div>
  </header>

  <nav>
    <a v-for="item in links" :key="item.name" :class="{ primary: item.primary }" :href="item.href" :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noopener' : undefined">
      <span class="name">{{ item.name }}</span>
      <span class="desc">{{ item.desc }}</span>
      <span class="arrow">{{ item.external ? "↗" : "→" }}</span>
    </a>
  </nav>

  <footer>非官方复刻 · 仅供学习交流</footer>
</template>

<script setup>
const links = [
  { name: "开始游戏", desc: "原版游戏 · 可存档", href: "/game.html", primary: true },
  { name: "剧情脚本", desc: "原始剧本 · 速览章节", href: "/plot/index.html" },
  { name: "分支概览", desc: "全剧情分支图", href: "/plot/branch.html" },
  { name: "剧情解析", desc: "游戏介绍", href: "https://mp.weixin.qq.com/s/QCk0tUsYSIgUTnppGfoQRw", external: true },
  { name: "隐形守护者", desc: "原团队开发的手机版", href: "https://yxshz.qq.com/", external: true },
  { name: "项目地址", desc: "GitHub · YaoZeyuan/chitu", href: "https://github.com/YaoZeyuan/chitu", external: true },
];
</script>

<style scoped>
.head {
  text-align: center;
  margin-bottom: 36px;
}

.head h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 8px;
  color: var(--accent);
}

.head .sub {
  margin-top: 10px;
  font-size: 14px;
  color: var(--muted);
  letter-spacing: 2px;
}

.head .rule {
  width: 72px;
  height: 3px;
  background: var(--accent);
  margin: 18px auto 0;
  border-radius: 2px;
}

nav {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

nav a {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 16px 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--ink);
  text-decoration: none;
  box-shadow: 0 1px 6px rgba(60, 50, 30, 0.06);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}

nav a:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(60, 50, 30, 0.12);
  border-color: var(--accent);
  text-decoration: none;
}

nav a .name {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 2px;
}

nav a .desc {
  font-size: 13px;
  color: var(--muted);
}

nav a.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

nav a.primary .name {
  color: #fff;
}

nav a.primary .desc {
  color: rgba(255, 255, 255, 0.82);
}

nav a .arrow {
  margin-left: auto;
  color: var(--muted);
  font-size: 14px;
}

nav a.primary .arrow {
  color: rgba(255, 255, 255, 0.8);
}

footer {
  margin-top: 40px;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 1px;
}
</style>
