/* Elsewhere OMNI20 - additive, local-first interface adapter; no schema migration. */
(() => {
  'use strict';
  if (globalThis.ElsewhereOmni20?.initialized) return;
  const $ = id => document.getElementById(id);
  const views = ['explore', 'write', 'library', 'atlas'];
  const labels = {explore:'Explore', write:'Write', library:'Library', atlas:'Atlas', vault:'Vault'};
  const state = {view:'explore', library:'browse', opening:false, initialized:false};
  let projectObserver = null;
  let countObserver = null;
  let inspectorReturnFocus = null;
  const scrollMemory = new Map();
  let navigationEpoch = 0;
  let commands = [];
  const node = (tag, className='', content='') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  };
  const button = (label, run, className='') => {
    const el = node('button', className, label); el.type = 'button';
    el.addEventListener('click', run); return el;
  };
  const announce = message => {const el = $('om20Status');if (el) el.textContent = message;};
  const unlocked = () => !document.documentElement.classList.contains('elsewhere-locked');
  const api = () => globalThis.Elsewhere14;
  const projectState = () => globalThis.ElsewhereV13State?.runtime?.state;
  const clickExisting = (selector, unavailable='This tool is unavailable in the current edition.') => {
    const target = document.querySelector(selector);
    if (!target) {announce(unavailable);return false;}
    target.click();return true;
  };
  const selectOriginalTab = view => {
    if (view !== 'explore') api()?.setView?.(view === 'vault' ? 'privacy' : view);
  };
  const setView = (next, options={}) => {
    if (!['explore','write','library','atlas','vault'].includes(next)) return false;
    if (!unlocked()) return false;
    const main=$('main'),previous=state.view,same=next===previous;
    if(main&&!options.keepScroll&&!same)scrollMemory.set(previous,main.scrollTop);
    if (next !== previous && $('om20Inspector')) $('om20Inspector').hidden=true;
    if(next!==previous && document.activeElement?.matches?.('input,textarea,select,[contenteditable=true]'))document.activeElement.blur();
    state.view = next;
    document.body.classList.toggle('omni20-workspace-active',next !== 'explore');
    document.body.dataset.omni20View = next;
    selectOriginalTab(next);
    for (const tab of document.querySelectorAll('[data-omni20-view]')) {
      const active = tab.dataset.omni20View === next;
      tab.setAttribute('aria-current',active?'page':'false');
      tab.classList.toggle('is-active',active);
    }
    const heading = $('om20ActiveLabel'); if (heading) heading.textContent=labels[next];
    if(main&&!options.keepScroll){
      const target=same?0:(scrollMemory.get(next)||0);
      const epoch=++navigationEpoch;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(navigationEpoch===epoch&&state.view===next)main.scrollTop=Math.min(Math.max(0,target),Math.max(0,main.scrollHeight-main.clientHeight));
      }));
    }
    if (next==='write') window.dispatchEvent(new Event('elsewhere:prompt'));
    if (next==='library') updateCanonCount();
    if (next==='explore') document.documentElement.classList.remove('omni20-forced-focus');
    announce(`${labels[next]} is open.`);
    return true;
  };
  const showCommands = (query='') => {
    if (!unlocked()) return;
    const dialog=$('om20CommandDialog');
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const input=$('om20CommandInput');
    if (input) {input.value=query; renderCommands(query);input.focus();}
  };
  const launchCommand = entry => {
    $('om20CommandDialog')?.close();
    try {const result=entry.run();if(result===false)announce(`${entry.label} is unavailable.`);}
    catch (err) {announce(`${entry.label} could not open. ${err?.message||'Try again.'}`);}
  };
  function buildCommands() {
    const entries=[];
    const add=(id,label,group,run,keywords='',available=()=>true) => entries.push({id,label,group,run,keywords,available});
    const existing=(id,label,group,selector,keywords='') => add(id,label,group,()=>clickExisting(selector),keywords,()=>!!document.querySelector(selector));
    for (const view of views) add(`view-${view}`,labels[view],'Destinations',()=>setView(view));
    add('vault','Vault: backups and recovery','Destinations',()=>setView('vault'),'backup encrypted restore security');
    existing('new-project','Create project','Projects','#newProjectBtn','add new');
    existing('project-pulse','Project Pulse','Projects','#projectPulseCard','structure signals');
    existing('project-editor','Manage active project','Projects','#projectSwitcher','rename accent export delete switch');
    add('scratchpad','Open project scratchpad','Projects',()=>{const dlg=$('scratchpadDialog');if(!dlg)return false;dlg.showModal();return true},'notes working',()=>!!$('scratchpadDialog'));
    existing('path','Choose creative path','Explore','#pathOrbitBtn','notice shadow wonder');
    existing('packs','Prompt packs','Explore','#packsBtn');
    existing('greyson','Greyson prompts and English/Spanish','Explore','[data-greyson-pick]','greyson en es');
    existing('another','Another prompt','Explore','#nextBtn','next');
    existing('keep','Keep this prompt','Explore','#saveBtn','bookmark favorite');
    existing('side-doors','Side Doors','Explore','#doorBtn','angles alternate');
    existing('explain','Explore prompt meaning','Explore','#assistBtn','explain rephrase enhance example deeper');
    existing('omni','Omni Lens','Advanced creative tools','#omniBtn');
    existing('workbench','Comparative Workbench','Advanced creative tools','#workbenchBtn','compare start create organize');
    existing('drift','Five-door Drift','Advanced creative tools','#driftBtn');
    existing('creative','Creative Builder and Story Forge','Advanced creative tools','#buildBtn','chain world scene character forge');
    existing('intelligence','Contextual intelligence tools','Advanced creative tools','#intelligenceRailToggle','power forge stress compare');
    for(const [tool,label] of [['explain','Explain source'],['rephrase','Rephrase idea'],['compare','Compare interpretations'],['power','Power Forge'],['character','Develop character'],['world','Develop world'],['scene','Develop scene'],['consequence','Review consequences'],['stress','Stress-test idea'],['connect','Connect ideas']]){
      existing('tool-'+tool,label,'Contextual intelligence',`[data-v13-tool="${tool}"]`);
    }
    for(const [pack,label] of [['greysonNow','Right now'],['greysonWeird','Make it weird'],['greysonShared','Shared life'],['greysonDexter','Dexter veto']]){
      existing('pack-'+pack,'Greyson: '+label,'Greyson packs',`[data-greyson-pack="${pack}"]`);
    }
    existing('greyson-en','Greyson prompts: English','Greyson packs','[data-greyson-language="en"]');
    existing('greyson-es','Greyson prompts: Spanish','Greyson packs','[data-greyson-language="es"]');
    existing('history','Prompt history and kept prompts','Library','#historyBtn');
    add('compare-artifacts','Compare saved artifacts','Library',()=>{setView('library');switchLibraryPane('compare');});
    add('review-canon','Review possible canon','Library',()=>{setView('library');switchLibraryPane('review');},'established decisions rationale');
    add('other-projects','Search other projects (opt-in)','Library',()=>{setView('library');switchLibraryPane('other');},'cross project');
    add('prompt-fusion','Combine two kept prompts','Library',()=>clickExisting('#constellationBtn'),'constellation',()=>!!$('constellationBtn'));
    add('browse-atlas','Browse project relationships','Atlas',()=>setView('atlas'),'graph constellation');
    add('atlas-directory','Browse Atlas as list','Atlas',()=>{setView('atlas');const list=$('e14Directory');if(!list)return false;list.open=true;list.scrollIntoView({block:'nearest',behavior:'auto'});return true;},'accessible graph keyboard');
    existing('settings','Experience settings','Settings','#settingsBtn','motion quality haptics adaptive mix');
    existing('shortcuts','Keyboard shortcuts','Settings','#shortcutsBtn','hotkeys');
    add('reading-size','Reading size','Settings',()=>{setView('write');const settings=$('e14ReadSettings');if(!settings)return false;settings.open=true;settings.scrollIntoView({block:'nearest',behavior:'auto'});return true;},'comfortable large extra');
    existing('zen','Zen stage','Settings','#zenBtn','minimal distraction focus');
    existing('focus','Focus on prompt','Settings','#focusBtn');
    existing('lock','Lock Elsewhere','Settings','#elsewhereLockButton','password privacy');
    add('backup','Create encrypted backup','Vault',()=>{setView('vault');const form=$('om20VaultCreate');if(form)form.open=true;$('e14VaultPass')?.focus();},'export save password');
    add('restore','Restore encrypted backup','Vault',()=>{setView('vault');clickExisting('#om20VaultRestore');},'import recovery');
    add('write-copy','Copy current writing','Write',()=>clickExisting('#om20CopyWriting'),'clipboard');
    add('write-share','Share current writing (unencrypted)','Write',()=>clickExisting('#om20ShareWriting'),'native share explicit');
    add('write-download','Download current writing (unencrypted)','Write',()=>clickExisting('#om20DownloadWriting'),'text export');
    add('write-branch','Branch writing as alternative','Write',()=>clickExisting('#om20BranchWriting'),'what if');
    add('write-fact','Make possible fact','Write',()=>clickExisting('#om20PossibleFact'),'provisional');
    add('write-followup','Follow-up questions','Write',()=>clickExisting('#om20FollowUps'),'question');
    add('arrival','Arrival: change direction','Incoming experiences',()=>{setView('explore');return clickExisting('#e15RouteBar button','Arrival-first is not in this edition.')},'check-in talk quiet',()=>!!document.querySelector('#e15RouteBar button'));
    add('infinite','Infinite Door','Incoming experiences',()=>{setView('explore');return globalThis.ElsewhereInfinite?.menu?.()},'discovery encounters serendipity',()=>!!globalThis.ElsewhereInfinite?.menu);
    commands=entries;
    return entries;
  }
  function renderCommands(query='') {
    const list=$('om20CommandList');if(!list)return;
    list.replaceChildren();
    const q=query.toLocaleLowerCase().trim(); let rendered=0;
    for(const command of commands) {
      if (!command.available())continue;
      if(q&&!`${command.label} ${command.group} ${command.keywords}`.toLocaleLowerCase().includes(q))continue;
      const row=button(command.label,()=>launchCommand(command),'omni20-command-row');
      row.dataset.commandId=command.id;
      row.append(node('small','',command.group));list.append(row);rendered++;
    }
    if(!rendered)list.append(node('p','omni20-empty','No matching actions. Try another phrase.'));
  }
  function updateCanonCount() {
    const text=$('e14CanonCount')?.textContent||'';
    const count=(text.match(/\d+/)||[])[0]||'0';
    const badge=$('om20CanonBadge');if(badge){badge.textContent=count;badge.hidden=Number(count)<1;}
    const label=$('om20ReviewCount');if(label)label.textContent=`${count} pending`;
  }
  function refreshProjects(){
    const st=projectState(), select=$('om20ProjectSelect');if(!select||!st)return;
    const ps=(st.projects||[]).filter(p=>p?.id&&p?.name);
    const sig=JSON.stringify(ps.map(p=>[p.id,p.name]));
    if(sig!==select.dataset.signature){
      select.dataset.signature=sig;select.replaceChildren();
      const global=node('option','','Global · no project');global.value='';select.append(global);
      for(const p of ps){const option=node('option','',String(p.name).slice(0,120));option.value=p.id;select.append(option);}
    }
    if(select.value!==String(st.activeProjectId||''))select.value=String(st.activeProjectId||'');
  }
  function onProjectChange(){
    const select=$('om20ProjectSelect'),st=projectState();if(!select||!st)return;
    const id=select.value;
    if(!id){refreshProjects();announce('Choose a project, or create one, before switching.');return;}
    const old=st.activeProjectId;
    if(id===old)return;
    const success=api()?.switchProjectFromPhone?.(id);
    refreshProjects();
    if(success)announce('Project switched. Existing drafts and projects were preserved.');
    else announce('Project switch refused. Unsaved writing was not discarded.');
  }
  function switchLibraryPane(name){
    const pane=['browse','compare','review','other'].includes(name)?name:'browse';
    state.library=pane;
    for(const el of document.querySelectorAll('[data-omni20-library-tab]')){
      const selected=el.dataset.omni20LibraryTab===pane;
      el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;
    }
    for(const el of document.querySelectorAll('[data-omni20-library-panel]'))el.hidden=el.dataset.omni20LibraryPanel!==pane;
    updateCanonCount();
    return true;
  }
  function organizeLibrary(){
    const host=$('e14Panel-library');if(!host||$('om20LibraryTabs'))return;
    const tabbar=node('div','omni20-library-tabs');tabbar.id='om20LibraryTabs';
    tabbar.setAttribute('role','tablist');tabbar.setAttribute('aria-label','Library sections');
    tabbar.addEventListener('keydown',e=>{
      const tabs=[...tabbar.querySelectorAll('[data-omni20-library-tab]')];
      const current=tabs.indexOf(document.activeElement);if(current<0)return;
      let target=-1;
      if(e.key==='ArrowRight')target=(current+1)%tabs.length;
      if(e.key==='ArrowLeft')target=(current+tabs.length-1)%tabs.length;
      if(e.key==='Home')target=0;
      if(e.key==='End')target=tabs.length-1;
      if(target<0)return;e.preventDefault();switchLibraryPane(tabs[target].dataset.omni20LibraryTab);tabs[target].focus();
    });
    const panes={};
    for(const [key,label] of [['browse','Saved work'],['compare','Compare'],['review','Canon review'],['other','Other projects']]){
      const tab=button(label,()=>switchLibraryPane(key),'omni20-library-tab');tab.id=`om20LibraryTab-${key}`;tab.dataset.omni20LibraryTab=key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`om20LibraryPanel-${key}`);tabbar.append(tab);
      const section=node('section','omni20-library-pane');section.id=`om20LibraryPanel-${key}`;section.dataset.omni20LibraryPanel=key;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',tab.id);panes[key]=section;
      if(key==='review'){const count=node('span','omni20-pending-count','0 pending');count.id='om20ReviewCount';section.append(count);}
    }
    const compare=$('e14Comparison'),review=$('e14CanonReview'),cross=$('e14CrossSearch');
    const headings=[...host.querySelectorAll(':scope > h3')];
    const compareHead=headings.find(x=>x.textContent.includes('Compare'));
    const reviewHead=headings.find(x=>x.textContent.includes('Canon'));
    const reviewIntro=reviewHead?.nextElementSibling;
    const reviewList=review?.previousElementSibling;
    const search=$('e14Search'), cards=$('e14Cards'), browseControls=cards?.previousElementSibling;
    const crossParent=cross?.parentElement;
    const move=(parent,...items)=>items.filter(Boolean).forEach(x=>parent.append(x));
    move(panes.browse,search,browseControls,cards);
    move(panes.compare,compareHead,compare);
    move(panes.review,reviewHead,reviewIntro,reviewList,review);
    move(panes.other,crossParent);
    host.prepend(tabbar);
    for(const section of Object.values(panes))host.append(section);
    const btnReview=$('om20LibraryTab-review');if(btnReview){const badge=node('span','omni20-count');badge.id='om20CanonBadge';badge.hidden=true;btnReview.append(badge);}
    // DOM relocation preserves existing listeners, IDs, and source-owned data contracts.
    const count=$('e14CanonCount');if(count){countObserver=new MutationObserver(updateCanonCount);countObserver.observe(count,{characterData:true,childList:true,subtree:true});}
    switchLibraryPane('browse');
  }
  function createArtifactInspector(){
    if($('om20Inspector'))return;
    const pane=node('aside','omni20-inspector');pane.id='om20Inspector';pane.hidden=true;
    pane.setAttribute('aria-label','Selected artifact details');pane.setAttribute('tabindex','-1');
    const top=node('div','omni20-inspector-header');const title=node('h3','','Artifact details');title.id='om20InspectorTitle';
    top.append(title,button('Close details',()=>{pane.hidden=true;if(inspectorReturnFocus?.isConnected)inspectorReturnFocus.focus()},'omni20-inspector-close'));
    const body=node('div','omni20-inspector-body');body.id='om20InspectorBody';
    const actions=node('div','omni20-inspector-actions');actions.id='om20InspectorActions';
    pane.append(top,body,actions);$('e14Workspace').append(pane);
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!pane.hidden&&!$('om20CommandDialog')?.open){pane.hidden=true;if(inspectorReturnFocus?.isConnected)inspectorReturnFocus.focus();}
    });
  }
  function inspectArtifact(id, sourceElement=null){
    const st=projectState(), p=st?.projects?.find(p=>p.id===st.activeProjectId),a=p?.artifacts?.find(a=>a.id===id);
    if(!a){announce('The artifact is no longer in the active project.');return false;}
    const pane=$('om20Inspector'),title=$('om20InspectorTitle'),body=$('om20InspectorBody'),actions=$('om20InspectorActions');
    if(!pane||!body||!actions)return false;
    title.textContent=String(a.name||a.type||'Artifact').slice(0,160);
    body.replaceChildren();actions.replaceChildren();
    body.append(node('p','omni20-inspector-type',String(a.type||'artifact')));
    body.append(node('p','omni20-inspector-content',String(a.meta?.content||a.summary||'No saved text.').slice(0,12000)));
    if(Array.isArray(a.tags)&&a.tags.length)body.append(node('p','omni20-inspector-tags',`Tags: ${a.tags.join(', ')}`));
    const lineage=a.meta?.inspiredByArtifactId||a.meta?.sourceArtifactId;
    if(lineage){
      const source=p.artifacts.find(x=>x.id===lineage);
      if(source)actions.append(button(`Inspect source: ${source.name}`,()=>inspectArtifact(source.id),'omni20-inspector-link'));
    }
    const links=(p.relationships||[]).filter(x=>x.fromId===id||x.toId===id).slice(0,12);
    if(links.length){
      body.append(node('h4','','Connected records'));
      for(const link of links){
        const other=p.artifacts.find(x=>x.id===(link.fromId===id?link.toId:link.fromId));
        const label=`${String(link.label||'related to')}: ${String(other?.name||'another record')} (${link.status==='established'?'established':'possible'})`;
        if(other)actions.append(button(label,()=>inspectArtifact(other.id),'omni20-inspector-link'));
        else body.append(node('p','omni20-inspector-muted',label));
      }
    }
    const useOriginal=sourceElement?.querySelector?.('.e14-mini-actions button:nth-child(2)');
    if(useOriginal?.textContent.trim()==='Continue writing'){
      actions.prepend(button('Continue writing',()=>{pane.hidden=true;useOriginal.click();setView('write',{keepScroll:true})},'omni20-inspector-primary'));
    }else{
      const graphDetail=$('e14GraphDetail');
      const continueGraph=[...graphDetail?.querySelectorAll('button')||[]].find(x=>x.textContent.includes('Continue writing'));
      if(continueGraph)actions.prepend(button('Continue writing',()=>{pane.hidden=true;continueGraph.click();setView('write',{keepScroll:true})},'omni20-inspector-primary'));
    }
    inspectorReturnFocus=document.activeElement;pane.hidden=false;pane.focus();return true;
  }
  function instrumentArtifactAccess(){
    createArtifactInspector();
    const cards=$('e14Cards');
    const addInspect=()=>{
      const st=projectState(),p=st?.projects?.find(x=>x.id===st.activeProjectId);
      const articles=[...cards?.querySelectorAll(':scope > .e14-artifact')||[]];
      if(!p||!articles.length||typeof api()?.libraryPageModel!=='function')return;
      const count=$('e14LibraryCount')?.textContent||'';
      const page=(count.match(/page\s+(\d+)/i)||[])[1];
      const all=(p.artifacts||[]).filter(a=>a&&!a.retired);
      const mobile=typeof matchMedia==='function'&&matchMedia('(max-width:700px), (max-height:520px) and (pointer:coarse)').matches;
      const model=api().libraryPageModel(all,$('e14Search')?.value||'', $('e14LibrarySort')?.value||'recent',Math.max(0,Number(page||1)-1),mobile?8:24);
      for(const [i,article] of articles.entries()){
        const item=model.visible[i],actions=article.querySelector('.e14-mini-actions');
        if(!item||!actions||article.dataset.omni20Inspected===item.id)continue;
        article.querySelector('.omni20-inspect-button')?.remove();
        article.dataset.omni20Inspected=item.id;
        actions.append(button('Inspect details',()=>inspectArtifact(item.id,article),'omni20-inspect-button'));
      }
    };
    if(cards){new MutationObserver(addInspect).observe(cards,{childList:true});addInspect();}
    $('e14Graph')?.addEventListener('click',e=>{
      const chosen=e.target.closest?.('[data-artifact-id]');
      if(chosen?.dataset.artifactId){queueMicrotask(()=>inspectArtifact(chosen.dataset.artifactId));}
    });
  }
  function organizeAtlas(){
    const controls=document.querySelector('#e14Panel-atlas .e14-atlas-controls');if(!controls||$('om20AtlasGroups'))return;
    const groups=node('div','omni20-atlas-groups');groups.id='om20AtlasGroups';
    const group=(label,slug)=>{const section=node('fieldset','omni20-atlas-group');section.classList.add(`omni20-atlas-${slug}`);section.append(node('legend','',label));groups.append(section);return section;};
    const view=group('View','view'),find=group('Find','find'),history=group('History','history'),arrange=group('Arrange','arrange');
    const original=[...controls.children];
    for(const child of original){
      const t=child.textContent.trim();
      const id=child.id;
      if(id==='e14AtlasFind')find.append(child);
      else if(id==='e14Time'||id==='e14TimeLabel'||id==='e14PrevPage'||id==='e14NextPage')history.append(child);
      else if(id==='e14LayoutDetails')arrange.append(child);
      else if(['Zoom in','Zoom out','Reset view','Fit visible','Center selected'].includes(t))view.append(child);
      else view.append(child);
    }
    controls.append(groups);
  }
  function organizeVault(){
    const host=$('e14Panel-privacy'),input=$('e14VaultPass'),confirm=$('e14VaultVerify');
    if(!host||!input||!confirm||$('om20VaultCreate'))return;
    const details=node('details','omni20-vault-create');details.id='om20VaultCreate';
    details.append(node('summary','','Create an encrypted backup'));
    const box=node('div','omni20-vault-fields');
    const passLabel=host.querySelector('[for="e14VaultPass"]'),verifyLabel=host.querySelector('[for="e14VaultVerify"]');
    const actions=host.querySelector('.e14-actions');
    moveMany(box,[passLabel,input,verifyLabel,confirm]);
    const create=actions?.querySelector('button:nth-child(1)');if(create)box.append(create);
    details.append(box);
    if(actions){const restore=actions.querySelector('button');if(restore){restore.id='om20VaultRestore';restore.textContent='Restore encrypted backup';}
      actions.classList.add('omni20-vault-restore');}
    // Do not reimplement encryption, passphrase handling or restore transactions.
    host.insertBefore(details,actions||null);
  }
  function moveMany(dest,els){for(const el of els)if(el)dest.append(el);}
  function organizeSettings(){
    const grid=document.querySelector('#settingsDialog .settings-grid');if(!grid||$('om20SettingsGrouped'))return;
    const wrap=node('div','omni20-settings-grouped');wrap.id='om20SettingsGrouped';
    const groups=[['Creative discovery',['Hints','All-path mix','Adaptive all-path mix','Path cooldown']],['Appearance and interaction',['Ambient motion','Visual performance','Tiny haptic tap']],['Storage, security and recovery',[]]];
    const boxes=new Map();
    for(const [group] of groups){const d=node('details','omni20-settings-section');d.open=group==='Creative discovery';d.append(node('summary','',group));const content=node('div','omni20-settings-contents');d.append(content);wrap.append(d);boxes.set(group,content);}
    for(const item of [...grid.children]){
      const label=item.querySelector('label')?.textContent.trim()||'';
      const match=groups.find(([,names])=>names.some(name=>label.startsWith(name)));
      (boxes.get(match?.[0]||'Storage, security and recovery')).append(item);
    }
    grid.append(wrap);
  }
  function buildPalette(){
    const dialog=node('dialog','omni20-command-dialog');dialog.id='om20CommandDialog';dialog.setAttribute('aria-labelledby','om20CommandHeading');
    const header=node('div','omni20-command-head');header.append(node('h2','', 'All Elsewhere actions'));
    header.firstChild.id='om20CommandHeading';header.append(button('Close',()=>dialog.close(),'omni20-command-close'));dialog.append(header);
    const label=node('label','','Find an action');label.htmlFor='om20CommandInput';dialog.append(label);
    const input=document.createElement('input');input.id='om20CommandInput';input.type='search';input.placeholder='Search tools, destinations, recovery...';input.autocomplete='off';input.addEventListener('input',()=>renderCommands(input.value));dialog.append(input);
    const list=node('div','omni20-command-list');list.id='om20CommandList';dialog.append(list);
    document.body.append(dialog);
  }
  function buildNavigation(){
    const main=$('main');if(!main)return false;
    const nav=node('nav','omni20-nav');nav.id='om20Nav';nav.setAttribute('aria-label','Elsewhere primary navigation');
    const brand=node('div','omni20-nav-meta');brand.append(node('strong','','CURRENT VIEW'));
    const label=node('span','', 'Explore');label.id='om20ActiveLabel';brand.append(label);nav.append(brand);
    const tabs=node('div','omni20-nav-tabs');
    const icons={explore:'◇',write:'✎',library:'▣',atlas:'◎'};
    for(const view of views){
      const tab=button('',()=>setView(view),'omni20-nav-tab');tab.dataset.omni20View=view;tab.setAttribute('aria-label',labels[view]);
      tab.append(node('span','omni20-tab-icon',icons[view]),node('span','omni20-tab-text',labels[view]));tabs.append(tab);
    }
    nav.append(tabs);
    const secondary=node('div','omni20-nav-secondary');
    const projectLabel=node('label','omni20-visually-hidden','Current project');projectLabel.htmlFor='om20ProjectSelect';secondary.append(projectLabel);
    const select=document.createElement('select');select.id='om20ProjectSelect';select.setAttribute('aria-label','Current project');select.addEventListener('change',onProjectChange);secondary.append(select);
    const tools=button('All tools',()=>showCommands(),'omni20-tools-button');tools.id='om20ToolsButton';tools.setAttribute('aria-keyshortcuts','Control+K Meta+K');secondary.append(tools);
    nav.append(secondary);main.prepend(nav);
    const live=node('p','omni20-visually-hidden');live.id='om20Status';live.setAttribute('role','status');live.setAttribute('aria-live','polite');main.append(live);
    return true;
  }
  function installPromptAction(){
    const row=document.querySelector('#promptCard .actionrow');if(!row||$('om20WriteAbout'))return;
    const write=button('Write about this',()=>setView('write'),'omni20-write-about');write.id='om20WriteAbout';
    row.prepend(write);
    const keep=$('saveBtn');if(keep){keep.setAttribute('aria-label','Keep this prompt');keep.title='Save this prompt to your kept collection';keep.textContent='Keep prompt';}
    $('thumbKeep')?.setAttribute('aria-label','Keep this prompt');
  }
  function exposeWritingActions(){
    const map={om20CopyWriting:'Copy writing',om20ShareWriting:'Share writing (unencrypted)',om20DownloadWriting:'Download writing (unencrypted)',om20BranchWriting:'Branch alternative',om20PossibleFact:'Make possible fact',om20FollowUps:'Follow-up questions'};
    for(const [id,label] of Object.entries(map)){
      const target=[...document.querySelectorAll('#e14Panel-write button')].find(x=>x.textContent.trim()===label);
      if(target)target.id=id;
    }
  }
  function explainSaving(){
    const writer=$('e14Panel-write'),actions=writer?.querySelector('.e14-primary-actions');
    if(!writer||!actions||$('om20SaveExplainer'))return;
    const hint=node('p','omni20-save-explainer','Save draft keeps work unfinished. Save response creates a project artifact. Keep prompt bookmarks the original question; neither action establishes canon.');
    hint.id='om20SaveExplainer';writer.insertBefore(hint,actions);
  }
  function installPersistenceFeedback(){
    const writer=$('e14Panel-write'),source=$('e14WriterStatus'),draft=$('e14DraftState');
    if(!writer||$('om20Persistence'))return;
    const box=node('div','omni20-persistence');box.id='om20Persistence';
    box.setAttribute('role','status');box.setAttribute('aria-live','polite');
    const label=node('span','omni20-persistence-text','Storage status unavailable');
    const exportNow=button('Download unsaved writing',()=>clickExisting('#om20DownloadWriting'),'omni20-persistence-export');exportNow.hidden=true;
    box.append(label,exportNow);
    const actions=writer.querySelector('.e14-primary-actions');
    if(actions)actions.after(box);else writer.append(box);
    let prior='';
    const sync=()=>{
      const message=source?.textContent?.trim()||'';
      const isError=source?.dataset.error==='true';
      const pending=draft?.textContent?.trim()||'';
      const shown=message||(pending&&pending!=='No unsaved changes'?pending:'No storage result yet');
      box.dataset.error=String(isError);
      if(shown!==prior){label.textContent=shown;prior=shown;}
      exportNow.hidden=!isError;
    };
    const observer=new MutationObserver(sync);
    for(const el of [source,draft])if(el)observer.observe(el,{characterData:true,childList:true,subtree:true,attributes:true,attributeFilter:['data-error']});
    sync();
  }
  function fixCopyAndLandmarks(){
    const footer=$('privacyLine');
    if(footer) footer.textContent='Private by default · writing stays in browser storage unless you explicitly share or export · the local lock is not encryption';
    const stage=$('ideaStage');if(stage?.getAttribute('role')==='main')stage.removeAttribute('role');
  }
  function addKeyboard(){
    document.addEventListener('keydown',e=>{
      if(!unlocked())return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLocaleLowerCase()==='k'){
        e.preventDefault();showCommands();return;
      }
      if(e.key==='Escape'&&$('om20CommandDialog')?.open){$('om20CommandDialog').close();}
    });
  }
  function boot(){
    if(state.initialized)return true;
    if(!api()?.initialized||!$('promptCard')||!$('e14Workspace')||!$('main'))return false;
    // v14 inserts its workspace after .stage, which is a child of #ideaStage.
    // Lift it to a sibling so hiding the legacy prompt stage never hides writing.
    const workspace=$('e14Workspace'),main=$('main');
    if(workspace.parentElement?.id==='ideaStage')main.append(workspace);
    state.initialized=true;
    buildNavigation();buildPalette();buildCommands();
    organizeLibrary();organizeAtlas();organizeVault();organizeSettings();instrumentArtifactAccess();
    installPromptAction();exposeWritingActions();explainSaving();installPersistenceFeedback();fixCopyAndLandmarks();addKeyboard();
    const badge=$('activeProjectBadge');
    if(badge){projectObserver=new MutationObserver(refreshProjects);projectObserver.observe(badge,{childList:true,characterData:true,subtree:true});}
    document.addEventListener('click',e=>{if(e.target.closest?.('#newProjectBtn,#projectSaveBtn,#projectSwitcher,#e14ProjectSelect'))queueMicrotask(refreshProjects);});
    window.addEventListener('elsewhere:prompt',refreshProjects);
    refreshProjects();
    document.body.classList.add('omni20-ready');
    if(unlocked())setView('explore');
    const unlock=new MutationObserver(()=>{
      if(unlocked()){
        if(state.view==='explore')setView('explore',{keepScroll:true});
        unlock.disconnect();
      }
    });unlock.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    return true;
  }
  const start=()=>{
    if(boot())return;
    let tries=0;
    const timer=setInterval(()=>{if(boot()||++tries>=150)clearInterval(timer);},80);
  };
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
  globalThis.ElsewhereOmni20=Object.freeze({get initialized(){return state.initialized},boot,setView,showCommands,switchLibraryPane,refreshProjects,get state(){return {...state}}});
})();
