import { chromium } from 'playwright-core';
import fs from 'fs';
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu','--no-sandbox']});
const ctx=await b.newContext({viewport:{width:834,height:1194}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(''+e));
await p.goto('http://localhost:8765/');await p.waitForSelector('text=Otwórz sprawę');
// plik ze „starszej definicji”: pole 01.X.99 nie istnieje, 01.A.1 przemianowane przez alias → test alias niżej
const old=JSON.parse(fs.readFileSync('case_out.json','utf8'));
old.defVersions['01']='0.9.0';old.forms[0].data['01.Z.99']='pole z dawnej wersji';old.forms[0].data['01.A.OLD']='przeniesiona wartość';
fs.writeFileSync('case_old.json',JSON.stringify(old));
// alias: serwer statyczny – testujemy bez aliasów (alias test w node osobno)
await p.setInputFiles('#file-input','case_old.json');
await p.waitForSelector('dialog[open]');
const rep=await p.textContent('dialog');console.log(rep.slice(0,500));
ok(/01\.Z\.99/.test(rep)&&/01\.A\.OLD/.test(rep)&&/0\.9\.0/.test(rep),'raport zawiera pola nieprzeniesione i zmianę wersji');
await p.click('dialog button:has-text("OK")');
await p.click('#tabs button:has-text("Miejsce")');await p.waitForSelector('.orphans');
ok((await p.textContent('.orphans')).includes('pole z dawnej wersji'),'osierocone pole widoczne w formularzu');
ok(await p.inputValue('[data-id="01.A.1"]')==='2026-11-05','dane po otwarciu na miejscu');
// zapis ponownie – orphans zachowane w pliku
await p.evaluate(()=>{navigator.canShare=()=>false});
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btn-save')]);await dl.saveAs('case_resaved.json');
const r=JSON.parse(fs.readFileSync('case_resaved.json','utf8'));
ok(r.forms[0].orphans['01.Z.99']==='pole z dawnej wersji','osierocone zachowane w ponownie zapisanym pliku');
ok(r.defVersions['01']==='1.0.0','wersja definicji zaktualizowana');
// zgodność plik→plik
const a=JSON.parse(fs.readFileSync('case_out.json','utf8')).forms[0].data,c=r.forms[0].data;
ok(JSON.stringify(a)===JSON.stringify(c),'dane identyczne po obiegu zapis→otwarcie→zapis');
await p.setViewportSize({width:390,height:844});await p.click('#sec-01-C h2').catch(()=>{});
await p.evaluate(()=>document.querySelector('#sec-01-C').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:'phone.png'});
console.log('errs',errs);await b.close();
