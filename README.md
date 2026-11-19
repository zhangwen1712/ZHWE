# ZHWE

ZHWE WordPress 迁移至 Astro 的进行中项目。当前是复刻初版，尚不能替代线上网站。

## 本地运行

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

Astro 需要 Node.js 22.23.4 或更高版本；项目中的开发依赖提供本地 Node 运行时。构建输出为 `dist/`。

## 当前内容

- 已发布文章、页面、分类及标签的公开数据在 `migration/`；不包含草稿。
- 保留文章和页面路径，生成首页、文章、页面、分类、标签和分页。
- `baseline/homepage.html` 是迁移前的公开首页快照，用于对照。
- `public/assets/bloglo.css` 来自原站的 Bloglo 主题，`dynamic-styles.css` 为现站主题配置生成的样式。

## 迁移未完成

图片与部分字体、嵌入内容仍从原站加载；主题样式、导航、滚动文章、页脚、评论、搜索、特殊区块、SEO、移动端与交互尚未完整复刻和逐页验收。预览暂设 `noindex`。部署到正式域名前必须完成媒体迁移、功能与内容校验，核对链接、SEO、重定向，并建立回滚方案。请勿把此版本视为生产版本。
