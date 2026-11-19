import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const read = file => readFile(new URL(`../dist/${file}`,import.meta.url),'utf8');
test('sitemap and robots use the same review origin and exclude error pages',async()=>{
 const sitemap=await read('sitemap.xml'),robots=await read('robots.txt');
 const origin=new URL(process.env.SITE_URL || 'https://zhwe-blog.pages.dev').origin;
 assert.match(sitemap,/<urlset/);assert.ok(sitemap.includes(`<loc>${origin}/</loc>`));
 for(const lang of ['fr','es','it','de'])assert.ok(sitemap.includes(`<loc>${origin}/${lang}/</loc>`));
 assert.ok(!sitemap.includes('/404/'));assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
 assert.ok((sitemap.match(/<loc>/g)||[]).length>=1000);
});
test('root and localized not-found pages and icons are present',async()=>{
 for(const file of ['404.html','fr/404.html','es/404.html','it/404.html','de/404.html','favicon.ico','favicon-32x32.png','apple-touch-icon.png','icon-192.png','icon-512.png','site.webmanifest'])assert.ok((await stat(new URL(`../dist/${file}`,import.meta.url))).size>0,file);
 const homepage=await read('index.html');assert.ok(homepage.includes('noindex,nofollow'));assert.ok(homepage.includes('rel="canonical"'));assert.ok(homepage.includes('rel="manifest"'));
});
