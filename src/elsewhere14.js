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
  let draftTimer = 0;
  let lastProjectId = null;
  let atlasPage = 0;
  let atlasQuery = '';
  let arranging = false;
  let lastLayoutUndo = null;
  const pendingWrites = new Map();
  const DRAFT_KEY = 'elsewhere:v14:session-drafts';
  const ATLAS_PAGE_SIZE = 120;
  const LIBRARY_PAGE_SIZE = 24;
  let libraryPage = 0;
  let librarySort = 'recent';
  let libraryFrame = 0;
  let writingSource = null;
  let canonReviewPage = 0;
  const CANON_REVIEW_PAGE_SIZE = 10;
  const MIN_ATLAS_ZOOM = .24;
  const MOBILE_LIBRARY_PAGE_SIZE = 8;
  // Non-sensitive presentation settings only. Never put project text into this preference key.
  const MOBILE_READ_PREF_KEY = 'elsewhere:v14:iphone-reading';
  const READ_SIZES = ['comfortable','large','extra'];
  const readScrollPositions = new Map();
  let readingSize = 'comfortable';
  let projectListSignature = '';
  function validReadSize(value) {return READ_SIZES.includes(value)?value:'comfortable'}
  function loadReadingSize() {
    try {readingSize = validReadSize(JSON.parse(localStorage.getItem(MOBILE_READ_PREF_KEY))?.size)}
    catch {readingSize = 'comfortable'}
    return readingSize;
  }
  function chooseReadingSize(size) {
    readingSize = validReadSize(size);
    const workspace = $('e14Workspace');
    if (workspace) workspace.dataset.readSize = readingSize;
    for(const choice of READ_SIZES){
      const b=$(`e14Read-${choice}`);
      if(b)b.setAttribute('aria-pressed',String(choice===readingSize));
    }
    try {localStorage.setItem(MOBILE_READ_PREF_KEY,JSON.stringify({size:readingSize}))}
    catch {notice('Text size changed for this session. Your browser cannot save display preferences.',true)}
    return readingSize;
  }

  const isMobileViewport = () => typeof matchMedia === 'function' && matchMedia('(max-width:700px), (max-height:520px) and (pointer:coarse)').matches;
  const isEditorField = el => !!el?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select, [contenteditable=true]');
  let draftRecoverable = false;
  function updateMobileKeyboard() {
    const editing = isMobileViewport() && isEditorField(document.activeElement);
    document.documentElement.classList.toggle('e14-keyboard-open', !!editing);
    const done = $('e14DismissKeyboard');
    if (done) done.hidden = !editing;
  }
  // Keep scroll history only in this tab. No browsing position enters saved creative canon.
  function scrollOffsetFor(viewName, y, workspaceTop) {
    return Math.max(0, Math.round(y-workspaceTop));
  }
  function navigateMobileView(id) {
    if (changed && $('e14Answer')?.value.trim()) {clearTimeout(draftTimer);storeSessionDraft();}
    const mobile=isMobileViewport(), workspace=$('e14Workspace');
    const top=workspace ? workspace.getBoundingClientRect().top + scrollY : 0;
    if(mobile && workspace)readScrollPositions.set(view,scrollOffsetFor(view,scrollY,top));
    if (isEditorField(document.activeElement)) document.activeElement.blur();
    const same=id===view;
    setView(id);
    if(mobile && workspace){
      const offset=same?0:(readScrollPositions.get(id)||0);
      // Two frames let iOS resize its visual viewport after the keyboard is dismissed.
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const bottom=Math.max(0,document.documentElement.scrollHeight-innerHeight);
        const targetTop=workspace.getBoundingClientRect().top + scrollY;
        scrollTo({top:Math.min(bottom,Math.max(0,targetTop+offset)),behavior:'auto'});
      }));
    }
    updateMobileKeyboard();
  }
  function renderProjectSwitcher() {
    const select=$('e14ProjectSelect'),st=state();if(!select||!st)return;
    const projects=(st.projects||[]).filter(p=>p?.id&&p?.name);
    const signature=JSON.stringify(projects.map(p=>[p.id,p.name]));
    if(signature!==projectListSignature){
      projectListSignature=signature;
      select.replaceChildren(option('','Choose a project'),...projects.map(p=>option(p.id,safe(p.name,80))));
    }
    const desired=st.activeProjectId||'';
    if(select.value!==desired)select.value=desired;
    const create=$('e14NewProject');if(create)create.hidden=projects.length>0;
  }
  function switchProjectFromPhone(nextId) {
    const select=$('e14ProjectSelect'),st=state(),before=project();
    if (!nextId || nextId===st?.activeProjectId){renderProjectSwitcher();return false}
    if(conflicted || !st?.projects?.some(p=>p.id===nextId)){
      notice('The requested project is not available in this tab.',true);renderProjectSwitcher();return false;
    }
    if(changed && $('e14Answer')?.value.trim()){
      clearTimeout(draftTimer);
      if(!storeSessionDraft(before?.id,$('e14Answer').value)){
        notice('Unsaved writing cannot be recovered. Save or copy it before switching.',true);
        renderProjectSwitcher();return false;
      }
    }
    try {
      const action=UI()?.projects?.switchProject;
      if(typeof action==='function')action(nextId);
      else if(typeof D()?.switchActiveProject==='function')D().switchActiveProject(st,nextId,current());
      else throw Error('Project switching is unavailable.');
      if(st.activeProjectId!==nextId)throw Error('Project was not activated.');
      syncEditorProject();renderPromptContext();
      renderProjectSwitcher();setView('write');
      notice(`Project selected: ${safe(project()?.name||'',80)}.`,false);
      return true;
    }catch(err){
      notice(err?.message||'Could not switch project.',true);renderProjectSwitcher();return false;
    }
  }



  function notice(message, error = false) {
    const node = $('e14Status');
    if (!node) return;
    node.textContent = message;
    node.dataset.error = String(error);
    const nearSave = $('e14WriterStatus');
    if (nearSave) {nearSave.textContent=message;nearSave.dataset.error=String(error);nearSave.hidden=view!=='write';}
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
    if(!confirm('This JSON contains your personal writing UNENCRYPTED. Anyone with the file can read it. Download anyway?'))return;
    try { download('Elsewhere-14-UNENCRYPTED-Snapshot.json', JSON.stringify(universeSnapshot(), null, 2)); notice('Unencrypted snapshot downloaded. Keep it somewhere private.'); }
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
  // A browser-local, per-tab crash-recovery cache. It does not encrypt data or sync across devices.
  function readSessionDrafts() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return {};
      const envelope = JSON.parse(raw);
      if (envelope?.version !== 1 || !envelope.drafts || typeof envelope.drafts !== 'object' || Array.isArray(envelope.drafts)) return {};
      const now = Date.now(), result = {};
      for (const [id, entry] of Object.entries(envelope.drafts)) {
        if (!id || id.length > 120 || !entry || typeof entry.value !== 'string' || entry.value.length > 12000) continue;
        if (!Number.isFinite(entry.at) || entry.at > now + 60000 || now - entry.at > 7*86400000) continue;
        result[id] = {value:entry.value,promptId:String(entry.promptId||'').slice(0,120),sourceArtifactId:String(entry.sourceArtifactId||'').slice(0,120),at:entry.at};
      }
      return result;
    } catch { return {}; }
  }
  function persistSessionDrafts(drafts) {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({version:1,drafts})); draftRecoverable = true; updateWordCount(); return true; }
    catch { draftRecoverable = false; updateWordCount(); notice('This browser cannot preserve unsaved writing; use Save draft.', true); return false; }
  }
  function storeSessionDraft(projectId = project()?.id, value = $('e14Answer')?.value || '') {
    if (!projectId || conflicted) return false;
    const drafts=readSessionDrafts();
    if (value.trim()) drafts[projectId]={value:safe(value),promptId:String(current()?.id||''),sourceArtifactId:writingSource?.projectId===projectId?writingSource.artifactId:'',at:Date.now()};
    else delete drafts[projectId];
    return persistSessionDrafts(drafts);
  }
  function clearSessionDraft(projectId) {
    if (!projectId) return;
    const drafts=readSessionDrafts();delete drafts[projectId];persistSessionDrafts(drafts);
    renderRecoveryAction();
  }
  function renderRecoveryAction() {
    const p=project(), button=$('e14Recover');
    if (!button) return;
    const draft=p && readSessionDrafts()[p.id];
    button.hidden=!draft;
    if(draft)button.textContent=`Recover unsaved writing · ${formatTime(draft.at)}`;
  }
  function activeWritingSource(p=project()) {
    if(!p||writingSource?.projectId!==p.id)return null;
    return p.artifacts?.find(a=>a.id===writingSource.artifactId&&!a.retired)||null;
  }
  function renderWritingSource(){
    const node=$('e14SourceContext');if(!node)return;node.textContent='';
    const a=activeWritingSource();if(a){node.append(text('span',`Writing from ${a.type}: ${a.name}. Your new work will retain this source link.`));node.append(button('Clear source',()=>{writingSource=null;renderWritingSource();if(changed)storeSessionDraft();notice('Source link cleared; writing unchanged.')}))}
    node.hidden=!a;
  }
  function beginWritingFromArtifact(id) {
    const p=project(),a=p?.artifacts?.find(a=>a.id===id&&!a.retired),el=$('e14Answer');
    if(!a)return notice('This artifact no longer exists.',true);
    if(changed&&el?.value.trim()&&!confirm('Discard unsaved writing on this screen? Save a draft or download it first if you want to keep it.'))return;
    if(changed&&el?.value.trim())clearSessionDraft(p.id);
    writingSource={projectId:p.id,artifactId:a.id};changed=false;if(el)el.value='';clearTimeout(draftTimer);
    lastPrompt=promptIdentity(current());setView('write');renderWritingSource();updateWordCount();el?.focus();notice(`Writing linked to ${a.name}. The original artifact is unchanged.`);
  }
  function syncEditorProject() {
    const id=project()?.id || null;
    const chip=$('e14MobileProject');if(chip)chip.textContent=project()?.name?`PROJECT  /  ${safe(project().name,80)}`:'NO ACTIVE PROJECT';
    if (lastProjectId!==id) {
      comparing=[];lastLayoutUndo=null;atlasFocus=null;atlasPage=0;atlasQuery='';canonReviewPage=0;
      if(lastProjectId && changed && $('e14Answer')?.value.trim()) storeSessionDraft(lastProjectId, $('e14Answer').value);
      const el=$('e14Answer'); if(el)el.value='';
      changed=false;writingSource=null;lastPrompt=null;lastProjectId=id;libraryPage=0;updateWordCount();renderWritingSource();
      if($('e14Workspace'))queueMicrotask(()=>{
        if(view==='atlas')renderAtlas();if(view==='library')renderCards();
        if($('e14CrossResults'))renderCrossSearch();
      });
    }
    renderRecoveryAction();
    renderProjectSwitcher();
    refreshSavedDraftShortcut();
  }
  function refreshSavedDraftShortcut() {
    const b=$('e14ResumeSaved'),p=project();if(!b)return;
    const candidate=p?.scratchpads?.find(x=>x.scopeId==null && x.text?.trim());
    b.hidden=!candidate;
    const context=$('e14SavedDraftContext');
    if(context){context.textContent=candidate?'A saved project draft is ready to continue.':'No saved project draft';context.hidden=!candidate;}
  }
  function recoverSessionDraft() {
    const p=project(), draft=p && readSessionDrafts()[p.id];
    if(!draft)return notice('No recoverable writing for this project.');
    const el=$('e14Answer');
    if(changed && el.value.trim() && !confirm('Replace the writing on this screen with the recovered draft?'))return;
    el.value=draft.value;writingSource=p.artifacts?.some(a=>a.id===draft.sourceArtifactId&&!a.retired)?{projectId:p.id,artifactId:draft.sourceArtifactId}:null;
    changed=true;updateWordCount();setView('write');renderWritingSource();el.focus();notice('Recovered writing from this browser tab. Save it to keep it.');
  }
  function scheduleSessionDraft() {
    clearTimeout(draftTimer);
    draftTimer=setTimeout(()=>{storeSessionDraft();renderRecoveryAction()},450);
  }
  function promptIdentity(p) { return p ? `${p.id || 'prompt'}:${p.text || ''}` : null; }
  function renderPromptContext() {
    syncEditorProject();
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
  // A failed browser-storage write must never create a second artifact on retry.
  // Keep intent IDs only for the lifetime of this tab; session drafts remain the
  // separate recovery mechanism when the page is closed or reloaded.
  function writeWithRetry(kind, p, raw, collection, factory) {
    const key=JSON.stringify([kind,p.id,raw,current()?.id||'',activeWritingSource(p)?.id||'']);
    const previous=pendingWrites.get(key);
    let record=previous && p[collection]?.find(item=>item.id===previous);
    if(!record)record=factory();
    const result=persistProject(p);
    if(result.persistent&&!result.failed?.length)pendingWrites.delete(key);
    else pendingWrites.set(key,record.id);
    return {record,result,retried:!!previous};
  }
  function writingPersisted(result){return result.persistent&&!result.failed?.length}
  function afterWrite(p,raw,result,successLabel){
    if(writingPersisted(result)){
      changed=false;writingSource=null;clearTimeout(draftTimer);clearSessionDraft(p.id);renderWritingSource();
      if($('e14Answer'))$('e14Answer').value='';updateWordCount();notice(successLabel);
    }else{
      storeSessionDraft(p.id,raw);
      notice('Not durable yet. Your writing remains visible; retry the save without creating a duplicate, or download a text copy.',true);
    }
  }
  async function copyWriting(){
    const raw=$('e14Answer')?.value||'';
    if(!raw.trim())return notice('Write something before copying.',true);
    if(!navigator.clipboard?.writeText)return notice('Clipboard access is unavailable. Use Download writing instead.',true);
    try {await navigator.clipboard.writeText(raw);notice('Writing copied to your clipboard. Other apps may access copied text.');return true}
    catch {notice('The browser did not allow clipboard access. You can select and copy the text manually.',true);return false}
  }
  async function shareWriting(){
    const raw=$('e14Answer')?.value||'';
    if(!raw.trim())return notice('Write something before sharing.',true);
    if(typeof navigator.share!=='function')return notice('Sharing is not available in this browser. Use Copy writing instead.',true);
    try {await navigator.share({title:'Elsewhere writing',text:raw});notice('Share sheet closed. Your writing is still here.');return true}
    catch(err){if(err?.name==='AbortError')notice('Share cancelled. Your writing is still here.');else notice('Sharing was not completed. Your writing is still here.',true);return false}
  }
  function downloadWriting() {
    const raw=$('e14Answer')?.value||'';
    if(!raw.trim())return notice('There is no writing to download.',true);
    download('Elsewhere-Writing-'+new Date().toISOString().slice(0,10)+'.txt',raw,'text/plain;charset=utf-8');
    notice('Unencrypted text copy requested. Keep it somewhere private.');
  }
  function saveResponse(asType = 'note') {
    const p = project(), prompt = current(), raw = $('e14Answer')?.value.trim();
    if (!p) { notice('Create or choose a project before saving a response.', true); UI()?.projects?.openProjectEditor?.(true); return null; }
    if (!raw) { notice('Write a response first.', true); $('e14Answer')?.focus(); return null; }
    if (!D()?.ARTIFACT_TYPES?.includes(asType)) { notice('Unsupported artifact type.', true); return null; }
    try {
      const label=prompt?.text?`Response: ${prompt.text.slice(0,76)}`:'Exploration response';
      const {record,result}=writeWithRetry(`response:${asType}`,p,raw,'artifacts',()=>{
        const origin=activeWritingSource(p);
        const entry=D().createArtifact(p,asType,{name:origin?`From ${origin.name.slice(0,65)}`:label,summary:raw.slice(0,760),tags:origin?['response','continuation']:['response'],meta:{content:safe(raw),sourcePromptId:prompt?.id||null,sourceText:prompt?.text||null,provenance:prompt?.sourceRefs||[],inspiredByArtifactId:origin?.id||null,status:'authored'}});
        p.timeline.push({id:`entry_${entry.id}`,label:`Saved ${asType}: ${entry.name}`,artifactIds:[entry.id],createdAt:Date.now(),order:Date.now(),sourceId:entry.id,kind:'response'});
        p.returnPoint={kind:'artifact',id:entry.id,label:entry.name};return entry;
      });
      afterWrite(p,raw,result,'Response saved locally.');if(writingPersisted(result))try{globalThis.dispatchEvent(new CustomEvent('elsewhere:response-saved',{detail:{text:raw}}))}catch{}refreshVisibleCollections();return record;
    }catch(e){notice(e.message,true);return null}
  }
  function saveDraft() {
    const p = project(), answer = $('e14Answer')?.value.trim();
    if (!p || !answer) return notice('Choose a project and write something before saving a draft.',true);
    try {
      D().setScratchpad(p, null, safe(answer));
      p.returnPoint={kind:'draft',id:p.id,label:'Draft response'};
      const result=persistProject(p);
      if(result.persistent&&!result.failed?.length){changed=false;clearTimeout(draftTimer);clearSessionDraft(p.id);updateWordCount();refreshSavedDraftShortcut();notice('Draft saved. Use Continue saved draft to return.');}
      else storeSessionDraft(p.id,answer);
    } catch(e) { notice(e.message,true); }
  }
  function resumeDraft() {
    const p=project(), draft=p?.scratchpads?.find(x=>x.scopeId == null && x.text)?.text;
    if (!draft) return notice('No project draft found.');
    if (changed && $('e14Answer').value.trim() && !confirm('Replace the unsaved writing currently visible?')) return;
    $('e14Answer').value = draft;
    changed = true;restoredDraftId=p.id;scheduleSessionDraft();updateWordCount();
    setView('write');$('e14Answer').focus();notice('Draft restored. Save it when ready.');
  }
  function candidateFact() {
    const p=project(),answer=$('e14Answer')?.value.trim(),prompt=current();
    if(!p || !answer)return notice('Choose a project and write a statement first.',true);
    try{
      const {result}=writeWithRetry('possible-fact',p,answer,'facts',()=>{
        const fact=D().createFact(p,{subject:'User hypothesis',relation:'suggests',freeText:safe(answer,1200),status:'possible',source:activeWritingSource(p)?`artifact:${activeWritingSource(p).id}`:`response:${prompt?.id||'manual'}`});
        p.timeline.push({id:`fact_event_${fact.id}`,label:'Possible fact added for review',sourceId:fact.id,kind:'possible-fact',order:Date.now()});return fact;
      });
      afterWrite(p,answer,result,'Saved as POSSIBLE, not established canon.');refreshVisibleCollections();
    }catch(e){notice(e.message,true)}
  }
  function makeFollowUps() {
    const raw=($('e14Answer')?.value||current()?.text||'').trim();
    if (!raw) return notice('Choose a prompt or write a response first.',true);
    const subject=safe(raw.replace(/\s+/g,' '),180);
    const questions=[`What concrete example would make "${subject}" more precise?`,`What could challenge or disprove this idea?`,`What would change next if this were true?`];
    const box=$('e14FollowUps');box.textContent='';
    for (const q of questions) box.append(button(q,()=>{ if (changed && $('e14Answer').value.trim() && !confirm('Replace your unsaved response?')) return; $('e14Answer').value=q;changed=true;scheduleSessionDraft();updateWordCount();setView('write');$('e14Answer').focus(); }));
    notice('Three follow-up directions, derived from your words.');
  }
  function branchResponse() {
    const p=project(),response=$('e14Answer')?.value.trim(),seed=current();
    if(!p || !response)return notice('Choose a project and write an alternative first.',true);
    try{
      const {result}=writeWithRetry('alternative',p,response,'artifacts',()=>{
        const a=D().createArtifact(p,'note',{name:'Alternative: '+(seed?.text||'new possibility').slice(0,70),summary:response.slice(0,780),tags:['alternative'],meta:{content:safe(response),branchOf:activeWritingSource(p)?.id||seed?.id||null,canonStatus:'possible'}});
        p.timeline.push({id:`branch_${a.id}`,label:`Explored alternative: ${a.name}`,kind:'branch',artifactIds:[a.id],order:Date.now()});return a;
      });
      afterWrite(p,response,result,'Alternative stored separately. Established facts were not changed.');refreshVisibleCollections();
    }catch(e){notice(e.message,true)}
  }
  // Defer costly invisible SVG/list rendering while composing on iPhone.
  // Entering the destination view always refreshes it.
  function refreshVisibleCollections() {
    if(view==='library')renderCards();
    else if(view==='atlas')renderAtlas();
  }
  function setView(value) {
    view=['write','atlas','library','privacy'].includes(value)?value:'write';
    for (const id of ['write','atlas','library','privacy']) {
      const b=$(`e14Tab-${id}`), panel=$(`e14Panel-${id}`);
      if(b) {b.setAttribute('aria-selected',String(view===id));b.tabIndex=view===id?0:-1;}
      if(panel)panel.hidden=id!==view;
    }
    if(view==='atlas')renderAtlas(); if(view==='library')renderCards(); if(view==='privacy')renderPrivacy(); if(view==='write')refreshSavedDraftShortcut();
    const dock=$('e14Tabs');if(dock)dock.dataset.activeView=view;
  }
  function changeLibraryPage(delta) {
    libraryPage=Math.max(0,libraryPage+delta);
    renderCards();
    if(isMobileViewport())requestAnimationFrame(()=> $('e14Search')?.scrollIntoView({behavior:motionOK()?'smooth':'auto',block:'start'}));
  }
  function onTabKeys(event) {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();const tabs=['write','atlas','library','privacy'];let i=tabs.indexOf(view);
    if(event.key==='ArrowRight')i=(i+1)%tabs.length;
    else if(event.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;
    else if(event.key==='Home')i=0;else i=tabs.length-1;
    setView(tabs[i]);$(`e14Tab-${tabs[i]}`)?.focus();
  }
  function updateWordCount() {
    const el=$('e14Answer'),counter=$('e14WordCount');
    if(counter)counter.textContent=`${(el?.value.trim().match(/\S+/g)||[]).length} words`;
    const status=$('e14DraftState');
    if(status)status.textContent=changed?(draftRecoverable?'Unsaved · recovery copy in this tab':'Unsaved · tap Save draft'):'No unsaved changes';
  }
  function libraryPageModel(artifacts,query='',sort='recent',page=0,pageSize=LIBRARY_PAGE_SIZE) {
    const q=String(query||'').trim().toLocaleLowerCase();
    const filtered=(artifacts||[]).filter(a=>a&&!a.retired&&(!q||`${a.name||''} ${a.type||''} ${(a.tags||[]).join(' ')} ${a.summary||''} ${a.meta?.content||''}`.toLocaleLowerCase().includes(q)));
    const ordered=[...filtered].sort((a,b)=>{
      if(sort==='name')return String(a.name||'').localeCompare(String(b.name||''))||String(a.id).localeCompare(String(b.id));
      if(sort==='oldest')return (a.createdAt||0)-(b.createdAt||0)||String(a.id).localeCompare(String(b.id));
      return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)||String(b.id).localeCompare(String(a.id));
    });
    const pages=Math.max(1,Math.ceil(ordered.length/pageSize));
    const currentPage=Math.max(0,Math.min(pages-1,Math.floor(Number(page)||0)));
    return {visible:ordered.slice(currentPage*pageSize,(currentPage+1)*pageSize),total:ordered.length,page:currentPage,pages};
  }
  function factReviewModel(facts,page=0,pageSize=CANON_REVIEW_PAGE_SIZE) {
    const queue=(facts||[]).filter(f=>f&&['idea','possible'].includes(f.status)&&!f.muted)
      .sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)||String(a.id).localeCompare(String(b.id)));
    const limit=Math.max(1,Math.min(20,Math.floor(Number(pageSize)||CANON_REVIEW_PAGE_SIZE)));
    const pages=Math.max(1,Math.ceil(queue.length/limit)),currentPage=Math.max(0,Math.min(pages-1,Math.floor(Number(page)||0)));
    return {visible:queue.slice(currentPage*limit,(currentPage+1)*limit),total:queue.length,pages,page:currentPage};
  }
  function establishReviewedFact(factId,rationale) {
    const p=project(),f=p?.facts?.find(x=>x.id===factId&&['idea','possible'].includes(x.status));
    const reason=safe(rationale,300).trim();
    if(!f)return notice('This candidate is no longer waiting for review.',true);
    if(conflicted)return notice('Reload the stale tab before reviewing canon.',true);
    if(reason.length<8)return notice('Explain this decision in at least eight characters.',true);
    if(!S()?.runtime?.adapter?.persistent)return notice('Canon review needs durable local storage. Export a backup first.',true);
    if(!confirm(`Establish as canon within “${p.name}”?\n\n${safe(f.freeText||[f.subject,f.relation,f.object].join(' '),240)}\n\nThis is YOUR explicit decision, not an externally verified fact.`))return;
    const before=clone(f);
    try {
      if(typeof D()?.reviseFact!=='function')throw Error('Fact revision capability is unavailable.');
      D().reviseFact(p,f.id,{status:'established'},reason);
      const result=persistProject(p);
      if(!writingPersisted(result))throw Error('Local storage could not confirm the canon decision.');
      renderCanonReview(p);renderAtlas();notice('Canon decision saved with its rationale and revision history.');
    }catch(error){
      for(const key of Object.keys(f))delete f[key];Object.assign(f,before);
      S()?.markDirty?.(`project:${p.id}:facts`);
      conflicted=true;renderCanonReview(p);
      notice(`${error.message} Durable canon is uncertain; this tab is now read-only.`,true);
    }
  }
  function renderCanonReview(p=project()) {
    const host=$('e14CanonReview');if(!host)return;host.textContent='';
    const model=factReviewModel(p?.facts||[],canonReviewPage);canonReviewPage=model.page;
    const count=$('e14CanonCount'),prev=$('e14CanonPrev'),next=$('e14CanonNext');
    if(count)count.textContent=`${model.total} pending · page ${model.page+1}/${model.pages}`;
    if(prev)prev.disabled=model.page===0;if(next)next.disabled=model.page>=model.pages-1;
    if(!model.total){host.append(text('p','No provisional facts awaiting review.','e14-muted'));return}
    for(const fact of model.visible){
      const row=text('article','','e14-review-item');const label=safe(fact.freeText||[fact.subject,fact.relation,fact.object].filter(Boolean).join(' '),1100);
      row.append(text('p',label),text('small',`${fact.status.toUpperCase()} · source: ${safe(fact.source||'not recorded',100)}`));
      const reason=document.createElement('input');reason.type='text';reason.maxLength=300;reason.placeholder='Why should this be established?';reason.setAttribute('aria-label',`Canon rationale for ${label.slice(0,65)}`);
      const action=button('Establish with rationale',()=>establishReviewedFact(fact.id,reason.value));action.disabled=true;
      reason.addEventListener('input',()=>{action.disabled=reason.value.trim().length<8});row.append(reason,action);host.append(row);
    }
  }
  function scheduleLibrary() {
    if(libraryFrame)return;
    libraryFrame=requestAnimationFrame(()=>{libraryFrame=0;if(view==='library')renderCards()});
  }
  function renderCards() {
    const box=$('e14Cards');if(!box)return;
    box.textContent='';const p=project();
    if (!p){box.append(text('p','Start a project to collect authored responses and artifacts.','e14-muted'));renderCanonReview(null);if($('e14Comparison'))$('e14Comparison').textContent='';return}
    const all=(p.artifacts||[]).filter(a=>a&&!a.retired);
    const q=$('e14Search')?.value||'';
    const model=libraryPageModel(all,q,librarySort,libraryPage,isMobileViewport()?MOBILE_LIBRARY_PAGE_SIZE:LIBRARY_PAGE_SIZE);libraryPage=model.page;
    const count=$('e14LibraryCount'),prev=$('e14LibraryPrev'),next=$('e14LibraryNext');
    if(count)count.textContent=`${model.total} artifacts · page ${model.page+1} of ${model.pages}`;
    if(prev)prev.disabled=model.page===0;
    if(next)next.disabled=model.page>=model.pages-1;
    const fragment=document.createDocumentFragment();
    for(const a of model.visible){
      const article=text('article','','e14-artifact');
      const head=text('div','','e14-artifact-head');head.append(text('strong',a.name));head.append(text('small',a.type));article.append(head);
      article.append(text('p',safe(a.meta?.content||a.summary,240)));
      const actions=text('div','','e14-mini-actions');
      actions.append(button('Open',()=>UI()?.projects?.openQuickLook?.(a.id)));
      actions.append(button('Continue writing',()=>beginWritingFromArtifact(a.id)));
      const existing=comparing.includes(a.id);
      actions.append(button(existing?'Remove compare':'Compare',()=>{
        comparing=existing?comparing.filter(x=>x!==a.id):[...comparing.slice(-1),a.id];renderCards();
      }));
      actions.append(button('Atlas',()=>revealArtifact(a.id)));article.append(actions);fragment.append(article);
    }
    box.append(fragment);
    if(!model.total)box.append(text('p','No matching artifacts. Clear the search to see all saved work.','e14-muted'));
    const comparison=$('e14Comparison');comparison.textContent='';
    const selected=comparing.map(id=>all.find(a=>a.id===id)).filter(Boolean);
    for(const a of selected){const item=text('article','','e14-artifact');item.append(text('strong',a.name),text('p',safe(a.meta?.content||a.summary,4000)));comparison.append(item)}
    if(selected.length===2){
      const shared=(selected[0].tags||[]).filter(tag=>(selected[1].tags||[]).includes(tag));
      const desc=text('p',`Compared as ${selected[0].type} and ${selected[1].type}. Shared tags: ${shared.length?shared.join(', '):'none'}. These are separate saved records; comparing does not merge or change canon.`,'e14-muted');
      comparison.prepend(desc);
    }
    renderCanonReview(p);
  }
  function palette(kind) {
    return ({character:'#b7e3ff',place:'#91f0d0',power:'#e2b0ff',scene:'#f5d79e',faction:'#f2a8ad',note:'#e5ebef',creature:'#f6b89f',rule:'#d3c2ff',culture:'#b0e4bd',memory:'#f4d6be',object:'#c9d3ff'})[kind]||'#a5cdeb';
  }
  // Bounded projection: neither the SVG nor its relationship edges may refer to unseen nodes.
  function graphForProject(p,percent=100,options={}) {
    if (!p) return {nodes:[],edges:[],projectId:null,total:0,pages:1,page:0,all:0};
    const all=(p.artifacts||[]).filter(a=>a && !a.retired && a.id).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||String(a.id).localeCompare(String(b.id)));
    const cutoff=Math.max(0,Math.min(100,Number(percent)||0));
    const chronological=all.slice(0,Math.floor(all.length*cutoff/100));
    const search=String(options.query||'').trim().toLocaleLowerCase();
    const matches=search?chronological.filter(a=>`${a.name||''} ${a.type||''} ${a.summary||''} ${(a.tags||[]).join(' ')}`.toLocaleLowerCase().includes(search)):chronological;
    const pageSize=Math.max(1,Math.min(ATLAS_PAGE_SIZE,Number(options.pageSize)||ATLAS_PAGE_SIZE));
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));
    const page=Math.max(0,Math.min(pages-1,Math.floor(Number(options.page)||0)));
    const nodes=matches.slice(page*pageSize,(page+1)*pageSize).map(a=>({id:a.id,label:a.name,type:a.type,summary:a.summary||'',createdAt:a.createdAt||0}));
    const nodeIds=new Set(nodes.map(n=>n.id));
    const edges=(p.relationships||[]).filter(r=>r.status!=='retired'&&!r.muted&&nodeIds.has(r.fromId)&&nodeIds.has(r.toId)).map(r=>({id:r.id,from:r.fromId,to:r.toId,label:r.label,status:r.status}));
    return {nodes,edges,projectId:p.id,total:matches.length,pages,page,all:all.length};
  }
  function graphPositions(graph) {
    const n=graph.nodes.length,positions=new Map();if(!n)return positions;
    const degree=new Map(graph.nodes.map(x=>[x.id,0]));for(const e of graph.edges){degree.set(e.from,(degree.get(e.from)||0)+1);degree.set(e.to,(degree.get(e.to)||0)+1)}
    const ordered=[...graph.nodes].sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0));
    const radius=Math.min(370,100+Math.sqrt(n)*27);
    ordered.forEach((item,i)=>{const angle=i*2.399963229728653;const r=radius*Math.sqrt((i+.5)/n);positions.set(item.id,{x:Math.cos(angle)*r,y:Math.sin(angle)*r})});
    return positions;
  }
  function fitAtlasCamera(positions) {
    const values=positions&&typeof positions.values==='function'?[...positions.values()]:Array.isArray(positions)?positions:[];
    const points=values.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(!points.length)return {zoom:1,panX:0,panY:0};
    const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
    const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
    const zoom=Math.max(MIN_ATLAS_ZOOM,Math.min(2.2,860/Math.max(130,maxX-minX+100),560/Math.max(110,maxY-minY+110)));
    return {zoom,panX:-(minX+maxX)*zoom/2,panY:-(minY+maxY)*zoom/2};
  }
  function fitVisibleAtlas() {
    if(!graphLayout.size)return notice('No visible nodes to fit.',true);
    ({zoom,panX,panY}=fitAtlasCamera(graphLayout));renderAtlas();notice('Constellation fitted without changing saved node positions.');
  }
  function centerFocusedAtlas() {
    const pos=graphLayout.get(atlasFocus);if(!pos)return notice('Select an artifact first.',true);
    zoom=Math.max(zoom,.95);panX=-pos.x*zoom;panY=-pos.y*zoom;renderAtlas();notice('Selected artifact centered.');
  }
  function boundAtlasPosition(value){
    const x=Number(value?.x),y=Number(value?.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Atlas position must have finite coordinates.');
    return {x:Math.max(-980,Math.min(980,Math.round(x))),y:Math.max(-980,Math.min(980,Math.round(y)))};
  }
  function commitAtlasPosition(p,id,pos) {
    if(!p?.artifacts?.some(a=>a.id===id&&!a.retired))throw Error('The artifact is no longer present.');
    if(conflicted)throw Error('Another tab changed this workspace. Reload before editing.');
    const before=p.atlasPositions?.[id]||null;
    if(!p.atlasPositions || typeof p.atlasPositions!=='object')p.atlasPositions={};
    p.atlasPositions[id]=boundAtlasPosition(pos);
    try {
      const result=persistProject(p);
      lastLayoutUndo={projectId:p.id,id,before};
      return result;
    }catch(error){if(before)p.atlasPositions[id]=before;else delete p.atlasPositions[id];throw error}
  }
  function undoAtlasPosition() {
    const p=project(),last=lastLayoutUndo;
    if(!p||!last||p.id!==last.projectId)return notice('Nothing to undo for this project.');
    if(conflicted)return notice('Reload this tab before changing node positions.',true);
    if(!p.atlasPositions || typeof p.atlasPositions!=='object')p.atlasPositions={};
    const prior=p.atlasPositions[last.id]||null;
    if(last.before)p.atlasPositions[last.id]=last.before;else delete p.atlasPositions[last.id];
    try {const result=persistProject(p);lastLayoutUndo=null;renderAtlas();if(result.persistent&&!result.failed?.length)notice('Last node placement undone and saved.');else notice('Placement reverted for this session only; export a backup.',true)}catch(error){if(prior)p.atlasPositions[last.id]=prior;notice(error.message,true)}
  }
  function resetAtlasLayout() {
    const p=project();if(!p)return notice('Choose a project first.');
    if(conflicted)return notice('Reload before changing node positions.',true);
    if(!p.atlasPositions||!Object.keys(p.atlasPositions).length)return notice('No custom node positions to reset.');
    if(!confirm('Reset this project’s custom node positions? Your artifacts and connections will remain intact.'))return;
    const old=p.atlasPositions;p.atlasPositions={};
    try {const result=persistProject(p);lastLayoutUndo=null;renderAtlas();if(result.persistent&&!result.failed?.length)notice('Layout reset and saved. Project content is unchanged.');else notice('Layout reset for this session only; export a backup.',true)}catch(error){p.atlasPositions=old;notice(error.message,true)}
  }
  function pointInAtlas(svg,event){
    const ctm=svg.getScreenCTM?.();
    if(ctm?.inverse && svg.createSVGPoint){const cursor=svg.createSVGPoint();cursor.x=event.clientX;cursor.y=event.clientY;const v=cursor.matrixTransform(ctm.inverse());return {x:(v.x-500-panX)/zoom,y:(v.y-350-panY)/zoom}}
    const rect=svg.getBoundingClientRect(),scale=Math.min(rect.width/1000,rect.height/700)||1;
    return {x:(event.clientX-rect.left-(rect.width-1000*scale)/2)/scale/zoom-(500+panX)/zoom,y:(event.clientY-rect.top-(rect.height-700*scale)/2)/scale/zoom-(350+panY)/zoom};
  }
  // Pure pinch-camera calculation: move the same world-space anchor under the fingers.
  function cameraFromPinch(gesture, first, second) {
    const distance = Math.max(1,Math.hypot(second.x-first.x,second.y-first.y));
    const midpoint = {x:(first.x+second.x)/2,y:(first.y+second.y)/2};
    const nextZoom = Math.max(MIN_ATLAS_ZOOM,Math.min(3,gesture.zoom*distance/gesture.distance));
    return {zoom:nextZoom,panX:midpoint.x-500-gesture.anchor.x*nextZoom,panY:midpoint.y-350-gesture.anchor.y*nextZoom};
  }
  function pointerToSvg(svg,event) {
    const box=svg.getBoundingClientRect();
    const scale=Math.min(box.width/1000,box.height/700)||1;
    return {x:(event.clientX-box.left-(box.width-1000*scale)/2)/scale,
            y:(event.clientY-box.top-(box.height-700*scale)/2)/scale};
  }
  function renderAtlas() {
    const host=$('e14Graph');if(!host)return;
    const p=project(),data=graphForProject(p,atlasTime,{page:atlasPage,query:atlasQuery});graphData=data;atlasPage=data.page;
    host.textContent='';if(atlasFocus && !data.nodes.some(a=>a.id===atlasFocus)){$('e14GraphDetail').textContent='';atlasFocus=null}
    $('e14AtlasCount').textContent=`${data.total} in view · ${data.nodes.length} drawn · ${data.edges.length} links · page ${data.page+1}/${data.pages}`;
    const prev=$('e14PrevPage'),next=$('e14NextPage');if(prev)prev.disabled=data.page===0;if(next)next.disabled=data.page>=data.pages-1;
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 700');svg.setAttribute('role','group');svg.setAttribute('aria-label',`${data.nodes.length} project artifacts arranged in a navigable network`);svg.setAttribute('aria-describedby','e14AtlasHint');
    const back=document.createElementNS(ns,'rect');back.setAttribute('width','1000');back.setAttribute('height','700');back.setAttribute('fill','transparent');svg.append(back);
    const layer=document.createElementNS(ns,'g');layer.setAttribute('class','e14-graph-layer');svg.append(layer);host.append(svg);
    renderAtlasDirectory(data);
    if(!p || !data.nodes.length){host.append(text('p',p?(data.all?'No artifacts match this view. Try clearing the search, changing pages, or revealing more history.':'Save an artifact to start its constellation.'):'Choose a project to reveal its atlas.','e14-graph-empty'));renderAtlasHistory(p);return}
    graphLayout=graphPositions(data);
    const pinned=p.atlasPositions&&typeof p.atlasPositions==='object'?p.atlasPositions:{};for(const n of data.nodes){const pos=pinned[n.id];if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)&&Math.abs(pos.x)<1000&&Math.abs(pos.y)<1000)graphLayout.set(n.id,{x:pos.x,y:pos.y})}
    const edgelayer=document.createElementNS(ns,'g'),nodelayer=document.createElementNS(ns,'g');layer.append(edgelayer,nodelayer);
    const coord=(id)=>graphLayout.get(id)||{x:0,y:0};
    const svgEdges=[];
    let nodeDrag=null;
    const fingers=new Map();let pinch=null;let blockTapUntil=0;
    for(const e of data.edges){const a=coord(e.from),b=coord(e.to);const line=document.createElementNS(ns,'line');line.setAttribute('x1',String(a.x));line.setAttribute('y1',String(a.y));line.setAttribute('x2',String(b.x));line.setAttribute('y2',String(b.y));line.setAttribute('class',e.status==='established'?'e14-edge established':'e14-edge possible');const tooltip=document.createElementNS(ns,'title');tooltip.textContent=`${e.label} (${e.status})`;line.append(tooltip);edgelayer.append(line);svgEdges.push({link:e,line})}
    for(const a of data.nodes){
      const pos=coord(a.id),g=document.createElementNS(ns,'g');g.setAttribute('class','e14-node');g.setAttribute('transform',`translate(${pos.x} ${pos.y})`);
      g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${a.type}: ${a.label}`);g.dataset.artifactId=a.id;
      const circle=document.createElementNS(ns,'circle');circle.setAttribute('r',atlasFocus===a.id?'19':'13');circle.setAttribute('fill',palette(a.type));circle.setAttribute('fill-opacity',atlasFocus===a.id?'1':'.84');circle.setAttribute('stroke','#e8f2ff');circle.setAttribute('stroke-opacity','.55');circle.setAttribute('stroke-width','1.4');g.append(circle);
      // Transparent SVG hit region gives fingers a usable target at iPhone widths.
      const hit=document.createElementNS(ns,'circle');hit.setAttribute('class','e14-node-hit');
      hit.setAttribute('r',String(Math.max(28,Math.min(70,24*1000/Math.max(260,svg.clientWidth||1000)))));
      hit.setAttribute('fill','transparent');g.append(hit);
      const label=document.createElementNS(ns,'text');label.setAttribute('y','31');label.setAttribute('text-anchor','middle');label.setAttribute('fill','#eef5ff');label.setAttribute('class','e14-node-label');label.textContent=a.label.length>27?a.label.slice(0,26)+'...':a.label;g.append(label);
      const t=document.createElementNS(ns,'title');t.textContent=`${a.type}: ${a.label}`;g.append(t);
      const open=()=>{
        selectAtlasNode(a.id);
        if(isMobileViewport())requestAnimationFrame(()=> $('e14GraphDetail')?.scrollIntoView({behavior:motionOK()?'smooth':'auto',block:'nearest'}));
      };
      g.addEventListener('click',()=>{
        if(Date.now()<blockTapUntil)return;
        if(g.dataset.justDragged==='1'){delete g.dataset.justDragged;return}open();
      });
      g.addEventListener('pointerdown',event=>{
        if(!arranging||event.button!==0)return;
        event.preventDefault();event.stopPropagation();
        const anchor=pointInAtlas(svg,event),original=coord(a.id);
        nodeDrag={id:a.id,pointerId:event.pointerId,original:{...original},dx:original.x-anchor.x,dy:original.y-anchor.y,moved:false,element:g};
        svg.setPointerCapture?.(event.pointerId);
      });
      g.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();open();return}
        if(!arranging||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
        event.preventDefault();const point=coord(a.id),step=event.shiftKey?3:16;
        const next={x:point.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:point.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)};
        try{commitAtlasPosition(p,a.id,next);renderAtlas();[...$('e14Graph').querySelectorAll('.e14-node')].find(n=>n.dataset.artifactId===a.id)?.focus()}catch(error){notice(error.message,true)}
      });nodelayer.append(g);
    }
    renderAtlasHistory(p);
    applyTransform(layer);
    svg.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.max(MIN_ATLAS_ZOOM,Math.min(3,zoom*(event.deltaY>0?.9:1.1)));applyTransform(layer)},{passive:false});
    let dragging=null;
    svg.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch')return;
      fingers.set(event.pointerId,pointerToSvg(svg,event));
      if(fingers.size===2){
        const [a,b]=[...fingers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        pinch={distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),zoom,anchor:{x:(mid.x-500-panX)/zoom,y:(mid.y-350-panY)/zoom}};
        nodeDrag=null;dragging=null;blockTapUntil=Date.now()+500;
      }
    },true);
    svg.addEventListener('pointermove',event=>{
      if(event.pointerType!=='touch'||!fingers.has(event.pointerId))return;
      fingers.set(event.pointerId,pointerToSvg(svg,event));
      if(pinch&&fingers.size>=2){
        const [a,b]=[...fingers.values()],next=cameraFromPinch(pinch,a,b);
        zoom=next.zoom;panX=next.panX;panY=next.panY;applyTransform(layer);
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
    const endTouch=event=>{
      if(!fingers.has(event.pointerId))return;
      fingers.delete(event.pointerId);
      if(pinch&&fingers.size<2){pinch=null;dragging=null;nodeDrag=null;blockTapUntil=Date.now()+450;}
    };
    svg.addEventListener('pointerup',endTouch,true);svg.addEventListener('pointercancel',endTouch,true);
    svg.addEventListener('pointerdown',event=>{if(pinch||event.target.closest?.('.e14-node'))return;dragging={x:event.clientX,y:event.clientY,px:panX,py:panY};svg.setPointerCapture?.(event.pointerId)});
    svg.addEventListener('pointermove',event=>{
      if(nodeDrag&&event.pointerId===nodeDrag.pointerId){
        const at=pointInAtlas(svg,event),point=boundAtlasPosition({x:at.x+nodeDrag.dx,y:at.y+nodeDrag.dy});
        if(Math.abs(point.x-nodeDrag.original.x)+Math.abs(point.y-nodeDrag.original.y)>3)nodeDrag.moved=true;
        graphLayout.set(nodeDrag.id,point);nodeDrag.element.setAttribute('transform',`translate(${point.x} ${point.y})`);
        for(const {link,line} of svgEdges)if(link.from===nodeDrag.id||link.to===nodeDrag.id){const a=coord(link.from),b=coord(link.to);line.setAttribute('x1',String(a.x));line.setAttribute('y1',String(a.y));line.setAttribute('x2',String(b.x));line.setAttribute('y2',String(b.y))}
        return;
      }
      if(!dragging)return;const factor=1000/Math.max(200,svg.clientWidth);panX=dragging.px+(event.clientX-dragging.x)*factor;panY=dragging.py+(event.clientY-dragging.y)*factor;applyTransform(layer)
    });
    const stop=event=>{
      dragging=null;
      if(!nodeDrag||event.pointerId!==nodeDrag.pointerId)return;
      const item=nodeDrag;nodeDrag=null;
      if(event.type==='pointercancel'||!item.moved){renderAtlas();return}
      try{
        const result=commitAtlasPosition(p,item.id,graphLayout.get(item.id));
        item.element.dataset.justDragged='1';
        if(result.failed?.length)notice('Node placement is temporary; export or retry after storage recovers.',true);
      }catch(error){graphLayout.set(item.id,item.original);notice(error.message,true)}
      renderAtlas();
    };
    svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
  }
  function revealArtifact(id) {
    const p=project();if(!p || !(p.artifacts||[]).some(a=>a.id===id && !a.retired))return;
    const chronological=p.artifacts.filter(a=>a && !a.retired && a.id).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||String(a.id).localeCompare(String(b.id)));
    const index=chronological.findIndex(a=>a.id===id);
    if(index<0)return;
    atlasTime=100;atlasQuery='';atlasPage=Math.floor(index/ATLAS_PAGE_SIZE);atlasFocus=id;
    if($('e14Time'))$('e14Time').value='100';if($('e14TimeLabel'))$('e14TimeLabel').textContent='History revealed: 100%';if($('e14AtlasFind'))$('e14AtlasFind').value='';
    setView('atlas');selectAtlasNode(id);centerFocusedAtlas();
    $('e14GraphDetail')?.scrollIntoView({behavior:motionOK()?'smooth':'auto',block:'nearest'});
  }
  function renderAtlasDirectory(data) {
    const host=$('e14Directory');if(!host)return;host.textContent='';
    if(!data.nodes.length) return;
    const summary=text('summary',`Browse as list · ${data.nodes.length} artifacts`);
    const list=text('div','','e14-directory-list');
    for(const item of data.nodes){const row=button(`${item.type}: ${item.label}`,()=>{selectAtlasNode(item.id);$('e14GraphDetail')?.scrollIntoView({behavior:motionOK()?'smooth':'auto',block:'nearest'})});row.dataset.artifactId=item.id;list.append(row)}
    host.append(summary,list);
  }
  function scheduleAtlas() {
    if(graphFrame)return;
    graphFrame=requestAnimationFrame(()=>{graphFrame=0;if(view==='atlas')renderAtlas()});
  }
  function renderAtlasHistory(p){
    const host=$('e14History');if(!host)return;host.textContent='';
    const items=(p?.timeline||[]).slice(-20).reverse();if(!items.length)return;
    host.append(text('h4','Recent creative trail'));const list=text('div','','e14-history-list');
    for(const entry of items){const item=text('div','','e14-history-item');item.append(text('span',`${entry.label||entry.kind||'Project event'} - ${formatTime(entry.createdAt||entry.order||Date.now())}`));
      const id=entry.artifactIds?.find(id=>(p.artifacts||[]).some(a=>a.id===id));if(id)item.append(button('Reveal',()=>revealArtifact(id)));list.append(item)}host.append(list);
  }
  function applyTransform(layer) {layer.setAttribute('transform',`translate(${500+panX} ${350+panY}) scale(${zoom})`)}
  function selectAtlasNode(id) {
    atlasFocus=id;const p=project(),a=p?.artifacts?.find(a=>a.id===id),detail=$('e14GraphDetail');if(!a)return;
    detail.textContent='';const head=text('div','','e14-artifact-head');head.append(text('strong',a.name),text('small',a.type));detail.append(head,text('p',safe(a.meta?.content||a.summary,600)));
    const f=(p.facts||[]).filter(f=>f.subjectId===id||f.objectId===id);
    if(f.length){detail.append(text('h4','Recorded facts'));for(const fact of f.slice(0,12)){const row=text('p',`${fact.status.toUpperCase()} - ${fact.freeText||[fact.subject,fact.relation,fact.object].join(' ')}`,'e14-fact');detail.append(row)}}
    const links=(p.relationships||[]).filter(link=>!link.muted&&link.status!=='retired'&&(link.fromId===id||link.toId===id));
    if(links.length){
      detail.append(text('h4',`Connections (${links.length})`));
      const group=text('div','','e14-mini-actions');
      for(const link of links.slice(0,20)){
        const otherId=link.fromId===id?link.toId:link.fromId;
        const other=p.artifacts?.find(item=>item.id===otherId&&!item.retired);
        if(!other)continue;
        const direction=link.fromId===id?'→':'←';
        group.append(button(`${direction} ${link.label||'connected to'}: ${other.name} (${link.status})`,()=>revealArtifact(other.id)));
      }
      detail.append(group);
      if(links.length>20)detail.append(text('p',`Showing the first 20 of ${links.length} links. Use search to explore other relationships.`,'e14-muted'));
    }
    if(a.meta?.sourcePromptId)detail.append(text('p',`Source prompt: ${a.meta.sourceText||a.meta.sourcePromptId}`,'e14-source'));
    if(a.meta?.inspiredByArtifactId){const origin=p.artifacts?.find(x=>x.id===a.meta.inspiredByArtifactId&&!x.retired);if(origin)detail.append(button(`Origin: ${origin.name}`,()=>revealArtifact(origin.id)));}
    const impacts= f.filter(x=>x.status==='established').map(x=>globalThis.ElsewhereV13Uplift?.canonImpactSet?.(p,x.id,{status:'possible'})).filter(Boolean);
    if(impacts.length)detail.append(text('p',`Dependency preview: ${impacts.reduce((n,x)=>n+x.counts.direct,0)} directly linked records; ${impacts.reduce((n,x)=>n+x.counts.possible,0)} possible textual echoes. No facts were changed.`,'e14-muted'));
    const actions=text('div','','e14-mini-actions');actions.append(button('Open artifact',()=>UI()?.projects?.openQuickLook?.(id)));
    actions.append(button('Continue writing',()=>beginWritingFromArtifact(id)));
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
    const projectChip=text('p','','e14-mobile-project');projectChip.id='e14MobileProject';head.append(projectChip);
    const projectRow=text('div','','e14-mobile-project-row');projectRow.id='e14ProjectRow';
    const projectLabel=text('label','Current project');projectLabel.htmlFor='e14ProjectSelect';projectRow.append(projectLabel);
    const projectSelect=document.createElement('select');projectSelect.id='e14ProjectSelect';projectSelect.setAttribute('aria-label','Choose active project');
    projectSelect.addEventListener('change',()=>{switchProjectFromPhone(projectSelect.value);if(isEditorField(document.activeElement))document.activeElement.blur();requestAnimationFrame(updateMobileKeyboard)});projectRow.append(projectSelect);
    const newProject=button('New project',()=>UI()?.projects?.openProjectEditor?.(true));newProject.id='e14NewProject';projectRow.append(newProject);head.append(projectRow);
    const readPanel=text('details','','e14-read-settings');readPanel.id='e14ReadSettings';readPanel.append(text('summary','Aa · Reading size'));
    const readControls=text('div','','e14-read-controls');readControls.setAttribute('role','group');readControls.setAttribute('aria-label','Reading size');
    for(const [id,label] of [['comfortable','Comfortable'],['large','Large'],['extra','Extra large']]){
      const b=button(label,()=>chooseReadingSize(id));b.id=`e14Read-${id}`;b.setAttribute('aria-pressed',String(id===readingSize));readControls.append(b);
    }
    readPanel.append(readControls);head.append(readPanel);
    const tabs=text('div','','e14-tabs');tabs.id='e14Tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Living Atlas views');tabs.addEventListener('keydown',onTabKeys);
    for(const [id,label] of [['write','Write'],['atlas','Atlas'],['library','Library'],['privacy','Vault']]){const b=button(label,()=>navigateMobileView(id));b.id=`e14Tab-${id}`;b.setAttribute('role','tab');b.setAttribute('aria-controls',`e14Panel-${id}`);b.setAttribute('aria-selected',String(id==='write'));b.tabIndex=id==='write'?0:-1;tabs.append(b)}
    workspace.append(head,tabs);
    const write=text('section','','e14-panel');write.id='e14Panel-write';write.setAttribute('role','tabpanel');write.setAttribute('aria-labelledby','e14Tab-write');
    const prompt=text('blockquote','','e14-current-prompt');prompt.id='e14Prompt';write.append(prompt);
    const savedDraftBar=text('div','','e14-saved-draft-bar');savedDraftBar.id='e14SavedDraftBar';
    const savedDraftShortcut=button('Continue saved draft',resumeDraft);savedDraftShortcut.id='e14ResumeSaved';savedDraftShortcut.hidden=true;
    const savedDraftContext=text('span','','e14-muted');savedDraftContext.id='e14SavedDraftContext';savedDraftContext.hidden=true;
    savedDraftBar.append(savedDraftShortcut,savedDraftContext);write.append(savedDraftBar);
    const label=text('label','Your response / exploration');label.htmlFor='e14Answer';write.append(label);
    const answer=document.createElement('textarea');answer.id='e14Answer';answer.rows=5;answer.maxLength=12000;
    answer.spellcheck=true;answer.setAttribute('autocapitalize','sentences');answer.setAttribute('enterkeyhint','enter');
    answer.placeholder='Write freely. Nothing becomes established canon without your decision.';answer.addEventListener('input',()=>{changed=true;draftRecoverable=false;scheduleSessionDraft();updateWordCount()});write.append(answer);
    const writingMeta=text('div','','e14-writing-meta');
    const wordCount=text('span','0 words','e14-muted');wordCount.id='e14WordCount';writingMeta.append(wordCount);
    const draftStatus=text('span','No unsaved changes','e14-draft-state');draftStatus.id='e14DraftState';writingMeta.append(draftStatus);
    const recover=button('Recover unsaved writing',recoverSessionDraft);recover.id='e14Recover';recover.hidden=true;writingMeta.append(recover);
    write.append(writingMeta);
    const sourceContext=text('div','','e14-source-context');sourceContext.id='e14SourceContext';sourceContext.hidden=true;sourceContext.setAttribute('role','status');write.append(sourceContext);
    const kindSelect=document.createElement('select');kindSelect.id='e14ArtifactType';kindSelect.setAttribute('aria-label','Save response as artifact type');for(const key of ['note','scene','character','place','rule','memory','object','power','faction','culture','creature'])kindSelect.append(option(key,key));
    const primary=text('div','','e14-primary-actions');primary.append(button('Save response',()=>saveResponse(kindSelect.value)),button('Save draft',saveDraft));write.append(primary);
    const nearSave=text('p','','e14-writer-feedback');nearSave.id='e14WriterStatus';nearSave.hidden=true;write.append(nearSave);
    const more=text('details','','e14-writing-more');more.id='e14WritingMore';const summary=text('summary','More writing tools');more.append(summary);
    const actions=text('div','','e14-actions');const kindLabel=text('label','Save response as');kindLabel.htmlFor='e14ArtifactType';actions.append(kindLabel,kindSelect);
    actions.append(button('Resume draft',resumeDraft),button('Make possible fact',candidateFact),button('Branch alternative',branchResponse),button('Follow-up questions',makeFollowUps),button('Copy writing',copyWriting),button('Share writing (unencrypted)',shareWriting),button('Download writing (unencrypted)',downloadWriting));more.append(actions);write.append(more);
    const follow=text('div','','e14-follow-ups');follow.id='e14FollowUps';write.append(follow);workspace.append(write);
    const atlas=text('section','','e14-panel');atlas.id='e14Panel-atlas';atlas.setAttribute('role','tabpanel');atlas.setAttribute('aria-labelledby','e14Tab-atlas');atlas.hidden=true;
    const atlasHead=text('div','','e14-atlas-head');atlasHead.append(text('h3','Project constellation'));const count=text('span','','e14-muted');count.id='e14AtlasCount';atlasHead.append(count);atlas.append(atlasHead);
    const controls=text('div','','e14-atlas-controls');controls.append(button('Zoom in',()=>{zoom=Math.min(3,zoom*1.2);renderAtlas()}),button('Zoom out',()=>{zoom=Math.max(MIN_ATLAS_ZOOM,zoom/1.2);renderAtlas()}),button('Reset view',()=>{zoom=1;panX=0;panY=0;atlasFocus=null;renderAtlas()}));
    controls.append(button('Fit visible',fitVisibleAtlas),button('Center selected',centerFocusedAtlas));
    const arrange=button('Arrange nodes: off',()=>{
      arranging=!arranging;arrange.textContent=`Arrange nodes: ${arranging?'on':'off'}`;
      arrange.setAttribute('aria-pressed',String(arranging));
      notice(arranging?'Drag nodes with pointer, or focus a node and use arrow keys. Hold Shift for smaller steps.':'Node arrangement turned off.');
    });arrange.id='e14Arrange';arrange.setAttribute('aria-pressed','false');
    const advancedLayout=text('details','','e14-layout-details');advancedLayout.id='e14LayoutDetails';
    advancedLayout.append(text('summary','Arrange map layout'));
    const layoutActions=text('div','','e14-atlas-layout-actions');layoutActions.append(arrange,button('Undo placement',undoAtlasPosition),button('Reset node layout',resetAtlasLayout));
    advancedLayout.append(layoutActions);controls.append(advancedLayout);
    const finder=document.createElement('input');finder.type='search';finder.id='e14AtlasFind';finder.placeholder='Filter artifacts in this project';finder.setAttribute('aria-label','Filter constellation artifacts');finder.addEventListener('input',()=>{atlasQuery=finder.value;atlasPage=0;scheduleAtlas()});controls.append(finder);
    const prev=button('← Earlier',()=>{atlasPage=Math.max(0,atlasPage-1);renderAtlas()});prev.id='e14PrevPage';const next=button('Later →',()=>{atlasPage+=1;renderAtlas()});next.id='e14NextPage';controls.append(prev,next);
    const timeLabel=text('label','History revealed: 100%');timeLabel.htmlFor='e14Time';timeLabel.id='e14TimeLabel';controls.append(timeLabel);
    const time=document.createElement('input');time.type='range';time.min='0';time.max='100';time.step='5';time.value='100';time.id='e14Time';time.addEventListener('input',()=>{atlasTime=Number(time.value);atlasPage=0;timeLabel.textContent=`History revealed: ${atlasTime}%`;scheduleAtlas()});controls.append(time);atlas.append(controls);
    const hint=text('p','Solid azure links are established; dashed coral links are possible. Select a node for facts. Fit visible does not change the saved layout. Activate Arrange nodes to drag or move nodes with arrow keys.','e14-muted');hint.id='e14AtlasHint';atlas.append(hint);
    const graph=text('div','','e14-graph');graph.id='e14Graph';atlas.append(graph);    const directory=text('details','','e14-directory');directory.id='e14Directory';atlas.append(directory);
    if(isMobileViewport())atlas.insertBefore(directory,graph);const history=text('div','','e14-atlas-history');history.id='e14History';atlas.append(history);const detail=text('div','','e14-graph-detail');detail.id='e14GraphDetail';atlas.append(detail);workspace.append(atlas);
    const library=text('section','','e14-panel');library.id='e14Panel-library';library.hidden=true;library.setAttribute('role','tabpanel');library.setAttribute('aria-labelledby','e14Tab-library');
    const search=document.createElement('input');search.id='e14Search';search.type='search';search.placeholder='Find saved artifacts';search.setAttribute('aria-label','Find saved artifacts');search.addEventListener('input',()=>{libraryPage=0;scheduleLibrary()});library.append(search);
    const libraryControls=text('div','','e14-library-controls');
    const order=document.createElement('select');order.id='e14LibrarySort';order.setAttribute('aria-label','Sort saved artifacts');
    for(const [value,label] of [['recent','Newest first'],['oldest','Oldest first'],['name','Alphabetical']])order.append(option(value,label));
    order.addEventListener('change',()=>{librarySort=order.value;libraryPage=0;renderCards()});libraryControls.append(order);
    const prevLib=button('Previous page',()=>changeLibraryPage(-1));prevLib.id='e14LibraryPrev';libraryControls.append(prevLib);
    const countLib=text('span','0 artifacts','e14-muted');countLib.id='e14LibraryCount';countLib.setAttribute('role','status');countLib.setAttribute('aria-live','polite');libraryControls.append(countLib);
    const nextLib=button('Next page',()=>changeLibraryPage(1));nextLib.id='e14LibraryNext';libraryControls.append(nextLib);library.append(libraryControls);
    const cards=text('div','','e14-cards');cards.id='e14Cards';library.append(cards);library.append(text('h3','Compare two artifacts'));
    const compare=text('div','','e14-comparison');compare.id='e14Comparison';library.append(compare);
    library.append(text('h3','Canon decisions'),text('p','Ideas and possible facts remain provisional until you explicitly establish them and record why.','e14-muted'));
    const canonNavigation=text('div','','e14-library-controls');
    const prevCanon=button('Previous candidates',()=>{canonReviewPage=Math.max(0,canonReviewPage-1);renderCanonReview()});prevCanon.id='e14CanonPrev';canonNavigation.append(prevCanon);
    const canonCount=text('span','0 pending','e14-muted');canonCount.id='e14CanonCount';canonCount.setAttribute('role','status');canonCount.setAttribute('aria-live','polite');canonNavigation.append(canonCount);
    const nextCanon=button('Next candidates',()=>{canonReviewPage++;renderCanonReview()});nextCanon.id='e14CanonNext';canonNavigation.append(nextCanon);
    library.append(canonNavigation);const canonList=text('div','','e14-review-list');canonList.id='e14CanonReview';library.append(canonList);
    const cross=text('div','','e14-cross'),crossOptin=text('div','','e14-cross-optin');const check=document.createElement('input');check.type='checkbox';check.id='e14CrossProject';check.addEventListener('change',()=>{includeOtherProjects=check.checked;renderCrossSearch()});const crossLabel=text('label','Also search my other local projects');crossLabel.htmlFor=check.id;crossOptin.append(check,crossLabel);cross.append(crossOptin);
    const csearch=document.createElement('input');csearch.type='search';csearch.id='e14CrossSearch';csearch.placeholder='Search project names and artifacts';csearch.setAttribute('aria-label','Cross-project search');csearch.addEventListener('input',renderCrossSearch);cross.append(csearch);const results=text('div','','e14-cross-results');results.id='e14CrossResults';cross.append(results);library.append(cross);workspace.append(library);
    const privacy=text('section','','e14-panel');privacy.id='e14Panel-privacy';privacy.hidden=true;privacy.setAttribute('role','tabpanel');privacy.setAttribute('aria-labelledby','e14Tab-privacy');privacy.append(text('h3','Vault and browser privacy boundaries'));
    const origin=text('p','','e14-privacy-origin');origin.id='e14PrivacyOrigin';privacy.append(origin);
    privacy.append(text('p','Your browser data is NOT encrypted at rest by the existing access lock. A vault backup can be encrypted with your own passphrase. Never use the initial Dexter password for encryption.','e14-muted'));
    const secure=text('label','Backup passphrase (12+ characters)');secure.htmlFor='e14VaultPass';privacy.append(secure);
    const pass=document.createElement('input');pass.id='e14VaultPass';pass.type='password';pass.minLength=12;pass.autocomplete='new-password';privacy.append(pass);
    const verify=text('label','Confirm backup passphrase');verify.htmlFor='e14VaultVerify';privacy.append(verify);const confirmPass=document.createElement('input');confirmPass.id='e14VaultVerify';confirmPass.type='password';confirmPass.autocomplete='new-password';privacy.append(confirmPass);
    const backupActions=text('div','','e14-actions');backupActions.append(button('Encrypted backup',encryptedBackup),button('Restore encrypted backup',()=>{if(!conflicted)$('e14VaultFile').click();else notice('Reload stale tab before restoring.',true)}));privacy.append(backupActions);
    const exportDisclosure=text('details','','e14-plain-disclosure');exportDisclosure.append(text('summary','Advanced: unencrypted export'));
    exportDisclosure.append(text('p','A plain JSON file contains your private writing in readable text. Use an encrypted vault whenever possible.','e14-muted'));
    exportDisclosure.append(button('Download plain snapshot',backupPlain));privacy.append(exportDisclosure);
    const file=document.createElement('input');file.type='file';file.id='e14VaultFile';file.accept='.json,application/json';file.hidden=true;file.addEventListener('change',async()=>{if(file.files?.[0])await restoreVault(file.files[0]);file.value=''});privacy.append(file);workspace.append(privacy);
    const status=text('p','','e14-status');status.id='e14Status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');workspace.append(status);
    const dismiss=button('Done editing',()=>{if(changed)storeSessionDraft();document.activeElement?.blur?.();updateMobileKeyboard()});dismiss.id='e14DismissKeyboard';dismiss.hidden=true;workspace.append(dismiss);
    const stage=$('promptCard')?.closest('.stage');
    if(stage)stage.after(workspace);else if($('main'))$('main').append(workspace);else document.body.append(workspace);
    loadReadingSize();chooseReadingSize(readingSize);setView('write');renderPromptContext();renderPrivacy();
    window.addEventListener('elsewhere:prompt',()=>queueMicrotask(renderPromptContext));
    $('e14Answer').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();saveResponse()}});
    window.addEventListener('pagehide',()=>{if(changed){clearTimeout(draftTimer);storeSessionDraft()}});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&changed){clearTimeout(draftTimer);storeSessionDraft()}});
    // iOS Safari often skips beforeunload, and an unload listener can defeat bfcache.
    // pagehide and visibilitychange keep the in-tab recovery copy without it.
    if(!isMobileViewport())window.addEventListener('beforeunload',e=>{if(changed && $('e14Answer')?.value.trim()) {storeSessionDraft();e.preventDefault();e.returnValue='';}});
    workspace.addEventListener('focusin',()=>updateMobileKeyboard());
    workspace.addEventListener('focusout',()=>requestAnimationFrame(updateMobileKeyboard));
    window.visualViewport?.addEventListener?.('resize',updateMobileKeyboard);
    window.addEventListener('pageshow',()=>{renderPromptContext();updateMobileKeyboard();});
    const badge=$('activeProjectBadge');if(badge){const monitor=new MutationObserver(()=>{if(!document.documentElement.classList.contains('elsewhere-locked'))renderPromptContext()});monitor.observe(badge,{characterData:true,childList:true,subtree:true});window.addEventListener('pagehide',()=>monitor.disconnect(),{once:true})}
    renderRecoveryAction();updateMobileKeyboard();
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
  function validateUniverseRestore(payload,api=S()) {
    if(!payload || payload.app!=='Elsewhere' || payload.type!=='universe' || payload.schemaVersion!==api?.SCHEMA_VERSION) return {ok:false,reason:'Unsupported universe schema.'};
    if(!payload.state || !Array.isArray(payload.state.projects) || payload.state.projects.length>500) return {ok:false,reason:'Universe project list is invalid.'};
    const projects=new Set();
    const safeId=id=>typeof id==='string'&&id.length>0&&id.length<=120&&!/[\/:\\\u0000-\u001f]/.test(id)&&!['__proto__','prototype','constructor'].includes(id);
    for(const p of payload.state.projects){
      if(!p || !safeId(p.id) || typeof p.name!=='string' || !p.name || projects.has(p.id))return {ok:false,reason:'Missing or duplicate project identity.'};
      projects.add(p.id);
      for(const k of ['artifacts','facts','relationships','scratchpads','prompts','timeline'])if(!Array.isArray(p[k]))return {ok:false,reason:`Damaged project section: ${k}.`};
      const used=new Set();
      for(const group of ['artifacts','facts','relationships','scratchpads'])for(const item of p[group]){
        if(!item || !safeId(item.id) || used.has(item.id))return {ok:false,reason:`Missing or duplicate record in ${group}.`};
        used.add(item.id);
      }
      const artifacts=new Set(p.artifacts.map(a=>a.id));
      if(p.artifacts.length>25000 || p.facts.length>100000 || p.relationships.length>200000 || p.scratchpads.length>100000 || p.timeline.length>200000)return {ok:false,reason:'One project exceeds safe import limits.'};
      for(const r of p.relationships)if(!artifacts.has(r.fromId)||!artifacts.has(r.toId))return {ok:false,reason:'Relationship points to a missing artifact.'};
      for(const f of p.facts)if((f.subjectId&&!artifacts.has(f.subjectId))||(f.objectId&&!artifacts.has(f.objectId)))return {ok:false,reason:'Fact points to a missing artifact.'};
      for(const note of p.scratchpads)if(note.scopeId && !artifacts.has(note.scopeId))return {ok:false,reason:'Draft points to a missing artifact.'};
    }
    if(payload.state.activeProjectId!=null && !projects.has(payload.state.activeProjectId))return {ok:false,reason:'Active project points to a missing project.'};
    return {ok:true,projects:projects.size};
  }
  async function askVaultPassphrase(purpose='unlock') {
    return new Promise(resolve=>{
      const checkpoint=purpose==='checkpoint',title=checkpoint?'Protect a recovery checkpoint':'Unlock encrypted backup';
      const dialog=document.createElement('dialog');dialog.className='e14-vault-prompt';dialog.setAttribute('aria-label',title);
      const form=document.createElement('form');form.method='dialog';form.append(text('h2',title));
      const label=text('label',checkpoint?'New encryption passphrase (12+ characters)':'Encryption passphrase');const field=document.createElement('input');field.type='password';field.required=true;field.minLength=checkpoint?12:1;field.autocomplete=checkpoint?'new-password':'off';field.setAttribute('aria-label','Encryption passphrase');label.append(field);form.append(label);
      form.append(text('p',checkpoint?'Save this encrypted recovery file BEFORE importing another backup.':'Your passphrase stays in this browser. It is not your Elsewhere entrance password.','e14-muted'));
      const actions=text('div','','e14-actions');const cancel=button('Cancel',()=>dialog.close('cancel'));cancel.type='button';const submit=text('button',checkpoint?'Encrypt recovery file':'Unlock backup');submit.type='submit';actions.append(cancel,submit);form.append(actions);dialog.append(form);document.body.append(dialog);
      let complete=false;dialog.addEventListener('close',()=>{if(complete)return;complete=true;const value=dialog.returnValue==='ready'?field.value:null;field.value='';dialog.remove();resolve(value)},{once:true});
      form.addEventListener('submit',event=>{event.preventDefault();dialog.close('ready')});
      try{dialog.showModal();field.focus()}catch{dialog.remove();resolve(null)}
    });
  }
  async function encryptedImportCheckpoint() {
    const password=await askVaultPassphrase('checkpoint');if(password===null)return false;
    try {
      const envelope=await seal(universeSnapshot(),password);
      download('Elsewhere-Before-Import-Encrypted.json',JSON.stringify(envelope));
      return confirm('Confirm that the encrypted recovery file was actually saved. Continue importing?');
    }catch(error){notice(`Import cancelled: ${error.message}`,true);return false}
  }
  // Compare serialized user records, not merely the project IDs. Hydration may rebuild
  // derived factIds/relationshipIds, so those two indexes are excluded from the proof.
  function durableRestoreContent(value) {
    const st=value?.state||value||{};
    const core={};
    for(const key of ['category','energy','motion','quality','mix','haptics','adaptiveMix','cooldown','creativeType','wildness','greysonLanguage','pack','progress','packProgress','history','saved','later','pinned','affinity','recentCats','chain','driftRuns','activeProjectId'])if(Object.prototype.hasOwnProperty.call(st,key))core[key]=st[key];
    core.projects=(st.projects||[]).map(p=>{
      const copy={...p};
      copy.artifacts=(p.artifacts||[]).map(a=>{const {factIds,relationshipIds,...rest}=a;return rest});
      return copy;
    });
    function ordered(item){if(Array.isArray(item))return item.map(ordered);if(item&&typeof item==='object')return Object.fromEntries(Object.keys(item).sort().filter(k=>k!=='__proto__').map(k=>[k,ordered(item[k])]));return item}
    return JSON.stringify(ordered(core));
  }
  function assertRestorePersisted(api,expectedState) {
    if(!api.runtime?.adapter?.persistent)throw Error('Browser storage became unavailable during restore.');
    const hydrated=api.loadV13(api.runtime.adapter);
    if(hydrated.needsRecovery || hydrated.recovery?.length)throw Error('Restored data failed its read-back integrity check.');
    const expected=durableRestoreContent(expectedState),actual=durableRestoreContent(hydrated.state);
    if(expected!==actual)throw Error('Stored project content or settings differ from the requested backup.');
    return true;
  }
  // Commit with read-back proof, then garbage collect obsolete project sections.
  // On an interrupted write, keep the recovery file and restore the original project list.
  async function commitUniverseTransaction(payload,{api=S(),target=state(),legacy=L(),before=api.exportUniverse(target)}={}) {
    let mutated=false;
    try {
      mutated=true; // the importer itself might throw AFTER partially mutating state
      const result=api.importUniverse(payload,target);
      if(!result.ok)throw Error(result.message||'Restore validation failed.');
      const write=api.flushDirty(api.runtime.adapter,target);
      if(!write.persistent||write.failed?.length)throw Error('Browser storage failed during restore.');
      const incomingIds=payload.state.projects.map(p=>p.id);
      assertRestorePersisted(api,target);
      if(legacy?.restoreState)await legacy.restoreState(api.legacyStateFromV13(target));
      // Never prune old records until all new records have been durably read back.
      const cleanupRemaining=[];
      for(const p of before.state.projects)if(!incomingIds.includes(p.id)){
        api.removeProjectStorage(api.runtime.adapter,p.id);
        for(const part of ['meta','artifacts','facts','relations','scratch','history','timeline']){
          const key=api.projectKey?.(p.id,part);
          if(key && api.runtime.adapter.getItem(key)!=null)cleanupRemaining.push(key);
        }
      }
      return {ok:true,projects:incomingIds.length,cleanupRemaining};
    }catch(error){
      if(!mutated)throw error;
      try {
        const revert=api.importUniverse(before,target);
        if(!revert.ok)throw Error('Recovery snapshot was rejected.');
        const write=api.flushDirty(api.runtime.adapter,target);
        if(!write.persistent||write.failed?.length)throw Error('Recovery writes failed.');
        assertRestorePersisted(api,before.state);
        if(legacy?.restoreState)await legacy.restoreState(api.legacyStateFromV13(target));
        throw Object.assign(Error(`Restore failed but was rolled back: ${error.message}`),{rollbackVerified:true});
      }catch(recoveryError){
        if(recoveryError.rollbackVerified)throw recoveryError;
        throw Object.assign(Error(`Restore failed and rollback could not be verified: ${recoveryError.message}`),{rollbackFailed:true});
      }
    }
  }
  async function restoreVault(file) {
    if(busy)return;
    if(!file || file.size>35000000){notice('Vault exceeds the 35 MB safety limit.',true);return}
    if(conflicted)return notice('Reload the stale tab before restoring.',true);
    if(file.size>35000000)return notice('Vault exceeds the 35 MB safety limit.',true);
    const api=S();
    if(!api?.runtime?.adapter?.persistent)return notice('Restore is unavailable in session-only mode. Export a backup first.',true);
    const password=await askVaultPassphrase();if(password===null)return;
    busy=true;
    try {
      const envelope=JSON.parse(await file.text()),payload=await unseal(envelope,password);
      const validation=validateUniverseRestore(payload,api);
      if(!validation.ok)throw Error(validation.reason);
      if(!confirm(`Restore ${validation.projects} project(s) from this vault? First, download an encrypted recovery copy of the current workspace.`))return;
      const before=universeSnapshot();
      const recovery=await seal(before,password);
      download('Elsewhere-Pre-Restore-Encrypted.json',JSON.stringify(recovery));
      if(!confirm('Verify that the encrypted Pre-Restore recovery file was actually saved before replacing local projects. Continue?'))return;
      const result=await commitUniverseTransaction(payload,{api,target:state(),legacy:L(),before});
      clearTimeout(draftTimer);changed=false;lastProjectId=null;lastPrompt=null;
      if($('e14Answer'))$('e14Answer').value='';
      renderPromptContext();renderCards();renderAtlas();
      if(result.cleanupRemaining.length)notice('Restore verified, but old project storage could not be fully removed. Review storage health before continuing.',true);
      else notice('Restored and verified. Your encrypted recovery file is available separately.');
    }catch(error){
      if(error.rollbackFailed)conflicted=true;
      notice(error.message||'Vault could not be restored. Nothing was changed.',true);
    }finally{busy=false}
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
        if(!confirm(`${mode}? Current browser: ${old} projects. Incoming backup: ${count} projects. First, save an ENCRYPTED recovery checkpoint.`)){target.value='';return}
        if(!await encryptedImportCheckpoint()){target.value='';return}
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
      // Only creative data changes make a tab stale. Cosmetic iPhone reading
      // preferences or the separate access lock must never freeze writing.
      if (!event.key || !(event.key.startsWith('elsewhere:v13:') || event.key==='elsewhere:v2:state')) return;
      conflicted=true;
      const modal=$('e14Conflict');
      if(modal?.open)return;
      if(modal){modal.showModal();modal.querySelector('button')?.focus()}
    });
  }
  function installConflictDialog() {
    const dialog=document.createElement('dialog');dialog.id='e14Conflict';dialog.className='e14-conflict';
    dialog.append(text('h2','Another Elsewhere tab changed this workspace'),text('p','This tab is paused to prevent overwriting newer work. Export from the newer tab, then reload this one. No changes in this tab have been deleted.'));
    dialog.append(button('Download unsaved writing',()=>{
      const value=$('e14Answer')?.value||'';
      if(!value.trim())return notice('No unsaved writing is present in this tab.');
      download('Elsewhere-Unsaved-Writing.txt',value,'text/plain;charset=utf-8');
    }));
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
    const app={initialized:true,version:VERSION,graphForProject,graphPositions,fitAtlasCamera,cameraFromPinch,libraryPageModel,factReviewModel,validReadSize,scrollOffsetFor,switchProjectFromPhone,copyWriting,shareWriting,seal,unseal,validateUniverseRestore,durableRestoreContent,commitUniverseTransaction,saveResponse,renderAtlas,setView,get conflicted(){return conflicted},get state(){return {view,atlasFocus,atlasTime,includeOtherProjects,writingSource}}};
    globalThis.Elsewhere14=Object.freeze(app);return true;
  }
  globalThis.Elsewhere14=Object.freeze({initialized:false,version:VERSION,graphForProject,graphPositions,fitAtlasCamera,cameraFromPinch,libraryPageModel,factReviewModel,validReadSize,scrollOffsetFor,switchProjectFromPhone,copyWriting,shareWriting,seal,unseal,validateUniverseRestore,durableRestoreContent,commitUniverseTransaction,boot,get conflicted(){return conflicted}});
  if(typeof document!=='undefined'){
    if(!boot()){
      let tries=0;const wait=()=>{if(boot())return;if(++tries<30)setTimeout(wait,60)};wait();
    }
  }
})();
