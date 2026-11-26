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
- [x] prima pagină: Mbappé (Real Madrid) în locul lui Salah în rândul animat, cerut de Bogdan pe 23 nov (Salah nu mai e la Liverpool în 2026-27); pozele din `images/`, deci fără cereri externe
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
- [ ] **niciun jucător din 2026-27 fără poză sau număr** (cerut de Bogdan pe 23 nov, după Ekitike cu „HE” și „—”; decizii în `DECIZII.md`)
  - [x] inventarul (23 nov): 245 fără poză și 248 fără număr, din 2.664. Motivele: 54 cu numele scris altfel, 184 absenți din loturile API-Football, 7 la alt club, 3 fără număr la API-Football
  - [x] a doua potrivire (Transfermarkt / numele de familie): conceptul, cerința lui Bogdan, codul + 8 teste, rularea și explicația lui; 54 de jucători legați, fără cereri. A intrat în commitul `46dd8f7`, fără review
  - [x] căutările API-Football (`download_api_football.py --profiles`), a treia potrivire (data exactă a nașterii), `data/manual_links.csv`, raportul `data/raw/incomplete.txt`; 5 teste noi (40 de teste Python pentru date, verzi), ruff curat (Claude, 23 nov)
  - [x] ziua 1 (23 nov): 60 de cereri (inclusiv 5 de probă) → 151 fără poză, 157 fără număr. Testat local: Ekitike și Xavi Simons apar cu poză și număr, fără erori în consolă
  - [ ] commit (Bogdan): `scripts/build_season.py`, `scripts/download_api_football.py`, `tests/test_build_season.py`, `data/seasons/2026-27/`, `data/manual_links.csv`, `docs/`
  - [ ] zilele 2–3: `download_api_football.py --profiles`, apoi `build_season.py` (134 de căutări rămase; 6 nume comune au mai mult de o pagină de rezultate)
  - [ ] ce rămâne: corectat de Bogdan în `data/manual_links.csv` (după `data/raw/incomplete.txt`) sau listat cu motivul
  - [x] decizia lui Bogdan (23 nov): jucătorii cunoscuți rămân, restul ies din joc. Regula din `build_season.py`: fără poză sau fără număr și sub 1 mil. € → scos automat. 78 de jucători scoși, 2.586 rămași în 2026-27; 11 corecturi manuale (Carreras, Gavi, Cestero…); căutările ordonate după valoare, cu pagina a doua la numele comune; 42 de teste verzi, ruff curat (Claude)
  - [ ] ziua 2: aproximativ 59 de cereri acoperă toți cei 69 de cunoscuți care se pot căuta; ce rămâne (Gboho și Seidu fără număr, Ji-soo Kim fără termen de căutare, cei negăsiți) decide Bogdan: corectură manuală sau scos din joc

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
  - [x] `sql/delete_account.sql` (Claude, 23 nov): funcția `delete_my_account()`, `security definer`, fără parametri; șterge jucătorul din `auth.users`, iar rundele pleacă prin `on delete cascade`; doar `authenticated` o poate chema. 2 teste noi (contul și rundele lui Bogdan dispar, ale lui Andrei rămân; un vizitator e refuzat); 67 de teste pe bază verzi
  - [x] în profil, secțiunea „Contul tău” (Claude, 23 nov): „Șterge contul” în doi pași (confirmare + Renunță), mesaj după ștergere, link spre politică; 4 limbi. Testat local cu baza simulată: confirmarea, renunțarea, eroarea, ștergerea reușită (sesiunea dispare din browser)
  - [x] `privacy-policy.html` rescrisă (Claude, 23 nov, în engleză, ca până acum): fără cont / cu cont Google; ce primește Supabase de la Google; ce se păstrează pentru fiecare rundă; tokenul din browser și jurnalul de conectări; serverele din Londra (decizia de adecvare UE pentru Regatul Unit, reînnoită până în 2031); de ce și cine vede; cât timp și cum se șterge; drepturile GDPR și ANSPDCP
  - [x] **Bogdan:** `apply_schema.py` (adaugă `delete_my_account`); providerul **Email** dezactivat în Supabase (verificat de Claude, 23 nov)
  - [x] testul real (Bogdan, 23 nov): un cont șters din profil. Verificat în bază: contul și toate cele 3 runde ale lui au dispărut, fără runde rămase fără cont; celălalt cont a rămas neatins. S-a șters contul cu 3 runde (cel din capturile de profil), nu cel cu o rundă
  - [x] explicația lui Bogdan (23 nov): fără parametri, identitatea vine din sesiune (`auth.uid()`), nu din browser; cu `delete_my_account(user_id)` și `security definer`, oricine ar putea șterge contul altcuiva trimițând alt ID; regula e structurală, nu un `if` care se poate uita. Corect
  - [x] commit + push (Bogdan, 23 nov, `c968774`). Verificat de Claude: GitHub Pages a publicat commitul; pe site-ul live apar politica din 23 nov, butonul de ștergere din profil și Mbappé; toate testele trec pe ce s-a publicat (120 Python + 14 JS)
- [ ] verificarea finală, pe site-ul live: login cu Google, 2 runde, profilul cu punctele corecte; al doilea cont nu vede rundele primului
- [ ] înregistrare / login (Supabase Auth, Google)
  - [x] commit `game_results` (Bogdan, 23 nov, `4071ff8`; în titlu a intrat din greșeală și „Apoi Commit to master → Push”)
  - [x] butonul de cont în header, pe toate cele 4 pagini, în 4 limbi; `auth.js` + `account.css`; biblioteca `vendor/supabase-js-2.119.0.js` (Claude, 23 nov). Testat local, cu o cheie de probă și o sesiune falsă: desktop și 375 px, fără scroll orizontal, meniul (Escape, click în afară), deconectarea, numele afișat ca text, nu ca HTML. Supabase trimite corect spre Google
  - [x] cheia publică (publishable) în `auth.js` (23 nov). Verificat prin API-ul real, cu cheia: Google e activ; un vizitator nelogat primește „permission denied” și la tabel, și la `finish_round`; butonul construiește corect cererea spre Google (PKCE)
  - [x] **Bogdan:** în Supabase, adresele de întoarcere `http://localhost:8765/**` și `https://bogdandumitrascu04.github.io/Guessthefootballer/**`; providerul **Email** dezactivat (verificat din nou prin API pe 25 nov: Email oprit, Google pornit; login-ul merge live)
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
  - [x] cerința lui Bogdan pentru statistici (23 nov): un rând pe jucător (ID, puncte, jucate, câștigate, procent, streak curent și cel mai bun); `count(*)`, `count(*) filter (where won)`, `sum(points)`; orice rundă pierdută sau abandonată rupe streak-ul; `security_invoker`; un cont nou are zero, o rundă în alt tab contează ca jucată. Lipsea: **contradicția** dintre „un rând doar pentru cine are runde” și „un cont nou are statistici zero” (un view peste `game_results` nu poate avea rând pentru cine n-are runde → pagina arată zero); capcana împărțirii întregi (`1 / 3 = 0`) și rotunjirea procentului; ordinea rundelor (după `started_at`, cu `id` la egalitate); drepturile pe view (`revoke` / `grant`, ca la tabel); consecința rundei din alt tab (streak-ul curent scade la 0 cât se joacă)
  - [x] SQL-ul + testele (Claude, 23 nov): `sql/player_stats.sql` (în `apply_schema.py`; `table_names()` numără doar tabelele, nu și view-urile); 14 teste noi în `tests/test_game_results.py`, inclusiv exemplul din concept (`WWLWWWAWW` → 2 și 3) și procentul rotunjit (33 / 67). 65 de teste pe bază verzi, ruff curat. Verificat și invers: fără `security_invoker`, Andrei vedea 2 rânduri, deci testul prinde scurgerea
  - [x] rularea (Bogdan, 23 nov): 49 de teste verzi; `apply_schema.py` (acum afișează și view-urile) → `player_stats` în baza reală. Verificat de Claude: `security_invoker=true`, doar `authenticated` are `select`, un vizitator primește „permission denied for view”; contul lui Bogdan: 20 de puncte, 2 jucate, 1 câștigată, 50%, streak curent 0, cel mai bun 1
  - [x] explicația lui Bogdan + 2 întrebări de verificare (23 nov): `streak_group` pentru ✅ ❌ ✅ ✅ A ✅ = 0, 1, 1, 1, 2, 2 → serie curentă 1, cea mai bună 2 (corect, inclusiv faptul că înfrângerea deschide grupul nou); fără `security_invoker`, view-ul citește cu drepturile proprietarului, care trece peste RLS, deci Andrei ar vedea statisticile tuturor (corect). Răspunsurile acoperă cele două părți grele, deci regula de aur e îndeplinită
  - [x] testul lui Bogdan pentru profilul cu cifre: „arată bine” (23 nov)
  - [x] review cu alt AI pe `sql/player_stats.sql` (23 nov): 5 observații, verificate de Claude pe baza reală; niciuna nu cere o schimbare. Egalitatea pe `started_at`: teoretică (0 cazuri reale; fiecare rundă pornește în cererea ei, cu `now()` la microsecundă; `id` dă o ordine fixă). Rotunjirea procentului: alegere asumată. Securitatea: fără breșă; RLS pornit și politica de citire există (verificat). Performanța: indexul `(user_id, started_at)` și `(select auth.uid())` existau deja în `game_results.sql`, pe care review-ul nu l-a văzut. Zero pentru contul fără runde: deja tratat în pagină
  - [ ] commit (Bogdan)
- ⚠️ commitul `46dd8f7` („login account”, 23 nov 13:50) a ajuns pe GitHub cu push, deci login-ul, salvarea rundelor și profilul sunt **live** înaintea politicii de confidențialitate și a butonului „Șterge contul”
  - [x] cifrele în profil (Claude, 23 nov, cerute de Bogdan): punctele totale în dreapta numelui și 5 carduri (jucate, câștigate, procent, serie curentă, cea mai bună serie), din `player_stats`; un cont fără runde arată 0. Testat local cu cifre simulate, desktop și 375 px (3 + 2 carduri pe telefon); citit prin RLS din baza reală: fiecare cont își vede doar rândul lui
  - [x] alegerea contului Google la fiecare conectare (`prompt: select_account`), după întrebarea lui Bogdan despre reconectarea fără cont (23 nov)

## Etapa 8 — Indiciul de start (cerut de Bogdan pe 20 și 23 nov)
- [x] conceptul (Claude, 23 nov): faptul, nu fraza; fișier separat pe ligă; un fapt pe rundă; indiciul restrânge, nu dezvăluie
- [x] cerința lui Bogdan (23 nov): transfer + statistici pe Easy/Medium, restul pe Hard; nimic din căsuțe, niciun nume de club; fapt de rezervă; alt fapt la fiecare rundă. Lipsea: rezerva la portari, sumele exacte, indiciul în fișă → confirmate (`DECIZII.md`)
- [x] `appearances.csv.gz` descărcat cu acordul lui (45 MB, 2025-26 complet) + inventarul în `SURSE-DATE.md`
- [x] `scripts/build_clues.py` + 13 teste (Claude, 23 nov) → `data/seasons/2026-27/clues/`; Easy 100%, Medium 95–100% cu transfer sau statistici; Hard 85–93% cu cel puțin un fapt
- [x] fișa rundei versiunea 2 (cu indiciul) + 3 teste; indiciul în joc (deasupra căutării) și pe pagina de rezultat, 4 limbi; testat local, desktop și telefon
- [x] cei 10 jucători aleși de Bogdan (Saka, Gyökeres, Mbappé, Kane, Pedri, Barella, Wirtz, Dembélé, Rice, Lamine Yamal): faptele afișate; Pedri n-avea transfer → reparat (împrumutul dus-întors, liga din meciurile de atunci)
- [ ] Bogdan verifică faptele celor 10 pe transfermarkt.com
- [ ] explicația lui Bogdan pentru `build_clues.py` (regula de aur) + 1–2 întrebări → review cu alt AI → commit (fără push până la politica de confidențialitate din Etapa 7)
- [ ] după sesiunea cu pozele: jucătorii fără niciun fapt (7–15% pe Hard), din profilurile API-Football

## Etapa 9 — Albumul (25 nov)
- [x] direcția aleasă de Bogdan dintr-un prototip local: cardul-bilet, fără fețe și fără sigle; insigne proprii în tot jocul (`badge.js`, `data/badges.json`)
- [x] `sql/user_cards.sql`: conceptul (Claude), cerința (Bogdan: un rând = user + jucător, cea mai bună rundă, la egalitate prima), SQL + 14 teste, rulat pe baza reală, explicat de Bogdan, review cu alt AI, commit
- [x] pagina Album (`album.html`, `album/`), cardul la finalul rundei câștigate, 4 limbi (Claude)
- [x] testul lui Bogdan → commit (`1a06fc3`)

## Etapa 10 — Site-ul pregătit de promovare (25 nov)
**Scop:** site-ul arată bine fără poze de jucători și fără sigle, se instalează pe telefon și se actualizează singur. Interfața o face Claude; Bogdan testează, apoi commit + push.

- [x] sezonul 2024-25 scos din joc (decizia lui Bogdan, 25 nov): JSON-urile rămân în istoricul git și local, în `data/raw/2024-25/`, pentru importul din Etapa 1. Linkurile vechi se deschid în continuare (4 mostre făcute cu codul vechi, una păstrată ca test); în bază nu era nicio rundă din 2024-25
- [x] fără poze și fără sigle, nicăieri: inițiale în culorile clubului, insignele proprii, cardul-bilet la dezvăluire (joc și pagina de rezultat), abonamente proprii pentru ligi (`league-marks.js`). Comutatorul: `PORTRAIT_CLUBS` din `common.js`. `images/leagues/` ștears (12 MB), cu tot cu `images/1.jpg`
- [x] prima pagină (Mbappé cu inițiale și insigna RMA, 96 de cluburi, 2.586 de jucători), imaginea de share (`images/share.jpg`, nume nou, ca rețelele sociale să n-o mai arate pe cea veche), capturile din README
- [x] PWA: `manifest.webmanifest`, iconițe proprii, `sw.js` (întâi rețeaua, copia doar fără internet), `pwa.js`, butonul „Instalează aplicația” pe prima pagină
- [x] politica de confidențialitate (nu se mai cere nimic de la API-Football; copia locală pentru offline), README, `build_badges.py`
- [x] testat local de Claude, în Chrome: 270 de verificări pe forma finală (calculator și 375 px în 4 limbi, 320 px în franceză, toate paginile), fără erori în consolă, fără scroll lateral, cereri doar către site; finalul rundei cu un cont simulat (card nou, card mai vechi, salvare eșuată sau blocată); instalarea (0 probleme raportate de Chrome), actualizarea imediată și jocul fără internet, pe o copie servită la `/Guessthefootballer/` cu regulile de cache ale GitHub Pages. 25 de teste JS și 136 Python, verzi
- [x] primul test al lui Bogdan (25 nov) și cererile lui: siglă nouă și antet centrat, un singur nume, fundal propriu pe ligă, pagina de alegere refăcută, ecranul de start înaintea rundei. Testat: deschiderea sau reîncărcarea nu salvează nicio rundă; întrebarea la părăsire apare doar la o rundă începută cu cont
- [x] al doilea test al lui Bogdan + commit + push (25 nov, `81ce002`). Verificat live de Claude: toate cele 81 de fișiere ale site-ului sunt identice cu commitul; 180 de verificări (calculator în RO și EN, 375 px în 4 limbi), fără erori, cereri doar către site; instalarea, copia și o rundă fără internet merg; pozele și siglele vechi nu mai răspund
- [ ] pe telefon, după push (Claude nu poate verifica): instalarea pe Android și pe iPhone, login-ul cu Google din aplicația instalată
- [ ] contorul de trafic fără cookie-uri: Bogdan alege varianta; apoi codul și politica de confidențialitate
- [ ] după pozele scoase, pe ciclul de învățare: `build_season.py` fără `photo` și fără siglele cluburilor în JSON (nu le mai citește nimeni, 28% din fișiere), iar regula `left_out()` doar după număr. Căutările API-Football din Etapa 3 mai au rost doar pentru numere

## Etapa 11 — Jucătorul zilei (25 nov)
**Scop:** același jucător ascuns pentru toți, o rundă pe zi, cu o serie proprie. SQL-ul merge pe ciclul de învățare; interfața o face Claude, Bogdan testează.

- [x] conceptul (Claude): ziua o spune baza, după ora României; calendar, nu formulă; RLS pe timp („ziua a venit”); o rundă pe cont și pe zi, prin index unic cu `null` la rundele normale
- [x] cerința lui Bogdan: un rând = ziua, jucătorul, liga; nu se repetă nici ziua, nici jucătorul; vizitatorul și jucătorul logat văd doar până azi, scrie doar scriptul; ziua o pune baza, altfel s-ar putea juca de mai multe ori sau repara seria; perechea cont + zi oprește al doilea start. Lipsea: sezonul din rând (unic pe sezon, altfel o vedetă n-ar mai putea reveni); al doilea start întoarce aceeași rundă, ca refresh-ul să continue; finalul (jucătorul ascuns îl scrie baza, termenul de 01:00)
- [x] SQL-ul + testele (Claude): `sql/daily_players.sql`, `sql/daily_rounds.sql`, schimbările din `game_results.sql`, `scripts/plan_daily.py`; 64 de teste noi în `tests/test_daily.py` (ajutoarele comune, mutate în `tests/accounts.py` și `tests/conftest.py`). Verificat invers: 15 reguli stricate pe rând, toate prinse
- [x] rularea (Bogdan: `apply_schema.py`; `plan_daily` i-a fost întrerupt de VS Code și l-a reluat Claude): calendar de 200 de zile, 25.11.2026 – 12.06.2027, câte 40 pe ligă. Verificat prin API-ul public: un vizitator vede doar ziua de azi și nu poate scrie nimic
- [x] commit SQL (a intrat în `81ce002`, odată cu Etapa 10)
- [x] interfața (Claude): runda zilei în joc (`game.html?daily`), biletul cu data pe prima pagină și la alegerea ligii, meniurile, seria în profil, rundele marcate în istoric, share fără spoiler, scurtătură în aplicația instalată, 4 limbi
- [x] testat local de Claude, în Chrome, cu baza simulată: 31 de situații (cu și fără cont, refresh, alt dispozitiv, al doilea tab, alt cont, miezul nopții și 01:00, bază oprită, salvare eșuată și reluată, rundele normale neschimbate), 72 de verificări de aspect (375, 320 și 1200 px, 4 limbi) și pornirea fără internet, fără erori în consolă; cu baza reală, doar citire, ca vizitator. 36 de teste JS și 200 Python, verzi
- [x] politica de confidențialitate și README
- [ ] testul lui Bogdan cu contul Google (start, refresh, final, profil), apoi commit + push
- [ ] explicația lui Bogdan pentru SQL (regula de aur) și review cu alt AI
- [ ] `plan_daily` din nou după fiecare reconstruire a sezonului (transferurile din ianuarie) și înainte de 12 iunie 2027, când se termină calendarul

**Urmează:** runda verificată pe server și clasamentul, ca punctele să aibă valoare.

## Etapa 12 — Interfața pe telefon (25 nov)
**Scop:** finalul rundei și scrisul unui nume să încapă pe telefon, în limba aleasă. Construiește Claude, Bogdan testează. Regulile jocului nu se schimbă.

- [x] pasul 1: finalul rundei (biletul lângă scor, butoanele lipite jos, bilet gri la înfrângere, „Vezi în album”), pozițiile și țările traduse, „Congo DR” = „DR Congo”, numele de pe patru bilete
- [x] pasul 2: runda pe telefon (la scris rămân indiciul, ultima încercare, câmpul și numele; legenda doar în ⓘ)
- [x] testat local de Claude: 72 de situații (320, 375 și 1366 px, 4 limbi, cu și fără cont simulat), fără scroll lateral, text ieșit din căsuțe sau erori în consolă; 38 de teste JS, verzi
- [ ] testul lui Bogdan pe iPhone (mai ales tastatura), apoi commit + push
- [ ] pasul 3: accesibilitatea (atingere 44 px, rezultat și sugestii anunțate, focus, contururi, litere mai mari)
- [ ] pasul 4: prima pagină („Continuă”) și alegerea ligii fără salt
- [ ] pasul 5: albumul unei ligi (total, „Continuă”, cluburile începute primele)

## După
- „joacă același jucător” din pagina de rezultat, share-ul întregului istoric din profil, modul Icons
