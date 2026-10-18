"""Real Chromium component evidence for the five-pass Elsewhere Atlas uplift."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'tests/fixture.html').read_text().replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(R/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+(R/'src/elsewhere14.js').read_text()+'</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1180,'height':840},accept_downloads=True,reduced_motion='reduce')
    page.evaluate('''() => {const cache={};Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>cache[k]??null,setItem:(k,v)=>cache[k]=String(v),removeItem:k=>delete cache[k]}})}''')
    page.set_content(html)
    page.wait_for_selector('#e14Workspace')
    page.evaluate('''() => {
      window.ElsewhereV13State.runtime.adapter.persistent=true;
      window.ElsewhereV13Domain.reviseFact=(project,id,patch,reason)=>{
        const record=project.facts.find(f=>f.id===id);const prior=record.status;Object.assign(record,patch);
        record.revisions=(record.revisions||[]).concat({old:{status:prior},next:{status:record.status},reason});return record;
      };
    }''')
    # Explicit continuation cannot silently rewrite its source artifact.
    page.get_by_role('tab',name='Library',exact=True).click()
    card=page.locator('#e14Cards .e14-artifact').filter(has_text='Mara')
    card.get_by_role('button',name='Continue writing').click()
    assert 'Writing from character: Mara' in page.locator('#e14SourceContext').inner_text()
    assert page.locator('#e14Answer').input_value()==''
    page.locator('#e14Answer').fill('Mara meets the keeper at the harbor gate.')
    page.get_by_role('button',name='Save response',exact=True).click()
    assert page.evaluate('''() => {const p=ElsewhereV13State.runtime.state.projects[0];return p.artifacts.at(-1).meta.inspiredByArtifactId}''')=='char-one'
    assert page.locator('#e14SourceContext').is_hidden()
    assert page.evaluate('''() => ElsewhereV13State.runtime.state.projects[0].artifacts[0].name''')=='Mara'
    # Crash recovery is flushed synchronously on visibility change, not only after 450ms.
    page.locator('#e14Answer').fill('Unfinished thought needs safe recovery')
    page.evaluate('''() => {Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))}''')
    assert 'Unfinished thought' in page.evaluate('sessionStorage.getItem("elsewhere:v14:session-drafts")')
    # Provisional facts must never silently become established.
    page.evaluate('''() => {
      const model=ElsewhereV13State.runtime.state.projects[0];
      model.facts=Array.from({length:25},(_,i)=>({id:'fact'+i,freeText:'Possibility '+i,status:'possible',source:'author',updatedAt:i,revisions:[]}));
    }''')
    page.get_by_role('tab',name='Library',exact=True).click()
    assert page.locator('#e14ReviewNothing').count()==0
    assert page.locator('#e14CanonReview .e14-review-item').count()==10
    assert '25 pending' in page.locator('#e14CanonCount').inner_text()
    page.get_by_role('button',name='Next candidates').click()
    assert 'page 2/3' in page.locator('#e14CanonCount').inner_text()
    page.get_by_role('button',name='Previous candidates').click()
    action=page.locator('#e14CanonReview .e14-review-item').first
    assert action.get_by_role('button',name='Establish with rationale').is_disabled()
    action.locator('input').fill('Confirmed by the project author.')
    page.once('dialog',lambda dlg: dlg.accept())
    action.get_by_role('button',name='Establish with rationale').click()
    assert page.evaluate('''() => ElsewhereV13State.runtime.state.projects[0].facts.filter(f=>f.status==='established').length''')==1
    assert page.evaluate('''() => ElsewhereV13State.runtime.state.projects[0].facts.find(f=>f.status==='established').revisions.at(-1).reason''')=='Confirmed by the project author.'
    # Fit & center are explicit camera operations, not persisted node moves.
    page.get_by_role('tab',name='Atlas',exact=True).click()
    before=page.evaluate('''() => JSON.stringify(ElsewhereV13State.runtime.state.projects[0].atlasPositions||{})''')
    page.get_by_role('button',name='Fit visible').click()
    layer=page.locator('#e14Graph .e14-graph-layer')
    assert 'scale(' in layer.get_attribute('transform')
    page.locator('#e14Graph .e14-node').first.click()
    page.get_by_role('button',name='Center selected').click()
    assert page.evaluate('''() => JSON.stringify(ElsewhereV13State.runtime.state.projects[0].atlasPositions||{})''')==before
    # Old import must open a masked encrypted-checkpoint dialog; cancel keeps source untouched.
    page.evaluate('''() => {
      const input=document.createElement('input');input.id='backupImportInput';input.type='file';input.hidden=true;document.body.append(input);
      window.existingImportCount=0;input.addEventListener('change',()=>window.existingImportCount++);
    }''')
    page.on('dialog',lambda dlg: dlg.accept())
    page.locator('#backupImportInput').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':b'{"version":12,"progress":{}}'})
    dialog=page.locator('dialog.e14-vault-prompt')
    dialog.wait_for(state='visible')
    assert 'recovery checkpoint' in dialog.inner_text().lower()
    assert dialog.locator('input').get_attribute('type')=='password'
    dialog.get_by_role('button',name='Cancel').click()
    dialog.wait_for(state='detached')
    assert page.evaluate('window.existingImportCount')==0
    # In an opaque-origin test page WebCrypto is intentionally unavailable; the
    # checkpoint must fail closed rather than proceeding or exporting plaintext.
    page.locator('#backupImportInput').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':b'{"version":12,"progress":{}}'})
    dialog=page.locator('dialog.e14-vault-prompt')
    dialog.wait_for(state='visible')
    dialog.locator('input').fill('A-long-and-independent-secret')
    dialog.get_by_role('button',name='Encrypt recovery file').click()
    page.wait_for_selector('dialog.e14-vault-prompt',state='detached')
    assert 'secure browser context' in page.locator('#e14Status').inner_text()
    assert page.evaluate('window.existingImportCount')==0
    assert page.evaluate('window.appErrors')==[],page.evaluate('window.appErrors')
    print('OMNI BROWSER PASS: continuation, visibility recovery, canon review, camera fit, import checkpoint fail-closed in insecure context')
    browser.close()
