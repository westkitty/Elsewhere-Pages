/* Elsewhere Arrival & Quiet Echoes: local, consent-aware and independent of project canon. */
(() => {
  'use strict';
  const KEY='elsewhere:arrival:v1';
  const CATEGORIES=['sports','movies','music','authors','history','mythology','fiction'];
  const TRAITS=['curiosity','courage','care','reflection','play','creativity','conviction','resilience','independence','focus','reinvention','imagination'];
  const MODES={
    talk:{label:'Talk something through',path:'reframe',traits:['care','reflection','courage'],reply:'We can take it one piece at a time.',question:'What feels most important to understand about what you brought here? You do not have to solve it today.'},
    shadow:{label:'Go a little deeper',path:'shadow',traits:['reflection','courage','conviction'],reply:'All right. Gently, but without dodging it.',question:'What keeps returning to your attention, and what might it be asking you to notice?'},
    play:{label:'Something fun',path:'wander',traits:['play','creativity','imagination'],reply:'Excellent. Seriousness is not compulsory.',question:'If today could take a wonderfully unexpected turn, what would happen first?'},
    learn:{label:'Follow my curiosity',path:'learn',traits:['curiosity','focus','imagination'],reply:'We can follow a question without demanding an answer.',question:'What have you been curious about lately, even if you cannot explain why?'},
    quiet:{label:'Take it easy',path:'notice',traits:['reflection','care','independence'],reply:'No pressure to make this productive.',question:'What is one small thing worth noticing right now, without having to change it?'},
    surprise:{label:'Surprise me',path:'all',traits:['curiosity','play','reinvention'],reply:'No itinerary, then.',question:'What would you explore if there were no right way to begin?'},
    write:{label:'Just let me write',path:null,traits:[],reply:'The page is yours.',question:''}
  };
  const FIGURES=[
    {id:'serena',name:'Serena Williams',category:'sports',traits:['focus','courage','resilience'],why:'the focus to keep returning to the work'},
    {id:'biles',name:'Simone Biles',category:'sports',traits:['courage','independence','focus'],why:'the courage to define your own terms'},
    {id:'ali',name:'Muhammad Ali',category:'sports',traits:['conviction','play','courage'],why:'a mix of conviction and audacious wit'},
    {id:'bowie',name:'David Bowie',category:'music',traits:['reinvention','creativity','curiosity'],why:'a fondness for becoming something unexpected'},
    {id:'nina',name:'Nina Simone',category:'music',traits:['conviction','creativity','courage'],why:'the meeting point of expression and conviction'},
    {id:'freddie',name:'Freddie Mercury',category:'music',traits:['play','creativity','courage'],why:'a willingness to make room for delight and drama'},
    {id:'yeoh',name:'Michelle Yeoh',category:'movies',traits:['resilience','focus','reinvention'],why:'persistence through different chapters'},
    {id:'robin',name:'Robin Williams',category:'movies',traits:['play','care','creativity'],why:'playful imagination with room for feeling'},
    {id:'chaplin',name:'Charlie Chaplin',category:'movies',traits:['play','reflection','creativity'],why:'finding something human inside the absurd'},
    {id:'leguin',name:'Ursula K. Le Guin',category:'authors',traits:['imagination','curiosity','reflection'],why:'asking what another way of living could look like'},
    {id:'baldwin',name:'James Baldwin',category:'authors',traits:['conviction','reflection','courage'],why:'refusing to turn away from a difficult question'},
    {id:'shelley',name:'Mary Shelley',category:'authors',traits:['imagination','reflection','creativity'],why:'the imaginative nerve to examine the unsettling'},
    {id:'ada',name:'Ada Lovelace',category:'history',traits:['curiosity','imagination','focus'],why:'seeing possibilities inside a system'},
    {id:'hypatia',name:'Hypatia',category:'history',traits:['curiosity','conviction','focus'],why:'a determination to keep asking questions'},
    {id:'leonardo',name:'Leonardo da Vinci',category:'history',traits:['curiosity','creativity','focus'],why:'looking closely, then imagining beyond the obvious'},
    {id:'athena',name:'Athena',category:'mythology',traits:['reflection','focus','courage'],why:'thoughtful strategy over needless noise'},
    {id:'anansi',name:'Anansi',category:'mythology',traits:['play','creativity','reinvention'],why:'using stories to find a surprising way through'},
    {id:'artemis',name:'Artemis',category:'mythology',traits:['independence','courage','care'],why:'protecting the right to choose your own path'},
    {id:'hermione',name:'Hermione Granger',category:'fiction',traits:['curiosity','focus','courage'],why:'treating questions as things worth pursuing'},
    {id:'picard',name:'Jean-Luc Picard',category:'fiction',traits:['conviction','reflection','care'],why:'thoughtfulness anchored to principle'},
    {id:'frodo',name:'Frodo Baggins',category:'fiction',traits:['resilience','care','courage'],why:'continuing while carrying something difficult'}
  ];
  FIGURES.push(...[{"id":"echo-22","name":"Marta","category":"sports","traits":["focus","courage","care"],"why":"turning skill into a form of commitment"},{"id":"echo-23","name":"Jackie Robinson","category":"sports","traits":["courage","conviction","resilience"],"why":"steadiness in the face of unfairness"},{"id":"echo-24","name":"Billie Jean King","category":"sports","traits":["conviction","courage","independence"],"why":"making room for others to compete"},{"id":"echo-25","name":"Megan Rapinoe","category":"sports","traits":["conviction","play","courage"],"why":"speaking up with unmistakable personality"},{"id":"echo-26","name":"Usain Bolt","category":"sports","traits":["play","focus","courage"],"why":"approaching performance without losing joy"},{"id":"echo-27","name":"Naomi Osaka","category":"sports","traits":["reflection","independence","courage"],"why":"choosing personal boundaries thoughtfully"},{"id":"echo-28","name":"Keanu Reeves","category":"movies","traits":["care","reflection","resilience"],"why":"quiet steadiness and thoughtful attention"},{"id":"echo-29","name":"Viola Davis","category":"movies","traits":["courage","creativity","conviction"],"why":"bringing honesty to complex work"},{"id":"echo-30","name":"Hayao Miyazaki","category":"movies","traits":["imagination","care","creativity"],"why":"finding wonder in careful observation"},{"id":"echo-31","name":"Guillermo del Toro","category":"movies","traits":["imagination","care","creativity"],"why":"making space for misunderstood creatures"},{"id":"echo-32","name":"Greta Gerwig","category":"movies","traits":["creativity","reflection","play"],"why":"recognizing seriousness inside play"},{"id":"echo-33","name":"Jordan Peele","category":"movies","traits":["creativity","reflection","conviction"],"why":"turning uncomfortable questions into stories"},{"id":"echo-34","name":"Prince","category":"music","traits":["creativity","independence","focus"],"why":"an unmistakable creative voice"},{"id":"echo-35","name":"Janelle Monáe","category":"music","traits":["reinvention","creativity","independence"],"why":"using transformation as artistic freedom"},{"id":"echo-36","name":"Dolly Parton","category":"music","traits":["care","play","creativity"],"why":"humor paired with generous craft"},{"id":"echo-37","name":"Björk","category":"music","traits":["imagination","curiosity","reinvention"],"why":"exploring unfamiliar creative territory"},{"id":"echo-38","name":"Tracy Chapman","category":"music","traits":["conviction","reflection","creativity"],"why":"quiet expression with moral weight"},{"id":"echo-39","name":"Lady Gaga","category":"music","traits":["courage","creativity","reinvention"],"why":"inventing new expressive possibilities"},{"id":"echo-40","name":"Octavia E. Butler","category":"authors","traits":["imagination","resilience","reflection"],"why":"imagining systems under difficult pressure"},{"id":"echo-41","name":"Toni Morrison","category":"authors","traits":["reflection","conviction","creativity"],"why":"giving difficult experiences careful language"},{"id":"echo-42","name":"Terry Pratchett","category":"authors","traits":["play","care","conviction"],"why":"using humor to examine power"},{"id":"echo-43","name":"Jorge Luis Borges","category":"authors","traits":["imagination","curiosity","reflection"],"why":"finding labyrinths inside ordinary concepts"},{"id":"echo-44","name":"Virginia Woolf","category":"authors","traits":["reflection","creativity","independence"],"why":"examining interior life through form"},{"id":"echo-45","name":"Neil Gaiman","category":"authors","traits":["imagination","creativity","curiosity"],"why":"connecting old stories to new possibilities"},{"id":"echo-46","name":"Harriet Tubman","category":"history","traits":["courage","care","conviction"],"why":"acting decisively for other people's freedom"},{"id":"echo-47","name":"Alan Turing","category":"history","traits":["curiosity","focus","imagination"],"why":"seeing patterns where others saw limits"},{"id":"echo-48","name":"Frederick Douglass","category":"history","traits":["conviction","courage","reflection"],"why":"the force of language and principles"},{"id":"echo-49","name":"Wangari Maathai","category":"history","traits":["care","conviction","resilience"],"why":"persistent work rooted in community"},{"id":"echo-50","name":"Rachel Carson","category":"history","traits":["curiosity","care","conviction"],"why":"attentive inquiry with wider consequences"},{"id":"echo-51","name":"Nikola Tesla","category":"history","traits":["imagination","curiosity","focus"],"why":"visualizing technical possibilities"},{"id":"echo-52","name":"Prometheus","category":"mythology","traits":["conviction","courage","care"],"why":"challenging a boundary for a larger purpose"},{"id":"echo-53","name":"Hermes","category":"mythology","traits":["play","curiosity","reinvention"],"why":"moving between worlds and meanings"},{"id":"echo-54","name":"Brigid","category":"mythology","traits":["creativity","care","reinvention"],"why":"craft as a form of renewal"},{"id":"echo-55","name":"Odin","category":"mythology","traits":["curiosity","reflection","focus"],"why":"pursuing understanding at a cost"},{"id":"echo-56","name":"Persephone","category":"mythology","traits":["reinvention","resilience","independence"],"why":"holding more than one kind of belonging"},{"id":"echo-57","name":"Maui","category":"mythology","traits":["play","courage","creativity"],"why":"audacious mythic problem-solving"},{"id":"echo-58","name":"Samwise Gamgee","category":"fiction","traits":["care","resilience","courage"],"why":"staying present for another person"},{"id":"echo-59","name":"Spock","category":"fiction","traits":["reflection","curiosity","conviction"],"why":"reasoning without losing compassion"},{"id":"echo-60","name":"Luna Lovegood","category":"fiction","traits":["independence","imagination","care"],"why":"being singular without apology"},{"id":"echo-61","name":"Princess Leia","category":"fiction","traits":["courage","conviction","care"],"why":"principled courage under pressure"},{"id":"echo-62","name":"The Doctor","category":"fiction","traits":["curiosity","care","reinvention"],"why":"remaining curious through change"},{"id":"echo-63","name":"Katniss Everdeen","category":"fiction","traits":["courage","independence","care"],"why":"protecting people while resisting a script"}]);
  const TERMS={
    curiosity:['curious','wonder','why','question','discover','explore','learn','understand','how'],
    courage:['brave','courage','scared','fear','dare','risk','stand','confront','try'],
    care:['care','kind','friend','help','support','listen','love','gentle','together'],
    reflection:['reflect','think','notice','felt','feeling','meaning','remember','pattern','thought'],
    play:['laugh','fun','silly','joke','play','funny','absurd','light','ridiculous'],
    creativity:['create','make','art','write','paint','draw','music','design','story'],
    conviction:['value','principle','justice','belief','right','wrong','honest','truth','fair'],
    resilience:['persist','again','continue','hard','difficult','recover','survive','still'],
    independence:['choice','boundary','alone','freedom','own','independent','space','autonomy'],
    focus:['practice','focus','plan','detail','careful','work','finish','attention','study'],
    reinvention:['change','different','new','become','restart','transform','begin','shift'],
    imagination:['imagine','whatif','dream','fantasy','world','possibility','invent','future']
  };
  const MIN_DAYS=3;
  const CUTOFF_MS=90*86400000;
  const $=id=>document.getElementById(id);
  const node=(tag,content='',klass='')=>{const el=document.createElement(tag);el.textContent=content;if(klass)el.className=klass;return el};
  const action=(label,handler,klass='')=>{const el=node('button',label,klass);el.type='button';el.addEventListener('click',handler);return el};
  const dayOf=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const unique=a=>[...new Set(a)];
  const safeMode=m=>Object.prototype.hasOwnProperty.call(MODES,m)?m:'surprise';
  function pickMode(input){
    const t=String(input||'').toLowerCase().slice(0,600);
    if(/\b(funny|silly|fun|laugh|joke|play|distract|escape)\b/.test(t))return 'play';
    if(/\b(shadow|deeper|avoid|pattern|hard truth|self.examin)\b/.test(t))return 'shadow';
    if(/\b(hurt|sad|upset|anxious|stressed|argu|conflict|relationship|overwhelm|lonely|rough)\b/.test(t))return 'talk';
    if(/\b(curious|learn|question|understand|research|why)\b/.test(t))return 'learn';
    if(/\b(rest|quiet|calm|peace|gentle|tired|exhausted)\b/.test(t))return 'quiet';
    if(/\b(write|blank page|no prompt)\b/.test(t))return 'write';
    return 'surprise';
  }
  function extractThemes(input){
    const words=new Set(String(input||'').toLowerCase().slice(0,12000).match(/[a-z]+/g)||[]);
    const ranked=Object.entries(TERMS).map(([theme,terms])=>({theme,n:terms.filter(term=>words.has(term)).length})).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n);
    return ranked.slice(0,3).map(x=>x.theme);
  }
  const DEFAULTS=()=>({version:1,settings:{checkin:'daily',matching:true,writing:false,reveal:'weekly',categories:[...CATEGORIES]},events:[],lastDay:'',lastMode:'surprise',lastRevealAt:0,hideUntil:0});
  function sanitize(raw){
    const d=DEFAULTS();if(!raw||raw.version!==1)return d;
    const p=raw.settings||{};
    d.settings.checkin=['daily','always','off'].includes(p.checkin)?p.checkin:d.settings.checkin;
    d.settings.matching=p.matching!==false;
    d.settings.writing=p.writing===true&&d.settings.matching;
    d.settings.reveal=['weekly','manual','off'].includes(p.reveal)?p.reveal:'weekly';
    d.settings.categories=Array.isArray(p.categories)?unique(p.categories.filter(x=>CATEGORIES.includes(x))):d.settings.categories;
    d.events=Array.isArray(raw.events)?raw.events.filter(e=>e&&Number.isFinite(e.at)&&e.at>Date.now()-CUTOFF_MS&&e.at<=Date.now()+86400000&&['choice','writing'].includes(e.source)&&Array.isArray(e.traits)).slice(-180).map(e=>({at:e.at,day:dayOf(new Date(e.at)),source:e.source,traits:unique(e.traits.filter(t=>TRAITS.includes(t))).slice(0,3)})):[];
    d.lastDay=/^\d{4}-\d{2}-\d{2}$/.test(raw.lastDay||'')?raw.lastDay:'';
    d.lastMode=safeMode(raw.lastMode);
    d.lastRevealAt=Number.isFinite(raw.lastRevealAt)?raw.lastRevealAt:0;
    d.hideUntil=Number.isFinite(raw.hideUntil)?raw.hideUntil:0;
    return d;
  }
  let data=DEFAULTS(), persistent=false, started=false;
  function load(){
    try{const raw=localStorage.getItem(KEY);data=sanitize(raw?JSON.parse(raw):null);persistent=true}
    catch{data=DEFAULTS();persistent=false}
  }
  function persist(){
    try{localStorage.setItem(KEY,JSON.stringify(data));persistent=true;return true}
    catch{persistent=false;return false}
  }
  function record(source,traits){
    if(!data.settings.matching||!traits.length)return;
    const today=dayOf(),limit=source==='writing'?2:2;
    if(data.events.filter(e=>e.day===today&&e.source===source).length>=limit)return;
    data.events.push({at:Date.now(),day:today,source,traits:unique(traits.filter(t=>TRAITS.includes(t))).slice(0,3)});
    data.events=data.events.filter(e=>e.at>Date.now()-CUTOFF_MS).slice(-180);
    persist();
  }
  function rankEcho(events=data.events,categories=data.settings.categories){
    const allowed=new Set(categories);
    const safeEvents=(Array.isArray(events)?events:[]).filter(e=>e&&Array.isArray(e.traits)&&e.traits.length);
    const days=unique(safeEvents.map(e=>e.day));
    if(days.length<MIN_DAYS&&!(days.length>=2&&safeEvents.length>=5))return null;
    const weights=new Map();
    for(const e of safeEvents)for(const t of unique(e.traits))if(TRAITS.includes(t))weights.set(t,(weights.get(t)||0)+1);
    if(weights.size<3)return null;
    const rows=FIGURES.filter(f=>allowed.has(f.category)).map(f=>{
      const matches=f.traits.filter(t=>weights.has(t));
      const score=matches.reduce((n,t)=>n+Math.min(weights.get(t),6),0);
      return {...f,matches,score};
    }).filter(f=>f.matches.length>=2).sort((a,b)=>b.score-a.score||b.matches.length-a.matches.length||a.id.localeCompare(b.id));
    return rows[0]||null;
  }
  function readiness(){const days=unique(data.events.map(e=>e.day)).length;return {days,observations:data.events.length,ready:!!rankEcho()}}
  function renderPrefs(){
    if(!$('e15SettingCheckin'))return;
    $('e15SettingCheckin').value=data.settings.checkin;
    $('e15SettingMatching').checked=data.settings.matching;
    $('e15SettingWriting').checked=data.settings.writing;
    $('e15SettingWriting').disabled=!data.settings.matching;
    $('e15SettingReveal').value=data.settings.reveal;
    $('e15SettingReveal').disabled=!data.settings.matching;
    for(const c of CATEGORIES){const input=$('e15Cat-'+c);if(input){input.checked=data.settings.categories.includes(c);input.disabled=!data.settings.matching;}}
    const state=$('e15SettingState'),ready=readiness();
    state.textContent='Stored on this browser: '+ready.observations+' theme observations over '+ready.days+' day(s). '+(ready.ready?'A comparison is available.':'A connection needs several separate visits.')+' '+(persistent?'':'Changes are session-only; browser storage is unavailable.');
  }
  function renderEcho(force=false){
    const box=$('e15Echo');if(!box)return;
    box.hidden=true;box.textContent='';
    if(!data.settings.matching||data.settings.reveal==='off'||!data.settings.categories.length)return;
    if(!force&&(data.settings.reveal!=='weekly'||Date.now()<data.hideUntil||Date.now()-data.lastRevealAt<7*86400000))return;
    const f=rankEcho();if(!f)return;
    const eyebrow=node('p','A quiet echo','e15-eyebrow');
    const message=node('p','A little '+f.name+' energy: '+f.why+'.','e15-echo-message');
    const source=node('p','A playful comparison based on your chosen themes, not a personality diagnosis or a claim about this person’s private life.','e15-muted');
    const reasons=node('details','','e15-echo-why');
    reasons.append(node('summary','Why this connection?'),node('p','Themes in common: '+f.matches.join(', ')+'. These are illustrative parallels, not an identity score.'));
    const explore=node('details','','e15-echo-why');
    explore.append(node('summary','Follow this thread (optional)'));
    const followUps=node('div','','e15-echo-questions');
    const comparison=f.category==='mythology'||f.category==='fiction'?'story':'public work';
    const questions=[
      'Where has '+f.matches[0]+' shown up in your choices recently?',
      'In the '+comparison+' associated with '+f.name+', what resonates with you, and what does not?',
      'If you experimented with a little more '+f.matches[1]+' tomorrow, what might happen?'
    ];
    for(const question of questions){
      followUps.append(action(question,()=>{
        if($('e14Answer')?.value.trim()&&!confirm('Keep your unsaved writing and change the prompt?'))return;
        document.documentElement.classList.remove('elsewhere-arrival-freewriting');
        const legacy=globalThis.ElsewhereLegacy;
        void legacy?.transitionTo?.({id:'echo-'+f.id+'-'+Date.now().toString(36),c:'reframe',text:question,guides:[],sourceKind:'arrival',lens:null});
        globalThis.Elsewhere14?.setView?.('write');
        $('e14Workspace')?.scrollIntoView({block:'start',behavior:'auto'});
      },'e15-echo-question'));
    }
    explore.append(followUps);
    const hide=action('Not for me',()=>{data.hideUntil=Date.now()+30*86400000;persist();box.hidden=true;renderPrefs()});
    const dismiss=action('Dismiss',()=>{box.hidden=true});
    const buttons=node('div','','e15-echo-actions');buttons.append(dismiss,hide);
    box.append(eyebrow,message,source,reasons,explore,buttons);box.hidden=false;
    if(!force){data.lastRevealAt=Date.now();persist();}
  }
  function updateRouteBar(){
    const bar=$('e15RouteBar');if(!bar)return;
    bar.hidden=false;
    const current=$('e15ModeStatus');
    if(current)current.textContent=data.lastMode==='write'?'Blank page':(MODES[data.lastMode]?.label||'Your own path');
  }
  function showWelcome(){
    const welcome=$('e15Welcome');if(!welcome)return;
    document.documentElement.classList.add('elsewhere-arrival-pending');
    document.documentElement.classList.remove('elsewhere-arrival-freewriting');
    welcome.hidden=false;
    $('e15RouteBar').hidden=true;
    $('e15Echo').hidden=true;
    $('e15Note').value='';
    const main=$('main');if(main)main.scrollTop=0;
    const focus=$('e15WelcomeTitle');if(focus)focus.focus({preventScroll:true});
  }
  function firstPrompt(mode){
    return {id:'arrival-'+dayOf()+'-'+Date.now().toString(36),c:MODES[mode].path==='all'?'notice':MODES[mode].path,text:MODES[mode].question,guides:[],sourceKind:'arrival',lens:null};
  }
  async function enter(mode,withChoice=true){
    mode=safeMode(mode);
    const note=withChoice?String($('e15Note')?.value||'').trim().slice(0,600):'';
    const actual=mode==='surprise'&&note?pickMode(note):mode;
    const finalMode=actual==='surprise'&&!withChoice?'surprise':actual;
    data.lastDay=dayOf();data.lastMode=finalMode;persist();
    if(withChoice&&finalMode!=='write')record('choice',MODES[finalMode].traits);
    $('e15Welcome').hidden=true;
    document.documentElement.classList.remove('elsewhere-arrival-pending','elsewhere-arrival-freewriting');
    updateRouteBar();
    if(finalMode==='write'){
      document.documentElement.classList.add('elsewhere-arrival-freewriting');
      const editor=$('e14Answer');
      if(editor){if(!editor.value.trim()&&note){editor.value=note;editor.dispatchEvent(new Event('input',{bubbles:true}));}editor.focus({preventScroll:true})}
      globalThis.Elsewhere14?.setView?.('write');
    } else {
      const legacy=globalThis.ElsewhereLegacy;
      legacy?.chooseArrivalPath?.(MODES[finalMode].path);
      if(note&&finalMode!=='surprise')await legacy?.transitionTo?.(firstPrompt(finalMode));
      else await legacy?.generateNext?.();
    }
    renderEcho(false);renderPrefs();
  }
  function inputSetting(label,kind,value,handler){
    const line=node('label','','e15-setting-line');
    const input=document.createElement('input');input.type=kind;if(kind==='checkbox')input.checked=Boolean(value);
    input.addEventListener('change',()=>handler(kind==='checkbox'?input.checked:input.value));line.append(input,node('span',label));
    return {line,input};
  }
  function installSettings(){
    const target=$('settingsDialog')?.querySelector('.panel');if(!target||$('e15Settings'))return;
    const wrap=node('section','','e15-settings');wrap.id='e15Settings';
    wrap.append(node('h3','Arrival & quiet echoes'),node('p','A gentle first question and optional, local-only comparisons with figures from books, music, history and beyond.','e15-muted'));
    const group=node('div','','e15-setting-grid');
    const checkinLabel=node('label','Ask how I am doing');
    const checkin=document.createElement('select');checkin.id='e15SettingCheckin';
    [['daily','Once a day'],['always','Every visit'],['off','Never']].forEach(([v,t])=>{const o=node('option',t);o.value=v;checkin.append(o)});
    checkin.addEventListener('change',()=>{data.settings.checkin=checkin.value;persist();renderPrefs()});
    checkinLabel.append(checkin);group.append(checkinLabel);
    const match=inputSetting('Offer occasional figure comparisons','checkbox',true,value=>{data.settings.matching=value;if(!value)data.settings.writing=false;persist();renderPrefs();if(!value)$('e15Echo').hidden=true});
    match.input.id='e15SettingMatching';group.append(match.line);
    const writing=inputSetting('Include newly saved writing in theme matching (off by default)','checkbox',false,value=>{data.settings.writing=value;persist();renderPrefs()});
    writing.input.id='e15SettingWriting';group.append(writing.line);
    const revealLabel=node('label','Show a comparison');
    const reveal=document.createElement('select');reveal.id='e15SettingReveal';
    [['weekly','At most once a week'],['manual','Only when I ask'],['off','Do not show']].forEach(([v,t])=>{const o=node('option',t);o.value=v;reveal.append(o)});
    reveal.addEventListener('change',()=>{data.settings.reveal=reveal.value;persist();renderPrefs()});
    revealLabel.append(reveal);group.append(revealLabel);
    wrap.append(group,node('h4','Figure categories'));
    const cats=node('div','','e15-categories');
    for(const c of CATEGORIES){
      const item=inputSetting(c[0].toUpperCase()+c.slice(1),'checkbox',true,value=>{
        data.settings.categories=value?unique([...data.settings.categories,c]):data.settings.categories.filter(x=>x!==c);
        persist();renderPrefs();
      });
      item.input.id='e15Cat-'+c;cats.append(item.line);
    }
    wrap.append(cats);
    const state=node('p','','e15-muted');state.id='e15SettingState';state.setAttribute('role','status');wrap.append(state);
    const actions=node('div','','e15-settings-actions');
    actions.append(action('See my connection',()=>{renderEcho(true);const echo=$('e15Echo');if(echo.hidden){state.textContent='No reliable playful connection yet. Try a few more visits or enable categories.';}else{ $('settingsDialog')?.close();echo.scrollIntoView({block:'center',behavior:'auto'});}}));
    actions.append(action('Erase matching history',()=>{
      if(!confirm('Erase your local figure-matching observations? Existing journal entries and projects will not change.'))return;
      data.events=[];data.lastRevealAt=0;data.hideUntil=0;persist();$('e15Echo').hidden=true;renderPrefs();
    }));
    wrap.append(actions,node('p','Only theme labels and dates are retained for matching. Your check-in words are not saved here. Saved journal text is never analyzed unless you enable it. Data is plaintext browser storage on this site’s shared origin and is not included in Vault backups. Nothing is sent to a server.','e15-privacy'));
    target.append(wrap);renderPrefs();
  }
  function installUI(){
    if($('e15Welcome'))return;
    const stage=$('ideaStage')?.querySelector('.stage');if(!stage)return;
    const welcome=node('section','','e15-arrival');welcome.id='e15Welcome';welcome.setAttribute('aria-labelledby','e15WelcomeTitle');
    const title=node('h1','How are you doing today?','e15-title');title.id='e15WelcomeTitle';title.tabIndex=-1;
    welcome.append(node('p','ELSEWHERE / ARRIVAL','e15-eyebrow'),title,node('p','You do not have to know what you need. Give me a direction, or let me choose.','e15-deck'));
    const label=node('label','A sentence, if you feel like it','e15-label');label.htmlFor='e15Note';welcome.append(label);
    const input=document.createElement('textarea');input.id='e15Note';input.rows=2;input.maxLength=600;input.placeholder='“I just want something fun.” “I need to work through something.” “No idea.”';
    input.setAttribute('aria-label','Optional: how are you feeling, or what are you looking for?');welcome.append(input);
    const choices=node('div','','e15-choices');
    for(const m of ['talk','shadow','play','learn','quiet','surprise','write']){
      const b=action(MODES[m].label,()=>{void enter(m,true)},'e15-choice');
      if(m==='surprise')b.classList.add('e15-primary');
      if(m==='write')b.classList.add('e15-quiet');
      choices.append(b);
    }
    welcome.append(choices);
    const footer=node('div','','e15-arrival-foot');
    footer.append(action('Skip — just give me something',()=>{void enter('surprise',false)},'e15-skip'));
    footer.append(node('p','Your words are only used for this check-in. The optional figure connections use local theme labels, not an identity test.','e15-muted'));
    welcome.append(footer);stage.before(welcome);
    const route=node('div','','e15-route-bar');route.id='e15RouteBar';route.hidden=true;
    route.append(node('span','','e15-mode-status'));
    route.firstChild.id='e15ModeStatus';
    route.append(action('Change direction',showWelcome));
    route.append(action('Just write',()=>{void enter('write',false)}));
    route.append(action('Something else',()=>{void enter('surprise',false)}));
    stage.before(route);
    const echo=node('aside','','e15-echo');echo.id='e15Echo';echo.setAttribute('aria-label','Optional figure comparison');echo.hidden=true;stage.before(echo);
  }
  function boot(){
    if(started||typeof document==='undefined'||!$('ideaStage')||!globalThis.ElsewhereLegacy||!globalThis.Elsewhere14?.initialized)return false;
    started=true;load();installUI();installSettings();
    addEventListener('elsewhere:response-saved',event=>{
      if(!data.settings.matching||!data.settings.writing)return;
      const value=event?.detail?.text;
      if(typeof value!=='string'||value.trim().length<25)return;
      record('writing',extractThemes(value));renderPrefs();
    });
    addEventListener('storage',event=>{if(event.key!==KEY)return;load();renderPrefs();if(!data.settings.matching&&$('e15Echo'))$('e15Echo').hidden=true;});
    const today=dayOf();
    if(data.settings.checkin==='off'||(data.settings.checkin==='daily'&&data.lastDay===today)){
      $('e15Welcome').hidden=true;
      document.documentElement.classList.remove('elsewhere-arrival-pending');
      if(data.lastMode==='write'&&data.settings.checkin!=='off')document.documentElement.classList.add('elsewhere-arrival-freewriting');
      else globalThis.ElsewhereLegacy.generateNext();
      updateRouteBar();renderEcho();
    }else showWelcome();
    return true;
  }
  globalThis.ElsewhereArrival=Object.freeze({version:1,boot,pickMode,extractThemes,rankEcho,sanitize,readiness,isFreeWriting:()=>typeof document!=='undefined'&&document.documentElement.classList.contains('elsewhere-arrival-freewriting')});
  if(typeof document!=='undefined'){
    if(!boot()){let tries=0;const retry=()=>{if(boot())return;if(++tries<35)setTimeout(retry,75);else{document.documentElement.classList.remove('elsewhere-arrival-pending');globalThis.ElsewhereLegacy?.generateNext?.();}};retry();}
  }
})();