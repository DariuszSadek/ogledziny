#!/usr/bin/env python3
"""Pokrycie tekstu: słowa z PDF (bez nagłówków/stopek i stron pominiętych) vs słowa w definicji. Użycie: check_text.py <pdf> <def.json> [strony_pominięte,...]"""
import sys,json,re,collections,pdfplumber
pdf,defn=sys.argv[1],sys.argv[2]
skip={int(x) for x in sys.argv[3].split(',')} if len(sys.argv)>3 and sys.argv[3] else set()
d=json.load(open(defn))
txt=[]
def walk(o):
    if isinstance(o,dict):
        for k,v in o.items():
            if k in('label','text','head','nr','title','subtitle'): txt.append(str(v))
            elif k=='rn': txt.extend(v)
            else: walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(d)
J=collections.Counter(re.findall(r'\S+',' '.join(txt)))
P=collections.Counter()
for i,pg in enumerate(pdfplumber.open(pdf).pages):
    if i+1 in skip: continue
    for w in pg.extract_words():
        if w['top']<36 or w['top']>800: continue
        P[w['text']]+=1
miss={w:c-J[w] for w,c in P.items() if J[w]<c}
print('brakujące słowa (PDF więcej niż def):',sum(miss.values()),dict(list(miss.items())[:40]))
