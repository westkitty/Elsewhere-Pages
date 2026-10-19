#!/usr/bin/env node
/* Additive source-to-standalone integration for Elsewhere OMNI20.
   No Git commit, branch mutation, network call, storage migration or deployment. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=name=>path.join(root,name);
const payloads=['src/elsewhere-omni20.css','src/elsewhere-omni20.js'];
const required=['index.html','src/elsewhere14.js','src/elsewhere14.css','tools/rebuild14.mjs','tools/verify_x5.mjs','Elsewhere_bible.md',...payloads];
const checkOnly=process.argv.includes('--check');
const noTests=process.argv.includes('--skip-tests');
const assert=(condition,message)=>{if(!condition)throw Error(message)};
function run(bin,args,options={}){return execFileSync(bin,args,{cwd:root,encoding:'utf8',stdio:'pipe',...options}).trim()}
function replaceOnce(content,oldValue,newValue,name){
  const first=content.indexOf(oldValue);
  assert(first!==-1,`${name}: missing expected insertion anchor`);
  assert(content.indexOf(oldValue,first+oldValue.length)===-1,`${name}: nonunique insertion anchor`);
  return content.slice(0,first)+newValue+content.slice(first+oldValue.length);
}
function compareMarkers(content,kind){
  const s=`/* OMNI20:${kind}:START */`,e=`/* OMNI20:${kind}:END */`;
  assert(content.includes(s)&&content.includes(e),`Missing ${kind} OMNI20 markers`);
  assert(content.indexOf(s)===content.lastIndexOf(s)&&content.indexOf(e)===content.lastIndexOf(e),`Duplicate ${kind} markers`);
  const start=content.indexOf(s)+s.length,end=content.indexOf(e);
  assert(end>start,`Reversed ${kind} markers`);
  const source=fs.readFileSync(file(kind==='STYLE'?payloads[0]:payloads[1]),'utf8').trimEnd();
  assert(content.slice(start,end).trim()===source,`${kind} standalone content differs from authored source; run node tools/rebuild14.mjs`);
}
function preflight(){
  for(const name of required)assert(fs.existsSync(file(name)),`Missing expected Elsewhere file: ${name}`);
  const index=fs.readFileSync(file('index.html'),'utf8');
  assert(index.includes('/* ELSEWHERE14:STYLE:START */')&&index.includes('/* ELSEWHERE14:SCRIPT:START */'),'Not the known Elsewhere14 standalone HTML');
  assert(index.includes('id="promptCard"')&&index.includes('id="mobileCommandDock"'),'Original prompt stage or mobile dock missing');
  assert(fs.readFileSync(file('src/elsewhere14.js'),'utf8').includes('function installUI()'),'Original v14 source lacks expected UI entrypoint');
  const rebuild=fs.readFileSync(file('tools/rebuild14.mjs'),'utf8');
  assert(rebuild.includes("replace('STYLE',css)")&&rebuild.includes("replace('SCRIPT',js)"),'Unknown source-to-standalone builder; refusing unsafe patch');
  const origin=(()=>{try{return run('git',['remote','get-url','origin'])}catch{return ''}})();
  if(origin)assert(/(?:github\.com[:/])westkitty\/Elsewhere-Pages(?:\.git)?$/.test(origin),`Unexpected repository remote: ${origin}`);
  // Do not silently roll unrelated authored-source drift into a new standalone build.
  if(!index.includes('/* OMNI20:STYLE:START */'))run(process.execPath,['tools/rebuild14.mjs','--check']);
  return {index,rebuild};
}
function insertIndex(index){
  const hasStyle=index.includes('/* OMNI20:STYLE:START */');
  const hasScript=index.includes('/* OMNI20:SCRIPT:START */');
  assert(hasStyle===hasScript,'Partial OMNI20 integration detected; inspect before proceeding');
  if(hasStyle){
    assert(index.includes('<script type="text/plain" data-elsewhere-app>\n/* OMNI20:SCRIPT:START */'),'OMNI20 must remain behind the original Dexter app gate');
    return index;
  }
  const css=fs.readFileSync(file(payloads[0]),'utf8').trimEnd();
  const js=fs.readFileSync(file(payloads[1]),'utf8').trimEnd();
  assert(!css.includes('</style>')&&!js.includes('</script>'),'Source contains an unsafe inline terminator');
  index=replaceOnce(index,'</style>','\n/* OMNI20:STYLE:START */\n'+css+'\n/* OMNI20:STYLE:END */\n</style>','index.html CSS');
  index=replaceOnce(index,'</body>','\n<script type="text/plain" data-elsewhere-app>\n/* OMNI20:SCRIPT:START */\n'+js+'\n/* OMNI20:SCRIPT:END */\n</script>\n</body>','index.html JS');
  return index;
}
function insertRebuild(rebuild){
  if(rebuild.includes('// OMNI20 SOURCE LINK'))return rebuild;
  const insertion=`replace('SCRIPT',js);\n// OMNI20 SOURCE LINK: keep the additive UX adapter embedded in the standalone edition.\nconst omni20 = [\n  ['STYLE','src/elsewhere-omni20.css'],\n  ['SCRIPT','src/elsewhere-omni20.js'],\n];\nfor(const [kind,filename] of omni20){\n  const open=\`/* OMNI20:\${kind}:START */\`;\n  const close=\`/* OMNI20:\${kind}:END */\`;\n  const begin=current.indexOf(open),end=current.indexOf(close);\n  if(begin<0||end<=begin||current.indexOf(open,begin+1)!==-1||current.indexOf(close,end+1)!==-1)\n    throw Error(\`Missing or duplicate OMNI20 markers \${kind}\`);\n  const contents=fs.readFileSync(path.join(root,filename),'utf8').trimEnd();\n  current=current.slice(0,begin+open.length)+'\\n'+contents+'\\n'+current.slice(end);\n}\n`;
  return replaceOnce(rebuild,"replace('SCRIPT',js);",insertion,'rebuild14.mjs');
}
function insertVerifier(verifier){
  if(verifier.includes('// OMNI20 DEFERRED GATE COUNT'))return verifier;
  const old="n('<script type=\"text/plain\" data-elsewhere-app>')===26";
  const newValue="n('<script type=\"text/plain\" data-elsewhere-app>')===(html.includes('/* OMNI20:SCRIPT:START */')?27:26)";
  const revised=replaceOnce(verifier,old,newValue,'verify_x5.mjs');
  assert(revised.startsWith('#!/usr/bin/env node\n'),'Unexpected verifier shebang');
  return revised.replace('#!/usr/bin/env node\n','#!/usr/bin/env node\n// OMNI20 DEFERRED GATE COUNT\n');
}
const BIBLE_MARKER='## 2026-10-19 — OMNI20 unified navigation source integration';
function appendBible(){
  const name='Elsewhere_bible.md',old=fs.readFileSync(file(name),'utf8');
  if(old.includes(BIBLE_MARKER))return false;
  const entry=String.raw`

${BIBLE_MARKER}

- **Scope:** Additive OMNI20 source adapter and integration with existing standalone rebuild, no application data migration.
- **Change groups:** unified Explore/Write/Library/Atlas navigation; contextual command catalog and project switch; Library/Atlas/Settings/Vault grouping; local save feedback and accessibility.
- **Preserved:** v12/v13/v14 engines, Greyson EN/ES progress, draft data, source-linked writing, explicit canon, Dexter lock and backup transaction code.
- **Validation:** local standalone source parity and Node/Chromium synthetic checks; see docs/OMNI20-IMPLEMENTATION.md. The actual complete Elsewhere app and physical iPhone remain unverified.
- **Incoming branches:** arrival-first PR #2 and Infinite Door PR #3 remain separate and unmerged at preparation; optional commands activate only when installed.
- **Delivery:** uncommitted local source integration. No push, merge, deployed origin, or live user data change.
- **Remaining gates:** full original browser/device flows, existing suite, vault transaction and multi-tab checks, PR dependency integration.
`;
  atomic(name,old.trimEnd()+entry);return true;
}
function atomic(name,contents){
  const dest=file(name),temp=path.join(path.dirname(dest),`.omni20-${path.basename(name)}-${process.pid}.tmp`);
  fs.writeFileSync(temp,contents,'utf8');fs.renameSync(temp,dest);
}
async function main(){
  const base=preflight();
  if(checkOnly){
    compareMarkers(base.index,'STYLE');compareMarkers(base.index,'SCRIPT');
    assert(base.index.includes('<script type="text/plain" data-elsewhere-app>\n/* OMNI20:SCRIPT:START */'),'OMNI20 script is not behind Dexter gate');
    assert(fs.readFileSync(file('tools/verify_x5.mjs'),'utf8').includes('// OMNI20 DEFERRED GATE COUNT'),'Deferred app verifier not integrated');
    assert(base.rebuild.includes('// OMNI20 SOURCE LINK'),'Builder does not embed OMNI20');
    run(process.execPath,['tools/rebuild14.mjs','--check']);
    console.log('PASS - OMNI20 authored sources match standalone and builder');return;
  }
  const updatedIndex=insertIndex(base.index);
  const updatedRebuild=insertRebuild(base.rebuild);
  const oldVerifier=fs.readFileSync(file('tools/verify_x5.mjs'),'utf8');
  const updatedVerifier=insertVerifier(oldVerifier);
  const needsWrite=updatedIndex!==base.index||updatedRebuild!==base.rebuild||updatedVerifier!==oldVerifier;
  // A clean touched-file baseline is required for first installation. Never overwrite user edits.
  if(needsWrite){
    const dirty=(()=>{try{return run('git',['status','--porcelain','--','index.html','tools/rebuild14.mjs','tools/verify_x5.mjs'])}catch{return ''}})();
    assert(!dirty,'index.html or rebuild14.mjs already has local edits; preserve them and integrate manually.');
  }
  const prior=new Map([['index.html',base.index],['tools/rebuild14.mjs',base.rebuild],['tools/verify_x5.mjs',oldVerifier],['Elsewhere_bible.md',fs.readFileSync(file('Elsewhere_bible.md'),'utf8')]]);
  try{
    if(needsWrite){atomic('index.html',updatedIndex);atomic('tools/rebuild14.mjs',updatedRebuild);atomic('tools/verify_x5.mjs',updatedVerifier);}
    run(process.execPath,['tools/rebuild14.mjs']);
    compareMarkers(fs.readFileSync(file('index.html'),'utf8'),'STYLE');
    compareMarkers(fs.readFileSync(file('index.html'),'utf8'),'SCRIPT');
    run(process.execPath,['tools/rebuild14.mjs','--check']);
    if(!noTests){
      const out=run(process.execPath,['--test','tests/omni20.test.mjs']);
      assert(out.includes('# fail 0'),'OMNI20 test suite did not report zero failures');
      run(process.execPath,['tools/guard_reset14.mjs','--check']);
      run(process.execPath,['tools/verify_x5.mjs']);
      const all=fs.readdirSync(file('tests')).filter(p=>p.endsWith('.test.mjs')).sort().map(p=>path.join('tests',p));
      run(process.execPath,['--test',...all]);
    }
    appendBible();
    console.log(needsWrite?'OMNI20 installed and source-linked.':'OMNI20 already integrated; rebuilt and verified.');
    console.log('Working tree is uncommitted. No remote changes, branch, commit, or deployment were made.');
    console.log('Run all project checks and full-browser acceptance before any release.');
  }catch(err){
    if(needsWrite){
      for(const [name,content] of prior){try{atomic(name,content)}catch{console.error(`RESTORE FAILED: ${name}; original content may be in Git`);}}
      console.error('OMNI20 integration rolled back after a failed check.');
    }
    throw err;
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
