import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
const scripts = [...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(x => x[1]);
function setup(saved, dark) {
 let value=saved, onChange, onClick; const set=new Set(), attrs={};
 const media={matches:dark,addEventListener:(type,fn)=>{onChange=fn}};
 const button={setAttribute:(k,v)=>attrs[k]=v,addEventListener:(type,fn)=>{onClick=fn}};
 const root={classList:{toggle:(k,on)=>on?set.add(k):set.delete(k),contains:k=>set.has(k)}};
 const storage={getItem:()=>value,setItem:(key,v)=>{value=v}};
 const context=vm.createContext({document:{documentElement:root,querySelector:()=>button},window:{matchMedia:()=>media},matchMedia:()=>media,localStorage:storage});
 for(const script of scripts)vm.runInContext(script,context);
 return {isDark:()=>set.has('dark-mode'),change:value=>onChange({matches:value}),click:()=>onClick(),saved:()=>value,attrs};
}
test('follows system and subsequent system changes without a preference',()=>{let app=setup(null,true);assert.equal(app.isDark(),true);app.change(false);assert.equal(app.isDark(),false)});
test('saved choice wins over system changes',()=>{let app=setup('0',true);assert.equal(app.isDark(),false);app.change(true);assert.equal(app.isDark(),false)});
test('manual choice is saved and remains authoritative',()=>{let app=setup(null,false);app.click();assert.equal(app.isDark(),true);assert.equal(app.saved(),'1');app.change(false);assert.equal(app.isDark(),true);assert.equal(app.attrs['aria-pressed'],'true')});
