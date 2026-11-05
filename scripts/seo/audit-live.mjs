// Public, unauthenticated GETs only. No account actions, cookies, JS or analytics.
import fs from 'node:fs';
const origin='https://playtested.co.uk';
const paths=['/','/robots.txt','/sitemap.xml','/login','/tester','/submit','/privacy','/terms','/games/merge27-nonexistent-audit','/playtesting','/find-playtesters','/become-a-playtester'];
const results=[];
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2]]));
for(const path of paths){
 try{
  const started=Date.now(),response=await fetch(origin+path,{headers:{'User-Agent':'Playtested-Merge27-SEO-Audit'},signal:AbortSignal.timeout(30000)}),html=await response.text();
  const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0]));const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attributes(m[0]));
  if(path==='/sitemap.xml')paths.push(...[...html.matchAll(/<loc>(https:\/\/playtested\.co\.uk\/(?:submissions\/[a-f0-9-]{36}|contact))<\/loc>/g)].slice(0,50).map(m=>new URL(m[1]).pathname).filter(p=>!paths.includes(p)));
  results.push({path,status:response.status,final_url:response.url,elapsed_ms:Date.now()-started,content_type:response.headers.get('content-type'),x_robots_tag:response.headers.get('x-robots-tag'),title:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??null,description:meta.find(m=>m.name==='description')?.content??null,canonical:links.find(m=>m.rel==='canonical')?.href??null,robots:meta.filter(m=>m.name==='robots').map(m=>m.content),social_meta:meta.filter(m=>m.property?.startsWith('og:')||m.name?.startsWith('twitter:')).map(m=>({name:m.property||m.name,content:m.content})),h1:[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()),structured_data_blocks:[...html.matchAll(/type="application\/ld\+json"/g)].length,...(path==='/robots.txt'?{robots_text:html}:{}),...(path==='/sitemap.xml'?{sitemap_urls:[...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])}: {})});
 }catch(error){results.push({path,error:error.name});}
}
fs.mkdirSync('docs/seo',{recursive:true});fs.writeFileSync('docs/seo/MERGE-27-LIVE-AUDIT.json',JSON.stringify({captured_at:new Date().toISOString(),origin,method:'Unauthenticated GET only; no scripts or cookies',timings:'Single requests, not Core Web Vitals or a performance benchmark',results},null,2)+'\n');
console.log(results.map(r=>`${r.path}: ${r.status??r.error}; canonical=${r.canonical??'none'}; robots=${r.robots?.join(';')??'none'}`).join('\n'));
