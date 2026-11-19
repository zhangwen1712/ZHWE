# ZHWE 迁移工作区

本项目用于将 zhwe.top 从 WordPress 迁移至 GitHub 和 Cloudflare。

## 当前状态

`baseline/homepage.html` 是公开首页的原始 HTML 快照，用于复刻时对照。它仍引用原站资源和链接，不是独立的网站，也不能作为迁移完成的版本发布。

下一步：盘点公开页面与资源，构建 Astro 组件、转换已发布内容，并在桌面和移动端逐页对照。草稿、凭据和数据库备份不得提交至公开仓库。

`migration/published-posts.json` 包含从公开 WordPress API 读取的 85 篇已发布文章，作为迁移输入；正文仍需转换和校验。
