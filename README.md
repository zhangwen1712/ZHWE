# ZHWE

将个人博客从 WordPress 迁移到 Astro、GitHub 与 Cloudflare 的进行中项目。原站尚未切换。

## 本地运行

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
ASTRO_TELEMETRY_DISABLED=1 npm run build
./node_modules/node/bin/node --test test/*.test.mjs
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

## 多语言

中文保留原有路径，法语、西班牙语、意大利语和德语分别使用 `/fr/`、`/es/`、`/it/`、`/de/` 路径。网站译文主要来自 Cloudflare Workers AI，少量遗漏经人工补译；译文可能存在误译，应结合原文审核。翻译脚本依赖 `requirements-translation.txt` 中的 Python 包，以及已登录的 `cf` CLI；公开内容更新时运行 `python3 scripts/translate-site.py` 补充译文，再运行 `python3 scripts/generate-locales.py` 生成页面数据；构建前核对翻译覆盖率和原有链接、媒体。

建站日志的时间节点从原页面提取到 `migration/milestones.json`，保留原始时间和描述。调整视觉样式时不要增加未经证实的事件。

## 搜索引擎与基础文件

构建会生成 `sitemap.xml` 和 `robots.txt`，并添加站点图标、网页清单、canonical 和多语言 alternate 标签。当前地址默认为 `https://zhwe-blog.pages.dev`；将来自定义域名启用后，应将构建环境变量 `SITE_URL` 设置为正式网站的 HTTPS 源地址（不含路径），重新构建并核查 sitemap 与 canonical。

审核版页面仍带 `noindex,nofollow`。robots 允许抓取，是为了让搜索引擎能够读取该指令；建立 sitemap 不代表允许收录。正式收录策略应在网站所有者确认后调整。顶层及各语言的 404 页面由 Cloudflare Pages 在路径不存在时返回。

## 足迹与显示偏好

`/map/` 及对应多语言路径展示文章中的城市级近似地点；数据维护在 `migration/article-locations.json`。标记来自明确文章内容或站长确认的到访地点，不能把歌曲、新闻提到的地点当作访问经历。未能判断的文章保留在 `unlocatedArticleIds` 中，不自动猜测。足迹使用 MapLibre 和 OpenFreeMap 底图展示地名及行政区划，底图不可用时回退到 Natural Earth 世界底图，到访城市以行政区域高亮，文章和站长位置分别描点。边界数据及许可见 `licenses/map-data-attribution.md`。访问底图服务时浏览器会直接连接 OpenFreeMap，服务商可根据请求的地图区域推测大致位置；进入足迹页面时会请求访客位置权限；授权后仅在浏览器中计算与深圳市中心的近似直线距离，并在地图上标注访客位置和连线。平遥以房子图标标记家乡。

页脚提供浅色、深色、随系统三个选项，并保留旧版手动主题偏好。语言优先使用用户在页面中选择并保存在浏览器的语言；未选择时匹配浏览器支持的语言，无法匹配时使用中文。明确访问某个语言路径时保留该路径。
