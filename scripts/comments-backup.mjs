#!/usr/bin/env node
// Export comments to a private JSON file outside the public repository.
import {spawnSync} from 'node:child_process';
import {closeSync, fsyncSync, openSync, realpathSync, unlinkSync, writeSync} from 'node:fs';
import {dirname, basename, isAbsolute, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const database=process.env.COMMENTS_DATABASE_ID || '';
const dest=process.argv[2] || '';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!uuid.test(database) || !isAbsolute(dest)) { console.error('Set COMMENTS_DATABASE_ID and supply an absolute backup file path outside the repository.'); process.exit(2); }
const root=realpathSync(fileURLToPath(new URL('..',import.meta.url)));
const parent=realpathSync(dirname(dest));
const path=join(parent,basename(dest));
const rel=relative(root,path);
if(rel==='' || (rel!=='..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) { console.error('Backup must be outside the repository.'); process.exit(2); }
const asOf=new Date().toISOString();
const sql='SELECT id, post_id, author, body, created_at, status FROM comments WHERE id > ?1 AND created_at <= ?2 ORDER BY id LIMIT 200';
let fd, cursor='', count=0;
try {
 fd=openSync(path,'wx',0o600);
 writeSync(fd,`{"as_of":${JSON.stringify(asOf)},"comments":[`);
 while(true) {
  const p=spawnSync('cf',['d1','query',database,'--sql',sql,'--params',cursor,'--params',asOf],{encoding:'utf8',maxBuffer:8*1024*1024});
  if(p.status!==0 || p.error) throw Error('Cloudflare D1 query failed');
  const value=JSON.parse(p.stdout);
  const envelope=Array.isArray(value)?value[0]:Array.isArray(value.result)?value.result[0]:value;
  if(!envelope || envelope.success===false || !Array.isArray(envelope.results)) throw Error('Unexpected D1 response; refusing an incomplete backup');
  const rows=envelope.results;
  for(const row of rows) {
   if(!uuid.test(row.id) || row.id<=cursor || !Number.isSafeInteger(row.post_id) || typeof row.author!=='string' || typeof row.body!=='string' || typeof row.created_at!=='string' || !['pending','approved','rejected'].includes(row.status)) throw Error('Invalid or unsorted backup row');
   const {id,post_id,author,body,created_at,status}=row;
   writeSync(fd,(count?',':'')+JSON.stringify({id,post_id,author,body,created_at,status}));count++;cursor=row.id;
  }
  if(rows.length<200)break;
 }
 writeSync(fd,']}\n');fsyncSync(fd);closeSync(fd);fd=undefined;
 console.log(`Saved ${count} comments to ${path}`);
} catch(error) {
 if(fd!==undefined){try{closeSync(fd);}catch{} try{unlinkSync(path);}catch{}}
 console.error(error.message);process.exit(1);
}
