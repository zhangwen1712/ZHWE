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

test('article image controls open an accessible viewer on mobile and desktop',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  await page.setViewportSize(viewport);
  await page.goto('/zh/2025/04/19/养鱼日记/');
  const figure=page.locator('.entry-content .wp-lightbox-container').first();
  const image=figure.locator('img').first();
  const trigger=figure.getByRole('button',{name:'放大图片'});
  await expect(trigger).toBeVisible();
  const bounds=await trigger.boundingBox(),imageBounds=await image.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(imageBounds.x);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(imageBounds.x+imageBounds.width+1);
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'放大图片'});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveAttribute('src',/2024-12-07/);
  await expect(dialog.getByRole('button',{name:'关闭图片'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
});

test('article image controls do not show broken buttons without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},baseURL:'http://127.0.0.1:4177'});
 const page=await context.newPage();
 await page.goto('/zh/2025/04/19/养鱼日记/');
 await expect(page.locator('.entry-content .wp-lightbox-container img').first()).toBeVisible();
 await expect(page.locator('.entry-content .lightbox-trigger').first()).toBeHidden();
 await context.close();
});

test('comment form submits a verified token and renders public comments as text',async({page})=>{
 let submitted;
 await page.route('**/zh/2025/06/01/**',async route=>{
  const response=await route.fetch();
  const html=(await response.text()).replace('data-sitekey>', 'data-sitekey="local-test-key">');
  await route.fulfill({response,body:html});
 });
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render:(el,options)=>{setTimeout(()=>options.callback('test-token'),0);return 'widget-1'},reset:()=>{window.testTurnstileReset=true}};`}));
 await page.route('**/api/comments**',async route=>{
  if(route.request().method()==='POST'){
   submitted=route.request().postDataJSON();
   return route.fulfill({status:202,contentType:'application/json',body:'{"status":"pending"}'});
  }
  return route.fulfill({contentType:'application/json',body:JSON.stringify({comments:[{author:'Visitor',body:'<img src=x onerror=alert(1)>'}]})});
 });
 await page.goto('/zh/2025/06/01/端午假期/');
 const comments=page.locator('.comment-form-section');
 await expect(comments.locator('.live-comments p')).toHaveText('<img src=x onerror=alert(1)>');
 await expect(comments.locator('.live-comments img')).toHaveCount(0);
 await comments.locator('input[name="author"]').fill('访客');
 await comments.locator('textarea[name="body"]').fill('测试评论');
 const submit=comments.locator('button[type="submit"]');
 await expect(submit).toBeEnabled();await submit.click();
 await expect(comments.locator('.comment-status')).toHaveText('评论已提交，审核后显示。');
 expect(submitted).toEqual({post:3044,author:'访客',body:'测试评论',website:'',token:'test-token'});
 expect(await page.evaluate(()=>window.testTurnstileReset)).toBe(true);
 await expect(submit).toBeDisabled();
});
