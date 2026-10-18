import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/elsewhere-arrival.js',import.meta.url),'utf8');
const sandbox={Date,Uint8Array,TextEncoder,TextDecoder};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'elsewhere-arrival.js'});
const api=sandbox.ElsewhereArrival;
const sample=(date,traits,source='choice')=>({day:date,at:new Date(date+'T12:00:00Z').getTime(),source,traits});

test('arrival understands a short sentence but never makes therapy claims',()=>{
  assert.equal(api.pickMode('I just want something silly and FUN'), 'play');
  assert.equal(api.pickMode('I had a rough argument in my relationship'), 'talk');
  assert.equal(api.pickMode('I want some quiet and rest'), 'quiet');
  assert.equal(api.pickMode('I have no idea'), 'surprise');
  assert.equal(api.pickMode('I just want a blank page to write'), 'write');
  assert.equal(api.pickMode('I want to look at my patterns and shadow'), 'shadow');
  assert.equal(api.pickMode('Why do stars work this way?'), 'learn');
});

test('text analysis extracts only bounded themes and requires deliberate keywords',()=>{
  const result=api.extractThemes('I love my friend. I want to be kind and listen, and draw art and write a story.');
  assert.ok(result.includes('care'));
  assert.ok(result.includes('creativity'));
  assert.ok(result.length<=3);
  assert.equal(api.extractThemes('I am here.').length,0);
});

test('figure matching refuses to label someone from one day, even after many observations',()=>{
  const oneDay=Array.from({length:9},()=>sample('2026-10-14',['play','creativity','curiosity']));
  assert.equal(api.rankEcho(oneDay,['music','fiction']),null);
});

test('figure comparison stays category-bound and is explicitly a playful analogy',()=>{
  const events=[
    sample('2026-10-11',['curiosity','imagination','focus']),
    sample('2026-10-12',['curiosity','imagination','focus']),
    sample('2026-10-13',['curiosity','imagination','focus'])
  ];
  assert.equal(api.rankEcho(events,[]),null);
  const result=api.rankEcho(events,['history']);
  assert.equal(result.name,'Ada Lovelace');
  assert.equal(result.category,'history');
  assert.ok(result.matches.length>=2);
});

test('two days can qualify after multiple distinct user observations',()=>{
  const events=[
    sample('2026-10-11',['play','creativity','courage']),
    sample('2026-10-11',['play','creativity'],'writing'),
    sample('2026-10-12',['play','creativity','courage']),
    sample('2026-10-12',['play','courage'],'writing'),
    sample('2026-10-12',['play','creativity'],'writing')
  ];
  assert.equal(api.rankEcho(events,['music']).name,'Freddie Mercury');
});

test('stored preferences are schema-validated and do not contain raw journal text',()=>{
  const bad=api.sanitize({version:1,settings:{checkin:'invalid',matching:false,writing:true,reveal:'invalid',categories:['music','__proto__','music']},events:[
    {at:Date.now(),source:'writing',traits:['care','BAD','creativity'],text:'PRIVATE JOURNAL CONTENT',day:'yesterday'}
  ],lastMode:'danger'});
  assert.equal(bad.settings.checkin,'daily');
  assert.equal(bad.settings.writing,false);
  assert.equal(bad.settings.reveal,'weekly');
  assert.deepEqual(Array.from(bad.settings.categories),['music']);
  assert.equal(bad.lastMode,'surprise');
  assert.equal(bad.events.length,1);
  assert.equal(bad.events[0].text,undefined);
  assert.deepEqual(Array.from(bad.events[0].traits),['care','creativity']);
});

test('writing analysis is opt-in and performed only after successful save',()=>{
  const v14=fs.readFileSync(new URL('../src/elsewhere14.js',import.meta.url),'utf8');
  assert.match(source,/if\(!data\.settings\.matching\|\|!data\.settings\.writing\)return/);
  assert.match(v14,/if\(writingPersisted\(result\)\)try\{globalThis\.dispatchEvent\(new CustomEvent\('elsewhere:response-saved'/);
  assert.match(source,/data\.settings\.writing=p\.writing===true&&d\.settings\.matching/);
  assert.match(source,/data\.events\.push\(\{at:Date\.now\(\),day:today,source,traits/);
});

test('standalone builds preserve gated boot, original v12 prompt engine and source markers',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const style=fs.readFileSync(new URL('../src/elsewhere-arrival.css',import.meta.url),'utf8');
  assert.ok(html.includes(source.trimEnd()));
  assert.ok(html.includes(style.trimEnd()));
  assert.ok(html.includes('window.__elsewhereArrivalDefer=true'));
  assert.ok(html.includes('chooseArrivalPath:(key)=>'));
  assert.ok(html.includes('<script type="text/plain" data-elsewhere-app>'));
  assert.ok(html.includes("const DEFAULT = 'Dexter'"));
  assert.ok(html.includes("if(!window.__elsewhereArrivalDefer)"));
  assert.match(source,/showWelcome\(\)/);
  assert.match(source,/Change direction/);
  assert.match(source,/Skip — just give me something/);
  assert.match(source,/Erase matching history/);
  assert.match(source,/Offer occasional figure comparisons/);
});
