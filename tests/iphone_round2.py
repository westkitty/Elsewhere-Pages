"""Second iPhone usability pass: direct simulated touch flows and preserved editing state.
No original-page or physical-Safari assertions are made by this fixture test.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'tests/fixture.html').read_text()
html=html.replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(ROOT/'src/elsewhere14.css').read_text()+'</style>')
html=html.replace('<script src="../src/elsewhere14.js"></script>','<script>'+(ROOT/'src/elsewhere14.js').read_text()+'</script>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('ELSEWHERE_BROWSER_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
    for name, width, height in [('compact',320,568),('small',375,812),('iPhone',393,852),('large',440,956),('landscape',844,390)]:
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce')
        page.set_default_timeout(7000)
        errs=[]
        page.on('pageerror',lambda error:errs.append(str(error)))
        page.evaluate('''() => {
          const saved={};
          Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v}});
          const drafts={};
          Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>drafts[k]??null,setItem:(k,v)=>drafts[k]=v}});
          window.clipboardWrites=[];window.shareRequests=[];
          Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>window.clipboardWrites.push(t)}});
          Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shareRequests.push(data)}});
        }''')
        page.set_content(html)
        page.wait_for_selector('#e14Workspace')
        page.evaluate('''() => {
          const st=ElsewhereV13State.runtime.state;
          st.projects.push({id:'p2',name:'Second phone project',artifacts:[],facts:[],relationships:[],scratchpads:[],prompts:[],timeline:[]});
          window.dispatchEvent(new Event('elsewhere:prompt'));
        }''')
        page.wait_for_function("document.querySelector('#e14ProjectSelect option[value=\"p2\"]')!==null")
        assert page.locator('#e14ProjectSelect').is_visible(), name
        assert page.locator('#e14ProjectSelect').input_value()=='p1', name
        assert page.locator('#e14ReadSettings').is_visible(), name
        # User-selectable reading sizes must really affect the focused textarea.
        page.locator('#e14ReadSettings summary').click()
        page.get_by_role('button',name='Extra large').click()
        assert page.locator('#e14Workspace').get_attribute('data-read-size')=='extra', name
        size=page.locator('#e14Answer').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')
        assert size>=20,(name,size)
        assert page.get_by_role('button',name='Extra large').get_attribute('aria-pressed')=='true'
        assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=width+1, name
        page.get_by_role('button',name='Comfortable').click()
        assert page.locator('#e14Answer').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')>=17,name
        # Durable draft is discoverable without expanding advanced tools.
        page.locator('#e14Answer').fill('An unfinished story with a saved place to return.')
        page.get_by_role('button',name='Done editing').click()
        page.get_by_role('button',name='Save draft').click()
        assert page.locator('#e14ResumeSaved').is_visible(), name
        # Protect unsaved work while switching projects.
        page.locator('#e14Answer').fill('Continue writing without losing these words.')
        page.locator('#e14ProjectSelect').select_option('p2')
        assert page.locator('#e14ProjectSelect').input_value()=='p2'
        assert page.locator('#e14Answer').input_value()==''
        page.wait_for_timeout(120)
        print('picker state',page.evaluate("({active:document.activeElement?.id,html:document.documentElement.className,dock:getComputedStyle(document.getElementById('e14Tabs')).visibility})"),flush=True)
        assert page.locator('#e14Tabs').is_visible(), (name,'Dock hidden after project picker')
        page.locator('#e14ProjectSelect').select_option('p1')
        assert page.locator('#e14Recover').is_visible(),name
        page.get_by_role('button',name='Recover unsaved writing',exact=False).click()
        assert page.locator('#e14Answer').input_value()=='Continue writing without losing these words.',name
        page.get_by_role('button',name='Done editing').click()
        # Deliberate copying/sharing; no implicit upload.
        page.locator('#e14WritingMore summary').click()
        page.get_by_role('button',name='Copy writing').click()
        page.wait_for_function('window.clipboardWrites.length===1')
        assert page.evaluate('window.clipboardWrites[0]')=='Continue writing without losing these words.'
        page.get_by_role('button',name='Share writing (unencrypted)').click()
        page.wait_for_function('window.shareRequests.length===1')
        assert page.evaluate('window.shareRequests[0].text')=='Continue writing without losing these words.'
        # Switching out and back remembers the user's place in Library.
        if page.locator('#e14DismissKeyboard').is_visible():page.get_by_role('button',name='Done editing').click()
        page.get_by_role('tab',name='Library').click()
        page.evaluate('''() => {
          const p=ElsewhereV13State.runtime.state.projects[0];
          p.artifacts=Array.from({length:64},(_,i)=>({id:'a'+i,type:'note',name:'Thought '+i,summary:'Thought in the library '+i,createdAt:i}));
        }''')
        page.get_by_role('tab',name='Write').click()
        page.get_by_role('tab',name='Library').click()
        page.evaluate('window.scrollTo({top:document.documentElement.scrollHeight/2,behavior:"instant"})')
        page.wait_for_timeout(100)
        before=page.evaluate('scrollY')
        page.get_by_role('tab',name='Write').click()
        page.get_by_role('tab',name='Library').click()
        page.wait_for_timeout(100)
        after=page.evaluate('scrollY')
        assert before>50 and abs(before-after)<=160,(name,before,after)
        assert not errs,(name,errs)
        print(name,'PASS - project switching, draft, copy/share, large text, view memory',flush=True)
        page.close()
    browser.close()
print('IPHONE SECOND-PASS BROWSER TESTS PASS')
