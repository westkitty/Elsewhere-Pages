from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
html=(ROOT/'tests/fixture.html').read_text().replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+ (ROOT/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>', '<script>'+ (ROOT/'src/elsewhere14.js').read_text()+'</script>')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1200,'height':820},reduced_motion='reduce')
  page.set_content(html)
  page.wait_for_selector('#e14Workspace')
  assert page.locator('#e14Prompt').inner_text().startswith('How does')
  assert page.locator('#e14Tab-write').get_attribute('aria-selected')=='true'
  page.locator('#e14Answer').fill('Mara has a secret route through Quiet Harbor.')
  page.get_by_role('button',name='Save response',exact=True).click()
  assert page.evaluate('window.createCalls') == 1
  assert page.locator('#e14Answer').input_value()==''
  page.get_by_role('tab',name='Library',exact=True).click()
  assert page.locator('#e14Cards .e14-artifact').count()==3
  page.get_by_role('tab',name='Atlas',exact=True).first.click()
  assert page.locator('#e14Graph .e14-node').count()==3
  assert page.locator('#e14Graph .e14-edge').count()==1
  page.get_by_role('button',name='Reset view').click()
  page.locator('#e14Time').fill('50')
  page.wait_for_function('document.querySelectorAll("#e14Graph .e14-node").length === 1')
  assert page.locator('#e14Graph .e14-node').count()==1
  page.get_by_role('tab',name='Write',exact=True).click()
  page.locator('#e14Answer').fill('Possibility is not canon.')
  page.get_by_role('button',name='Make possible fact').click()
  assert page.evaluate('window.ElsewhereV13State.runtime.state.projects[0].facts[0].status')=='possible'
  page.locator('#e14Answer').fill('Unfinished seed')
  page.get_by_role('button',name='Save draft').click()
  page.locator('#e14Answer').fill('')
  page.get_by_role('button',name='Resume draft').click()
  assert page.locator('#e14Answer').input_value()=='Unfinished seed'
  page.get_by_role('button',name='Follow-up questions').click()
  assert page.locator('#e14FollowUps button').count()==3
  page.get_by_role('tab',name='Vault',exact=True).click()
  assert 'origin' in page.locator('#e14PrivacyOrigin').inner_text().lower()
  assert page.evaluate('window.appErrors') == [],page.evaluate('window.appErrors')
  page.screenshot(path=str(ROOT/'tests/screenshot-desktop.png'),full_page=True)
  mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  mobile.set_content(html)
  mobile.wait_for_selector('#e14Workspace')
  assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 5')
  mobile.get_by_role('tab',name='Atlas',exact=True).first.click()
  assert mobile.locator('#e14Graph .e14-node').count()==2
  mobile.screenshot(path=str(ROOT/'tests/screenshot-mobile.png'),full_page=True)
  assert mobile.evaluate('window.appErrors') == []
  print('BROWSER PASS: create, search, atlas, timeline, draft, fact, followup, backup UI, mobile')
  browser.close()
finally:
 server.shutdown();server.server_close()
