import {execFileSync, spawnSync} from 'node:child_process';
const paths=execFileSync('git',['ls-files','-z','--','*.js','*.mjs','*.cjs'],{encoding:'utf8'}).split('\0').filter(Boolean);
let failures=0;
for(const path of paths){
 const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
 if(check.status!==0){failures++;process.stderr.write(`${path}:\n${check.stderr}`)}
}
if(failures){console.error(`${failures} JavaScript syntax check(s) failed`);process.exit(1)}
console.log(`Checked syntax of ${paths.length} tracked JavaScript files.`);
