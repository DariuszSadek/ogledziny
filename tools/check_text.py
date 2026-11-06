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
            if k in('label','text','head','lead','title','subtitle','t') and isinstance(v,str): txt.append(v)
            elif k=='labels': txt.extend(v)
            elif k=='heads': txt.extend(v)
            elif k=='rows' and v and isinstance(v[0],list) and v[0] and isinstance(v[0][0],str):
                for rr in v: txt.extend(rr)
            elif k=='runs': pass
            else: walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(d)
J=collections.Counter(re.sub(r'\s+','',' '.join(txt)))
P=collections.Counter()
for i,pg in enumerate(pdfplumber.open(pdf).pages):
    if i+1 in skip: continue
    for w in pg.extract_words():
        if w['top']<36 or w['top']>800: continue
        P.update(w['text'])
miss={w:c-J[w] for w,c in P.items() if J[w]<c}
print('brakujące znaki (PDF więcej niż def):',sum(miss.values()),dict(sorted(miss.items(),key=lambda x:-x[1])[:25]))
