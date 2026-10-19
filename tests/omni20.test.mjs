import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const js=fs.readFileSync(path.join(root,'src/elsewhere-omni20.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/elsewhere-omni20.css'),'utf8');
const installer=fs.readFileSync(path.join(root,'tools/install_omni20.mjs'),'utf8');
const fixture=fs.readFileSync(path.join(root,'tests/fixture-omni20.html'),'utf8');
const fixtures={
  index:'<!doctype html><head><style>/* ELSEWHERE14:STYLE:START */ old style /* ELSEWHERE14:STYLE:END */</style></head><body><div id="promptCard"></div><nav id="mobileCommandDock"></nav><script>/* ELSEWHERE14:SCRIPT:START */ old script /* ELSEWHERE14:SCRIPT:END */</script></body>',
  verify:'#!/usr/bin/env node\nconst n=()=>0; const keep=n(\'<script type=\"text/plain\" data-elsewhere-app>\')===26;',
  rebuild:`import fs from 'node:fs';\nimport path from 'node:path';\nconst root=path.resolve(import.meta.dirname,'..');\nlet current=fs.readFileSync(path.join(root,'index.html'),'utf8');\nconst css=fs.readFileSync(path.join(root,'src/elsewhere14.css'),'utf8').trimEnd();\nconst js=fs.readFileSync(path.join(root,'src/elsewhere14.js'),'utf8').trimEnd();\nfunction replace(kind,body){\n const open='/* ELSEWHERE14:'+kind+':START */',close='/* ELSEWHERE14:'+kind+':END */';\n const a=current.indexOf(open),b=current.indexOf(close);if(a<0||b<=a)throw Error('markers');\n current=current.slice(0,a+open.length)+'\\n'+body+'\\n'+current.slice(b);\n}\nreplace('STYLE',css);\nreplace('SCRIPT',js);\nif(process.argv.includes('--check')){if(current!==fs.readFileSync(path.join(root,'index.html'),'utf8'))process.exit(1)}else fs.writeFileSync(path.join(root,'index.html'),current);\n`
};
test('additive navigation preserves original interface and storage controllers',()=>{
  for(const phrase of ['#ideaStage','e14Workspace','switchProjectFromPhone','setView','om20WriteAbout'])assert.ok(js.includes(phrase),phrase);
  assert.match(css,/\.omni20-nav/);
  assert.match(css,/#mobileCommandDock/);
  assert.match(css,/#e14Tabs/);
  assert.match(js,/main\.append\(workspace\)/,'nested v14 workspace must remain visible when stage is hidden');
  assert.match(js,/organizeLibrary\(\)/);
  assert.match(js,/organizeVault\(\)/);
  assert.match(js,/organizeAtlas\(\)/);
  assert.match(js,/installPersistenceFeedback\(\)/);
  assert.ok(!js.includes('localStorage.clear('));
  assert.ok(!js.includes('indexedDB.deleteDatabase('));
});
test('all four destinations plus safe vault and incoming extension hooks',()=>{
  assert.match(js,/\['explore', 'write', 'library', 'atlas'\]/);
  assert.match(js,/ElsewhereInfinite\?\.menu/);
  assert.match(js,/#e15RouteBar button/);
  assert.match(js,/open encrypted backup|encrypted backup/i);
  assert.match(js,/window\.dispatchEvent\(new Event\('elsewhere:prompt'\)\)/);
  assert.match(js,/aria-current/);
});
test('source contains no external remote endpoints or model dependencies',()=>{
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest\(|WebSocket\(|new Worker\(/);
  assert.doesNotMatch(js,/\/\* OMNI20:(?:SCRIPT|STYLE):END \*\//,'markers belong to build only');
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/safe-area-inset-bottom/);
});
test('installer uses anchored injection with rollback, never Git push or release',()=>{
  for(const x of ['OMNI20:STYLE:START','OMNI20:SCRIPT:START','--check','guard_reset14.mjs','Missing expected Elsewhere file','rolled back'])assert.ok(installer.includes(x),x);
  assert.doesNotMatch(installer,/execFileSync\('git',\['push'/);
  assert.doesNotMatch(installer,/--force|git reset --hard/);
});
test('standalone installer is idempotent and checks authored module parity',()=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'elsewhere-omni20-'));
  try{
    for(const dir of ['tools','src','tests'])fs.mkdirSync(path.join(d,dir));
    const put=(p,s)=>fs.writeFileSync(path.join(d,p),s);
    put('index.html',fixtures.index);
    put('Elsewhere_bible.md','# Existing Elsewhere Bible');
    put('tools/rebuild14.mjs',fixtures.rebuild);
    put('tools/install_omni20.mjs',installer);
    put('tools/verify_x5.mjs',fixtures.verify);
    put('src/elsewhere14.js','function installUI(){}');
    put('src/elsewhere14.css','old style');
    put('src/elsewhere-omni20.js',js);
    put('src/elsewhere-omni20.css',css);
    execFileSync(process.execPath,['tools/rebuild14.mjs'],{cwd:d});
    const exec=(...args)=>execFileSync(process.execPath,['tools/install_omni20.mjs',...args],{cwd:d,encoding:'utf8'});
    exec('--skip-tests');
    const actual=fs.readFileSync(path.join(d,'index.html'),'utf8');
    assert.ok(actual.includes('OMNI20:STYLE:START'));
    assert.ok(actual.includes('OMNI20:SCRIPT:START'));
    assert.match(actual, /<script type="text\/plain" data-elsewhere-app>\s*\/\* OMNI20:SCRIPT:START \*\//);
    assert.match(fs.readFileSync(path.join(d,'tools/verify_x5.mjs'),'utf8'),/OMNI20 DEFERRED GATE COUNT/);
    exec('--check');
    const baseline=fs.readFileSync(path.join(d,'index.html'),'utf8');
    exec('--skip-tests');
    assert.equal(fs.readFileSync(path.join(d,'index.html'),'utf8'),baseline);
    const rebuild=fs.readFileSync(path.join(d,'tools/rebuild14.mjs'),'utf8');
    assert.equal(rebuild.match(/OMNI20 SOURCE LINK/g)?.length,1);
    assert.equal(fs.readFileSync(path.join(d,'Elsewhere_bible.md'),'utf8').match(/OMNI20 unified navigation source integration/g)?.length,1);
  }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('bad repository anchor stops before mutation',()=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'elsewhere-omni20-stop-'));
  try{
    for(const dir of ['tools','src'])fs.mkdirSync(path.join(d,dir));
    fs.writeFileSync(path.join(d,'index.html'),'<html>different app</html>');
    fs.writeFileSync(path.join(d,'Elsewhere_bible.md'),'# Existing Elsewhere Bible');
    fs.writeFileSync(path.join(d,'tools/install_omni20.mjs'),installer);
    fs.writeFileSync(path.join(d,'tools/verify_x5.mjs'),fixtures.verify);
    fs.writeFileSync(path.join(d,'tools/rebuild14.mjs'),fixtures.rebuild);
    fs.writeFileSync(path.join(d,'src/elsewhere14.js'),'function installUI(){}');
    fs.writeFileSync(path.join(d,'src/elsewhere14.css'),'');
    fs.writeFileSync(path.join(d,'src/elsewhere-omni20.js'),js);
    fs.writeFileSync(path.join(d,'src/elsewhere-omni20.css'),css);
    const before=fs.readFileSync(path.join(d,'index.html'),'utf8');
    assert.throws(()=>execFileSync(process.execPath,['tools/install_omni20.mjs'],{cwd:d,encoding:'utf8',stdio:'pipe'}));
    assert.equal(fs.readFileSync(path.join(d,'index.html'),'utf8'),before);
  }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('synthetic fixture keeps both original and v14 owned DOM contracts',()=>{
  for(const id of ['promptCard','ideaStage','e14Workspace','e14Panel-write','e14Panel-atlas','e14Panel-library','e14Panel-privacy','e14CanonCount','e14VaultPass','e14VaultVerify'])assert.ok(fixture.includes(`id="${id}"`),id);
});
