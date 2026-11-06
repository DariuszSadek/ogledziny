# Raport testów akceptacyjnych (część automatyczna)

Wygenerowano: 2026-11-06T17:47:29.168Z (tests/akceptacja.mjs). Wynik: **12 / 12** zaliczonych.

Testy automatyczne wykonano na MacBooku w Chrome i silniku Safari (WebKit), nie na iPadzie. Testy na urządzeniach są w instrukcji (część „Próba w terenie”).

| Nr | Test | Wynik | Szczegóły |
|---|---|---|---|
| A1 | Tryb samolotowy: otwarcie aplikacji, wypełnienie, zapis pliku | PASS | plik bez-sygnatury_2026-11-06_1846.json, 2 formularze |
| A2 | Zamknięcie przeglądarki i ponowne otwarcie: dane z bufora na miejscu | PASS | przecinek i kropka zachowane dosłownie; wiersz dodany |
| A3 | Plik zapisany na jednym urządzeniu otwiera się na innym bez strat (wszystkie 10 formularzy) | PASS | 10 formularzy, 3 kB, zapis→otwarcie→zapis identyczny: true |
| A4 | Plik ze starszej wersji definicji otwiera się po aktualizacji (raport, brak strat po cichu) | PASS | raport pokazuje zmianę wersji i pole nieprzeniesione; pole zachowane w pliku; testy aliasów i migracji 00 (poprzednia wersja) OK |
| A5 | Raport zgodności: 0 brakujących pól | PASS | pola PDF 10481, w aplikacji 10481, brakujących 0 |
| A6 | Aktualizacja aplikacji: baner „dostępna nowa wersja”, nowa wersja cache, dane z bufora zachowane | PASS | cache ogledziny-0.5.2-eff7967a5a → ogledziny-9.9.9-e970bc3894; baner: true; dane po aktualizacji: „przed aktualizacją”; wersja w aplikacji: 9.9.9+e970bc3894 |
| A7 | Prywatność: zero żądań poza własnym serwerem; polityka CSP blokuje połączenia zewnętrzne | PASS | żądań zewnętrznych: 0; fetch na example.com zablokowany: true |
| A8 | Repozytorium: brak plików spraw, PDF i danych osobowych (kontrola przed commitem) | PASS | 64 plików w repozytorium, niedozwolonych: 0, hook pre-commit: true |
| A9 | Wydruk do PDF i eksport tekstowy | PASS | PDF wygenerowany (4909 kB); liczba pól w eksporcie: 741 |
| A10 | Silnik Safari (WebKit): wszystkie formularze renderują się, liczba pól zgodna z definicją | PASS | zgodne |
| A11 | Wkład: wczytanie, wstępne wypełnienie, lista zadań, statusy, eksport, plik, wydruk | PASS | jednostkowe 9 + przeglądarka 15 kontroli |
| A12 | Pomoc w aplikacji (offline): instrukcja wkładu, kopiowanie polecenia i instrukcji projektu do schowka | PASS | 5 kontroli |

## Odniesienie do sekcji 10 zadania

- Tryb samolotowy: otwarcie, wypełnienie, zapis pliku → A1 (offline w Chrome) + próba na iPadzie (instrukcja).
- Zamknięcie i ponowne otwarcie: dane z bufora → A2 (zamknięcie przeglądarki, nowy start na tym samym profilu) + próba na iPadzie.
- Plik z iPada na MacBooku bez strat → A3 (zapis i odczyt w osobnych profilach; zapis→otwarcie→zapis identyczny) + próba międzyurządzeniowa (instrukcja).
- Starsza wersja definicji po aktualizacji → A4 i A6.
- Raport zgodności: 0 brakujących pól → A5.

