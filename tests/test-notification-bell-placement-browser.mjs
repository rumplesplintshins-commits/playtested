import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from 'playwright/test';
const origin=process.env.TEST_APP_URL||'http://localhost:3000';
const dir='app/notification-bell-fixture',file=dir+'/page.tsx';assert(!fs.existsSync(dir));fs.mkdirSync(dir);
fs.writeFileSync(file,`import Bell from '../components/NotificationBell';export default function Page(){return <main className="min-h-screen bg-[#090b0a] p-6"><div style={{display:'flex',justifyContent:'flex-end'}}><Bell/></div></main>}`);
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.route('**/rest/v1/rpc/**',route=>{
  const name=route.request().url().split('/').pop();
  if(name==='get_my_notifications')return route.fulfill({json:{unread_count:2,notifications:[
   {id:1,title:'Campaign complete: Alpha',message:'Target reached.',href:'/my-submissions?tab=games&game=alpha',read_at:null,created_at:new Date().toISOString()},
   {id:2,title:'Feedback approved',message:'Accepted report.',href:null,read_at:null,created_at:new Date().toISOString()}]}});
  return route.fulfill({json:true});
 });
 const page=await context.newPage();
 await page.goto(origin+'/notification-bell-fixture');
 const bell=page.getByRole('button',{name:'Notifications, 2 unread'});
 await expect(bell).toBeVisible();
 await bell.click();
 const panel=page.getByRole('region',{name:'Notifications'});
 await expect(panel).toBeVisible();
 // Desktop: the panel sits under the bell, right aligned and inside the margin.
 const box=await panel.evaluate(node=>{const r=node.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,right:r.right};});
 const buttonBox=await bell.evaluate(node=>({bottom:node.getBoundingClientRect().bottom,right:node.getBoundingClientRect().right}));
 assert(box.right<=1280-15,'Panel stays inside the right viewport margin');
 assert(box.left>=15,'Panel stays inside the left viewport margin');
 assert.equal(box.width,410);
 assert(Math.abs(box.right-buttonBox.right)<=3,'Panel is right-aligned with the bell');
 assert(box.top>=buttonBox.bottom+7,'Panel opens beneath the bell instead of covering it');
 // Narrow viewport: wait for the resize handler and React rerender before asserting.
 await page.setViewportSize({width:375,height:667});
 await expect.poll(async()=>panel.evaluate(node=>{
  const r=node.getBoundingClientRect();
  return r.left>=15&&r.right<=360;
 }),{timeout:5000}).toBe(true);
 const mobile=await panel.evaluate(node=>{const r=node.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,top:r.top};});
 const mobileButton=await bell.evaluate(node=>node.getBoundingClientRect().bottom);
 assert(mobile.left>=15,'Clamped panel honours the left margin on mobile');
 assert(mobile.right<=360,'Clamped panel honours the right margin on mobile');
 assert(mobile.width>=280,'Clamped panel keeps a usable width on mobile');
 assert(mobile.top>=mobileButton+7,'Panel repositions under the bell after resize');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal overflow after resize');
 // Keyboard support: Escape closes and returns focus to the bell, arrows rove inside the panel.
 await page.keyboard.press('Escape');
 await expect(panel).toHaveCount(0);
 await expect(bell).toBeFocused();
 await bell.click();
 await page.keyboard.press('ArrowDown');
 const focusedInside=await page.evaluate(()=>{const region=document.querySelector('[role="region"][aria-label="Notifications"]');return !!region&&region.contains(document.activeElement);});
 assert(focusedInside,'ArrowDown moves focus inside the panel');
 await page.keyboard.press('Escape');
 await expect(bell).toBeFocused();
 console.log('PASS notification bell placement: panel beneath the bell, right aligned, viewport clamped on desktop and mobile widths, resize repositioning, Escape-to-close focus return and arrow-key roving inside the panel. Mocked RPC responses only.');
}finally{await browser.close();fs.unlinkSync(file);fs.rmdirSync(dir);}
