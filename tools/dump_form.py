import json,sys
d=json.load(open(sys.argv[1]))
for s in d['sections']:
    print('##',s['title'][:50])
    for b in s['blocks']:
        k=b['k']
        if k=='fields': print('  fields',[(f['label'][:18],round(f['w'])) for f in b['items']])
        elif k=='group': print('  group',b['label'],[(o['type'][0]+':'+o['label'][:10]) for o in b['items']])
        elif k=='table': print('  table',b['nr'],[c['head'][:12] for c in b['cols']],len(b['rows']),'rows rn',b['rn'][:3])
        elif k=='checklist': print('  checklist',len(b['items']),[c['label'][:15] for c in b['items'][:2]])
        else: print('  ',k,b.get('text','')[:60])
