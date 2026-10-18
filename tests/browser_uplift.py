"""Component-level Chromium regression exercises; no false claim of live-site coverage."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'tests/fixture.html').read_text().replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+ (ROOT/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+ (ROOT/'src/elsewhere14.js').read_text()+'</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1100,'height':800},reduced_motion='reduce')
 page.evaluate('''() => {
   const cache={};
   Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>cache[k]??null,setItem:(k,v)=>cache[k]=String(v),removeItem:k=>delete cache[k]}});
 }''')
 page.set_content(html)
 page.wait_for_selector('#e14Workspace')
 page.locator('#e14Answer').fill('The truth is in the dust between these worlds.')
 page.wait_for_timeout(600)
 assert 'truth is in the dust' in page.evaluate('sessionStorage.getItem("elsewhere:v14:session-drafts")')
 assert page.locator('#e14WordCount').inner_text()=='9 words'
 assert page.locator('#e14Recover').is_visible()
 # Resimulate a document load with the same per-tab session cache, but not a true browser navigation.
 page.evaluate('delete window.Elsewhere14')
 page.set_content(html)
 page.wait_for_selector('#e14Workspace')
 assert page.locator('#e14Recover').is_visible(), 'recovery affordance on boot'
 page.locator('#e14Recover').click()
 assert page.locator('#e14Answer').input_value()=='The truth is in the dust between these worlds.'
 page.locator('#e14Answer').fill('A permanent response about the stars.')
 page.get_by_role('button',name='Save response',exact=True).click()
 assert page.evaluate('sessionStorage.getItem("elsewhere:v14:session-drafts")') is not None
 assert page.locator('#e14Recover').is_hidden(), 'durable save clears temporary recovery copy'
 page.evaluate('''() => {
  const p=window.ElsewhereV13State.runtime.state.projects[0];
  p.artifacts=Array.from({length:255},(_,i)=>({id:'node'+i,name:'Portal '+i,type:'place',createdAt:i,summary:'A port across worlds.'}));
  p.relationships=Array.from({length:254},(_,i)=>({id:'edge'+i,fromId:'node'+i,toId:'node'+(i+1),status:'established',label:'connected'}));
 }''')
 page.get_by_role('tab',name='Atlas',exact=True).first.click()
 assert page.locator('#e14Graph .e14-node').count()==120
 assert page.locator('#e14Graph .e14-edge').count()==119
 assert page.locator('#e14Directory button').count()==120
 page.get_by_role('button',name='Later →').click()
 assert page.locator('#e14Graph .e14-node').count()==120
 assert 'Portal 120' in page.locator('#e14Directory button').first.text_content()
 page.get_by_role('button',name='Later →').click()
 assert page.locator('#e14Graph .e14-node').count()==15
 assert page.get_by_role('button',name='Later →').is_disabled()
 page.get_by_role('tab',name='Library',exact=True).click()
 artifact=page.locator('#e14Cards .e14-artifact').filter(has_text='Portal 250').first
 artifact.get_by_role('button',name='Atlas').click()
 assert 'page 3/3' in page.locator('#e14AtlasCount').inner_text()
 assert 'Portal 250' in page.locator('#e14GraphDetail').inner_text()
 page.locator('#e14AtlasFind').fill('Portal 254')
 page.wait_for_timeout(120)
 assert page.locator('#e14Graph .e14-node').count()==1
 page.locator('#e14Time').fill('0')
 page.wait_for_timeout(120)
 assert page.locator('#e14Graph .e14-node').count()==0
 # Native dialog for the encrypted backup must mask the password; cancel must leave data untouched.
 page.evaluate('window.ElsewhereV13State.runtime.adapter.persistent=true')
 page.get_by_role('tab',name='Vault',exact=True).click()
 page.locator('#e14VaultFile').set_input_files({'name':'encrypted.json','mimeType':'application/json','buffer':b'{"type":"encrypted-universe"}'})
 prompt=page.locator('dialog.e14-vault-prompt')
 assert prompt.is_visible()
 assert prompt.locator('input').get_attribute('type')=='password'
 prompt.get_by_role('button',name='Cancel').click()
 page.wait_for_selector("dialog.e14-vault-prompt", state="detached")
 assert page.evaluate('window.ElsewhereV13State.runtime.state.projects[0].artifacts.length')==255
 assert page.evaluate('window.appErrors') == [],page.evaluate('window.appErrors')
 print('UPLIFT BROWSER PASS: draft write/recover/clear, count, 255-node bounded atlas, pagination/filter, protected masked vault cancel')
 browser.close()
