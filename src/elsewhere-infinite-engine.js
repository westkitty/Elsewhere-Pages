/* Elsewhere Infinite Door: quiet, local-only encounter orchestration. */
(()=>{'use strict';
 const KEY='elsewhere:infinite:v1',LIB=globalThis.ElsewhereInfiniteContent;
 if(!LIB)return;
 const types=Object.keys(LIB.forms),all=types.flatMap(k=>LIB.forms[k]);
 const allowedCats=new Set(['notice','day','unearth','reframe','wander','imagine','learn','shadow','sacred']);
 const defaults=()=>({version:1,serendipity:'unexpected',intensity:'medium',timeAware:true,hiddenDoors:true,callbacks:false,exclude:[],recent:[],dismissed:[],seen:[],shown:0,trail:null,trailStep:0,adventure:null,adventureStep:0,adventureChoices:[],lastGuest:'',guestHistory:[],suppression:[],lastDay:'',observatory:{encounters:0,formats:[],categories:[],skipped:0},mode:'auto'});
 const uniq=a=>[...new Set(a)];
 const day=()=>new Date().toLocaleDateString('en-CA');
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
 const safeInt=(n,max)=>Number.isInteger(n)?Math.max(0,Math.min(max,n)):0;
 function sanitize(raw){const d=defaults();if(!raw||raw.version!==1)return d;const s=raw;
  d.serendipity=['familiar','unexpected','wild'].includes(s.serendipity)?s.serendipity:d.serendipity;
  d.intensity=['light','medium','deep'].includes(s.intensity)?s.intensity:d.intensity;
  d.mode=['auto','off'].includes(s.mode)?s.mode:'auto';
  for(const k of ['timeAware','hiddenDoors','callbacks'])d[k]=s[k]===true;
  d.exclude=Array.isArray(s.exclude)?uniq(s.exclude.filter(v=>typeof v==='string'&&v.length<40)).slice(0,40):[];
  for(const [k,n] of [['recent',36],['dismissed',100],['seen',400]])d[k]=Array.isArray(s[k])?uniq(s[k].filter(v=>typeof v==='string'&&v.length<110)).slice(-n):[];
  d.shown=safeInt(s.shown,1000000);d.trail=LIB.trails.some(x=>x.id===s.trail)?s.trail:null;d.trailStep=safeInt(s.trailStep,3);
  d.adventure=LIB.adventures.some(x=>x.id===s.adventure)?s.adventure:null;d.adventureStep=safeInt(s.adventureStep,2);
  d.adventureChoices=Array.isArray(s.adventureChoices)?s.adventureChoices.slice(0,3).filter(x=>Number.isInteger(x)&&x>=0&&x<=1):[];
  d.lastGuest=typeof s.lastGuest==='string'?s.lastGuest.slice(0,100):'';
  d.guestHistory=Array.isArray(s.guestHistory)?s.guestHistory.filter(x=>typeof x==='string').slice(-15):[];
  d.suppression=Array.isArray(s.suppression)?s.suppression.filter(x=>['too-similar','too-intense','not-interesting'].includes(x)).slice(-20):[];
  if(s.observatory&&typeof s.observatory==='object'){d.observatory.encounters=safeInt(s.observatory.encounters,1000000);for(const k of ['formats','categories'])d.observatory[k]=Array.isArray(s.observatory[k])?s.observatory[k].filter(x=>typeof x==='string'&&x.length<40).slice(-120):[];d.observatory.skipped=safeInt(s.observatory.skipped,1000000);}
  return d;
 }
 let data=defaults(),ready=false,current=null,root=null,preview=null,live=false;
 function read(){try{data=sanitize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{data=defaults()}}
 function write(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
 const el=(name,text='',cls='')=>{const x=document.createElement(name);x.textContent=text;if(cls)x.className=cls;return x};
 const btn=(text,cb,cls='')=>{const x=el('button',text,cls);x.type='button';x.addEventListener('click',cb);return x};
 const announce=t=>{const x=document.getElementById('infiniteAnnounce');if(x)x.textContent=t};
 const recentSet=()=>new Set(data.recent.slice(-24));
 function eligible(item){if(data.exclude.some(x=>item.tags?.includes(x)||item.type===x||item.category===x))return false;if(data.intensity==='light'&&item.intensity==='deep')return false;return true}
 function score(item,i=0){const r=recentSet(),frequency=data.observatory.formats.slice(-30).filter(x=>x===item.type).length;
 const categoryRepeats=data.observatory.categories.slice(-12).filter(x=>x===item.category).length;
 const recentTags=data.recent.slice(-12).flatMap(x=>all.find(y=>y.id===x)?.tags||[]);
 const overlap=(item.tags||[]).filter(t=>recentTags.includes(t)).length;
 const seen=data.seen.includes(item.id);
 return (seen?-150:0)+(r.has(item.id)?-200:0)-frequency*13-categoryRepeats*5-overlap*8
 +((hash(item.id+'|'+data.shown+'|'+i)%37)-18)
 +(data.serendipity==='wild'&&['casefile','map','microfiction','play'].includes(item.type)?16:0)
 +(data.serendipity==='familiar'&&['reflection','field','letter'].includes(item.type)?13:0)
 +(data.timeAware&&new Date().getHours()>=20&&['reflection','ritual','field'].includes(item.type)?9:0);
 }
 function choose(category=null){let candidates=all.filter(eligible);if(category&&allowedCats.has(category))candidates=candidates.filter(x=>x.category===category);if(!candidates.length)candidates=all.filter(x=>!data.exclude.includes(x.type)&&!data.exclude.includes(x.category));if(!candidates.length)return null;
 const scored=candidates.map((x,i)=>({x,s:score(x,i)})).sort((a,b)=>b.s-a.s);return scored[0].x;}
 function track(item){if(!item)return;data.seen=uniq([...data.seen,item.id]).slice(-400);data.recent=[...data.recent,item.id].slice(-36);data.shown++;data.observatory.encounters++;data.observatory.formats.push(item.type);data.observatory.categories.push(item.category);data.observatory.formats=data.observatory.formats.slice(-120);data.observatory.categories=data.observatory.categories.slice(-120);write();}
 function prompt(text,category='imagine',origin='infinite'){const legacy=globalThis.ElsewhereLegacy;if(!legacy?.transitionTo)return;const p={id:origin+'-'+hash(text).toString(36)+'-'+Date.now().toString(36),c:allowedCats.has(category)?category:'imagine',text,guides:[],index:null,time:Date.now(),sourceKind:'side',lens:null};void legacy.transitionTo(p).then(()=>globalThis.Elsewhere14?.setView?.('write'));}
 function actions(row){return el('div','','inf-actions')}
 function view(item){if(!root||!item)return;current=item;root.hidden=false;root.replaceChildren();root.append(el('p','AN ENCOUNTER FROM ELSEWHERE','inf-eyebrow'),el('h2',item.type.replace(/(^.|-.)/g,x=>x.toUpperCase()),'inf-title'),el('p',item.text,'inf-story'));
  const bar=actions();
  bar.append(btn('Write from this',()=>prompt(item.text,item.category,'encounter')));
  bar.append(btn('Another kind of encounter',()=>open()));
  if(data.hiddenDoors&&item.door){const details=el('details','','inf-door');details.append(el('summary',item.doorLabel||'There is something else here'));details.append(el('p',item.door));details.append(btn('Follow this thread',()=>prompt(item.door,item.category,'door')));root.append(details);}
  const transform=el('details','','inf-transform');transform.append(el('summary','Change the perspective'));
  const tbar=actions(transform);
  for(const [id,text] of Object.entries(LIB.transformations)){const b=btn(id[0].toUpperCase()+id.slice(1),()=>{if(id==='different'){open();return;}const next=text+' Original seed: '+item.text;prompt(next,item.category,'shift');});tbar.append(b)}
  transform.append(tbar);root.append(transform);
  const rejection=el('details','','inf-reject');rejection.append(el('summary','Not for me'));
  const reasons=actions();for(const [id,label] of [['too-similar','Too similar'],['too-intense','Too intense'],['not-interesting','Not interesting']])reasons.append(btn(label,()=>{data.suppression.push(id);data.dismissed.push(item.id);if(id==='too-intense')data.intensity='light';write();open();}));
  rejection.append(reasons);bar.append(rejection);
  bar.append(btn('Close',()=>{root.hidden=true;announce('Encounter closed')}));
  root.append(bar);root.scrollIntoView({block:'nearest',behavior:'auto'});announce('New '+item.type+' encounter');
 }
 function open(category=null){if(!ready)return;const chosen=choose(category);if(!chosen){announce('No available encounter under these settings.');return;}track(chosen);view(chosen)}
 function collide(){const pick=LIB.collisions[hash('collision'+data.shown)%LIB.collisions.length];const text='A curiosity collision: '+pick[0]+' meets '+pick[1]+'. '+pick[2]+' What new question appears between them?';const item={id:'collision-'+data.shown,type:'collision',category:'wander',text,tags:['curiosity','imagination'],door:'What makes this connection genuinely useful, rather than merely strange?',doorLabel:'Examine the connection'};track(item);view(item)}
 function physical(){const p=LIB.physical[hash('physical'+data.shown)%LIB.physical.length];const item={id:'physical-'+data.shown,type:'observation',category:'notice',text:p.question,tags:['curiosity'],alternate:p.alternate};track(item);view(item);root.insertBefore(btn('Use imagination instead',()=>prompt(p.alternate,'notice','physical-alt')),root.lastChild);}
 function startTrail(id){const t=LIB.trails.find(x=>x.id===id);if(!t)return;data.trail=id;data.trailStep=0;write();renderTrail();}
 function renderTrail(){const t=LIB.trails.find(x=>x.id===data.trail);if(!t)return;root.hidden=false;root.replaceChildren(el('p','THE UNFINISHED TRAIL','inf-eyebrow'),el('h2',t.title,'inf-title'),el('p',t.steps[data.trailStep],'inf-story'));
 const row=actions();row.append(btn('Write from this',()=>prompt(t.steps[data.trailStep],t.kind,'trail')));
 row.append(btn(data.trailStep===3?'Finish the trail':'Continue the trail',()=>{if(data.trailStep===3){data.trail=null;data.trailStep=0;root.hidden=true}else{data.trailStep++;renderTrail()}write()}));
 row.append(btn('Pause',()=>{root.hidden=true;announce('Trail paused. It will be here when you return.')}));
 root.append(row);announce('Trail step '+(data.trailStep+1)+' of 4');
 }
 function startAdventure(id){const a=LIB.adventures.find(x=>x.id===id);if(!a)return;data.adventure=id;data.adventureStep=0;data.adventureChoices=[];write();renderAdventure()}
 function renderAdventure(){const a=LIB.adventures.find(x=>x.id===data.adventure);if(!a)return;const step=a.steps[data.adventureStep];root.hidden=false;root.replaceChildren(el('p','A TINY ADVENTURE · '+(data.adventureStep+1)+'/3','inf-eyebrow'),el('h2',a.title,'inf-title'),el('p',step.scene,'inf-story'));
 const row=actions();step.options.forEach((answer,i)=>row.append(btn(answer,()=>{data.adventureChoices.push(i);if(data.adventureStep===2){const text=a.steps.map((s,j)=>s.scene+' Choice: '+s.options[data.adventureChoices[j]]).join(' ');data.adventure=null;data.adventureStep=0;data.adventureChoices=[];write();prompt('Your story so far: '+text+' What happens afterward?',a.category,'adventure');root.hidden=true;}else{data.adventureStep++;write();renderAdventure();}})));
 row.append(btn('Pause adventure',()=>{root.hidden=true;write()}));root.append(row);
 }
 function menu(){root.hidden=false;root.replaceChildren(el('p','ELSEWHERE / THE INFINITE DOOR','inf-eyebrow'),el('h2','What will you find?','inf-title'),el('p','Pick a door—or leave the choice to chance.','inf-muted'));const grid=el('div','','inf-menu');
 grid.append(btn('Surprise me',()=>open()),btn('Curiosity collision',collide),btn('Something in the room',physical));
 for(const t of LIB.trails)grid.append(btn(data.trail===t.id?'Resume · '+t.title:'Trail · '+t.title,()=>{if(data.trail===t.id)renderTrail();else startTrail(t.id)}));
 for(const a of LIB.adventures)grid.append(btn(data.adventure===a.id?'Resume · '+a.title:'Adventure · '+a.title,()=>{if(data.adventure===a.id)renderAdventure();else startAdventure(a.id)}));
 root.append(grid,btn('Close',()=>{root.hidden=true}));
 }
 function settings(){const host=document.getElementById('settingsDialog')?.querySelector('.panel');if(!host||document.getElementById('infSettings'))return;
 const section=el('section','','inf-settings');section.id='infSettings';section.append(el('h3','Infinite Door'),el('p','Local-only encounter history and editorial choices. No reading of saved journal text.','inf-muted'));
 const select=(label,key,values)=>{const line=el('label',label,'inf-setting');const input=document.createElement('select');for(const [v,t] of values){const o=el('option',t);o.value=v;input.append(o)}input.value=data[key];input.addEventListener('change',()=>{data[key]=input.value;write()});line.append(input);section.append(line)};
 select('Discovery',['mode'][0],[['auto','On'],['off','Off']]);
 select('Serendipity','serendipity',[['familiar','Familiar'],['unexpected','Unexpected'],['wild','Wild']]);
 select('Intensity','intensity',[['light','Light'],['medium','Medium'],['deep','Deep']]);
 for(const [k,label] of [['hiddenDoors','Occasional hidden doors'],['timeAware','Time-aware editorial selection'],['callbacks','Offer opt-in callbacks to earlier prompts']]){const line=el('label',label,'inf-setting');const input=document.createElement('input');input.type='checkbox';input.checked=data[k];input.addEventListener('change',()=>{data[k]=input.checked;write()});line.prepend(input);section.append(line)}
 const diag=el('p','','inf-muted');diag.id='infDiagnostics';const refresh=()=>{diag.textContent='Encounter receipts: '+data.observatory.encounters+' · Forms experienced: '+uniq(data.observatory.formats).length+'/'+types.length+' · Last 120 encounters retained as small labels only.'};refresh();
 section.append(btn('View freshness',refresh),btn('Erase discovery history',()=>{if(!confirm('Erase local encounter history and trails? Journal entries and original prompt progress stay untouched.'))return;const keep={mode:data.mode,serendipity:data.serendipity,intensity:data.intensity,hiddenDoors:data.hiddenDoors,timeAware:data.timeAware,callbacks:data.callbacks,exclude:data.exclude};data=Object.assign(defaults(),keep);write();refresh();}),diag);
 host.append(section);
 }
 function install(){if(ready)return true;const legacy=globalThis.ElsewhereLegacy;if(!legacy?.generateNext||!globalThis.Elsewhere14?.initialized||!document.getElementById('ideaStage'))return false;
 ready=true;read();const stage=document.getElementById('ideaStage');root=el('section','','inf-panel');root.id='infPanel';root.hidden=true;root.setAttribute('aria-label','Elsewhere encounter');stage.prepend(root);
 const toolbar=el('div','','inf-toolbar');toolbar.append(btn('Open a different door',menu,'inf-hero-btn'));stage.prepend(toolbar);
 const liveRegion=el('div','','inf-announce');liveRegion.id='infiniteAnnounce';liveRegion.setAttribute('role','status');liveRegion.setAttribute('aria-live','polite');stage.prepend(liveRegion);settings();
 window.addEventListener('storage',e=>{if(e.key===KEY){read();}});
 window.addEventListener('elsewhere:prompt',e=>{const p=e.detail;if(!p||typeof p!=='object')return;const type=p.c||'notice';data.observatory.categories.push(type);data.observatory.categories=data.observatory.categories.slice(-120);write()});
 if(data.mode==='off')toolbar.hidden=true;
 return true;
 }
 globalThis.ElsewhereInfinite=Object.freeze({version:1,install,open,menu,collide,physical,choose,sanitize,rank:(a)=>a?.map(x=>({id:x.id,score:score(x)})).sort((a,b)=>b.score-a.score),getState:()=>JSON.parse(JSON.stringify(data)),contentCounts:()=>({encounters:all.length,collisions:LIB.collisions.length,trails:LIB.trails.length,adventures:LIB.adventures.length})});
 if(typeof document!=='undefined'){if(!install()){let tries=0;const tryAgain=()=>{if(install())return;if(++tries<35)setTimeout(tryAgain,90)};tryAgain()}}
})();