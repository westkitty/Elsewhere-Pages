#!/usr/bin/env python3
"""Fresh-profile Chromium acceptance for daily greetings in the assembled Elsewhere app.

Runs on localhost with synthetic names/dates only; never reads a human's profile.
The device/Safari/PWA offline acceptance gate remains separate.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'


def verify(browser, width, height):
    context = browser.new_context(
        viewport={'width': width, 'height': height},
        service_workers='block',
        reduced_motion='reduce',
    )
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    outbound = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: outbound.append(request.url) if not request.url.startswith(origin) else None)
    page.goto(origin, wait_until='domcontentloaded', timeout=30000)
    assert page.locator('#elsewhereGate').is_visible(), 'Dexter entrance missing'
    assert page.evaluate('typeof window.ElsewhereGreeting === "undefined"'), 'greeting leaked before unlock'

    page.locator('#elsewhereGatePassword').fill('Dexter')
    page.locator('#elsewhereGateSubmit').click()
    page.wait_for_function(
        'window.ElsewhereArrival && window.ElsewhereGreeting && window.ElsewhereOmni20?.initialized===true',
        timeout=30000,
    )
    assert page.locator('#e15Welcome').is_visible(), 'first visit bypassed Arrival'
    assert page.locator('#e15Greeting').is_visible(), 'daily greeting missing'
    date_now = page.evaluate('window.ElsewhereGreeting.dayKey(new Date())')
    greeting_text = page.locator('#e15GreetingText').inner_text()
    assert greeting_text == page.evaluate(
        'window.ElsewhereGreeting.generate(new Date()).text'
    ), 'rendered greeting disagrees with current device date'
    assert page.locator('#e15WelcomeTitle').inner_text() == 'How are you doing today?'

    # Settings form is opened through the existing settings dialog. OMNI20's
    # navigation and command launcher are covered by browser_full_omni20.py.
    page.evaluate("document.getElementById('settingsDialog').showModal()")
    settings = page.locator('.e15-greeting-settings')
    settings.locator('summary').click()
    page.locator('#e15GreetingYourName').fill('Andrew')
    page.locator('#e15GreetingYourName').press('Tab')
    page.locator('#e15GreetingPersonName').fill('Greyson')
    page.locator('#e15GreetingPersonName').press('Tab')
    page.locator('#e15GreetingPersonEnabled').check()

    page.locator('#e15GreetingDate').fill(date_now)
    page.locator('#e15GreetingDateLabel').fill('Our test-day milestone')
    page.locator('#e15GreetingDateLabel').press('Tab')
    settings.get_by_role('button', name='Add date').click()
    assert 'Our test-day milestone' in page.locator('#e15GreetingText').inner_text()
    record = page.evaluate("JSON.parse(localStorage.getItem('elsewhere:greeting:v1'))")
    assert record['profile']['yourName'] == 'Andrew'
    assert record['profile']['personName'] == 'Greyson'
    assert record['profile']['mentionPerson'] is True
    assert record['profile']['dates'][0]['date'] == date_now
    assert record['profile']['dates'][0]['label'] == 'Our test-day milestone'
    assert 'writing' not in record
    assert page.locator('#e15GreetingDates .e15-greeting-date-row').count() == 1

    page.evaluate("document.getElementById('settingsDialog').close()")
    page.locator('#e15Welcome').get_by_role('button', name='Take it easy').click()
    assert page.locator('#e15Welcome').is_hidden()
    assert page.locator('#e15Greeting').is_hidden(), 'daily hello should yield to active work'
    page.locator('#om20Nav [data-omni20-view="write"]').click()
    editor = page.locator('#e14Answer')
    editor.fill('A private unsaved test draft. No greeting may replace it.')
    editor.blur()

    page.reload(wait_until='domcontentloaded')
    assert page.locator('#elsewhereGate').is_visible(), 'reload must restore Dexter lock'
    page.locator('#elsewhereGatePassword').fill('Dexter')
    page.locator('#elsewhereGateSubmit').click()
    page.wait_for_function('window.ElsewhereOmni20?.initialized === true', timeout=30000)
    assert page.locator('#e15Welcome').is_hidden(), 'daily Arrival should not be forced twice'
    assert page.locator('#e15Greeting').is_visible(), 'daily hello should be available on reopening'
    assert 'Our test-day milestone' in page.locator('#e15GreetingText').inner_text()
    assert page.evaluate(
        "JSON.parse(localStorage.getItem('elsewhere:greeting:v1')).profile.personName"
    ) == 'Greyson'

    page.evaluate("document.getElementById('settingsDialog').showModal()")
    settings.locator('summary').click()
    page.once('dialog', lambda dialog: dialog.accept())
    settings.get_by_role('button', name='Erase greeting personalization').click()
    wiped = page.evaluate("JSON.parse(localStorage.getItem('elsewhere:greeting:v1'))")
    assert wiped['profile']['personName'] == ''
    assert wiped['profile']['dates'] == []
    assert page.evaluate("localStorage.getItem('elsewhere:arrival:v1')") is not None
    assert 'Our test-day milestone' not in page.locator('#e15GreetingText').inner_text()

    page.locator('#e15SettingCheckin').select_option('off')
    page.locator('#e15GreetingEnabled').uncheck()
    assert page.locator('#e15Greeting').is_hidden()
    page.evaluate("document.getElementById('settingsDialog').close()")
    page.reload(wait_until='domcontentloaded')
    assert page.locator('#elsewhereGate').is_visible(), 'reload must restore Dexter lock'
    page.locator('#elsewhereGatePassword').fill('Dexter')
    page.locator('#elsewhereGateSubmit').click()
    page.wait_for_function('window.ElsewhereOmni20?.initialized === true', timeout=30000)
    assert page.locator('#e15Welcome').is_hidden(), 'disabled check-in should stay off'
    assert page.locator('#e15Greeting').is_hidden(), 'disabled hello should remain off'
    if width < 700:
        assert page.evaluate(
            'document.documentElement.scrollWidth <= window.innerWidth + 5'
        ), 'mobile horizontal overflow'
    assert not errors, f'uncaught JS errors: {errors[:4]}'
    assert not outbound, f'unexpected remote requests: {outbound[:4]}'
    print(f'PASS {width}x{height}: unlock, time correctness, names and dates, skip, persistence, erase, disable, privacy, zero JS errors')
    context.close()


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for viewport in [(1280, 800), (390, 844)]:
            verify(browser, *viewport)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
