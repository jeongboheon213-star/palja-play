// Read-only result/SEO smoke test. No purchase, refund, feedback submission or SNS posting.
// Optional PALJA_TEST_PUBLIC_DNS=1 resolves www through 1.1.1.1 for this browser only;
// this does not change OS/domain DNS and the report explicitly records that route.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resolver } from 'node:dns/promises';
import assert from 'node:assert/strict';
const base = 'https://www.paljaplay.com';
const browserPath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!browserPath) throw Error('Edge unavailable');
let publicIp = null;
if (process.env.PALJA_TEST_PUBLIC_DNS === '1') { const resolver=new Resolver(); resolver.setServers(['1.1.1.1']); publicIp=(await resolver.resolve4('www.paljaplay.com'))[0]; }
mkdirSync('e2e-artifacts', {recursive:true});
const port=9800+process.pid%150;
const browser=spawn(browserPath,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${resolve('e2e-artifacts/card-prod-profile-'+process.pid)}`,'--no-first-run','--disable-extensions',...(publicIp?[`--host-resolver-rules=MAP www.paljaplay.com ${publicIp}`]:[]),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){for(let i=0;i<180;i++){try{if(await fn())return;}catch{}await sleep(100);}throw Error('timeout');}
let ws;
try {
  await wait(()=>fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.ok));
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let seq=0;const pending=new Map(),errors=[];
  ws.onmessage=m=>{const data=JSON.parse(m.data),p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(Error(data.error.message)):p.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  await cdp('Page.enable');await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp('Page.navigate',{url:base+'/'});await wait(()=>ev("document.readyState==='complete' && !!document.getElementById('go')"));
  const urls=await ev(`Promise.all(['/', '/free-saju', '/guide/saju', '/robots.txt', '/sitemap.xml'].map(async p=>{const r=await fetch(p);return {p,status:r.status,type:r.headers.get('content-type'),text:await r.text()}}))`);
  for(const row of urls){assert.equal(row.status,200,row.p);if(row.p.endsWith('.txt')){assert.match(row.type,/text\/plain/);assert(row.text.includes('Sitemap: '+base+'/sitemap.xml'));}else if(row.p.endsWith('.xml')){assert.match(row.type,/xml/);assert(row.text.includes('<urlset'));assert.equal((row.text.match(/<loc>/g)||[]).length,3);}else{assert(row.text.includes(`rel="canonical" href="${base}${row.p}"`));}}
  await ev("document.getElementById('go').click();true");
  await ev(`document.getElementById('dt').value='1990-05-15';document.getElementById('tm').value='14:20';document.querySelector('#sex button[data-v="male"]').click();document.getElementById('calc').click();true`);
  await wait(()=>ev("document.getElementById('s-result').classList.contains('on') && !!document.getElementById('result-share-open')"));
  const tierBefore=await ev("document.getElementById('palja-tier').innerText");
  await ev("document.getElementById('result-share-open').click();true");
  await wait(()=>ev("!!document.getElementById('result-card-image') && !document.getElementById('result-card-save').disabled"));
  const card=await ev("(()=>{const im=document.getElementById('result-card-image');return {alt:im.alt,width:im.naturalWidth,height:im.naturalHeight,link:document.getElementById('result-card-link').value,overflow:document.getElementById('result-card-dialog').scrollWidth>document.getElementById('result-card-dialog').clientWidth}})()");
  assert.equal(card.width,1080);assert.equal(card.height,1350);assert(!card.overflow);assert(card.alt.includes(tierBefore.match(/[A-Z]\+? TIER/)[0]));assert(!/1990|05-15|male|purchaseCode|pillars/.test(card.alt+card.link));assert.equal(card.link,base+'/?utm_source=share&utm_medium=result_card');
  const png=await ev(`fetch(document.getElementById('result-card-image').src).then(r=>r.blob()).then(b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)}))`);
  writeFileSync('e2e-artifacts/result-share-card-production.png',Buffer.from(png.split(',')[1],'base64'));
  await ev("document.getElementById('result-card-close').click();true");await wait(()=>ev("!document.getElementById('result-card-dialog')"));
  assert.equal(await ev("document.getElementById('palja-tier').innerText"),tierBefore);assert.equal(errors.length,0);
  const report={at:new Date().toISOString(),base,publicDnsRoute:publicIp,urls:urls.map(({text,...row})=>row),card,errors};writeFileSync('e2e-artifacts/result-card-production.json',JSON.stringify(report,null,2));
  console.log('PASS: actual production calculation/tier/card PNG/private-data exclusion/modal return and five SEO endpoints',JSON.stringify({base,publicDnsRoute:publicIp}));
} finally {ws?.close();spawnSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'});}
