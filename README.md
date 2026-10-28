# Maťo / Gukap

Slovenský prezentačný web festivalového technika. Štyri stránky: úvod, služby, profil a dopyt. Obsahuje zámerne vulgárny slogan.

## Spustenie

Otvorte `dist/index.html` v prehliadači. Inštalácia balíkov ani zostavenie projektu nie sú potrebné.

Lokálny HTTP server: `python -m http.server 8000 --directory dist`

Adresa: http://localhost:8000

## Stránky

- `dist/index.html` — úvod
- `dist/catalog.html` — služby
- `dist/akira.html` — profil Maťa (pôvodný názov súboru)
- `dist/favorites.html` — formulár dopytu (pôvodný názov súboru)

Formulár sťahuje textový súbor. Neodosiela správy ani neukladá údaje na server. mato@example.com je demonštračný kontakt. Popisy služieb sú návrhom reklamného textu; pred reálnym použitím ich zosúlaďte s ponukou Maťa.

## Kontrola

`python check_pages.py`

Kontroluje odkazy, súbory, navigáciu, jazyk a formulár. Nenahrádza kontrolu v prehliadači.

## Hosting

Na statický hosting nahrajte obsah priečinka `dist`. Nahratie repozitára na GitHub samo osebe nezverejní web.

Ilustrácia: image_gen, podrobnosti v ASSET-NOTES.md. Písmo Manrope sa načítava z Google Fonts s lokálnou náhradou pri nedostupnom pripojení.

## Interaktívny vizuál

`studio.css` rozširuje existujúce spoločné štýly. Nadpisy používajú Space Grotesk s lokálnou náhradou. Bez nových závislostí alebo zostavovania.

- Mobilné menu podporuje klávesnicu, Escape a zmenu šírky okna. Bez JavaScriptu zostáva navigácia dostupná.
- Karty a titulky sa odhaľujú cez Intersection Observer. Jemné nakláňanie a pohyb tlačidla sa zapínajú iba pri presnom ukazovateli.
- Bežiaci pás mení smer podľa skrolovania, reaguje na jeho rýchlosť, pri hoveri spomalí a má tlačidlo pozastavenia. Výpočty bežia iba pre viditeľné aktívne pásy.
- Slogan, poznámky produkcie a ovládací panel chaosu sú malé interaktívne vtipy. Čísla v profile sú výslovne označené ako humor.
- `prefers-reduced-motion` vypína pohyb. Obsah je čitateľný aj bez JavaScriptu.

Formulár stále iba pripravuje lokálny `.txt` súbor; nevytvára dojem odoslania na server. Kontrola v prehliadači má zahŕňať menu pri 320 px, jeho zatvorenie klávesom Escape, pás pri skrolovaní oboma smermi, znížený pohyb a skutočne stiahnutý súbor.

Render používa existujúci `render.yaml`: statický obsah `dist`, bez build kroku. Zmenu publikovania ani externý deploy nie je potrebné konfigurovať.

## ZACHRÁŇ FESTIVAL

Hra na hlavnej stránke medzi službami a hláškami: káble, zapnutie reflektorov podľa zapamätaného poradia a hľadanie Maťa. Používa `festival-game.js`, `festival-game.css`, SVG/CSS grafiku a existujúci ilustrovaný portrét. Žiadne balíky ani server.

- Celá hra má 30 sekúnd. Čas beží aj v skrytej karte; kontroluje sa aj pred každým herným vstupom.
- Úloha: +100 bodov. Chyba: −10, najmenej 0. Víťazstvo: +5 za každú zobrazenú zostávajúcu sekundu.
- Káble fungujú cez Pointer Events myšou aj dotykom alebo výberom kábla a rozhrania tlačidlami. Všetky úlohy možno ovládať klávesnicou.
- Najlepší ukončený výsledok sa ukladá pod `mato-festival-record` v localStorage. Pri blokovanom úložisku hra pokračuje a rekord zostáva v pamäti relácie.
- Päť pozdravov Maťovi na obrazovke výhry odomkne tajný achievement. Nová hra vždy zruší staré časovače, odložené sekvencie aj rozpracované ťahanie.
- `prefers-reduced-motion` zachová hernú logiku a vypne dekoratívne animácie. Bez JavaScriptu sa hra nespustí; ostatný obsah zostáva dostupný.

Integračný test používa iba Python a už nainštalovaný Chrome. Spustite HTTP server na porte 8018 a **samostatný testovací profil** Chrome s `--headless=new --remote-debugging-port=9338 --user-data-dir=<test-profile>`. Potom:

```text
python check_game_browser.py --url http://127.0.0.1:8018 --port 9338
```

Test kontroluje skutočný mouse/touch drag, klávesnicu, chyby a skóre, všetky úlohy, výhru, prehru, zrušenie a reštart, bonus, rekord a jeho perzistenciu, achievement, 320–1920 px, znížený pohyb, blokovaný localStorage a pôvodný formulár. Deadline testuje posunom hodín v izolovanom prehliadači, bez testovacích prepínačov v produkčnom kóde. Test vymaže iba herný rekord daného testovacieho profilu.
