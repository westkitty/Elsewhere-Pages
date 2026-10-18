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

test('atlas pages cap DOM workload and never point edges to hidden nodes',()=>{
  const p={id:'large',artifacts:Array.from({length:275},(_,i)=>({id:`a${i}`,type:'place',name:`Sector ${String(i).padStart(3,'0')}`,createdAt:i+1})),relationships:Array.from({length:274},(_,i)=>({id:`r${i}`,fromId:`a${i}`,toId:`a${i+1}`,status:'established',label:'adjacent'}))};
  const seen=new Set();
  for(let page=0;page<3;page++){
    const graph=api.graphForProject(p,100,{page});
    assert.ok(graph.nodes.length<=120,'bounded graph');
    assert.equal(graph.total,275);
    assert.equal(graph.pages,3);
    const ids=new Set(graph.nodes.map(x=>x.id));
    assert.ok(graph.edges.every(edge=>ids.has(edge.from)&&ids.has(edge.to)),'no orphaned SVG edges');
    for(const id of ids){assert.ok(!seen.has(id),'pages must not repeat nodes');seen.add(id)}
  }
  assert.equal(seen.size,275);
  assert.equal(api.graphForProject(p,100,{page:99}).page,2,'page clamped');
  assert.equal(api.graphForProject(p,100,{query:'Sector 274'}).nodes.length,1,'filter by name');
  assert.equal(api.graphForProject(p,50,{page:0}).total,137,'timeline boundary');
});

test('vault preflight rejects cross-project ID duplication and broken links',()=>{
  const make=()=>({app:'Elsewhere',type:'universe',schemaVersion:13,state:{projects:[{id:'p1',name:'One',artifacts:[{id:'a',type:'note'}],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]}]}});
  assert.equal(api.validateUniverseRestore(make(),{SCHEMA_VERSION:13}).ok,true);
  const duplicate=make();duplicate.state.projects.push({...duplicate.state.projects[0]});
  assert.match(api.validateUniverseRestore(duplicate,{SCHEMA_VERSION:13}).reason,/duplicate/i);
  const missing=make();missing.state.projects[0].relationships.push({id:'r1',fromId:'a',toId:'nowhere'});
  assert.match(api.validateUniverseRestore(missing,{SCHEMA_VERSION:13}).reason,/missing artifact/i);
  const bad=make();bad.state.projects[0].facts.push({id:'a'});
  assert.match(api.validateUniverseRestore(bad,{SCHEMA_VERSION:13}).reason,/duplicate/i);
  const future=make();future.schemaVersion=14;
  assert.equal(api.validateUniverseRestore(future,{SCHEMA_VERSION:13}).ok,false);
});
