// Run: NODE_PATH=/tmp/smm-ui-tools/node_modules node tests/responsive-ui.cjs
// Isolated tooling: npm install --prefix /tmp/smm-ui-tools --no-audit --no-fund playwright-core
// Real React UI; synthetic auth/database boundaries only. No Next build or live requests.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'smm-ui-regression-'));
const results = [];
const errors = [];
const fixture = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {PathnameContext, SearchParamsContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import DashboardLayout from '@/app/dashboard/layout';
import AdminLayout from '@/app/admin/layout';
import DashboardPage from '@/app/dashboard/page';
import {OrderNewClient} from '@/app/dashboard/order/new/client';
import {OrderHistoryClient} from '@/app/dashboard/order/history/client';
import {TicketListClient} from '@/app/dashboard/ticket/list/client';
import {orders, session} from 'fixture-data';
const role = new URLSearchParams(location.search).get('role') || 'user';
session.user.role = role;
const categories = [{id:1,name:'Synthetic Instagram'}];
const services = [{id:1, category_id:1, name:'Synthetic service '.repeat(8), description:'https://example.invalid/'+ 'description'.repeat(30), price:12000, min:10, max:100000, type:'CUSTOM_COMMENTS'}];
const content = <div data-fixture="synthetic" className="space-y-4">
  {await DashboardPage()}
  <OrderNewClient categories={categories} services={services} balance={1234567890}/>
  <OrderHistoryClient orders={orders} total={30} page={1} status=""/>
  <TicketListClient tickets={[{id:1,subject:'Synthetic ticket '.repeat(10),status:'OPEN',updated_at:'2026-09-09T00:00:00Z',_count:{replies:1}}]} total={30} page={1} status=""/>
</div>;
const tree = await (role === 'admin' ? AdminLayout : DashboardLayout)({children:content});
function Fixture() {
  const [pathname,setPathname] = useState(role === 'admin' ? '/admin' : '/dashboard');
  const router = {push:p=>{window.fixturePath=p;setPathname(p)},replace:p=>setPathname(p),refresh(){},prefetch:async()=>{},back(){},forward(){}};
  return <AppRouterContext.Provider value={router}><PathnameContext.Provider value={pathname}><SearchParamsContext.Provider value={new URLSearchParams()}>
    {tree}
  </SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`;
const data = `
export const session = {user:{id:'1',role:'user',name:'SyntheticUser'.repeat(8),email:'fixture@example.invalid',balance:1234567890,level:'SUPERADMIN'}};
export const orders = [{id:1,service_name:'Synthetic service '.repeat(8),target:'https://example.invalid/'+ 'target'.repeat(20),quantity:1000,price:12000,status:'SUCCESS',created_at:'2026-09-09T00:00:00Z'}];
export const prisma = {user:{findUnique:async()=>({id:1,username:session.user.name,balance:1234567890})},order:{count:async()=>10,aggregate:async()=>({_sum:{price:120000}}),findMany:async()=>orders}};
`;
async function check(name, fn) {
  try { const details = await fn(); results.push({name,pass:true,details}); console.log('PASS', name, details ? JSON.stringify(details) : ''); }
  catch(e) { results.push({name,pass:false,error:e.message}); console.log('FAIL',name,e.message); }
}
(async()=>{
 let server, browser;
 try {
  process.chdir(root);
  await esbuild.build({stdin:{contents:fixture,resolveDir:root,sourcefile:'synthetic-fixture.tsx',loader:'tsx'},outfile:path.join(out,'fixture.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'synthetic-boundaries',setup(build){
    build.onResolve({filter:/^(fixture-data|next-auth(?:\/react)?|@\/lib\/(auth|prisma))$/},a=>({path:a.path,namespace:'fixture'}));
    build.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='fixture-data'?data:a.path==='next-auth'?'import {session} from "fixture-data"; export async function getServerSession(){return session}':a.path==='next-auth/react'?'import {session} from "fixture-data"; export const useSession=()=>({data:session}); export function signOut(){throw Error("Fixture forbids signOut")}':a.path==='@/lib/auth'?'export const authOptions={}':'export {prisma} from "fixture-data"'}));
  }}]});
  const config = require('tailwindcss/loadConfig')(path.join(root,'tailwind.config.ts'));
  const css = await require('postcss')([require('tailwindcss')(config),require('autoprefixer')]).process(fs.readFileSync('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')});
  fs.writeFileSync(path.join(out,'fixture.css'),css.css);
  server=http.createServer((req,res)=>{
    if(req.url==='/api/information/latest'){res.setHeader('Content-Type','application/json');return res.end('{"data":null}');}
    const file=req.url==='/fixture.js'?'fixture.js':req.url==='/fixture.css'?'fixture.css':null;
    res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html');
    res.end(file?fs.readFileSync(path.join(out,file)):'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic UI regression fixture</title><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
    const req=route.request();
    if(!req.url().startsWith(origin+'/')||req.method()!=='GET'){errors.push('Forbidden request: '+req.method()+' '+req.url());return route.abort();}
    return route.continue();
  });
  for(const role of ['user','admin']) for(const width of [360,390,768,1440]){
    await page.setViewportSize({width,height:850});
    await page.goto(origin+'/?role='+role);
    await page.locator('[data-fixture]').waitFor();
    await page.locator('select').first().selectOption('1');
    const prefix=role+' '+width;
    await check(prefix+' content bounds and local table scroll',async()=>{
      const d=await page.evaluate(()=>{
        const main=document.querySelector('main');
        const tables=[...document.querySelectorAll('table')].map(t=>{const p=t.parentElement;p.scrollLeft=100;return {client:p.clientWidth,scroll:p.scrollWidth,moved:p.scrollLeft};});
        return {document:[document.documentElement.clientWidth,document.documentElement.scrollWidth],main:[main.clientWidth,main.scrollWidth],tables};
      });
      assert(d.document[1]<=d.document[0]+1,JSON.stringify(d));
      assert(d.main[1]<=d.main[0]+1,JSON.stringify(d));
      if(width<1024) assert(d.tables.every(t=>t.scroll>t.client&&t.moved>0),JSON.stringify(d));
      return d;
    });
    if(width<1024){
      await check(prefix+' mobile font >=16',async()=>{
        const fonts=await page.locator('input,select,textarea').evaluateAll(els=>els.map(e=>parseFloat(getComputedStyle(e).fontSize)));
        assert(fonts.length>=5 && fonts.every(f=>f>=16),JSON.stringify(fonts));return fonts;
      });
      await check(prefix+' closed drawer cannot receive focus',async()=>{
        const safe=await page.evaluate(()=>{document.querySelector('main input').focus();const before=document.activeElement;document.querySelector('nav a')?.focus();return document.activeElement===before;});
        assert(safe,'Offscreen navigation received focus');
      });
      await check(prefix+' drawer open close Escape navigation focus',async()=>{
        const trigger=page.getByRole('button',{name:'Toggle menu',exact:true});
        await trigger.click();
        const dialog=page.locator('[role="dialog"]');await dialog.waitFor({timeout:1500});
        assert.equal(await trigger.getAttribute('aria-expanded'),'true');
        const focusInside=()=>page.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement));
        // Debug: log what's focused
        const debug=await page.evaluate(()=>{const d=document.querySelector('[role="dialog"]');const f=d?.querySelectorAll('a[href], button');return {dialog:!!d,focusableCount:f?.length,active:document.activeElement?.tagName,activeInDialog:d?.contains(document.activeElement)};});
        console.log('DEBUG focus',JSON.stringify(debug));
        await page.waitForFunction(()=>document.querySelector('[role="dialog"]').contains(document.activeElement),null,{timeout:1500});
        assert(await focusInside());
        const close=dialog.getByRole('button',{name:'Close menu',exact:true});
        await close.focus();await page.keyboard.press('Shift+Tab');assert(await focusInside(),'Backward focus escaped');
        const last=dialog.locator('a').last();await last.focus();await page.keyboard.press('Tab');assert(await focusInside(),'Forward focus escaped');
        await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
        assert(await trigger.evaluate(e=>e===document.activeElement),'Focus not restored');
        await trigger.click();await close.click();await dialog.waitFor({state:'hidden'});
        await trigger.click();await page.mouse.click(width-5,400);await dialog.waitFor({state:'hidden'});
        await trigger.click();const link=dialog.locator('a').first();const href=await link.getAttribute('href');await link.click();await dialog.waitFor({state:'hidden'});
        assert.equal(await page.evaluate(()=>window.fixturePath),href);
      });
    }
    await check(prefix+' account dropdown bounds',async()=>{
      await page.locator('header button').click({timeout:5000});
      const rect=await page.locator('header .absolute').evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,parent:e.parentElement.clientWidth,parentLeft:e.parentElement.getBoundingClientRect().left};});
      assert(rect.left>=rect.parentLeft&&rect.right<=rect.width+1,JSON.stringify(rect));
      await page.keyboard.press('Escape');
      return rect;
    });
    if(width===768) await check(prefix+' chart remains full width',async()=>{
      const d=await page.getByText('Revenue (14 Hari)',{exact:true}).evaluate(e=>{const card=e.parentElement.parentElement;return {card:card.clientWidth,parent:card.parentElement.clientWidth,columns:getComputedStyle(card.parentElement).gridTemplateColumns}});
      assert(d.card>d.parent*.8,JSON.stringify(d));return d;
    });
    await page.screenshot({path:path.join(out,role+'-'+width+'.png'),fullPage:true});
  }
  for(const role of ['user','admin']) await check(role+' desktop collapsed to mobile submenu and resize reset',async()=>{
    await page.setViewportSize({width:1440,height:850});await page.goto(origin+'/?role='+role);await page.locator('[data-fixture]').waitFor();
    await page.locator('button[aria-label="Collapse sidebar"]').click({timeout:1500, force: true});
    await page.setViewportSize({width:390,height:850});
    await page.waitForTimeout(200);
    await page.getByRole('button',{name:'Toggle menu',exact:true}).click();
    const dialog=page.locator('[role="dialog"]');
    await dialog.waitFor({timeout:1500});
    const menu=dialog.getByRole('button',{name:'Order',exact:true});
    await menu.waitFor({timeout:5000});
    if((await menu.getAttribute('aria-expanded'))!=='true')await menu.click();
    await page.waitForTimeout(100);
    const submenuLink=dialog.locator('a',{hasText:role==='user'?'Bulk Order':'Refills'});
    assert(await submenuLink.isVisible());
    // Resize to desktop - should close mobile drawer
    await page.setViewportSize({width:1440,height:850});
    await page.waitForTimeout(200);
    // Resize back to mobile - drawer should be closed
    await page.setViewportSize({width:390,height:850});
    await page.waitForTimeout(200);
    const toggleBtn=page.getByRole('button',{name:'Toggle menu',exact:true});
    const expanded=await toggleBtn.getAttribute('aria-expanded');
    assert.equal(expanded,'false');
  });
  await check('browser errors / forbidden network requests',()=>assert.deepEqual(errors,[]));
 } finally {
  if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));
  console.log('ARTIFACTS',out);console.log('SUMMARY',results.filter(r=>r.pass).length+' passed, '+results.filter(r=>!r.pass).length+' failed');
 }
 assert(results.length>0&&results.every(r=>r.pass),'Responsive regression check failed');
})().catch(e=>{console.error(e);process.exitCode=1});
