import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localPath} from '../src/i18n.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const posts=read('../migration/published-posts.json'),pages=read('../migration/published-pages.json'),milestones=read('../migration/milestones.json');
for(const lang of ['en','fr','es','it','de'])test(`${lang} preserves all published content and milestones`,()=>{
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
 assert.equal(localPath('/about/',lang),lang==='en'?'/about/':`/${lang}/about/`);
});

test('English pages either use the complete original or a complete translation',()=>{
 const data=read('../translations/en-content.json');
 for(const incomplete of data['published-posts'].filter(x=>!x.translationComplete)){
  const original=posts.find(x=>x.id===incomplete.id);
  for(const field of ['title','excerpt','content'])assert.equal(incomplete[field].rendered,original[field].rendered,field);
 }
 const complete=data['published-posts'].filter(x=>x.translationComplete);
 assert.ok(complete.length>0,'expected at least one fully translated post');
 assert.ok(complete.some(x=>x.title.rendered!==posts.find(p=>p.id===x.id).title.rendered || x.content.rendered!==posts.find(p=>p.id===x.id).content.rendered));
});
