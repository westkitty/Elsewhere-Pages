/* Elsewhere daily greeting: factual local-clock context, authored variety, no remote calendar calls. */
(() => {
  'use strict';

  const OPENINGS={
    morning:[
      'Morning{name}. The day has not decided what shape it will take.',
      'Good morning{name}. No need to arrive with a plan.',
      'Morning{name}. A little curiosity is enough to begin.',
      'Good morning{name}. You can start quietly and change direction later.',
      'Morning{name}. The page is here; it is not keeping score.',
      'Good morning{name}. Whatever is on your mind can come as it is.'
    ],
    afternoon:[
      'Good afternoon{name}. There is still room for a different direction.',
      'Afternoon{name}. No need to make a production of arriving.',
      'The afternoon is here{name}. Take the doorway that fits.',
      'Good afternoon{name}. An unfinished thought is welcome.',
      'Afternoon{name}. This hour can belong to something unexpected.',
      'Good afternoon{name}. You can begin in the middle of things.'
    ],
    evening:[
      'Good evening{name}. The day does not need a tidy ending.',
      'Evening{name}. You can put down the performance for a moment.',
      'Good evening{name}. There is room for quieter questions now.',
      'Evening{name}. The unfinished pieces can stay unfinished.',
      'Good evening{name}. Whatever happened today, you choose what comes next.',
      'Evening{name}. A small detour may be plenty.'
    ],
    night:[
      'Late tonight{name}, the page is still yours.',
      'Night has arrived{name}. No grand conclusions required.',
      'Good night{name}. You need not turn this into an assignment.',
      'It is late{name}. A thought can be left gently unfinished.',
      'Nighttime{name}. Seriousness is optional here.',
      'Late hours{name}. Even the strange ideas have somewhere to go.'
    ],
    late:[
      'It is after midnight{name}. You can arrive without explanation.',
      'The small hours are here{name}. Nothing needs solving on demand.',
      'Very early, or very late{name}. This space can follow your pace.',
      'The clock has crossed midnight{name}. The page does not mind.',
      'These quiet hours are yours{name}, however you use them.',
      'Still awake{name}? You need not justify the hour.'
    ]
  };
  const WEEKDAYS=[
    ['Sunday can be rest, work, play, or something else entirely.','Sunday leaves the shape of today up to you.','There is no single correct way to spend a Sunday.'],
    ['Monday need not become a list of obligations.','The week is opening, but you can enter it on your own terms.','Monday has arrived without a demand for reinvention.'],
    ['Tuesday has room for a new thread or an old one.','Nothing says Tuesday must be ordinary.','Tuesday offers no mandatory script.'],
    ['We are around the middle of the week; the direction is still negotiable.','Wednesday can hold an unfinished question.','It is Wednesday, not a deadline for figuring yourself out.'],
    ['Thursday can be a turning point without being a dramatic one.','There is space in Thursday for the unexpected.','Thursday is allowed to be more than anticipation of Friday.'],
    ['Friday does not require a completed checklist.','The week may be winding down; the questions can keep their own pace.','Friday can mean release, discovery, or simply another day.'],
    ['Saturday does not owe anyone a schedule.','It is Saturday; usefulness is not the only measure of a day.','Saturday can be light, demanding, or pleasantly peculiar.']
  ];
  const CLOSINGS=[
    'Want to follow a thought, a mood, or a complete surprise?',
    'You can choose the depth; you can also choose no questions.',
    'Bring what is real, or borrow a little strangeness.',
    'There is no prize for being productive here.',
    'Start where you actually are, not where a prompt thinks you should be.',
    'Reflection, play, a blank page: none of them needs permission.',
    'If the first doorway is wrong, take another.',
    'A half-formed idea is more than enough.',
    'We can make room for something ordinary or wonderfully odd.',
    'You do not have to explain yourself before beginning.',
    'A small detour counts as a destination.',
    'You may go deeper, go lighter, or go nowhere in particular.'
  ];
  const PERSON_LINES=[
    'If {person} belongs in today’s story, there is room for that too.',
    'You can bring {person} into the conversation—or leave this space entirely your own.',
    'Whatever is happening around {person}, your own direction still matters.',
    'A thought about {person} can come along, but it is not a requirement.'
  ];
  // Only fixed-date observances whose dates do not require a live feed, lunar
  // calendar or region-dependent shifting rules. No claimed news or weather.
  const OBSERVANCES={
    '01-01':'It is New Year’s Day. A new calendar page is not an order to reinvent yourself.',
    '02-14':'It is Valentine’s Day. Affection can take many forms, including taking time for yourself.',
    '03-14':'It is Pi Day. A small tribute to curiosity and delightful improbability.',
    '04-22':'It is Earth Day. Paying attention to the world is a kind of exploration.',
    '10-31':'It is Halloween. A little strangeness seems especially appropriate.',
    '12-31':'It is New Year’s Eve. You are allowed to leave the year with loose ends.'
  };
  const TEXT_LIMIT=48;
  const unique=items=>[...new Set(items)];
  const simpleName=value=>typeof value==='string'
    ?value.replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,TEXT_LIMIT)
    :'';
  function dayKey(date){
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  function validDate(iso){
    if(typeof iso!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
    const parts=iso.split('-').map(Number);
    const d=new Date(0);d.setFullYear(parts[0],parts[1]-1,parts[2]);d.setHours(12,0,0,0);
    return d.getFullYear()===parts[0]&&d.getMonth()===parts[1]-1&&d.getDate()===parts[2];
  }
  function sanitize(profile){
    const x=profile&&typeof profile==='object'&&!Array.isArray(profile)?profile:{};
    const dates=[],seen=new Set();
    if(Array.isArray(x.dates))for(const item of x.dates.slice(0,24)){
      if(!item||!validDate(item.date))continue;
      const label=simpleName(item.label);
      if(!label)continue;
      const annual=item.annual===true,signature=item.date+'|'+label+'|'+annual;
      if(seen.has(signature))continue;
      seen.add(signature);dates.push({date:item.date,label,annual});
      if(dates.length>=12)break;
    }
    return {
      enabled:x.enabled!==false,
      yourName:simpleName(x.yourName),
      personName:simpleName(x.personName),
      mentionPerson:x.mentionPerson===true,
      dates
    };
  }
  const hash=s=>{let n=2166136261;for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619)}return n>>>0};
  function pick(items,seed,history,field){
    const used=new Set((Array.isArray(history)?history:[]).slice(-5).map(e=>e&&e[field]).filter(Number.isInteger));
    const first=hash(seed)%items.length;
    for(let i=0;i<items.length;i++)if(!used.has((first+i)%items.length))return (first+i)%items.length;
    return first;
  }
  function generate(when=new Date(),preferences={},recent=[]){
    const d=when instanceof Date?new Date(when.getTime()):new Date(when);
    if(!Number.isFinite(d.getTime())){
      return {day:'',part:'unknown',eyebrow:'A moment for yourself',text:'Welcome to Elsewhere. You may begin anywhere.',signature:null,source:'clock-unavailable',mentionsPerson:false};
    }
    const p=sanitize(preferences),key=dayKey(d),parts=key.slice(5),day=d.getDate(),weekday=d.getDay(),hour=d.getHours();
    const part=hour<5?'late':hour<12?'morning':hour<17?'afternoon':hour<21?'evening':'night';
    const safeHistory=Array.isArray(recent)?recent.filter(h=>h&&h.day!==key).slice(-30):[];
    const intro=pick(OPENINGS[part],key+part+'intro',safeHistory,'intro');
    const ending=pick(CLOSINGS,key+part+'end',safeHistory,'ending');
    const weekdayChoice=hash(key+'weekday')%WEEKDAYS[weekday].length;
    let anchor=WEEKDAYS[weekday][weekdayChoice],source='weekday';
    const personal=p.dates.find(x=>x.annual?x.date.slice(5)===parts:x.date===key);
    if(personal){
      anchor='You marked today for '+personal.label+'. You decide what that means here.';
      source='personal-date';
    }else if(Object.prototype.hasOwnProperty.call(OBSERVANCES,parts)){
      anchor=OBSERVANCES[parts];source='observance';
    }else if(day===1){
      anchor='The first day of a new month is here. No clean slate is required.';
      source='month-boundary';
    }else if(day===new Date(d.getFullYear(),d.getMonth()+1,0).getDate()){
      anchor='It is the last day of the month. Loose ends are allowed.';
      source='month-boundary';
    }
    const n=p.yourName?', '+p.yourName:'';
    const opening=OPENINGS[part][intro].replace('{name}',n);
    const days=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),day)/86400000);
    const mentionsPerson=!!(p.mentionPerson&&p.personName&&days%7===0);
    const personLine=mentionsPerson?PERSON_LINES[hash(key+'person')%PERSON_LINES.length].replace('{person}',p.personName):'';
    const text=[opening,anchor,personLine,CLOSINGS[ending]].filter(Boolean).join(' ');
    const eyebrow=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+' · '+(part==='late'?'After midnight':part.charAt(0).toUpperCase()+part.slice(1));
    return {day:key,part,eyebrow,text,signature:{day:key,intro,ending},source,mentionsPerson};
  }
  globalThis.ElsewhereGreeting=Object.freeze({version:1,generate,sanitize,validDate,dayKey});
})();
