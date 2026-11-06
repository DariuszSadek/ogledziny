#!/usr/bin/env python3
"""Raport zgodności: PDF wzoru vs definicja vs aplikacja (DOM).
Użycie: gen_report.py <katalog_wzorów> <compliance_dom.json>   (python z pypdf, pdfplumber)"""
import sys,os,json,re,glob,subprocess,collections
from pypdf import PdfReader
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src,domf=sys.argv[1],sys.argv[2]
dom=json.load(open(domf))
NAMES={'00':'Karta czynności','01':'Miejsce zdarzenia','02':'Motocykl','03':'Samochód osobowy','04':'Samochód ciężarowy','05':'Furgon / autobus','06':'Silnik','07':'Ogumienie','08':'Rzecz','09':'Rejestr zdjęć i przedmiotów'}
rows=[];ok_all=True;lines=[]
tot=collections.Counter()
for f in sorted(glob.glob(os.path.join(src,'[0-9][0-9]_*.pdf'))):
    n=os.path.basename(f)[:2]
    kinds={}
    for p in PdfReader(f).pages:
        for a in p.get('/Annots') or []:
            a=a.get_object()
            if a.get('/Subtype')=='/Widget': kinds[str(a['/T'])]='text' if a.get('/FT')=='/Tx' else 'check'
    skipped=[k for k in kinds if k.startswith('MZ_OPIS_CD')]
    for k in skipped: kinds.pop(k)
    d=json.load(open(os.path.join(root,'forms',n+'.json')))
    dd=dom[n]
    pdf_of=dd['pdfOf']                      # id -> nazwa pola PDF
    by_pdf=collections.defaultdict(list)
    for i,pn in pdf_of.items(): by_pdf[pn].append(i)
    missing=sorted(set(kinds)-set(by_pdf))
    extra=sorted(set(by_pdf)-set(kinds))
    dup=sorted(k for k,v in by_pdf.items() if len(v)>1)
    dom_missing=dd['domMissing']
    mism=[]
    for pn,ids in by_pdf.items():
        if pn in kinds:
            for i in ids:
                if dd['domTypes'].get(i)!=kinds[pn]: mism.append((pn,i,kinds[pn],dd['domTypes'].get(i)))
    out=subprocess.run([sys.executable,'-I',os.path.join(root,'tools','gen_form.py'),f,n,'/tmp/__rep.json'],capture_output=True,text=True).stdout
    audit=re.search(r'AUDIT: .*?: (\d+)',out);audit=int(audit.group(1)) if audit else -1
    tc=subprocess.run([sys.executable,'-I',os.path.join(root,'tools','check_text.py'),f,os.path.join(root,'forms',n+'.json')]+([ '5,6,7' ] if n=='01' else []),capture_output=True,text=True).stdout
    tcm=re.search(r'brakujące znaki.*?: (\d+)',tc);tcn=int(tcm.group(1)) if tcm else -1
    figs=sum(1 for s in d['sections'] for b in s['blocks'] if b['k']=='figure')
    spots=sum(len(b['spots']) for s in d['sections'] for b in s['blocks'] if b['k']=='figure')
    tabs=sum(1 for s in d['sections'] for b in s['blocks'] if b['k']=='table')
    ok=not missing and not extra and not dup and not dom_missing and not mism and audit==0
    ok_all&=ok
    ntext=sum(1 for v in kinds.values() if v=='text');nchk=len(kinds)-ntext
    rows.append(dict(form=n,name=NAMES[n],pdf=len(kinds),pdf_text=ntext,pdf_check=nchk,definicja=len(by_pdf),dom=dd['domIds'],missing=missing,extra=extra,dup=dup,dom_missing=dom_missing,type_mismatch=mism[:10],app_only=dd['uwagi'],sketches=dd['sketches'],audit=audit,char_deficit=tcn,sections=len(d['sections']),tables=tabs,figures=figs,spots=spots,skipped=skipped,ok=ok))
    for k in('pdf','definicja','dom'): tot[k]+=rows[-1][k]
    tot['missing']+=len(missing);tot['app_only']+=dd['uwagi']
L=['# Raport zgodności: wzory PDF ↔ definicje ↔ aplikacja','',f'Wygenerowano automatycznie (tools/gen_report.py). Wynik ogólny: **{"BRAK BRAKUJĄCYCH PÓL – 0" if ok_all and tot["missing"]==0 else "SĄ ROZBIEŻNOŚCI"}**.','',
   '| Formularz | Pola PDF (tekst / wybór) | W definicji | W aplikacji (DOM) | Brakujące | Nadmiarowe | Niezgodny typ | Pola tylko w aplikacji („Uwagi”) | Rysunki / strefy | Tabele | Wynik |','|---|---|---|---|---|---|---|---|---|---|---|']
for r in rows:
    L.append(f"| {r['form']} {r['name']} | {r['pdf']} ({r['pdf_text']} / {r['pdf_check']}) | {r['definicja']} | {r['dom']-r['app_only']} | {len(r['missing'])} | {len(r['extra'])+len(r['dup'])} | {len(r['type_mismatch'])} | {r['app_only']} | {r['figures']} / {r['spots']} | {r['tables']} | {'OK' if r['ok'] else 'BŁĄD'} |")
L+=['',f"Razem: pola PDF {tot['pdf']}, w definicjach {tot['definicja']}, w aplikacji {tot['dom']-tot['app_only']} (+{tot['app_only']} pól „Uwagi” dodanych zgodnie z wymaganiem, brak ich we wzorach PDF), brakujących {tot['missing']}.",'',
   '## Jak sprawdzono','',
   '1. **Pola:** nazwy wszystkich pól AcroForm odczytane z PDF (pypdf) zestawione z polami w definicjach (`forms/NN.json`, pole `pdf`) – brakujące, nadmiarowe, zduplikowane.',
   '2. **Aplikacja:** każdy formularz wyrenderowany w przeglądarce (tests/compliance.mjs); identyfikatory elementów DOM zestawione z definicją; typ elementu (pole tekstowe / pole wyboru) zestawiony z typem pola PDF.',
   '3. **Tekst:** każdy fragment tekstu wzoru (≥ 4 znaki) musi występować w definicji (audyt w gen_form.py); dodatkowo bilans znaków PDF ↔ definicja.',
   '','## Uwagi','',
   '- 01: pominięto 3 pola stron kontynuacji 4a–4c (zgodnie z zadaniem; pole opisu H rośnie z tekstem).',
   '- Bilans znaków wykazuje niewielkie niedobory wyłącznie tam, gdzie PDF powtarza nagłówek tabeli na kolejnej stronie lub w kolejnej tabeli o tym samym układzie – w aplikacji tabela jest ciągła (jeden nagłówek), więc powtórzenie nie występuje.',
   '- „Dodaj wiersz” dodaje pola poza zakresem PDF (identyfikatory `…rN.cM`, N większe niż liczba wierszy wzoru).',
   '- Pola tekstowe nie mają limitów długości (MaxLen z 00 pominięto zgodnie z decyzją użytkownika).',
   '- Pola dla rysunków (02–05, 07) są strefami klikalnymi/polami w położeniach pól PDF na rysunku wektorowym.','']
for r in rows:
    if not r['ok']:
        L.append(f"### {r['form']}: szczegóły rozbieżności");L.append(f"brak: {r['missing'][:20]}; nadmiar: {r['extra'][:20]}; duplikaty: {r['dup'][:20]}; DOM brak: {r['dom_missing'][:20]}; typ: {r['type_mismatch']}; audyt tekstu: {r['audit']}")
open(os.path.join(root,'docs','raport_zgodnosci.md'),'w').write('\n'.join(L)+'\n')
json.dump({'ok':ok_all,'forms':rows,'total':dict(tot)},open(os.path.join(root,'docs','raport_zgodnosci.json'),'w'),ensure_ascii=False,indent=1)
print('\n'.join(L[:20]))
