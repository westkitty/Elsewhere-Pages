/* Elsewhere Encrypted Drive Archive: opt-in, ciphertext-only archive transport. */
(() => {
  'use strict';
  if (globalThis.ElsewhereDriveArchive) return;
  const DB_NAME = 'elsewhere-encrypted-drive-v1';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,md5Checksum';
  const ITERATIONS = 310000;
  const MAX_BYTES = 35000000;
  const $ = id => document.getElementById(id);
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const random = n => crypto.getRandomValues(new Uint8Array(n));
  const b64 = bytes => {
    let out = '';
    for(let i=0;i<bytes.length;i+=8192)out += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(out);
  };
  const unb64 = value => {
    if(typeof value!=='string' || value.length>50000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Invalid encrypted archive encoding.');
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  };
  const hex = bytes => Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const digest = async bytes => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
  const clientId = () => document.querySelector('meta[name="elsewhere-google-oauth-client"]')?.content?.trim() || '';
  function requireCrypto(){
    if(!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues)throw Error('Encryption requires HTTPS, localhost, or another secure browser context.');
  }
  function descriptorValid(d){
    return !!d && d.version===1 && d.kdf==='PBKDF2-SHA256' && d.iterations===ITERATIONS && d.cipher==='AES-256-GCM' &&
      typeof d.keyId==='string' && /^[a-f0-9]{32}$/.test(d.keyId) &&
      unb64(d.salt).length===16 && unb64(d.wrapIv).length===12 && unb64(d.wrappedKey).length===48;
  }
  async function wrappingKey(password,salt){
    requireCrypto();
    const material = await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function createVault(password){
    requireCrypto();
    if(typeof password!=='string' || password.length<14)throw Error('Use an archive passphrase of at least 14 characters.');
    const raw = random(32), salt = random(16), iv = random(12);
    const wrapper = await wrappingKey(password,salt);
    const wrappedKey = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},wrapper,raw));
    const key = await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
    raw.fill(0);
    const descriptor={version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',
      keyId:hex(random(16)),salt:b64(salt),wrapIv:b64(iv),wrappedKey:b64(wrappedKey)};
    return {descriptor,key};
  }
  async function unlockVault(descriptor,password){
    requireCrypto();
    if(!descriptorValid(descriptor))throw Error('The vault key record is damaged or unsupported.');
    try {
      const wrapper=await wrappingKey(password,unb64(descriptor.salt));
      const bits=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(descriptor.wrapIv)},wrapper,unb64(descriptor.wrappedKey)));
      if(bits.length!==32)throw Error('Damaged key.');
      const key=await crypto.subtle.importKey('raw',bits,'AES-GCM',false,['encrypt','decrypt']);
      bits.fill(0);return key;
    }catch {throw Error('Incorrect archive passphrase or damaged key. Nothing was changed.');}
  }
  function aad(envelope){
    return enc.encode(['Elsewhere-drive',envelope.version,envelope.archiveId,envelope.createdAt,envelope.key?.keyId].join('|'));
  }
  async function sealArchive(payload,key,descriptor){
    requireCrypto();
    if(!descriptorValid(descriptor))throw Error('Cannot archive without a valid vault key.');
    const envelope={app:'Elsewhere',type:'encrypted-drive-archive',version:1,
      archiveId:hex(random(16)),createdAt:new Date().toISOString(),key:descriptor,iv:b64(random(12))};
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:unb64(envelope.iv),additionalData:aad(envelope)},key,enc.encode(JSON.stringify(payload)));
    envelope.ciphertext=b64(new Uint8Array(ciphertext));
    return envelope;
  }
  function validateEnvelope(env){
    if(!env || env.app!=='Elsewhere' || env.type!=='encrypted-drive-archive' || env.version!==1 ||
      !/^[a-f0-9]{32}$/.test(env.archiveId||'') || typeof env.createdAt!=='string' ||
      !descriptorValid(env.key) || unb64(env.iv).length!==12 || unb64(env.ciphertext).length<16)throw Error('Encrypted archive format is damaged or unsupported.');
    return env;
  }
  async function openArchiveWithKey(envelope,key){
    validateEnvelope(envelope);
    let raw;
    try {
      raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(envelope.iv),additionalData:aad(envelope)},key,unb64(envelope.ciphertext));
    }catch{throw Error('Archive authentication failed. It may have been damaged or changed.');}
    const payload=JSON.parse(dec.decode(raw));
    if(!payload || payload.format!=='Elsewhere archive' || payload.version!==1 ||
       payload.universe?.app!=='Elsewhere' || payload.universe?.type!=='universe')throw Error('Decrypted archive contains an unsupported workspace.');
    return payload;
  }
  async function openArchive(envelope,password){
    const key=await unlockVault(validateEnvelope(envelope).key,password);
    return {key,payload:await openArchiveWithKey(envelope,key)};
  }
  // Only encrypted envelopes and non-sensitive status metadata enter IndexedDB.
  let databasePromise;
  function database(){
    if(databasePromise)return databasePromise;
    if(!globalThis.indexedDB)throw Error('This browser does not provide persistent archive storage (IndexedDB).');
    databasePromise=new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB_NAME,1);
      r.onupgradeneeded=()=>{
        if(!r.result.objectStoreNames.contains('settings'))r.result.createObjectStore('settings');
        if(!r.result.objectStoreNames.contains('archives'))r.result.createObjectStore('archives',{keyPath:'archiveId'});
      };
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error||Error('Could not open encrypted archive storage.'));
      r.onblocked=()=>reject(Error('Archive database upgrade is blocked by another tab. Close it and retry.'));
    }).catch(e=>{databasePromise=null;throw e});
    return databasePromise;
  }
  async function dbAction(store,mode,method,...args){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode),request=tx.objectStore(store)[method](...args);
      let result;
      request.onsuccess=()=>{result=request.result};
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(tx.error||Error('Browser could not persist the encrypted archive.'));
      tx.onerror=()=>reject(tx.error||Error('Encrypted archive storage failed.'));
    });
  }
  const setting=(key)=>dbAction('settings','readonly','get',key);
  const saveSetting=(key,value)=>dbAction('settings','readwrite','put',value,key);
  const archiveList=()=>dbAction('archives','readonly','getAll');
  const saveArchive=record=>dbAction('archives','readwrite','put',record);
  const deleteArchive=id=>dbAction('archives','readwrite','delete',id);

  let settings=null, dataKey=null, token=null, tokenExpiry=0, account=null, folderId=null;
  let busy=false, processing=false, lastBody=null, nextSnapshot=0, snapshotTimer=0, lastSnapshotAt=0, pendingChanges=false, remoteRecords=[];
  let view='start', selectedRemote=null, recovered=null, checkpointRequested=false, auto=true;
  const isLocked=()=>document.documentElement.classList.contains('elsewhere-locked');
  const connected=()=>!!token && Date.now()<tokenExpiry-90000;
  const allPending=async()=>((await archiveList())||[]).filter(r=>r.status!=='verified');
  const safeError=e=>String(e?.message||e||'Something went wrong.').slice(0,240);
  function status(message,error=false){
    const el=$('edvStatus');if(el){el.textContent=message;el.dataset.error=String(error);}
  }
  function configOfVault(){return settings?.vault||null;}
  function encryptReady(){return !!configOfVault() && !!dataKey;}
  function savePrefs(){return saveSetting('preferences',{auto,accountId:account?.id||settings?.accountId||null,folderId:folderId||settings?.folderId||null});}
  function readSettings(){return Promise.all([setting('vault'),setting('preferences')]).then(([vault,prefs])=>{
    settings={vault:vault||null,accountId:prefs?.accountId||null,folderId:prefs?.folderId||null};
    auto=prefs?.auto!==false;folderId=settings.folderId;return settings;
  })}
  function clearSession(){dataKey=null;token=null;tokenExpiry=0;account=null;recovered=null;lastBody=null;clearTimeout(snapshotTimer);show();}
  async function saveVault(descriptor){
    await saveSetting('vault',descriptor);
    settings.vault=descriptor;
  }
  function snapshotPayload(){
    const api=globalThis.ElsewhereV13State,legacy=globalThis.ElsewhereLegacy;
    if(!api?.runtime?.state || !api.runtime.adapter?.persistent)throw Error('Writing is not durably saved in this browser. Archive stopped.');
    if(globalThis.Elsewhere14?.conflicted)throw Error('Another tab has changed this workspace. Reload before archiving.');
    const universe=api.exportUniverse(api.runtime.state);
    if(legacy?.getState && api.syncLegacyState)api.syncLegacyState(universe.state,legacy.getState());
    return {format:'Elsewhere archive',version:1,universe};
  }
  function requestSnapshot(urgent=false){
    if(!encryptReady() || !auto || isLocked())return;
    if(busy){pendingChanges=true;return}
    clearTimeout(snapshotTimer);
    const delay=urgent?900:Math.max(1400,45000-(Date.now()-lastSnapshotAt));
    snapshotTimer=setTimeout(()=>{void backupNow(false)},delay);
  }
  async function backupNow(force=true){
    if(!encryptReady() || isLocked())throw Error('Unlock your archive passphrase to create backups.');
    if(busy){pendingChanges=true;return}
    busy=true;
    try {
      const payload=snapshotPayload(),body=JSON.stringify({...payload,universe:{...payload.universe,exportedAt:0}});
      if(force || body!==lastBody){
        const env=await sealArchive(payload,dataKey,configOfVault());
        const serialized=JSON.stringify(env);
        if(enc.encode(serialized).length>MAX_BYTES)throw Error('Encrypted snapshot exceeds the 35 MB archive limit.');
        const record={archiveId:env.archiveId,createdAt:env.createdAt,status:'pending',body:serialized,
          bytes:enc.encode(serialized).length,sha256:await digest(enc.encode(serialized)),remoteId:null,error:null};
        await saveArchive(record);
        lastBody=body;lastSnapshotAt=Date.now();
        status('Encrypted snapshot saved in this browser. Cloud delivery pending.');
      }
      await uploadPending();
    }catch(error){status(safeError(error),true);throw error}
    finally{
      busy=false;
      if(pendingChanges){pendingChanges=false;requestSnapshot();}
      await renderHistory().catch(()=>{});
      show();
    }
  }

  async function loadGoogle(){
    if(globalThis.google?.accounts?.oauth2)return;
    if(document.getElementById('edvGoogleLibrary')){
      return new Promise((resolve,reject)=>{
        let count=0;const interval=setInterval(()=>{if(globalThis.google?.accounts?.oauth2){clearInterval(interval);resolve()}else if(++count>100){clearInterval(interval);reject(Error('Google authorization did not load.'))}},100);
      });
    }
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.id='edvGoogleLibrary';
      script.src='https://accounts.google.com/gsi/client';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';
      script.onload=resolve;script.onerror=()=>reject(Error('Google authorization is unavailable. Check your connection or content blockers.'));
      document.head.append(script);
    });
    if(!globalThis.google?.accounts?.oauth2)throw Error('Google authorization could not initialize.');
  }
  async function authorizeGoogle(){
    const cid=clientId();
    if(!/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(cid))throw Error('Google Drive connection is not configured by the Elsewhere publisher yet.');
    if(location.protocol!=='https:' && location.hostname!=='localhost')throw Error('Google authorization requires Elsewhere on a registered HTTPS origin.');
    if(!navigator.onLine)throw Error('Connect to the internet before authorizing Google Drive.');
    await loadGoogle();
    return new Promise((resolve,reject)=>{
      try{
        const c=google.accounts.oauth2.initTokenClient({
          client_id:cid,scope:SCOPE,
          callback:response=>{
            if(!response?.access_token)return reject(Error('Google did not grant Drive access.'));
            token=response.access_token;tokenExpiry=Date.now()+Math.max(1,Number(response.expires_in)||3600)*1000;
            resolve();
          },
          error_callback:()=>reject(Error('Google authorization was cancelled or blocked.'))
        });
        c.requestAccessToken({prompt:'consent select_account'});
      }catch(e){reject(e)}
    });
  }
  async function drive(path,options={}){
    if(!connected())throw Error('Google authorization expired. Use Reconnect Google Drive; encrypted local backups remain safe.');
    const response=await fetch(path.startsWith('https://')?path:API+path,{
      method:options.method||'GET',headers:{Authorization:'Bearer '+token,...options.headers},body:options.body,cache:'no-store'
    });
    if(response.status===401 || response.status===403){token=null;tokenExpiry=0;throw Error('Google Drive permission expired or was withdrawn. Reconnect to resume.');}
    if(!response.ok)throw Error('Google Drive returned '+response.status+'. Archive retained locally.');
    if(options.raw)return response.text();
    return response.json();
  }
  async function searchFiles(query,fields='nextPageToken,files(id,name,mimeType,parents,appProperties,createdTime,size)'){
    let page='',results=[];
    do {
      const params=new URLSearchParams({q:query,fields,pageSize:'100',spaces:'drive'});
      if(page)params.set('pageToken',page);
      const data=await drive('/files?'+params.toString());
      results=results.concat(data.files||[]);page=data.nextPageToken||'';
      if(results.length>1000)throw Error('Too many archive records to list safely.');
    }while(page);
    return results;
  }
  function quoted(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  async function folder(name,parent){
    const q="name='"+quoted(name)+"' and mimeType='application/vnd.google-apps.folder' and trashed=false"+
      (parent?" and '"+quoted(parent)+"' in parents":'');
    const existing=await searchFiles(q);
    if(existing.length>1)throw Error('More than one '+name+' folder is accessible. Choose a destination manually in Google Drive before reconnecting.');
    if(existing.length)return existing[0].id;
    const created=await drive('/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',...(parent?{parents:[parent]}:{})})});
    if(!created?.id)throw Error('Google did not confirm the archive folder.');
    return created.id;
  }
  async function ensureFolder(){
    if(folderId){
      try{const f=await drive('/files/'+encodeURIComponent(folderId)+'?fields=id,mimeType,trashed');
        if(f?.mimeType==='application/vnd.google-apps.folder'&&!f.trashed)return folderId;}catch{}
    }
    const root=await folder('Elsewhere',null),inner=await folder('Encrypted Archives',root);
    folderId=inner;await savePrefs();return inner;
  }
  async function listRemote(){
    const files=await searchFiles("trashed=false and appProperties has { key='elsewhereArchive' and value='v1' }");
    remoteRecords=files.filter(f=>f?.appProperties?.elsewhereArchive==='v1').sort((a,b)=>String(b.createdTime||'').localeCompare(String(a.createdTime||'')));
    renderRemote();return remoteRecords;
  }
  async function connect(){
    if(busy)return;busy=true;status('Opening Google account authorization…');
    try{
      await authorizeGoogle();
      const about=await drive('/about?fields=user(displayName,emailAddress,permissionId)');
      const id=about.user?.permissionId;
      if(!id)throw Error('Could not identify the authorized Google Drive account.');
      if(settings?.accountId && settings.accountId!==id &&
        (await allPending()).length)throw Error('This device has encrypted backups pending for the previous Google account. Reconnect that account and complete them before switching.');
      if(settings?.accountId && settings.accountId!==id &&
        !confirm('This is a DIFFERENT Google account. Switch the archive destination for this device? Existing cloud files stay in the previous account.')){
        token=null;tokenExpiry=0;return;
      }
      if(settings?.accountId && settings.accountId!==id)folderId=null;
      account={id,display:about.user?.emailAddress||about.user?.displayName||'Connected account'};
      if(!settings)await readSettings();
      await ensureFolder();await savePrefs();await listRemote();
      status('Connected to Google Drive. Only encrypted archive bytes may be uploaded.');
      if(dataKey)await uploadPending();
      view=settings?.vault?'dashboard':'recover';
    }catch(e){status(safeError(e),true)}
    finally{busy=false;show()}
  }
  function multipart(meta,body){
    const boundary='elsewhere_'+hex(random(12));
    const content='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n'+
      '--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+boundary+'--';
    return {boundary,content};
  }
  async function findRemoteArchive(id){
    const matches=await searchFiles("trashed=false and appProperties has { key='elsewhereArchiveId' and value='"+quoted(id)+"' }");
    if(matches.length>1)throw Error('Duplicate remote archive IDs detected; automatic uploading stopped for review.');
    return matches[0]||null;
  }
  async function uploadOne(record){
    if(!connected())return false;
    if(!dataKey)throw Error('Unlock the archive before verifying cloud uploads.');
    const existing=await findRemoteArchive(record.archiveId);
    let fileId=existing?.id;
    if(!fileId){
      const parent=await ensureFolder();
      const meta={name:'Elsewhere-'+record.createdAt.replace(/[:.]/g,'-')+'-'+record.archiveId+'.elsewhere-vault.json',
        mimeType:'application/json',parents:[parent],appProperties:{elsewhereArchive:'v1',elsewhereArchiveId:record.archiveId}};
      const m=multipart(meta,record.body);
      const created=await drive(UPLOAD,{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+m.boundary},body:m.content});
      fileId=created?.id;
      if(!fileId)throw Error('Google did not return an archive file ID.');
    }
    const raw=await drive('/files/'+encodeURIComponent(fileId)+'?alt=media',{raw:true});
    if(await digest(enc.encode(raw))!==record.sha256)throw Error('Uploaded archive read-back differs from encrypted local copy.');
    const remote=JSON.parse(raw);
    if(remote.archiveId!==record.archiveId || remote.key?.keyId!==configOfVault().keyId)throw Error('Remote archive identity differs from the active vault.');
    const payload=await openArchiveWithKey(remote,dataKey);
    const checked=globalThis.Elsewhere14?.validateUniverseRestore?.(payload.universe,globalThis.ElsewhereV13State);
    if(checked && !checked.ok)throw Error('Uploaded archive failed project validation.');
    record.status='verified';record.remoteId=fileId;record.error=null;record.verifiedAt=new Date().toISOString();
    await saveArchive(record);
    return true;
  }
  async function uploadPending(){
    if(processing||!connected()||!dataKey||isLocked())return;
    processing=true;
    try{
      const pending=(await allPending()).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      for(const record of pending){
        try {await uploadOne(record);}
        catch(e){record.status='pending';record.error=safeError(e);await saveArchive(record);status(record.error,true);break;}
      }
      await trimLocalVerified();
    }finally{processing=false;await renderHistory().catch(()=>{});show()}
  }
  async function trimLocalVerified(){
    const records=((await archiveList())||[]).filter(x=>x.status==='verified').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    // Keep recent verified ciphertext locally. Never prune pending archives or remote versions.
    for(const r of records.slice(12))await deleteArchive(r.archiveId);
  }
  function downloadEncrypted(name,body){
    const url=URL.createObjectURL(new Blob([body],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function restoreRemote(fileId){
    selectedRemote=remoteRecords.find(x=>x.id===fileId)||null;
    if(!selectedRemote)return;
    recovered=null;checkpointRequested=false;
    view='restore';show();
  }
  async function inspectRestore(password){
    if(!selectedRemote)throw Error('Select an encrypted archive first.');
    const raw=await drive('/files/'+encodeURIComponent(selectedRemote.id)+'?alt=media',{raw:true});
    if(enc.encode(raw).length>MAX_BYTES)throw Error('Remote archive exceeds the safety limit.');
    const envelope=JSON.parse(raw),opened=await openArchive(envelope,password);
    const checked=globalThis.Elsewhere14?.validateUniverseRestore?.(opened.payload.universe,globalThis.ElsewhereV13State);
    if(!checked?.ok)throw Error(checked?.reason||'Archive project references failed validation.');
    if(configOfVault() && configOfVault().keyId!==envelope.key.keyId)throw Error('This browser already has a different vault. Restore this archive in a clean browser profile to protect the existing vault.');
    recovered={envelope,payload:opened.payload,key:opened.key};
    checkpointRequested=false;show();
  }
  async function saveCheckpoint(){
    if(!recovered)throw Error('Unlock a remote archive first.');
    const current=snapshotPayload();
    const protectedBefore=await sealArchive(current,recovered.key,recovered.envelope.key);
    downloadEncrypted('Elsewhere-Before-Drive-Restore-'+protectedBefore.archiveId+'.json',JSON.stringify(protectedBefore));
    checkpointRequested=true;show();
  }
  async function applyRestore(){
    if(!recovered || !checkpointRequested || !$('edvCheckpointConfirm')?.checked)throw Error('Download and verify the encrypted safety checkpoint before restoring.');
    if(globalThis.Elsewhere14?.conflicted)throw Error('Another tab changed Elsewhere. Reload and retry.');
    if(!confirm('Replace this browser’s Elsewhere writing, projects, and progress from this encrypted archive? No automatic merging will occur.'))return;
    const api=globalThis.ElsewhereV13State,legacy=globalThis.ElsewhereLegacy;
    if(!api?.runtime?.adapter?.persistent)throw Error('Restore requires working persistent browser storage.');
    const before=api.exportUniverse(api.runtime.state);
    const result=await globalThis.Elsewhere14.commitUniverseTransaction(recovered.payload.universe,{
      api,target:api.runtime.state,legacy,before
    });
    if(!result.ok || result.cleanupRemaining.length)throw Error('Restore requires review: browser storage cleanup was incomplete.');
    if(!configOfVault())await saveVault(recovered.envelope.key);
    dataKey=recovered.key;recovered=null;
    view='dashboard';status('Restore was verified. Reload Elsewhere to refresh every workspace view.');
    show();
  }
  async function renderHistory(){
    const host=$('edvLocalHistory');if(!host)return;
    const records=((await archiveList())||[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    host.replaceChildren();
    if(!records.length){host.append(element('p','No encrypted snapshots have been created.','edv-small'));return;}
    for(const r of records.slice(0,25)){
      const line=element('div','','edv-history-line');
      line.append(element('span',new Date(r.createdAt).toLocaleString()+' · '+(r.status==='verified'?'Verified on Drive':'Encrypted locally; pending'),'')); 
      const button=element('button','Download','edv-minibutton');button.type='button';
      button.addEventListener('click',()=>downloadEncrypted('Elsewhere-'+r.archiveId+'.elsewhere-vault.json',r.body));
      line.append(button);host.append(line);
    }
  }
  function renderRemote(){
    const host=$('edvRemoteList');if(!host)return;
    host.replaceChildren();
    if(!remoteRecords.length){host.append(element('p','No archives created by this Google application were found in this account.','edv-small'));return;}
    for(const file of remoteRecords.slice(0,30)){
      const line=element('div','','edv-history-line');
      line.append(element('span','Encrypted archive · '+(file.createdTime?new Date(file.createdTime).toLocaleString():file.id),''));
      const button=element('button','Review restore','edv-minibutton');button.type='button';
      button.addEventListener('click',()=>void restoreRemote(file.id));line.append(button);host.append(line);
    }
  }
  function element(tag,text='',cls=''){
    const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;
  }
  function action(label,handler,primary=false){
    const b=element('button',label,primary?'edv-primary':'edv-button');b.type='button';
    b.addEventListener('click',async()=>{b.disabled=true;try{await handler()}catch(e){status(safeError(e),true)}finally{b.disabled=false;show()}});
    return b;
  }
  function field(label,type='text',min=0){
    const wrap=element('label','','edv-field');wrap.append(element('span',label));
    const input=document.createElement('input');input.type=type;if(min)input.minLength=min;input.autocomplete='off';
    wrap.append(input);return {wrap,input};
  }
  function setView(next){view=next;show();}
  function show(){
    const body=$('edvBody'),caption=$('edvCaption');if(!body)return;
    body.replaceChildren();
    if(caption)caption.textContent=view==='restore'?'RESTORE AN ARCHIVE':view==='recover'?'RETURNING TO ELSEWHERE':view==='dashboard'?'ARCHIVE STATUS':'ENCRYPTED CLOUD ARCHIVE';
    const append=(...children)=>body.append(...children);
    if(isLocked()){append(element('p','Unlock Elsewhere to work with your encrypted archive.','edv-small'));return;}
    if(view==='start'){
      append(element('h4','Your writing, kept for you.'),element('p','Create private encrypted copies in this browser, then store them in your own Google Drive. Neither your archive password nor readable journal content is uploaded.','edv-small'));
      append(element('p','The existing Elsewhere journal storage is still plaintext in this browser. This feature encrypts archive copies; it does not yet encrypt live journal storage.','edv-warning'));
      append(action('Set up an encrypted archive',()=>setView(settings?.vault?'dashboard':'new'),true));
      append(action('Recover an existing Google Drive archive',()=>setView('recover')));
    }else if(view==='new'){
      append(element('h4','Choose your archive passphrase'),element('p','You will need this passphrase to open archives on another device. It is separate from the Dexter screen password. It cannot be recovered by Google or Elsewhere.','edv-small'));
      const one=field('Archive passphrase (14+ characters)','password',14),two=field('Confirm archive passphrase','password',14);
      append(one.wrap,two.wrap,action('Create encrypted archive',async()=>{
        if(one.input.value!==two.input.value)throw Error('Passphrases do not match.');
        if(settings?.vault)throw Error('An encrypted archive is already configured here.');
        const created=await createVault(one.input.value);
        await saveVault(created.descriptor);dataKey=created.key;view='connect';
        await backupNow();status('The first encrypted snapshot was saved locally.');
      },true),action('Back',()=>setView('start')));
    }else if(view==='connect'){
      append(element('h4','Connect your own Google Drive'),element('p','Google will ask which account to use and request permission to manage files created by Elsewhere. The authorization token stays in session memory.','edv-small'));
      if(!clientId())append(element('p','The publisher must first register an OAuth client ID. Local encrypted archives work now; Google connection is unavailable until that public ID is configured.','edv-warning'));
      append(action('Connect Google Drive',connect,true),action('Continue with local encrypted archives',()=>setView('dashboard')));
    }else if(view==='dashboard'){
      append(element('h4','Archive controls'));
      const connection=connected()?'Google Drive connected: '+(account?.display||'authorized account'):'Google Drive needs authorization to send backups.';
      append(element('p',(dataKey?'Archive unlocked for this session. ':'Archive locked. ')+connection,'edv-small'));
      append(element('p','Your live Elsewhere writing is still stored in plaintext browser storage. Encrypted archives do not change this.','edv-warning'));
      if(!dataKey){
        const f=field('Archive passphrase','password');append(f.wrap,action('Unlock archive',async()=>{dataKey=await unlockVault(configOfVault(),f.input.value);status('Archive unlocked.');await uploadPending();},true));
      }else{
        append(action('Encrypt and archive now',()=>backupNow(true),true));
        append(action('Lock archive key',()=>{dataKey=null;lastBody=null;status('Archive locked; scheduled encryption is paused.');}));
      }
      if(!connected())append(action('Connect / reconnect Google Drive',connect));
      else append(action('Look for archived copies',async()=>{await listRemote();view='recover'}));
      const toggle=element('label','','edv-toggle');const box=document.createElement('input');box.type='checkbox';box.checked=auto;
      box.addEventListener('change',()=>{auto=box.checked;void savePrefs().then(()=>{if(auto)requestSnapshot(true);status(auto?'Automatic archiving enabled while this session is unlocked.':'Automatic archiving paused.');}).catch(e=>status(safeError(e),true));});
      toggle.append(box,element('span','Automatically encrypt saved changes while open'));append(toggle);
      append(element('p','A Google access token may expire. Cloud transfer then pauses until you reconnect. Local ciphertext stays queued.','edv-small'));
      append(element('h5','Recent encrypted copies'),element('div','','edv-history') );
      body.lastElementChild.id='edvLocalHistory';void renderHistory();
      append(action('Find a Drive archive to restore',async()=>{if(!connected())throw Error('Reconnect Google before browsing Drive archives.');await listRemote();view='recover'}));
      append(action('Disconnect this Google session',()=>{token=null;tokenExpiry=0;account=null;status('Google session disconnected. Drive files were not deleted.');}));
    }else if(view==='recover'){
      append(element('h4','Find a previous archive'),element('p','Connect the Google account that holds your encrypted files. Choose a version before entering the archive passphrase. Nothing is replaced until you approve a restore.','edv-small'));
      if(!connected())append(action('Connect Google Drive',connect,true));
      else{
        append(element('p','Connected account: '+(account?.display||'Google Drive'),'edv-small'));
        append(action('Refresh archive list',listRemote));
        const region=element('div','','edv-history');region.id='edvRemoteList';append(region);renderRemote();
      }
      append(action('Back to archive controls',()=>setView(settings?.vault?'dashboard':'start')));
    }else if(view==='restore'){
      append(element('h4','Review an encrypted archive'),element('p','Selected Drive file: '+(selectedRemote?.name||'Unknown archive'),'edv-small'));
      if(!recovered){
        const f=field('Archive passphrase','password');append(f.wrap,action('Decrypt and inspect locally',async()=>{await inspectRestore(f.input.value);status('Archive unlocked and checked. Nothing was imported.');},true));
      }else{
        const projects=recovered.payload.universe.state.projects||[];
        append(element('p',projects.length+' project(s) in this archive. Restoring will replace existing local projects and prompt progress. It never merges or promotes facts.','edv-warning'));
        append(action(checkpointRequested?'Download another safety checkpoint':'Download encrypted safety checkpoint',saveCheckpoint));
        if(checkpointRequested){
          const label=element('label','','edv-toggle'),check=document.createElement('input');check.id='edvCheckpointConfirm';check.type='checkbox';
          label.append(check,element('span','I verified that the encrypted safety checkpoint was saved outside this browser.'));append(label);
          append(action('Restore this archive',applyRestore,true));
        }
      }
      append(action('Cancel restoration',()=>{recovered=null;selectedRemote=null;view='recover';show()}));
    }
  }
  function install(){
    const host=$('e14Panel-privacy');if(!host||$('edvRoot'))return false;
    const root=element('section','','edv-root');root.id='edvRoot';
    const head=element('div','','edv-head');head.append(element('span','PRIVATE BACKUPS','edv-kicker'),element('h3','Encrypted cloud archive'));
    root.append(head);
    const caption=element('p','','edv-kicker');caption.id='edvCaption';root.append(caption);
    const body=element('div','','edv-body');body.id='edvBody';root.append(body);
    const feedback=element('p','','edv-status');feedback.id='edvStatus';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');root.append(feedback);
    host.prepend(root);
    // V13 uses synchronous plaintext persistence. Observe successful writes without replacing its adapter.
    const stateAPI=globalThis.ElsewhereV13State;
    if(stateAPI?.flushDirty && !stateAPI.__edvWrapped){
      const base=stateAPI.flushDirty;
      stateAPI.flushDirty=function(...args){const result=base.apply(this,args);if(result?.persistent && result.written?.length)requestSnapshot();return result};
      stateAPI.__edvWrapped=true;
    }
    window.addEventListener('elsewhere:response-saved',()=>requestSnapshot(true));
    document.documentElement.addEventListener('click',e=>{if(e.target?.closest?.('#elsewhereLockButton')){dataKey=null;token=null;tokenExpiry=0;}},true);
    new MutationObserver(()=>{if(isLocked())clearSession()}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && !isLocked()){requestSnapshot();void uploadPending().catch(()=>{})}});
    window.addEventListener('online',()=>{if(!isLocked()){requestSnapshot();void uploadPending().catch(()=>{})}});
    setInterval(()=>{if(!isLocked())requestSnapshot();},60000);
    void readSettings().then(()=>{view=settings.vault?'dashboard':'start';show();void renderHistory()}).catch(e=>{status(safeError(e),true);show()});
    show();return true;
  }
  if(typeof document!=='undefined'){
    const start=()=>{if(install())return;let n=0;const retry=setInterval(()=>{if(install()||++n>75)clearInterval(retry);},100)};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
  globalThis.ElsewhereDriveArchive=Object.freeze({
    createVault,unlockVault,sealArchive,openArchive,openArchiveWithKey,validateEnvelope,descriptorValid,
    get configured(){return !!settings?.vault},get unlocked(){return !!dataKey},
    get googleConnected(){return connected()},snapshot:()=>backupNow(true),open:()=>{view='start';show()}
  });
})();