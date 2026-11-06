#!/usr/bin/env python3
"""Słownik pól: forms/*.json -> docs/slownik_pol.json + docs/slownik_pol.md"""
import json,glob,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows=[]
for f in sorted(glob.glob(os.path.join(root,'forms','[0-9][0-9].json'))):
    d=json.load(open(f))
    for s in d['sections']:
        sec=s['title']
        def add(id,label,typ,pdf,ctx=''): rows.append({'id':id,'formularz':d['id'],'wersjaDefinicji':d['defVersion'],'sekcja':sec,'etykieta':label,'kontekst':ctx,'typ':typ,'pdf':pdf})
        for b in s['blocks']:
            if b['k']=='fields':
                for x in b['items']: add(x['id'],x['label'],x['type'],x['pdf'])
            elif b['k']=='group':
                for x in b['items']: add(x['id'],x['label'],x['type'],x['pdf'],b['label'])
            elif b['k']=='checklist':
                for x in b['items']: add(x['id'],x['label'],'check',x['pdf'])
            elif b['k']=='table':
                gl={}
                for g in b.get('groups',[]):
                    for i in range(g['c0'],g['c1']+1): gl[i]=g['t']
                for ri,r in enumerate(b['rows']):
                    rl=(b.get('labels') or [''])[ri] if ri<len(b.get('labels') or []) else ''
                    for ci,c in enumerate(r):
                        if c: add(c['id'],(gl[ci]+' / ' if ci in gl else '')+b['cols'][ci]['head'],b['cols'][ci]['type'],c['pdf'],f'tabela {b["tid"]}, wiersz {ri+1}'+(f': {rl}' if rl else ''))
            elif b['k']=='figure':
                for sp in b['spots']: add(sp['id'],sp['label'] or '(strefa na rysunku)','check' if sp['type']=='check' else 'text',sp['pdf'],f'rysunek {b["fid"]}')
            elif b['k']=='sketch': add(b['id'],b['label'] or 'Szkic sytuacyjny','sketch','')
        if s['title']: add(f"{d['id']}.{s['id']}.uwagi",'Uwagi','text','','pole aplikacji (brak w PDF)')
os.makedirs(os.path.join(root,'docs'),exist_ok=True)
json.dump(rows,open(os.path.join(root,'docs','slownik_pol.json'),'w'),ensure_ascii=False,indent=1)
with open(os.path.join(root,'docs','slownik_pol.md'),'w') as m:
    m.write('# Słownik pól\n\nGenerowany automatycznie (tools/gen_dict.py). Identyfikatory są stałe; tabele: `<formularz>.<sekcja>.t<n>.r<wiersz>.c<kolumna>` (wiersze > liczby we wzorze dodaje przycisk „Dodaj wiersz”).\n\n| ID | Sekcja | Etykieta | Kontekst | Typ | Pole PDF |\n|---|---|---|---|---|---|\n')
    for r in rows: m.write(f"| {r['id']} | {r['sekcja'][:30]} | {r['etykieta'].replace('|','/')} | {r['kontekst']} | {r['typ']} | {r['pdf']} |\n")
print(len(rows),'pól w słowniku')
