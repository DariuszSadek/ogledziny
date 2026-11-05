import { chromium } from 'playwright-core';
import fs from 'fs';
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu','--no-sandbox']});
const ctx=await b.newContext({viewport:{width:834,height:1194},acceptDownloads:true,permissions:['geolocation'],geolocation:{latitude:50.866,longitude:20.628}});
let p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:8765/');await p.click('text=Nowa sprawa');await p.waitForSelector('.titleband');
// SW aktywny + cache
await p.waitForFunction(()=>navigator.serviceWorker.controller||navigator.serviceWorker.ready.then(()=>true));
await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(600);await p.reload();await p.waitForSelector('.titleband',{timeout:8000}).catch(async()=>{console.log('BODY:',(await p.textContent('body')).slice(0,300));console.log(errs)});
ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'SW kontroluje stronę');
ok(await p.locator('#update-banner').isHidden(),'baner aktualizacji ukryty po 1. instalacji');
// wypełnianie
await p.fill('[data-id="01.A.1"]','2026-11-05');
await p.locator('button:has-text("Teraz")').first().click();
const t=await p.inputValue('[data-id="01.A.2"]');ok(/^\d\d:\d\d$/.test(t),'Teraz wstawia '+t);
await p.locator('button:has-text("GPS")').first().click();await p.waitForTimeout(800);
const g=await p.inputValue('[data-id="01.A.9"]');ok(/50\.866000, 20\.628000/.test(g),'GPS: '+g);
await p.fill('[data-id="01.C.16"]','0,5');
await p.fill('[data-id="01.C.17"]','12.5');
await p.locator('[data-id="01.A.11"]').check({force:true});
// wiersz dodatkowy
await p.locator('#sec-01-G button:has-text("Dodaj wiersz")').click();
const lastId=await p.locator('#sec-01-G .trow').last().locator('textarea').first().getAttribute('data-id');ok(lastId==='01.G.t1.r29.c1','dodany wiersz '+lastId);
await p.fill(`[data-id="${lastId}"]`,'dodany wiersz');
// szkic
const cv=p.locator('canvas.sketch');await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();
await p.mouse.move(bb.x+50,bb.y+50);await p.mouse.down();for(let i=0;i<20;i++)await p.mouse.move(bb.x+50+i*10,bb.y+50+i*5);await p.mouse.up();
await p.waitForTimeout(700);
// bufor – nowa strona (zamknięcie i otwarcie)
const p2=await ctx.newPage();await p2.goto('http://localhost:8765/');await p2.waitForSelector('text=Sprawa');await p2.waitForSelector('.titleband');
ok(await p2.inputValue('[data-id="01.A.1"]')==='2026-11-05','bufor: data');
ok(await p2.inputValue('[data-id="01.C.16"]')==='0,5','bufor: przecinek zachowany');
ok(await p2.inputValue('[data-id="01.C.17"]')==='12.5','bufor: kropka zachowana');
ok(await p2.inputValue(`[data-id="${lastId}"]`)==='dodany wiersz','bufor: dodany wiersz');
ok(await p2.locator('[data-id="01.A.11"]').isChecked(),'bufor: checkbox');
await p2.close();
// offline
await ctx.setOffline(true);
const p3=await ctx.newPage();await p3.goto('http://localhost:8765/');await p3.waitForSelector('text=Sprawa',{timeout:8000}).then(()=>ok(true,'offline: aplikacja otwiera się'),()=>ok(false,'offline otwarcie'));
await p3.waitForSelector('.titleband');
await p3.fill('[data-id="01.A.6"]','Offline wpis');
const net=[];p3.on('requestfailed',r=>net.push(r.url()));
await p3.close();await ctx.setOffline(false);
// zapis pliku (fallback pobieranie lub share)
await p.evaluate(()=>{window.__shared=null;navigator.canShare=()=>false;});
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:6000}).catch(()=>null),p.locator('#btn-save').click()]);
ok(!!dl,'pobieranie pliku');
if(dl){const name=dl.suggestedFilename();console.log('nazwa:',name);const path='/tmp/__case.json';await dl.saveAs(path);fs.copyFileSync(path,'case_out.json');fs.unlinkSync(path);
 const j=JSON.parse(fs.readFileSync('case_out.json','utf8'));ok(j.forms[0].data['01.A.1']==='2026-11-05'&&j.schema===1&&j.defVersions['01']==='1.0.0','plik: schemat/wersje/dane');ok(/^bez-sygnatury_\d{4}-\d\d-\d\d_\d{4}\.json$/.test(name),'nazwa pliku');
 ok(j.forms[0].data['01.J.sketch']?.strokes?.length>=1,'plik: szkic '+j.forms[0].data['01.J.sketch']?.strokes?.length);}
await p.waitForTimeout(300);
ok(/zapisano \d\d:\d\d/.test(await p.textContent('#st-file')),'pasek: godzina zapisu: '+await p.textContent('#st-file'));
console.log('errs',errs);
await b.close();
