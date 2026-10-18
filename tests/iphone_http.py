"""Secure-origin Chromium mobile integration: HTTP reload, encrypted vault, cross-tab warning."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
import os,json
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/tests/fixture.html'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('ELSEWHERE_BROWSER_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  ctx=browser.new_context(viewport={'width':393,'height':852},device_scale_factor=3,is_mobile=True,has_touch=True,accept_downloads=True)
  first=ctx.new_page();first.goto(url);first.wait_for_selector('#e14Workspace');first.set_default_timeout(10000)
  assert first.evaluate('window.isSecureContext===true && !!crypto.subtle')
  first.locator('#e14Answer').fill('A private unfinished note for reload recovery.')
  first.wait_for_timeout(550)
  assert first.locator('#e14Recover').is_visible()
  first.reload();first.wait_for_selector('#e14Workspace')
  assert first.locator('#e14Recover').is_visible(),'session draft should survive same-origin reload'
  first.get_by_role('button',name='Recover unsaved writing').click()
  assert 'private unfinished note' in first.locator('#e14Answer').input_value()
  first.get_by_role('button',name='Done editing').click()
  first.get_by_role('tab',name='Vault').click()
  secret='test-only-independent-passphrase-2026'
  first.locator('#e14VaultPass').fill(secret)
  first.locator('#e14VaultVerify').fill(secret)
  first.get_by_role('button',name='Done editing').click()
  with first.expect_download() as d:
   first.get_by_role('button',name='Encrypted backup').click()
  download=d.value
  assert download.suggested_filename=='Elsewhere-Encrypted-Vault.json'
  payload=json.loads(Path(download.path()).read_text())
  assert payload['cipher']=='AES-256-GCM' and payload['type']=='encrypted-universe'
  assert 'A private unfinished note' not in json.dumps(payload)
  result=first.evaluate('''async ({data,password})=>await Elsewhere14.unseal(data,password)''',{'data':payload,'password':secret})
  assert result['state']['projects'][0]['name']=='A world'
  assert first.locator('#e14VaultPass').input_value()==''
  # Browser-native same-origin storage notification pauses the stale tab.
  other=ctx.new_page();other.goto(url);other.wait_for_selector('#e14Workspace')
  other.evaluate("localStorage.setItem('elsewhere:v13:core','external-tab-change')")
  first.locator('#e14Conflict').wait_for(state='visible',timeout=5000)
  assert 'paused' in first.locator('#e14Conflict').inner_text()
  other.close();browser.close()
 print('IPHONE HTTP PASS: secure-origin AES-GCM vault, same-origin draft reload, and cross-tab conflict dialog')
finally:server.shutdown();server.server_close()
