import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const inline=[...html.matchAll(/<script type="text\\/plain" data-elsewhere-app>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]);
function getCatalog(){
  const context={matchMedia:()=>({matches:false})};
  context.globalThis=context;
  for(const name of ['elsewhere-triple-paths','elsewhere-triple-packs','elsewhere-triple-creative','elsewhere-triple-deeper']){
    const script=fs.readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8');
    vm.runInNewContext(script,context,{filename:name+'.js'});
  }
  const raw=inline.find(s=>s.includes('const CATEGORY_CONFIG =')&&s.includes('const PACKS='));
  assert.ok(raw,'original engine found');
  const prefix=raw.slice(0,raw.indexOf('  const VALID={'));
  return vm.runInNewContext(prefix+`
  globalThis.__inventory={
    categories:Object.fromEntries(Object.entries(CATEGORY_CONFIG).map(([k,c])=>[k,[c.subjects.length,c.angles.length,c.ends.length,c.openers.length]])),
    packs:Object.fromEntries(Object.entries(PACKS).map(([k,p])=>[k,p.prompts.length])),
    creative:Object.fromEntries(Object.entries(CREATIVE_DEFS).map(([k,d])=>[k,d.build.length])),
    lenses:POP_LENSES.length,
    twists:Object.fromEntries(Object.entries(WILD_TWISTS).map(([k,v])=>[k,v.length])),
    perCategory:PROMPTS_PER_CATEGORY,
    universe:UNIVERSE_SIZE
  }; `,context,{filename:'legacy-inventory.js'})||context.__inventory;
}
test('all eight themed paths triple their subject and opener banks',()=>{
 const c=getCatalog().categories;
 assert.equal(Object.keys(c).length,9);
 for(const [name,counts] of Object.entries(c))if(name!=='imagine')assert.deepEqual(Array.from(counts),[48,12,12,12],name);
});
test('nine paths triple the deterministic no-repeat universe without overwriting original ID space',()=>{
 const i=getCatalog();
 assert.equal(i.perCategory,3072);
 assert.equal(i.universe,27648);
 assert.match(html,/const PROMPT_MASK = 1023/);
 assert.match(html,/bank\*1024\+\(\(Math\.imul\(c\.mult,local\)\+offset\)&PROMPT_MASK\)/);
 assert.match(html,/const bank=Math\.floor\(index\/1024\)/);
});
test('every curated pack and creative builder triples authored variety',()=>{
 const i=getCatalog();
 assert.equal(Object.keys(i.packs).length,12);
 assert.ok(Object.values(i.packs).every(n=>n===36));
 assert.equal(Object.keys(i.creative).length,10);
 assert.ok(Object.values(i.creative).every(n=>n===12));
 assert.equal(i.lenses,30);
 assert.ok(Object.values(i.twists).every(n=>n===48));
});
test('all nine deeper prompts triple their choices and assistants have threefold endings',()=>{
 assert.match(html,/CONTENT_3X\.applyDeeper\(DEEPER\)/);
 assert.match(html,/const ASSIST_EXAMPLE_ENDINGS=\[.*Start with one concrete example/);
 assert.match(html,/const ASSIST_ENHANCE_EXTRAS=\[.*Try this from a different point of view/);
});
test('all content modules are deferred until Dexter unlock, with unchanged v14 source markers',()=>{
 assert.equal(inline.length,23);
 for(const name of ['elsewhere-triple-paths','elsewhere-triple-packs','elsewhere-triple-creative','elsewhere-triple-deeper']){
   const source=fs.readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8').trimEnd();
   assert.ok(inline.some(s=>s.includes(source)),name);
 }
 assert.match(html,/const DEFAULT = 'Dexter'/);
 assert.match(html,/ELSEWHERE14:SCRIPT:START/);
 assert.match(html,/ELSEWHERE15:SCRIPT:START/);
});
test('figure expansion remains exactly 63 curated comparisons, category-bound',()=>{
 const src=fs.readFileSync(new URL('../src/elsewhere-arrival.js',import.meta.url),'utf8');
 const initial=src.slice(src.indexOf('const FIGURES=['),src.indexOf('const TERMS={'));
 const names=[...initial.matchAll(/name:'([^']+)'/g)];
 assert.equal(names.length,21);
 assert.match(initial,/FIGURES\.push\(\.\.\./);
 const added=initial.match(/FIGURES\.push\(\.\.\.(\[[\s\S]*?\])\);/);
 assert.ok(added);
 assert.equal(JSON.parse(added[1]).length,42);
});
