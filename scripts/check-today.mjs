import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,extname} from 'node:path';
import {adsenseFiles} from './adsense-files.mjs';
const types={'.html':'text/html; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  let path=join('dist',pathname==='/'?'index.html':pathname);
  if(existsSync(join(path,'index.html')))path=join(path,'index.html');
  if(!existsSync(path))return void res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream'}).end(readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
try{
  const titles=new Set(),descriptions=new Set();
  for(const path of ['/','/free-saju','/guide/saju','/today']){
    const res=await fetch(base+path),html=await res.text();assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/text\/html/);
    assert(html.includes(`rel="canonical" href="https://www.paljaplay.com${path}"`),path);
    titles.add(html.match(/<title>(.*?)<\/title>/s)[1]);descriptions.add(html.match(/name="description" content="([^"]+)"/)[1]);
    assert.equal((html.match(/rel="canonical"/g)??[]).length,1);assert.match(html,/name="robots" content="index, follow"/);
  }
  assert.equal(titles.size,4);assert.equal(descriptions.size,4);
  for(const [path,type] of [['/robots.txt','text/plain'],['/sitemap.xml','application/xml']]){
    const res=await fetch(base+path),body=await res.text();assert.equal(res.status,200);assert(res.headers.get('content-type').includes(type));assert.doesNotMatch(body,/<html/i);
    if(path.includes('sitemap'))for(const route of ['/','/free-saju','/guide/saju','/today'])assert(body.includes(`<loc>https://www.paljaplay.com${route}</loc>`));
    else assert(body.includes('Sitemap: https://www.paljaplay.com/sitemap.xml'));
  }
  const main=readFileSync('dist/index.html','utf8'),today=readFileSync('dist/today/index.html','utf8');
  assert.match(main,/href="\/today"/);assert.match(today,/오늘운세는 어떻게 계산하나요/);assert.match(today,/src="\/assets\/app.js"/);
  const original=main.match(/<meta name="google-adsense-account"[^>]*>/g)??[];
  assert.deepEqual(today.match(/<meta name="google-adsense-account"[^>]*>/g)??[],original);
  assert.equal((adsenseFiles(today,'ca-pub-1234567890123456').html.match(/name="google-adsense-account"/g)??[]).length,original.length+1);
  console.log('Local production artifacts: four routes HTTP 200, distinct metadata, canonical/indexable, robots text, sitemap XML URLs, today static content and AdSense parity PASS');
}finally{server.close();}
