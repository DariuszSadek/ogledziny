#!/usr/bin/env python3
"""Generuje forms/10.json (Hulajnoga elektryczna / UTO) ze specyfikacji 10_Hulajnoga_UTO_specyfikacja_dla_Claude_Code.md.
Użycie: python3 tools/gen_form10.py   (z katalogu głównego repozytorium)"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FULL = 527.3
keys, groups, tables = {}, {}, {}
sections = []
cur = None; cnt = {}; tcnt = {}

def sec(sid, title):
    global cur
    cur = {'id': sid, 'title': title, 'blocks': []}; sections.append(cur); cnt[sid] = 0; tcnt[sid] = 0
def nid():
    s = cur['id']; cnt[s] += 1; return f"10.{s}.{cnt[s]}"
def note(t): cur['blocks'].append({'k': 'note', 'text': t})
def sub(t): cur['blocks'].append({'k': 'subhead', 'text': t})
def fields(*items):
    out = []
    for it in items:
        key, label, typ, w = (list(it) + ['text', 312.8])[:4] if len(it) < 4 else it
        f = {'id': nid(), 'label': label, 'type': typ, 'w': w, 'rows': 1}
        if key: keys[key] = f['id']
        out.append(f)
    cur['blocks'].append({'k': 'fields', 'items': out})
def F(key, label, typ='text', w=312.8): return (key, label, typ, w)
def grp(key, label, opts, other=None):
    """opts: lista etykiet; element ('etykieta', True) = opcja z polem tekstowym; other = etykieta opcji „inne:” z polem."""
    items = []; groups[key] = []
    for o in opts:
        txt = False
        if isinstance(o, tuple): o, txt = o
        c = {'id': nid(), 'type': 'check', 'label': o}; items.append(c); groups[key].append([o, c['id']]); keys[f'{key}:{o}'] = c['id']
        if txt:
            t = {'id': nid(), 'type': 'text', 'label': '', 'w': 150, 'rows': 1}; items.append(t); keys[f'{key}:{o}:tekst'] = t['id']
    if other:
        c = {'id': nid(), 'type': 'check', 'label': other}; items.append(c); groups[key].append([other, c['id']])
        t = {'id': nid(), 'type': 'text', 'label': '', 'w': 150, 'rows': 1}; items.append(t); keys[f'{key}:inne:tekst'] = t['id']
    cur['blocks'].append({'k': 'group', 'label': label, 'items': items})
def table(name, lead, cols, labels, nrows=None, groups_=None, leadw=181.0):
    """cols: [(naglowek, typ, szerokosc)]"""
    tcnt[cur['id']] += 1; tid = f"t{tcnt[cur['id']]}"; prefix = f"10.{cur['id']}.{tid}"
    n = nrows or len(labels)
    rows = [[{'id': f"{prefix}.r{r}.c{c}"} for c in range(1, len(cols) + 1)] for r in range(1, n + 1)]
    b = {'k': 'table', 'tid': tid, 'prefix': prefix, 'lead': lead, 'leadw': leadw, 'labels': labels + [''] * (n - len(labels)),
         'cols': [{'head': h, 'w': w, 'type': t} for h, t, w in cols], 'rows': rows}
    if groups_: b['groups'] = groups_
    cur['blocks'].append(b); tables[name] = prefix
    return prefix
ELEM_COLS = [('S', 'check', 8), ('N', 'check', 8), ('ND', 'check', 8), ('P', 'check', 8), ('U', 'check', 8), ('?', 'check', 8), ('Z', 'check', 8), ('NZ', 'check', 8), ('ND', 'check', 8), ('Opis / wartości / nr zdjęcia', 'text', 214.9)]
ELEM_GR = [{'t': 'STAN', 'c0': 0, 'c1': 2}, {'t': 'CHARAKTER', 'c0': 3, 'c1': 5}, {'t': 'WT', 'c0': 6, 'c1': 8}]
def etable(name, labels): return table(name, '', ELEM_COLS, labels, groups_=ELEM_GR)
def auto(rule, label): cur['blocks'].append({'k': 'auto', 'rule': rule, 'label': label})
def checklist(items): cur['blocks'].append({'k': 'checklist', 'items': [{'id': nid(), 'label': l, 'type': 'check'} for l in items]})
def sig(t): cur['blocks'].append({'k': 'sig', 'text': t})

# ---------------- wstęp ----------------
sec('0', '')
note('Stan prawny sprawdzony: listopad 2026. Podstawy: PoRD (t.j. Dz.U. 2024 poz. 1251 z późn. zm.), rozp. w sprawie warunków technicznych pojazdów (t.j. Dz.U. 2024 poz. 502) – § 2, § 3, § 55a–55d. Legenda: STAN: S – sprawny · N – niesprawny · ND – nie da się ocenić. CHARAKTER: P – powypadkowe · U – usterka / zużycie sprzed zdarzenia · ? – nie ustalono. WT: Z – zgodny · NZ – niezgodny · ND – nie dotyczy / nie da się ocenić. Hulajnoga elektryczna i UTO nie podlegają badaniu technicznemu na SKP.')

# ---------------- A ----------------
sec('A', 'A. CZĘŚĆ WSTĘPNA')
fields(F('A.data_ogl', 'Data oględzin', 'text', 91.5), F(None, 'Godz. rozpoczęcia', 'time', 73.2), F(None, 'Godz. zakończenia', 'time', 73.2), F(None, 'Oznaczenie w sprawie (A / B / …)', 'text', 120), F(None, 'Zlecenie (sąd / organ / klient), sygn. / nr', 'text', 312.8))
fields(F('A.1', 'A.1 Data zdarzenia (obowiązkowe – od niej zależą reguły R10–R12), RRRR-MM-DD', 'text', 250), F(None, 'Miejsce oględzin (adres)', 'text', 312.8), F(None, 'Kto udostępnił pojazd (osoba, podmiot)', 'text', 208.5))
grp('A.miejsce', 'Rodzaj miejsca', ['parking strzeżony', 'plac policyjny', 'warsztat', 'miejsce zdarzenia', 'posesja prywatna'], 'inne:')
grp('A.warunki', 'Warunki oględzin', ['światło dzienne', 'oświetlenie sztuczne', 'pod dachem', 'na otwartej przestrzeni', 'sucho', 'opady'])
fields(F(None, 'Osoby obecne (imię, nazwisko, funkcja / w jakim charakterze)', 'text', FULL))
grp('A.2', 'A.2 Stan zabezpieczenia', ['plomby nienaruszone', 'brak plomb', 'zabezpieczona przed opadami', 'przemieszczana po zdarzeniu', 'ślady demontażu / napraw po zdarzeniu', 'części luzem dołączone', 'braki części'], 'inne:')
fields(F(None, 'Nr plomb / uwagi do zabezpieczenia', 'text', FULL))
grp('A.3', 'A.3 Bateria', ['w pojeździe, podłączona', 'odłączona', 'wyjęta', 'brak'])
grp('A.4', 'A.4 Bateria uszkodzona mechanicznie / termicznie', ['nie', 'tak', 'nie da się ocenić'])
auto('A4', 'Komunikat')
grp('A.5', 'A.5 Sprzęt pomiarowy', ['taśma Würth 5 m', 'taśma Würth 20 m', 'łata 1 m', 'łata 5 m', 'poziomica Nivel', 'kółko miernicze Nivel M100', 'suwmiarka zegarowa L 150 VIS', 'manometr', 'miernik bieżnika', 'dalmierz laserowy', 'boroskop Visixon', 'lampa czołowa', 'statyw', 'lampa błyskowa', 'waga', 'hamownia', 'rejestrator GNSS', 'anemometr', 'multimetr'], 'inne:')
sub('A.6 Przyrządy wymagające wzorcowania')
table('A6', 'Przyrząd', [('Typ', 'text', 90), ('Nr fabryczny', 'text', 80), ('Nr świadectwa wzorcowania / legalizacji', 'text', 120), ('Data', 'text', 60), ('Laboratorium', 'text', 90), ('Niepewność (z jednostką)', 'text', 80)], ['waga', 'hamownia', 'rejestrator GNSS', 'anemometr', 'inne'])
auto('R13', 'Reguła R13 – wzorcowanie')
fields(F(None, 'Zdjęcia – nr od', 'text', 100), F(None, 'Zdjęcia – nr do', 'text', 100), F(None, 'Liczba zdjęć', 'text', 100), F(None, 'Film nr', 'text', 100), F(None, 'Aparat / karta', 'text', 200))

# ---------------- B ----------------
sec('B', 'B. IDENTYFIKACJA I DOKUMENTY')
grp('B.1', 'B.1 Rodzaj urządzenia według akt / deklaracji', ['hulajnoga elektryczna', 'UTO – deskorolka elektryczna', 'UTO – monocykl', 'UTO – urządzenie samobalansujące dwukołowe', 'hulajnoga bez napędu'], 'inne:')
fields(F(None, 'B.2 Producent / marka', 'text', 200), F(None, 'B.3 Model / wersja', 'text', 200), F(None, 'B.4 Kolor', 'text', 120))
fields(F('B.5v', 'B.5 Numer rozpoznawczy lub kod graficzny nadany przez producenta', 'text', FULL))
grp('B.5', 'B.5 Sposób oznaczenia', ['grawer / nabity', 'naklejka', 'nadruk', 'kod QR / kreskowy', 'brak'])
fields(F(None, 'B.5a Umiejscowienie (rama / kolumna / podest / inne)', 'text', 312.8), F(None, 'Fot. nr', 'text', 100))
grp('B.5b', 'B.5b Trwały i czytelny', ['tak', 'nie', 'częściowo'])
grp('B.5c', 'B.5c Zgodność z dokumentami', ['zgodny', 'niezgodny', 'brak dokumentów'])
note('Podstawa: § 55a ust. 4 pkt 1 WT (hulajnoga), § 55c WT (UTO).')
auto('R7', 'Reguła R7 – numer rozpoznawczy')
sub('B.6 Tabliczka znamionowa – dane odczytane')
table('B6', 'Parametr', [('Wartość odczytana', 'text', 200), ('Uwagi / fot. nr', 'text', 200)], ['prędkość maks. deklarowana [km/h]', 'moc znamionowa [W]', 'napięcie znamionowe [V]', 'pojemność baterii [Ah] / [Wh]', 'maks. obciążenie [kg]', 'masa [kg]', 'klasa IP', 'rok / data produkcji', 'oznakowanie CE (tak / nie)', 'producent / importer (nazwa, adres)', 'norma deklarowana (np. EN 17128)', 'inne'])
grp('B.7', 'B.7 Wypożyczalnia', ['nie', 'tak'])
fields(F(None, 'B.7a Operator', 'text', 200), F(None, 'B.7b Nr boczny / ID / QR', 'text', 150), F(None, 'B.7c Nr przejazdu z akt', 'text', 150))
grp('B.7d', 'B.7d Moduł IoT / GPS', ['jest', 'brak', 'uszkodzony'])
grp('B.8', 'B.8 Data wprowadzenia do obrotu', ['przed 1.01.2022', 'po 31.12.2021', 'nie ustalono'])
grp('B.8a', 'B.8a Źródło', [('faktura / paragon (data, sprzedawca, nr)', True), ('dokument dystrybutora powiązany z nr seryjnym', False)], 'inne:')
fields(F(None, 'B.8b Data produkcji (informacyjnie)', 'text', 150))
note('Data produkcji nie jest datą wprowadzenia do obrotu. Podstawa: art. 5 ust. 1–2 ustawy z 30.03.2021 (Dz.U. 2021 poz. 720).')
auto('R9', 'Reguła R9 – data wprowadzenia do obrotu')
grp('B.9', 'B.9 Dokumentacja dostępna', ['instrukcja obsługi', 'deklaracja zgodności', 'karta katalogowa', 'brak'])
fields(F(None, 'B.10 Odczyty wyświetlacza – drogomierz [km]', 'num', 150), F(None, 'Wersja oprogramowania', 'text', 150), F(None, 'Źródło odczytu: wyświetlacz / aplikacja producenta (nazwa, wersja) / narzędzie serwisowe (nazwa, wersja)', 'text', FULL))
etable('BT', ['B.T1 Numer rozpoznawczy / kod graficzny (§ 55a ust. 4 pkt 1; § 55c)', 'B.T2 Tabliczka znamionowa – zgodność z pojazdem'])

# ---------------- Z ----------------
sec('Z', 'ZADANIA SPECJALNE DO SPRAWDZENIA')
note('Zadania ze zlecenia lub z ustaleń w toku oględzin, wykraczające poza standardowy zakres formularza. Odhacz wykonanie i wpisz wynik albo miejsce w protokole.')
table('Z', 'Nr', [('Zadanie – co sprawdzić', 'text', 300), ('Wykonano', 'check', 8), ('Wynik / gdzie w protokole', 'text', 200)], ['1', '2', '3', '4', '5', '6'], leadw=20.0)

# ---------------- C ----------------
sec('C', 'C. STAN ZASTANY ELEMENTÓW STERUJĄCYCH')
note('FOTOGRAFUJ PRZED DOTKNIĘCIEM. Zasilanie włączaj i aplikację łącz dopiero po udokumentowaniu stanu zastanego. Nie dopuszczaj do aktualizacji oprogramowania w trakcie odczytu. Zapisz każdą zmianę wskazań po włączeniu.')
grp('C.1', 'C.1 Zasilanie w chwili oględzin', ['wyłączone', 'włączone', 'nie da się włączyć'])
fields(F(None, 'C.2 Wyświetlacz po włączeniu – prędkość [km/h]', 'num', 150), F(None, 'tryb jazdy', 'text', 150), F(None, 'stan baterii [%]', 'num', 120), F(None, 'kody błędów', 'text', 300))
grp('C.2k', 'C.2 Kontrolka świateł', ['wł.', 'wył.', 'brak'])
grp('C.2j', 'C.2 Jednostki', ['km/h', 'mph'])
grp('C.3', 'C.3 Przełącznik / ustawienie świateł', ['włączone', 'wyłączone', 'automatyczne', 'nie da się ustalić'])
fields(F(None, 'C.4 Tryb jazdy', 'text', 200))
grp('C.5', 'C.5 Tempomat', ['wł.', 'wył.', 'brak', 'nie ustalono'])
grp('C.6', 'C.6 Dźwignie hamulców', ['swobodne', 'zablokowane deformacją', 'urwane', 'nie ustalono'])
grp('C.7', 'C.7 Manetka napędu', ['wraca swobodnie', 'zacina się', 'zablokowana deformacją', 'urwana'])
grp('C.8', 'C.8 Mechanizm składania', ['zablokowany w pozycji do jazdy', 'zwolniony', 'złożony', 'uszkodzony'])
grp('C.9', 'C.9 Podpórka', ['złożona', 'rozłożona', 'urwana / uszkodzona', 'brak'])
grp('C.10', 'C.10 Blokada (wypożyczalnia / zamek)', ['aktywna', 'nieaktywna', 'brak', 'nie ustalono'])
grp('C.11', 'C.11 Kierunkowskazy (jeśli są)', ['lewy', 'prawy', 'wyłączone', 'nie ustalono'])

# ---------------- D ----------------
sec('D', 'D. KLASYFIKACJA – CECHY KONSTRUKCYJNE')
note('Ustalenia techniczne do oceny organu. Kwalifikację prawną pojazdu ustala organ.')
grp('D.1', 'D.1 Napęd', ['elektryczny', 'mięśniowy (brak silnika)'], 'inny:')
grp('D.2', 'D.2 Liczba osi', ['1', '2', 'inna'])
fields(F(None, 'D.2a Liczba kół', 'num', 100))
grp('D.3', 'D.3 Kierownica', ['jest', 'brak'])
grp('D.4', 'D.4 Siedzenie', ['brak', 'fabryczne', 'doposażone (zestaw siedziska)', 'ślady montażu siedzenia'])
grp('D.5', 'D.5 Pedały', ['brak', 'są'])
grp('D.6', 'D.6 Układ samobalansujący', ['nie', 'tak'])
grp('D.7', 'D.7 Pozycja kierującego', ['stojąca', 'siedząca'])
grp('D.8', 'D.8 Przystosowanie do przewozu drugiej osoby / ładunku', ['brak', ('ślady przystosowania:', True)])
grp('D.9', 'D.9 Jazda przez odpychanie nogą', ['możliwa', 'utrudniona', 'niemożliwa'])
fields(F('D.9a', 'D.9a Wysokość górnej powierzchni podestu nad podłożem [cm]', 'num', 200), F(None, 'D.9b Opis', 'text', 312.8))
grp('D.10', 'D.10 Sposób uruchamiania napędu', ['manetką od zera', ('dopiero po rozpędzeniu nogą do ok. [km/h]', True), 'nie ustalono'])
grp('D.10a', 'D.10a Źródło ustalenia', ['próba (sekcja N)', 'ustawienia sterownika', 'instrukcja'])
auto('D11', 'D.11 Moc znamionowa silnika [W] (z J.1)')
auto('D12', 'D.12 Napięcie znamionowe [V] (z J.3)')
auto('D13', 'D.13 Prędkość maksymalna ustalona [km/h]')
auto('D14', 'D.14 Masa własna [kg] (z E.5)')
auto('R1', 'D.15 Wynik wstępny klasyfikacji technicznej')
note('Art. 2 pkt 47b PoRD – hulajnoga elektryczna: pojazd napędzany elektrycznie, dwuosiowy, z kierownicą, bez siedzenia i pedałów, przeznaczony do jazdy wyłącznie przez kierującego znajdującego się na nim. Art. 2 pkt 47c – UTO: pojazd napędzany elektrycznie, inny niż hulajnoga elektryczna, bez siedzenia i pedałów. Art. 2 pkt 18a – urządzenie wspomagające ruch: napędzane siłą mięśni. Art. 2 pkt 32 – hulajnoga elektryczna i UTO nie są pojazdami silnikowymi. Rozp. (UE) 168/2013 art. 2 ust. 2 lit. i) i j) – nie obejmuje pojazdów samobalansujących ani pojazdów bez co najmniej jednego miejsca siedzącego. SN III KK 13/22 (22.02.2023) – ocena „pojazdu mechanicznego” z art. 178a § 1 k.k. zależy od konstrukcji i parametrów: możliwość odpychania nogą, sposób uruchamiania napędu, moc zbliżona do roweru ze wspomaganiem, prędkość.')

# ---------------- E ----------------
sec('E', 'E. WYMIARY I MASA')
note('Pomiar w położeniu do jazdy (kolumna rozłożona i zablokowana). Limity: długość 1,4 m (§ 2 ust. 1 pkt 12 WT), szerokość 0,9 m (§ 2 ust. 13a WT), masa własna 30 kg (§ 3 ust. 13a WT; tylko hulajnoga elektryczna).')
fields(F('E.1', 'E.1 Długość całkowita [m]', 'num', 150), F('E.1u', 'niepewność [m]', 'num', 120))
fields(F('E.2', 'E.2 Szerokość całkowita [m]', 'num', 150), F('E.2u', 'niepewność [m]', 'num', 120))
fields(F(None, 'E.3 Wysokość [m] (informacyjnie)', 'num', 150))
sub('E.4 Rozstaw osi')
fields(F('E.4n', 'nominalny [mm]', 'num', 120), F('E.4L', 'zmierzony L [mm]', 'num', 120), F('E.4P', 'zmierzony P [mm]', 'num', 120))
auto('E4', 'E.4 Skrócenie rozstawu osi [mm]')
fields(F('E.5', 'E.5 Masa własna [kg]', 'num', 150), F('E.5u', 'niepewność [kg]', 'num', 120))
grp('E.5a', 'E.5a Stan przy ważeniu', ['z baterią', 'z wyposażeniem fabrycznym', 'akcesoria doposażone zdjęte', ('akcesoria doposażone na pojeździe:', True)])
note('E.5b Waga – odwołanie do wiersza „waga” w A.6 (bez świadectwa – reguła R13).')
note('Wymagania wobec wagi, aby ważenie miało sens (kryteria robocze, bez powołania na przepis): (1) aktualne świadectwo wzorcowania z podaną niepewnością – wiersz „waga” w A.6; (2) zakres wagi obejmuje masę hulajnogi z zapasem, a działka jest na tyle mała, by niepewność była wyraźnie mniejsza od odległości wyniku od limitu 30 kg – w przeciwnym razie reguła R2 poda „nierozstrzygnięte”; (3) hulajnoga w całości na platformie, w położeniu do jazdy, bez podparcia kołem lub podpórką o podłoże; (4) waga na twardym, poziomym podłożu, wyzerowana przed ważeniem, odczyt ustabilizowany; (5) stan przy ważeniu opisany w E.5a (bateria, wyposażenie); (6) bez świadectwa wynik jest orientacyjny (reguła R13).')
auto('R2', 'Reguła R2 – wymiary i masa')
fields(F('E.6', 'E.6 Maks. obciążenie wg producenta [kg]', 'num', 200), F('E.7', 'E.7 Masa kierującego z akt [kg]', 'num', 200))
auto('R14', 'Reguła R14 – obciążenie')
grp('E.8', 'E.8 Waga – spełnienie wymagań z E.5b', ['spełnia', 'nie spełnia', 'nie da się ocenić'])

# ---------------- F ----------------
sec('F', 'F. RAMA, KOLUMNA KIEROWNICZA, MECHANIZM SKŁADANIA, ZAWIESZENIE')
etable('F', ['F.1 Podest / rama – pęknięcia, spawy, deformacje', 'F.2 Kolumna kierownicy – wygięcie, pęknięcia', 'F.3 Mechanizm składania – zatrzask, luz, zużycie, możliwość samoczynnego złożenia w czasie jazdy', 'F.4 Łożyska główki kolumny – luz, opór obrotu', 'F.5 Mostek / zacisk kierownicy – mocowanie, obrót kierownicy względem kolumny', 'F.6 Kierownica, chwyty, końcówki', 'F.7 Widelec przedni', 'F.8 Amortyzator przedni / tylny', 'F.9 Podpórka – stabilne ustawienie na podłożu (§ 55a ust. 4 pkt 2 WT; dla UTO WT = ND)', 'F.10 Błotniki, osłony', 'F.11 Zakres skrętu; przewody nie blokują skrętu'])
auto('R8', 'Reguła R8 – podpórka')

# ---------------- G ----------------
sec('G', 'G. UKŁAD HAMULCOWY')
note('Przepisy nie określają liczbowej skuteczności hamowania hulajnogi elektrycznej ani UTO. Hulajnoga: co najmniej jeden skutecznie działający hamulec (§ 55a ust. 1 pkt 4 WT). Hulajnoga i UTO: konstrukcja zapewnia możliwość skutecznego hamowania (§ 55d WT). Próba hamowania – sekcja N.')
grp('G.1', 'G.1 Rodzaj hamulca przedniego', ['bębnowy', 'tarczowy mechaniczny', 'tarczowy hydrauliczny', 'elektryczny / rekuperacyjny', 'brak'])
grp('G.2', 'G.2 Rodzaj hamulca tylnego', ['bębnowy', 'tarczowy mechaniczny', 'tarczowy hydrauliczny', 'elektryczny / rekuperacyjny', 'nożny (na błotniku)', 'brak'])
etable('G', ['G.3 Dźwignia hamulca przedniego – skok, opór, powrót', 'G.4 Dźwignia hamulca tylnego – skok, opór, powrót', 'G.5 Linki / przewody hamulcowe – ciągłość, szczelność, regulacja', 'G.6 Zacisk / bęben przedni', 'G.7 Zacisk / bęben tylny', 'G.8 Tarcza przednia – grubość, bicie, zabrudzenie, przegrzanie', 'G.9 Tarcza tylna', 'G.10 Klocki / okładziny przód', 'G.11 Klocki / okładziny tył', 'G.12 Hamulec elektryczny – działanie przy zasilaniu włączonym; przy wyłączonym: brak działania (zaznacz)', 'G.13 Odcięcie napędu przy użyciu dźwigni hamulca', 'G.14 Hamulec nożny (jeśli jest)', 'G.15 Światło stop (jeśli jest) – informacyjnie', 'G.16 Co najmniej jeden skutecznie działający hamulec (§ 55a ust. 1 pkt 4) – WT, ocena po sekcji N'])
sub('G.17 Tarcze')
table('G17', 'Pozycja', [('Grubość zmierzona [mm]', 'num', 100), ('Grubość min. (oznaczenie) [mm]', 'num', 100), ('Okładzina [mm]', 'num', 100), ('Uwagi', 'text', 200)], ['przód', 'tył'])

# ---------------- H ----------------
sec('H', 'H. KOŁA I OGUMIENIE')
note('Ciśnienie zastane zapisz przed regulacją. Pełna ekspertyza opony – formularz 07_Ogumienie.')
table('H', 'Koło', [('Rodzaj opony (pneumatyczna dętkowa / bezdętkowa / pełna / komorowa)', 'text', 110), ('Producent, model', 'text', 90), ('Rozmiar', 'text', 70), ('Bieżnik min. [mm]', 'num', 60), ('Ciśnienie zastane [bar]', 'num', 60), ('Ciśnienie nominalne [bar] + źródło (opona / dokumentacja)', 'text', 100), ('Ciśnienie po regulacji [bar]', 'num', 60), ('Obwód toczny zmierzony [mm]', 'num', 70), ('Uszkodzenia opony / felgi', 'text', 120)], ['przód', 'tył'])
grp('H.1', 'H.1 Rozmiar kół zgodny z fabrycznym', ['tak', 'nie', 'nie ustalono'])
auto('H1', 'Komunikat')
etable('H', ['H.2 Felgi – pęknięcia, deformacje', 'H.3 Opony – uszkodzenia, bieżnik', 'H.4 Łożyska kół', 'H.5 Silnik w piaście – mocowanie osi, luz, przewody'])

# ---------------- I ----------------
sec('I', 'I. OŚWIETLENIE, ODBLASKI, SYGNAŁ OSTRZEGAWCZY')
note('§ 55a WT (hulajnoga elektryczna), § 55b WT (UTO). Światła pozycyjne mogą być zdemontowane, gdy kierujący nie jest obowiązany do ich używania (§ 55a ust. 2, § 55b ust. 2). Światła pozycyjne mogą być migające. Światła pozycyjne i odblaskowe oświetlone światłem drogowym innego pojazdu – widoczne w nocy przy dobrej przejrzystości powietrza z co najmniej 150 m (§ 55a ust. 3). Źródła LED – badanie żarnika nie dotyczy. Dla UTO wiersze I.4 i I.5: WT = ND.')
etable('I', ['I.1 Światło pozycyjne przednie – barwa biała lub żółta selektywna; stałe / migające; zamocowanie stałe / demontowalne', 'I.2 Światło pozycyjne tylne – barwa czerwona', 'I.3 Światło odblaskowe tylne – barwa czerwona, kształt inny niż trójkąt', 'I.4 Światła odblaskowe boczne – barwa biała lub żółta samochodowa, widoczne po obu stronach (tylko hulajnoga)', 'I.5 Dzwonek lub inny sygnał ostrzegawczy o nieprzeraźliwym dźwięku (tylko hulajnoga)', 'I.6 Światła czerwone niewidoczne z przodu; białe i żółte selektywne niewidoczne z tyłu', 'I.7 Widoczność z 150 m – nie badano / próba w terenie (opis w Opis)', 'I.8 Światła dodatkowe (stop, kierunkowskazy, oświetlenie podestu) – informacyjnie'])
auto('R5', 'Reguła R5 – oświetlenie')
grp('I.9', 'I.9 Czy światła były włączone w chwili zdarzenia', ['tak', 'nie', 'nie da się ustalić'])
grp('I.9a', 'I.9a Podstawa ustalenia', ['położenie przełącznika', 'ustawienie automatyczne', 'dane operatora', 'monitoring'], 'inne:')

# ---------------- J ----------------
sec('J', 'J. NAPĘD, BATERIA, STEROWNIK, OPROGRAMOWANIE')
note('Każdy odczyt elektroniczny: zapisz narzędzie, jego wersję i nazwę pliku. Stanu oprogramowania nie zmieniaj przed pomiarami w stanie zastanym (M, N).')
grp('J.1p', 'J.1 Silnik – położenie', ['przód', 'tył', 'oba'])
fields(F(None, 'J.1 oznaczenie silnika', 'text', 200), F('J.1', 'J.1 moc znamionowa z tabliczki silnika [W]', 'num', 200))
grp('J.1o', 'J.1 Silnik oryginalny', ['tak', 'wymieniony', 'nie ustalono'])
fields(F(None, 'J.2 Sterownik – oznaczenie', 'text', 312.8))
grp('J.2', 'J.2 Sterownik', ['oryginalny', 'wymieniony', 'ślady ingerencji', 'nie ustalono'])
grp('J.2a', 'J.2a Ślady ingerencji', ['naruszone uszczelnienia / naklejki', 'nieoryginalne złącza', 'dodatkowy moduł', 'zmieniony przewód czujnika prędkości'], 'inne:')
fields(F('J.3', 'J.3 Bateria – napięcie znamionowe [V]', 'num', 200), F(None, 'pojemność [Ah] / [Wh]', 'text', 150), F(None, 'stan naładowania przed próbami [%]', 'num', 150))
grp('J.3o', 'J.3 Bateria', ['oryginalna', 'wymieniona', 'dodatkowa', 'nie ustalono'])
grp('J.3s', 'J.3 Stan baterii', ['bez uszkodzeń', 'spuchnięta', 'uszkodzona mechanicznie', 'ślady termiczne', 'zapach elektrolitu'])
grp('J.4', 'J.4 Manetka – typ', ['kciukowa', 'spustowa', 'obrotowa', 'inna'])
grp('J.5', 'J.5 Ustawienia sterownika (odczyt) – źródło', ['wyświetlacz', ('aplikacja producenta (nazwa, wersja)', True), ('narzędzie serwisowe (nazwa, wersja)', True), 'nie odczytano'])
fields(F(None, 'J.5a Wersja oprogramowania', 'text', 200), F('J.5b', 'J.5b Limit prędkości ustawiony [km/h]', 'num', 150), F(None, 'J.5c Tryby jazdy i ich limity', 'text', 312.8), F(None, 'J.5d Ustawienie uruchamiania napędu (prędkość minimalna)', 'text', 312.8), F(None, 'J.5e Region / jednostki', 'text', 200))
grp('J.5f', 'J.5f Oprogramowanie niefabryczne', ['nie stwierdzono', 'stwierdzono', 'nie da się ustalić'])
fields(F(None, 'J.5f podstawa', 'text', FULL))
grp('J.6', 'J.6 Doposażenie zmieniające parametry', ['siedzisko', 'dodatkowa bateria', 'inny silnik', 'inny sterownik', 'inne koła', 'brak'])
etable('J', ['J.T1 Wiązka przewodów, złącza', 'J.T2 Czujnik prędkości / czujniki Halla silnika', 'J.T3 Wyświetlacz', 'J.T4 Port ładowania', 'J.T5 Moduł IoT / GPS (wypożyczalnia)', 'J.T6 Konstrukcja ogranicza rozwijanie prędkości powyżej 20 km/h (§ 55d)'])
auto('R3', 'Reguła R3 – prędkość (§ 55d WT)')
sub('J.7 Moduł IoT / GPS (wypożyczalnia)')
grp('J.7', 'J.7 Moduł IoT / GPS', ['stwierdzono', 'nie stwierdzono', 'nie ustalono'])
fields(F(None, 'J.7a Oznaczenie układu / producent modemu', 'text', 312.8), F(None, 'J.7b IMEI', 'text', 200), F(None, 'J.7c ICCID karty SIM', 'text', 200))
fields(F(None, 'J.7d Miejsce zamontowania, antena, połączenie ze sterownikiem i baterią', 'text', FULL), F(None, 'J.7e Nr zdjęć', 'text', 200))
grp('J.7z', 'J.7 Zabezpieczenie danych', ['bateria odłączona przed otwarciem', 'izolacja od sieci (worek ekranujący na całą hulajnogę lub na moduł)', 'hulajnogi nie włączano', 'obudowy nie otwierano'])
note('Jak ustalam moduł IoT / GPS: (1) ustal operatora i identyfikator – numer rozpoznawczy lub kod QR na kolumnie lub podeście, zdjęcia ze skalą; (2) oględziny zewnętrzne bez otwierania – antena lub wypustka pod pokrywą kolumny albo deski, gniazdo SIM, naklejka z IMEI; (3) otwarcie obudowy tylko za zgodą zlecającego i z dokumentacją zdjęciową przed i po – odczytaj oznaczenie układu modemu, IMEI i ICCID, zapisz połączenie ze sterownikiem i baterią; (4) przed włączeniem zabezpiecz dane – odłącz baterię główną i odetnij moduł od sieci radiowej: w worku ekranującym umieść całą hulajnogę (moduł jest w hulajnodze, nie w baterii) albo sam wyjęty moduł, bo aktywny moduł może odebrać polecenie z sieci, zablokować pojazd albo nadpisać dane; (5) samo ustalenie typu modułu nie daje trasy ani prędkości – te dane ma operator i żądam ich przez organ (L.2); (6) prędkość z telemetrii operatora jest daną zewnętrzną, bez mojego wzorcowania; IMEI i numer SIM wskazane przez operatora potwierdzają, że dane pochodzą z tego modułu.')

# ---------------- K ----------------
sec('K', 'K. USZKODZENIA – ROZKŁADÓWKA HULAJNOGI (kliknij element = X)')
ELEMS = [(1, 'koło przednie (opona, felga)'), (2, 'hamulec przedni'), (3, 'widelec / amortyzator przedni'), (4, 'błotnik przedni'), (5, 'światło przednie'), (6, 'kolumna kierownicy'), (7, 'mechanizm składania'), (8, 'kierownica'), (9, 'manetka, dźwignie hamulców'), (10, 'wyświetlacz'), (11, 'dzwonek / sygnał'), (12, 'podest'), (13, 'bateria'), (14, 'sterownik'), ('15L', 'odblask boczny lewy'), ('15P', 'odblask boczny prawy'), (16, 'podpórka'), (17, 'błotnik tylny / hamulec nożny'), (18, 'koło tylne (opona, felga)'), (19, 'hamulec tylny'), (20, 'światło tylne / odblask tylny'), (21, 'silnik w piaście'), (22, 'amortyzator tylny'), (23, 'port ładowania'), (24, 'numer rozpoznawczy / tabliczka'), (25, 'moduł IoT / zamek')]
ANCH = {1: (440, 118), 2: (468, 92), 3: (452, 64), 4: (416, 98), 5: (474, 40), 6: (396, 54), 7: (432, 84), 8: (372, 18), 9: (428, 18), 10: (412, 40), 11: (352, 18), 12: (290, 128), 13: (232, 128), 14: (192, 128), '15L': (350, 128), '15P': (350, 128), 16: (165, 152), 17: (110, 80), 18: (88, 118), 19: (140, 100), 20: (56, 100), 21: (136, 118), 22: (150, 84), 23: (215, 152), 24: (290, 152), 25: (350, 152)}
SHORT = {1: 'koło przednie', 2: 'hamulec przód', 3: 'widelec / amort.', 4: 'błotnik przód', 5: 'światło przód', 6: 'kolumna', 7: 'składanie', 8: 'kierownica', 9: 'manetka / dźwignie', 10: 'wyświetlacz', 11: 'dzwonek', 12: 'podest', 13: 'bateria', 14: 'sterownik', '15L': 'odblask lewy', '15P': 'odblask prawy', 16: 'podpórka', 17: 'błotnik tył', 18: 'koło tylne', 19: 'hamulec tył', 20: 'światło tył', 21: 'silnik piasta', 22: 'amort. tylny', 23: 'port ładowania', 24: 'nr / tabliczka', 25: 'IoT / zamek'}
def shapes_side():
    S = []
    def r(x, y, w, h, f='none', s='#333', sw=1.2): S.append({'t': 'r', 'x': x, 'y': y, 'W': w, 'H': h, 'f': f, 's': s, 'w': sw})
    def p(d, f='none', s='#333', sw=1.6): S.append({'d': d, 'f': f, 's': s, 'w': sw})
    def circ(cx, cy, rr, sw=2): p(f'M{cx-rr} {cy} a{rr} {rr} 0 1 0 {2*rr} 0 a{rr} {rr} 0 1 0 {-2*rr} 0 Z', 'none', '#333', sw)
    circ(440, 118, 34); circ(440, 118, 18, 1); circ(110, 118, 34); circ(110, 118, 18, 1)
    r(110, 120, 330, 16, '#e8e8e8')                      # podest
    p('M440 118 L398 16', 'none', '#333', 4)             # kolumna
    p('M380 14 L420 14', 'none', '#333', 4)              # kierownica
    p('M110 100 L150 100 L150 118', 'none', '#333', 2)   # błotnik tylny
    p('M425 82 L452 82', 'none', '#333', 2)
    return S
def shapes_top():
    S = []
    def r(x, y, w, h, f='#e8e8e8'): S.append({'t': 'r', 'x': x, 'y': y, 'W': w, 'H': h, 'f': f, 's': '#333', 'w': 1.4})
    r(90, 105, 70, 18, '#bbb'); r(420, 105, 70, 18, '#bbb'); r(150, 100, 280, 28)     # koła, podest
    S.append({'d': 'M440 60 L440 160', 'f': 'none', 's': '#333', 'w': 5}); S.append({'d': 'M440 114 L440 60', 'f': 'none', 's': '#333', 'w': 3})
    return S
TOPANCH = {1: (470, 114), 4: (440, 100), 5: (500, 114), 6: (440, 84), 8: (440, 46), 9: (398, 50), 10: (482, 62), 12: (290, 114), '15L': (200, 92), '15P': (200, 138), 16: (330, 140), 18: (80, 114), 19: (130, 98), 20: (46, 114), 21: (110, 130), 23: (250, 140)}
def figure(title, view):
    shapes = shapes_side() if view in ('L', 'P') else shapes_top()
    anch = ANCH if view in ('L', 'P') else TOPANCH
    items = [e for e in ELEMS if view in ('L', 'P') or e[0] in TOPANCH]
    if view == 'L': items = [e for e in items if e[0] != '15P']
    if view == 'P': items = [e for e in items if e[0] != '15L']
    texts = [{'x': 8, 'y': 14, 'sz': 11, 't': title, 'b': True, 'c': '#222'}]
    spots = []; marks = []
    n = len(items); per = 7; cw = 80
    for i, (num, name) in enumerate(items):
        row, col = divmod(i, per); x = 8 + col * cw + 28; y = 176 + row * 48
        ax, ay = anch.get(num, (250, 120))
        if view == 'P': ax = 560 - ax
        marks.append({'d': f'M{ax-7} {ay} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z', 'f': '#fff', 's': '#c00', 'w': 1.2})
        texts.append({'x': ax, 'y': ay + 3, 'sz': 8, 't': str(num), 'b': True, 'c': '#c00', 'anchor': 'middle'})
        spots.append({'id': nid(), 'type': 'check', 'x': x, 'y': y, 'label': f'{title}: {num} {name}'})
        texts.append({'x': x + 11, 'y': y + 31, 'sz': 7.5, 't': f'{num} {SHORT[num]}', 'b': False, 'c': '#222', 'anchor': 'middle'})
        keys[f'K:{view}:{num}'] = spots[-1]['id']
    sh = shapes
    if view == 'P':      # lustrzane odbicie rysunku (przód w lewo)
        sh = [dict(s, d=_mirror(s['d'])) if 'd' in s else dict(s, x=560 - s['x'] - s['W']) for s in shapes]
    cur['blocks'].append({'k': 'figure', 'fid': f'K{view}', 'vb': [0, 0, 560, 176 + 48 * ((n + per - 1) // per) + 6], 'shapes': sh + marks, 'texts': texts, 'spots': spots})
def _mirror(d):
    import re
    out = []; toks = re.findall(r'[MLmla]|-?\d+\.?\d*', d); i = 0; cmd = None
    while i < len(toks):
        t = toks[i]
        if t in 'MLmla': cmd = t; out.append(t); i += 1; continue
        if cmd in 'ML': out.append(str(560 - float(t))); out.append(toks[i + 1]); i += 2
        elif cmd == 'm' or cmd == 'l': out.append(str(-float(t))); out.append(toks[i + 1]); i += 2
        elif cmd == 'a': out += [toks[i], toks[i + 1], toks[i + 2], toks[i + 3], '1' if toks[i + 4] == '0' else '0', str(-float(toks[i + 5])), toks[i + 6]]; i += 7
        else: out.append(t); i += 1
    return ' '.join(out)
figure('bok lewy', 'L'); figure('bok prawy', 'P'); figure('rzut z góry', 'G')
note('Niewidoczne na rysunku: 26 siedzisko doposażone · 27 kierunkowskazy · 28 uchwyty / bagażnik / kosz · 29 lusterka · 30 inne. Kierunek działania siły podawaj jako godzinę (12 = przód pojazdu).')
fields(F(None, 'Niewidoczne na rysunku – elementy uszkodzone (26–30)', 'text', FULL))
sub('K.1 Wykaz uszkodzeń')
table('K1', 'Nr', [('Element', 'text', 90), ('Opis (rodzaj, kierunek siły – godzina)', 'text', 150), ('Wysokość od podłoża od–do [cm]', 'text', 70), ('Głębokość / przesunięcie [cm]', 'text', 70), ('Ślady obce (lakier – kolor, guma, tkanina, biologiczne)', 'text', 110), ('Fot. nr', 'text', 50)], [str(i) for i in range(1, 9)], leadw=20.0)
sub('K.2 Ślady tarcia o nawierzchnię')
table('K2', 'Nr', [('Strona L / P', 'text', 50), ('Element (końcówka kierownicy, podest, błotnik, podpórka, dźwignia, światło)', 'text', 150), ('Wysokość / zakres [cm]', 'text', 80), ('Kierunek rys', 'text', 80), ('Fot. nr', 'text', 50)], [str(i) for i in range(1, 7)], leadw=20.0)
fields(F(None, 'K.3 Opis zaznaczeń', 'text', FULL))

# ---------------- L ----------------
sec('L', 'L. ODCZYTY I ŹRÓDŁA DANYCH ZDARZENIA')
sub('L.1 Odczyt urządzenia')
table('L1', 'Nr', [('Źródło (wyświetlacz / aplikacja / narzędzie serwisowe)', 'text', 110), ('Drogomierz [km]', 'text', 60), ('Kody błędów', 'text', 80), ('Historia przejazdów', 'text', 90), ('Narzędzie, wersja, plik', 'text', 110), ('Uwagi', 'text', 80)], [str(i) for i in range(1, 6)], leadw=20.0)
grp('L.2', 'L.2 Dane operatora wypożyczalni – zakres do wniosku organu', ['trasa GNSS z czasem', 'prędkość', 'początek / koniec przejazdu', 'tryb ograniczenia prędkości', 'zdarzenia (upadek, alarm)', 'stan baterii'], 'inne:')
fields(F(None, 'L.2 nr pisma / data wniosku', 'text', 312.8))
grp('L.3', 'L.3 Inne źródła', ['monitoring', 'wideorejestrator', 'kamera kasku', 'aplikacja w telefonie kierującego'], 'inne:')
note('Dane z telefonu, aplikacji i telematyki zawierają dane osobowe – pobieraj tylko w zakresie zlecenia albo po uzyskaniu zgody organu / właściciela.')
fields(F(None, 'L.4 Zabezpieczone nośniki / pliki', 'text', FULL))

# ---------------- M ----------------
sec('M', 'M. BADANIE NA HAMOWNI – PRĘDKOŚĆ MAKSYMALNA I MOC')
note('Przepisy krajowe nie określają metody pomiaru prędkości maksymalnej hulajnogi ani UTO ani tolerancji pomiaru. Wynik przyjmuję do opinii tylko przy aktualnym świadectwie wzorcowania hamowni i udokumentowanej procedurze. Pierwszy pomiar – w stanie zastanym oprogramowania.')
grp('M.1', 'M.1 Wykonawca', ['rzeczoznawca', ('Policja (jednostka)', True), ('podmiot zewnętrzny', True)])
fields(F(None, 'M.1 nazwa, osoba', 'text', FULL))
fields(F(None, 'M.2 Hamownia – producent, typ, nr fabryczny', 'text', 312.8), F(None, 'średnica rolki [mm]', 'num', 120))
grp('M.2r', 'M.2 Rodzaj hamowni', ['rolkowa przenośna', 'rolkowa stacjonarna'], 'inna:')
grp('M.2w', 'M.2 Mierzone wielkości', ['prędkość', 'moc', 'siła na obwodzie koła'])
note('Świadectwo wzorcowania hamowni – odwołanie do wiersza „hamownia” w A.6.')
note('Wymagania wobec hamowni, aby pomiar prędkości miał sens (kryteria robocze, bez powołania na przepis): (1) aktualne świadectwo wzorcowania z podaną niepewnością – wiersz „hamownia” w A.6; (2) znana i wpisana w M.2 średnica rolki oraz wielkości, z których wyliczana jest prędkość; (3) hulajnoga zamocowana tak, aby koło napędzane leżało na rolce bez poślizgu i bez zejścia z niej; (4) ciśnienie w oponie, obciążenie koła i stan baterii zgodne z wpisem w M.3, napięcie baterii przed i po; (5) prędkość odczytana z ustabilizowanego fragmentu przejazdu, z wydrukiem lub plikiem; (6) pierwszy pomiar w stanie zastanym oprogramowania, min. 3 przejazdy; (7) opisana procedura: kto mierzył, jak, w jakich warunkach; (8) brak świadectwa lub brak opisu procedury – wynik nieprzydatny do opinii (nota stała powyżej).')
fields(F(None, 'M.3 Temperatura otoczenia [°C]', 'text', 130), F(None, 'stan naładowania baterii przed / po [%]', 'text', 160), F(None, 'napięcie baterii przed / po [V] (źródło odczytu)', 'text', 200), F(None, 'ciśnienie w oponie koła napędzanego [bar]', 'num', 150))
grp('M.3o', 'M.3 Obciążenie koła', [('kierujący na podeście (masa [kg])', True), ('obciążnik ([kg])', True), 'bez obciążenia'])
grp('M.3s', 'M.3 Stan oprogramowania', ['zastany', ('zmieniony (opis i podstawa: polecenie organu nr …)', True)])
fields(F(None, 'M.3 tryb jazdy', 'text', 200))
sub('M.4 Pomiary (min. 3 przejazdy w stanie zastanym, potem kolejne tryby)')
table('M4', 'Nr', [('Tryb', 'text', 60), ('Stan oprogramowania (zastany / zmieniony)', 'text', 80), ('vₘₐₓ hamownia [km/h]', 'num', 60), ('Prędkość na wyświetlaczu [km/h]', 'num', 60), ('Prędkość, przy której napęd przestaje działać [km/h]', 'num', 80), ('Moc maks. [W]', 'num', 50), ('Moc przy 20 km/h [W]', 'num', 50), ('Nr wydruku / pliku', 'text', 60), ('Uwagi', 'text', 80)], [str(i) for i in range(1, 7)], leadw=20.0)
auto('M5', 'M.5 Wyniki (wyliczone)')
sub('M.6 Wynik hamowni Policji z akt (jeśli był)')
fields(F(None, 'data', 'text', 100), F(None, 'jednostka', 'text', 150), F(None, 'urządzenie (typ, nr, wzorcowanie)', 'text', 250), F(None, 'vₘₐₓ [km/h]', 'num', 100), F(None, 'moc [W]', 'num', 100), F(None, 'nr protokołu / wydruku', 'text', 200))
grp('M.6', 'M.6 Przydatność', ['przydatny', 'nieprzydatny', 'nie da się ocenić'])
fields(F(None, 'M.6 uzasadnienie', 'text', FULL), F(None, 'M.7 Załączniki – wydruki, pliki', 'text', FULL))
grp('M.8', 'M.8 Hamownia – spełnienie wymagań z M.2', ['spełnia', 'nie spełnia', 'nie da się ocenić'])

# ---------------- N ----------------
sec('N', 'N. JAZDA TESTOWA – PRĘDKOŚĆ MAKSYMALNA, URUCHAMIANIE NAPĘDU, HAMOWANIE')
note('Wyłącznie na terenie zamkniętym dla ruchu – jazda z prędkością powyżej 20 km/h na drodze narusza art. 20 ust. 6 pkt 4 PoRD. Nie wykonuj, gdy stan ramy, kolumny, mechanizmu składania, hamulców lub baterii zagraża bezpieczeństwu (F, G, J). Kierujący w kasku i odzieży ochronnej. Warunki odniesienia (analogia, nie wymaganie dla hulajnogi): rozp. delegowane Komisji (UE) nr 134/2014, zał. II dodatek 7 – kierujący 75 kg ± 5 kg i 1,75 m ± 0,05 m; tor płaski, prosty, suchy, nachylenie ≤ 0,5 %; wiatr ≤ 3 m/s, porywy ≤ 5 m/s; temperatura 5–35 °C.')
fields(F(None, 'N.1 Miejsce – adres', 'text', 312.8), F(None, 'rodzaj terenu (zamknięty – czyj, zgoda)', 'text', 312.8))
grp('N.1n', 'N.1 Nawierzchnia', ['asfalt', 'kostka', 'beton'], 'inna:')
grp('N.1s', 'N.1 Stan nawierzchni', ['sucha', 'mokra'])
fields(F(None, 'długość odcinka [m]', 'num', 130), F(None, 'nachylenie A→B [%]', 'text', 130), F(None, 'nachylenie B→A [%]', 'text', 130), F(None, 'temperatura [°C]', 'text', 120), F(None, 'wiatr [m/s]', 'text', 100))
grp('N.1w', 'N.1 Źródło danych o wietrze', ['anemometr (A.6)', ('dane stacji meteo (nazwa)', True), 'nie mierzono'])
fields(F(None, 'N.2 Kierujący – imię i nazwisko / funkcja', 'text', 312.8), F(None, 'masa z wyposażeniem [kg]', 'num', 130), F(None, 'wzrost [m]', 'num', 100))
fields(F(None, 'N.3 Rejestrator – typ', 'text', 150), F(None, 'nr', 'text', 100), F(None, 'częstotliwość zapisu [Hz]', 'num', 120), F(None, 'dokładność prędkości deklarowana [km/h]', 'text', 150), F(None, 'nazwa pliku', 'text', 200))
note('Wzorcowanie rejestratora – odwołanie do wiersza „rejestrator GNSS” w A.6.')
fields(F(None, 'N.4 Stan naładowania [%]', 'num', 120), F(None, 'tryb jazdy', 'text', 150), F(None, 'stan oprogramowania (jak M.3)', 'text', 200), F(None, 'ciśnienie opon przód / tył [bar]', 'text', 150))
sub('N.5 Prędkość maksymalna – przejazdy parami w obu kierunkach, tylko napędem (bez odpychania nogą)')
table('N5', 'Nr', [('Kierunek (A→B / B→A)', 'text', 70), ('Tryb', 'text', 70), ('vₘₐₓ rejestrator [km/h]', 'num', 70), ('Prędkość na wyświetlaczu [km/h]', 'num', 70), ('Fragment pliku (czas)', 'text', 80), ('Uwagi', 'text', 90)], [str(i) for i in range(1, 9)], leadw=20.0)
auto('N5a', 'N.5a Wyniki (wyliczone)')
grp('N.6', 'N.6 Uruchamianie napędu', ['rusza manetką od zera', ('wymaga rozpędzenia nogą do … [km/h]', True), 'nie ustalono'])
fields(F(None, 'N.6 czas 0–20 km/h [s] (opcjonalnie)', 'num', 200))
sub('N.7 Próba hamowania')
table('N7', 'Nr', [('Hamulec (przedni / tylny / elektryczny / nożny / wszystkie)', 'text', 90), ('v₀ (rejestrator) [km/h]', 'num', 60), ('Droga hamowania s [m] (taśma; sposób wyznaczenia początku: znacznik / rejestrator)', 'num', 100), ('aₕ z rejestratora [m/s²]', 'num', 60), ('Zejście z toru [m]', 'num', 60), ('Blokowanie koła', 'check', 8), ('Uwagi', 'text', 90)], [str(i) for i in range(1, 7)], leadw=20.0)
auto('R4', 'Opóźnienie z drogi hamowania aₕ = v₀² / (2·s) (wyliczone)')
fields(F(None, 'N.7a Kryterium oceny przyjęte przez rzeczoznawcę [m/s²] + źródło', 'text', FULL))
note('Przepisy nie określają wartości dla hulajnogi / UTO. Wartość porównawcza (analogia): L1e – z ≥ 42 % oba koła, ≥ 25 % koło tylne (zał. nr 7 WT, wg formularza 02_Motocykl), tj. 4,2 / 2,5 m/s².')
grp('N.7b', 'N.7b Ocena: G.16 i § 55d w części „skuteczne hamowanie”', ['Z', 'NZ', 'ND'])
fields(F(None, 'N.7b uzasadnienie', 'text', FULL))
auto('R6', 'Reguła R6 – hamulec')

# ---------------- O ----------------
sec('O', 'O. OKOLICZNOŚCI Z AKT ISTOTNE DLA OCENY')
note('Na podstawie akt – nie są to ustalenia oględzin. Ocenę prawną zachowania kierującego przeprowadza organ.')
fields(F('O.1', 'O.1 Wiek kierującego w dniu zdarzenia [lata]', 'num', 200))
auto('R10', 'Reguła R10 – wiek')
grp('O.2', 'O.2 Kask', ['tak', 'nie', 'nie ustalono'])
fields(F(None, 'O.2 oznaczenie normy z etykiety (kask – protokół rzeczy 08)', 'text', 312.8))
auto('R11', 'Reguła R11 – kask')
grp('O.3', 'O.3 Uprawnienia kierującego poniżej 18 lat', ['karta rowerowa', ('prawo jazdy (kat.)', True), 'brak', 'nie ustalono'])
grp('O.4', 'O.4 Przewożona osoba / zwierzę / ładunek', ['nie', ('tak:', True)])
grp('O.5', 'O.5 Holowanie / ciągnięcie przez pojazd / czepianie się', ['nie', ('tak:', True)])
grp('O.6', 'O.6 Miejsce jazdy', ['droga dla rowerów', 'pas ruchu dla rowerów', 'droga dla pieszych i rowerów', ('jezdnia (dopuszczalna prędkość [km/h])', True), 'chodnik / droga dla pieszych', 'strefa zamieszkania', 'przejazd dla rowerów'], 'inne:')
auto('R12', 'Reguła R12 – zachowania')
grp('O.7', 'O.7 Pora i widoczność', ['dzień', 'zmierzch / świt', 'noc', 'niedostateczna widoczność'])
grp('O.8', 'O.8 Prędkość w chwili zdarzenia – źródło', ['dane operatora', 'monitoring', 'rekonstrukcja (osobne opracowanie)', 'wyjaśnienia / zeznania'])
fields(F('O.8v', 'O.8 prędkość [km/h]', 'num', 150))

# ---------------- P ----------------
sec('P', 'P. PYTANIA ORGANU – KONTROLA POKRYCIA')
table('P', 'Pytanie', [('Jest w postanowieniu / zleceniu', 'check', 8), ('Gotowe', 'check', 8), ('Uwagi', 'text', 160)], [
    '1. Rodzaj urządzenia i cechy konstrukcyjne (definicje PoRD) – D, B', '2. Czy konstrukcja ogranicza prędkość do 20 km/h (§ 55d) – M, N, J',
    '3. Moc i napięcie silnika, sposób uruchamiania napędu, możliwość odpychania nogą (kryteria z SN III KK 13/22) – D, J, M, N', '4. Wymiary i masa – E',
    '5. Wyposażenie obowiązkowe (światła, odblaski, hamulec, sygnał, numer rozpoznawczy, podpórka) – I, G, B, F', '6. Ingerencje w konstrukcję lub oprogramowanie, doposażenie (siedzisko, bateria) – J, D',
    '7. Data wprowadzenia do obrotu (art. 5 ustawy z 30.03.2021) – B.8', '8. Stan techniczny przed zdarzeniem; usterki mogące mieć wpływ na zdarzenie – F–J, R',
    '9. Prędkość w chwili zdarzenia – źródła danych – L, O.8', '10. Czy światła działały / były włączone – I', '11. Inne:'], leadw=260.0)

# ---------------- R ----------------
sec('R', 'R. PODSUMOWANIE – STAN TECHNICZNY I ZGODNOŚĆ Z WT')
auto('R1all', 'R.1 Niezgodności z WT i komunikaty reguł (wyliczone)')
grp('R.2', 'R.2 Usterki mogące mieć wpływ na prowadzenie / hamowanie / widoczność', ['nie stwierdzono', ('stwierdzono (opis)', True), ('nie da się ocenić w części (zakres)', True)])
fields(F(None, 'R.3 Usterki przedwypadkowe – element, opis, możliwy wpływ', 'text', FULL), F(None, 'R.4 Zakres nieoceniony i przyczyna (zniszczenie, brak zasilania, brak dostępu, brak wzorcowanego przyrządu, brak danych producenta)', 'text', FULL), F(None, 'R.5 Elementy zabezpieczone / pobrane (wpis do formularza 08 i rejestru 09)', 'text', FULL))

# ---------------- S ----------------
sec('S', 'S. KONTROLA KOMPLETNOŚCI')
checklist(['Zdjęcia: 4 boki + góra + spód podestu', 'Numer rozpoznawczy / kod graficzny i tabliczka znamionowa', 'Wyświetlacz – przed włączeniem i po włączeniu', 'Mechanizm składania – zbliżenia', 'Hamulce, tarcze, okładziny', 'Opony – rozmiar, bieżnik, ciśnienie zastane przed regulacją', 'Światła i odblaski – działanie, barwa, kształt odblasku tylnego', 'Sterownik i bateria – jeżeli otwierano: przed i po otwarciu', 'Wymiary i masa z danymi wagi', 'Hamownia – świadectwo wzorcowania, wydruki, pliki', 'Jazda testowa – plik rejestratora, warunki, kierujący', 'Dane operatora – wniosek przez organ', 'Ślady obce – zbliżenia ze skalą; wysokości uszkodzeń od podłoża', 'Kask / odzież (jeśli dostępne) – formularz 08', 'Pobrane elementy – rejestr 09', 'Moduł IoT / GPS – zdjęcia, IMEI, zabezpieczenie danych (J.7)'])

# ---------------- T ----------------
sec('T', 'T. ZAKOŃCZENIE')
fields(F(None, 'Godzina zakończenia', 'time', 100), F(None, 'Liczba stron protokołu', 'text', 100), F(None, 'Załączniki (zdjęcia, wydruki, pliki)', 'text', 312.8))
fields(F(None, 'Uwagi / zastrzeżenia osób obecnych', 'text', FULL))
sig('Dariusz Sadek – wykonujący oględziny'); sig('Wykonawca badania na hamowni (jeśli inny)'); sig('Osoba obecna')


# ---------------- opisy pozycji (tools/opisy10.py) ----------------
import re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import opisy10
_keys = sorted(opisy10.H, key=len, reverse=True)
def _hint(label):
    lab = re.sub(r'\s+', ' ', (label or '').strip())
    if not lab: return None
    for k in _keys:
        if lab == k or lab.startswith(k + ' ') or lab.startswith(k + ',') or lab.startswith(k + ':') or lab.startswith(k + '['):
            return opisy10.H[k]
    return None
_miss = []
_ELEM = [c[0] for c in ELEM_COLS]
for sc in sections:
    if sc['id'] in opisy10.SEC: sc['hint'] = opisy10.SEC[sc['id']]
    for b in sc['blocks']:
        k = b['k']
        if k == 'fields':
            for f in b['items']:
                if f['label']:
                    h_ = _hint(f['label'])
                    if h_: f['hint'] = h_
                    else: _miss.append((sc['id'], 'pole', f['label']))
        elif k == 'group':
            h_ = _hint(b['label'])
            if h_: b['hint'] = h_
            else: _miss.append((sc['id'], 'grupa', b['label']))
        elif k == 'checklist':
            for f in b['items']:
                h_ = _hint(f['label'])
                if h_: f['hint'] = h_
                else: _miss.append((sc['id'], 'lista', f['label']))
        elif k == 'subhead':
            h_ = _hint(b['text'])
            if h_: b['hint'] = h_
            else: _miss.append((sc['id'], 'nagłówek', b['text']))
        elif k == 'auto':
            h_ = _hint(b['label'])
            if h_: b['hint'] = h_
            else: _miss.append((sc['id'], 'auto', b['label']))
        elif k == 'table':
            if [c['head'] for c in b['cols']][:9] == _ELEM[:9]:
                b['hint'] = opisy10.ELEG
            elif b['prefix'] in opisy10.TABLES: b['hint'] = opisy10.TABLES[b['prefix']]
            hs = []
            for l in b['labels']:
                if not l or re.fullmatch(r'\d+', l): hs.append(None); continue
                h_ = opisy10.ROWS.get(b['prefix'], {}).get(l) or _hint(l)
                hs.append(h_)
                if not h_: _miss.append((sc['id'], 'wiersz', l))
            if any(hs): b['hints'] = hs
if _miss:
    print('BRAK OPISU:', len(_miss))
    for m in _miss: print('  ', m)

form = {'id': '10', 'defVersion': '1.0.0', 'title': 'PROTOKÓŁ OGLĘDZIN HULAJNOGI ELEKTRYCZNEJ / UTO',
        'subtitle': 'Oględziny powypadkowe, badanie na hamowni i jazda testowa – hulajnoga elektryczna, urządzenie transportu osobistego (UTO)',
        'aliases': {}, 'rules': 'hulajnoga', 'keys': keys, 'groups': groups, 'tables': tables, 'sections': sections}
json.dump(form, open(os.path.join(root, 'forms', '10.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
n = sum(1 for s in sections for b in s['blocks'] if b['k'] in ('fields', 'group', 'checklist') for _ in b['items'])
print('formularz 10:', len(sections), 'sekcji,', n, 'pól (bez tabel i rysunków)')
