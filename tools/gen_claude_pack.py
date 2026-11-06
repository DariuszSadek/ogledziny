#!/usr/bin/env python3
"""Generuje paczkę dla Claude AI: słowniki pól per formularz (kompaktowe), katalog formularzy.
Użycie: python3 tools/gen_claude_pack.py <katalog_wyjściowy>
Pliki ręczne (instrukcja, format, schemat, przykład) leżą w docs/claude_ai/ i są kopiowane razem."""
import json,os,sys,glob,shutil
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=sys.argv[1]
os.makedirs(out,exist_ok=True)
PURPOSE={'00':('Karta czynności biegłego na miejscu zdarzenia','jedna na wezwanie na miejsce zdarzenia'),
 '01':('Protokół oględzin miejsca zdarzenia','jeden na miejsce zdarzenia (układ pomiarowy SLO1/SLO2, ślady, nawierzchnia, widoczność, szkic)'),
 '02':('Protokół oględzin motocykla','jeden na każdy motocykl / motorower'),
 '03':('Protokół oględzin samochodu osobowego','jeden na każdy samochód osobowy'),
 '04':('Protokół oględzin samochodu ciężarowego / ciągnika z naczepą','jeden na każdy pojazd ciężarowy lub zespół'),
 '05':('Protokół oględzin furgonu / autobusu','jeden na każdy furgon lub autobus'),
 '06':('Protokół oględzin silnika','jeden na każdy silnik (badania bez demontażu i po demontażu)'),
 '07':('Protokół oceny ogumienia','jeden na każdą oponę (koło)'),
 '08':('Protokół oględzin rzeczy','jeden na każdy przedmiot lub zespół (skrzynia, most, pompa, turbosprężarka, element pojazdu, odzież, kask…)'),
 '09':('Rejestr zdjęć i przedmiotów','jeden na sprawę (rejestr zdjęć/nagrań i zabezpieczonych przedmiotów/próbek)')}
cat=['# Katalog formularzy aplikacji „Oględziny”','','Identyfikatory formularzy: 00–09. Ten sam formularz może wystąpić w sprawie wiele razy (każdy egzemplarz ma własną `ref` we wkładzie).','']
for f in sorted(glob.glob(os.path.join(root,'forms','[0-9][0-9].json'))):
    d=json.load(open(f));n=d['id']
    name=PURPOSE[n][0]
    cat.append(f'## {n} – {name}');cat.append(f'Ile egzemplarzy: {PURPOSE[n][1]}.');cat.append('');cat.append('Sekcje (litera → tytuł):');
    for s in d['sections']:
        if s['title']: cat.append(f'- `{s["id"]}` {s["title"]}')
    cat.append('')
    L=[f'# Słownik pól – formularz {n}: {name}',f'Wersja definicji: {d["defVersion"]}. Plik generowany automatycznie z definicji aplikacji – identyfikatory są stałe.','',
       'Użycie we wkładzie: `"pola": { "<ID>": "wartość" }`. Typy: `text` (tekst), `num` (liczba zapisana jako tekst, przecinek lub kropka jak w aktach), `time` (gg:mm), `gps` (współrzędne), `check` (pole wyboru: tylko `true`).','',
       'Dla zadań: `"sekcja"` = litera sekcji, `"pole"` = ID z tego pliku (opcjonalnie, tylko gdy jest pewne).','']
    for s in d['sections']:
        if not s['title']: continue
        L.append(f'## Sekcja {s["id"]}: {s["title"]}');L.append('')
        rows=[];
        for b in s['blocks']:
            k=b['k']
            if k=='fields':
                for x in b['items']: rows.append((x['id'],x['label'] or '(pole bez etykiety)',x['type'],''))
            elif k=='group':
                for x in b['items']: rows.append((x['id'],(x['label'] or '(opcja)'),x['type'],'grupa: '+b['label']))
            elif k=='checklist':
                for x in b['items']: rows.append((x['id'],x['label'],'check','lista kontrolna'))
            elif k=='figure':
                for x in b['spots']: rows.append((x['id'],x['label'] or '(strefa na rysunku)','check' if x['type']=='check' else 'text','rysunek '+b['fid']))
            elif k=='sketch': rows.append((b['id'],'Szkic sytuacyjny (rysowany w terenie – nie wypełniać)','sketch',''))
        if rows:
            L+=['| ID | Etykieta | Typ | Kontekst |','|---|---|---|---|']+[f'| {a} | {b_.replace("|","/")} | {c} | {e.replace("|","/")} |' for a,b_,c,e in rows]+['']
        for b in s['blocks']:
            if b['k']=='table':
                gl={}
                for g in b.get('groups',[]):
                    for i in range(g['c0'],g['c1']+1): gl[i]=g['t']
                cols=[f'c{i+1}={(gl[i]+" / " if i in gl else "")+c["head"].replace(chr(10)," ")}({c["type"]})' for i,c in enumerate(b['cols'])]
                L.append(f'**Tabela {b["tid"]}** – wzorzec ID: `{b["prefix"]}.r<wiersz>.c<kolumna>`; wierszy we wzorze: {len(b["rows"])} (kolejne wiersze dodaje użytkownik – numeruj dalej).')
                L.append('Kolumny: '+'; '.join(cols)+'.')
                if any(b.get('labels',[])): L.append('Wiersze: '+'; '.join(f'r{i+1}={lab}' for i,lab in enumerate(b['labels']) if lab)+'.')
                L.append('')
        L.append(f'Pole „Uwagi”: `{n}.{s["id"]}.uwagi` (text).');L.append('')
    open(os.path.join(out,f'slownik_{n}.md'),'w').write('\n'.join(L)+'\n')
open(os.path.join(out,'02_KATALOG_FORMULARZY.md'),'w').write('\n'.join(cat)+'\n')
src=os.path.join(root,'docs','claude_ai')
for f in glob.glob(os.path.join(src,'*')): shutil.copy(f,out)
print('paczka w',out,len(os.listdir(out)),'plików')
