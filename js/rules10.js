// Reguły [auto] formularza 10 (hulajnoga elektryczna / UTO): wyniki wyliczane z wpisanych danych, nie są zapisywane w pliku sprawy.
// Komunikaty nie blokują zapisu. Źródło reguł: specyfikacja formularza 10 (R1–R14).
const NZ = 'NZ', INFO = 'info';
const f1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const f2 = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const parseNum = t => { if (t == null) return null; const m = /-?\d+(?:[.,]\d+)?/.exec(String(t)); return m ? parseFloat(m[0].replace(',', '.')) : null; };
function parseDate(t) {
  const s = String(t || '').trim(); let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/.exec(s); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}

export function autoText(def, get, rule) {
  const R = build(def, get);
  const fn = R.out[rule];
  if (!fn) return '';
  const r = fn();
  return Array.isArray(r) ? r.map(x => x.t).join('\n') : String(r || '');
}
// wszystkie linie z poziomem (do R.1 i eksportu)
export function autoLines(def, get, rule) { const R = build(def, get); const r = R.out[rule] && R.out[rule](); return Array.isArray(r) ? r : []; }

function build(def, get) {
  const K = k => get(def.keys[k]);
  const sel = k => (def.groups[k] || []).filter(([, id]) => get(id) === true).map(([l]) => l);
  const has = (k, l) => sel(k).includes(l);
  const T = (name, r, c) => get(`${def.tables[name]}.r${r}.c${c}`);
  const txt = (name, r, c) => { const v = T(name, r, c); return v == null ? '' : String(v).trim(); };
  const nrows = (name, n) => Array.from({ length: n }, (_, i) => i + 1);
  const NZchk = (name, r) => T(name, r, 8) === true;     // kolumna WT: Z=7, NZ=8, ND=9
  const Uof = (row) => parseNum(txt('A6', row, 6));       // niepewność z A.6 (waga 1, hamownia 2, rejestrator 3, anemometr 4)
  const out = {};

  // ---- klasyfikacja (R1) ----
  const cls = () => {
    const d1 = sel('D.1'), d2 = sel('D.2'), d3 = sel('D.3'), d4 = sel('D.4'), d5 = sel('D.5'), d7 = sel('D.7');
    const ele = d1.includes('elektryczny');
    if (d1.includes('mięśniowy (brak silnika)')) return 'mięśniowy';
    if (!ele) return null;
    if (d4.includes('brak') && d5.includes('brak') && d2.length && d3.length) {
      if (d2.includes('2') && d3.includes('jest') && d7.includes('stojąca')) return 'hulajnoga';
      if (!d2.includes('2') || d3.includes('brak')) return 'UTO';
    }
    if ((d4.length && !d4.includes('brak')) || d5.includes('są')) return 'inny';
    return null;
  };
  // ---- prędkość (M, N) ----
  const vM = () => {
    const rows = []; for (const r of nrows('M4', 6)) { const v = parseNum(T('M4', r, 3)); if (v != null) rows.push({ v, stan: txt('M4', r, 2).toLowerCase() }); }
    if (!rows.length) return null;
    const zast = rows.filter(x => x.stan.includes('zastan')); const use = zast.length ? zast : rows;
    const vs = use.map(x => x.v), max = Math.max(...vs), avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    const disp = []; for (const r of nrows('M4', 6)) { const a = parseNum(T('M4', r, 3)), b = parseNum(T('M4', r, 4)); if (a && b != null) disp.push((b - a) / a * 100); }
    return { max, avg, spread: Math.max(...vs) - Math.min(...vs), n: vs.length, zast: !!zast.length, U: Uof(2), dispPct: disp.length ? disp.reduce((a, b) => a + b, 0) / disp.length : null };
  };
  const vN = () => {
    const ab = [], ba = [];
    for (const r of nrows('N5', 8)) { const v = parseNum(T('N5', r, 3)); if (v == null) continue; const d = txt('N5', r, 1).replace(/\s/g, '').toUpperCase(); (d.startsWith('B') ? ba : ab).push(v); }
    const n = Math.min(ab.length, ba.length), pairs = []; for (let i = 0; i < n; i++) pairs.push((ab[i] + ba[i]) / 2);
    if (!pairs.length) return ab.length || ba.length ? { max: null, pairs: [], n: 0, partial: ab.length + ba.length } : null;
    return { max: Math.max(...pairs), pairs, n: pairs.length, U: Uof(3), partial: 0 };
  };
  const vmax = () => { const m = vM(), n = vN(); return m ? { v: m.max, U: m.U, src: 'hamownia (M.5)' } : (n && n.max != null ? { v: n.max, U: n.U, src: 'jazda testowa (N.5a)' } : null); };
  const verdict = (x, U, L) => { const u = U || 0; if (x - u > L) return 'NZ'; if (x + u <= L) return 'Z'; return 'nierozstrzygnięte'; };

  // ---- R3 prędkość § 55d ----
  const r3 = () => {
    const L = [], m = vM(), n = vN();
    const one = (v, U, src, warn) => {
      const w = verdict(v, U, 20); const base = `vₘₐₓ = ${f1(v)} km/h${U ? ` ± ${f1(U)}` : ''} (${src})`;
      if (!U) warn.push('bez niepewności – ocena warunkowa');
      if (w === 'NZ') return { lvl: NZ, t: `${base}: NZ – Konstrukcja nie ogranicza rozwijania prędkości przekraczającej 20 km/h (§ 55d WT).` };
      if (w === 'Z') return { lvl: INFO, t: `${base}: Z (≤ 20 km/h w granicach niepewności).` };
      return { lvl: INFO, t: `${base}: nierozstrzygnięte w granicach niepewności.` };
    };
    const warn = [];
    if (m) L.push(one(m.max, m.U, 'hamownia – ma pierwszeństwo', warn));
    if (n && n.max != null) L.push(one(n.max, n.U, m ? 'jazda testowa – dla porównania' : 'jazda testowa', warn));
    if (m && n && n.max != null) L.push({ lvl: INFO, t: `Różnica jazda testowa – hamownia: ${f1(n.max - m.max)} km/h.` });
    if (warn.length) L.push({ lvl: INFO, t: `Uwaga: ${[...new Set(warn)].join('; ')}.` });
    if (!L.length) return [];
    return L;
  };
  out.R3 = r3;
  out.M5 = () => {
    const m = vM(); if (!m) return 'Wpisz wyniki w tabeli M.4.';
    const L = [`vₘₐₓ (największa ze stanu ${m.zast ? 'zastanego' : 'wpisanych przejazdów – brak oznaczenia „zastany”'}): ${f1(m.max)} km/h · średnia: ${f1(m.avg)} km/h · rozrzut: ${f1(m.spread)} km/h · liczba przejazdów: ${m.n}`];
    if (m.n < 3) L.push('Uwaga: wymagane min. 3 przejazdy w stanie zastanym.');
    if (m.dispPct != null) L.push(`Różnica wyświetlacz–hamownia (średnio): ${f1(m.dispPct)} %`);
    for (const x of r3()) L.push(x.t); return L.join('\n');
  };
  out.N5a = () => {
    const n = vN(); if (!n) return 'Wpisz przejazdy w tabeli N.5 (kierunek A→B / B→A).';
    if (n.max == null) return `Brak par przejazdów w przeciwnych kierunkach (wpisano ${n.partial}). Wykonaj przejazd w drugą stronę.`;
    return `vₘₐₓ średnia z par przejazdów w przeciwnych kierunkach: ${n.pairs.map(f1).join(' · ')} km/h; największa: ${f1(n.max)} km/h (par: ${n.n})\n` + r3().filter(x => x.t.includes('jazda testowa')).map(x => x.t).join('\n');
  };
  out.D13 = () => { const v = vmax(), m = vM(), n = vN(); if (!v) return ''; const both = m && n && n.max != null ? `; jazda testowa: ${f1(n.max)} km/h` : ''; return `${f1(v.v)} km/h – źródło: ${v.src}${both}`; };
  out.D11 = () => { const t = K('J.1'); return t ? `${t} W` : ''; };
  out.D12 = () => { const t = K('J.3'); return t ? `${t} V` : ''; };
  out.D14 = () => { const v = K('E.5'); return v ? `${v} kg${K('E.5u') ? ` ± ${K('E.5u')} kg` : ''}` : ''; };

  // ---- R1 ----
  out.R1 = () => {
    const c = cls(), L = [];
    if (c === 'mięśniowy') L.push('Brak napędu – cechy urządzenia wspomagającego ruch (art. 2 pkt 18a PoRD).');
    else if (c === 'hulajnoga') L.push('Cechy hulajnogi elektrycznej (art. 2 pkt 47b PoRD).');
    else if (c === 'UTO') L.push('Cechy UTO (art. 2 pkt 47c PoRD).');
    else if (c === 'inny') L.push('Nie spełnia definicji hulajnogi elektrycznej ani UTO (siedzenie / pedały). Sprawdź kryteria: roweru – art. 2 pkt 47 (napęd pomocniczy uruchamiany naciskiem na pedały, ≤ 48 V, ≤ 250 W, zanik mocy po przekroczeniu 25 km/h), motoroweru – art. 2 pkt 46 (silnik elektryczny ≤ 4 kW, konstrukcja ogranicza prędkość do 45 km/h), motocykla – art. 2 pkt 45 (L3e wg rozp. 168/2013).');
    if (c === 'hulajnoga' || c === 'UTO') {
      if (r3().some(x => x.lvl === NZ)) L.push('Cechy definicji spełnione; konstrukcja nie spełnia § 55d WT.');
      const v = vmax();
      if ((v && v.v > 20) || has('D.10', 'manetką od zera') || has('D.9', 'niemożliwa')) L.push('Parametry istotne dla oceny „pojazdu mechanicznego” (SN III KK 13/22): moc D.11, vₘₐₓ D.13, uruchamianie napędu D.10, odpychanie nogą D.9.');
    }
    if (!L.length) L.push('Nie da się sklasyfikować – uzupełnij sekcję D.');
    L.push('Wynik wstępny – kwalifikację prawną ustala organ.');
    return L.join('\n');
  };

  // ---- R2 wymiary i masa ----
  const lim = (name, x, U, L, unit, norm) => {
    if (x == null) return null;
    const v = verdict(x, U || 0, L), base = `${name} = ${f2(x).replace(/,00$/, '')} ${unit}${U ? ` ± ${String(U).replace('.', ',')} ${unit}` : ''}, limit ${String(L).replace('.', ',')} ${unit} (${norm})`;
    const cond = U ? '' : ' [bez niepewności – ocena warunkowa]';
    return { lvl: v === 'NZ' ? NZ : INFO, t: `${base}: ${v === 'NZ' ? 'NZ' : v === 'Z' ? 'Z' : 'nierozstrzygnięte w granicach niepewności'}${cond}` };
  };
  out.R2 = () => {
    const L = [], c = cls();
    const a = lim('E.1 długość', parseNum(K('E.1')), parseNum(K('E.1u')), 1.4, 'm', '§ 2 ust. 1 pkt 12 WT'); if (a) L.push(a);
    const b = lim('E.2 szerokość', parseNum(K('E.2')), parseNum(K('E.2u')), 0.9, 'm', '§ 2 ust. 13a WT'); if (b) L.push(b);
    if (parseNum(K('E.5')) != null) {
      if (c === 'UTO') L.push({ lvl: INFO, t: 'E.5 masa własna: dla UTO limitu brak – ND.' });
      else { const m = lim('E.5 masa własna', parseNum(K('E.5')), parseNum(K('E.5u')), 30, 'kg', '§ 3 ust. 13a WT'); L.push(c ? m : { ...m, t: m.t + ' [klasyfikacja nieustalona – limit dotyczy tylko hulajnogi elektrycznej]' }); }
    }
    return L;
  };
  out.R14 = () => { const e6 = parseNum(K('E.6')), e7 = parseNum(K('E.7')); return e6 != null && e7 != null && e7 > e6 ? [{ lvl: INFO, t: 'Masa kierującego przekracza maksymalne obciążenie wg producenta.' }] : []; };
  out.E4 = () => { const n = parseNum(K('E.4n')), l = parseNum(K('E.4L')), p = parseNum(K('E.4P')); const L = []; if (n != null && l != null) L.push(`L: ${f1(n - l)} mm`); if (n != null && p != null) L.push(`P: ${f1(n - p)} mm`); return L.length ? 'skrócenie ' + L.join(' · ') : ''; };

  // ---- pozostałe ----
  out.A4 = () => has('A.4', 'tak') ? 'Uszkodzona bateria litowo-jonowa: nie ładuj, nie wykonuj prób z napędem, zabezpiecz w sposób ograniczający skutki pożaru.' : '';
  out.H1 = () => has('H.1', 'nie') ? 'Zmiana rozmiaru koła zmienia wskazanie prędkości na wyświetlaczu.' : '';
  out.R4 = () => {
    const L = []; for (const r of nrows('N7', 6)) { const v = parseNum(T('N7', r, 2)), s = parseNum(T('N7', r, 3)); if (v != null && s != null && s > 0) { const a = (v / 3.6) ** 2 / (2 * s); L.push(`Hamowanie ${r}: v₀ = ${f1(v)} km/h, s = ${f1(s)} m → aₕ = ${f2(a)} m/s² (średnie opóźnienie z drogi hamowania, obejmuje narastanie opóźnienia)`); } }
    return L.join('\n');
  };
  out.R5 = () => {
    const L = [], c = cls(), ids = { 1: '§ 55a ust. 1 pkt 1', 2: '§ 55a ust. 1 pkt 2', 3: '§ 55a ust. 1 pkt 3', 4: '§ 55a ust. 1 pkt 5 / § 55b ust. 1', 5: '§ 55a ust. 1 pkt 5' };
    const names = { 1: 'I.1 światło pozycyjne przednie', 2: 'I.2 światło pozycyjne tylne', 3: 'I.3 odblask tylny', 4: 'I.4 odblaski boczne', 5: 'I.5 dzwonek' };
    for (const r of [1, 2, 3, 4, 5]) { if (c === 'UTO' && r >= 4) continue; if (NZchk('I', r)) L.push({ lvl: NZ, t: `${names[r]} – NZ (${ids[r]} WT).` }); }
    if (c === 'UTO') L.push({ lvl: INFO, t: 'UTO: wiersze I.4 i I.5 – WT = ND.' });
    return L;
  };
  out.R6 = () => { const c = cls(); const s = sel('N.7b'); if (s.includes('NZ') && c !== 'UTO') return [{ lvl: NZ, t: 'G.16 / N.7b – NZ (§ 55a ust. 1 pkt 4 WT: brak skutecznie działającego hamulca).' }]; if (s.includes('NZ')) return [{ lvl: NZ, t: 'N.7b – NZ (§ 55d WT: możliwość skutecznego hamowania).' }]; return []; };
  out.R7 = () => (has('B.5', 'brak') || has('B.5b', 'nie')) ? [{ lvl: NZ, t: 'B.5 – NZ: brak trwałego i czytelnego numeru rozpoznawczego (§ 55a ust. 4 pkt 1 WT / § 55c WT).' }] : [];
  out.R8 = () => { const c = cls(); if (c === 'UTO') return []; const bad = T('F', 9, 2) === true || has('C.9', 'brak') || has('C.9', 'urwana / uszkodzona'); return c !== 'UTO' && bad ? [{ lvl: NZ, t: 'F.9 / C.9 podpórka – NZ: brak lub niesprawna (§ 55a ust. 4 pkt 2 WT).' }] : []; };
  out.R9 = () => has('B.8', 'przed 1.01.2022') ? 'Art. 5 ust. 2 ustawy z 30.03.2021 (Dz.U. poz. 720): wprowadzone do obrotu przed 1.01.2022 mogą nie spełniać warunków technicznych. Oceny NZ pozostają, z tym dopiskiem.' : has('B.8', 'nie ustalono') ? 'Ustal datę wprowadzenia do obrotu (dowód zakupu).' : '';
  out.R10 = () => { const d = parseDate(K('A.1')), age = parseNum(K('O.1')); if (!d || age == null) return age != null ? 'Uzupełnij A.1 Data zdarzenia – od niej zależy ocena.' : '';
    if (d >= new Date(2026, 2, 3) && age < 13) return 'Art. 33d ust. 1 PoRD (dziecko do 13 lat); wyjątek – strefa zamieszkania pod opieką osoby dorosłej (ust. 2). Art. 8 ust. 1 pkt 10a ustawy o kierujących pojazdami – 13 lat.';
    if (d < new Date(2026, 2, 3) && age < 10) return 'Art. 33d ust. 1 PoRD w brzmieniu sprzed 3.03.2026 (dziecko do 10 lat); wyjątek jak wyżej.'; return ''; };
  out.R11 = () => { const d = parseDate(K('A.1')), age = parseNum(K('O.1')); return d && age != null && d >= new Date(2026, 5, 3) && age < 16 && has('O.2', 'nie') ? 'Art. 33 ust. 1b PoRD (obowiązek kasku do 16 lat); art. 89a § 1 k.w. – opiekun.' : ''; };
  out.R12 = () => {
    const L = [];
    if (has('O.4', 'tak:')) L.push('Przewożona osoba / ładunek: art. 33a ust. 3 pkt 2 (hulajnoga) / art. 33b ust. 3 pkt 2 (UTO).');
    if (has('O.5', 'tak:')) L.push('Holowanie / czepianie się: art. 33a ust. 3 pkt 1 / art. 33b ust. 3 pkt 1 oraz art. 33 ust. 3 (czepianie się – hulajnoga).');
    if (has('O.6', 'chodnik / droga dla pieszych')) L.push('Chodnik / droga dla pieszych: art. 33a ust. 2, art. 33b ust. 2, art. 33c (prędkość zbliżona do prędkości pieszego).');
    const lp = parseNum(K('O.6:jezdnia (dopuszczalna prędkość [km/h]):tekst')); if (has('O.6', 'jezdnia (dopuszczalna prędkość [km/h])') && lp != null && lp > 30) L.push('Jezdnia o dopuszczalnej prędkości > 30 km/h: art. 33a ust. 1.');
    const v = parseNum(K('O.8v')); if (v != null && v > 20) L.push('Prędkość w chwili zdarzenia > 20 km/h: art. 20 ust. 6 pkt 4 PoRD.');
    return L.join('\n');
  };
  out.R13 = () => {
    const L = [], used = { 1: parseNum(K('E.5')) != null ? 'E (masa)' : '', 2: vM() ? 'M (hamownia)' : '', 3: vN() ? 'N (jazda testowa)' : '' };
    const nm = { 1: 'waga', 2: 'hamownia', 3: 'rejestrator GNSS' };
    for (const r of [1, 2, 3]) if (used[r] && !txt('A6', r, 3)) L.push({ lvl: INFO, t: `Przyrząd „${nm[r]}” użyty w ${used[r]} bez numeru świadectwa wzorcowania – wynik nie do wykorzystania w opinii.` });
    return L;
  };
  // R.1 zbiorczo
  out.R1all = () => {
    const L = [];
    const add = (rule, label) => { const r = out[rule](); if (Array.isArray(r)) for (const x of r) L.push(`${x.lvl === NZ ? '✗' : '•'} ${x.t}`); else if (r) L.push(`• ${label}${r}`); };
    for (const x of r3()) if (x.lvl === NZ) L.push(`✗ ${x.t}`);
    add('R2'); add('R5'); add('R6'); add('R7'); add('R8'); add('R13'); add('R14');
    add('R9', 'R9: '); add('R10', 'R10: '); add('R11', 'R11: '); add('R12', 'R12: ');
    return L.length ? L.join('\n') : 'Brak wyliczonych niezgodności ani komunikatów (uzupełnij dane w sekcjach B–O).';
  };
  return { out };
}
