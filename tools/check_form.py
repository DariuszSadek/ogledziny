#!/usr/bin/env python3
"""Zgodność: lista pól PDF vs definicja. Użycie: check_form.py <pdf> <def.json> [prefiks_pominiętych]"""
import sys,json
from pypdf import PdfReader
pdf,defn=sys.argv[1],sys.argv[2]
skip=sys.argv[3] if len(sys.argv)>3 else '@@'
names=[]
for p in PdfReader(pdf).pages:
    for a in p.get('/Annots') or []:
        a=a.get_object()
        if a.get('/Subtype')=='/Widget': names.append(str(a['/T']))
names=[n for n in names if not n.startswith(skip)]
d=json.load(open(defn))
have=[];
def walk(o):
    if isinstance(o,dict):
        if 'pdf' in o and o['pdf']: have.append(o['pdf'])
        for v in o.values(): walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(d)
miss=sorted(set(names)-set(have));extra=sorted(set(have)-set(names));dup=[n for n in set(have) if have.count(n)>1]
print('PDF',len(names),'def',len(have),'brak',len(miss),miss[:20],'nadmiar',extra[:10],'duplikaty',dup[:10])
sys.exit(1 if miss or extra or dup else 0)
