# Decizii

## 21 oct 2026 — relansarea proiectului

| Decizie | Ce am ales | De ce |
|---|---|---|
| Abordare | Upgrade, nu rescriere | Păstrăm engine-ul, picker-ul, i18n și structura; schimbăm sursa datelor și interfața. |
| Date | Bază de date pe sezoane, în loc de JSON scris de mână | 1.186 de jucători introduși manual = muncă enormă; sursele gratuite dau loturile automat. **Înlocuiește decizia din iul 2026** („JSON static, fără bază de date"). |
| Sezoane | 2024-25, 2025-26, 2026-27 | Ultimele trei; accent pe 2026-27 (sezonul curent). |
| Ligi | Premier League, La Liga, Bundesliga, Serie A, Ligue 1 | Cele 5 de acum, toate complete. |
| Backend | **Supabase** (gratuit) | PostgreSQL (SQL real) + conturi + securitate pe rânduri (RLS), fără server propriu. Frontendul rămâne pe GitHub Pages. Minus: proiectul gratuit intră în pauză după 7 zile fără activitate → ping automat. |
| Mod de lucru | **Mixt** | Ciclul de învățare (concept → cerință → cod → rulare → review) la date, SQL și schemă; interfața și login-ul le construiește Claude, Bogdan aprobă. |
| Poze | **API-Football** (`media.api-sports.io`) | Portrete uniforme pentru aproape toți jucătorii. Proiect necomercial, sursa menționată în README. O singură poză pe jucător, nu pe sezon. |
| Import | Scripturi Python, rulate local | Descarcă → curăță → încarcă. Rulate după fiecare perioadă de transferuri. |

## 29 oct 2026 — platforma cu trei jocuri

| Decizie | Ce am ales | De ce |
|---|---|---|
| Platformă | 3 jocuri pe aceeași bază: Guess the Footballer pe sezoane, higher or lower pe valoarea de piață, ghicește jucătorul după carieră | Mai multe proiecte în CV cu aceeași muncă de date; fiecare joc arată alt tip de interogare. |
| Termene | Până la CV (~20 nov): jocul 1 lustruit + jocul 2 live. Decembrie: jocul 3 + conturi. Ianuarie: cod înghețat. **Schimbat pe 5 nov** (mai jos). | CV-ul pleca în a doua jumătate a lui noiembrie; interviul tehnic e estimat în ianuarie. Conturile trec în decembrie: nu se văd din CV, iar după ~1 dec Bogdan are mai mult timp. |
| O singură bază de date | Tabele pe tip de informație: `players`, `squad_entries`, `market_values`, `transfers` (+ `game_results` odată cu conturile) | Un jucător există o singură dată; o corectură ajunge în toate jocurile. Fiecare joc = un JOIN între `players` și tabelul lui. |
| Valori de piață, transferuri, minute | Setul public **`transfermarkt-datasets`** (Kaggle `davidcariboo/player-scores`), descărcat o dată | E singura sursă de valori de piață; în același set sunt și transferurile (jocul 3) și minutele jucate (sugestia de tier). Nu facem noi scraping; sursa e citată în README; proiect necomercial. **Înlocuiește regula din 21 oct** („fără Transfermarkt"). Minusuri: datele se opresc pe **6 iulie 2026** (actualizările sunt oprite); licența CC0 e afișată pe repo, dar pagina nu spune explicit că acoperă și datele. |
| Ultimul club din carieră | Clubul din lotul 2026-27 (football-data.org) | Acoperă transferurile din vara lui 2026, care lipsesc din setul Transfermarkt. |
| Rezervă pentru cariere | Wikidata (CC0, actualizat de comunitate) | Testat pe Mbappé (29 oct). Folosit doar dacă setul Transfermarkt nu ajunge. |
| Tier | **Bogdan îl alege** într-un Excel: o coloană cu listă (vedetă / titular / lot), precompletată din valoare + minute; de mână doar 2026-27 (2.651 de jucători), sezoanele trecute primesc sugestia | Judecata lui face jocul mai bun decât o formulă (așa a fost făcut și JSON-ul vechi). O coloană cu listă nu permite două bife sau niciuna. Importul validează rândurile și păstrează alegerile la actualizări. Rezolvă punctul „Tier” de mai jos. |

| Baza | **Direct în Supabase (PostgreSQL)**, fără SQLite local | Schema se scrie o singură dată, în SQL-ul pe care Bogdan îl explică la interviu. Câștig estimat: ~o săptămână. Înlocuiește planul din 21 oct (SQLite local în Etapa 1, apoi PostgreSQL în Etapa 2). |

## 30 oct 2026 — schema (`sql/schema.sql`)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Cheile | ID-urile football-data.org pentru `players` și `clubs`; codurile de ligă (`PL`…) și de sezon (`2024-25`) ca text | Sunt stabile la sursă; importul nu mai trebuie să traducă ID-uri. `tm_id` și `api_football_id` sunt coloane `unique` în `players`. |
| Un rând în lot | Cheia primară e `(player_id, club_id, season_id)` | Același jucător nu poate fi de două ori în același lot, dar poate fi la două cluburi în același sezon (transfer în iarnă). |
| Liga | `league_id` pe fiecare rând din `squad_entries` | Liga unui club se poate schimba de la un sezon la altul (promovare, retrogradare); e mai simplu decât un tabel separat club × sezon. |
| Tier | Număr 1–3 (1 vedetă, 2 titular, 3 lot) | Ca în JSON-ul vechi; dificultatea se filtrează simplu (`tier <= 2`). Excelul afișează cuvintele. |
| Post | 4 valori: `Goalkeeper`, `Defender`, `Midfielder`, `Forward` | Ca în JSON-ul vechi și în engine; importul aduce la ele posturile de la sursă. |
| Valori imposibile | Refuzate de bază (`check`): număr în afara 1–99, tier în afara 1–3, valoare de piață 0 | Greșelile se opresc la intrare, nu ajung în joc. |
| RLS | Pornit pe toate tabelele, fără politici | Cheia publică (din browser) nu poate citi sau scrie nimic până în Etapa 2; scripturile se conectează ca proprietar. |
| `transfers` | În decembrie, cu jocul 3 | Până la CV nu e nevoie de el; acum e mai puțin de explicat. |

## 5 nov 2026 — CV-ul pleacă azi

| Decizie | Ce am ales | De ce |
|---|---|---|
| Termen | CV-ul pleacă pe 5 nov, nu ~20 nov, cu linkul live al jocului; în CV jocul e descris ca live pe JSON, cu baza Supabase „in progress” | Decizia lui Bogdan. |
| Ordine | Interfața (Etapa 3) înaintea bazei, pe datele din JSON | Linkul e văzut azi, deci contează ce se vede. Baza continuă după CV. |
| Temă | Închisă, aceeași pe hub și în joc; fundalul ligii doar în capul jocului | Pe vechile fundaluri colorate, textul roșu, verde și mov nu se citea, iar jumătate de pagină rămânea albă. |
| Grilă | Câte un rând pe încercare, cea mai nouă sus; potrivirile au verde **și** ✓ | E un joc tip Wordle, deci toate încercările trebuie să rămână vizibile; ✓ ajută și cine nu distinge culorile. |
| Schema din 30 oct | Rămâne locală, fără commit, până când Bogdan o explică | Regula de aur nu se schimbă din cauza termenului. |
| Comentarii în cod | În engleză, strict esențiale: de ce, nu ce; fără bannere (ca în FlowLogix). Documentele din `docs/` și mesajele afișate de scripturi rămân în română. | Cererea lui Bogdan: același standard în toate proiectele din CV. |

## 5 nov 2026 — prima pagină

Punct de plecare: propunerile lui Gemini, verificate pe pagina reală, plus ideile lui Claude; aprobate de Bogdan.

| Decizie | Ce am ales | De ce |
|---|---|---|
| Structură | Titlu mare, un rând real din joc (animat), cardul jocului cu Play și intrare directă pe ligă, carduri separate pentru jocurile viitoare | Cine intră pe link înțelege jocul în câteva secunde și ajunge la el dintr-un click. |
| Cookie-uri | Bannerul e scos, politica de confidențialitate e rescrisă | Site-ul nu are cookie-uri, tracking sau reclame, doar limba și dificultatea în `localStorage`. Bannerul și vechea politică (din 2024, „Body's Game”) spuneau altceva. La conturi, politica se actualizează prima. |
| Font | Barlow Condensed pentru titluri, găzduit în repo; textul rămâne pe fonturile sistemului | Fără Google Fonts: IP-urile vizitatorilor nu ajung la un serviciu terț. Are ă, ș, ț (verificat). Licență OFL, inclusă. |
| Fundal | Linii de teren (SVG), în locul pozei cu stadionul | Mai curat și mult mai ușor; poza avea 322 KB. |
| Logo | Redus de la 674 KB (1024 px) la 17 KB (128 px) | Se afișează la cel mult 42 px. |
| Limbi | Prima pagină e tradusă în EN / ES / FR / RO, cu selector cu numele limbilor | Alegerea se păstrează și în joc; steagurile nu reprezintă limbi. |
| Respins din propunere | Schimbarea culorii textului (contrastul e deja 7–8:1, iar culoarea propusă l-ar fi scăzut), blur pe fundal, transparență pe carduri, noua paletă, „& Trivia” și „jocuri zilnice” în titlu | Fie nu rezolvau o problemă reală, fie promiteau ceva ce nu există. |

## De decis
- ~~**Tier-ul**~~ → decis pe 29 oct (mai sus).
- ~~**SQLite sau direct Supabase**~~ → direct în Supabase, decis pe 29 oct (mai sus).
- **Pauza Supabase** (de decis înainte ca jocul să citească din bază): pe 5 nov, Supabase a anunțat prin email că proiectul `guessthefootballer` va fi pus pe pauză, pentru că a stat peste 7 zile fără activitate; se poate reporni din dashboard timp de 90 de zile. Acum nu e o problemă: site-ul live rulează pe JSON, iar schema e locală în `sql/schema.sql`. Riscul apare când jocul citește din Supabase: fără trafic, proiectul se oprește, iar linkul din CV pică exact când îl deschide un recrutor. Fără upgrade la Pro. Variante, separat sau împreună: activitate reală, programată, gratuită (ex. un GitHub Action care face o interogare); o rezervă statică în JSON, verificată, pe care jocul o folosește când baza nu răspunde. De reținut: GitHub dezactivează acțiunile programate după 60 de zile fără activitate în repo, deci nici acțiunea nu e suficientă singură.
- **Numărul pe tricou** pentru 2025-26: nicio sursă gratuită nu îl dă pe sezoane trecute. De verificat în setul Transfermarkt (`game_lineups` pare să aibă numărul la fiecare meci); altfel indiciul lipsește la sezonul respectiv sau îl înlocuim.
- **Login**: doar email + parolă sau și Google.
- **Clubul în sezoanele trecute**: football-data.org dă clubul de la finalul sezonului (Trent = Real Madrid în 2024-25). Îl acceptăm ca regulă a jocului sau îl corectăm cu JSON-ul vechi pentru 2024-25?
