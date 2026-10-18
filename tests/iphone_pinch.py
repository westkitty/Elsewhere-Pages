"""Real Chromium touch events verify multi-finger Atlas viewport transforms, no saved layout mutation."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'tests/fixture.html').read_text().replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(R/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+(R/'src/elsewhere14.js').read_text()+'</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('ELSEWHERE_BROWSER_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':393,'height':852},device_scale_factor=3,is_mobile=True,has_touch=True)
 page.set_default_timeout(10000);page.set_content(s)
 page.get_by_role('tab',name='Atlas').click()
 svg=page.locator('#e14Graph svg');svg.scroll_into_view_if_needed()
 page.wait_for_timeout(200)
 box=svg.bounding_box();print('box',box,flush=True)
 assert box and box['height']>200
 before=page.locator('#e14Graph .e14-graph-layer').get_attribute('transform')
 store_before=page.evaluate('''() => JSON.stringify(ElsewhereV13State.runtime.state.projects[0].atlasPositions||{})''')
 # Gesture begins on bare SVG background; all coordinates must land inside the visible graph.
 x,y=box['x'],box['y'];width,height=box['width'],box['height']
 a={'x':round(x+width*.19),'y':round(y+height*.30),'id':1}
 b={'x':round(x+width*.80),'y':round(y+height*.65),'id':2}
 cdp=page.context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[a,b]})
 page.wait_for_timeout(60)
 for factor in (1.06,1.16,1.23):
  center=(a['x']+b['x'])/2,(a['y']+b['y'])/2
  touch=[]
  for item in (a,b):
   touch.append({'x':round(center[0]+(item['x']-center[0])*factor),'y':round(center[1]+(item['y']-center[1])*factor),'id':item['id']})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':touch})
  page.wait_for_timeout(50)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 after=page.locator('#e14Graph .e14-graph-layer').get_attribute('transform')
 store_after=page.evaluate('''() => JSON.stringify(ElsewhereV13State.runtime.state.projects[0].atlasPositions||{})''')
 print('before',before,'after',after,'stored',store_after,flush=True)
 assert before!=after,(before,after)
 assert store_before==store_after,(store_before,store_after)
 browser.close()
print('PINCH PASS: real multi-touch zoom changes camera, leaves project records unchanged')
