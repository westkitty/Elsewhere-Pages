"""Synthetic Chromium regression checks for retry-safe writing and large-project library."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'tests/fixture.html').read_text().replace('<link rel="stylesheet" href="../src/elsewhere14.css">','<style>'+(R/'src/elsewhere14.css').read_text()+'</style>').replace('<script src="../src/elsewhere14.js"></script>','<script>'+(R/'src/elsewhere14.js').read_text()+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1100,'height':850},reduced_motion='reduce')
 page.set_content(s);page.wait_for_selector('#e14Workspace')
 page.evaluate("""() => {
   const api=window.ElsewhereV13State, original=api.flushDirty;
   window.failOnce=true;
   api.flushDirty=function(){if(window.failOnce){window.failOnce=false;return {persistent:false,failed:['quota']}}return original.apply(this,arguments)};
 }""")
 page.locator('#e14Answer').fill('Proof of temporary state when the browser is full.')
 page.get_by_role('button',name='Save response',exact=True).click()
 assert page.locator('#e14Answer').input_value().startswith('Proof of temporary')
 assert page.evaluate('window.createCalls')==1
 assert 'retry' in page.locator('#e14Status').inner_text().lower()
 page.get_by_role('button',name='Save response',exact=True).click()
 assert page.evaluate('window.createCalls')==1, 'retry must not duplicate artifact'
 assert page.locator('#e14Answer').input_value()==''
 page.evaluate("""() => {
  const p=window.ElsewhereV13State.runtime.state.projects[0];
  p.artifacts=Array.from({length:105},(_,i)=>({id:'art'+i,name:'Archive '+String(i).padStart(3,'0'),type:i%2?'scene':'place',summary:'Composed records',createdAt:i+1}));
 }""")
 page.get_by_role('tab',name='Library',exact=True).click()
 assert page.locator('#e14Cards .e14-artifact').count()==24
 assert 'page 1 of 5' in page.locator('#e14LibraryCount').inner_text()
 assert 'Archive 104' in page.locator('#e14Cards .e14-artifact').first.inner_text()
 page.get_by_role('button',name='Next page',exact=True).click()
 assert 'page 2 of 5' in page.locator('#e14LibraryCount').inner_text()
 page.locator('#e14LibrarySort').select_option('name')
 assert 'page 1 of 5' in page.locator('#e14LibraryCount').inner_text()
 assert 'Archive 000' in page.locator('#e14Cards .e14-artifact').first.inner_text()
 page.locator('#e14Search').fill('Archive 099')
 page.wait_for_function('document.querySelectorAll("#e14Cards .e14-artifact").length === 1')
 assert 'page 1 of 1' in page.locator('#e14LibraryCount').inner_text()
 assert page.locator('#e14LibraryNext').is_disabled()
 assert page.evaluate('window.appErrors')==[]
 print('X5 WRITER & LIBRARY PASS: failed write retry dedupes, 105-artifact pagination, sort, search reset')
 b.close()
