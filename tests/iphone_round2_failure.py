"""Mobile failure-path checks: forbidden draft loss, invalid selection and share cancellation."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'tests/fixture.html').read_text().replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(ROOT/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+(ROOT/'src/elsewhere14.js').read_text()+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('ELSEWHERE_BROWSER_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':393,'height':852},has_touch=True,is_mobile=True,reduced_motion='reduce')
 page.evaluate('''() => {
   let shouldThrow=false; const draft={}; const prefs={};
   Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>draft[k]??null,setItem:(k,v)=>{if(window.failDraftWrites)throw Error('quota');draft[k]=v}}});
   Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>prefs[k]??null,setItem:(k,v)=>prefs[k]=v}});
   window.failDraftWrites=false;
   Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{throw Object.assign(Error('dismissed'),{name:'AbortError'})}})
 }''')
 page.set_content(html)
 page.wait_for_selector('#e14Workspace')
 page.evaluate('''()=>{
   const s=ElsewhereV13State.runtime.state;
   s.projects.push({id:'p2',name:'Different project',artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]});
   window.dispatchEvent(new Event('elsewhere:prompt'))
 }''')
 page.wait_for_function("document.querySelector('#e14ProjectSelect option[value=\"p2\"]')!==null")
 page.locator('#e14Answer').fill('Do not lose me when quota is exceeded')
 page.evaluate('window.failDraftWrites=true')
 page.locator('#e14ProjectSelect').select_option('p2')
 assert page.locator('#e14ProjectSelect').input_value()=='p1','Switcher rolled back to the original project'
 assert page.locator('#e14Answer').input_value()=='Do not lose me when quota is exceeded'
 assert 'Cannot be recovered' in page.locator('#e14WriterStatus').inner_text() or 'cannot be recovered' in page.locator('#e14Status').inner_text().lower()
 assert page.locator('#e14Tabs').is_visible()
 page.evaluate('window.failDraftWrites=false')
 page.locator('#e14WritingMore summary').click()
 page.get_by_role('button',name='Share writing (unencrypted)').click()
 assert 'Share cancelled' in page.locator('#e14WriterStatus').inner_text()
 assert page.locator('#e14Answer').input_value()=='Do not lose me when quota is exceeded'
 b.close()
print('IPHONE FAILURE PATHS PASS: storage-denied switch is blocked; share cancellation preserves writing')
