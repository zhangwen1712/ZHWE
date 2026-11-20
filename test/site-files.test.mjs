import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const read = file => readFile(new URL(`../dist/${file}`,import.meta.url),'utf8');
test('sitemap excludes error pages and migration preview blocks all crawlers',async()=>{
 const sitemap=await read('sitemap.xml'),robots=await read('robots.txt');
 const origin=new URL(process.env.SITE_URL || 'https://zhwe-blog.pages.dev').origin;
 assert.match(sitemap,/<urlset/);assert.ok(sitemap.includes(`<loc>${origin}/</loc>`));
 for(const lang of ['zh','zh-Hant','fr','es','it','de'])assert.ok(sitemap.includes(`<loc>${origin}/${lang}/</loc>`));
 assert.ok(!sitemap.includes('/404/'));assert.equal(robots, 'User-agent: *\nDisallow: /\n');
 assert.ok((sitemap.match(/<loc>/g)||[]).length>=1000);
});
test('root and localized not-found pages and icons are present',async()=>{
 for(const file of ['404.html','zh/404.html','zh-Hant/404.html','fr/404.html','es/404.html','it/404.html','de/404.html','favicon.ico','favicon-32x32.png','apple-touch-icon.png','icon-192.png','icon-512.png','site.webmanifest'])assert.ok((await stat(new URL(`../dist/${file}`,import.meta.url))).size>0,file);
 const homepage=await read('index.html');assert.ok(homepage.includes('noindex,nofollow'));assert.ok(homepage.includes('rel="canonical"'));assert.ok(homepage.includes('rel="manifest"'));
});
test('map routes and the homepage card layout are generated',async()=>{
 for(const file of ['map/index.html','zh/map/index.html','zh-Hant/map/index.html','fr/map/index.html','es/map/index.html','it/map/index.html','de/map/index.html'])assert.ok((await stat(new URL(`../dist/${file}`,import.meta.url))).size>0,file);
 const homepage=await read('index.html');assert.ok(!homepage.includes('/wp-content/uploads/2024/09/2024-08-28-20-06-32.webp'));assert.ok(homepage.includes('post-card-no-image'));assert.ok(!homepage.includes('card-placeholder'));
});
