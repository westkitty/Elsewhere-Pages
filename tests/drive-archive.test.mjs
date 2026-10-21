import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../src/elsewhere-drive-archive.js',import.meta.url),'utf8');
const globals={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,setTimeout,clearTimeout};
globals.globalThis=globals;
vm.runInNewContext(source,globals,{filename:'elsewhere-drive-archive.js'});
const api=globals.ElsewhereDriveArchive;
test('wrapped archive key and authenticated ciphertext restore the exact universe',async()=>{
  const {descriptor,key}=await api.createVault('completely unique test phrase 123');
  const universe={app:'Elsewhere',type:'universe',schemaVersion:13,state:{projects:[{id:'p',artifacts:[{meta:{text:'PRIVATE_JOURNAL_SENTINEL'}}]}]}};
  const input={format:'Elsewhere archive',version:1,universe};
  const archive=await api.sealArchive(input,key,descriptor);
  const encoded=JSON.stringify(archive);
  assert.equal(encoded.includes('PRIVATE_JOURNAL_SENTINEL'),false);
  const result=await api.openArchive(JSON.parse(encoded),'completely unique test phrase 123');
  assert.deepEqual(JSON.parse(JSON.stringify(result.payload)),input);
});
test('wrong password, ciphertext tampering and metadata tampering fail closed',async()=>{
  const {descriptor,key}=await api.createVault('another perfectly long password 1234');
  const env=await api.sealArchive({format:'Elsewhere archive',version:1,universe:{app:'Elsewhere',type:'universe',state:{projects:[]}}},key,descriptor);
  await assert.rejects(api.openArchive(env,'wrong password'),/Incorrect/);
  const flip=JSON.parse(JSON.stringify(env));flip.ciphertext=(flip.ciphertext[0]==='A'?'B':'A')+flip.ciphertext.slice(1);
  await assert.rejects(api.openArchive(flip,'another perfectly long password 1234'),/authentication failed/);
  const changed=JSON.parse(JSON.stringify(env));changed.archiveId='f'.repeat(32);
  await assert.rejects(api.openArchive(changed,'another perfectly long password 1234'),/authentication failed/);
});
test('does not store Google tokens in persistence and requests drive.file only',()=>{
  assert.match(source,/https:\/\/www\.googleapis\.com\/auth\/drive\.file/);
  assert.doesNotMatch(source,/saveSetting\(['"](?:token|passphrase|access_token)/);
  assert.match(source,/Google authorization expired/);
  assert.match(source,/Another tab has changed this workspace/);
});
test('standalone source markers and offline cache policy',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.includes('ELSEWHERE_DRIVE:SCRIPT:START'));
  assert.ok(html.includes('ELSEWHERE_DRIVE:STYLE:START'));
  assert.ok(html.includes('Encrypted cloud archive'));
  const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.ok(!sw.includes('elsewhere-encrypted-drive-v1'));
});