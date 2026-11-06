#!/usr/bin/env python3
"""Generuje definicję formularza (forms/NN.json) z PDF wzoru na podstawie położeń tekstu, pól i grafiki wektorowej.
Użycie: python -I tools/gen_form.py <plik.pdf> <NN> <out.json>   (wymaga pdfplumber, pypdf)"""
import sys,re,json,collections,os
import pdfplumber
from pypdf import PdfReader

pdf,FID,out=sys.argv[1],sys.argv[2],sys.argv[3]
PH=841.89
# Obszary rysunków (strona 1-based -> lista (y_góra, y_dół) w pt, od góry strony).
# Pola i tekst w obszarze tworzą „rysunek” (SVG + klikalne strefy w położeniach pól PDF).
FIG={'02':{3:[(68,718)],4:[(113,520)]},
     '03':{4:[(68,711)],5:[(115,491)]},
     '04':{4:[(79,564)],5:[(113,483)]},
     '05':{4:[(87,506)],5:[(113,420)]},
     '07':{2:[(69,212),(256,400),(525,760)],3:[(70,371)]}}.get(FID,{})
SKIP_PREFIX='MZ_OPIS_CD'

def hexc(c):
    if not c: return None
    c=tuple(c)
    if len(c)==1: c=(c[0],)*3
    if len(c)==4:
        k=c[3];c=tuple((1-x)*(1-k) for x in c[:3])
    if len(c)!=3: return None
    return '#%02x%02x%02x'%tuple(max(0,min(255,round(x*255))) for x in c)

def cls(c):
    col=tuple(round(x,2) for x in (c['non_stroking_color'] or ()))
    fn=c['fontname'];bold='Bold' in fn;ital='Italic' in fn;sz=c['size']
    if col==(1.0,1.0,1.0): return 'title' if bold else 'subtitle'
    if col==(0.84,0.87,0.92): return 'subtitle'
    navy=col==(0.12,0.23,0.37); gray=col==(0.36,0.4,0.46)
    if navy and bold: return 'sec' if sz>=8 else 'th'
    if navy: return 'sec'
    if gray and ital: return 'note'
    if gray and bold and sz<=6.5: return 'th'
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
        if cur and cur['cls']==k and cur['ty']==ty and c['x0']-cur['x1']<(1.0 if k in('th','lab') else 5.0):
            cur['t']+=(' ' if c['x0']-cur['x1']>1.2 and not c['text'].isspace() and not cur['t'].endswith(' ') else '')+c['text'];cur['x1']=c['x1'];cur['bot']=max(cur['bot'],c['bottom'])
        else:
            cur={'cls':k,'ty':ty,'t':c['text'],'x0':c['x0'],'x1':c['x1'],'top':c['top'],'bot':c['bottom'],'sz':c['size'],
                 'bold':'Bold' in c['fontname'],'ital':'Italic' in c['fontname'],'col':hexc(c['non_stroking_color']),'base':PH-c['matrix'][5]};runs.append(cur)
    for r in runs:
        r['sp']=r['t'].endswith(' ');r['lsp']=r['t'].startswith(' ')
        r['t']=re.sub(r'\s+',' ',r['t']).strip()
        if r['cls']=='th' and (re.fullmatch(r'[A-Z]?\d{1,2}[a-z]?',r['t']) or (re.fullmatch(r'[A-Z]',r['t']) and r['x0']<50)): r['cls']='opt'
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

def rules_of(pg):
    """cienkie poziome linie (kreski podpisów)"""
    return [(o['x0'],o['x1'],o['top']) for o in pg.lines+pg.rects if o['height']<1.6 and o['width']>30]

rd=PdfReader(pdf)
pl=pdfplumber.open(pdf)
title=sub=''
pages_data=[]
for pi,pg in enumerate(pl.pages):
    pages_data.append({'runs':page_runs(pg),'ws':[w for w in widgets(rd.pages[pi]) if not w['pdf'].startswith(SKIP_PREFIX)],'rules':rules_of(pg),'pg':pg})

# ---------- podział na sekcje (kolejność czytania) ----------
items=[]
for pi,pd in enumerate(pages_data):
    for r in pd['runs']:
        if r['top']<36 and r['cls'] in('lab','opt'): continue
        if r['top']>800: continue
        if r['cls']=='title':
            if pi==0 and r['top']<90: title=r['t']
            continue
        if r['cls']=='subtitle':
            if pi==0 and r['top']<90: sub=r['t']
            continue
        items.append((pi,r['top'],r['x0'],'run',r))
    for w in pd['ws']: items.append((pi,w['top'],w['x0'],'w',w))
items.sort(key=lambda t:(t[0],round(t[1]/1.0),t[2]))
sections=[{'id':'W','title':'','items':[],'skip':False}]
for it in items:
    pi,top,x0,k,o=it
    if k=='run' and o['cls']=='sec' and (re.match(r'^[A-Z]\d?\.\s',o['t']) or o['t'].startswith('ZADANIA SPECJALNE')):
        m=re.match(r'^([A-Z]\d?)\.\s',o['t'])
        sections.append({'id':m.group(1) if m else 'Z','title':o['t'],'items':[],'skip':'CIĄG DALSZY' in o['t']})
    else: sections[-1]['items'].append(it)
sections=[s for s in sections if not s['skip'] and (s['title'] or s['items'])]

def ov(a0,a1,b0,b1): return min(a1,b1)-max(a0,b0)
def Y(p,o): return p*1000+o['top']
RGN=[(p,y0,y1) for p,l in FIG.items() for (y0,y1) in l]

def in_region(p1,top,bot):
    for (p,y0,y1) in RGN:
        if p==p1 and y0<=(top+bot)/2<y1: return (p,y0,y1)
    return None

# ---------- rysunek ----------
def shape_dict(o,kind):
    sf=hexc(o.get('non_stroking_color')) if o.get('fill') else None
    ss=hexc(o.get('stroking_color')) if o.get('stroke') else None
    if not sf and not ss: return None
    base={'f':sf,'s':ss,'w':round(float(o.get('linewidth') or 0.5),2)}
    if o.get('evenodd'): base['eo']=1
    d=o.get('dash')
    if d and d[0]: base['da']=[round(x,1) for x in d[0]]
    if kind=='rect':
        base.update({'t':'r','x':round(o['x0'],1),'y':round(o['top'],1),'W':round(o['width'],1),'H':round(o['height'],1)})
        return base
    path=o.get('path')
    if not path:
        pts=o.get('pts') or []
        if len(pts)<2: return None
        path=[('m',pts[0])]+[('l',p) for p in pts[1:]]
    seg=[]
    for op in path:
        c=op[0]
        if c=='m': seg.append('M%.1f %.1f'%tuple(op[1]))
        elif c=='l': seg.append('L%.1f %.1f'%tuple(op[1]))
        elif c=='c': seg.append('C%.1f %.1f %.1f %.1f %.1f %.1f'%(tuple(op[1])+tuple(op[2])+tuple(op[3])))
        elif c=='h': seg.append('Z')
    base.update({'t':'p','d':''.join(seg)})
    return base

def build_figure(p1,y0,y1):
    pd=pages_data[p1-1];pg=pd['pg']
    runs=[r for r in pd['runs'] if y0<=(r['top']+r['bot'])/2<y1 and r['top']>=36]
    ws=[w for w in pd['ws'] if y0<=(w['top']+w['bot'])/2<y1]
    wb=[(w['x0'],w['top'],w['x1'],w['bot']) for w in ws]
    def is_wbox(o):
        return any(abs(o['x0']-a)<1.6 and abs(o['top']-b)<1.6 and abs(o['x1']-c)<1.6 and abs(o['bottom']-d)<1.6 for (a,b,c,d) in wb)
    shapes=[]
    for kind,lst in(('rect',pg.rects),('curve',pg.curves),('line',pg.lines)):
        for o in lst:
            cy=(o['top']+o['bottom'])/2
            if not(y0<=cy<y1) or o['bottom']-o['top']>y1-y0+2: continue
            if kind=='rect' and is_wbox(o): continue
            d=shape_dict(o,kind)
            if d: shapes.append(d)
    texts=[{'x':round(r['x0'],1),'y':round(r['base'],1),'t':r['t'],'sz':round(r['sz'],1),'b':r['bold'],'i':r['ital'],'c':r['col'] or '#1a1a1a'} for r in runs]
    legend={}
    srt=sorted(runs,key=lambda r:(round(r['top']),r['x0']))
    for r in srt:
        if re.fullmatch(r'\d{1,2}',r['t']):
            for q in srt:
                if q is not r and abs(q['top']-r['top'])<2 and 0<=q['x0']-r['x1']<14 and not re.fullmatch(r'[\dLP]+',q['t']) and q['x0']>400:
                    legend.setdefault(r['t'],q['t']);break
    def near_label(w):
        cy=(w['top']+w['bot'])/2
        if w['kind']=='check':
            c=[r for r in runs if abs((r['top']+r['bot'])/2-cy)<6 and (-14<=r['x0']-w['x1']<=14 or -14<=w['x0']-r['x1']<=14) and r['cls']!='sec']
            if c:
                r=min(c,key=lambda r:min(abs(r['x0']-w['x1']),abs(w['x0']-r['x1'])))
                t=r['t'];m=re.fullmatch(r'(\d+)([LP])?',t)
                if m and m.group(1) in legend: t=f"{t} · {legend[m.group(1)]}"
                return t
            cx=(w['x0']+w['x1'])/2
            def dist(r):
                dx=max(r['x0']-cx,0,cx-r['x1']);dy=max(r['top']-cy,0,cy-r['bot'])
                return (dx*dx+dy*dy)**.5
            near=[r for r in runs if r['cls']!='sec' and len(r['t'])<=40 and dist(r)<=24]
            if near:
                r=min(near,key=dist);t=r['t'];m=re.fullmatch(r'(\d+)([LP])?',t)
                if m and m.group(1) in legend: t=f"{t} · {legend[m.group(1)]}"
                return t
            return ''
        c=[r for r in runs if r['bot']<=w['top']+2 and w['top']-r['bot']<12 and ov(r['x0'],r['x1'],w['x0'],w['x1'])>0]
        if c: return max(c,key=lambda r:r['bot'])['t']
        c=[r for r in runs if abs((r['top']+r['bot'])/2-cy)<7 and 0<=w['x0']-r['x1']<16]
        if c: return max(c,key=lambda r:r['x1'])['t']
        c=[r for r in runs if w['x0']-1<=r['x0'] and r['x1']<=w['x1']+1 and abs((r['top']+r['bot'])/2-cy)<8]
        return c[0]['t'] if c else ''
    spots=[]
    for w in sorted(ws,key=lambda w:(round((w['top']+w['bot'])/2/6),w['x0'])):
        spots.append({'pdf':w['pdf'],'type':'check' if w['kind']=='check' else 'text','x':round((w['x0']+w['x1'])/2,1),'y':round((w['top']+w['bot'])/2,1),
                      'w':round(w['x1']-w['x0'],1),'h':round(w['bot']-w['top'],1),'label':near_label(w)})
    X0,X1=24,571
    return {'k':'figure','vb':[X0,y0,X1-X0,y1-y0],'shapes':shapes,'texts':texts,'spots':spots}

# ---------- budowa sekcji ----------
def build_section(sec):
    its=sec['items']
    myr=set()
    for pi,top,x0,k,o in its:
        r=in_region(pi+1,o['top'],o['bot'])
        if r: myr.add(r)
    infig=lambda pi,o:in_region(pi+1,o['top'],o['bot']) is not None
    runs=[(i[0],i[4]) for i in its if i[3]=='run' and not infig(i[0],i[4])]
    ws=[(i[0],i[4]) for i in its if i[3]=='w' and not infig(i[0],i[4])]
    used_r=set();used_w=set()
    units=[{'y':(r[0]-1)*1000+r[1],'x':0,'k':'figure','fig':build_figure(*r)} for r in sorted(myr)]
    # ----- tabele -----
    ths=[(p,r) for p,r in runs if r['cls']=='th' and not (r['x0']<38.5 and len(r['t'])>8)]
    bands=[]
    for p,r in sorted(ths,key=lambda t:(t[0],t[1]['top'],t[1]['x0'])):
        if bands and bands[-1]['p']==p and r['top']-bands[-1]['bot']<8 and r['top']>=bands[-1]['top']-1:
            b=bands[-1];b['runs'].append(r);b['bot']=max(b['bot'],r['bot'])
        else: bands.append({'p':p,'top':r['top'],'bot':r['bot'],'runs':[r]})
    tables=[]
    for bi,b in enumerate(bands):
        nxt=bands[bi+1] if bi+1<len(bands) else None
        limit=Y(nxt['p'],nxt) if nxt else 1e9
        cand=[(p,w) for p,w in ws if id(w) not in used_w and (p,w['top'])>(b['p'],b['bot']-1) and Y(p,w)<limit]
        cand.sort(key=lambda t:(t[0],t[1]['top'],t[1]['x0']))
        rows=[]
        for p,w in cand:
            if rows and rows[-1]['p']==p and w['top']<rows[-1]['bot']-1.5: rows[-1]['ws'].append(w);rows[-1]['bot']=max(rows[-1]['bot'],w['bot'])
            else: rows.append({'p':p,'top':w['top'],'bot':w['bot'],'ws':[w]})
        good=[];sig=None
        for r in rows:
            xs=[round(w['x0']) for w in r['ws']]
            if sig is None:
                if len(xs)>=2 and r['top']-b['bot']<40 and r['p']==b['p']: sig=xs;good.append(r)
                else: break
            else:
                if r['p']!=good[-1]['p']: break
                if all(any(abs(x-sx)<=2 for sx in sig) for x in xs) and len(xs)>=max(2,len(sig)-2) and r['top']-good[-1]['top']<45: good.append(r)
                else: break
        if not good:
            hs=sorted(b['runs'],key=lambda r:r['x0'])
            if len(hs)>=2:
                body=sorted([(p,r) for p,r in runs if p==b['p'] and id(r) not in used_r and r['top']>b['bot']-0.5 and r['cls'] in('opt','lab')],key=lambda t:(t[1]['top'],t[1]['x0']))
                lines=[];last=b['bot']-3
                for p,r in body:
                    if r['top']-last>15 and not (lines and abs(r['top']-lines[-1]['top'])<2.5): break
                    if lines and abs(r['top']-lines[-1]['top'])<2.5: lines[-1]['rs'].append(r)
                    else:
                        if lines and r['top']-lines[-1]['top']>15: break
                        lines.append({'top':r['top'],'rs':[r]})
                    last=r['top']
                if len(lines)>=2 and any(len(l['rs'])>=2 for l in lines):
                    # komórki w linii: fragmenty rozdzielone odstępem >10 pt
                    lcells=[]
                    for l in lines:
                        cs=[]
                        for r in sorted(l['rs'],key=lambda r:r['x0']):
                            if cs and r['x0']-cs[-1]['x1']<=10: cs[-1]['t']+=' '+r['t'];cs[-1]['x1']=r['x1']
                            else: cs.append({'x0':r['x0'],'x1':r['x1'],'t':r['t']})
                            used_r.add(id(r))
                        lcells.append(cs)
                    xs0=sorted(c['x0'] for cs in lcells for c in cs)
                    cl=[]
                    for x in xs0:
                        if cl and x-cl[-1][-1]<=10: cl[-1].append(x)
                        else: cl.append([x])
                    lefts=[sum(c)/len(c) for c in cl]
                    if len(lefts)!=len(hs): lefts=[(h['x0']+h['x1'])/2 for h in hs]
                    rowsS=[]
                    for cs in lcells:
                        cells=['']*len(hs)
                        for c in cs:
                            ci=min(range(len(lefts)),key=lambda i:abs(lefts[i]-c['x0']))
                            cells[ci]=(cells[ci]+' '+c['t']).strip()
                        rowsS.append(cells)
                    tops=[l['top'] for l in lines]
                    # komórki zawinięte/wyśrodkowane w pionie: wiersz z jedną niepustą komórką scal z sąsiednim
                    i=0
                    while i<len(rowsS):
                        ne=[k for k,v in enumerate(rowsS[i]) if v]
                        if len(ne)==1 and len(rowsS)>1:
                            c=ne[0]
                            if i+1<len(rowsS) and tops[i+1]-tops[i]<=9.5 and not rowsS[i+1][c] and any(rowsS[i+1]):
                                rowsS[i+1][c]=rowsS[i][c];del rowsS[i];del tops[i];continue
                            if i>0 and tops[i]-tops[i-1]<=9.5 and any(rowsS[i-1]):
                                rowsS[i-1][c]=(rowsS[i-1][c]+' '+rowsS[i][c]).strip();del rowsS[i];del tops[i];continue
                        i+=1
                    for r in b['runs']: used_r.add(id(r))
                    units.append({'y':Y(b['p'],b),'x':0,'k':'stable','heads':[h['t'] for h in hs],'rows':rowsS})
            continue
        for r in b['runs']: used_r.add(id(r))
        for r in good:
            for w in r['ws']: used_w.add(id(w))
        xs=sorted({round(w['x0']) for r in good for w in r['ws']})
        cl=[]
        for x in xs:
            if cl and x-cl[-1][-1]<=2: cl[-1].append(x)
            else: cl.append([x])
        colx=[sum(c)/len(c) for c in cl]
        cols=[]
        for cx0 in colx:
            w0=next(w for r in good for w in r['ws'] if abs(w['x0']-cx0)<=2.5)
            cols.append({'w':round(w0['x1']-w0['x0'],1),'kind':w0['kind'],'cx':(w0['x0']+w0['x1'])/2,'xl':w0['x0'],'xr':w0['x1'],'grp':'','sub':''})
        lead=[];hr=[]
        for r in sorted(b['runs'],key=lambda r:(r['top'],r['x0'])):
            if r['x1']<=colx[0]+1: lead.append(r['t'])
            else: hr.append(r)
        mid=lambda r:(r['x0']+r['x1'])/2
        groups=[r for r in hr if sum(1 for q in hr if q['top']>r['top']+3 and abs(mid(q)-mid(r))<=28)>=2]
        def col_for(r):
            m=mid(r)
            for col in cols:
                if col['xl']-2<=m<=col['xr']+2: return col
            for col in cols:
                if col['xl']-3<=r['x0']<=col['xr']+3: return col
            return min(cols,key=lambda c:abs(c['cx']-m))
        for r in hr:
            if any(r is g for g in groups): continue
            c=col_for(r);c['sub']=(c['sub']+' '+r['t']).strip()
        for c in cols:
            if c['sub'] and groups:
                g=min(groups,key=lambda g:abs(mid(g)-c['cx']))
                if abs(mid(g)-c['cx'])<50: c['grp']=g['t']
        for c in cols: c['head']=c['sub']
        tgroups=[]
        for i,c in enumerate(cols):
            if c['grp']:
                if tgroups and tgroups[-1]['t']==c['grp'] and tgroups[-1]['c1']==i-1: tgroups[-1]['c1']=i
                else: tgroups.append({'t':c['grp'],'c0':i,'c1':i})
        labels=[]
        for r in good:
            t0=min(w['top'] for w in r['ws'])-3;t1=max(w['bot'] for w in r['ws'])+3
            lab=[rr for p,rr in runs if p==r['p'] and id(rr) not in used_r and rr['cls'] in('opt','grp','lab','note') and rr['x1']<=colx[0]+2 and t0<=(rr['top']+rr['bot'])/2<=t1 and rr['x0']>=30]
            lab.sort(key=lambda rr:(round(rr['top']/3),rr['x0']))
            for rr in lab: used_r.add(id(rr))
            txt='';prev=None
            for rr in lab:
                if prev is None: txt=rr['t']
                else: txt+=(' ' if (round(rr['top']/3)!=round(prev['top']/3) or rr['x0']-prev['x1']>1.2 or prev.get('sp') or rr.get('lsp')) else '')+rr['t']
                prev=rr
            labels.append(txt)
        grid=[[next((w for w in r['ws'] if abs(w['x0']-cx0)<=2.5),None) for cx0 in colx] for r in good]
        lx=[rr['x0'] for rr in b['runs'] if rr['x1']<=colx[0]+1]
        tables.append({'p':b['p'],'top':b['top'],'cols':cols,'groups':tgroups,'grid':grid,'labels':labels,'lead':' '.join(lead),'heads':[(c['grp']+'|'+c['sub']) for c in cols],'colx':colx,
                       'leadx':min(lx+[colx[0]]) if not any(labels) else min(34,*(lx or [34])),'rowh':max(w['bot']-w['top'] for r in good for w in r['ws'])})
    merged=[]
    for t in tables:
        m=merged[-1] if merged else None
        if m and t['p']==m['p_last']+1 and t['heads']==m['heads'] and len(t['colx'])==len(m['colx']):
            m['grid']+=t['grid'];m['labels']+=t['labels'];m['p_last']=t['p']
        else: t['p_last']=t['p'];merged.append(t)
    for t in merged: units.append({'y':Y(t['p'],t),'x':0,'k':'table','t':t})
    # ----- reszta -----
    rest_r=[(p,r) for p,r in runs if id(r) not in used_r];rest_w=[(p,w) for p,w in ws if id(w) not in used_w]
    rest_r.sort(key=lambda t:(t[0],t[1]['top'],t[1]['x0']));rest_w.sort(key=lambda t:(t[0],t[1]['top'],t[1]['x0']))
    grps=[]
    for p,r in rest_r:
        if sec['id']!='W' and r['cls']=='grp' and r['x0']<80:
            if grps and grps[-1][0]==p and 0<r['top']-grps[-1][1]['bot']<=3 and abs(r['x0']-grps[-1][1]['x0'])<3 and r['x1']<150:
                g=grps[-1][1];g['t']+=' '+r['t'];g['bot']=r['bot'];g['x1']=max(g['x1'],r['x1']);grps[-1][2].append(r)
            else: grps.append([p,dict(r),[r]])
    taken_w=set();taken_r=set()
    for p,g,members in grps:
        mem={id(m) for m in members}
        end=1e9
        for q,r in rest_r:
            if (q,r['top'])>(p,g['top']+2) and r['x0']<100 and id(r) not in mem and Y(q,r)>=Y(p,g)+4:
                end=Y(q,r)-3.5;break
        y0=Y(p,g)-3
        opts=[]
        gw=[(q,w) for q,w in rest_w if y0<=Y(q,w)<end and w['x0']>=g['x1']-2 and id(w) not in taken_w]
        gw.sort(key=lambda t:(t[1]['kind']!='check',t[0],t[1]['top'],t[1]['x0']))
        for q,w in gw:
            taken_w.add(id(w));cy=(w['top']+w['bot'])/2
            if w['kind']=='check':
                lab=[r for qq,r in rest_r if qq==q and abs(r['top']-w['top'])<5 and r['x0']>=w['x1']-1 and r['x0']<w['x1']+6 and id(r) not in taken_r]
                t=''
                if lab:
                    r=lab[0];taken_r.add(id(r));t=r['t']
                    for q2,r2 in rest_r:
                        if q2==q and id(r2) not in taken_r and r2['cls']==r['cls'] and abs(r2['x0']-r['x0'])<2 and 0<r2['top']-r['top']<11 and r2['top']-r['bot']<3.5:
                            t+=' '+r2['t'];taken_r.add(id(r2))
                opts.append({'pdf':w['pdf'],'kind':'check','label':t,'y':cy,'x':w['x0']})
            else:
                lab=[r for qq,r in rest_r if qq==q and abs(r['top']-w['top'])<6 and r['x1']<=w['x0']+1 and r['x1']>w['x0']-14 and id(r) not in taken_r and r['cls']=='opt']
                for r in lab: taken_r.add(id(r))
                opts.append({'pdf':w['pdf'],'kind':'text','label':lab[0]['t'] if lab else '','w':round(w['x1']-w['x0'],1),'y':cy,'x':w['x0']})
        for m in members: taken_r.add(id(m))
        units.append({'y':Y(p,g),'x':g['x0'],'k':'group','label':g['t'],'opts':opts})
    for p,w in [(p,w) for p,w in rest_w if id(w) not in taken_w]:
        if w['kind']=='text':
            above=[r for q,r in rest_r if q==p and id(r) not in taken_r and r['cls'] in('lab','note','opt','grp') and r['bot']<=w['top']+1.5 and w['top']-r['bot']<9 and ov(r['x0'],r['x1'],w['x0'],w['x1'])>-1 and r['x0']>=w['x0']-6]
            above.sort(key=lambda r:r['top'])
            base={'y':Y(p,w),'x':w['x0'],'k':'field','pdf':w['pdf'],'w':round(w['x1']-w['x0'],1),'h':round(w['bot']-w['top'],1),'top':w['top'],'pg':p}
            if above:
                lab=' '.join(r['t'] for r in above if r['cls']=='lab')
                for r in above:
                    if r['cls']=='lab': taken_r.add(id(r))
                units.append(dict(base,label=lab));taken_w.add(id(w));continue
            left=[r for q,r in rest_r if q==p and id(r) not in taken_r and abs(r['top']-w['top'])<7 and r['x1']<=w['x0']+1 and w['x0']-r['x1']<14 and r['cls'] in('opt','lab','grp')]
            if left:
                r=max(left,key=lambda r:r['x1']);taken_r.add(id(r))
                units.append(dict(base,label=r['t'],x=r['x0']));taken_w.add(id(w));continue
            units.append(dict(base,label=''));taken_w.add(id(w))
        else:
            lab=[r for q,r in rest_r if q==p and abs(r['top']-w['top'])<5 and r['x0']>=w['x1']-1 and r['x0']<w['x1']+6 and id(r) not in taken_r]
            t=''
            if lab:
                r=lab[0];taken_r.add(id(r));t=r['t']
                for q,r2 in rest_r:
                    if q==p and id(r2) not in taken_r and r2['cls']==r['cls'] and abs(r2['x0']-r['x0'])<2 and 0<r2['top']-r['top']<11 and r2['top']-r['bot']<3.5:
                        t+=' '+r2['t'];taken_r.add(id(r2))
            units.append({'y':Y(p,w),'x':w['x0'],'k':'check','label':t,'pdf':w['pdf'],'top':w['top'],'pg':p});taken_w.add(id(w))
    for p,r in rest_r:
        if id(r) in taken_r:continue
        if r['cls']=='note': kind='note'
        elif sec['id']=='W': kind='text'
        elif r['cls'] in('th','grp'): kind='subhead'
        elif r['cls']=='lab':
            if r['t'].startswith('Pole szkicu'): kind='sketchlabel'
            else: kind='sig' if any(a-2<=r['x0']<=b and 1<=r['top']-y<=10 for a,b,y in pages_data[p]['rules']) else 'note'
        else: kind='text'
        units.append({'y':Y(p,r),'x':r['x0'],'x1':r['x1'],'sp':r['sp'],'lsp':r['lsp'],'k':kind,'text':r['t'],'runs':[{'t':r['t'],'b':r['bold']}]})
        taken_r.add(id(r))
    units.sort(key=lambda u:(u['y'],u['x']))
    return units

def final_blocks(units):
    out=[]
    for u in units:
        p=out[-1] if out else None
        if p and u['k'] in('text','note') and p['k']==u['k']:
            if abs(u['y']-p['y_last'])<2.5 and u['x']>p['x']:
                sep=' ' if (u['x']-p['x_end']>1.2 or p.get('sp_end') or u.get('lsp')) else ''
                p['runs']+=([{'t':sep}] if sep else [])+u['runs'];p['text']+=sep+u['text'];p['x_end']=u['x1'];p['sp_end']=u.get('sp',False);continue
            if 0<u['y']-p['y_last']<=11.5 and abs(u['x']-p['x'])<=40 and not re.match(r'^\d+\.(\s|$)',u['text']) and (u['k']=='note' or u['x']>=p['x']-1):
                p['runs']+=[{'t':' '},*u['runs']];p['text']+=' '+u['text'];p['y_last']=u['y'];p['x_end']=u['x1'];continue
        v=dict(u);v['y_last']=u['y'];v['x_end']=u.get('x1',0);v['sp_end']=u.get('sp',False);out.append(v)
    seen=set();u2=[]
    for u in out:
        if u['k']=='subhead':
            if u['text'] in seen: continue
            seen.add(u['text'])
        u2.append(u)
    units=u2
    blocks=[];i=0;n=len(units)
    while i<n:
        u=units[i]
        if u['k']=='field':
            row=[u];j=i+1
            while j<n and units[j]['k']=='field' and units[j]['pg']==u['pg'] and abs(units[j]['top']-u['top'])<3: row.append(units[j]);j+=1
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

form={'id':FID,'defVersion':'1.0.0','title':title,'subtitle':sub,'aliases':{},'sections':[]}
for s in sections:
    bl=final_blocks(build_section(s))
    sid=s['id'];cnt=[0];tn=0
    ob=[]
    def nid():
        cnt[0]+=1;return f'{FID}.{sid}.{cnt[0]}'
    for b in bl:
        k=b['k']
        if k=='fields':
            ob.append({'k':'fields','items':[{'id':nid(),'pdf':f['pdf'],'label':f['label'],'type':ftype(f['label']),'w':f['w'],'rows':max(1,round(f['h']/11)) if f['h']>16 else 1} for f in b['items']]})
        elif k=='group':
            ob.append({'k':'group','label':b['label'],'items':[dict({'id':nid(),'pdf':o['pdf'],'type':o['kind'],'label':o['label']},**({'w':o['w']} if o['kind']=='text' else {})) for o in sorted(b['opts'],key=lambda o:(round(o['y']/7),o['x']))]})
        elif k=='checklist':
            ob.append({'k':'checklist','items':[{'id':nid(),'pdf':c['pdf'],'label':c['label']} for c in b['items']]})
        elif k=='table':
            t=b['t'];tn+=1
            hasl=any(t['labels']) or bool(t['lead'])
            rows=[[({'id':f'{FID}.{sid}.t{tn}.r{ri+1}.c{ci+1}','pdf':w['pdf']} if w else None) for ci,w in enumerate(row)] for ri,row in enumerate(t['grid'])]
            ob.append({'k':'table','tid':f't{tn}','prefix':f'{FID}.{sid}.t{tn}','lead':(t['lead'] if hasl else None),'groups':t['groups'],'leadw':round(t['colx'][0]-t['leadx'],1) if hasl else 0,'labels':t['labels'],
                       'cols':[{'head':c['head'],'w':c['w'],'type':ftype(c['sub'] or c['head'],c['kind'])} for c in t['cols']],'rows':rows,'rowh':round(t['rowh'],1)})
        elif k=='stable':
            ob.append({'k':'stable','heads':b['heads'],'rows':b['rows']})
        elif k=='figure':
            f=dict(b['fig'])
            for sp in f['spots']: sp['id']=nid()
            f['fid']=f"fig{sum(1 for x in ob if x['k']=='figure')+1}"
            ob.append(f)
        elif k in('note','subhead','text','sig'):
            d={'k':k,'text':b['text']}
            if k=='text' and any(r.get('b') for r in b['runs']): d['runs']=b['runs']
            ob.append(d)
        elif k=='sketchlabel':
            ob.append({'k':'sketch','label':b['text'],'id':f'{FID}.{sid}.sketch'})
    form['sections'].append({'id':sid,'title':s['title'],'blocks':ob})
json.dump(form,open(out,'w'),ensure_ascii=False,indent=None,separators=(',',':'))
print('sekcje',len(form['sections']))

# ---------- audyt: czy każdy fragment tekstu wzoru (>=4 znaki) trafił do definicji ----------
def _collect(o,acc):
    if isinstance(o,dict):
        for k,v in o.items():
            if k in('label','text','head','lead','title','subtitle','t') and isinstance(v,str): acc.append(v)
            elif k=='labels': acc.extend(v)
            elif k=='heads': acc.extend(v)
            elif k=='rows' and isinstance(v,list) and v and isinstance(v[0],list) and v[0] and isinstance(v[0][0],str):
                for rr in v: acc.extend(rr)
            elif k=='runs': pass
            else: _collect(v,acc)
    elif isinstance(o,list):
        for v in o: _collect(v,acc)
_acc=[];_collect(form,_acc)
_J=re.sub(r'\s+','',' '.join(_acc))
_miss=[]
for s in sections:
    for pi,top,x0,k,o in s['items']:
        if k=='run':
            t=re.sub(r'\s+','',o['t'])
            if len(t)>=4 and t not in _J: _miss.append((pi+1,round(top),o['t']))
print('AUDIT: fragmentów tekstu bez odpowiednika w definicji:',len(_miss))
for m in _miss[:30]: print('  ',m)
