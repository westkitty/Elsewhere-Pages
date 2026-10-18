#!/usr/bin/env node
/* Protect the password lock and sibling apps when clearing Elsewhere's creative workspace. */
import fs from 'node:fs';
import path from 'node:path';
const index=path.resolve(import.meta.dirname,'..','index.html');
if(!fs.existsSync(index))throw Error('Missing canonical index.html');
let s=fs.readFileSync(index,'utf8');
const legacy="for(const key of adapter.keys?.()||[])if(String(key).startsWith('elsewhere:'))adapter.removeItem(key);";
const safe="for(const key of adapter.keys?.()||[])if(String(key).startsWith('elsewhere:v13:project:'))adapter.removeItem(key);";
if(s.includes(legacy)){
  if(!process.argv.includes('--apply'))throw Error('Unsafe reset still deletes password settings and sibling keys. Run node tools/guard_reset14.mjs --apply');
  if(s.split(legacy).length!==2)throw Error('Unexpected duplicate reset signature. No changes made.');
  s=s.replace(legacy,safe);
  fs.writeFileSync(index,s);
  console.log('Scoped reset: only Elsewhere v13 project keys and explicit core/index/legacy keys are reset.');
}else if(s.includes(safe))console.log('PASS - reset preserves password and unrelated browser storage');
else throw Error('Missing expected reset implementation. Inspect v13 before changing it.');
