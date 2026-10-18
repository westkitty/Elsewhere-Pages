from pathlib import Path
import os
import tempfile
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];H=(R/'tests/fixture.html').read_text()
H=H.replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(R/'src/elsewhere14.css').read_text()+'</style>')
H=H.replace('<script src="../src/elsewhere14.js"></script>','<script>'+(R/'src/elsewhere14.js').read_text()+'</script>')
dst=Path(os.environ.get('ELSEWHERE_SCREENSHOT_DIR', str(Path(tempfile.gettempdir())/'elsewhere-iphone-previews')));dst.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('ELSEWHERE_BROWSER_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
 for label,w,h in [('iPhone-16',393,852),('iPhone-SE',320,568),('iPhone-Pro-Max',440,956),('iPhone-landscape',844,390)]:
  page=b.new_page(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,reduced_motion='reduce',device_scale_factor=2)
  page.evaluate('''() => { const db={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db[k]??null,setItem:(k,v)=>db[k]=v}}) }''')
  page.set_content(H);page.wait_for_selector('#e14Workspace')
  page.evaluate('''()=>{const x=ElsewhereV13State.runtime.state;x.projects.push({id:'p2',name:'Quiet Harbor stories',artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]});x.projects[0].scratchpads.push({scopeId:null,text:'The sea goes quiet when the courier reaches the wall.'});window.dispatchEvent(new Event('elsewhere:prompt'))}''')
  page.wait_for_function('!document.querySelector("#e14ResumeSaved").hidden')
  page.locator('#e14ReadSettings summary').click()
  page.locator('#e14Read-large').click()
  page.locator('#e14Answer').fill('On the edge of Quiet Harbor, the courier finds a message left long before she was born.');page.locator('#e14Answer').blur()
  page.locator('#e14Workspace').scroll_into_view_if_needed()
  page.screenshot(path=str(dst/(label+'.png')),full_page=False)
  print(label, 'font',page.locator('#e14Answer').evaluate('(e)=>getComputedStyle(e).fontSize'),'document width',page.evaluate('document.documentElement.scrollWidth'))
  page.close()
 b.close()
