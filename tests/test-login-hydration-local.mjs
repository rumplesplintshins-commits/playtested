import assert from 'node:assert/strict';
import {chromium,expect} from 'playwright/test';
const origin=process.env.TEST_APP_URL;assert(origin,'Set the isolated local application URL');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Local-only browser check');
const browser=await chromium.launch({headless:true});const errors=[];
try{
 const ctx=await browser.newContext();await ctx.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));
 for(const role of ['developer','tester']){
  await page.goto(origin+`/login?mode=signup&role=${role}&next=/submit`);await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:role==='developer'?/Game Developer/:/^Tester/})).toBeChecked();
  await page.getByLabel('Email address',{exact:true}).fill('hydration-check@example.test');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible();await expect(page.getByLabel('Email address',{exact:true})).toHaveValue('hydration-check@example.test');assert(new URL(page.url()).searchParams.get('next')==='/submit');
 }
 await page.goto(origin+'/login?error=auth_callback_failed&next=/tester');const recovery=page.getByRole('alert').filter({hasText:'Your destination is saved:'});await expect(recovery).toBeVisible();await expect(recovery).toContainText(/Tester Hub/i);
 assert.deepEqual(errors,[],'No signup or callback-recovery hydration/runtime errors');console.log('PASS real local signup hydration, developer/tester role preselection, mode-switch email/destination preservation and callback recovery');
}finally{await browser.close();}
