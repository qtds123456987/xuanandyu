# 我们的恋爱日志

这是一个可直接部署到 GitHub Pages 的静态恋爱日志网站。

## 发布到 GitHub Pages

1. 解压本目录中的文件，把 `index.html`、`styles.css`、`app.js` 和 `.nojekyll` 放到 GitHub 仓库根目录。
2. 在仓库的 **Settings → Pages** 中选择 **Deploy from a branch**。
3. 选择 `main` 分支和 `/ (root)`，保存后等待 GitHub Pages 发布。
4. 发布地址通常是：`https://你的用户名.github.io/仓库名/`

## 功能

- 故事首页、恋爱时间线、照片回忆、愿望清单
- 新增和删除日志
- 新增愿望、标记愿望完成
- 浏览器本地保存内容（localStorage）
- 本地上传照片并保存在当前浏览器
- 桌面端和手机端自适应

## 关于数据

当前版本是纯静态网站，新增日志、愿望和照片保存在浏览器本地。GitHub Pages 负责发布页面，无法让两台设备自动共享新增内容；如果希望你和她在不同设备上都能实时看到同一份新增记录，后续需要接入 Supabase、Firebase 或其他数据库。
