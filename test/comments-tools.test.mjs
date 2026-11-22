import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,statSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,delimiter} from 'node:path';
import {spawnSync} from 'node:child_process';
const db='00000000-0000-4000-8000-000000000001';
const id='00000000-0000-4000-8000-000000000002';
test('backup uses a private file, excludes transient identifiers, and fails closed on invalid responses',t=>{
 const dir=mkdtempSync(join(tmpdir(),'zhwe-comment-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const cli=join(dir,'cf');
 const json=JSON.stringify([{success:true,results:[{id,post_id:3044,author:'Reader',body:'Hello',created_at:'2026-01-01T00:00:00.000Z',status:'pending',fingerprint:'must-not-export'}]}]);
 writeFileSync(cli,`#!/bin/sh\nprintf '%s' '${json}'\n`,{mode:0o700});
 const env={...process.env,COMMENTS_DATABASE_ID:db,PATH:`${dir}${delimiter}${process.env.PATH}`};
 const path=join(dir,'backup.json');
 const out=spawnSync(process.execPath,['scripts/comments-backup.mjs',path],{encoding:'utf8',env});
 assert.equal(out.status,0,out.stderr);const saved=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(saved.comments.length,1);assert.equal('fingerprint' in saved.comments[0],false);assert.equal(statSync(path).mode & 0o777,0o600);
 assert.notEqual(spawnSync(process.execPath,['scripts/comments-backup.mjs',path],{env}).status,0);
 writeFileSync(cli,"#!/bin/sh\nprintf '%s' '{\"unexpected\":true}'\n",{mode:0o700});
 const bad=join(dir,'bad.json');assert.notEqual(spawnSync(process.execPath,['scripts/comments-backup.mjs',bad],{env}).status,0);assert.equal(existsSync(bad),false);
});
test('moderation commands reject invalid identifiers before invoking cf',()=>{
 const env={...process.env,COMMENTS_DATABASE_ID:db};
 const out=spawnSync(process.execPath,['scripts/comments-admin.mjs','approve',"1'; DROP TABLE comments;--"],{encoding:'utf8',env});
 assert.equal(out.status,2);
});
