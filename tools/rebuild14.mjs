#!/usr/bin/env node
/* Source-linked standalone edition: index.html embeds v14 and arrival modules at known markers. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const html=path.join(root,'index.html');
if(!fs.existsSync(html)) throw Error('Missing canonical index.html');
let current=fs.readFileSync(html,'utf8');
const css=fs.readFileSync(path.join(root,'src/elsewhere14.css'),'utf8').trimEnd();
const js=fs.readFileSync(path.join(root,'src/elsewhere14.js'),'utf8').trimEnd();
const arrivalCss=fs.readFileSync(path.join(root,'src/elsewhere-arrival.css'),'utf8').trimEnd();
const arrivalJs=fs.readFileSync(path.join(root,'src/elsewhere-arrival.js'),'utf8').trimEnd();
const greetingJs=fs.readFileSync(path.join(root,'src/elsewhere-greeting.js'),'utf8').trimEnd();
const pathModule=p=>path.join(root,p);
function replace(kind,body,prefix='ELSEWHERE14'){
  const open=`/* ${prefix}:${kind}:START */`;
  const close=`/* ${prefix}:${kind}:END */`;
  const a=current.indexOf(open),b=current.indexOf(close);
  if(a<0||b<=a||current.indexOf(open,a+1)!==-1||current.indexOf(close,b+1)!==-1)throw Error(`Missing or duplicate build marker ${kind}`);
  current=current.slice(0,a+open.length)+'\n'+body+'\n'+current.slice(b);
}
replace('STYLE',css);replace('SCRIPT',js);
// OMNI20 SOURCE LINK: keep the additive UX adapter embedded in the standalone edition.
const omni20 = [
  ['STYLE','src/elsewhere-omni20.css'],
  ['SCRIPT','src/elsewhere-omni20.js'],
];
for(const [kind,filename] of omni20){
  const open=`/* OMNI20:${kind}:START */`;
  const close=`/* OMNI20:${kind}:END */`;
  const begin=current.indexOf(open),end=current.indexOf(close);
  if(begin<0||end<=begin||current.indexOf(open,begin+1)!==-1||current.indexOf(close,end+1)!==-1)
    throw Error(`Missing or duplicate OMNI20 markers ${kind}`);
  const contents=fs.readFileSync(path.join(root,filename),'utf8').trimEnd();
  current=current.slice(0,begin+open.length)+'\n'+contents+'\n'+current.slice(end);
}

replace('STYLE',arrivalCss,'ELSEWHERE15');replace('SCRIPT',greetingJs+'\n'+arrivalJs,'ELSEWHERE15');
for(const [path,prefix,kind] of [['src/elsewhere-infinite.css','INFINITE','STYLE'],['src/elsewhere-infinite-content.js','INFINITE','CONTENT'],['src/elsewhere-infinite-engine.js','INFINITE','ENGINE']])replace(kind,fs.readFileSync(pathModule(path),'utf8').trimEnd(),prefix);
if(process.argv.includes('--check')){
  const saved=fs.readFileSync(html,'utf8');
  if(saved!==current){console.error('Standalone index.html is out of sync with src/ modules. Run node tools/rebuild14.mjs.');process.exit(1)}
  console.log('PASS - standalone index matches source modules');
}else{fs.writeFileSync(html,current);console.log('Built standalone index.html')}
