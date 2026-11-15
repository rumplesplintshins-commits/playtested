import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {chromium} from 'playwright';
const exports={};
new Function('exports',ts.transpileModule(fs.readFileSync('lib/demo-games.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);
const {demoInitialState:initial,demoGameReducer:reduce}=exports;
assert.equal(reduce(initial,{type:'move',dx:-1,dy:0}),initial);
let state=reduce(initial,{type:'move',dx:1,dy:0});
assert.equal(reduce(state,{type:'move',dx:0,dy:1}),state,'Central thicket blocks movement');
for(let i=0;i<8;i++)state=reduce(state,{type:'order',resource:'energy'});
assert.equal(reduce(state,{type:'order',resource:'metal'}),state,'No ninth turn');
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());
  await page.goto('http://localhost:3000/demo-games/neon-courier');
  for(let i=0;i<8;i++)await page.getByRole('button',{name:'Collect glowing parcel',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Objective complete'}).waitFor();
  await page.goto('http://localhost:3000/demo-games/mosslight-grove');
  for(const direction of ['right','right','down','down','left','left'])await page.getByRole('button',{name:`Move ${direction}`,exact:true}).click();
  await page.getByRole('status').filter({hasText:'Objective complete'}).waitFor();
  await page.goto('http://localhost:3000/demo-games/orbit-foundry');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/Solar order/}).click();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/Mining order/}).click();
  await page.getByRole('status').filter({hasText:'Objective complete'}).waitFor();
  await page.getByRole('button',{name:'Restart demo'}).click();
  for(let i=0;i<8;i++)await page.getByRole('button',{name:/Solar order/}).click();
  await page.getByRole('status').filter({hasText:'ran out of turns'}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
  for(const game of exports.DEMO_GAMES){
    assert.equal((await page.request.get(`http://localhost:3000/demo-assets/${game.slug}.svg`)).status(),200);
    assert.equal((await page.request.get(`http://localhost:3000/submissions/${game.id}`)).status(),200);
  }
  console.log('PASS: three playable demos, objectives, restart, turn limit, mobile width, thumbnails and game-page HTTP checks. No authenticated writes.');
}finally{await browser.close();}
