import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/elsewhere-greeting.js',import.meta.url),'utf8');
const sandbox={Date,Math};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'elsewhere-greeting.js'});
const api=sandbox.ElsewhereGreeting;
const localDate=(y,m,d,h=9)=>new Date(y,m-1,d,h,15,0);

test('standalone local clock creates the correct date and all five dayparts',()=>{
  const examples=[[2,'late'],[9,'morning'],[14,'afternoon'],[19,'evening'],[22,'night']];
  for(const [hour,part] of examples){
    const g=api.generate(localDate(2026,10,19,hour));
    assert.equal(g.part,part);
    assert.equal(g.day,'2026-10-19');
    assert.match(g.eyebrow,/Monday, October 19, 2026/);
    assert.ok(g.text.length>110);
    assert.equal(g.source,'weekday');
  }
});

test('greetings change across consecutive dates while remaining stable for the same time and day',()=>{
  let old='';
  for(let i=0;i<400;i++){
    const date=new Date(2026,0,1+i,9,0);
    const first=api.generate(date),again=api.generate(date);
    assert.equal(first.text,again.text);
    assert.notEqual(first.text,old,'consecutive day '+first.day+' repeated');
    old=first.text;
  }
});

test('repetition history guards near-identical openings and endings for the same daypart',()=>{
  const history=[],intros=[],endings=[];
  for(let n=0;n<6;n++){
    const row=api.generate(new Date(2026,0,4+n*7,9),{},history);
    intros.push(row.signature.intro);endings.push(row.signature.ending);
    history.push({...row.signature,part:row.part});
  }
  assert.equal(new Set(intros).size,6);
  assert.equal(new Set(endings).size,6);
});

test('only fixed, verifiable observances appear and personal date takes priority',()=>{
  assert.match(api.generate(localDate(2026,10,31)).text,/Halloween/);
  assert.match(api.generate(localDate(2026,12,31)).text,/New Year’s Eve/);
  assert.doesNotMatch(api.generate(localDate(2026,10,19)).text,/Halloween|Earth Day|Valentine/);
  assert.match(api.generate(localDate(2026,11,1)).text,/first day of a new month/);
  const saved={dates:[{date:'2024-10-19',label:'Our chosen day',annual:true}]};
  const onDay=api.generate(localDate(2026,10,19),saved);
  assert.match(onDay.text,/Our chosen day/);
  assert.equal(onDay.source,'personal-date');
  assert.doesNotMatch(api.generate(localDate(2026,10,20),saved).text,/Our chosen day/);
  const once=api.generate(localDate(2026,10,19),{dates:[{date:'2026-10-19',label:'A one-time gathering',annual:false}]});
  assert.match(once.text,/A one-time gathering/);
  assert.doesNotMatch(api.generate(localDate(2027,10,19),{dates:[{date:'2026-10-19',label:'A one-time gathering',annual:false}]}).text,/A one-time gathering/);
});

test('calendar dates are validated including leap years, annual recurrence and bad input',()=>{
  assert.equal(api.validDate('2024-02-29'),true);
  assert.equal(api.validDate('2025-02-29'),false);
  assert.equal(api.validDate('2026-13-04'),false);
  assert.equal(api.validDate('2026-10-19'),true);
  assert.equal(api.validDate('2026-10-19T00:00:00Z'),false);
  const p=api.sanitize({dates:[
    {date:'2026-10-19',label:'Celebration',annual:true},
    {date:'2026-10-19',label:'Celebration',annual:true},
    {date:'2026-02-30',label:'Impossible',annual:false},
    {date:'2026-10-21',label:'Another date',annual:false}
  ]});
  assert.equal(p.dates.length,2);
  assert.equal(p.dates[0].annual,true);
});

test('mentions Greyson occasionally only after explicit opt-in',()=>{
  const setting={personName:'Greyson',mentionPerson:true};
  let mentions=0;
  for(let day=0;day<365;day++){
    const date=new Date(2026,0,1+day,9);
    const result=api.generate(date,setting);
    if(result.mentionsPerson)mentions++;
    assert.equal(result.mentionsPerson,result.text.includes('Greyson'));
    assert.equal(api.generate(date,{personName:'Greyson',mentionPerson:false}).mentionsPerson,false);
    assert.doesNotMatch(api.generate(date,{}).text,/Greyson/);
  }
  assert.ok(mentions>=30 && mentions<=90,'mentions='+mentions);
});

test('profile sanitization drops unknown private fields and never interpolates markup',()=>{
  const profile=api.sanitize({
    enabled:false,yourName:'  <script>Hello</script>  ',
    personName:' Greyson\n ',
    mentionPerson:true,
    writing:'PRIVATE JOURNAL',
    token:'SHOULD NOT SURVIVE',
    dates:[{date:'2026-10-19',label:'<img src=x>',annual:true,secret:'not retained'}]
  });
  assert.equal(profile.enabled,false);
  assert.equal(profile.personName,'Greyson');
  assert.equal(profile.writing,undefined);
  assert.equal(profile.token,undefined);
  assert.equal(profile.dates[0].secret,undefined);
  assert.ok(!profile.yourName.includes('<'));
  assert.ok(!profile.dates[0].label.includes('>'));
  assert.equal(api.generate('unparseable date').source,'clock-unavailable');
});

test('greeting is embedded before Arrival behind one pre-existing deferred script',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const arrival=fs.readFileSync(new URL('../src/elsewhere-arrival.js',import.meta.url),'utf8');
  const rebuild=fs.readFileSync(new URL('../tools/rebuild14.mjs',import.meta.url),'utf8');
  assert.ok(html.includes(source.trimEnd()+'\n'+arrival.trimEnd()));
  assert.ok(rebuild.includes("replace('SCRIPT',greetingJs+'\\n'+arrivalJs,'ELSEWHERE15')"));
  assert.ok(arrival.includes('const GREETING_KEY='));
  assert.ok(arrival.includes('loadGreeting();installUI();installSettings()'));
  assert.ok(arrival.includes("const greet=node('aside'"));
  assert.ok(arrival.includes('e15GreetingPersonEnabled'));
  assert.ok(arrival.includes('Erase greeting personalization'));
  assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(arrival,/localStorage\.clear\(/);
});
