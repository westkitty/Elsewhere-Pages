import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../src/elsewhere14.css',import.meta.url),'utf8');
const sandbox={Uint8Array,TextEncoder,TextDecoder,atob,btoa,matchMedia:()=>({matches:false})};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'elsewhere14.js'});
const app=sandbox.Elsewhere14;
test('reading sizes are allowlisted rather than injecting CSS or HTML',()=>{
  for(const size of ['comfortable','large','extra'])assert.equal(app.validReadSize(size),size);
  assert.equal(app.validReadSize('url(javascript:alert(1))'),'comfortable');
  assert.equal(app.validReadSize(null),'comfortable');
  assert.match(styles,/--e14-writer-size:21px/);
  assert.match(styles,/#e14Workspace #e14Panel-write textarea#e14Answer/);
});
test('tab scroll offsets are bounded and pure',()=>{
  assert.equal(app.scrollOffsetFor('write',520,200),320);
  assert.equal(app.scrollOffsetFor('library',190,300),0);
  assert.equal(app.scrollOffsetFor('atlas',-100,-200),100);
  assert.equal(app.scrollOffsetFor('privacy',0,0),0);
});
test('project switching protects dirty writing and keeps original actions',()=>{
  assert.match(source,/storeSessionDraft\(before\?\.id,\$\('e14Answer'\)\.value\)/);
  assert.match(source,/if\(!storeSessionDraft\(before\?\.id/);
  assert.match(source,/if\(isEditorField\(document\.activeElement\)\)document\.activeElement\.blur\(\)/);
  assert.match(source,/button\('Resume draft',resumeDraft\)/);
  assert.match(source,/button\('Continue saved draft',resumeDraft\)/);
});
test('clipboard and native share transmit text only after explicit click',()=>{
  assert.match(source,/button\('Copy writing',copyWriting\)/);
  assert.match(source,/button\('Share writing \(unencrypted\)',shareWriting\)/);
  assert.match(source,/navigator\.share\(\{title:'Elsewhere writing',text:raw\}\)/);
  assert.match(source,/navigator\.clipboard\.writeText\(raw\)/);
  assert.ok(!source.includes('navigator.share({files')); // No hidden file submission.
});
test('preserve existing four tabs, PWA boundary and encrypted checkpoint gate',()=>{
  for(const x of ['write','atlas','library','privacy'])assert.ok(source.includes(`'${x}'`));
  assert.match(source,/registerOffline\(\)/);
  assert.match(source,/if\(!await encryptedImportCheckpoint\(\)\)/);
  assert.match(source,/window\.addEventListener\('storage'/);
});
