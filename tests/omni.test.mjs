import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
const sandbox={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,matchMedia:()=>({matches:false})};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'elsewhere14.js'});
const api=sandbox.Elsewhere14;
test('review queue includes only provisional, unmuted facts, sorted and bounded',()=>{
 const items=Array.from({length:36},(_,i)=>({id:'f'+i,status:i%5===0?'established':i%5===1?'retired':i%5===2?'possible':'idea',updatedAt:i,muted:i===30}));
 const page=api.factReviewModel(items,0);
 assert.equal(page.visible.length,10);assert.equal(page.total,21);assert.equal(page.pages,3);
 const all=[...api.factReviewModel(items,0).visible,...api.factReviewModel(items,1).visible,...api.factReviewModel(items,2).visible];
 assert.equal(new Set(all.map(f=>f.id)).size,page.total);
 assert.equal(api.factReviewModel(items,999).page,2);
 assert.ok(all.every(f=>['idea','possible'].includes(f.status)&&!f.muted));
});
test('fit-to-visible computes finite camera bounds without modifying source positions',()=>{
 const positions=new Map([['a',{x:-700,y:-800}],['b',{x:850,y:950}]]);
 const original=JSON.stringify([...positions]);
 const fitted=api.fitAtlasCamera(positions);
 for(const key of ['zoom','panX','panY'])assert.equal(Number.isFinite(fitted[key]),true);
 assert.ok(fitted.zoom>=.24 && fitted.zoom<=2.2);
 assert.equal(JSON.stringify([...positions]),original);
 const a=api.fitAtlasCamera(new Map());assert.equal(a.zoom,1);assert.equal(a.panX,0);
});
test('no hidden plaintext recovery download on legacy import paths',()=>{
 assert.match(source,/encryptedImportCheckpoint/);
 assert.match(source,/if\(!await encryptedImportCheckpoint\(\)\)/);
 assert.ok(!source.includes('        backupPlain();'),'implicit plaintext export must be absent');
 assert.match(source,/This JSON contains your personal writing UNENCRYPTED/);
});
test('source continuation carries explicit provenance into saved artifact',()=>{
 assert.match(source,/inspiredByArtifactId:origin\?\.id\|\|null/);
 assert.match(source,/sourceArtifactId:writingSource\?\.projectId===projectId/);
 assert.match(source,/if\(document.visibilityState==='hidden'&&changed\)/);
});
test('canon establishment requires rationale and an explicit confirmation',()=>{
 assert.match(source,/reason.length<8/);
 assert.match(source,/confirm\(`Establish as canon/);
 assert.match(source,/D\(\)\.reviseFact\(p,f\.id,\{status:'established'\},reason\)/);
});
