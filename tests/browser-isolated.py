# Isolated DOM smoke test: no network access and no chain access.
# The real Node HTTP server is tested separately by tests/server.test.mjs.
import asyncio,json,re,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'
OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1536,'height':1100},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(ROOT/'index.html').read_text();html=re.sub(r'<link[^>]*>','',html);html=re.sub(r'<script[^>]*>.*?</script>','',html)
  html=html.replace('</head>','<style>'+(ROOT/'style.css').read_text()+'</style></head>')
  await page.set_content(html)
  await page.expose_function('testSHA',lambda arr:list(hashlib.sha256(bytes(arr)).digest()))
  await page.evaluate('''() => {
    const map=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}});
    if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(alg,bytes)=>new Uint8Array(await testSHA(Array.from(bytes))).buffer}});
    if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>[...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('')});
  }''')
  graph=json.loads((ROOT/'data/circuit.json').read_text());config=json.loads((ROOT/'public/config.json').read_text())
  await page.evaluate('''({graph,config})=>{
    const blobs=new Map();window.fetch=async(input,init={})=>{
      const u=String(input);
      if(u==='/data/circuit.json')return new Response(JSON.stringify(graph));
      if(u==='/public/config.json')return new Response(JSON.stringify(config));
      if(u==='/api/checkpoints'){
        const bytes=new TextEncoder().encode(init.body),sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
        const uri='https://isolated-test.invalid/checkpoints/'+sha256+'.json';blobs.set(uri,init.body);return new Response(JSON.stringify({uri,sha256,bytes:bytes.length}),{status:201});
      }
      if(blobs.has(u))return new Response(blobs.get(u));
      throw new Error('No network access in isolated browser test: '+u);
    };
  }''',{'graph':graph,'config':config})
  files={str(f.relative_to(ROOT)):f.read_text() for base in ['src','vendor/web3'] for f in (ROOT/base).rglob('*.mjs')}
  await page.evaluate(r'''async files=>{
    const cache={};function make(path){if(cache[path])return cache[path];let src=files[path];if(!src)throw new Error('Missing module '+path);
      src=src.replace(/from\s+(['"])(\.\.?\/[^'"]+)\1/g,(all,quote,rel)=>{const target=new URL(rel,'https://module.test/'+path).pathname.slice(1);return 'from '+quote+make(target)+quote;});
      return cache[path]=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
    }
    await import(make('src/app.mjs'));
  }''',files)
  await page.wait_for_selector('.agent-row')
  assert await page.locator('.agent-row').count()==3
  await page.wait_for_timeout(900)
  await page.locator('#pauseButton').click();await page.locator('#checkpointButton').click()
  await page.wait_for_function("document.getElementById('checkpointHash').textContent!=='Not published'")
  await page.wait_for_function("!document.getElementById('migrateButton').disabled")
  await page.locator('#migrateButton').click()
  await page.wait_for_function("document.getElementById('resumeProof').textContent.startsWith('Verified')")
  assert 'ARENA B' in await page.locator('#arenaLabel').inner_text()
  await page.wait_for_function("!document.getElementById('grantButton').disabled")
  await page.locator('#grantButton').click()
  await page.wait_for_function("document.getElementById('checkpointPermission').textContent.startsWith('Allowed')")
  await page.wait_for_function("!document.getElementById('actor').disabled")
  await page.locator('#actor').select_option('runtime');await page.locator('#checkpointButton').click()
  await page.wait_for_function("!document.getElementById('probeButton').disabled")
  await page.locator('#probeButton').click()
  await page.wait_for_function("document.getElementById('permissionResult').textContent.startsWith('Protected model write denied')")
  await page.wait_for_function("!document.getElementById('actor').disabled")
  await page.locator('#actor').select_option('owner');await page.locator('#revokeButton').click()
  await page.wait_for_function("document.getElementById('permissionResult').textContent.startsWith('Checkpoint writer revoked')")
  await page.wait_for_function("!document.getElementById('actor').disabled")
  await page.locator('#actor').select_option('runtime');await page.locator('#checkpointButton').click()
  await page.wait_for_function("document.getElementById('toast').textContent.includes('revoked')")
  await page.wait_for_function("!document.getElementById('actor').disabled")
  await page.locator('#actor').select_option('owner');await page.locator('#aliasButton').click()
  await page.wait_for_function("document.getElementById('aliasResult').textContent.startsWith('live.')")
  await page.wait_for_function("!document.querySelector('#resumeForm button').disabled")
  await page.locator('#resumeForm button').click()
  await page.wait_for_function("!document.getElementById('agentLabel').disabled")
  await page.locator('#arenaA').click();await page.locator('#agentLabel').fill('yuki');await page.locator('#hatchForm button').click()
  await page.wait_for_function("document.querySelectorAll('.agent-row').length===4")
  await page.wait_for_function("!document.getElementById('checkpointButton').disabled")
  await page.locator('#checkpointButton').click()
  await page.wait_for_function("document.getElementById('checkpointHash').textContent!=='Not published'")
  await page.wait_for_function("!document.getElementById('checkpointButton').disabled")
  await page.evaluate("document.getElementById('toast').hidden=true; window.scrollTo(0,0)")
  await page.screenshot(path=str(OUT/'preview.png'),full_page=True)
  assert not errors,errors
  await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(250)
  overflow=await page.evaluate('document.documentElement.scrollWidth>window.innerWidth')
  await page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
  result={'environment':'Isolated Chromium DOM with in-memory fetch adapter; real HTTP tested independently','uncaughtErrors':errors,'initialAgents':3,'afterHatch':4,'checkpointAndMigration':True,'grantRevoke':True,'forbiddenProbe':True,'aliasResume':True,'mobileOverflow':overflow,'resumeProof':await page.locator('#resumeProof').inner_text()}
  (OUT/'browser-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
  await browser.close()
asyncio.run(main())
