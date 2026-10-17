/* Elsewhere 14 - local-first creative atlas, portfolio, and privacy tools. */
(() => {
  'use strict';
  if (globalThis.Elsewhere14?.initialized) return;
  const VERSION = 14;
  const S = () => globalThis.ElsewhereV13State;
  const D = () => globalThis.ElsewhereV13Domain;
  const L = () => globalThis.ElsewhereLegacy;
  const UI = () => globalThis.ElsewhereV13UI;
  const G = () => globalThis.ElsewhereV13Grounding;
  const C = () => globalThis.ElsewhereV13Continuity;
  const $ = id => document.getElementById(id);
  const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && L()?.getState?.().motion !== 'off';
  const safe = (value, limit = 12000) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, limit);
  const clone = value => JSON.parse(JSON.stringify(value));
  const state = () => S()?.runtime?.state;
  const project = () => state()?.projects?.find(p => p.id === state()?.activeProjectId) || null;
  const current = () => L()?.getCurrent?.() || null;
  const text = (tag, content = '', klass = '') => { const node = document.createElement(tag); node.textContent = content; if (klass) node.className = klass; return node; };
  const button = (label, action, klass = '') => { const node = text('button', label, klass); node.type = 'button'; node.addEventListener('click', action); return node; };
  const option = (value, label) => { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; };
  const formatTime = time => { try { return new Date(time).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}); } catch { return ''; } };
  let conflicted = false;
  let view = 'write';
  let activeDialog = null;
  let atlasFocus = null;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let graphLayout = new Map();
  let graphData = null;
  let graphFrame = 0;
  let comparing = [];
  let changed = false;
  let lastPrompt = null;
  let modalReturn = null;
  let restoredDraftId = null;
  let atlasTime = 100;
  let includeOtherProjects = false;
  let currentSearch = '';
  let busy = false;

  function notice(message, error = false) {
    const node = $('e14Status');
    if (!node) return;
    node.textContent = message;
    node.dataset.error = String(error);
  }
  function persistProject(p) {
    if (!p) throw Error('No active project');
    if (conflicted) throw Error('Another tab changed this workspace. Reload before editing.');
    const api = S(), st = state();
    if (!api?.runtime?.adapter || !st) throw Error('Storage is unavailable');
    for (const part of ['meta','artifacts','facts','relations','scratch','history','timeline']) api.markDirty(`project:${p.id}:${part}`);
    api.markDirty('core');
    api.markDirty('projects:index');
    const result = api.flushDirty(api.runtime.adapter, st);
    if (!result.persistent || result.failed?.length) {
      notice('Saved for this session only. Export a backup before leaving.', true);
    } else notice('Saved locally.');
    UI()?.renderControlRoom?.();
    return result;
  }
  function download(name, body, mime = 'application/json') {
    const blob = new Blob([body], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function universeSnapshot() {
    if (conflicted) throw Error('This tab is stale. Reload before exporting a workspace snapshot.');
    const st = state(), api = S();
    if (!st || !api) throw Error('Workspace has not loaded');
    const old = L()?.getState?.();
    if (old) api.syncLegacyState(st, old);
    api.markDirty('core');
    api.flushDirty(api.runtime.adapter, st);
    return api.exportUniverse(st);
  }
  function backupPlain() {
    try { download('Elsewhere-14-Snapshot.json', JSON.stringify(universeSnapshot(), null, 2)); notice('Snapshot downloaded.'); }
    catch (e) { notice(e.message, true); }
  }
  function bufferToB64(bytes) {
    let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  function b64ToBuffer(value) {
    if (typeof value !== 'string' || value.length > 35000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Invalid vault format');
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  }
  async function vaultKey(password, salt) {
    if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw Error('Encrypted backups need a secure browser context.');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function seal(payload, password) {
    if (password.length < 12) throw Error('Choose an encryption passphrase of at least 12 characters.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await vaultKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(payload)));
    return {app:'Elsewhere',type:'encrypted-universe',version:1,kdf:'PBKDF2-SHA256',iterations:310000,cipher:'AES-256-GCM',salt:bufferToB64(salt),iv:bufferToB64(iv),ciphertext:bufferToB64(new Uint8Array(ciphertext))};
  }
  async function unseal(data,password) {
    if (data?.app !== 'Elsewhere' || data?.type !== 'encrypted-universe' || data?.version !== 1 || data?.iterations !== 310000 || data?.cipher !== 'AES-256-GCM' || data?.kdf !== 'PBKDF2-SHA256') throw Error('This is not an Elsewhere encrypted backup.');
    const salt = b64ToBuffer(data.salt),iv = b64ToBuffer(data.iv),body = b64ToBuffer(data.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || body.length < 16) throw Error('Encrypted backup is malformed.');
    const key = await vaultKey(password,salt);
    let plain;
    try { plain = await crypto.subtle.decrypt({name:'AES-GCM',iv},key,body); }
    catch { throw Error('Wrong passphrase or damaged backup. Nothing was changed.'); }
    return JSON.parse(new TextDecoder().decode(plain));
  }
  function promptIdentity(p) { return p ? `${p.id || 'prompt'}:${p.text || ''}` : null; }
  function renderPromptContext() {
    const p = current();
    const el = $('e14Prompt');
    if (!el) return;
    el.textContent = p?.text || 'Choose a path to begin.';
    if (p && lastPrompt !== promptIdentity(p)) {
      if (changed && $('e14Answer')?.value.trim()) notice('Your unsaved writing is still here. Save or discard before replacing it.');
      else { $('e14Answer').value = ''; changed = false; }
      lastPrompt = promptIdentity(p);
    }
  }
  function saveResponse(asType = 'note') {
    const p = project(), prompt = current(), raw = $('e14Answer')?.value.trim();
    if (!p) { notice('Create or choose a project before saving a response.', true); UI()?.projects?.openProjectEditor?.(true); return null; }
    if (!raw) { notice('Write a response first.', true); $('e14Answer')?.focus(); return null; }
    if (!D()?.ARTIFACT_TYPES?.includes(asType)) { notice('Unsupported artifact type.', true); return null; }
    try {
      const label = prompt?.text ? `Response: ${prompt.text.slice(0,76)}` : 'Exploration response';
      const entry = D().createArtifact(p,asType,{name:label,summary:raw.slice(0,760),tags:['response'],meta:{content:safe(raw),sourcePromptId:prompt?.id||null,sourceText:prompt?.text||null,provenance:prompt?.sourceRefs||[],createdBy:'Elsewhere 14 response capture',status:'authored'}});
      p.timeline.push({id:`entry_${entry.id}`,label:`Saved ${asType}: ${entry.name}`,artifactIds:[entry.id],createdAt:Date.now(),order:Date.now(),sourceId:entry.id,kind:'response'});
      p.returnPoint={kind:'artifact',id:entry.id,label:entry.name};
      persistProject(p);
      changed = false;
      $('e14Answer').value='';
      renderCards(); renderAtlas();
      return entry;
    } catch (e) { notice(e.message,true); return null; }
  }
  function saveDraft() {
    const p = project(), answer = $('e14Answer')?.value.trim();
    if (!p || !answer) return notice('Choose a project and write something before saving a draft.',true);
    try {
      D().setScratchpad(p, null, safe(answer));
      p.returnPoint={kind:'draft',id:p.id,label:'Draft response'};
      persistProject(p);
      changed=false;restoredDraftId=p.id;notice('Draft saved. Use Resume draft to return.');
    } catch(e) { notice(e.message,true); }
  }
  function resumeDraft() {
    const p=project(), draft=p?.scratchpads?.find(x=>x.scopeId == null && x.text)?.text;
    if (!draft) return notice('No project draft found.');
    if (changed && $('e14Answer').value.trim() && !confirm('Replace the unsaved writing currently visible?')) return;
    $('e14Answer').value = draft;
    changed = true;restoredDraftId=p.id;
    setView('write');$('e14Answer').focus();notice('Draft restored. Save it when ready.');
  }
  function candidateFact() {
    const p=project(), answer=$('e14Answer')?.value.trim(), prompt=current();
    if (!p || !answer) return notice('Choose a project and write a statement first.',true);
    try {
      const f=D().createFact(p,{subject:'User hypothesis',relation:'suggests',freeText:safe(answer,1200),status:'possible',source:`response:${prompt?.id||'manual'}`});
      p.timeline.push({id:`fact_event_${f.id}`,label:'Possible fact added for review',sourceId:f.id,kind:'possible-fact',order:Date.now()});
      persistProject(p);changed=false;$('e14Answer').value='';notice('Saved as POSSIBLE, not established canon.');renderCards();renderAtlas();
    } catch(e){notice(e.message,true)}
  }
  function makeFollowUps() {
    const raw=($('e14Answer')?.value||current()?.text||'').trim();
    if (!raw) return notice('Choose a prompt or write a response first.',true);
    const subject=safe(raw.replace(/\s+/g,' '),180);
    const questions=[`What concrete example would make "${subject}" more precise?`,`What could challenge or disprove this idea?`,`What would change next if this were true?`];
    const box=$('e14FollowUps');box.textContent='';
    for (const q of questions) box.append(button(q,()=>{ if (changed && $('e14Answer').value.trim() && !confirm('Replace your unsaved response?')) return; $('e14Answer').value=q;changed=true;setView('write');$('e14Answer').focus(); }));
    notice('Three follow-up directions, derived from your words.');
  }
  function branchResponse() {
    const p=project(), response=$('e14Answer')?.value.trim(), seed=current();
    if (!p || !response) return notice('Choose a project and write an alternative first.',true);
    try {
      const a=D().createArtifact(p,'note',{name:'Alternative: '+(seed?.text||'new possibility').slice(0,70),summary:response.slice(0,780),tags:['alternative'],meta:{content:safe(response),branchOf:seed?.id||null,canonStatus:'possible'}});
      p.timeline.push({id:`branch_${a.id}`,label:`Explored alternative: ${a.name}`,kind:'branch',artifactIds:[a.id],order:Date.now()});
      persistProject(p);changed=false;$('e14Answer').value='';notice('Alternative stored separately. Established facts were not changed.');renderCards();renderAtlas();
    }catch(e){notice(e.message,true)}
  }
  function setView(value) {
    view=['write','atlas','library','privacy'].includes(value)?value:'write';
    for (const id of ['write','atlas','library','privacy']) {
      const b=$(`e14Tab-${id}`), panel=$(`e14Panel-${id}`);
      if(b) {b.setAttribute('aria-selected',String(view===id));b.tabIndex=view===id?0:-1;}
      if(panel)panel.hidden=id!==view;
    }
    if(view==='atlas')renderAtlas(); if(view==='library')renderCards(); if(view==='privacy')renderPrivacy();
  }
  function onTabKeys(event) {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();const tabs=['write','atlas','library','privacy'];let i=tabs.indexOf(view);
    if(event.key==='ArrowRight')i=(i+1)%tabs.length;
    else if(event.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;
    else if(event.key==='Home')i=0;else i=tabs.length-1;
    setView(tabs[i]);$(`e14Tab-${tabs[i]}`)?.focus();
  }
  function renderCards() {
    const box=$('e14Cards');if(!box)return;
    box.textContent='';const p=project();
    if (!p) return box.append(text('p','Start a project to collect authored responses and artifacts.','e14-muted'));
    const all=(p.artifacts||[]).filter(a=>!a.retired);
    const q=$('e14Search')?.value.trim().toLowerCase()||'';
    const filtered=all.filter(a=>!q || `${a.name} ${a.summary} ${a.meta?.content||''}`.toLowerCase().includes(q));
    const limit=60;
    for(const a of filtered.slice(-limit).reverse()){
      const article=text('article','','e14-artifact');
      const head=text('div','','e14-artifact-head');head.append(text('strong',a.name));head.append(text('small',a.type));article.append(head);
      article.append(text('p',safe(a.meta?.content||a.summary,240)));
      const actions=text('div','','e14-mini-actions');
      actions.append(button('Open',()=>UI()?.projects?.openQuickLook?.(a.id)));
      const existing=comparing.includes(a.id);
      actions.append(button(existing?'Remove compare':'Compare',()=>{
        comparing=existing?comparing.filter(x=>x!==a.id):[...comparing.slice(-1),a.id];renderCards();
      }));
      actions.append(button('Atlas',()=>{atlasFocus=a.id;setView('atlas')}));article.append(actions);box.append(article);
    }
    if(filtered.length>limit)box.append(text('p',`Showing ${limit} of ${filtered.length}. Refine the search to see other entries.`,'e14-muted'));
    if(!filtered.length)box.append(text('p','No matching artifacts.','e14-muted'));
    const comparison=$('e14Comparison');comparison.textContent='';
    const selected=comparing.map(id=>all.find(a=>a.id===id)).filter(Boolean);
    for(const a of selected){const item=text('article','','e14-artifact');item.append(text('strong',a.name),text('p',safe(a.meta?.content||a.summary,4000)));comparison.append(item)}
  }
  function palette(kind) {
    return ({character:'#b7e3ff',place:'#91f0d0',power:'#e2b0ff',scene:'#f5d79e',faction:'#f2a8ad',note:'#e5ebef',creature:'#f6b89f',rule:'#d3c2ff',culture:'#b0e4bd',memory:'#f4d6be',object:'#c9d3ff'})[kind]||'#a5cdeb';
  }
  function graphForProject(p,percent=100) {
    if (!p) return {nodes:[],edges:[],projectId:null};
    const arts=(p.artifacts||[]).filter(a=>!a.retired).slice(0,300);
    const limit=Math.max(0,Math.min(300,Math.floor((percent/100)*arts.length)));
    const nodes=arts.sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).slice(0,limit).map(a=>({id:a.id,label:a.name,type:a.type,summary:a.summary||'',createdAt:a.createdAt||0}));
    const nodeIds=new Set(nodes.map(n=>n.id));
    const edges=(p.relationships||[]).filter(r=>r.status!=='retired'&&!r.muted&&nodeIds.has(r.fromId)&&nodeIds.has(r.toId)).map(r=>({id:r.id,from:r.fromId,to:r.toId,label:r.label,status:r.status}));
    return {nodes,edges,projectId:p.id};
  }
  function graphPositions(graph) {
    const n=graph.nodes.length,positions=new Map();if(!n)return positions;
    const degree=new Map(graph.nodes.map(x=>[x.id,0]));for(const e of graph.edges){degree.set(e.from,(degree.get(e.from)||0)+1);degree.set(e.to,(degree.get(e.to)||0)+1)}
    const ordered=[...graph.nodes].sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0));
    const radius=Math.min(370,100+Math.sqrt(n)*27);
    ordered.forEach((item,i)=>{const angle=i*2.399963229728653;const r=radius*Math.sqrt((i+.5)/n);positions.set(item.id,{x:Math.cos(angle)*r,y:Math.sin(angle)*r})});
    return positions;
  }
  function renderAtlas() {
    const host=$('e14Graph');if(!host)return;
    const p=project(),data=graphForProject(p,atlasTime);graphData=data;
    host.textContent='';$('e14AtlasCount').textContent=`${data.nodes.length} artifacts / ${data.edges.length} connections`;
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 700');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${data.nodes.length} project artifacts arranged in a navigable network`);
    const back=document.createElementNS(ns,'rect');back.setAttribute('width','1000');back.setAttribute('height','700');back.setAttribute('fill','transparent');svg.append(back);
    const layer=document.createElementNS(ns,'g');layer.setAttribute('class','e14-graph-layer');svg.append(layer);host.append(svg);
    if(!p || !data.nodes.length){host.append(text('p',p?'Save an artifact to start its constellation.':'Choose a project to reveal its atlas.','e14-graph-empty'));return}
    graphLayout=graphPositions(data);
    const pinned=p.atlasPositions&&typeof p.atlasPositions==='object'?p.atlasPositions:{};for(const n of data.nodes){const pos=pinned[n.id];if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)&&Math.abs(pos.x)<1000&&Math.abs(pos.y)<1000)graphLayout.set(n.id,{x:pos.x,y:pos.y})}
    const edgelayer=document.createElementNS(ns,'g'),nodelayer=document.createElementNS(ns,'g');layer.append(edgelayer,nodelayer);
    const coord=(id)=>graphLayout.get(id)||{x:0,y:0};
    for(const e of data.edges){const a=coord(e.from),b=coord(e.to);const line=document.createElementNS(ns,'line');line.setAttribute('x1',String(a.x));line.setAttribute('y1',String(a.y));line.setAttribute('x2',String(b.x));line.setAttribute('y2',String(b.y));line.setAttribute('class',e.status==='established'?'e14-edge established':'e14-edge possible');const tooltip=document.createElementNS(ns,'title');tooltip.textContent=`${e.label} (${e.status})`;line.append(tooltip);edgelayer.append(line)}
    const maxNodes=160;
    for(const a of data.nodes.slice(0,maxNodes)){
      const pos=coord(a.id),g=document.createElementNS(ns,'g');g.setAttribute('class','e14-node');g.setAttribute('transform',`translate(${pos.x} ${pos.y})`);
      g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${a.type}: ${a.label}`);g.dataset.artifactId=a.id;
      const circle=document.createElementNS(ns,'circle');circle.setAttribute('r',atlasFocus===a.id?'19':'13');circle.setAttribute('fill',palette(a.type));circle.setAttribute('fill-opacity',atlasFocus===a.id?'1':'.84');circle.setAttribute('stroke','#e8f2ff');circle.setAttribute('stroke-opacity','.55');circle.setAttribute('stroke-width','1.4');g.append(circle);
      const label=document.createElementNS(ns,'text');label.setAttribute('y','31');label.setAttribute('text-anchor','middle');label.setAttribute('fill','#eef5ff');label.setAttribute('class','e14-node-label');label.textContent=a.label.length>27?a.label.slice(0,26)+'...':a.label;g.append(label);
      const t=document.createElementNS(ns,'title');t.textContent=`${a.type}: ${a.label}`;g.append(t);
      const open=()=>selectAtlasNode(a.id);
      g.addEventListener('click',open);g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});nodelayer.append(g);
    }
    renderAtlasHistory(p);
    if(data.nodes.length>maxNodes)host.append(text('p',`Showing the first ${maxNodes} navigable nodes; filter by time or use the library for other artifacts.`,'e14-muted'));
    applyTransform(layer);
    svg.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.max(.45,Math.min(3,zoom*(event.deltaY>0?.9:1.1)));applyTransform(layer)},{passive:false});
    let dragging=null;svg.addEventListener('pointerdown',event=>{if(event.target.closest?.('.e14-node'))return;dragging={x:event.clientX,y:event.clientY,px:panX,py:panY};svg.setPointerCapture?.(event.pointerId)});
    svg.addEventListener('pointermove',event=>{if(!dragging)return;const factor=1000/Math.max(200,svg.clientWidth);panX=dragging.px+(event.clientX-dragging.x)*factor;panY=dragging.py+(event.clientY-dragging.y)*factor;applyTransform(layer)});
    const stop=()=>{dragging=null};svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
  }
  function renderAtlasHistory(p){
    const host=$('e14History');if(!host)return;host.textContent='';
    const items=(p?.timeline||[]).slice(-20).reverse();if(!items.length)return;
    host.append(text('h4','Recent creative trail'));const list=text('div','','e14-history-list');
    for(const entry of items){const item=text('div','','e14-history-item');item.append(text('span',`${entry.label||entry.kind||'Project event'} - ${formatTime(entry.createdAt||entry.order||Date.now())}`));
      const id=entry.artifactIds?.find(id=>(p.artifacts||[]).some(a=>a.id===id));if(id)item.append(button('Reveal',()=>{selectAtlasNode(id);atlasFocus=id;renderAtlas();selectAtlasNode(id)}));list.append(item)}host.append(list);
  }
  function applyTransform(layer) {layer.setAttribute('transform',`translate(${500+panX} ${350+panY}) scale(${zoom})`)}
  function selectAtlasNode(id) {
    atlasFocus=id;const p=project(),a=p?.artifacts?.find(a=>a.id===id),detail=$('e14GraphDetail');if(!a)return;
    detail.textContent='';const head=text('div','','e14-artifact-head');head.append(text('strong',a.name),text('small',a.type));detail.append(head,text('p',safe(a.meta?.content||a.summary,600)));
    const f=(p.facts||[]).filter(f=>f.subjectId===id||f.objectId===id);
    if(f.length){detail.append(text('h4','Recorded facts'));for(const fact of f.slice(0,12)){const row=text('p',`${fact.status.toUpperCase()} - ${fact.freeText||[fact.subject,fact.relation,fact.object].join(' ')}`,'e14-fact');detail.append(row)}}
    if(a.meta?.sourcePromptId)detail.append(text('p',`Source prompt: ${a.meta.sourceText||a.meta.sourcePromptId}`,'e14-source'));
    const impacts= f.filter(x=>x.status==='established').map(x=>globalThis.ElsewhereV13Uplift?.canonImpactSet?.(p,x.id,{status:'possible'})).filter(Boolean);
    if(impacts.length)detail.append(text('p',`Dependency preview: ${impacts.reduce((n,x)=>n+x.counts.direct,0)} directly linked records; ${impacts.reduce((n,x)=>n+x.counts.possible,0)} possible textual echoes. No facts were changed.`,'e14-muted'));
    const actions=text('div','','e14-mini-actions');actions.append(button('Open artifact',()=>UI()?.projects?.openQuickLook?.(id)));
    actions.append(button('Rename',()=>{const value=globalThis.prompt?.('Artifact label',a.name);if(value==null||!safe(value,160).trim())return;try{D().updateArtifact(p,id,{name:safe(value,160)});persistProject(p);renderAtlas();selectAtlasNode(id)}catch(e){notice(e.message,true)}}));
    if(!comparing.includes(id))actions.append(button('Compare',()=>{comparing=[...comparing.slice(-1),id];setView('library')}));
    if(comparing.length===1&&comparing[0]!==id){actions.append(button('Connect to selected',()=>connectArtifacts(comparing[0],id)))}
    detail.append(actions);
  }
  function connectArtifacts(a,b) {
    const p=project();if(!p || a===b)return;
    const names=p.artifacts.filter(x=>x.id===a||x.id===b).map(x=>x.name);
    if(names.length!==2)return;
    const label=globalThis.prompt?.(`How are these connected?\n${names.join(' / ')}`,'influences');if(label==null)return;
    if(!safe(label,160).trim())return notice('Connection label required.',true);
    try{D().createRelationship(p,{fromId:a,toId:b,label:safe(label,160),status:'possible'});persistProject(p);notice('Possible connection saved. Mark it established only after review.');renderAtlas()}
    catch(e){notice(e.message,true)}
  }
  function renderPrivacy() {
    const host=$('e14PrivacyOrigin');if(!host)return;
    let origin='local file';try{origin=location.origin==='null'?'local file':location.origin}catch{}
    const shared=origin.endsWith('github.io')||origin.includes('github.io');
    host.textContent=shared?`Current origin: ${origin}. A repository path is not a privacy boundary. Use an independently controlled domain for protected storage.`:`Current origin: ${origin}. Browser storage remains readable to code running on this same origin.`;
    host.dataset.warn=String(shared);
  }
  function installUI() {
    if ($('e14Workspace')) return;
    const workspace=text('section','','e14-workspace');workspace.id='e14Workspace';workspace.setAttribute('aria-label','Elsewhere Living Atlas');
    const head=text('header','','e14-head');head.append(text('div','ELSEWHERE / LIVING ATLAS','e14-eyebrow'),text('p','Make a thought. Keep its thread. Follow where it leads.','e14-tagline'));
    const tabs=text('div','','e14-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Living Atlas views');tabs.addEventListener('keydown',onTabKeys);
    for(const [id,label] of [['write','Write'],['atlas','Atlas'],['library','Library'],['privacy','Vault']]){const b=button(label,()=>setView(id));b.id=`e14Tab-${id}`;b.setAttribute('role','tab');b.setAttribute('aria-controls',`e14Panel-${id}`);b.setAttribute('aria-selected',String(id==='write'));b.tabIndex=id==='write'?0:-1;tabs.append(b)}
    workspace.append(head,tabs);
    const write=text('section','','e14-panel');write.id='e14Panel-write';write.setAttribute('role','tabpanel');write.setAttribute('aria-labelledby','e14Tab-write');
    const prompt=text('blockquote','','e14-current-prompt');prompt.id='e14Prompt';write.append(prompt);
    const label=text('label','Your response / exploration');label.htmlFor='e14Answer';write.append(label);
    const answer=document.createElement('textarea');answer.id='e14Answer';answer.rows=5;answer.maxLength=12000;answer.placeholder='Write freely. Nothing becomes established canon without your decision.';answer.addEventListener('input',()=>{changed=true});write.append(answer);
    const actions=text('div','','e14-actions');const kindSelect=document.createElement('select');kindSelect.id='e14ArtifactType';kindSelect.setAttribute('aria-label','Save response as artifact type');for(const key of ['note','scene','character','place','rule','memory','object','power','faction','culture','creature'])kindSelect.append(option(key,key));actions.append(kindSelect);actions.append(button('Save response',()=>saveResponse(kindSelect.value)),button('Save draft',saveDraft),button('Resume draft',resumeDraft),button('Make possible fact',candidateFact),button('Branch alternative',branchResponse),button('Follow-up questions',makeFollowUps));write.append(actions);
    const follow=text('div','','e14-follow-ups');follow.id='e14FollowUps';write.append(follow);workspace.append(write);
    const atlas=text('section','','e14-panel');atlas.id='e14Panel-atlas';atlas.setAttribute('role','tabpanel');atlas.setAttribute('aria-labelledby','e14Tab-atlas');atlas.hidden=true;
    const atlasHead=text('div','','e14-atlas-head');atlasHead.append(text('h3','Project constellation'));const count=text('span','','e14-muted');count.id='e14AtlasCount';atlasHead.append(count);atlas.append(atlasHead);
    const controls=text('div','','e14-atlas-controls');controls.append(button('Zoom in',()=>{zoom=Math.min(3,zoom*1.2);renderAtlas()}),button('Zoom out',()=>{zoom=Math.max(.45,zoom/1.2);renderAtlas()}),button('Reset view',()=>{zoom=1;panX=0;panY=0;atlasFocus=null;renderAtlas()}));
    const timeLabel=text('label','History revealed: 100%');timeLabel.htmlFor='e14Time';timeLabel.id='e14TimeLabel';controls.append(timeLabel);
    const time=document.createElement('input');time.type='range';time.min='0';time.max='100';time.step='5';time.value='100';time.id='e14Time';time.addEventListener('input',()=>{atlasTime=Number(time.value);timeLabel.textContent=`History revealed: ${atlasTime}%`;renderAtlas()});controls.append(time);atlas.append(controls);
    const graph=text('div','','e14-graph');graph.id='e14Graph';atlas.append(graph);const history=text('div','','e14-atlas-history');history.id='e14History';atlas.append(history);const detail=text('div','','e14-graph-detail');detail.id='e14GraphDetail';atlas.append(detail);workspace.append(atlas);
    const library=text('section','','e14-panel');library.id='e14Panel-library';library.hidden=true;library.setAttribute('role','tabpanel');library.setAttribute('aria-labelledby','e14Tab-library');
    const search=document.createElement('input');search.id='e14Search';search.type='search';search.placeholder='Find saved artifacts';search.setAttribute('aria-label','Find saved artifacts');search.addEventListener('input',renderCards);library.append(search);
    const cards=text('div','','e14-cards');cards.id='e14Cards';library.append(cards);library.append(text('h3','Compare two artifacts'));
    const compare=text('div','','e14-comparison');compare.id='e14Comparison';library.append(compare);
    const cross=text('div','','e14-cross');const check=document.createElement('input');check.type='checkbox';check.id='e14CrossProject';check.addEventListener('change',()=>{includeOtherProjects=check.checked;renderCrossSearch()});const crossLabel=text('label','Also search my other local projects');crossLabel.htmlFor=check.id;cross.append(check,crossLabel);
    const csearch=document.createElement('input');csearch.type='search';csearch.id='e14CrossSearch';csearch.placeholder='Search project names and artifacts';csearch.setAttribute('aria-label','Cross-project search');csearch.addEventListener('input',renderCrossSearch);cross.append(csearch);const results=text('div','','e14-cross-results');results.id='e14CrossResults';cross.append(results);library.append(cross);workspace.append(library);
    const privacy=text('section','','e14-panel');privacy.id='e14Panel-privacy';privacy.hidden=true;privacy.setAttribute('role','tabpanel');privacy.setAttribute('aria-labelledby','e14Tab-privacy');privacy.append(text('h3','Private by design, with honest boundaries'));
    const origin=text('p','','e14-privacy-origin');origin.id='e14PrivacyOrigin';privacy.append(origin);
    privacy.append(text('p','Your browser data is NOT encrypted at rest by the existing access lock. A vault backup can be encrypted with your own passphrase. Never use the initial Dexter password for encryption.','e14-muted'));
    const secure=text('label','Backup passphrase (12+ characters)');secure.htmlFor='e14VaultPass';privacy.append(secure);
    const pass=document.createElement('input');pass.id='e14VaultPass';pass.type='password';pass.minLength=12;pass.autocomplete='new-password';privacy.append(pass);
    const verify=text('label','Confirm backup passphrase');verify.htmlFor='e14VaultVerify';privacy.append(verify);const confirmPass=document.createElement('input');confirmPass.id='e14VaultVerify';confirmPass.type='password';confirmPass.autocomplete='new-password';privacy.append(confirmPass);
    const backupActions=text('div','','e14-actions');backupActions.append(button('Encrypted backup',encryptedBackup),button('Plain snapshot',backupPlain),button('Restore encrypted backup',()=>{if(!conflicted)$('e14VaultFile').click();else notice('Reload stale tab before restoring.',true)}));privacy.append(backupActions);
    const file=document.createElement('input');file.type='file';file.id='e14VaultFile';file.accept='.json,application/json';file.hidden=true;file.addEventListener('change',async()=>{if(file.files?.[0])await restoreVault(file.files[0]);file.value=''});privacy.append(file);workspace.append(privacy);
    const status=text('p','','e14-status');status.id='e14Status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');workspace.append(status);
    const stage=$('promptCard')?.closest('.stage');
    if(stage)stage.after(workspace);else if($('main'))$('main').append(workspace);else document.body.append(workspace);
    setView('write');renderPromptContext();renderPrivacy();
    window.addEventListener('elsewhere:prompt',()=>queueMicrotask(renderPromptContext));
    $('e14Answer').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();saveResponse()}});
    const manual=document.querySelector('.head-actions');if(manual)manual.append(button('Atlas',()=>{setView('atlas');workspace.scrollIntoView({behavior:motionOK()?'smooth':'instant',block:'start'})},'e14-head-launch'));
  }
  function renderCrossSearch() {
    const box=$('e14CrossResults');if(!box)return;box.textContent='';
    if(!includeOtherProjects){box.append(text('p','Other projects remain excluded until you enable this search.','e14-muted'));return}
    const q=$('e14CrossSearch')?.value?.trim().toLowerCase()||'';if(q.length<2)return box.append(text('p','Enter at least two characters.','e14-muted'));
    const st=state();for(const p of (st?.projects||[]).filter(p=>p.id!==st.activeProjectId)){
      const hits=(p.artifacts||[]).filter(a=>!a.retired&&`${a.name} ${a.summary}`.toLowerCase().includes(q)).slice(0,10);
      if(!hits.length&&!p.name.toLowerCase().includes(q))continue;
      const row=text('div','','e14-cross-row');row.append(text('strong',p.name));row.append(text('span',`${hits.length} matching artifacts`));
      row.append(button('Switch project',()=>{UI()?.projects?.switchProject?.(p.id);setTimeout(()=>{renderCards();renderAtlas();renderPromptContext()},0)}));box.append(row);
    }
    if(!box.children.length)box.append(text('p','No matches in other projects.','e14-muted'));
  }
  async function encryptedBackup() {
    if(busy)return;const pwd=$('e14VaultPass')?.value||'',verify=$('e14VaultVerify')?.value||'';
    if(pwd.length<12)return notice('Passphrase needs at least 12 characters.',true);
    if(pwd!==verify)return notice('Passphrases do not match.',true);
    busy=true;try{const backup=await seal(universeSnapshot(),pwd);download('Elsewhere-Encrypted-Vault.json',JSON.stringify(backup));notice('Encrypted vault downloaded. Keep the passphrase separately.');}
    catch(e){notice(e.message,true)}finally{busy=false;$('e14VaultPass').value='';$('e14VaultVerify').value=''}
  }
  async function restoreVault(file) {
    if(busy)return;if(file.size>35000000)return notice('Vault exceeds the 35 MB safety limit.',true);
    const password=globalThis.prompt?.('Enter the vault encryption passphrase.');if(password==null)return;
    busy=true;try{
      const envelope=JSON.parse(await file.text());const payload=await unseal(envelope,password);
      if(payload.app!=='Elsewhere'||payload.type!=='universe'||payload.schemaVersion!==S().SCHEMA_VERSION||!Array.isArray(payload.state?.projects))throw Error('Unsupported or invalid universe backup.');
      const validity=payload.state.projects.map(p=>S().validateProjectPayload?.(p));
      if(validity.some(v=>v&&!v.ok))throw Error('Backup contains invalid project references.');
      const count=payload.state.projects.length;
      if(!confirm(`Replace this browser's Elsewhere universe with ${count} project(s) from the encrypted backup? Save a copy of your current state first.`))return;
      download('Elsewhere-Pre-Restore-Snapshot.json',JSON.stringify(universeSnapshot(),null,2));
      const before=(state()?.projects||[]).map(p=>p.id);
      const result=S().importUniverse(payload,state());
      if(!result.ok)throw Error(result.message||'Restore validation failed.');
      const allowed=new Set(state().projects.map(p=>p.id));
      for(const id of before)if(!allowed.has(id))S().removeProjectStorage(S().runtime.adapter,id);
      S().flushDirty(S().runtime.adapter,state());
      const legacy=S().legacyStateFromV13(state());
      if(L()?.restoreState)await L().restoreState(legacy);
      renderCards();renderAtlas();renderPromptContext();notice('Encrypted backup restored. Your previous snapshot was downloaded.');
    } catch(e){notice(e.message||'Vault could not be restored.',true)}finally{busy=false}
  }
  function protectExistingImports() {
    let approved = false;
    document.addEventListener('change', async event => {
      const target=event.target;
      if(approved || !['backupImportInput','importStateFile'].includes(target?.id)) return;
      event.stopImmediatePropagation();
      const file=target.files?.[0];if(!file)return;
      if(conflicted){notice('Reload this stale tab before importing.',true);target.value='';return}
      if(file.size>35000000){notice('Backup exceeds the 35 MB limit.',true);target.value='';return}
      try {
        const incoming=JSON.parse(await file.text());
        const old=state()?.projects?.length||0;
        const count=Array.isArray(incoming?.state?.projects)?incoming.state.projects.length:0;
        const mode=target.id==='importStateFile'?'Replace legacy progress':incoming?.type==='project'?'Add a project':'Replace the universe';
        if(!confirm(`${mode}? Current browser: ${old} projects. Incoming backup: ${count} projects. A snapshot of the current state will be downloaded first.`)){target.value='';return}
        backupPlain();
        if(target.id==='importStateFile') {
          const legacy=incoming?.state||incoming;
          await L().restoreState(legacy);
          S().syncLegacyState(state(),L().getState());
          S().flushDirty(S().runtime.adapter,state());
          UI()?.renderControlRoom?.();notice('Legacy progress imported and v13 bridge updated.');
        } else {
          approved=true;
          target.dispatchEvent(new Event('change',{bubbles:false}));
          approved=false;
        }
      } catch(e) {approved=false;notice(`Import failed: ${e.message}`,true)}
      finally {target.value=''}
    },true);
  }
  function watchOtherTabs() {
    window.addEventListener('storage',event=>{
      if (!event.key || !event.key.startsWith('elsewhere:') || event.key==='elsewhere:access-lock:v1') return;
      conflicted=true;
      const modal=$('e14Conflict');
      if(modal?.open)return;
      if(modal){modal.showModal();modal.querySelector('button')?.focus()}
    });
  }
  function installConflictDialog() {
    const dialog=document.createElement('dialog');dialog.id='e14Conflict';dialog.className='e14-conflict';
    dialog.append(text('h2','Another Elsewhere tab changed this workspace'),text('p','This tab is paused to prevent overwriting newer work. Export from the newer tab, then reload this one. No changes in this tab have been deleted.'));
    dialog.append(button('Reload current tab',()=>location.reload()));dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);
  }
  function addNavigation() {
    const p=$('e14Workspace');if(!p)return;
    const observer=new MutationObserver(()=>{ if (!document.documentElement.classList.contains('elsewhere-locked')) { renderPromptContext(); } });
    const pt=$('promptText');if(pt)observer.observe(pt,{childList:true,characterData:true,subtree:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  function registerOffline() {
    if (location.protocol!=='https:' && location.hostname!=='localhost')return;
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{ /* optional offline capability */ });
  }
  function boot() {
    if(!S()?.runtime?.state || !D() || !L())return false;
    installUI();installConflictDialog();watchOtherTabs();protectExistingImports();addNavigation();registerOffline();
    const app={initialized:true,version:VERSION,graphForProject,graphPositions,seal,unseal,saveResponse,renderAtlas,setView,get conflicted(){return conflicted},get state(){return {view,atlasFocus,atlasTime,includeOtherProjects}}};
    globalThis.Elsewhere14=Object.freeze(app);return true;
  }
  globalThis.Elsewhere14=Object.freeze({initialized:false,version:VERSION,graphForProject,graphPositions,seal,unseal,boot,get conflicted(){return conflicted}});
  if(typeof document!=='undefined'){
    if(!boot()){
      let tries=0;const wait=()=>{if(boot())return;if(++tries<30)setTimeout(wait,60)};wait();
    }
  }
})();
