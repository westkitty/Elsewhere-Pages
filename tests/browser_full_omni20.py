#!/usr/bin/env python3
"""Real standalone Elsewhere smoke after OMNI20 integration.
Runs only against the assembled checkout on loopback; uses fresh ephemeral browser state.
No external service and no personal browser profile/data.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
assert (ROOT / 'index.html').is_file(), 'Missing assembled index.html'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width, height in [(1280, 800), (390, 844)]:
            context = browser.new_context(viewport={'width':width, 'height':height}, service_workers='block')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin, wait_until='domcontentloaded', timeout=30000)
            assert page.locator('#elsewhereGate').is_visible(), f'{width}: lock not visible on new profile'
            assert page.evaluate('document.documentElement.classList.contains("elsewhere-locked")'), f'{width}: lock class missing'
            assert page.evaluate('!window.ElsewhereOmni20'), f'{width}: new adapter executed before unlock'
            page.locator('#elsewhereGatePassword').fill('Dexter')
            page.locator('#elsewhereGateSubmit').click()
            page.wait_for_function('window.ElsewhereOmni20?.initialized===true', timeout=30000)
            assert not page.evaluate('document.documentElement.classList.contains("elsewhere-locked")'), f'{width}: unlock failed'
            assert page.locator('#om20Nav [data-omni20-view]').count()==4, f'{width}: missing destinations'
            assert page.evaluate('!!window.Elsewhere14?.initialized'), f'{width}: v14 unavailable'
            assert page.evaluate('!!window.ElsewhereArrival'), f'{width}: Arrival lost'
            assert page.evaluate('!!window.ElsewhereInfinite'), f'{width}: Infinite Door lost'
            page.locator('#om20Nav [data-omni20-view="write"]').click()
            assert page.locator('#e14Panel-write').is_visible(), f'{width}: writer hidden'
            answer = page.locator('#e14Answer')
            answer.fill('OMNI20 combined-app draft preservation smoke.')
            answer.blur()
            page.wait_for_function("!document.documentElement.classList.contains('e14-keyboard-open')")
            page.locator('#om20Nav [data-omni20-view="atlas"]').click()
            assert page.locator('#e14Panel-atlas').is_visible(), f'{width}: Atlas hidden'
            page.locator('#om20Nav [data-omni20-view="library"]').click()
            assert page.locator('#e14Panel-library').is_visible(), f'{width}: Library hidden'
            page.locator('#om20Nav [data-omni20-view="write"]').click()
            assert answer.input_value() == 'OMNI20 combined-app draft preservation smoke.', f'{width}: draft lost'
            assert page.locator('#om20ToolsButton').is_visible(), f'{width}: All tools hidden'
            page.locator('#om20ToolsButton').click()
            assert page.locator('#om20CommandDialog').evaluate('(node)=>node.open'), f'{width}: command menu failed'
            page.locator('#om20CommandDialog .omni20-command-close').click()
            assert not page.locator('#om20CommandDialog').evaluate('(node)=>node.open'), f'{width}: command menu failed to close'
            assert not errors, f'{width}: JavaScript errors {errors[:3]}'
            print(f'PASS {width}x{height}: gated boot, legacy/v14/Arrival/Infinite, 4 tabs, draft retention, tools, zero JS errors')
            context.close()
        browser.close()
finally:
    server.shutdown()
