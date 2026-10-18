import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
const src=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
const c={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,matchMedia:()=>({matches:false})};c.globalThis=c;vm.runInNewContext(src,c);
const api=c.Elsewhere14;
test('library paging limits records and visits every page without duplication',()=>{
 const list=Array.from({length:101},(_,i)=>({id:'id'+i,name:'Record '+i,summary:'journal',createdAt:i+1,updatedAt:i+1}));
 const seen=new Set();
 for(let page=0;page<5;page++){
   const m=api.libraryPageModel(list,'','recent',page);
   assert.ok(m.visible.length<=24);
   for(const item of m.visible){assert.ok(!seen.has(item.id));seen.add(item.id)}
 }
 assert.equal(seen.size,101);
 assert.equal(api.libraryPageModel(list,'','recent',99).page,4);
 assert.equal(api.libraryPageModel(list,'Record 70').total,1);
 assert.equal(api.libraryPageModel(list,'','oldest').visible[0].id,'id0');
 assert.equal(api.libraryPageModel(list,'','recent').visible[0].id,'id100');
});
test('content read-back fingerprint includes facts, metadata and Greyson progress',()=>{
 const state={greysonLanguage:'es',packProgress:{greysonDexter:4},projects:[{id:'p',name:'A',artifacts:[{id:'a',name:'A',factIds:['one'],relationshipIds:['two'],meta:{content:'private'}}],facts:[{id:'f',freeText:'A has ears'}]}]};
 const same=structuredClone(state);same.projects[0].artifacts[0].factIds=['recomputed'];
 assert.equal(api.durableRestoreContent(state),api.durableRestoreContent(same),'derived indexes can be recomputed');
 same.projects[0].artifacts[0].meta.content='tampered';
 assert.notEqual(api.durableRestoreContent(state),api.durableRestoreContent(same),'actual prose is protected');
 same.projects[0].artifacts[0].meta.content='private';same.packProgress.greysonDexter=0;
 assert.notEqual(api.durableRestoreContent(state),api.durableRestoreContent(same),'Greyson progress is protected');
});
test('vault rejects a project ID containing the persistence namespace delimiter',()=>{
 const project={id:'bad:project',name:'Rogue',artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]};
 const envelope={app:'Elsewhere',type:'universe',schemaVersion:13,state:{projects:[project]}};
 assert.equal(api.validateUniverseRestore(envelope,{SCHEMA_VERSION:13}).ok,false);
});
test('offline code does not cache arbitrary user data or vault files',()=>{
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/event\.request\.method\s*!==\s*'GET'/);
 assert.match(sw,/if\s*\(!allowed\.has\(target\)\)\s*return/);
 assert.ok(!sw.includes('elsewhere:v13:core'));
 assert.ok(!sw.includes('Elsewhere-Encrypted-Vault.json'));
});
test('vault preflight does not accept an orphaned active project pointer',()=>{
 const envelope={app:'Elsewhere',type:'universe',schemaVersion:13,state:{activeProjectId:'missing',projects:[{id:'present',name:'Safe',artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]}]}};
 assert.match(api.validateUniverseRestore(envelope,{SCHEMA_VERSION:13}).reason,/Active project/);
});
