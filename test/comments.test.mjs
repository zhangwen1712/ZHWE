import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleComments } from '../worker/comments.mjs';

function db() {
 const raw = new DatabaseSync(':memory:');
 raw.exec(readFileSync(new URL('../migrations/0001_comments.sql', import.meta.url), 'utf8'));
 return { raw, prepare(sql) { let args = []; return {
  bind(...a) { args = a; return this; },
  async all() { return { results: raw.prepare(sql).all(...args) }; },
  async first() { return raw.prepare(sql).get(...args); },
  async run() { const result = raw.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; }
 }; } };
}
const envFor = db => ({COMMENTS_DB:db,COMMENT_SALT:'test-only-secret',TURNSTILE_SECRET:'test-secret',TURNSTILE_HOSTNAMES:'example.test'});
const req = (data, origin='https://example.test') => new Request('https://example.test/api/comments', {method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(data)});
const payload = {post:3044,author:'A',body:'Hello',token:'valid'};
function stub(t, result={success:true,action:'comment',hostname:'example.test'}) {
 t.mock.method(globalThis, 'fetch', async () => Response.json(result));
}
test('new comments remain private until approved and public reads omit private fields',async t=>{
 stub(t);const store=db(), env=envFor(store);
 assert.equal((await handleComments(req(payload),env)).status,202);
 let res=await handleComments(new Request('https://example.test/api/comments?post=3044'),env);
 assert.deepEqual((await res.json()).comments,[]);
 store.raw.exec("UPDATE comments SET status='approved'");
 res=await handleComments(new Request('https://example.test/api/comments?post=3044'),env);
 const comment=(await res.json()).comments[0];
 assert.equal(comment.body,'Hello');assert.equal('fingerprint' in comment,false);assert.equal(res.headers.get('cache-control'),'no-store');
});
test('rejects invalid origins, posts, unconfigured verification and spam fields',async t=>{
 stub(t);const env=envFor(db());
 assert.equal((await handleComments(req(payload,'https://evil.test'),env)).status,403);
 assert.equal((await handleComments(req({...payload,post:1}),env)).status,400);
 assert.equal((await handleComments(req({...payload,website:'spam'}),env)).status,400);
 assert.equal((await handleComments(req(payload),{...env,TURNSTILE_SECRET:''})).status,503);
});
test('requires valid Turnstile token, matching action and matching allowed hostname',async t=>{
 const env=envFor(db());let response={success:true,action:'comment',hostname:'example.test'};
 t.mock.method(globalThis,'fetch',async()=>Response.json(response));
 for(const invalid of [{success:false},{success:true,action:'other',hostname:'example.test'},{success:true,action:'comment',hostname:'evil.test'}]) {
  response=invalid;assert.equal((await handleComments(req(payload),env)).status,403);
 }
 response={success:true,action:'comment',hostname:'example.test'};
 assert.equal((await handleComments(req({...payload,token:''}),env)).status,403);
 assert.equal((await handleComments(req(payload),{...env,TURNSTILE_HOSTNAMES:'other.test'})).status,403);
 assert.equal(env.COMMENTS_DB.raw.prepare('SELECT COUNT(*) n FROM comments').get().n,0);
});
test('atomic insert limits repeated submissions',async t=>{
 stub(t);const env=envFor(db());
 for(let i=0;i<5;i++)assert.equal((await handleComments(req(payload),env)).status,202);
 assert.equal((await handleComments(req(payload),env)).status,429);
 assert.equal(env.COMMENTS_DB.raw.prepare('SELECT COUNT(*) n FROM comments').get().n,5);
});
test('purges expired fingerprints without deleting approved comments',async t=>{
 stub(t);const store=db(),env=envFor(store);
 store.raw.prepare("INSERT INTO comments VALUES ('old',3044,'A','B','2020-01-01T00:00:00.000Z','approved','old-fingerprint')").run();
 assert.equal((await handleComments(req(payload),env)).status,202);
 const row=store.raw.prepare("SELECT body,fingerprint FROM comments WHERE id='old'").get();
 assert.equal(row.fingerprint,'');assert.equal(row.body,'B');
});
test('Pages Function fails closed when the database binding is absent',async()=>{
 const {onRequest}=await import('../functions/api/comments.js');
 const res=await onRequest({request:new Request('https://example.test/api/comments?post=3044'),env:{}});
 assert.equal(res.status,503);assert.equal(res.headers.get('cache-control'),'no-store');
});
