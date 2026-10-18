import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const src=fs.readFileSync(new URL('../tools/guard_reset14.mjs',import.meta.url),'utf8');
test('reset guard safely scopes deletion and is idempotent',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'elsewhere-guard-'));
 try{
  fs.mkdirSync(path.join(dir,'tools'));
  fs.writeFileSync(path.join(dir,'tools/guard_reset14.mjs'),src);
  const file=path.join(dir,'index.html');
  const broad="for(const key of adapter.keys?.()||[])if(String(key).startsWith('elsewhere:'))adapter.removeItem(key);";
  fs.writeFileSync(file,'<html><script>'+broad+'</script></html>');
  assert.throws(()=>execFileSync(process.execPath,[path.join(dir,'tools/guard_reset14.mjs'),'--check'],{encoding:'utf8',stdio:'pipe'}));
  execFileSync(process.execPath,[path.join(dir,'tools/guard_reset14.mjs'),'--apply']);
  const changed=fs.readFileSync(file,'utf8');
  assert.ok(!changed.includes(broad));
  assert.ok(changed.includes("startsWith('elsewhere:v13:project:')"));
  execFileSync(process.execPath,[path.join(dir,'tools/guard_reset14.mjs'),'--check']);
  execFileSync(process.execPath,[path.join(dir,'tools/guard_reset14.mjs'),'--apply']);
  assert.equal(fs.readFileSync(file,'utf8'),changed,'second invocation must not alter file');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
