import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
const ctx={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,matchMedia:()=>({matches:false})};
ctx.globalThis=ctx;vm.runInNewContext(source,ctx);const atlas=ctx.Elsewhere14;
function envelope(id='new') {return {app:'Elsewhere',schemaVersion:13,type:'universe',state:{projects:[{id,name:id,artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]}],activeProjectId:id}}}
function harness(){
 const target=structuredClone(envelope('old').state),history=[],deleted=[];let failure=false,rollbackFailure=false,badRead=false;
 const api={SCHEMA_VERSION:13,runtime:{adapter:{persistent:true}},exportUniverse(state){return {app:'Elsewhere',schemaVersion:13,type:'universe',state:structuredClone(state)}},importUniverse(payload,state){for(const key of Object.keys(state))delete state[key];Object.assign(state,structuredClone(payload.state));return {ok:true}},flushDirty(){history.push('write');if(failure){failure=false;if(rollbackFailure){failure=true}return {persistent:true,failed:['index']}}return {persistent:true,failed:[]}},loadV13(){return {state:badRead?{projects:[{id:'corrupt'}]}:structuredClone(target),needsRecovery:false,recovery:[]}},legacyStateFromV13(s){return s},removeProjectStorage(_adapter,id){deleted.push(id)} };
 return {api,target,history,deleted,setFail(v=true){failure=v},setRollbackFail(){rollbackFailure=true},setBadRead(){badRead=true}};
}
test('encrypted-vault transaction commits after verified read-back and then prunes old project',async()=>{
 const h=harness(),restores=[];
 const result=await atlas.commitUniverseTransaction(envelope(),{api:h.api,target:h.target,legacy:{restoreState:async()=>{restores.push('legacy')}},before:h.api.exportUniverse(h.target)});
 assert.equal(result.ok,true);assert.equal(h.target.projects[0].id,'new');assert.deepEqual(h.deleted,['old']);assert.deepEqual(restores,['legacy']);
});
test('failed write performs a verified rollback and never removes old project',async()=>{
 const h=harness(),before=h.api.exportUniverse(h.target);h.setFail();
 await assert.rejects(atlas.commitUniverseTransaction(envelope(),{api:h.api,target:h.target,legacy:null,before}),/rolled back/i);
 assert.equal(h.target.projects[0].id,'old');assert.deepEqual(h.deleted,[]);assert.equal(h.history.length,2);
});
test('failed rollback is clearly classified, not reported successful',async()=>{
 const h=harness();h.setFail();h.setRollbackFail();
 let error;try{await atlas.commitUniverseTransaction(envelope(),{api:h.api,target:h.target,legacy:null,before:h.api.exportUniverse(h.target)})}catch(e){error=e}
 assert.equal(error?.rollbackFailed,true);assert.match(error.message,/could not be verified/i);assert.deepEqual(h.deleted,[]);
});
test('readback verification aborts and rolls back',async()=>{
 const h=harness();let first=true;h.api.loadV13=()=>{if(first){first=false;return {state:{projects:[{id:'mismatch'}]},recovery:[]}};return {state:structuredClone(h.target),recovery:[]}};
 await assert.rejects(atlas.commitUniverseTransaction(envelope(),{api:h.api,target:h.target,legacy:null,before:h.api.exportUniverse(h.target)}),/rolled back/i);
 assert.equal(h.target.projects[0].id,'old');assert.deepEqual(h.deleted,[]);
});

test('restore rejects same-ID content corruption even when project counts and IDs match',async()=>{
 const h=harness();let first=true;
 h.api.loadV13=()=>{
   if(first){first=false;return {state:{projects:[{id:'new',name:'Tampered',artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]}]},recovery:[]}};
   return {state:structuredClone(h.target),recovery:[]};
 };
 await assert.rejects(atlas.commitUniverseTransaction(envelope(),{api:h.api,target:h.target,legacy:null,before:h.api.exportUniverse(h.target)}),/rolled back/i);
 assert.equal(h.target.projects[0].id,'old');assert.deepEqual(h.deleted,[]);
});

test('importer that partially modifies state then throws triggers rollback',async()=>{
 const h=harness(),originalImport=h.api.importUniverse;
 let first=true;
 h.api.importUniverse=(payload,target)=>{
   if(first){first=false;originalImport(payload,target);throw Error('Importer failed after mutation')}
   return originalImport(payload,target);
 };
 await assert.rejects(atlas.commitUniverseTransaction(envelope(),{api:h.api,target:h.target,legacy:null,before:h.api.exportUniverse(h.target)}),/rolled back/i);
 assert.equal(h.target.projects[0].id,'old');assert.deepEqual(h.deleted,[]);
});

test('restore preflight blocks dangerous IDs that can escape section-key namespace',()=>{
 for(const id of ['a:b','../outside','__proto__','constructor']){
   const data=envelope(id);assert.equal(atlas.validateUniverseRestore(data,{SCHEMA_VERSION:13}).ok,false,id)
 }
});
