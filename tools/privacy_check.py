#!/usr/bin/env python3
"""Kontrola przed commitem: do repozytorium nie mogą trafić pliki spraw, PDF-y ani dane osobowe.
Sprawdza pliki w indeksie git (staged). Kod wyjścia 1 = zablokuj commit."""
import subprocess,sys,json,re,os
ALLOWED_JSON=re.compile(r'^(forms/\d\d\.json|manifest\.webmanifest|docs/slownik_pol\.json|docs/raport_zgodnosci\.json)$')
out=subprocess.run(['git','diff','--cached','--name-only','--diff-filter=ACMR'],capture_output=True,text=True).stdout.split('\n')
bad=[]
for f in filter(None,out):
    if f.lower().endswith('.json') and not ALLOWED_JSON.match(f): bad.append((f,'plik JSON poza listą dozwolonych'))
    if re.search(r'\.(pdf|heic|jpe?g)$',f,re.I): bad.append((f,'PDF/zdjęcie'))
    if f.startswith('sprawy/'): bad.append((f,'katalog spraw'))
    try:
        t=open(f,encoding='utf-8',errors='ignore').read()
    except Exception: continue
    if re.search(r'"app"\s*:\s*"ogledziny"',t) and '"forms"' in t and not f.startswith(('js/','tests/','tools/')): bad.append((f,'wygląda na plik sprawy'))
    if re.search(r'\b\d{11}\b',t) and f.startswith('forms/')==False and f.endswith(('.json','.md','.txt')): bad.append((f,'11 cyfr (PESEL?)'))
if bad:
    print('BLOKADA COMMITU – możliwe dane osobowe / pliki spraw:')
    for f,w in bad: print(' -',f,':',w)
    sys.exit(1)
print('privacy_check: OK')
