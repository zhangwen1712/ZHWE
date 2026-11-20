import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'?route.continue():route.abort()});
});

test('mobile homepage, pagination, theme and language preferences',async({page})=>{
 await page.goto('/zh/');
 await expect(page.locator('.posts-grid .post-card')).toHaveCount(12);
 await expect(page.locator('.featured-grid .feature-item')).toHaveCount(3);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('input[name="theme"][value="dark"]').check();
 await expect(page.locator('html')).toHaveClass(/dark-mode/);
 await page.reload();await expect(page.locator('html')).toHaveClass(/dark-mode/);
 await page.locator('.language-select select').selectOption('/fr/');
 await expect(page).toHaveURL(/\/fr\/$/);
 await page.goto('/');await expect(page).toHaveURL(/\/fr\/$/);
});

test('mobile search, links, timeline and 404',async({page})=>{
 await page.goto('/zh/search/?q=%E7%AB%AF%E5%8D%88%E5%81%87%E6%9C%9F');
 await expect(page.locator('.search-results h2 a').first()).toHaveText('端午假期');
 await page.goto('/zh/links/');await expect(page.locator('main a[href="https://www.ocnamibia.org/"]')).toBeVisible();
 await page.goto('/zh/建站日志/');await expect(page.locator('.milestone')).not.toHaveCount(0);
 const missing=await page.goto('/this-does-not-exist/');expect(missing.status()).toBe(404);
 const missingAsset=await page.request.get('/no-such-asset.png');expect(missingAsset.status()).toBe(404);
});

test('map works when location is denied',async({page,context})=>{
 await context.clearPermissions();await page.goto('/zh/map/');
 await expect(page.locator('.map-distance')).toContainText('无法获取位置',{timeout:15000});
 await expect(page.locator('.map-destinations button')).not.toHaveCount(0);
});

test('map sorts and labels distances after simulated location permission',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:22.64,longitude:114.04});
 await page.goto('/zh/map/');
 await expect(page.locator('.map-distance')).toContainText('公里',{timeout:15000});
 const chips=page.locator('.map-destinations button');
 await expect(chips.first()).toContainText('深圳');
 await expect(chips.first().locator('.map-destination-distance')).toContainText('公里');
 await expect(chips.last().locator('.map-destination-distance')).toContainText('公里');
});

test('incomplete translations use whole-page original when fallback is implemented',async({page})=>{
 const data=JSON.parse(readFileSync('translations/en-content.json','utf8'));
 const post=data['published-posts'].find(p=>p.link.includes('/2025/06/01/'));
 test.skip(typeof post.translationComplete !== 'boolean','Whole-page fallback is not yet in main; enable when PR #8 is merged.');
 test.skip(post.translationComplete,'The sample post is now fully translated.');
 await page.goto('/2025/06/01/端午假期/');
 await expect(page.locator('.single-post h1')).toHaveText('端午假期');
 await expect(page.locator('.entry-content h2').first()).toHaveText('周五');
 await expect(page.locator('.single-post')).toContainText('This page is shown in Chinese');
});
