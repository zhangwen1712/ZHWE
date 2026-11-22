import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FRIEND_LINK_IMAGE_MAP,localizeFriendLinkImages} from '../src/lib/friend-link-images.js';

const read = file => JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const sourcePages=read('../migration/published-pages.json');
const source=sourcePages.find(page=>page.id===345);
const images=html=>[...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
const links=html=>[...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);

test('friend links render images from our own static directory, preserving outbound links',()=>{
 assert.ok(source,'WordPress friendship-links page id 345 exists');
 const sourceHtml=source.content.rendered;
 const external=images(sourceHtml).filter(src=>!src.startsWith('https://zhwe.top/')&&!src.startsWith('/'));
 assert.equal(external.length,8,'all eight legacy hotlinked images are accounted for');
 assert.deepEqual(new Set(external),new Set(Object.keys(FRIEND_LINK_IMAGE_MAP)));
 for(const [language,html] of [['zh',sourceHtml],...['en','fr','es','it','de','zh-Hant'].map(lang=>{
   const data=read(`../translations/${lang}-content.json`);
   const page=data['published-pages'].find(page=>page.id===345);
   assert.ok(page,`friend-links page exists in ${lang}`);
   return [lang,page.content.rendered];
 })]){
  const rewritten=localizeFriendLinkImages(html);
  assert.equal(images(rewritten).length,images(html).length,`${language} image count must remain the same`);
  assert.ok(images(rewritten).every(src=>src.startsWith('/images/friend-links/')||src.startsWith('/wp-content/uploads/')||src.startsWith('https://zhwe.top/')),`${language} still has an external image`);
  assert.deepEqual(links(rewritten),links(html),`${language} must preserve outbound hyperlink URLs`);
 }
});
