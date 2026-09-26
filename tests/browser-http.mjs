// Real browser -> real Node HTTP -> actual temporary files. No fetch/RPC adapters.
// Identity/permissions deliberately remain LOCAL REHEARSAL, never chain evidence.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

const output = path.resolve('artifacts/browser-http');
await mkdir(output, {recursive:true});
const storageDir = await mkdtemp(path.join(tmpdir(), 'flyns-browser-'));
let server = createApp({storageDir}), browser;
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port, origin = `http://127.0.0.1:${port}`;
const errors = [], responses = [];
try {
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1536,height:1100}});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {if(response.url().includes('/api/checkpoints')) responses.push(response.status());});
  const idle = () => page.waitForFunction(() => !document.body.classList.contains('is-busy'));
  const click = async selector => {await page.locator(selector).click();await idle();};
  const text = id => page.locator('#'+id).innerText();
  const pointer = () => page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('flyns:local-registry:v1')).agents['ada.flyns.demo'].records['flyns.checkpoint']));
  await page.goto(origin);
  await page.waitForSelector('.agent-row');
  assert.equal(await page.locator('.agent-row').count(), 3);
  assert.equal(await text('modeBadge'), 'LOCAL REHEARSAL');
  assert.equal(await text('adaName'), 'ada.flyns.eth');
  assert.equal(await text('adaStatus'), '—');
  assert.equal(await page.locator('#adaWrite').isEnabled(), false);
  assert.equal(await page.locator('#adaGrant').isEnabled(), false);
  await page.waitForFunction(() => Number(document.getElementById('tick').textContent.replaceAll(',','')) > 5);
  await click('#pauseButton');
  await click('#checkpointButton');
  const first = await pointer();
  assert.equal(first.sequence, 1);
  const checkpointBytes = await (await fetch(first.uri)).text();
  assert.equal(await readFile(path.join(storageDir, first.sha256+'.json'),'utf8'), checkpointBytes);
  await click('#migrateButton');
  assert.match(await text('resumeProof'), /^Verified SHA-256/);
  assert.match(await text('arenaLabel'), /ARENA B/);
  assert.equal((await pointer()).sequence, 2);
  await click('#grantButton');
  await page.locator('#actor').selectOption('runtime');
  await click('#checkpointButton');
  const delegated = await pointer();
  assert.equal(delegated.sequence, 3);
  await click('#probeButton');
  assert.match(await text('permissionResult'), /^Protected model write denied/);
  // The same runtime must not update the independently permissioned Kibo.
  await click('.agent-row:has-text("kibo.flyns.demo")');
  const uploadsBeforeDenial = responses.length;
  await click('#checkpointButton');
  assert.match(await text('toast'), /LOCAL DENIAL/);
  assert.equal(responses.length, uploadsBeforeDenial);
  await click('.agent-row:has-text("ada.flyns.demo")');
  await page.locator('#actor').selectOption('owner');
  await click('#revokeButton');
  await page.locator('#actor').selectOption('runtime');
  await click('#checkpointButton');
  assert.match(await text('toast'), /revoked/);
  assert.deepEqual(await pointer(), delegated);
  assert.equal(responses.length, uploadsBeforeDenial);
  await page.locator('#actor').selectOption('owner');
  await click('#aliasButton');
  assert.equal(await text('aliasResult'), 'live.ada.flyns.demo');
  await click('#resumeForm button');
  assert.match(await text('resumeProof'), /sequence 3/);
  await click('#arenaA');
  await page.locator('#agentLabel').fill('yuki');
  await click('#hatchForm button');
  assert.equal(await page.locator('.agent-row').count(), 4);
  assert.equal(await text('adaStatus'), '—'); // Local operations must not fabricate an onchain read.
  assert.equal(await page.locator('#adaWrite').isEnabled(), false);
  assert.equal(await page.locator('#adaGrant').isEnabled(), false);

  // Restart the actual HTTP server on the same origin and storage volume.
  await new Promise(resolve => server.close(resolve));
  server = createApp({storageDir});
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  assert.equal(await (await fetch(first.uri)).text(), checkpointBytes);
  const clean = await browser.newContext();
  const fresh = await clean.newPage();
  fresh.on('pageerror', e => errors.push(e.message));
  await fresh.goto(origin);
  await fresh.waitForSelector('.agent-row');
  const independent = await fresh.evaluate(async ({pointer, expectedState}) => {
    const {verifyCheckpoint} = await import('/src/sim/checkpoint.mjs');
    const {FlyEngine} = await import('/src/sim/engine.mjs');
    const graph = await (await fetch('/data/circuit.json')).json();
    const raw = await (await fetch(pointer.uri)).text();
    const originalId = expectedState.state.agentId;
    const locals = JSON.parse(localStorage.getItem('flyns:local-registry:v1'));
    if (Object.values(locals.agents).some(a=>a.agentId===originalId)) throw new Error('Source identity leaked into fresh context');
    const cp = await verifyCheckpoint(raw, pointer, {agentId:originalId,modelHash:expectedState.modelHash,neuronCount:graph.nodes.length});
    const restored = new FlyEngine(graph, cp.state), control = new FlyEngine(graph, expectedState.state);
    for(let i=0;i<100;i++){restored.step();control.step();}
    if(JSON.stringify(restored.snapshot())!==JSON.stringify(control.snapshot())) throw new Error('Restored continuation diverged');
    return {freshContext:true,exactSubsequentSteps:100,identitySource:'Explicit test metadata; NOT ENS name resolution'};
  }, {pointer:first,expectedState:JSON.parse(checkpointBytes)});
  await clean.close();

  await page.locator('#threeToggle').check();await idle();
  assert.equal(await text('rendererLabel'), 'THREE.JS OBSERVATORY');
  const timing = await page.evaluate(() => new Promise(resolve => {
    const samples=[];let previous;
    function frame(now){if(previous)samples.push(now-previous);previous=now;if(samples.length<90)requestAnimationFrame(frame);else{samples.sort((a,b)=>a-b);resolve({medianFrameMs:samples[45],p95FrameMs:samples[85],sampleFrames:samples.length});}}
    requestAnimationFrame(frame);
  }));
  await page.screenshot({path:path.join(output,'desktop-3d.png'),fullPage:true});
  await page.locator('#threeToggle').uncheck();await idle();
  assert.equal(await text('rendererLabel'), 'CANVAS OBSERVATORY');
  await page.screenshot({path:path.join(output,'desktop-canvas.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#provenance').scrollIntoViewIfNeeded();
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(mobileOverflow,false);
  await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
  // An upgrade from the original graph must preserve old identities and still
  // start several independent agents for the newly imported model.
  const previousId = await page.evaluate(() => {
    const key='flyns:local-registry:v1', db=JSON.parse(localStorage.getItem(key));
    for(const agent of Object.values(db.agents))agent.modelHash='0'.repeat(64);
    localStorage.setItem(key,JSON.stringify(db));return db.agents['ada.flyns.demo'].agentId;
  });
  await page.reload();await page.waitForSelector('.agent-row');
  assert.equal(await page.locator('.agent-row').count(),3);
  assert.match(await text('selectedName'),/^ada-[0-9a-f]{8}\.flyns\.demo$/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('flyns:local-registry:v1')).agents['ada.flyns.demo'].agentId),previousId);
  assert.deepEqual(errors,[]);
  assert.ok(responses.every(status=>status===201));
  const result = {
    checkedAt:new Date().toISOString(),browser:browser.version(),node:process.version,
    environment:'Chromium over real loopback HTTP with real disk storage; local rehearsal identities and permissions',
    initialAgents:3,afterHatch:4,adaPanelIsolatedFromRehearsal:true,checkpointAndMigration:true,delegatedUpdate:true,otherAgentDenied:true,
    protectedModelDenied:true,revokedUpdateDenied:true,aliasResume:true,storageSurvivesServerRestart:true,
    independentCheckpointVerification:independent,modelUpgradePreservesOldIdentities:true,threeJS:true,threeTiming:timing,mobileWidth:390,mobileOverflow,
    uncaughtErrors:errors,limitations:'No deployed ENS transactions, independent ENS-name restoration, or public HTTPS deployment. Headless timing is not representative device performance.',
  };
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {
  await browser?.close();
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await rm(storageDir,{recursive:true,force:true});
}
