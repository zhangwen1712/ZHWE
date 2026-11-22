import { copyFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
const buildDir = 'dist';
const configured = new URL(process.env.SITE_URL || 'https://zhwe.top');
if (!['http:', 'https:'].includes(configured.protocol) || configured.pathname !== '/' || configured.search || configured.hash) throw new Error('SITE_URL must be an http(s) origin without a path');
const origin = configured.origin;
const urls = [];
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name === 'index.html') {
      const parts = relative(buildDir, dir).split(sep).filter(Boolean);
      if (parts.includes('404') || parts[0] === 'wp-content' || parts[0] === 'assets') continue;
      const route = '/' + parts.map(encodeURIComponent).join('/') + (parts.length ? '/' : '');
      urls.push(`${origin}${route}`);
    }
  }
}
for (const lang of ['zh', 'zh-Hant', 'fr', 'es', 'it', 'de']) await copyFile(join(buildDir, lang, '404', 'index.html'), join(buildDir, lang, '404.html'));
await scan(buildDir);
urls.sort();
const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
await writeFile(join(buildDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
// Allow crawlers now that the owner has opened the site to search engines.
await writeFile(join(buildDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Generated sitemap with ${urls.length} URLs for ${origin}`);
