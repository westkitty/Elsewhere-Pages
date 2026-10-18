#!/usr/bin/env node
/* Source-integrity preflight for the standalone branch. This is not browser E2E. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fail(message){console.error('BLOCKED - '+message);process.exitCode=1}
const file=path.join(root,'index.html');
if(!fs.existsSync(file)){
 fail('canonical index.html is absent. Run this in a complete feature-branch checkout; isolated-source tests alone do not prove the app.');
 process.exit();
}
const html=fs.readFileSync(file,'utf8'),source=fs.readFileSync(path.join(root,'src/elsewhere14.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/elsewhere14.css'),'utf8');
const n=s=>(html.split(s).length-1);
const signatures={
  'Dexter lock is present':n('id="elsewhereGate"')===1&&html.includes("const DEFAULT = 'Dexter'"),
  'Greyson v12/v13 bridge is present':html.includes('greysonLanguage')&&html.includes('greysonDexter'),
  'v14 scripts stay deferred until unlock':n('<script type="text/plain" data-elsewhere-app>')===19,
  'arrival source module present':n('/* ELSEWHERE15:SCRIPT:START */')===1&&n('/* ELSEWHERE15:SCRIPT:END */')===1,
  'arrival style module present':n('/* ELSEWHERE15:STYLE:START */')===1&&n('/* ELSEWHERE15:STYLE:END */')===1,
  'single source module':n('/* ELSEWHERE14:SCRIPT:START */')===1&&n('/* ELSEWHERE14:SCRIPT:END */')===1,
  'single style module':n('/* ELSEWHERE14:STYLE:START */')===1&&n('/* ELSEWHERE14:STYLE:END */')===1,
  'source JS is in current build':html.includes(source.trimEnd()),
  'source CSS is in current build':html.includes(css.trimEnd()),
  'unsafe broad reset absent':!html.includes("if(String(key).startsWith('elsewhere:'))adapter.removeItem(key)"),
  'new snapshot integrity check':source.includes('durableRestoreContent(hydrated.state)'),
  'Atlas editor is opt-in':source.includes("arrange.setAttribute('aria-pressed'"),
  'library navigation is bounded':source.includes('LIBRARY_PAGE_SIZE = 24')
};
for(const [name,ok] of Object.entries(signatures)){console.log(`${ok?'PASS':'FAIL'} - ${name}`);if(!ok)process.exitCode=1}
if(process.exitCode)console.log('Release BLOCKED; inspect before staging or merging.');
