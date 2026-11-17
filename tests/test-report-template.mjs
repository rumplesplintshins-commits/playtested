import fs from 'node:fs';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
const file='public/Playtested_Game_Playtest_Report_Template.docx',zip=new AdmZip(fs.readFileSync(file));
assert(zip.test(),'ZIP/CRC validation');
for(const entry of zip.getEntries())assert(entry.getData().length>0);
const document=zip.readAsText('word/document.xml'),styles=zip.readAsText('word/styles.xml');
for(const [id,level] of [['Heading1',0],['Heading2',1]]){
 const style=styles.match(new RegExp(`<w:style[^>]*w:styleId="${id}"[^>]*>[\\s\\S]*?<\\/w:style>`))?.[0];assert(style);assert(style.includes(`<w:outlineLvl w:val="${level}"/>`));assert(style.includes('<w:qFormat/>'));assert(document.includes(`<w:pStyle w:val="${id}"/>`));
}
assert(document.includes('Contents'));assert(document.includes('TOC \\o &quot;1-2&quot;'));
const anchors=[...document.matchAll(/w:hyperlink w:anchor="([^"]+)"/g)].map(m=>m[1]);assert.equal(anchors.length,7);for(const anchor of anchors)assert(document.includes(`w:name="${anchor}"`),'Contents must point to a real bookmark');
assert(!/LOCAL_FAKE|https?:\/\/docs\.google\.com|@example/.test(document),'No personal/example evidence embedded');
console.log('PASS DOCX ZIP/CRC, genuine Heading1/2, outline levels, linked seven-section contents and synthetic-only text; actual Google Docs import is a separate integration check');
