#!/usr/bin/env python3
"""Buduje listę plików do cache i wersję cache (hash zawartości) w sw.js oraz js/version.js.
Użycie: python3 tools/build.py [wersja_semantyczna]"""
import hashlib,os,re,sys,json
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver=sys.argv[1] if len(sys.argv)>1 else None
vf=os.path.join(root,'js','version.js')
if ver is None:
    m=re.search(r"APP_VERSION = '([^']+)'",open(vf).read()) if os.path.exists(vf) else None
    ver=(m.group(1) if m else '0.0.0').split('+')[0]
files=[]
for d,_,fs in os.walk(root):
    rel=os.path.relpath(d,root)
    if rel.split(os.sep)[0] in('tools','docs','.git','tests','node_modules','sprawy') : continue
    for f in fs:
        p=os.path.normpath(os.path.join(rel,f))
        if f in('sw.js','.DS_Store','README.md','.gitignore') or f.startswith('.'): continue
        files.append(p)
files.sort()
h=hashlib.sha256()
for p in files:
    h.update(p.encode());h.update(open(os.path.join(root,p),'rb').read())
digest=h.hexdigest()[:10]
open(vf,'w').write(f"export const APP_VERSION = '{ver}+{digest}';\n")
# version.js zmienia hash – licz ponownie bez niego, żeby było deterministycznie
files=[f for f in files if f!=os.path.join('js','version.js')]
h=hashlib.sha256()
for p in files:
    h.update(p.encode());h.update(open(os.path.join(root,p),'rb').read())
digest=h.hexdigest()[:10]
open(vf,'w').write(f"export const APP_VERSION = '{ver}+{digest}';\n")
assets=['./']+[p.replace(os.sep,'/') for p in sorted(files+[os.path.join('js','version.js')])]
sw=open(os.path.join(root,'sw.js')).read()
blk=f"/*BUILD:BEGIN*/\nconst CACHE = 'ogledziny-{ver}-{digest}';\nconst ASSETS = {json.dumps(assets,ensure_ascii=False)};\n/*BUILD:END*/"
sw=re.sub(r"/\*BUILD:BEGIN\*/.*?/\*BUILD:END\*/",lambda m:blk,sw,flags=re.S)
open(os.path.join(root,'sw.js'),'w').write(sw)
print('wersja',ver,'cache',digest,'plików',len(assets))
