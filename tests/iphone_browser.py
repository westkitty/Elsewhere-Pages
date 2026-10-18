"""iPhone-targeted browser contract for Elsewhere Living Atlas components (Chromium mobile emulation)."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import json

ROOT = Path(__file__).resolve().parents[1]
fixture = (ROOT / 'tests' / 'fixture.html').read_text()
html = fixture.replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(ROOT/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+(ROOT/'src/elsewhere14.js').read_text()+'</script>')
reports=[]

def report_layout(page,name):
    stats=page.evaluate('''() => ({
      viewport:innerWidth, documentWidth:document.documentElement.scrollWidth,
      dock:(()=>{let r=document.querySelector('#e14Tabs').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,height:r.height}})(),
      sizes:[...document.querySelectorAll('#e14Tabs button')].map(el=>Math.round(el.getBoundingClientRect().height)),
      cssFont:getComputedStyle(document.querySelector('#e14Answer')).fontSize,
      actionHeights:[...document.querySelectorAll('.e14-primary-actions button')].map(x=>Math.round(x.getBoundingClientRect().height))
    })''')
    assert stats['documentWidth'] <= stats['viewport']+1, (name,stats)
    assert stats['dock']['right'] <= stats['viewport']+1 and stats['dock']['left']>=-1, (name,stats)
    assert min(stats['sizes'])>=44,(name,stats)
    assert min(stats['actionHeights'])>=44,(name,stats)
    assert float(stats['cssFont'].replace('px','')) >= 16,(name,stats)
    reports.append((name,stats))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path=os.environ.get('ELSEWHERE_BROWSER_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
    for name,config in [('iPhone SE',{'width':320,'height':568}),('iPhone 13 mini',{'width':375,'height':812}),('iPhone 16',{'width':393,'height':852}),('iPhone 16 Pro Max',{'width':440,'height':956}),('iPhone landscape',{'width':844,'height':390})]:
        page=browser.new_page(viewport=config,device_scale_factor=3,is_mobile=True,has_touch=True,accept_downloads=True,reduced_motion='reduce')
        print('START',name,flush=True)
        page.set_default_timeout(6000)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.evaluate('''() => {
          const data={};Object.defineProperty(window,'sessionStorage',{configurable:true,value:{
            getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]
          }});
        }''')
        page.set_content(html)
        page.wait_for_selector('#e14Workspace')
        report_layout(page,name)
        print('layout',name,flush=True)
        assert page.locator('#e14Panel-write').is_visible()
        tabs=page.get_by_role('tab')
        assert tabs.count()==4,(name,tabs.count())
        assert page.locator('#e14WritingMore').is_visible()
        assert page.locator('#e14WritingMore').get_attribute('open') is None
        assert page.locator('#e14ArtifactType').is_hidden()
        page.locator('#e14WritingMore summary').click()
        assert page.locator('#e14ArtifactType').is_visible()
        assert page.locator('#e14Answer').get_attribute('autocapitalize')=='sentences'
        page.locator('#e14Answer').fill('This is an iPhone draft that must survive a tab change.')
        page.wait_for_timeout(550)
        assert 'recovery copy' in page.locator('#e14DraftState').inner_text().lower()
        print('draft',name,flush=True)
        page.get_by_role('button',name='Done editing').click()
        print('done',name,flush=True)
        page.get_by_role('tab',name='Library').click()
        assert page.get_by_role('tabpanel',name='Library').is_visible()
        assert page.locator('#e14Answer').input_value().startswith('This is an iPhone draft')
        print('library',name,flush=True)
        page.get_by_role('tab',name='Atlas').click()
        assert page.locator('#e14Directory').is_visible()
        assert page.locator('#e14Graph').is_visible()
        assert page.locator('#e14Directory summary').inner_text().startswith('Browse as list')
        page.locator('#e14Directory summary').click()
        assert page.locator('#e14Directory .e14-directory-list button').count()==2
        page.locator('#e14Directory .e14-directory-list button').first.click()
        assert page.locator('#e14GraphDetail').inner_text()
        assert errors==[],(name,errors)
        if name=='iPhone 16':
            page.get_by_role('tab',name='Write').click()
            page.locator('#e14Answer').focus()
            assert page.locator('html').get_attribute('class') and 'e14-keyboard-open' in page.locator('html').get_attribute('class')
            assert page.locator('#e14DismissKeyboard').is_visible()
            page.get_by_role('button',name='Done editing').click()
            assert 'e14-keyboard-open' not in (page.locator('html').get_attribute('class') or '')
            page.get_by_role('tab',name='Library').click()
            page.evaluate('''() => {let p=ElsewhereV13State.runtime.state.projects[0];p.artifacts=Array.from({length:32},(_,i)=>({id:'new-art-'+i,type:'note',name:'Note '+i,summary:'Some writing',createdAt:i}))}''')
            page.locator('#e14Search').fill('')
            page.get_by_role('button',name='Done editing').click()
            page.get_by_role('tab',name='Atlas').click()
            page.get_by_role('tab',name='Library').click()
            assert page.locator('#e14Cards .e14-artifact').count()==8
            assert '32 artifacts' in page.locator('#e14LibraryCount').inner_text()
            page.get_by_role('button',name='Next page').click()
            assert 'page 2' in page.locator('#e14LibraryCount').inner_text()
            assert 'recovery copy' in page.locator('#e14DraftState').inner_text().lower()
            page.get_by_role('tab',name='Write').click()
            page.get_by_role('button',name='Save draft').click()
            assert 'Draft saved' in page.locator('#e14WriterStatus').inner_text()
            assert 'No unsaved changes' in page.locator('#e14DraftState').inner_text()
        shot=ROOT / 'tests' / ('iphone-'+name.lower().replace(' ','-')+'.png')
        if name in ('iPhone SE','iPhone 16','iPhone landscape'):
            page.screenshot(path=str(shot),full_page=False)
        page.close()
    # Camera math stays anchored and zoom bounded even with shifted center.
    page=browser.new_page();page.set_content(html)
    data=page.evaluate('''() => {
      const anchor={distance:100,zoom:1,anchor:{x:20,y:-12}};
      return [Elsewhere14.cameraFromPinch(anchor,{x:200,y:250},{x:400,y:250}),
              Elsewhere14.cameraFromPinch(anchor,{x:50,y:50},{x:100000,y:50})];
    }''')
    assert data[0]['zoom']==2 and data[1]['zoom']==3,data
    browser.close()
for name,stats in reports:print(name,json.dumps(stats))
print('IPHONE BROWSER PASS: five iPhone form-factors, dock geometry, touch actions, draft recovery, atlas list, and camera math')
