# ZHWE

将个人博客从 WordPress 迁移到 Astro、GitHub 与 Cloudflare 的进行中项目。原站尚未切换。

## 本地运行

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
ASTRO_TELEMETRY_DISABLED=1 npm run build
./node_modules/node/bin/node --test test/*.test.mjs
```

项目需要 Node.js 22.23.4 或更高版本，开发依赖包含本地 Node 运行时。构建输出在 `dist/`。构建后运行 `npm run preview`，可在 `/search/` 及各语言的搜索页验证 Pagefind 全文搜索；有文章封面时搜索结果展示原封面，无封面时不显示占位图。

## 内容与媒体

`migration/` 包含已公开的文章、页面、分类、标签、历史评论及媒体清单。WordPress 草稿不放入此公开仓库。原路径保留；`public/wp-content/uploads/` 包含媒体库原文件和正文使用的文件。为减少重复，不保留全部自动生成的缩略图。`migration/assets-manifest.json` 列出已下载文件。

文章中保留的 WordPress 图片放大按钮使用本站的图片查看器，支持键盘关闭；浏览器未启用 JavaScript 时图片仍可正常阅读，放大按钮不显示。

文章正文中有 14 个旧阿里云 OSS 图片链接无法下载；这些链接暂时保留，待从备份恢复后替换。两个大于 25 MiB 的视频需要在 Cloudflare 上使用 R2 等存储，不能直接作为 Workers 静态资源部署。

## 评论

22 条历史公开评论继续静态展示；不导入 D1，避免重复。新评论由 Pages Function `functions/api/comments.js` 调用 `worker/comments.mjs`，表结构见 `migrations/0001_comments.sql`。访客以昵称和纯文本提交，新评论进入 `pending`；只有 `approved` 的评论能通过公开接口读取。同一文章不同语言使用同一个文章 ID。前端和服务端使用 Turnstile，服务端检查验证结果的 action 和主机名；提交频率按 IP 的 HMAC 指纹限制，每小时最多 5 条。没有配置时提交按钮保持禁用。

**新评论服务尚未部署或验证真实 Cloudflare 资源。** 启用前需在隔离环境准备 D1 数据库并应用表结构，将其绑定为 `COMMENTS_DB`；在 Pages 中安全配置 `COMMENT_SALT` 和 `TURNSTILE_SECRET`、配置 `TURNSTILE_HOSTNAMES`（逗号分隔的精确主机名），并在构建环境设置公开的 `PUBLIC_TURNSTILE_SITEKEY`。同一 widget 和主机名白名单需要覆盖相应的测试地址；将来配置正式域名后再单独加入。密钥不得提交到仓库。启用前还应核对隐私政策、允许的来源、访问频率和真实 Turnstile 验证。

审核通过经过认证的 `cf` CLI 访问自己的 D1，不提供公开管理接口。将 `COMMENTS_DATABASE_ID` 设置为数据库 UUID 后，可运行：

```sh
node scripts/comments-admin.mjs list
node scripts/comments-admin.mjs approve <评论ID>
node scripts/comments-admin.mjs reject <评论ID>
node scripts/comments-admin.mjs delete <评论ID>
node scripts/comments-admin.mjs clear-rate-data
node scripts/comments-backup.mjs /仓库外的私密目录/评论备份.json
```

`approve` 和 `reject` 只处理待审核评论；`delete` 删除指定评论。每次仅按站长明确指示执行审核或删除。系统不主动发送通知，站长可让 Codex 查询。限流指纹不保存原始 IP；新评论成功提交时会清理超过 24 小时的指纹，也可使用 `clear-rate-data` 清理静默期间残留的数据；要保证最长期限需配置定时维护，目前尚未配置。

备份命令只写仓库外尚不存在的文件，权限为 `0600`，包含待审核和已拒绝内容但不包含限流指纹；输出或传输时仍需保护隐私。导出期间并发的审核或删除可能使内容不是同一时刻的快照；部署后应验证恢复流程并设置定期备份，当前尚未设置定时任务。删除数据库中的评论不会自动删除已有备份中的副本。

当前网站仍为开发预览：外部失效图片、复杂区块、原有页面交互、SEO、移动端及历史内容需要继续核对；预览页面保留 `noindex`。正式域名切换前需完成内容对账、功能测试与回滚方案。

## Cloudflare Pages 审核版

使用 `npm run build:pages` 构建，输出目录为 `dist`。由于 Pages 单文件上限为 25 MiB，审核版的两个大视频暂时从原网站加载；GitHub 中保留原文件。评论服务尚未连接，部署静态页面不会启用新评论。审核版保留 noindex，正式切换前需迁移大视频并完成评论、资源和 SEO 校验。

## 多语言

英文使用不带语言前缀的根路径，简体中文使用 `/zh/`，繁体中文使用 `/zh-Hant/`，法语、西班牙语、意大利语和德语分别使用 `/fr/`、`/es/`、`/it/`、`/de/` 路径。各页面按语言独立检查翻译完整性：标题、摘要、正文、公开评论及建站日志内容全部存在对应译文且译文没有残留中日文字时才显示译文，否则整篇使用简体中文原文并在页面提示。

截至 2026-11-21，英文及法、西、意、德语各有 764/764 个来源词条存在字典映射，91/91 个公开页面通过完整性判定；这是当时的检查结果，内容变更后应重新统计。译文主要来自 Cloudflare Workers AI，其中 2026-11-21 增补使用 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`，并对部分译文进行了人工修正。覆盖率不代表翻译准确，仍需结合原文核对，尤其是人名、地名、数字和日期。

维护公开内容时：

1. 更新 `migration/` 中的原文后，维护 `translations/{en,fr,es,it,de}.json` 中的对应译文，保持原意及链接、媒体结构。`python3 scripts/translate-site.py` 可借助已登录的 `cf` CLI 补译缺失词条，依赖 `requirements-translation.txt` 中的 Python 包。
2. 该脚本只补不存在的词条，不会修正已有但仍包含中日文的译文，也不会提取 `migration/milestones.json`；这些内容需要另行核对并补齐。机器译文需要审阅并记录来源。
3. 运行 `python3 scripts/generate-locales.py` 生成五种外语页面数据；原文变更时按需运行 `python3 scripts/generate-traditional.py` 生成繁体数据。
4. 使用 `python3 scripts/check-translation-coverage.py --base <基准提交>` 与 `python3 scripts/report-page-translations.py` 检查覆盖率和页面回退状态，再构建并检查链接和媒体。检查通过不等于完成语义校对。

建站日志的时间节点从原页面提取到 `migration/milestones.json`，保留原始时间和描述。调整视觉样式时不要增加未经证实的事件。友情链接的卡片基于原始内容结构呈现，保留原文和链接；日志滚动动画遵循系统减少动态效果设置。

## 搜索引擎与基础文件

构建会生成 `sitemap.xml` 和 `robots.txt`，并添加站点图标、网页清单、canonical 和多语言 alternate 标签。当前地址默认为 `https://zhwe-blog.pages.dev`；将来自定义域名启用后，应将构建环境变量 `SITE_URL` 设置为正式网站的 HTTPS 源地址（不含路径），重新构建并核查 sitemap 与 canonical。

审核版页面仍带 `noindex,nofollow`。审核版 robots.txt 禁止爬虫抓取；建立 sitemap 不代表允许收录。正式收录策略应在网站所有者确认后调整。顶层及各语言的 404 页面由 Cloudflare Pages 在路径不存在时返回。

## 足迹与显示偏好

`/map/` 及对应多语言路径展示文章中的城市级近似地点；数据维护在 `migration/article-locations.json`。标记来自明确文章内容或站长确认的到访地点，不能把歌曲、新闻提到的地点当作访问经历。未能判断的文章保留在 `unlocatedArticleIds` 中，不自动猜测。足迹使用 MapLibre 和 OpenFreeMap 底图展示地名及行政区划，底图不可用时回退到 Natural Earth 世界底图，到访城市以行政区域高亮，文章和站长位置分别描点。边界数据及许可见 `licenses/map-data-attribution.md`。访问底图服务时浏览器会直接连接 OpenFreeMap，服务商可根据请求的地图区域推测大致位置；进入足迹页面时会请求访客位置权限；授权后仅在浏览器中计算与深圳龙华油松片区近似位置的直线距离，并在地图上标注访客位置和连线；到访地点按与访客的近似直线距离排序。平遥以房子图标标记家乡。

页脚提供浅色、深色、随系统三个选项，并保留旧版手动主题偏好。语言优先使用用户在页面中选择并保存在浏览器的语言；未选择时匹配浏览器支持的语言，无法匹配时使用英文。明确访问某个语言路径时保留该路径。

## 开发协作

后续功能迭代从独立分支创建 PR，未经站长明确指示不得合并或直接推送 main。仓库每小时检查 Issue 的本地自动化仅处理 `zhangwen1712` 发布的 Issue。

`translations/zh-Hant-content.json` 是以 OpenCC 生成的繁体内容，已接入繁体页面。重新生成需安装 `opencc-python-reimplemented` 并运行 `python3 scripts/generate-traditional.py`；内容变更后应重新核对各语言的覆盖率与页面完整性。

## 自动检查

`Blog quality checks` 在 PR、`main` 分支推送及手动运行时执行：

- 代码语法、补丁空白、Pages 构建与自动测试。
- 公开文章、页面、历史评论和媒体 ID 与基准分支比较；文章原始 URL 和已有媒体引用被移除时失败。
- 所有语言的站内链接、媒体、canonical、hreflang、sitemap、审核站 noindex 和 robots；已知 14 个历史失效路径记录在 `ci/known-missing-internal.json`，新增失效路径会失败。修复历史路径后从基线移除。
- 译文字典覆盖率、生成文件一致性和页面完整度摘要。已有未完成译文仅报告，新增缺失或删除已有译文会失败；整页回退功能尚未进入主分支时会明确报告未启用，进入主分支后检查实际回退结果。字典映射不代表翻译质量。
- Playwright 以手机视口检查分页、语言与主题、搜索、友链、日志、404、定位拒绝和模拟授权后的距离排序。定位只用测试坐标。
- `npm audit` 检查高危依赖，PR 额外使用 GitHub Dependency Review 检查新增依赖。

`Advisory site reports` 每周及手动触发时运行，生成外链和媒体、手机端 axe 无障碍及 Lighthouse 报告；第三方限流、网络波动和实验室分数不会阻止 PR。报告在 Actions 摘要和短期保存的 artifact 中查看，自动扫描不能取代人工审核。

本地执行：`npm ci`、`python3 -m pip install -r requirements-translation.txt`、`npm run check:syntax`、`python3 scripts/check-translation-coverage.py --base HEAD`、`python3 scripts/report-page-translations.py`、`python3 scripts/generate-locales.py`、`python3 scripts/generate-traditional.py`、`ASTRO_TELEMETRY_DISABLED=1 npm run build:pages`、`python3 scripts/check-site-integrity.py`、`BASE_SHA=HEAD python3 scripts/check-content-integrity.py`、`npm test`、`python3 -m unittest discover -s test -p '*_test.py'`、`npx playwright install chromium`、`npm run test:browser` 和 `npm audit --audit-level=high`。CI 不自动合并；连接 Cloudflare Pages 的 PR 可能自动生成预览部署，是否阻止合并由仓库分支保护规则决定。正式发布仍以站长审核和合并为前提。
