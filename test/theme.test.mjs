import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/layouts/Base.astro',import.meta.url),'utf8');
const scripts=[...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function setup(saved,legacy,dark){
 const data={'zhwe-theme':saved,'zhwe-dark':legacy};let onMedia;const classes=new Set();
 const media={matches:dark,addEventListener:(_,fn)=>onMedia=fn};const root={classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key),contains:key=>classes.has(key)}};
 const inputs=['light','dark','system'].map(value=>({value,checked:false,addEventListener:(_,fn)=>{inputs.find(x=>x.value===value).handler=fn}}));
 const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v},removeItem:k=>{delete data[k]}};
 const context=vm.createContext({document:{documentElement:root,querySelectorAll:()=>inputs,querySelector:()=>null},window:{matchMedia:()=>media},matchMedia:()=>media,localStorage:storage,navigator:{languages:['zh']},location:{pathname:'/',search:'',hash:'',replace(){}}});
 for(const script of scripts)vm.runInContext(script,context);
 return {isDark:()=>classes.has('dark-mode'),changeSystem:val=>{media.matches=val;onMedia({matches:val})},select:val=>{let input=inputs.find(x=>x.value===val);input.checked=true;input.handler()},saved:()=>data['zhwe-theme'],inputs};
}
test('follows system by default and on change',()=>{let app=setup(null,null,true);assert.equal(app.isDark(),true);app.changeSystem(false);assert.equal(app.isDark(),false);assert.ok(app.inputs.find(x=>x.value==='system').checked)});
test('explicit setting overrides system and migrates legacy preference',()=>{let app=setup(null,'0',true);assert.equal(app.isDark(),false);app.changeSystem(true);assert.equal(app.isDark(),false)});
test('user can return to system mode',()=>{let app=setup('dark',null,false);app.select('system');assert.equal(app.saved(),'system');assert.equal(app.isDark(),false);app.changeSystem(true);assert.equal(app.isDark(),true)});
