// Isolated local UI fixtures only; never bypasses production authentication.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const rows = Array.from({length: 24}, (_, i) => ({created_at: new Date(Date.now()-i*86400000).toISOString(), similarity: i%5+1, best_match:['personality','wealth'], worst_match:i%2?['career']:[], worst_none:!(i%2), share_intent:['yes','maybe','no'][i%3], comment:i===0?'<img src=x onerror="window.injected=true">':`설명과 공유 기능 테스트 의견 ${i}`, character_id:'test', interpretation_version:i%2?'v1':'v2', source:'production'}));
let mode = 'data';
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/admin/feedback') {res.writeHead(mode==='error'?503:200,{'content-type':'application/json'}).end(JSON.stringify({rows:mode==='empty'?[]:rows,truncated:false,fetchedAt:new Date().toISOString()}));return;}
  const file=path==='/admin/'?'dist/admin/index.html':path==='/assets/admin.js'?'dist/assets/admin.js':null;
  if(!file){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'}).end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
mkdirSync('e2e-artifacts',{recursive:true});
const port=9400+process.pid%400;
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${resolve('e2e-artifacts/admin-profile-'+process.pid)}`,'--no-first-run','--disable-extensions','about:blank'],{stdio:'ignore'});
let ws;
async function wait(fn){for(let i=0;i<150;i++){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('timeout');}
try{
  await wait(()=>fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.ok));
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const {r,j}=pending.get(m.id);pending.delete(m.id);m.error?j(Error(m.error.message)):r(m.result);}};
  const cdp=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,{r,j});ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const out=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw Error(JSON.stringify(out.exceptionDetails));return out.result.value;};
  const assert=(v,msg)=>{if(!v)throw Error(msg);console.log('PASS '+msg);};
  await cdp('Page.enable');
  for(const width of [1280,390,320]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<750});
    await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/admin/`});
    await wait(()=>ev("document.querySelectorAll('.card').length===4"));
    assert(await ev('document.documentElement.scrollWidth<=innerWidth'),`no horizontal overflow ${width}`);
    assert(await ev("document.querySelector('.card strong').textContent.includes('24')"),'fixture count');
    assert(await ev('!window.injected && !document.querySelector("td img")'),'comment HTML escaped');
    const shot=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(`e2e-artifacts/admin-${width}.png`,Buffer.from(shot.data,'base64'));
  }
  await ev("document.querySelector('#score').value='5';document.querySelector('#score').dispatchEvent(new Event('input'))");
  assert(await ev("document.querySelector('.card strong').textContent.includes('4')"),'score filter updates statistics');
  await ev("document.querySelector('#search').value='없는문장';document.querySelector('#search').dispatchEvent(new Event('input'))");
  assert(await ev("document.querySelector('#export').disabled && document.querySelector('#dashboard').innerText.includes('피드백이 없습니다')"),'empty filter disables export');
  await ev("document.querySelector('#search').value='';document.querySelector('#score').value='';");
  mode='empty';await ev("document.querySelector('#refresh').click()");await wait(()=>ev("document.querySelector('#dashboard').innerText.includes('아직 데이터가 없어요')"));
  assert(await ev("document.querySelector('#export').disabled"),'empty storage state');
  mode='error';await ev("document.querySelector('#refresh').click()");await wait(()=>ev("document.querySelector('#status').className==='error'"));
  assert(await ev("!document.querySelector('#dashboard').children.length"),'storage failure clears stale statistics');
}finally{ws?.close();spawnSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'});server.close();}
