# Etape

**Regula:** la începutul fiecărei etape, Claude amintește:
- scopul;
- pașii;
- ce face Bogdan și ce face Claude;
- cum știm că etapa e gata.

Bifăm aici pe parcurs.

**Termene (5 nov):** CV-ul pleacă **azi, 5 nov** (nu ~20 nov), cu linkul live al jocului. CV-ul descrie jocul ca live pe JSON, cu baza Supabase „in progress”. Restul planului se mută după CV; datele din noiembrie sunt de reconfirmat cu Bogdan.

| Când | Ce | Gata când |
|---|---|---|
| 5 nov | interfața nouă pe versiunea din JSON (Etapa 3), testată; Bogdan testează și face push | site-ul live arată noua versiune; linkul e în CV |
| noiembrie, după CV | contul Supabase ✅ · schema (de terminat explicația + commit) · încărcarea celor 15 loturi | `GROUP BY` pe ligă și sezon (scris de Bogdan) dă cifrele din `SURSE-DATE.md` |
| noiembrie | legătura cu Transfermarkt (`tm_id`) · valorile de piață · poze + numere (API-Football) · Excelul cu tier (îl completează Bogdan) | fiecare jucător din 2026-27 are poză, număr, tier, valoare |
| noiembrie – decembrie | jocul 1 citește din Supabase · jocul 2 · hub-ul cu cifre din bază | ambele jocuri merg live, pe telefon și pe PC |
| decembrie | jocul 3 · conturile | |
| ianuarie | cod înghețat, README, explicațiile pentru schemă și SQL | |

## Etapa 0 — Fundația (21 oct)
**Scop:** știm ce construim, cu ce, și ce date primim — testat, nu presupus.

- [x] linkul live regăsit: https://bogdandumitrascu04.github.io/Guessthefootballer/
- [x] proiectul real identificat (`Projects\Guessthefootballer`; `Desktop\Joc` e o copie veche)
- [x] deciziile: Supabase, mod mixt, poze API-Football (`DECIZII.md`)
- [x] sursele testate: football-data.org dă loturile pe 3 sezoane, API-Football dă pozele (`SURSE-DATE.md`)
- [x] **Bogdan:** cont Supabase (cu GitHub-ul `BogdanDumitrascu04`), proiectul `guessthefootballer`, plan Free (29 oct). A ieșit regiunea **West Europe (London, eu-west-2)**, nu Frankfurt; rămâne așa (o diferență mică de viteză pentru jucătorii din România). Înainte de conturi (decembrie) verificăm ce scriem în politica de confidențialitate despre locul datelor.
- [x] **Bogdan:** primul commit cu documentele (`CLAUDE.md`, `docs/`) — „pasul 0”, pushed 22 oct. GitHub Desktop e pe contul `BogdanDumitrascu4`, care e colaborator pe repo; emailul local al repo-ului e gmail-ul (legat de `BogdanDumitrascu04`)

**Gata când:** totul e bifat.

## Etapa 1 — Datele (mod: ciclul complet)
**Scop:** baza din Supabase (PostgreSQL) cu toți jucătorii din 5 ligi × 3 sezoane, verificată. Fără SQLite local (decis 29 oct).
- [x] `.venv` (Python 3.13) + `.env` (aceleași chei) + `.env.example` + `.gitignore` + `requirements.txt` (Claude, 21 oct)
- [x] test pe toate cele 15 loturi — rezultatele în `SURSE-DATE.md` (21 oct)
- [ ] pasul 1: descărcarea loturilor de la football-data.org (15 cereri) — `scripts/download_squads.py`
  - [x] cerința (Bogdan, cu variante): `data/raw/PL_2024-25.json`; sezoanele terminate o dată, cel curent la fiecare rulare; la 429 așteaptă și reîncearcă o dată; la eroare trece mai departe; un rând pe fișier
  - [x] codul + 16 teste fără internet (Claude, 21 oct)
  - [x] commit + push (în „pasul 0”, 22 oct)
  - [x] rularea pe date reale (Bogdan, 22 oct): 15 fișiere, 9.081 de jucători în loturi, 0 erori; a doua rulare: „existent” + „actualizat”, fără pauză
  - [x] review cu Gemma 4 E4B, local în Bionic (22 oct, 14 min): 5 observații, verificate una câte una — niciuna valabilă (4 descriu cod care există deja, 1 e o alegere de design)
  - [x] decizia lui Bogdan (22 oct): nu reparăm nimic
  - [x] commit + push (Bogdan, commitul „a”, 22 oct)
- [ ] pasul 2: setul Transfermarkt (decis 29 oct, `DECIZII.md`)
  - [x] verificat ce conține și cât cântărește (29 oct, `SURSE-DATE.md`)
  - [x] descărcarea primelor 5 tabele (`players`, `player_valuations`, `transfers`, `clubs`, `competitions`, 17,5 MB) în `data/raw/transfermarkt/` (Claude, 29 oct, cu acordul lui Bogdan)
  - [x] inventarul (29 oct, `SURSE-DATE.md`): 91,7% dintre jucătorii din loturi potriviți după nume + data nașterii; valori la ~80% pe sezoanele trecute, ultima valoare din iunie 2026 pentru 2026-27; carierele trebuie curățate (juniori, împrumuturi, date în viitor)
  - [ ] mai târziu, pentru tier și numere: `appearances`, `games`, `game_lineups` (176 MB)
- [x] conexiunea din Python la Supabase: `SUPABASE_DB_URL` în `.env` (Bogdan), `psycopg` (Claude). Test 29 oct: PostgreSQL 17.11, 0 tabele
- [ ] pasul 3: schema în Supabase: `leagues`, `seasons`, `clubs`, `players`, `squad_entries`, `market_values` (`transfers` în decembrie, cu jocul 3)
  - [x] conceptul (tabele, cheie primară, cheie străină, pe exemplul Mbappé) + cerința lui Bogdan (30 oct): `players` = ce nu se schimbă, `squad_entries` = ce se schimbă, un rând nou pe sezon. Lipsea: relația e **one-to-many** (un jucător → mai multe rânduri în `squad_entries`), nu one-to-one; din `players` nu se schimbă niciodată doar `id`-ul (restul se poate corecta, ex. data greșită de naștere); regulile pe care baza trebuie să le refuze
  - [x] codul (Claude, 30 oct): `sql/schema.sql`, `scripts/apply_schema.py`, `tests/test_schema.py` (16 teste pe o schemă temporară, anulată la final); toate 32 de teste verzi, `ruff` curat
  - [x] rularea (Bogdan, 30 oct): `apply_schema.py` → cele 6 tabele apar în Table Editor; verificat: RLS pornit pe toate, 0 politici, nicio schemă de test rămasă
  - [ ] explicația lui Bogdan în 2–3 propoziții + 1–2 întrebări de verificare
  - [ ] review cu alt AI → decizia lui Bogdan → commit (Bogdan)
- [ ] încărcarea loturilor în Supabase + verificări (câți jucători pe ligă/sezon, duplicate)
- [ ] potrivirea jucătorilor football-data.org ↔ Transfermarkt (nume + data nașterii → `tm_id`)
- [ ] pozele + numerele de la API-Football, potrivite cu jucătorii (96 de cereri, pe o zi)
- [ ] importul datelor vechi (tier + număr, 2024-25)
- [ ] Excelul cu tier pentru 2026-27: Claude îl generează precompletat, Bogdan îl completează, importul îl validează

## Etapa 2 — Jocul 1 pe Supabase (mod: ciclul complet la SQL)
- [ ] politici RLS (citire publică a jucătorilor, fără scriere din browser)
- [x] la reluare: repornirea proiectului din dashboard (pus pe pauză, anunț pe email 5 nov; repornit de Bogdan pe 20 nov)
- [ ] **înainte de trecerea pe Supabase:** soluția pentru pauză, gratuită, fără Pro (activitate programată și/sau rezervă statică în JSON, vezi „De decis” în `DECIZII.md`), verificată: cu baza oprită, linkul din CV tot merge
- [ ] jocul citește jucătorii din Supabase în loc de JSON (arată la fel ca acum)

## Etapa 3 — Interfața nouă (mod: construiește Claude)
Făcută pe 5 nov, înaintea Supabase, pe datele din JSON (2024-25). Testată local: toate paginile, desktop și telefon (375 px), cele 5 ligi, 10 încercări, câștig, repornire, schimbarea limbii, fără erori în consolă.
- [x] temă nouă, lizibilă, pe toată pagina; grilă cu toate încercările (nu doar ultima)
- [x] pozele jucătorilor în autocomplete și în rezultat (unde există portret; Bundesliga, Serie A și Ligue 1 au doar sigla, deci inițiale în grilă)
- [x] mobil
- [x] căutare fără diacritice („odegaard”), cu săgeți + Enter; o încercare repetată nu se mai consumă; numele jucătorului apare la final
- [x] hub-ul: cifrele corecte („5 leagues · 1,186 players”), scrise de mână
- [x] testul lui Bogdan + push (5 nov)
- [x] prima pagină nouă: titlu, rând animat din joc, intrare directă pe ligă, carduri „Coming soon”, 4 limbi, fără banner de cookie-uri, politică rescrisă, logo și fundal mai ușoare, previzualizare la link (5 nov, Claude; testat local pe desktop și la 375 px)
- [x] testul lui Bogdan + push pentru prima pagină (5 nov)
- [x] sezonul 2026-27 în joc, pe varianta rapidă (8 nov, Claude): loturile reîmprospătate, 101 cereri API-Football, `download_api_football.py` + `build_season.py` + 10 teste noi (42 în total, verzi); testat local, desktop și telefon
- [x] testul lui Bogdan (8 nov); jocul, datele 2026-27 și `scripts/serve.py` puse pe GitHub
- [x] după feedbackul Gemini (8 nov): pagina de selecție centrată + eticheta „current”, Enter alege primul nume din listă, căsuțele noii încercări se întorc, butonul Share cu pătrățele (fără nume); testat local, desktop și telefon
- [x] indiciile și legenda refăcute (8 nov, după propunerile Gemini + Claude, alese de Bogdan): două cipuri blocate, deblocate după 3 și 6 încercări, deschise cu un click; legenda pe un rând de cipuri; regulile complete în ⓘ; testat local, desktop și telefon
- [x] testul lui Bogdan + push pentru schimbările de după feedbackul Gemini (cele patru + indiciile) (8 nov, `d2dcd3d`)
- [x] cererile lui Bogdan din 20 nov, toate testate local și de el, pe GitHub:
  - [x] 6 încercări; echipa după a 2-a, vârsta după a 4-a; mesaj separat la ultima încercare (`095b969`)
  - [x] ID-ul football-data la fiecare jucător din 2026-27 + fișa rundei (`round.js`, cerința lui Bogdan, varianta b) (`685a9f6`)
  - [x] pagina de rezultat: Share duce la `result.html?r=…`, rezumat + „Vezi detalii”, răspunsul după un buton de spoiler (`b6e7460`)
  - [x] punctele (tabelul confirmat de Bogdan) + rândul câștigător fără valori până la spoiler (`1ba642c`)
- [ ] indiciul de start (Easy/Medium: transferuri din Transfermarkt; Hard: „Știai că?”), din date structurate + șabloane în `i18n.js`; ciclul de învățare la partea de date
- [ ] **SuperLiga României** (decis 8 nov, de început pe 9 nov, când se resetează cererile API-Football):
  - [ ] lista celor 16 cluburi din 2026-27 (confirmată de Bogdan sau din Wikipedia)
  - [ ] 17 cereri API-Football: lista cluburilor din România + 16 loturi
  - [ ] `build_season.py`: variantă pentru ligile fără football-data.org (baza = lotul API-Football; numele complet, naționalitatea, data nașterii și valoarea din setul Transfermarkt, `RO1`) + teste
  - [ ] în joc: a 6-a ligă, doar 2026-27, afișată „SuperLiga”; prima pagină și pagina de selecție cu 6 ligi
  - [ ] testul lui Bogdan + explicația scriptului (regula de aur) + push
- [x] explicația lui Bogdan pentru `build_season.py` (20 nov, din a doua încercare)
- [ ] explicația lui Bogdan pentru `download_api_football.py` și pentru schema din `sql/` (regula de aur); fișierele au intrat deja în commitul `095b969`, din greșeală
- [ ] la următoarea fereastră de transferuri: `download_squads.py`, apoi `download_api_football.py --squads` (după ce se șterg loturile vechi din `data/raw/api-football/`), apoi `build_season.py`
- [ ] hub-ul: cifrele luate din bază (după Etapa 2)

## Etapa 4 — Jocul 2: higher or lower (până la CV)
- [ ] interogarea: doi jucători la întâmplare din același sezon, cu valorile lor (`market_values` JOIN `players`)
- [ ] jocul: alegi pe cel mai valoros, scorul crește cât răspunzi corect; valoarea apare după răspuns
- [ ] intră în hub, lângă jocul 1

## Etapa 5 — Publicarea (până la CV)
- [ ] deploy pe GitHub Pages + soluția pentru pauza Supabase din Etapa 2
- [ ] README nou, capturi noi, credit pentru surse (football-data.org, API-Football, transfermarkt-datasets)

## Etapa 6 — Jocul 3: cariera (decembrie)
- [ ] cariera din `transfers` + ultimul club din lotul 2026-27; fără echipe de tineret și secunde
- [ ] jocul: cluburile și anii, ghicești jucătorul (autocomplete ca la jocul 1)

## Etapa 7 — Conturi (decembrie; cerute din nou de Bogdan pe 20 nov)
- [x] punctele pe rundă, calculate din fișa rundei (`roundPoints()`), vizibile fără cont (20 nov)
- [x] **Bogdan:** repornește proiectul Supabase din dashboard (20 nov); pooler-ul a răspuns după câteva minute, cele 16 teste de schemă trec
- [x] ping zilnic din GitHub Actions, ca Supabase să nu intre pe pauză (adus înainte, cerut de Bogdan pe 20 nov)
  - [x] `.github/workflows/keep-supabase-awake.yml` (Claude, 20 nov)
  - [x] **Bogdan:** secretul `SUPABASE_DB_URL` în GitHub (Settings → Secrets and variables → Actions) (20 nov)
  - [x] **Bogdan:** commit + push (`dd12760`); rulările programate din 21 și 22 nov, verzi. Au pornit pe la 14:45 UTC, nu la 06:17: GitHub întârzie rulările programate, de aceea rulăm zilnic
- [x] **Bogdan:** client OAuth în Google Cloud Console, aplicația publicată („In production”); Google activat în Supabase, cu adresele de întoarcere salvate; cheile n-au trecut prin chat (22 nov)
- [ ] politica de confidențialitate actualizată + butonul „Șterge contul”, înainte de lansarea conturilor
- [ ] înregistrare / login (Supabase Auth, Google)
  - [x] commit `game_results` (Bogdan, 23 nov, `4071ff8`; în titlu a intrat din greșeală și „Apoi Commit to master → Push”)
  - [x] butonul de cont în header, pe toate cele 4 pagini, în 4 limbi; `auth.js` + `account.css`; biblioteca `vendor/supabase-js-2.119.0.js` (Claude, 23 nov). Testat local, cu o cheie de probă și o sesiune falsă: desktop și 375 px, fără scroll orizontal, meniul (Escape, click în afară), deconectarea, numele afișat ca text, nu ca HTML. Supabase trimite corect spre Google
  - [x] cheia publică (publishable) în `auth.js` (23 nov). Verificat prin API-ul real, cu cheia: Google e activ; un vizitator nelogat primește „permission denied” și la tabel, și la `finish_round`; butonul construiește corect cererea spre Google (PKCE)
  - [ ] **Bogdan:** în Supabase, adresele de întoarcere `http://localhost:8765/**` și `https://bogdandumitrascu04.github.io/Guessthefootballer/**`; providerul **Email** dezactivat (e încă pornit, deci cineva și-ar putea face cont cu email prin API, ocolind decizia „doar Google”)
  - [x] testul lui Bogdan: login real cu Google, local, și deconectarea merg (23 nov). **Fără push** până la politica de confidențialitate + „Șterge contul”
  - [x] meniul contului refăcut după feedbackul lui Bogdan (23 nov): antet cu inițiala, numele și emailul, apoi rânduri cu iconițe; aliniat la marginea header-ului (înainte ieșea din ecran pe telefon). Testat pe desktop și la 375 px
  - [ ] testul lui Bogdan pentru meniul nou
- [ ] fiecare rundă terminată se salvează (`game_results`: fișa rundei + punctele calculate de bază; RLS: fiecare își vede doar rundele lui) — ciclul de învățare
  - [x] conceptul (Claude, 23 nov): Supabase Auth (`auth.users`, `auth.uid()`), politicile RLS (doar `select` și `insert` pe rândurile proprii), punctele într-o coloană generată, limita (baza nu poate dovedi că runda a fost jucată cinstit), problema rundei abandonate fără `update`
  - [x] cerința lui Bogdan (23 nov): un rând = o rundă (id, user_id, liga, sezonul, dificultatea, început + final, jucătorul ascuns, încercări, limita, câștigată, indicii); doar rundele proprii, citire + adăugare; punctele într-o coloană generată; runda se înregistrează de la început, `in_progress`. Lipsea: codul fișei (pentru `result.html?r=`); orele puse de bază; ligă și sezon valide (chei străine spre `leagues` / `seasons`); 0 încercări, pierdută ⇒ încercări = limita, indicii 0–2, lungimea codului, închiderea de două ori; formula completă (trepte, multiplicatori, pierdută = 0); statisticile se calculează, nu se salvează; **contradicția**: salvarea finală a unei runde `in_progress` e un `update`
  - [x] varianta pentru runda abandonată: **A** (un rând + funcția `finish_round`), aleasă de Bogdan (23 nov)
  - [x] SQL-ul + testele (Claude, 23 nov): `sql/reference_data.sql` (5 ligi, 3 sezoane), `sql/game_results.sql`; `apply_schema.py` le aplică pe toate trei; `tests/test_game_results.py` (32 de teste) + `tests/points_cases.json` (comun cu `round.test.js`). 75 de teste Python + 11 JS verzi, ruff curat; nimic rămas în bază după teste
  - [x] rularea (Bogdan, 23 nov): 32 de teste verzi; `apply_schema.py` → `game_results` în baza reală. Verificat de Claude: RLS pornit, cele 2 politici, `finish_round` cu `search_path=public, pg_temp`, browserul are doar `select` + `insert` pe 4 coloane, 5 ligi + 3 sezoane
  - [x] explicația lui Bogdan + 2 întrebări de verificare (23 nov): explicația corectă; 1a (`update` direct: lipsa dreptului + lipsa politicii) și 1b (`finish_round`: `finished_at is null` + `user_id = auth.uid()` → excepție) corecte; 2 (runda abandonată: doar coloanele de start, `points` = 0 pentru că `case when null` merge pe `else`) corect, cu o greșeală: limita salvată e 6 (regula jocului), nu 10. Observația lui: încercările unei runde abandonate nu ajung în bază
  - [x] review cu alt AI (23 nov): 5 observații, verificate de Claude pe baza reală. Valabile: 3 (`max_guesses` îl alege browserul → o rundă pe Greu ghicită din prima ia 400 de puncte în loc de maximum 240) și 4 (`finish_round` acceptă un cod gol). Parțial: 2 (o rundă abandonată nu se deosebește de una în desfășurare; ține de interogarea din profil, nu de tabel). Nevalabile: 1 (limita din `engine.js` e 6, nu 12), 5 (`PUBLIC` n-are drepturi pe tabel; `anon` și `authenticated` n-au `CREATE` pe `public`)
  - [x] decizia lui Bogdan: se repară 3 și 4 (23 nov). Reparațiile (Claude): limita o pune baza (`max_guesses` implicit 6, browserul completează doar liga, sezonul, dificultatea; test care compară cu `MAX_ATTEMPTS` din `engine.js`); codul fișei doar cu caracterele din `encodeRound()`. 78 de teste Python + 11 JS verzi. Tabelul din baza reală (gol) refăcut din `sql/`, într-o singură tranzacție, și verificat
  - [x] commit (Bogdan, 23 nov, `4071ff8`)
  - [x] salvarea din joc (Claude, 23 nov; „la final”, decis de Bogdan): `saved-rounds.js` scrie rândul la începutul rundei (doar dacă jucătorul e logat atunci), iar rezultatul prin `finish_round` la final. Sub puncte apare starea: „Se salvează…” / „✓ Salvată în contul tău” / „Runda nu s-a putut salva” / „Rundele se salvează doar cu un cont” + Conectare; 4 limbi. Testat local: deconectat; salvare refuzată de Supabase (token fals); salvare reușită cu clientul simulat: s-a trimis `PL`, `2026-27`, `medium`, 2 încercări, 1 indiciu, ID-ul jucătorului, cod valid; 80 de puncte, ca în joc
  - [ ] testul lui Bogdan: 2 runde reale + una abandonată, văzute în Table Editor
- [x] o rundă începută și abandonată contează ca pierdută (pentru streak): rândul se scrie la început, deci o rundă părăsită rămâne fără rezultat (23 nov); se numără la profil
- [ ] pagina de profil: puncte, runde jucate și câștigate, procent, streak curent și cel mai bun, istoricul rundelor (fiecare se deschide în pagina de rezultat)
  - [x] prima rundă reală salvată (Bogdan, 23 nov): Premier League 2026-27, Ușor, 4/6 cu 1 indiciu, 20 de puncte, calculate la fel de bază și de joc
  - [x] `profile.html` + `profile.js` (Claude, 23 nov): „Profilul meu” în meniul contului; numele, emailul, istoricul rundelor (cele mai noi întâi, maximum 100), cu liga, sezonul, dificultatea, data, scorul (4/6, X/6 sau „Abandonată”) și punctele; o rundă terminată se deschide în `result.html?r=`; deconectat: mesaj + Conectare; 4 limbi. Testat local: deconectat, eroare la încărcare, listă simulată plus runda reală (se deschide corect), desktop și 375 px
  - [ ] statisticile: decis de Bogdan să fie în **SQL**, pe ciclul de învățare (un view cu funcții fereastră pentru streak): conceptul → cerința lui → SQL + teste → explicația lui → review → commit
  - [x] testul lui Bogdan pentru pagina de profil (23 nov): merge, inclusiv runda abandonată. Cerere: punctele totale lângă nume → intră în view-ul de statistici
  - [x] conceptul pentru statistici (Claude, 23 nov): view, agregări cu `filter`, procentul (împărțirea întreagă), streak-ul ca „gaps and islands” (suma cumulată a înfrângerilor cu `sum() over (order by ...)`), `security_invoker` ca RLS să se aplice și prin view
  - [ ] cerința lui Bogdan pentru statistici + ce lipsea

## După
- provocarea zilnică (același jucător pentru toți), clasament, „joacă același jucător” din pagina de rezultat, share-ul întregului istoric din profil, modul Icons
