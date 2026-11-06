# Format wkładu `ogledziny-wklad` (wersja 1)

Plik JSON (UTF-8). Aplikacja „Oględziny” wczytuje go przez „Nowa sprawa z wkładu” (ekran startowy) lub „Dołącz wkład” (zakładka Sprawa) – można wkleić tekst odpowiedzi (także z blokiem ```json) albo wskazać plik. Nic nie jest odrzucane po cichu: aplikacja pokazuje raport, co wczytała, a co pominęła i dlaczego.

## Struktura

```json
{
  "format": "ogledziny-wklad",
  "wersja": 1,
  "rewizja": 1,
  "sprawa": { "sygnatura": "", "organ": "", "data": "RRRR-MM-DD", "opis": "1–2 zdania o sprawie (opcjonalnie)" },
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
      "wynik": "", "nr_zdjecia": "", "status": "", "powod": ""
    }
  ],
  "uwagi_ogolne": ["BRAK W AKTACH: …"]
}
```

## Pola

**Główne.** `format` (stała `ogledziny-wklad`) i `wersja` (liczba `1`) – wymagane. `rewizja` – numer poprawki (informacyjnie).

**`sprawa`** – `sygnatura`, `organ`, `data`: wspólne dane nagłówka (w aplikacji wpisywane raz; przy dołączaniu do istniejącej sprawy nie nadpisują wpisanych). `opis` – tekst informacyjny.

**`formularze[]`** (kolejność dowolna)
- `ref` – unikalna krótka nazwa egzemplarza (A, B, M1…); do niej odwołują się zadania.
- `formularz` – numer `"00"`…`"09"` jako tekst.
- `etykieta` – nazwa pokazywana w aplikacji.
- `pola` – obiekt `identyfikator → wartość` (identyfikatory ze słowników `slownik_NN.md`). Wartość: tekst lub liczba (zapisywana jak podano). Pole wyboru: `true`. Nie wpisuj: wyników oględzin, szkiców, tabel „Zadania specjalne” (sekcja Z). Dodatkowe wiersze tabel (`…rN.cM`, N większe niż liczba wierszy we wzorze) są dozwolone.
- `przypomnienia` – lista krótkich tekstów pokazywanych na górze formularza w terenie.

**`zadania[]`**
- `czynnosc` – wymagane (jedno zdanie, do 160 znaków).
- `id` – np. `Z01` (opcjonalnie; aplikacja nada, jeśli brak lub powtórzony).
- `formularz` – `ref` z `formularze[]` albo `"ogolne"`.
- `sekcja` – litera sekcji formularza; `pole` – identyfikator pola (tylko gdy pewny; nieistniejący zostanie zapamiętany jako tekst z ostrzeżeniem).
- `opis`, `podstawa` (k. … – tylko prawdziwe odwołania), `przyrzad`, `jednostka`.
- `priorytet`: `wysoki` | `normalny` | `niski`.
- `wynik`, `nr_zdjecia`, `status` (`""` | `"wykonane"` | `"niewykonane"`), `powod` – wypełnia biegły w aplikacji; we wkładzie puste.

**`uwagi_ogolne[]`** – ogólne rzeczy do pamiętania (nie przypisane do formularza).

## Zasady walidacji w aplikacji

- Nieznany numer formularza → formularz pominięty (raport).
- Identyfikator spoza formularza → pole pominięte (raport). Wartość inna niż tekst/liczba/`true` → pominięta.
- Pole wyboru z wartością inną niż `true` → pominięte (raport); `false`/pusty → ignorowane.
- Zadanie bez `czynnosc` → pominięte. Zadanie z nieistniejącym `ref` → dodane jako ogólne (ostrzeżenie).

## Jak wygląda to po wczytaniu

Zakładka **Zadania** (lista z podstawą w aktach, przyrządem, polami na wynik / jednostkę / nr zdjęcia i przyciskami Wykonane / Niewykonane + powód) oraz panel „Zadania i przypomnienia” na górze każdego formularza. „Eksport tekstowy” zwraca stan wykonania zadań razem z wypełnionymi polami.
