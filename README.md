# ZHWE

将个人博客从 WordPress 迁移到 Astro、GitHub 与 Cloudflare 的进行中项目。原站尚未切换。

## 本地运行

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
ASTRO_TELEMETRY_DISABLED=1 npm run build
./node_modules/node/bin/node --test test/comments.test.mjs
```

项目需要 Node.js 22.23.4 或更高版本，开发依赖包含本地 Node 运行时。构建输出在 `dist/`。

## 内容与媒体

`migration/` 包含已公开的文章、页面、分类、标签、历史评论及媒体清单。WordPress 草稿不放入此公开仓库。原路径保留；`public/wp-content/uploads/` 包含媒体库原文件和正文使用的文件。为减少重复，不保留全部自动生成的缩略图。`migration/assets-manifest.json` 列出已下载文件。

文章正文中有 14 个旧阿里云 OSS 图片链接无法下载；这些链接暂时保留，待从备份恢复后替换。两个大于 25 MiB 的视频需要在 Cloudflare 上使用 R2 等存储，不能直接作为 Workers 静态资源部署。

## 评论

历史公开评论静态展示。新评论的 Worker 接口位于 `worker/comments.mjs`，数据表在 `migrations/0001_comments.sql`；评论默认待审核，并具备长度、来源和提交频率检查。接口代码有本地模拟测试。

**新评论服务尚未部署或配置**：仍需创建并绑定独立 D1 数据库、配置 `COMMENT_SALT` 密钥和防滥用措施、设置审核操作、验证部署路由及端到端流程。Astro 本地静态预览中提交评论会提示服务未启用。不要在正式站启用前声称评论可用。

当前网站仍为开发预览：外部失效图片、复杂区块、原有页面交互、SEO、移动端及历史内容需要继续核对；预览页面保留 `noindex`。正式域名切换前需完成内容对账、功能测试与回滚方案。

## Cloudflare Pages 审核版

使用 `npm run build:pages` 构建，输出目录为 `dist`。由于 Pages 单文件上限为 25 MiB，审核版的两个大视频暂时从原网站加载；GitHub 中保留原文件。评论服务尚未连接，部署静态页面不会启用新评论。审核版保留 noindex，正式切换前需迁移大视频并完成评论、资源和 SEO 校验。
