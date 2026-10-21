import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const content=fs.readFileSync(new URL('../src/elsewhere-infinite-content.js',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../src/elsewhere-infinite-engine.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function load(){
 const context={};context.globalThis=context;
 vm.runInNewContext(content,context);
 vm.runInNewContext(engine,context);
 return context;
}
test('signature encounters are fully authored and distinguishable',()=>{
 const lib=load().ElsewhereInfiniteContent;
 const all=Object.values(lib.forms).flat();
 assert.equal(Object.keys(lib.forms).length,12);
 assert.equal(all.length,120);
 assert.equal(new Set(all.map(x=>x.id)).size,120);
 assert.equal(new Set(all.map(x=>x.text)).size,120);
 for(const item of all){assert.ok(item.text.length>58);assert.ok(item.door);assert.ok(item.doorLabel);assert.ok(['notice','day','unearth','reframe','wander','imagine','learn','shadow','sacred'].includes(item.category));}
 assert.equal(lib.collisions.length,36);assert.equal(lib.trails.length,6);assert.equal(lib.adventures.length,6);
 assert.equal(lib.physical.length,9);assert.equal(lib.lenses.length,6);
});
test('each trail and adventure has a coherent complete path',()=>{
 const lib=load().ElsewhereInfiniteContent;
 for(const x of lib.trails)assert.equal(x.steps.length,4,x.id);
 for(const x of lib.adventures){assert.equal(x.steps.length,3,x.id);for(const s of x.steps)assert.equal(s.options.length,2,x.id)}
});
test('discovery preference sanitization rejects malformed values and unknown exclusions',()=>{
 const v=load().ElsewhereInfinite.sanitize({version:1,serendipity:'NOPE',intensity:'deep',mode:'off',recent:['a','a',5],seen:[],shown:-22,trail:'UNKNOWN',observatory:{encounters:4,formats:['play'],categories:['imagine']}});
 assert.equal(v.serendipity,'unexpected');assert.equal(v.intensity,'deep');assert.equal(v.mode,'off');
 assert.deepEqual(Array.from(v.recent),['a']);assert.equal(v.shown,0);assert.equal(v.trail,null);
 assert.equal(v.observatory.encounters,4);
});
test('deferred sources remain private behind the Dexter gate and match standalone',()=>{
 assert.ok(html.includes(content.trimEnd()));assert.ok(html.includes(engine.trimEnd()));
 assert.match(html,/INFINITE:ENGINE:START/);
 assert.equal(html.split('<script type="text/plain" data-elsewhere-app>').length-1,28);
 assert.match(html,/const DEFAULT = 'Dexter'/);
});
test('third-bank prompts preserve their selected content in follow-up and remixes',()=>{
 assert.match(html,/d\.subject\+bank\*16/);
 assert.match(html,/d\.lens\+bank\*4/);
 assert.match(html,/d\.variant\+bank\*4/);
 assert.match(html,/decodePromptIndex\(current\.index\)\.variant\+4\*Math\.floor\(current\.index\/1024\)/);
 assert.match(html,/const local=Math\.floor\(ordinal\/3\),bank=ordinal%3/);
});
test('source includes non-intrusive opt-outs, pacing and storage failure recovery',()=>{
 assert.match(engine,/Erase discovery history/);
 assert.match(engine,/if\(!confirm\(/);
 assert.match(engine,/if\(data\.intensity==='light'/);
 assert.match(engine,/Too similar/);
 assert.match(engine,/Use imagination instead/);
 assert.match(engine,/catch\{return false\}/);
 assert.match(engine,/role','status'/);
});
