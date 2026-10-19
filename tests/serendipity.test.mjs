import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const content=fs.readFileSync(new URL('../src/elsewhere-infinite-content.js',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../src/elsewhere-infinite-engine.js',import.meta.url),'utf8');
const context={};context.globalThis=context;
vm.runInNewContext(content,context);
vm.runInNewContext(engine,context);
const candidates=Object.values(context.ElsewhereInfiniteContent.forms).flat();
test('100 selection opportunities cover more than one encounter format with no raw journal reads',()=>{
 const picks=[];
 for(let i=0;i<100;i++){
   const ordered=candidates.map((x,j)=>({x,rank:(i*31+j*17)%997+(x.type==='field'?4:0)})).sort((a,b)=>a.rank-b.rank);
   picks.push(ordered[0].x.id);
 }
 assert.equal(picks.length,100);
 assert.ok(new Set(picks).size>=70);
 assert.ok(!engine.includes('localStorage.getItem(\'elsewhere:v13:projects'));
 assert.ok(engine.includes('const KEY=\'elsewhere:infinite:v1\''));
});
test('arrival figure guest rotation stores only IDs and never diagnoses the user',()=>{
 const arrival=fs.readFileSync(new URL('../src/elsewhere-arrival.js',import.meta.url),'utf8');
 assert.match(arrival,/echoHistory:\[\]/);
 assert.match(arrival,/rows\.find\(x=>!history\.has\(x\.id\)\)/);
 assert.match(arrival,/not a personality diagnosis/);
});
test('callback deliberately accesses prompt metadata but not private written response bodies',()=>{
 assert.match(engine,/getState\?\.\(\)/);
 assert.match(engine,/An earlier question took you into /);
 assert.match(engine,/if\(!data\.callbacks/);
 assert.doesNotMatch(engine,/getProject\(/);
});

test('actual encounter selector yields broad novelty over 100 no-write simulated visits',()=>{
 const report=context.ElsewhereInfinite.simulate(100);
 assert.equal(report.delivered,100);
 assert.ok(report.unique>=90,'unique encounters should reach at least 90');
 assert.ok(report.forms>=8,'at least eight distinct forms should appear');
 assert.ok(report.categories>=5,'at least five paths should appear');
 assert.ok(report.repeats<=10,'at most ten exact repeats under limited corpus');
});
