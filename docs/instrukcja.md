# Oględziny – instrukcja użytkownika

Adres aplikacji: **https://dariuszsadek.github.io/ogledziny/**

© 2026 Motoanalityka Dariusz Sadek. Wszelkie prawa zastrzeżone. Kopiowanie, rozpowszechnianie, modyfikowanie i wykorzystywanie wzorów formularzy, w całości lub w części, bez pisemnej zgody autora jest zabronione.

## 1. Instalacja

**iPad i iPhone (Safari).** Otwórz adres w Safari → przycisk Udostępnij (kwadrat ze strzałką) → „Dodaj do ekranu początkowego” → zostaw włączone „Otwórz jako aplikację internetową” (jeśli jest) → Dodaj. Uruchom aplikację **raz z ikony, mając internet** i poczekaj kilka sekund, aż pobierze pliki. Od tej chwili działa bez internetu.
*Nazw przycisków nie udało mi się potwierdzić w dokumentacji Apple; jeśli na ekranie wyglądają inaczej, napisz mi.*

**MacBook (Safari, macOS Sonoma 14 lub nowszy).** Otwórz adres w Safari → Plik → „Add to Dock” (albo Udostępnij → „Add to Dock”) → nadaj nazwę → Dodaj ([Apple: Use Safari web apps on Mac](https://support.apple.com/en-vn/104996)). Aplikacja z Docka otwiera się we własnym oknie.

**Najnowszy iPadOS dla iPada Pro 11" 1. gen. (A1934):** według źródeł zewnętrznych iPadOS 26.x (iPadOS 27 nie obejmuje tego modelu). Aplikacja nie wymaga niczego nowszego.

## 2. Zasady pracy – co gdzie jest zapisane

| Miejsce | Co to jest | Uwaga |
|---|---|---|
| **Bufor** (w urządzeniu) | autozapis każdej zmiany, na pasku „Bufor: OK gg:mm” | to tylko bufor roboczy; jest osobny na iPadzie, iPhonie i Macu |
| **Plik sprawy** (.json) | jedyny właściwy zapis; przenosisz go przez iCloud Drive | pasek pokazuje „Plik: zapisano gg:mm” albo „są zmiany po zapisie” |

**Zapisuj plik** przycisku „Zapisz plik” po oględzinach i w przerwach. Menu udostępniania → „Zapisz w Plikach” → iCloud Drive. Nazwa pliku: `[sygnatura]_[RRRR-MM-DD]_[GGMM].json`.
Nie czyść danych witryn w ustawieniach Safari – wyczyści to bufor (plik w iCloud zostaje).

## 3. Praca w terenie

1. **Nowa sprawa** (ekran startowy) → zakładka **Sprawa**: wpisz raz sygnaturę, organ i datę (trafiają do stopek wydruku i nazwy pliku).
2. **+ Formularz**: wybierz formularz z listy (00–09), „Dodaj wybrany”. Ten sam formularz możesz dodać wiele razy (pojazd A i B, każda opona, każda rzecz); nazwę egzemplarza zmienisz w zakładce Sprawa.
3. Litery pod zakładkami to skróty do sekcji.
4. **Pola tekstowe** rosną z treścią; po dotknięciu powiększają się, żeby było miejsce na pismo **Apple Pencil** (Scribble). Działa też dyktowanie z klawiatury ekranowej.
5. **Teraz** wpisuje bieżącą godzinę, **GPS** – współrzędne z urządzenia (trzeba zezwolić na lokalizację). Liczby wpisuj z przecinkiem lub kropką – zostają dokładnie tak, jak wpisano.
6. **Tabele**: „Dodaj wiersz” dopisuje wiersz na końcu. Nagłówek tabeli zostaje na górze ekranu, dopóki przewijasz jej wiersze.
7. **Rozkładówki pojazdów** (02–05) i katalogi opon (07): dotknij kwadracika przy elemencie – pojawia się czerwony X. Pola µm wpisujesz bezpośrednio na rysunku. Rysunek jest szeroki – możesz go przewijać w poziomie.
8. **Szkic sytuacyjny** (01, sekcja J): Pióro, Gumka (usuwa kreski), Cofnij, Wyczyść. „Palec: rysuje / przewija” przełącza, co robi palec; Apple Pencil zawsze rysuje.
9. W każdej sekcji jest pole **Uwagi**.
10. Na iPhonie używaj ekranu poziomo – wtedy tabele wyglądają jak na iPadzie; w pionie pola układają się w karty.

## 3a. Wkład od Claude AI i lista zadań (przygotowanie przed oględzinami)

1. W projekcie Claude AI (analiza akt) użyj paczki z folderu `~/A_Oględziny/Dla_Claude_AI/` (instrukcja w **CZYTAJ_MNIE.md**). Po analizie napisz: „Przygotuj wkład do formularzy”. Claude AI zwróci podsumowanie i blok `json`.
2. W aplikacji (MacBook albo iPad): ekran startowy → **Nowa sprawa z wkładu (Claude AI)** → wklej odpowiedź (może być z blokiem ```json) albo wskaż plik → **Wczytaj**. Aplikacja tworzy potrzebne egzemplarze formularzy, wpisuje dane z akt (marka, model, VIN, nr rejestracyjny…) i zakłada listę zadań. Każde pominięcie (np. błędny identyfikator pola) jest w raporcie – nic nie ginie po cichu. Do istniejącej sprawy dołączysz wkład w zakładce Sprawa → „Dołącz wkład”.
3. Zakładka **Zadania**: każde zadanie ma czynność, opis, podstawę w aktach (k. …), przyrząd, pola **Wynik / Jednostka / Nr zdjęcia** i przyciski **Wykonane / Niewykonane** (przy niewykonanym wpisz powód). Możesz poprawiać teksty, **dodawać własne zadania** i usuwać zbędne. „Do formularza →” przenosi do właściwej sekcji lub pola. Filtry: tylko otwarte, wysoki priorytet.
4. Na górze każdego formularza jest żółty panel „Zadania i przypomnienia do tego formularza”.
5. Zapisz plik sprawy i jedź na oględziny (iPad). Po powrocie otwórz plik na MacBooku, zrób **Eksport dla Claude** – w eksporcie jest stan wykonania zadań (wynik, jednostka, nr zdjęcia, niewykonane + powód) obok wypełnionych pól – i wklej go do projektu Claude AI.
6. Wydruk całej sprawy do PDF zaczyna się od listy zadań.

## 4. Otwieranie spraw i starsze wersje

„Otwórz sprawę” → wskaż plik z Plików / iCloud Drive. Jeśli plik pochodzi ze starszej wersji formularzy, aplikacja przenosi dane **po identyfikatorach pól** i pokazuje **raport**; pola, których nie dało się przenieść, są zachowane i wyświetlone na czerwono na początku formularza – przepisz je ręcznie, a potem usuń listę. Nic nie ginie po cichu.

## 5. Wydruk do PDF i eksport (MacBook, także iPad)

- **Drukuj / PDF** (karta w zakładce Sprawa – cała sprawa; przycisk u góry formularza – ten formularz): w oknie drukowania wybierz „Zapisz jako PDF”. Wydruk A4 w stylu wzorów, z sygnaturą i zastrzeżeniem praw w stopce.
- **Eksport dla Claude**: plik Markdown z wypełnionymi polami w kolejności formularzy, z identyfikatorami pól (`[01.A.2]`), do wklejenia do rozmowy z Claude.
*Nie sprawdziłem jeszcze wydruku w Safari na iPadzie i Macu – daj znać, jak wygląda.*

## 6. Aktualizacje

Gdy pojawi się nowa wersja, na górze ekranu zobaczysz żółty baner „Dostępna nowa wersja aplikacji” z przyciskiem **Zaktualizuj**. Dane z bufora zostają. Sprawdzanie odbywa się po wejściu do aplikacji, gdy jest internet.

## 7. Prywatność

Aplikacja niczego nie wysyła; polityka bezpieczeństwa w kodzie blokuje połączenia poza własnymi plikami. Pliki spraw i dane osobowe nie trafiają do repozytorium na GitHubie (publicznym) – tam są tylko pliki aplikacji i wzory formularzy.

## 8. Próba w terenie (do zrobienia raz, na urządzeniach)

Zaznacz i napisz mi wynik. Wyniki testów automatycznych (Mac, Chrome i silnik Safari) są w `docs/raport_testow_akceptacyjnych.md`.

1. ☐ **Samolot, iPad:** tryb samolotowy → uruchom z ikony → Nowa sprawa → wypełnij kilka pól (Pencil, dyktowanie, Teraz, GPS, szkic, Dodaj wiersz, rozkładówka) → Zapisz plik → Zapisz w Plikach / iCloud Drive.
2. ☐ **Zamknięcie i otwarcie:** zamknij aplikację z przełącznika, otwórz ponownie – dane na miejscu.
3. ☐ **iPad → MacBook:** otwórz ten plik na Macu („Otwórz sprawę”) – bez strat; wydrukuj do PDF; zrób Eksport dla Claude.
4. ☐ **Mac → iPad:** zapisz plik na Macu, otwórz na iPadzie.
5. ☐ **Aktualizacja:** po mojej następnej zmianie zobacz baner „Dostępna nowa wersja”, kliknij Zaktualizuj, sprawdź, że dane zostały.
6. ☐ **Test urządzenia** (zakładka Sprawa) – zrzut ekranu, gdy cokolwiek nie działa.

## 9. Znane ograniczenia

- Moduł „Nowa sprawa” (wstępne wypełnianie formularzy zadaniami z analizy akt) to etap 2 projektu – nie jest zbudowany; w pliku sprawy jest zarezerwowane miejsce na listę zadań.
- Bufory na urządzeniach nie synchronizują się – sprawy przenosisz plikiem.
- Wydruk i eksport .md na iPadzie nie były jeszcze sprawdzone na urządzeniu.
