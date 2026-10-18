#!/usr/bin/env node
/* Source-linked standalone edition: index.html embeds both modules at known markers. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const html=path.join(root,'index.html');
if(!fs.existsSync(html)) throw Error('Missing canonical index.html');
let current=fs.readFileSync(html,'utf8');
const css=fs.readFileSync(path.join(root,'src/elsewhere14.css'),'utf8').trimEnd();
const js=fs.readFileSync(path.join(root,'src/elsewhere14.js'),'utf8').trimEnd();
function replace(kind,body){
  const open=`/* ELSEWHERE14:${kind}:START */`;
  const close=`/* ELSEWHERE14:${kind}:END */`;
  const a=current.indexOf(open),b=current.indexOf(close);
  if(a<0||b<=a||current.indexOf(open,a+1)!==-1||current.indexOf(close,b+1)!==-1)throw Error(`Missing or duplicate build marker ${kind}`);
  current=current.slice(0,a+open.length)+'\n'+body+'\n'+current.slice(b);
}
replace('STYLE',css);replace('SCRIPT',js);
if(process.argv.includes('--check')){
  const saved=fs.readFileSync(html,'utf8');
  if(saved!==current){console.error('Standalone index.html is out of sync with src/ modules. Run node tools/rebuild14.mjs.');process.exit(1)}
  console.log('PASS - standalone index matches source modules');
}else{fs.writeFileSync(html,current);console.log('Built standalone index.html')}
