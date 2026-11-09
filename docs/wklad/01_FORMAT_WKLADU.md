# Format wkładu `ogledziny-wklad` (wersja 2)

Plik JSON (UTF-8). Aplikacja „Oględziny” wczytuje go przez „Nowa sprawa z wkładu” (ekran startowy) lub „Dołącz wkład” (zakładka Sprawa) – można wkleić tekst odpowiedzi (także z blokiem ```json) albo wskazać plik. Nic nie jest odrzucane po cichu: aplikacja pokazuje raport, co wczytała, a co pominęła i dlaczego.

## Struktura

```json
{
  "format": "ogledziny-wklad",
  "wersja": 2,
  "rewizja": 1,
  "sprawa": { "sygnatura": "", "organ": "", "data": "RRRR-MM-DD", "opis": "1–2 zdania o sprawie (opcjonalnie)" },
  "zalaczniki": [
    { "id": "S1", "rodzaj": "szkic", "podstawa": "k. 12 – szkic Policji", "opis": "Szkic miejsca zdarzenia", "cel": "Odtworzyć punkty odniesienia i zmierzyć odległości" }
  ],
  "formularze": [
    {
      "ref": "A",
      "formularz": "03",
      "etykieta": "Pojazd A – Opel Astra WX 12345",
      "pola": { "03.B.1": "Opel", "03.B.2": "Astra" },
      "przypomnienia": ["Zabezpiecz zdjęcie tabliczki znamionowej"]
    }
  ],
  "zadania": [
    {
      "id": "Z01",
      "formularz": "A",
      "sekcja": "G",
      "pole": "03.G.12",
      "czynnosc": "Zmierz ...",
      "opis": "...",
      "podstawa": "k. 45 – protokół oględzin Policji",
      "przyrzad": "kółko pomiarowe Nivel M100",
      "jednostka": "m",
      "priorytet": "wysoki",
      "zalacznik": "S1",
      "wynik": "", "nr_zdjecia": "", "status": "", "powod": ""
    }
  ],
  "uwagi_ogolne": ["BRAK W AKTACH: …"]
}
```

## Pola

**Główne.** `format` (stała `ogledziny-wklad`) i `wersja` (liczba `2`; wersja `1`, czyli bez `zalaczniki` i `zalacznik`, nadal się wczytuje) – wymagane. `rewizja` – numer poprawki (informacyjnie).

**`sprawa`** – `sygnatura`, `organ`, `data`: wspólne dane nagłówka sprawy (zakładka Sprawa; przy dołączaniu do istniejącej sprawy uzupełniają tylko puste pola). `data` to **data zdarzenia** (informacyjna) – pojawia się w nagłówku sprawy i eksportu, **nie** trafia do pól „Data” / „Data oględzin” w formularzach (tych nie wypełniaj we wkładzie). `sygnatura` i `organ` także nie są kopiowane do pól formularzy – wpisz je w `pola`, jeśli mają tam być. `opis` – tekst informacyjny (dopisywany do opisu sprawy).

**`zalaczniki[]`** (nowość w wersji 2) – materiał z akt, który biegły ma mieć w terenie pod ręką: szkice Policji, wybrane zdjęcia z akt, inne dokumenty graficzne. Aplikacja tworzy z nich puste miejsca **„do dołączenia”**; plik (JPG, PNG, HEIC, PDF) biegły dołącza sam, przed wyjazdem (przycisk „Dołącz plik” w zakładce „Materiał z akt”). Pliku nie da się przekazać we wkładzie.
- `rodzaj` – `szkic` | `zdjęcie` | `inne` (wymagane, o ile `id` nie zaczyna się od litery S/F/I).
- `id` – `S1`, `S2`… (szkic), `F1`… (zdjęcie), `I1`… (inne); opcjonalnie. Gdy brak, pasuje do rodzaju albo już istnieje w sprawie – aplikacja nada kolejny numer (zadania z wkładu nadal trafią do właściwego załącznika).
- `podstawa` – **tylko prawdziwe odwołanie do akt** (k. …, nr zdjęcia) – to po nim biegły znajdzie oryginał do skopiowania. Gdy go nie znasz: nazwa dokumentu i „(nr karty do uzupełnienia)”.
- `opis` – co przedstawia (jedno zdanie). `cel` – po co to w terenie (np. „odtworzyć stanowisko fotografującego”, „zmierzyć odległość między punktami wskazanymi na szkicu”).
- Wskazuj tylko to, co **przyda się w terenie**: szkic Policji i zdjęcia, z których da się coś ustalić lub zmierzyć na miejscu. Nie dołączaj całych akt.

**`formularze[]`** (kolejność dowolna)
- `ref` – unikalna krótka nazwa egzemplarza (A, B, M1…); do niej odwołują się zadania.
- `formularz` – numer `"00"`…`"09"` jako tekst.
- `etykieta` – nazwa pokazywana w aplikacji.
- `pola` – obiekt `identyfikator → wartość` (identyfikatory ze słowników `slownik_NN.md`). Wartość: tekst lub liczba (zapisywana jak podano). Pole wyboru: `true`. Nie wpisuj: wyników oględzin, szkiców, dat oględzin, tabel „Zadania specjalne” (sekcja Z). **Pola `gps` i `time`:** przyciski „GPS” i „Teraz” w terenie zastępują cały wpis w polu (bez pytania) – pola `gps` zostaw puste albo wpisz tylko współrzędne dziesiętne („50.123456, 20.123456”); adres wpisuj w polach tekstowych lub w `przypomnienia`. Dodatkowe wiersze tabel (`…rN.cM`, N większe niż liczba wierszy we wzorze) są dozwolone.
- `przypomnienia` – lista krótkich tekstów pokazywanych na górze formularza w terenie.

**`zadania[]`**
- `czynnosc` – wymagane (jedno zdanie, do 160 znaków).
- `id` – np. `Z01` (opcjonalnie; aplikacja nada, jeśli brak lub powtórzony).
- `formularz` – `ref` z `formularze[]` albo `"ogolne"`.
- `sekcja` – litera sekcji formularza; `pole` – identyfikator pola (tylko gdy pewny; nieistniejący zostanie zapamiętany jako tekst z ostrzeżeniem).
- `opis`, `podstawa` (k. … – tylko prawdziwe odwołania), `przyrzad`, `jednostka`.
- `zalacznik` – `id` z `zalaczniki[]` (lub już istniejącego w sprawie), na którym biegły ma wykonać zadanie (np. pomiar punktów ze szkicu). W aplikacji zadanie ma wtedy przycisk „Do załącznika →”.
- `priorytet`: `wysoki` | `normalny` | `niski`.
- `wynik`, `nr_zdjecia`, `status` (`""` | `"wykonane"` | `"niewykonane"`), `powod` – wypełnia biegły w aplikacji; we wkładzie puste.

**`uwagi_ogolne[]`** – ogólne rzeczy do pamiętania (nie przypisane do formularza).

## Dołączanie wkładu i rewizje (faktyczne zachowanie aplikacji)

- **„Nowa sprawa z wkładu”** tworzy nową sprawę (jeśli bieżąca ma zmiany niezapisane do pliku, aplikacja pyta o potwierdzenie).
- **„Dołącz wkład”** do istniejącej sprawy zawsze **dokłada**, niczego nie aktualizuje ani nie scala: każdy element `formularze[]` staje się **nowym egzemplarzem** (gdy taki `ref` już jest w sprawie, dostaje dopisek `*`), każde zadanie – **nowym zadaniem** (powtórzone `id` dostaje `*`). Istniejące formularze, wpisane wyniki, statusy i powody zadań **nie są zmieniane ani usuwane**. Nagłówek sprawy: uzupełniane są tylko puste pola; `uwagi_ogolne` są dopisywane.
- `rewizja` jest tylko informacją – aplikacja jej nie porównuje.
- **Skutek:** wczytanie rewizji 2 przez „Dołącz wkład” do sprawy, w której już coś jest, **podwoi** formularze i zadania. Zalecenie: rewizję wczytuj jako **nową sprawę** przed oględzinami; gdy są już wyniki, wczytaj tylko **uzupełnienie** (nowe zadania z nowymi `id`; zadanie może wskazać istniejący formularz jego `ref`; nie powtarzaj formularzy ani zadań już wczytanych).

## Zasady walidacji w aplikacji

- Nieznany numer formularza → formularz pominięty (raport).
- Identyfikator spoza formularza → pole pominięte (raport). Wartość inna niż tekst/liczba/`true` → pominięta.
- Pole wyboru z wartością inną niż `true` → pominięte (raport); `false`/pusty → ignorowane.
- Załącznik bez poprawnego rodzaju → pominięty (raport); bez `podstawa` → ostrzeżenie. `zalacznik` w zadaniu wskazujący nieistniejący załącznik → powiązanie pominięte (ostrzeżenie).
- Zadanie bez `czynnosc` → pominięte. Zadanie z nieistniejącym `ref` → dodane jako ogólne (ostrzeżenie).

## Jak wygląda to po wczytaniu

Zakładka **Zadania** (lista z podstawą w aktach, przyrządem, polami na wynik / jednostkę / nr zdjęcia i przyciskami Wykonane / Niewykonane + powód) oraz panel „Zadania i przypomnienia” na górze każdego formularza. „Eksport tekstowy” zwraca stan wykonania zadań razem z wypełnionymi polami.
