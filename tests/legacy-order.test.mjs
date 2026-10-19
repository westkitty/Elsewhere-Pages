import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const legacy=html.split('<script type="text/plain" data-elsewhere-app>').find(s=>s.includes('function packIndex(key,ordinal)'));
assert.ok(legacy,'legacy engine present');
const hashStart=legacy.indexOf('function fnv1a(text)');
const hashEnd=legacy.indexOf('function permutedIndex',hashStart);
const packStart=legacy.indexOf('function packIndex(key,ordinal)');
const packEnd=legacy.indexOf('function greysonText(',packStart);
const functions=legacy.slice(hashStart,hashEnd)+'\n'+legacy.slice(packStart,packEnd);
function indexes(pack,salt){
 const context={PACKS:{[pack]:{prompts:Array(36).fill('?')}},state:{salt}};
 context.globalThis=context;
 vm.runInNewContext(functions+'\nglobalThis.indices=Array.from({length:36},(_,i)=>packIndex('+JSON.stringify(pack)+',i));',context);
 return Array.from(context.indices);
}
test('every pack index is an in-range permutation of 36 prompts',()=>{
 for(const name of ['greysonNow','greysonWeird','greysonShared','greysonDexter','superpowers','villain','city','character','friendship','weirdtoday','megan','sacred']){
   const result=indexes(name,'elsewhere-legacy-regression');
   assert.equal(result.length,36,name);
   assert.ok(result.every(i=>Number.isInteger(i)&&i>=0&&i<36),name+': invalid index');
   assert.equal(new Set(result).size,36,name+': repeats');
 }
});
test('legacy first bank index sequence remains identical where original was valid',()=>{
 assert.deepEqual(indexes('greysonNow','elsewhere-legacy-regression').slice(0,12),[5,10,3,8,1,6,11,4,9,2,7,0]);
 assert.deepEqual(indexes('villain','elsewhere-legacy-regression').slice(0,12),[1,0,11,10,9,8,7,6,5,4,3,2]);
 assert.deepEqual(indexes('superpowers','elsewhere-legacy-regression').slice(0,12),[3,2,1,0,11,10,9,8,7,6,5,4]);
});
test('new pack material occupies only additional bank indices',()=>{
 for(const name of ['greysonNow','greysonDexter','megan','sacred']){
   const result=indexes(name,'another-salt');
   assert.ok(result.slice(0,12).every(i=>i<12),name);
   assert.ok(result.slice(12).every(i=>i>=12),name);
 }
});
test('original generated prompt assignments still use first 1024 indexes',()=>{
 assert.match(legacy,/const PROMPT_MASK = 1023/);
 assert.match(legacy,/const bank=Math\.floor\(ordinal\/1024\),local=ordinal%1024/);
 assert.match(legacy,/const count=index<1024\?10:POP_LENSES\.length/);
});
