#!/usr/bin/env python3
"""Generuje definicję formularza (forms/NN.json) z PDF wzoru na podstawie położeń tekstu i pól.
Użycie: python -I tools/gen_form.py <plik.pdf> <NN> <out.json>   (wymaga pdfplumber)"""
import sys,re,json,collections,os
import pdfplumber
from pypdf import PdfReader

pdf,FID,out=sys.argv[1],sys.argv[2],sys.argv[3]
PH=841.89
def cls(c):
    col=tuple(round(x,2) for x in (c['non_stroking_color'] or ()))
    fn=c['fontname'];bold='Bold' in fn;ital='Italic' in fn;sz=c['size']
    if col==(1.0,1.0,1.0): return 'title' if bold else 'subtitle'
    if col==(0.84,0.87,0.92): return 'subtitle'
    navy=col==(0.12,0.23,0.37); gray=col==(0.36,0.4,0.46)
    if navy and bold: return 'sec' if sz>=8 else 'th'
    if navy: return 'sec'
    if gray and ital: return 'note'
    if gray and bold: return 'lab'
    if gray: return 'lab'
    if bold: return 'grp'
    return 'opt'

def page_runs(pg):
    chars=sorted(pg.chars,key=lambda c:(round(c['top']/1.5),c['x0']))
    runs=[];cur=None
    for c in chars:
        if c['text'].isspace() and (cur is None or c['x0']-cur['x1']>3):
            cur=None;continue
        k=cls(c);ty=round(c['top']/1.5)
        if cur and cur['cls']==k and cur['ty']==ty and c['x0']-cur['x1']<5.0:
            cur['t']+=(' ' if c['x0']-cur['x1']>1.2 and not c['text'].isspace() and not cur['t'].endswith(' ') else '')+c['text'];cur['x1']=c['x1'];cur['bot']=max(cur['bot'],c['bottom'])
        else:
            cur={'cls':k,'ty':ty,'t':c['text'],'x0':c['x0'],'x1':c['x1'],'top':c['top'],'bot':c['bottom'],'sz':c['size']};runs.append(cur)
    for r in runs: r['t']=re.sub(r'\s+',' ',r['t']).strip()
    return [r for r in runs if r['t']]

def widgets(page):
    res=[]
    for a in page.get('/Annots') or []:
        a=a.get_object()
        if a.get('/Subtype')!='/Widget':continue
        x0,y0,x1,y1=[float(v) for v in a['/Rect']]
        ft=a.get('/FT')
        res.append({'pdf':str(a['/T']),'kind':'text' if ft=='/Tx' else 'check','x0':x0,'x1':x1,'top':PH-y1,'bot':PH-y0,
                    'multi':bool(int(a.get('/Ff') or 0)&(1<<12))})
    return res

rd=PdfReader(pdf)
pl=pdfplumber.open(pdf)
secs=[];cur=None;title=sub=''
pages_data=[]
for pi,pg in enumerate(pl.pages):
    runs=page_runs(pg);ws=widgets(rd.pages[pi])
    pages_data.append((runs,ws))

# --- podział na sekcje (w kolejności czytania) ---
items=[]  # (page, top, x0, 'run'|'w', obj)
for pi,(runs,ws) in enumerate(pages_data):
    for r in runs:
        if r['top']<36 and r['cls'] in('lab','opt'): continue          # nagłówek strony
        if r['top']>800: continue                                       # stopka
        if r['cls']=='title': title=r['t'];continue
        if r['cls']=='subtitle': sub=r['t'];continue
        items.append((pi,r['top'],r['x0'],'run',r))
    for w in ws: items.append((pi,w['top'],w['x0'],'w',w))
items.sort(key=lambda t:(t[0],round(t[1]/1.0),t[2]))
sections=[]
for it in items:
    pi,top,x0,k,o=it
    if k=='run' and o['cls']=='sec' and (re.match(r'^[A-Z]\d?\.\s',o['t']) or o['t'].startswith('ZADANIA SPECJALNE')):
        m=re.match(r'^([A-Z]\d?)\.\s',o['t'])
        sections.append({'id':m.group(1) if m else 'Z','title':o['t'],'items':[],'skip':'CIĄG DALSZY' in o['t']})
    elif sections: sections[-1]['items'].append(it)
    else: pass
sections=[s for s in sections if not s['skip']]

def ov(a0,a1,b0,b1): return min(a1,b1)-max(a0,b0)

def build_section(sec):
    its=sec['items']
    runs=[(i[0],i[4]) for i in its if i[3]=='run']
    ws=[(i[0],i[4]) for i in its if i[3]=='w' and not i[4]['pdf'].startswith('MZ_OPIS_CD')]
    used_r=set();used_w=set()
    Y=lambda p,o:p*1000+o['top']
    units=[]
    # ---------- tabele: nagłówek 'th' ----------
    ths=[(p,r) for p,r in runs if r['cls']=='th' and not (r['x0']<38.5 and len(r['t'])>8)]
    # grupuj th w pasma (kolejne linie o małym odstępie)
    bands=[];
    for p,r in sorted(ths,key=lambda t:(t[0],t[1]['top'],t[1]['x0'])):
        if bands and bands[-1]['p']==p and r['top']-bands[-1]['bot']<8 and r['top']>=bands[-1]['top']-1: 
            b=bands[-1];b['runs'].append(r);b['bot']=max(b['bot'],r['bot'])
        else: bands.append({'p':p,'top':r['top'],'bot':r['bot'],'runs':[r]})
    # łącz pasma nagłówkowe w pionie, jeśli rozdzielone w poziomie (wielolinijkowe)
    for b in bands:
        cols=[]  # grupy th po x-środku
        for r in sorted(b['runs'],key=lambda r:(r['x0'])):
            cx=(r['x0']+r['x1'])/2
            for c in cols:
                if abs(c['cx']-cx)<10 and r['top']>c['bot']-6: c['txt']+=' '+r['t'];c['bot']=r['bot'];c['x0']=min(c['x0'],r['x0']);c['x1']=max(c['x1'],r['x1']);c['cx']=(c['x0']+c['x1'])/2;break
            else: cols.append({'txt':r['t'],'cx':cx,'x0':r['x0'],'x1':r['x1'],'bot':r['bot']})
        b['cols']=cols
        for r in b['runs']: used_r.add(id(r))
    tables=[]
    for bi,b in enumerate(bands):
        if len(b['cols'])<2: 
            for r in b['runs']: used_r.discard(id(r))
            continue
        nxt=bands[bi+1] if bi+1<len(bands) else None
        limit=(nxt['p']*1000+nxt['top']) if nxt else 1e9
        cand=[(p,w) for p,w in ws if id(w) not in used_w and (p,w['top'])>(b['p'],b['bot']-1) and Y(p,w)<limit]
        # wiersze: klastruj wg 'top'
        cand.sort(key=lambda t:(t[0],(t[1]['top']+t[1]['bot'])/2,t[1]['x0']))
        rows=[];
        for p,w in cand:
            cy=(w['top']+w['bot'])/2
            if rows and rows[-1]['p']==p and abs(rows[-1]['cy']-cy)<5: rows[-1]['ws'].append(w)
            else: rows.append({'p':p,'top':w['top'],'cy':cy,'ws':[w]})
        good=[];sig=None
        for r in rows:
            xs=[round(w['x0']) for w in r['ws']]
            if sig is None:
                if len(xs)>=2 and r['top']-b['bot']<40 and (r['p']==b['p']): sig=xs;good.append(r)
                else: break
            else:
                if r['p']!=good[-1]['p']: break
                if all(any(abs(x-sx)<=2 for sx in sig) for x in xs) and len(xs)>=max(2,len(sig)-2) and r['top']-good[-1]['top']<45: good.append(r)
                else: break
        if not good: 
            for r in b['runs']: used_r.discard(id(r))
            continue
        # tabela ciągła na następnej stronie (ten sam układ kolumn) – dołącz wiersze bez nowego nagłówka
        tbl={'p':b['p'],'top':b['top'],'cols':b['cols'],'rows':good,'extra':[],'runs_all':b['runs']}
        tables.append(tbl)
        for r in good:
            for w in r['ws']: used_w.add(id(w))
    # kontynuacje na kolejnych stronach: powtórzony nagłówek o takich samych tekstach -> scal
    merged=[]
    for t in tables:
        if merged and [c['txt'] for c in merged[-1]['cols']]==[c['txt'] for c in t['cols']] and t['p']==merged[-1]['p']+1:
            merged[-1]['rows']+=t['rows'];merged[-1]['cont']=merged[-1].get('cont',[])+[t]
        else: merged.append(t)
    for t in merged:
        # etykiety wierszy (numery) i podpis tabeli
        cols=t['cols'];rows=t['rows']
        xs=sorted({round(w['x0']) for r in rows for w in r['ws']})
        # kolumny wg x0 pól; etykieta z najbliższego th
        colinfo=[]
        for x in xs:
            w0=next(w for r in rows for w in r['ws'] if round(w['x0'])==x)
            cx=(w0['x0']+w0['x1'])/2
            colinfo.append({'x':x,'w':round(w0['x1']-w0['x0'],1),'kind':w0['kind'],'cx':cx,'head':''})
        heads=collections.defaultdict(list);nrh=[]
        for r in sorted(t['runs_all'],key=lambda r:(r['top'],r['x0'])):
            cx=(r['x0']+r['x1'])/2
            if cx<colinfo[0]['x']-1: nrh.append(r['t']);continue
            ci=min(range(len(colinfo)),key=lambda i:abs(colinfo[i]['cx']-cx))
            heads[ci].append(r['t'])
        for i,ci in enumerate(colinfo): ci['head']=' '.join(heads[i])
        # kolumna numeracji
        rn=[]
        for r in rows:
            nr=[rr for p,rr in runs if p==r['p'] and abs(rr['top']-r['top'])<8 and rr['x0']<min(w['x0'] for w in r['ws']) and re.fullmatch(r'\d+',rr['t']) and id(rr) not in used_r]
            for rr in nr: used_r.add(id(rr))
            rn.append(nr[0]['t'] if nr else '')
        # nagłówek 'Nr'
        nrcol={'txt':' '.join(nrh)} if nrh else None
        grid=[]
        for r in rows:
            row=[]
            for ci in colinfo:
                w=next((w for w in r['ws'] if round(w['x0'])==ci['x']),None)
                row.append(w['pdf'] if w else None)
            grid.append(row)
        # warunek: nie jest tabelą, jeśli każdy wiersz ma 1 pole
        units.append({'y':Y(t['p'],t),'x':0,'k':'table','cols':colinfo,'nr':nrcol['txt'] if nrcol else None,'rn':rn,'grid':grid,'hasnr':any(rn),'rowh':[r['ws'][0]['bot']-r['ws'][0]['top'] for r in rows]})
        # nagłówek 'th' w kolejnych stronach – oznacz jako zużyte
        for tt in t.get('cont',[]):
            pass
    # ---------- pozostałe: pola, grupy, listy ----------
    rest_r=[(p,r) for p,r in runs if id(r) not in used_r]
    rest_w=[(p,w) for p,w in ws if id(w) not in used_w]
    # sort
    rest_r.sort(key=lambda t:(t[0],t[1]['top'],t[1]['x0']))
    rest_w.sort(key=lambda t:(t[0],t[1]['top'],t[1]['x0']))
    # grupy: etykieta 'grp' na x<80
    grps=[(p,r) for p,r in rest_r if r['cls']=='grp' and r['x0']<80]
    taken_w=set();taken_r=set()
    def group_end(gi):
        p,g=grps[gi]
        # koniec: następny element z lewej kolumny (x<100) leżący poniżej tego z prawej strony
        last_bot=g['bot']
        end=1e9
        for q,r in rest_r:
            if (q,r['top'])>(p,g['top']+2) and r['x0']<100 and id(r) not in taken_r and r is not g and Y(q,r)>=Y(p,g)+4:
                # lewa kolumna: kończy grupę, chyba że kontynuacja etykiety grupy
                end=min(end,Y(q,r)-3.5);break
        return end
    for gi,(p,g) in enumerate(grps):
        end=group_end(gi)
        y0=Y(p,g)-3
        opts=[];
        gw=[(q,w) for q,w in rest_w if y0<=Y(q,w)<end and w['x0']>=g['x1']-2 and id(w) not in taken_w]
        gw.sort(key=lambda t:(t[1]['kind']!='check',t[0],t[1]['top'],t[1]['x0']))
        for q,w in gw:
            taken_w.add(id(w))
            if w['kind']=='check':
                lab=[r for qq,r in rest_r if qq==q and abs(r['top']-w['top'])<5 and r['x0']>=w['x1']-1 and r['x0']<w['x1']+6 and id(r) not in taken_r]
                if lab: 
                    for r in lab: taken_r.add(id(r))
                    # dołącz kontynuację w linii
                    opts.append({'pdf':w['pdf'],'kind':'check','label':lab[0]['t'],'y':(w['top']+w['bot'])/2,'x':w['x0']})
                else: opts.append({'pdf':w['pdf'],'kind':'check','label':'','y':(w['top']+w['bot'])/2,'x':w['x0']})
            else:
                lab=[r for qq,r in rest_r if qq==q and abs(r['top']-w['top'])<6 and r['x1']<=w['x0']+1 and r['x1']>w['x0']-14 and id(r) not in taken_r and r['cls']=='opt']
                for r in lab: taken_r.add(id(r))
                opts.append({'pdf':w['pdf'],'kind':'text','label':lab[0]['t'] if lab else '','w':round(w['x1']-w['x0'],1),'y':(w['top']+w['bot'])/2,'x':w['x0'],'multi':w['multi']})
        taken_r.add(id(g))
        units.append({'y':Y(p,g),'x':g['x0'],'k':'group','label':g['t'],'opts':opts})
    # reszta pól: etykieta z góry (lab) albo z lewej (opt/lab)
    rem_w=[(p,w) for p,w in rest_w if id(w) not in taken_w]
    for p,w in rem_w:
        if w['kind']=='text':
            above=[r for q,r in rest_r if q==p and id(r) not in taken_r and r['cls'] in('lab','note','opt','grp') and r['bot']<=w['top']+1.5 and w['top']-r['bot']<9 and ov(r['x0'],r['x1'],w['x0'],w['x1'])>-1 and r['x0']>=w['x0']-6]
            above.sort(key=lambda r:r['top'])
            if above:
                # wieloliniowa etykieta
                lab=' '.join(r['t'] for r in above if r['cls'] in('lab',))
                for r in above:
                    if r['cls']=='lab': taken_r.add(id(r))
                units.append({'y':Y(p,w),'x':w['x0'],'k':'field','label':lab,'pdf':w['pdf'],'w':round(w['x1']-w['x0'],1),'h':round(w['bot']-w['top'],1),'top':w['top'],'multi':w['multi']});taken_w.add(id(w));continue
            left=[r for q,r in rest_r if q==p and id(r) not in taken_r and abs(r['top']-w['top'])<7 and r['x1']<=w['x0']+1 and w['x0']-r['x1']<14 and r['cls'] in('opt','lab','grp')]
            if left:
                r=max(left,key=lambda r:r['x1']);taken_r.add(id(r))
                units.append({'y':Y(p,w),'x':r['x0'],'k':'field','label':r['t'],'pdf':w['pdf'],'w':round(w['x1']-w['x0'],1),'h':round(w['bot']-w['top'],1),'top':w['top'],'multi':w['multi'],'inline':True});taken_w.add(id(w));continue
            units.append({'y':Y(p,w),'x':w['x0'],'k':'field','label':'','pdf':w['pdf'],'w':round(w['x1']-w['x0'],1),'h':round(w['bot']-w['top'],1),'top':w['top'],'multi':w['multi']});taken_w.add(id(w))
        else:
            lab=[r for q,r in rest_r if q==p and abs(r['top']-w['top'])<5 and r['x0']>=w['x1']-1 and r['x0']<w['x1']+6 and id(r) not in taken_r]
            t=''
            if lab:
                r=lab[0];taken_r.add(id(r));t=r['t']
                # kontynuacja (zawinięty tekst) pod spodem
                for q,r2 in rest_r:
                    if q==p and id(r2) not in taken_r and r2['cls']=='opt' and abs(r2['x0']-r['x0'])<2 and 0<r2['top']-r['top']<10 and r2['top']-r['bot']<3:
                        t+=' '+r2['t'];taken_r.add(id(r2))
            units.append({'y':Y(p,w),'x':w['x0'],'k':'check','label':t,'pdf':w['pdf'],'top':w['top']});taken_w.add(id(w))
    # pozostałe teksty
    for p,r in rest_r:
        if id(r) in taken_r:continue
        if r['cls']=='note':
            kind='note'
        elif r['cls']=='th':kind='subhead'
        elif r['cls']=='grp':kind='subhead'
        elif r['cls']=='lab': kind='sig' if not r['t'].startswith('Pole szkicu') else 'sketchlabel'
        else: kind='text'
        units.append({'y':Y(p,r),'x':r['x0'],'k':kind,'text':r['t'],'bot':r['bot'],'sz':r['sz']})
        taken_r.add(id(r))
    # nagłówki th z kolejnych stron tabel (zużyte) – już oznaczone
    units.sort(key=lambda u:(u['y'],u['x']))
    return units

def final_blocks(units):
    blocks=[];i=0
    def merge_text(us):
        # sklej kolejne linie noty/podnagłówka o tym samym stylu
        out=[]
        for u in us:
            if out and u['k'] in('note',) and out[-1]['k']==u['k'] and 0<u['y']-out[-1]['y']<12 and abs(u['x']-out[-1]['x'])<4:
                out[-1]['text']+=' '+u['text'];out[-1]['y']=u['y']
            else: out.append(dict(u))
        return out
    units=merge_text(units)
    seen=set();u2=[]
    for u in units:
        if u['k']=='subhead':
            if u['text'] in seen: continue
            seen.add(u['text'])
        u2.append(u)
    units=u2
    n=len(units)
    while i<n:
        u=units[i]
        if u['k']=='field':
            row=[u];j=i+1
            while j<n and units[j]['k']=='field' and abs(units[j]['top']-u['top'])<3: row.append(units[j]);j+=1
            blocks.append({'k':'fields','items':row});i=j
        elif u['k']=='check':
            row=[u];j=i+1
            while j<n and units[j]['k']=='check' and units[j]['y']-units[j-1]['y']<30: row.append(units[j]);j+=1
            blocks.append({'k':'checklist','items':row});i=j
        else: blocks.append(u);i+=1
    return blocks

def ftype(label,kind='text'):
    if kind=='check': return 'check'
    l=label.lower()
    if re.search(r'(^|\s)(godz\.|godzina)(\s|$)',l): return 'time'
    if re.search(r'gps|współrzędne',l): return 'gps'
    if '[' in label: return 'num'
    return 'text'
COUNT=collections.Counter()
form={'id':FID,'defVersion':'1.0.0','title':title,'subtitle':sub,'aliases':{},'sections':[]}
pdfseen=[]
for s in sections:
    bl=final_blocks(build_section(s))
    sid=s['id'];n=0;tn=0
    ob=[]
    def nid():
        global n
        n+=1;return f'{FID}.{sid}.{n}'
    for b in bl:
        if b['k']=='fields':
            ob.append({'k':'fields','items':[{'id':nid(),'pdf':f['pdf'],'label':f['label'],'type':ftype(f['label']),'w':f['w'],'rows':max(1,round(f['h']/11)) if f['h']>16 else 1} for f in b['items']]})
        elif b['k']=='group':
            ob.append({'k':'group','label':b['label'],'items':[dict({'id':nid(),'pdf':o['pdf'],'type':o['kind'],'label':o['label']},**({'w':o['w']} if o['kind']=='text' else {})) for o in sorted(b['opts'],key=lambda o:(round(o['y']/7),o['x']))]})
        elif b['k']=='checklist':
            ob.append({'k':'checklist','items':[{'id':nid(),'pdf':c['pdf'],'label':c['label']} for c in b['items']]})
        elif b['k']=='table':
            tn+=1
            cols=b['cols'];rows=[]
            for ri,row in enumerate(b['grid']):
                rows.append([{'id':f'{FID}.{sid}.t{tn}.r{ri+1}.c{ci+1}','pdf':pdfn} if pdfn else None for ci,pdfn in enumerate(row)])
            ob.append({'k':'table','tid':f't{tn}','nr':b['nr'],'rn':b['rn'],'cols':[{'head':c['head'],'w':c['w'],'type':ftype(c['head'],c['kind'])} for c in cols],'rows':rows,'rowh':round(max(b['rowh']),1),'prefix':f'{FID}.{sid}.t{tn}'})
        elif b['k'] in('note','subhead','text','sig'):
            ob.append({'k':b['k'],'text':b['text']})
        elif b['k']=='sketchlabel':
            ob.append({'k':'sketch','label':b['text'],'id':f'{FID}.{sid}.sketch'})
    form['sections'].append({'id':sid,'title':s['title'],'blocks':ob})
json.dump(form,open(out,'w'),ensure_ascii=False,indent=1)
print('sekcje',len(form['sections']))
