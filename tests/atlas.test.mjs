import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
const src=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
const ctx={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,matchMedia:()=>({matches:false}),atob,btoa};
ctx.globalThis=ctx;
vm.runInNewContext(src,ctx,{filename:'elsewhere14.js'});
const api=ctx.Elsewhere14;
function project(){return {id:'p1',artifacts:[{id:'a',type:'character',name:'A',createdAt:1},{id:'b',type:'place',name:'B',createdAt:2},{id:'c',type:'scene',name:'C',createdAt:3,retired:true}],relationships:[{id:'r1',fromId:'a',toId:'b',label:'enters',status:'established'},{id:'r2',fromId:'a',toId:'c',label:'mentions',status:'established'}]}}
test('version fourteen initializes pure helpers without a DOM',()=>{assert.equal(api.version,14);assert.equal(api.initialized,false)});
test('graph includes only active endpoints and established or possible relationships',()=>{const g=api.graphForProject(project());assert.deepEqual([...g.nodes].map(x=>x.id),['a','b']);assert.equal(g.edges.length,1);assert.equal(g.edges[0].label,'enters')});
test('graph historical reveal is bounded and deterministic',()=>{const a=api.graphForProject(project(),50),b=api.graphForProject(project(),50);assert.deepEqual([...a.nodes].map(x=>x.id),['a']);assert.deepEqual([...b.nodes].map(x=>x.id),['a']);const full=api.graphForProject(project());assert.deepEqual([...api.graphPositions(full).entries()],[...api.graphPositions(full).entries()])});
test('encrypted vault roundtrip preserves nested metadata',async()=>{const payload={app:'Elsewhere',type:'universe',schemaVersion:13,state:{projects:[project()],extra:{unicode:'hello'}}};const sealed=await api.seal(payload,'long-enough-secret-passphrase');assert.equal(sealed.cipher,'AES-256-GCM');assert.ok(!JSON.stringify(sealed).includes('hello'));const decrypted=await api.unseal(sealed,'long-enough-secret-passphrase');assert.deepEqual(JSON.parse(JSON.stringify(decrypted)),payload)});
test('encrypted vault rejects wrong key and tampering',async()=>{const data=await api.seal({hello:'private'},'correct-long-enough');await assert.rejects(api.unseal(data,'incorrect-passphrase'),/Wrong passphrase/);data.ciphertext=data.ciphertext.slice(0,-5)+'12345';await assert.rejects(api.unseal(data,'correct-long-enough'),/Wrong passphrase|Invalid vault/)});
test('encrypted backup rejects weak password and invalid version',async()=>{await assert.rejects(api.seal({x:1},'Dexter'),/12 characters/);await assert.rejects(api.unseal({app:'Elsewhere',type:'encrypted-universe',version:77},'a'),/not an Elsewhere/)});
