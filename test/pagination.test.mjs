import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import posts from '../migration/published-posts.json' with {type:'json'};
import {POSTS_PER_PAGE} from '../src/lib/pagination.js';

test('home and subsequent pages show each published post exactly once',async()=>{
 assert.equal(POSTS_PER_PAGE,12);
 for(const prefix of ['', 'zh/', 'zh-Hant/', 'fr/', 'es/', 'it/', 'de/']){
  let seen=[];
  for(let page=1;page<=Math.ceil(posts.length/POSTS_PER_PAGE);page++){
   const file=new URL(`../dist/${prefix}${page===1?'':`page/${page}/`}index.html`,import.meta.url);
   const html=await readFile(file,'utf8');
   const cards=[...html.matchAll(/<a[^>]*class="card-link"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*class="card-link"/g)].map(m=>decodeURIComponent(m[1]||m[2]));
   assert.equal(cards.length,Math.min(POSTS_PER_PAGE,posts.length-seen.length),`${prefix} page ${page}`);
   seen.push(...cards);
  }
  assert.equal(new Set(seen).size,posts.length,`${prefix} duplicate or missing posts`);
 }
});
