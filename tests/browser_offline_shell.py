#!/usr/bin/env python3
"""Offline first-run and recovery proof for the assembled Elsewhere standalone PWA.

Fresh Chromium profile, loopback HTTP secure context, real service worker, synthetic
project/writing only. This does not claim physical Safari or installed-PWA parity.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
assert (ROOT / 'index.html').is_file(), 'Standalone HTML missing'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'
saved_text = 'Synthetic offline release proof: a saved artifact that must survive disconnected reopening.'
draft_text = 'Synthetic offline release proof: unfinished writing that must be recovered explicitly.'


def unlock(page):
    page.locator('#elsewhereGate').wait_for(state='visible')
    assert page.evaluate('typeof window.Elsewhere14 === "undefined"'), 'application ran before Dexter unlock'
    page.locator('#elsewhereGatePassword').fill('Dexter')
    page.locator('#elsewhereGateSubmit').click()
    page.wait_for_function(
        'window.Elsewhere14?.initialized && window.ElsewhereArrival && window.ElsewhereOmni20?.initialized',
        timeout=30000,
    )


def active_project(page):
    return page.evaluate("""() => {
      const state=window.ElsewhereV13State?.runtime?.state;
      return state?.projects?.find(p=>p.id===state.activeProjectId)?.id||null;
    }""")


def artifacts(page, project_id):
    return page.evaluate("""(id) => {
      const project=window.ElsewhereV13State?.runtime?.state?.projects.find(p=>p.id===id);
      return (project?.artifacts||[]).map(a=>({id:a.id,content:a.meta?.content||''}));
    }""", project_id)


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            reduced_motion='reduce',
            service_workers='allow',
        )
        page = context.new_page()
        page.set_default_timeout(15000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin, wait_until='domcontentloaded', timeout=30000)
        unlock(page)
        page.wait_for_function("navigator.serviceWorker?.controller !== null", timeout=30000)
        cache_report = page.evaluate("""async () => {
          const registration=await navigator.serviceWorker.ready;
          const names=await caches.keys();
          const expected='elsewhere-public-shell-v17-arrival-greeting';
          const assets=await caches.open(expected);
          const entries=await assets.keys();
          const urls=entries.map(e=>new URL(e.url).pathname);
          return {active:registration.active?.state, names, urls};
        }""")
        assert cache_report['active']=='activated', f"service worker not active: {cache_report}"
        assert 'elsewhere-public-shell-v17-arrival-greeting' in cache_report['names'], 'new app version was not precached'
        assert len(cache_report['urls'])==6, f"unexpected cache entries: {cache_report['urls']}"
        assert all(url.endswith(('/','/index.html','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png')) for url in cache_report['urls'])

        project_id = active_project(page)
        if not project_id:
            page.locator('#om20ToolsButton').click()
            page.locator('#om20CommandInput').fill('Create project')
            page.locator('#om20CommandList .omni20-command-row').filter(has_text='Create project').click()
            page.locator('#projectNameInput').fill('Synthetic offline project')
            page.locator('#projectSaveBtn').click()
            if page.locator('#projectIgnitionDialog').evaluate('(el) => el.open'):
                page.locator('#ignitionCancel').click()
            project_id = active_project(page)
        assert project_id, 'unable to establish test project'

        page.locator('#om20Nav [data-omni20-view="write"]').click()
        editor = page.locator('#e14Answer')
        editor.fill(saved_text)
        page.get_by_role('button', name='Save response', exact=True).click()
        saved = next((a for a in artifacts(page, project_id) if a['content']==saved_text), None)
        assert saved, 'synthetic writing was not saved locally before disconnect'
        assert editor.input_value() == '', 'successful save did not clear the editor'
        editor.fill(draft_text)
        editor.blur()
        page.wait_for_function(
            "sessionStorage.getItem('elsewhere:v14:session-drafts')?.includes('Synthetic offline release proof: unfinished writing')",
            timeout=15000,
        )

        context.set_offline(True)
        page.goto(origin+'index.html', wait_until='domcontentloaded', timeout=30000)
        assert page.locator('#elsewhereGate').is_visible(), 'cached HTML did not load while disconnected'
        unlock(page)
        assert page.evaluate('navigator.serviceWorker.controller !== null'), 'offline page lost service-worker controller'
        assert any(a['id']==saved['id'] and a['content']==saved_text for a in artifacts(page, project_id)), 'saved artifact missing after offline reopening'
        page.locator('#om20Nav [data-omni20-view="write"]').click()
        page.get_by_role('button', name='Recover unsaved writing').click()
        assert editor.input_value() == draft_text, 'session draft not recovered after offline reopen'
        assert page.locator('#om20Nav [data-omni20-view="atlas"]').count()==1, 'Atlas route missing offline'
        page.locator('#om20Nav [data-omni20-view="atlas"]').click()
        assert page.locator('#e14Panel-atlas').is_visible(), 'Atlas unavailable offline'
        page.locator('#om20Nav [data-omni20-view="library"]').click()
        assert page.locator('#e14Panel-library').is_visible(), 'Library unavailable offline'

        second = context.new_page()
        second.goto(origin, wait_until='domcontentloaded', timeout=30000)
        assert second.locator('#elsewhereGate').is_visible(), 'second disconnected navigation failed'
        second.close()

        cache_after = page.evaluate("""async () => {
          const keys=await caches.keys(), all=[];
          for(const name of keys)for(const req of await (await caches.open(name)).keys())all.push(req.url);
          return {keys, urls:all};
        }""")
        assert all('elsewhere-public-shell-' in key for key in cache_after['keys']), 'foreign private cache detected'
        assert len(cache_after['urls'])==6, 'non-shell content unexpectedly entered Cache Storage'
        assert saved_text not in str(cache_after) and draft_text not in str(cache_after), 'writing leaked to cache metadata'
        assert not errors, f"browser runtime errors: {errors[:5]}"
        context.set_offline(False)
        print('PASS: install/claim v17 SW, six public shell assets only, saved response, session draft, offline navigation/relock/recovery, Atlas/Library, reconnect, zero JS errors')
        context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
