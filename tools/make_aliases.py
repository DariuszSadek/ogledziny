#!/usr/bin/env python3
"""Po zmianie układu definicji: dodaje aliasy starych identyfikatorów (z git <ref>, domyślnie HEAD) do nowych (po nazwie pola PDF)
i podnosi wersję definicji tych formularzy. Użycie: python3 tools/make_aliases.py [ref]"""
import json,subprocess,sys,os
ref=sys.argv[1] if len(sys.argv)>1 else 'HEAD'
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def idmap(d):
    o={}
    def w(x):
        if isinstance(x,dict):
            if 'id' in x and 'pdf' in x and x['pdf']: o[x['id']]=x['pdf']
            for v in x.values(): w(v)
        elif isinstance(x,list):
            for v in x: w(v)
    w(d);return o
for n in sorted(f[:2] for f in os.listdir(os.path.join(root,'forms')) if f.endswith('.json')):
    r=subprocess.run(['git','show',f'{ref}:forms/{n}.json'],capture_output=True,text=True,cwd=root)
    if r.returncode: continue
    old=json.loads(r.stdout);path=os.path.join(root,'forms',n+'.json');new=json.load(open(path))
    om,nm=idmap(old),idmap(new);by={v:k for k,v in nm.items()}
    al=dict(old.get('aliases',{}))
    changed=0
    for oid,pdf in om.items():
        nid=by.get(pdf)
        if nid and nid!=oid and oid not in nm: al[oid]=nid;changed+=1
    # aliasy łańcuchowe: spłaszcz do bieżących identyfikatorów
    for k,v in list(al.items()):
        while v in al and al[v]!=v: v=al[v]
        al[k]=v
    new['aliases']=al
    if changed:
        a,b,c=(old.get('defVersion','1.0.0').split('.')+['0','0'])[:3]
        new['defVersion']=f'{a}.{b}.{int(c)+1}'
    else: new['defVersion']=old.get('defVersion','1.0.0')
    json.dump(new,open(path,'w'),ensure_ascii=False,separators=(',',':'))
    print(n,'nowe aliasy:',changed,'wersja',new['defVersion'])
