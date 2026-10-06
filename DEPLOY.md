# 部署说明

本仓库用 GitHub Actions 把 `site/` 目录发布到 GitHub Pages，自定义域名 `chitu.yaozeyuan.online`。

## 一次性设置（GitHub 侧）

1. 在 GitHub 创建仓库并推送：
   ```bash
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin master
   ```
2. 仓库页面 → **Settings → Pages** → Build and deployment → Source 选 **GitHub Actions**。
3. 推送后 Actions 会自动跑 `Deploy site to GitHub Pages` 工作流（`.github/workflows/deploy.yml`），把 `site/` 发布出去。首次也可以在 Actions 页面手动 Run workflow 验证。

## 域名解析（DNS 服务商处）

给 `yaozeyuan.online` 添加一条记录：

| 类型 | 主机记录 | 记录值 |
|---|---|---|
| CNAME | chitu | `<GitHub用户名>.github.io` |

（若 DNS 服务商不支持 CNAME 指向外部域名，则添加 4 条 A 记录指向 `185.199.108.153` / `185.199.109.153` / `185.199.110.153` / `185.199.111.153`。）

- 仓库里 `site/CNAME` 已写入 `chitu.yaozeyuan.online`，Pages 部署时会自动应用自定义域名。
- DNS 生效后（几分钟到几小时），在 Settings → Pages 的 Custom domain 填入 `chitu.yaozeyuan.online` 并勾选 Enforce HTTPS。

## 方案二：部署到 Vercel（二选一即可）

仓库根目录的 `vercel.json` 已声明 `"outputDirectory": "site"`，无需调整任何代码结构。两种方式：

**方式 A：Git 导入（推荐，推送后自动部署）**
1. 仓库推到 GitHub 后，在 [vercel.com](https://vercel.com) → Add New → Project → 导入该仓库
2. Framework Preset 选 **Other**，其余默认（Build Command 留空，Output Directory 会自动读 vercel.json）→ Deploy

**方式 B：本地 CLI（无需建远程仓库）**
```bash
npm i -g vercel
cd <本仓库根目录>
vercel --prod
```
首次运行会要求登录并确认项目设置，直接回车即可。

**自定义域名（Vercel 侧）**
1. Vercel 项目 → Settings → Domains → 添加 `chitu.yaozeyuan.online`
2. DNS 记录与 GitHub Pages 不同：`chitu` 的 CNAME 指向 **`cname.vercel-dns.com`**（而非 `<用户名>.github.io`）

注意：
- `site/CNAME` 文件是 GitHub Pages 专用，Vercel 会忽略它，可以留着不动。
- `.github/workflows/deploy.yml` 只在 GitHub 上触发，与 Vercel 互不干扰；两边都开的话同一站点会发布到两个域名，按需选用。
- 全站资源都是相对路径静态文件，Vercel 无需任何重写规则。

## 本地验证

部署前可先本地检查：进入 `site/` 双击 `start-server.bat`（或任意静态服务器指向 `site/`），游戏能进、对话能走即正常。

## 注意事项

- `output/`、`glm-5.3-flash/`、`.workbuddy/`、`task_plan/` 已在 `.gitignore` 中排除，不会发布。
- 站点内所有资源为相对路径，放 `site/` 子目录或仓库根均可运行；本仓库采用 `site/` 封装。
