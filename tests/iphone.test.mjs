import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/elsewhere14.css',import.meta.url),'utf8');
const sandbox={matchMedia:()=>({matches:false}),Uint8Array,TextEncoder,TextDecoder,atob,btoa};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'elsewhere14.js'});
const app=sandbox.Elsewhere14;

test('pinch zoom preserves anchor under fingers and clamps extreme distances',()=>{
  const original={distance:100,zoom:1,anchor:{x:20,y:-12}};
  const actual=app.cameraFromPinch(original,{x:200,y:250},{x:400,y:250});
  assert.equal(actual.zoom,2);
  assert.equal(actual.panX,300-500-20*2);
  assert.equal(actual.panY,250-350+12*2);
  assert.equal(app.cameraFromPinch(original,{x:0,y:0},{x:100000,y:0}).zoom,3);
  assert.equal(app.cameraFromPinch(original,{x:200,y:250},{x:201,y:250}).zoom,.24);
  assert.equal(JSON.stringify(original),JSON.stringify({distance:100,zoom:1,anchor:{x:20,y:-12}}));
});

test('mobile uses the original four tab identities and no duplicate navigation shell',()=>{
  assert.match(source,/tabs\.id='e14Tabs'/);
  assert.match(source,/navigateMobileView\(id\)/);
  assert.match(css,/\.e14-tabs\{position:fixed;z-index:1000/);
  assert.match(css,/env\(safe-area-inset-bottom/);
});

test('all input-focus paths have a visible keyboard dismiss action and preserve drafts',()=>{
  assert.match(source,/const isEditorField = el/);
  assert.match(source,/dismiss\.id='e14DismissKeyboard'/);
  assert.match(source,/if\(changed\)storeSessionDraft\(\);document\.activeElement\?\.blur/);
  assert.match(source,/window\.addEventListener\('pagehide'/);
  assert.match(source,/document\.addEventListener\('visibilitychange'/);
  assert.match(source,/if\(!isMobileViewport\(\)\)window\.addEventListener\('beforeunload'/);
  assert.match(css,/html\.e14-keyboard-open \.e14-tabs\{opacity:0;visibility:hidden/);
});

test('iPhone writing separates primary actions from optional creative tools without deleting them',()=>{
  assert.match(source,/e14-primary-actions/);
  assert.match(source,/e14-writing-more/);
  for(const label of ['Save response','Save draft','Resume draft','Make possible fact','Branch alternative','Follow-up questions','Download writing (unencrypted)'])assert.ok(source.includes(label),label);
  assert.match(source,/e14WriterStatus/);
});

test('touch Atlas includes an opt-in layout editor and an artifact list alternative',()=>{
  assert.match(source,/e14-node-hit/);
  assert.match(source,/const fingers=new Map\(\)/);
  assert.match(source,/event\.pointerType!=='touch'/);
  assert.match(source,/e14-layout-details/);
  assert.match(source,/Browse as list/);
  assert.match(source,/if\(isMobileViewport\(\)\)atlas\.insertBefore\(directory,graph\)/);
});

test('sensitive plaintext export remains opt-in behind a warning, not the primary mobile action',()=>{
  assert.match(source,/e14-plain-disclosure/);
  assert.match(source,/Advanced: unencrypted export/);
  assert.match(source,/Download plain snapshot/);
  assert.match(source,/This JSON contains your personal writing UNENCRYPTED/);
  assert.match(source,/Encrypted backup/);
});
