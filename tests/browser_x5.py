"""Synthetic integration smoke: isolated fixture, not the production GitHub Pages site."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
fixture=(ROOT/'tests/fixture.html').read_text()
html=fixture.replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+ (ROOT/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+(ROOT/'src/elsewhere14.js').read_text()+'</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1400,'height':920},reduced_motion='reduce')
 page.set_content(html)
 page.wait_for_selector('#e14Workspace')
 page.get_by_role('tab',name='Atlas',exact=True).first.click()
 node=page.locator('#e14Graph .e14-node').first
 id=node.get_attribute('data-artifact-id')
 page.get_by_role('button',name='Arrange nodes: off').click()
 box=node.bounding_box()
 assert box is not None, 'node must be visible'
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
 page.mouse.down()
 page.mouse.move(box['x']+box['width']/2+70,box['y']+box['height']/2+30,steps=8)
 page.mouse.up()
 value=page.evaluate('(id) => window.ElsewhereV13State.runtime.state.projects[0].atlasPositions?.[id]',id)
 assert isinstance(value,dict) and value['x']!=0, f'node should have persisted coordinates, got {value}'
 page.get_by_role('button',name='Undo placement').click()
 undone=page.evaluate('(id) => window.ElsewhereV13State.runtime.state.projects[0].atlasPositions?.[id]',id)
 assert undone is None, f'Undo should remove custom position, got {undone}'
 page.get_by_role('button',name='Arrange nodes: on').click()
 assert page.locator('#e14Arrange').get_attribute('aria-pressed')=='false'
 page.get_by_role('button',name='Arrange nodes: off').click()
 page.locator('#e14Graph .e14-node').first.focus()
 page.keyboard.press('ArrowRight')
 keyboard=page.evaluate('(id) => window.ElsewhereV13State.runtime.state.projects[0].atlasPositions?.[id]',id)
 assert keyboard and keyboard['x']!=0, 'keyboard movement must persist custom position'
 page.once('dialog', lambda dialog: dialog.accept())
 page.get_by_role('button',name='Reset node layout').click()
 assert page.evaluate('Object.keys(window.ElsewhereV13State.runtime.state.projects[0].atlasPositions||{}).length')==0

 print('X5 ATLAS BROWSER PASS: pointer drag, keyboard move, undo, full layout reset, accessible toggle')
 browser.close()
