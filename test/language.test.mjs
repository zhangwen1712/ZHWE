import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const source=readFileSync(new URL('../src/layouts/Base.astro',import.meta.url),'utf8');const script=[...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes("zhwe-language")&&x.includes('navigator.languages'));
function redirect(saved,languages,path='/about/'){let dest=null;vm.runInNewContext(script,{localStorage:{getItem:()=>saved},navigator:{languages},location:{pathname:path,search:'?q=1',hash:'#x',replace:x=>{dest=x}}});return dest}
test('browser language selects a supported translation',()=>assert.equal(redirect(null,['en-US','fr-FR']),'/fr/about/?q=1#x'));
test('explicit Chinese wins and unsupported languages fall back',()=>{assert.equal(redirect('zh',['fr-FR']),null);assert.equal(redirect(null,['en-US']),null)});
test('explicit language overrides browser language',()=>assert.equal(redirect('de',['fr-FR']),'/de/about/?q=1#x'));
test('browser language still works when storage is unavailable',()=>{let dest=null;vm.runInNewContext(script,{localStorage:{getItem(){throw Error('blocked')}},navigator:{languages:['es-ES']},location:{pathname:'/',search:'',hash:'',replace:x=>{dest=x}}});assert.equal(dest,'/es/')});
