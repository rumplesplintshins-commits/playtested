import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sections=[
 ['Game and build',[['Game details','Game title: [game]\nBuild / release: [build]\nDate: [date]'],['Testing objectives and focus areas','Copy the developer objectives and focus areas. State which tasks you completed.']]],
 ['Session and device',[['Session','Time played: [hours or minutes]\nPlatform and device: [relevant specifications only]\nInput method: [keyboard, controller or touch]']]],
 ['Scores',[['Ratings','Overall: [0–10]\nGameplay: [0–10]\nPerformance: [0–10]\nWould you recommend it? [answer and reason]\nWould you continue playing? [answer and reason]']]],
 ['Observations',[['What worked well','Give specific interactions or moments and explain their effect on play.'],['Friction and usability','Describe unclear instructions, controls or visual feedback, including a concrete example.']]],
 ['Bugs and reproduction',[['Issue description','Expected behaviour: [expected]\nActual behaviour: [actual]\nSteps to reproduce: [numbered steps]\nFrequency and impact: [details]']]],
 ['Priorities and improvements',[['Main takeaway','Choose one useful improvement and one thing worth preserving. Explain why each matters.']]],
 ['Private supporting evidence',[['Optional document and recording','Submit this document link and any gameplay recording in the separate private evidence fields. Do not paste evidence URLs or contact details into public written feedback. Check sharing permissions separately.']]],
];
const paragraph=(text,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${escape(text)}</w:t></w:r></w:p>`;
let body=paragraph('Playtested Game Playtest Report','Title')+paragraph('Editable template — fictional placeholders only','Subtitle')+paragraph('Keep this report about the tested build. Do not include real names, email addresses, phone numbers, account tokens or unrelated personal information.');
body+=paragraph('Contents','Heading1')+paragraph('The sections below are linked. In Word, headings appear in the Navigation Pane. In Google Docs, use View > Show outline after importing.');
body+='<w:p><w:fldSimple w:instr="TOC \\o &quot;1-2&quot; \\h \\z \\u">'+sections.map(([title],i)=>`<w:hyperlink w:anchor="section_${i+1}"><w:r><w:t>${i+1}. ${escape(title)}</w:t><w:br/></w:r></w:hyperlink>`).join('')+'</w:fldSimple></w:p>';
sections.forEach(([title,subsections],i)=>{
 body+=`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:bookmarkStart w:id="${i+1}" w:name="section_${i+1}"/><w:r><w:t>${i+1}. ${escape(title)}</w:t></w:r><w:bookmarkEnd w:id="${i+1}"/></w:p>`;
 for(const [subtitle,instruction] of subsections){body+=paragraph(subtitle,'Heading2');for(const line of instruction.split('\n'))body+=paragraph(line);body+=paragraph('[Your observations]');}
});
body+='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>';
const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}</w:body></w:document>`;
const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:sz w:val="24"/></w:rPr></w:style>${[1,2].map((level)=>`<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="${level-1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${level===1?32:26}"/></w:rPr></w:style>`).join('')}</w:styles>`;
const zip=new AdmZip();
const parts={
 '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>',
 '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/document.xml':document,'word/styles.xml':styles,
 'word/settings.xml':'<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:updateFields w:val="true"/></w:settings>',
 'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>',
};
for(const [name,value] of Object.entries(parts)){zip.addFile(name,Buffer.from(value));zip.getEntry(name).header.time=new Date('2026-11-16T00:00:00Z');}
const output=path.resolve('public/Playtested_Game_Playtest_Report_Template.docx');fs.writeFileSync(output,zip.toBuffer());
console.log('Generated valid OOXML report template with Heading 1/2 styles, outline levels and linked contents');
