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

## 本地验证

部署前可先本地检查：进入 `site/` 双击 `start-server.bat`（或任意静态服务器指向 `site/`），游戏能进、对话能走即正常。

## 注意事项

- `output/`、`glm-5.3-flash/`、`.workbuddy/`、`task_plan/` 已在 `.gitignore` 中排除，不会发布。
- 站点内所有资源为相对路径，放 `site/` 子目录或仓库根均可运行；本仓库采用 `site/` 封装。
