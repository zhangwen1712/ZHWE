import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localPath} from '../src/i18n.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const posts=read('../migration/published-posts.json'),pages=read('../migration/published-pages.json'),milestones=read('../migration/milestones.json');
for(const lang of ['fr','es','it','de'])test(`${lang} preserves all published content and milestones`,()=>{
 const data=read(`../translations/${lang}-content.json`);
 for(const [key,base] of [['published-posts',posts],['published-pages',pages]]){
  assert.deepEqual(data[key].map(x=>x.id),base.map(x=>x.id));
  for(let i=0;i<base.length;i++){
   assert.equal(data[key][i].link,base[i].link);
   const urls=x=>[...x.matchAll(/(?:src|href|poster)=["']([^"']+)["']/g)].map(m=>m[1]);
   assert.deepEqual(urls(data[key][i].content.rendered),urls(base[i].content.rendered));
  }
 }
 assert.equal(data.milestones.items.length,milestones.items.length);
 assert.deepEqual(data.milestones.items.map(x=>x.date),milestones.items.map(x=>x.date));
 assert.equal(localPath('/about/',lang),`/${lang}/about/`);
});
