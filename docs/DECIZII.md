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

## 8 nov 2026 — sezonul curent, pe varianta rapidă

| Decizie | Ce am ales | De ce |
|---|---|---|
| Drum | 2026-27 generat ca JSON de un script Python, în formatul pe care jocul îl citea deja; baza Supabase rămâne pentru după | Ziua avea toate cele 100 de cereri API-Football libere. Logica (legătura dintre surse, tier-ul) se mută apoi în încărcarea în bază. |
| Sezoane în joc | 2026-27 (implicit) și 2024-25; fără 2025-26 | Pentru 2025-26 nu avem numerele de pe tricou. |
| Legătura cu API-Football | Club: după cuvintele din nume, apoi codul de 3 litere (96/96, unul corectat manual: Rennes). Jucător: în același club, după nume (API-Football scurtează prenumele: „H. Davies”) și vârstă; cazurile neclare rămân nelegate | Niciodată doar după nume, cum cere regula; un jucător nelegat apare cu inițiale și fără număr, nu cu poza altcuiva. Rezultat: 88–95% cu poză și număr. |
| Jucătorul ascuns | Doar dintre cei cu număr și vârstă cunoscute | Altfel ar lipsi un indiciu. |
| Tier 2026-27 | Sugestie automată: locul în ligă după ultima valoare Transfermarkt (1–40 vedetă, 41–180 titular, restul lot) | Excelul lui Bogdan rămâne pentru mai târziu și va înlocui sugestia. |
| Vârsta | Din data nașterii de la football-data.org; la o diferență de peste 3 ani față de API-Football, se ia vârsta de acolo | football-data.org are câteva date greșite (un jucător de 21 de ani apărea cu 48). |
| Poze și sigle 2026-27 | Încărcate direct de pe serverul API-Football, menționat în politica de confidențialitate | Fără 2.400 de imagini în repo. |

## 8 nov 2026 — feedback Gemini pe joc

| Decizie | Ce am ales | De ce |
|---|---|---|
| Făcute | Pagina de selecție centrată, „current” pe sezonul implicit, Enter alege primul nume din listă, animația pentru încercarea nouă, butonul Share | Aprobate de Bogdan. Enter dădea „Jucătorul nu s-a găsit” când erau mai multe sugestii. |
| Share | Doar culori (🟩/⬜), scorul și linkul; pe telefon fereastra de share, pe desktop copiere | Rezultatul nu dezvăluie jucătorul. |
| Respinse | „2023-24 (curând)”, galben pentru „aceeași ligă”, poze în căutare și efecte la cursor (există deja) | Nu promitem date pe care nu le avem; toți jucătorii dintr-un joc sunt din aceeași ligă. |
| Amânate | Galben pentru vârsta la ±2 ani (opțional); statistici și serii, odată cu conturile | Statisticile ar trebui făcute de două ori dacă le punem acum doar în browser. |

## 8 nov 2026 — indiciile și legenda

| Decizie | Ce am ales | De ce |
|---|---|---|
| Indicii | Două cipuri pe un rând (Echipă, Vârstă), vizibile de la început: blocate, apoi „Arată” după 3, respectiv 6 încercări, apoi valoarea. Dispar la final. | Combină variantele Gemini 1.1 (se vede ce indicii există) și 1.2 (compact); pe telefon un singur rând. |
| Când se deblochează | După încercarea 3 și 6; se deschid doar la click | Înainte, indiciul putea fi cerut înainte de prima încercare și jocul devenea căutare, nu deducție. Cine vrea, joacă fără ele. |
| Legendă | Un rând de trei cipuri (✓ la fel, ↑ mai mare, ↓ mai mic), aceleași simboluri ca în grilă; explicația completă și regula indiciilor în ⓘ | Propoziția lungă ocupa 2 rânduri pe telefon. Săgeți text, nu emoji, ca să arate la fel pe orice telefon. |

## 8 nov 2026 — SuperLiga României

| Decizie | Ce am ales | De ce |
|---|---|---|
| A 6-a ligă | SuperLiga României, doar în 2026-27, afișată „SuperLiga” | Cerută de Bogdan. „SuperLiga” nu se confundă cu Ligue 1. |
| Surse | Lotul curent de la API-Football (poză, număr, post); nume complet, naționalitate, dată de naștere și valoare din setul Transfermarkt (`RO1`: 630 de jucători, 16 cluburi, 6 iul 2026) | football-data.org nu are România pe planul gratuit (verificat: 13 competiții). |
| Limita | Jucătorii fără nume complet sau naționalitate nu pot fi jucătorul ascuns | Transfermarkt se oprește pe 6 iulie: transferurile de după lipsesc. Estimare: 60–75% complet. |

## 20 nov 2026 — 6 încercări

| Decizie | Ce am ales | De ce |
|---|---|---|
| Numărul de încercări | 6 în loc de 10, la toate dificultățile | Cerută de Bogdan (5–7). Cu 5, echipa după a 2-a și vârsta după a 3-a, primele 2 încercări erau aproape la ghici, iar ultimele 2 aproape sigure; cu 6 rămân 2 încercări de deducție între indicii. |
| Când se deblochează indiciile | Echipa după încercarea 2, vârsta după 4 (înainte 3 și 6) | Pragurile scad odată cu numărul de încercări. |
| Ultima încercare | Mesaj separat („Mai ai o singură încercare”), nu „Mai ai 1 încercări” | Cu 6 încercări, mesajul apare des. |

## 20 nov 2026 — fișa rundei

| Decizie | Ce am ales | De ce |
|---|---|---|
| ID-ul jucătorului | ID-ul football-data.org, scris în JSON-ul sezonului (`id`) | Numele diferă între surse, iar ordinea din listă se schimbă la fiecare reconstruire. E același ID ca `players.id` din schemă, deci linkurile rămân valabile și după mutarea în Supabase. |
| Ce salvăm (cerința lui Bogdan) | Liga, sezonul, dificultatea, jucătorul ascuns, încercările în ordine, indiciile folosite, data | Restul se calculează: numărul încercărilor, câștig/pierdere, punctele, culorile, săgețile. Indiciile lipseau din prima variantă; fără ele, punctele ies greșit. |
| Date schimbate după rundă | Varianta b: fiecare jucător din fișă își poartă datele din momentul rundei (nume, poză, echipă, post, vârstă, număr, naționalitate) | Ca prețul copiat pe factură: un transfer în ianuarie sau o zi de naștere nu schimbă o rundă veche. Varianta c (versiuni ale sezonului) cerea păstrarea tuturor versiunilor loturilor, și în JSON, și în Supabase. Costul: linkul are câteva sute de caractere. |
| Versiunea formatului | Fișa începe cu numărul versiunii formatului | Dacă schimbăm formatul, linkurile vechi se citesc în continuare. |
| Interfața | Pagina de rezultat: sus rezumatul (încercări, puncte), iar „Vezi detalii” deschide grila completă. Două share-uri: după rundă, doar runda; din profil, tot istoricul (cu conturile, Etapa 7). | Cerința lui Bogdan. |

## 20 nov 2026 — pagina de rezultat

| Decizie | Ce am ales | De ce |
|---|---|---|
| Linkul de share | Duce la `result.html?r=<fișa rundei>`, nu la prima pagină; textul cu pătrățele rămâne, cu 💡 și numărul indiciilor folosite | Cerința lui Bogdan: prietenul vede runda, nu pagina jocului. |
| Ce se vede întâi | Rezumatul: scorul (3/6 sau X/6), propoziția „Găsit în 3 din 6 încercări”, indiciile folosite, grila mică de culori; butoanele „Vezi detalii” și „Joacă o rundă” | Cerința lui Bogdan (rezumat + detalii la cerere). Grila mică nu dă răspunsul. |
| Detaliile | Toate încercările, de la prima la ultima, ca în joc; până la „Arată jucătorul (spoiler)”, rândul câștigător arată „???” și doar ✓ în căsuțe, fără valori | Prietenul poate încerca întâi să-l ghicească din culori. Ordinea cronologică spune povestea rundei (în joc contează ultima încercare, deci acolo e invers). |
| Limita de încercări în fișă | Fișa păstrează și limita (6) | E o regulă din ziua rundei, ca prețul pe factură: dacă trecem la 7, rundele vechi rămân „din 6”. Adăugată înainte să existe vreun link public, deci versiunea rămâne 1. |
| Linkuri modificate | Pagina arată doar poze de pe site sau de la API-Football, iar textele doar ca text (niciodată ca HTML) | Oricine poate edita un link; altfel cineva ar putea afișa imagini sau cod străin pe site. |
| Cod comun | Rândurile și căsuțele grilei stau în `common.js`, folosit de joc și de pagina de rezultat | Culorile se calculează din fișă: aceeași regulă trebuie să deseneze și jocul, și rezultatul. |
| Punctele | Apar în rezumat (vezi mai jos) | Tabelul a fost confirmat de Bogdan pe 20 nov. |
| Valorile din rândul câștigător | Ascunse până la spoiler (cerut de Bogdan, după testul live) | Numele ascuns nu ajungea: Arsenal, Forward, 25, #7, England îl dădeau imediat pe Saka. Fără valori, rândurile anterioare rămân un puzzle. |

## 20 nov 2026 — punctele

| Decizie | Ce am ales | De ce |
|---|---|---|
| Formula (confirmată de Bogdan) | 10 × multiplicator × trepte; multiplicator 1 (Ușor), 2 (Mediu), 4 (Greu); trepte = încercări maxime + 1 − încercarea câștigătoare − indicii folosite, minim 1; rundă pierdută = 0 | Ușor din prima (60) = Mediu din a 4-a; Greu din a 4-a (120) = Mediu din prima. Un indiciu costă cât o încercare; un câștig valorează cel puțin o treaptă (10 / 20 / 40). |
| Unde se calculează | `roundPoints()` în `round.js`, din fișa rundei; nu se salvează în fișă | Se pot calcula oricând din fișă. Cu conturile (Etapa 7), aceeași formulă devine o funcție în baza de date, ca browserul să nu poată trimite singur punctele. |
| Unde apar | La finalul rundei, în textul de share („Puncte: 160”) și în rezumatul paginii de rezultat; regula, în ⓘ | Jucătorul vede imediat ce a câștigat. |

## 20 nov 2026 — conturile (Etapa 7)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Login | **Doar Google** la lansare (Supabase Auth); jocul rămâne jucabil fără cont, contul doar salvează rundele | Decizia lui Bogdan. Nu ținem parole și nu trimitem emailuri de confirmare sau de resetare: serverul de email gratuit al Supabase trimite doar către membrii echipei, deci email + parolă ar fi cerut un serviciu de email separat. Emailul se poate adăuga mai târziu fără să se piardă conturile. |
| Pauza Supabase: ping | Un GitHub Action (`.github/workflows/keep-supabase-awake.yml`) face **zilnic** o interogare reală (`select count(*) from players`) prin `psql`, cu `SUPABASE_DB_URL` ca secret în GitHub; se poate porni și de mână („Run workflow”) | Cerut de Bogdan pe 20 nov, înaintea conturilor: să nu mai repornească el proiectul. Supabase numără activitatea din bază, nu vizitele pe pagină, iar ghidul lor spune că „câteva cereri pe zi” ajung de obicei; zilnic, nu săptămânal, pentru că GitHub poate întârzia sau sări rulările programate. Fără acțiuni de la terți: `psql` și `gh` sunt deja pe mașinile GitHub. La o rulare eșuată, GitHub trimite email. |
| Regula GitHub de 60 de zile | La fiecare rulare, acțiunea se reactivează singură prin API-ul GitHub | GitHub oprește acțiunile programate din repo-urile publice după 60 de zile fără commituri. Reactivarea ar trebui să reseteze ceasul, dar GitHub nu o documentează (o afirmă doar un instrument al comunității), așa că emailul de avertizare de la GitHub rămâne plasa de siguranță. |

## 23 nov 2026 — `game_results` (`sql/game_results.sql`)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Runda abandonată | **Varianta A** (aleasă de Bogdan): rândul se scrie la începutul rundei (`insert`); rezultatul intră doar prin funcția `finish_round()`, o singură dată, de jucătorul ei, cât runda e încă deschisă | O rundă care nu există de la început nu lasă nicio urmă când e abandonată. Un `update` direct ar permite rescrierea istoricului. Dificultatea și limita, fixate la început, nu se mai pot schimba la final. Respinsă: varianta B (două tabele, doar `insert`), care scria dificultatea de două ori. |
| Starea rundei | Fără coloană `status`: `finished_at` gol = rundă în desfășurare sau abandonată, deci pierdută, 0 puncte | Starea se deduce din `finished_at`; o coloană în plus ar putea să-l contrazică. Părăsirea paginii = abandon, pentru că jocul nu păstrează runda pe jumătate. |
| Ce poate browserul | Două straturi: RLS spune **ce rânduri** (doar ale lui; citire și adăugare), drepturile pe coloane spun **ce coloane** (la început completează doar liga, sezonul, dificultatea) | Supabase dă implicit rolurilor din browser toate drepturile pe tabelele noi. Proprietarul, limita, ora și rezultatul le pune baza. |
| Limita de încercări (după review) | O pune baza: valoarea implicită a coloanei `max_guesses` (6), aceeași cu `MAX_ATTEMPTS` din `engine.js`, verificată de un test; browserul n-o mai poate trimite | Review-ul a găsit că browserul o putea alege: cu 10, o rundă pe Greu ghicită din prima lua 400 de puncte în loc de maximum 240 (verificat). La o schimbare de regulă se modifică valoarea implicită; rundele vechi își păstrează limita. |
| Codul fișei (după review) | Doar caracterele din `encodeRound()` (litere, cifre, `-`, `_`), cel mult 4.000 | Review-ul a găsit că un cod gol era acceptat (verificat). Regula refuză și codul gol, și pe cel uriaș, și orice text străin, pentru că profilul pune codul în linkuri. |
| Review respins | Limita din JS ar fi 12 (e 6); `PUBLIC` ar avea drepturi pe tabel (n-are, verificat în baza reală) | Observațiile unui review se verifică pe cod, nu se aplică direct. |
| Punctele | Coloană generată, cu formula din `roundPoints()`; un singur tabel de cazuri, `tests/points_cases.json`, verificat și în JS, și în bază | Formula există în două locuri; testele nu le lasă să se despartă. |
| Liga și sezonul | Chei străine spre `leagues` și `seasons`, umplute acum (`sql/reference_data.sql`: 5 ligi, 3 sezoane, iulie–iunie). Jocul trimite codul football-data (`PL`), nu numele din joc (`premier-league`) | Baza refuză o ligă sau un sezon inexistent. |
| Jucătorul ascuns | ID-ul football-data, fără cheie străină, poate lipsi | `players` e încă gol, iar 2024-25 n-are ID-uri. |
| Statisticile | Se calculează din rânduri, nu se salvează; locul (interogare SQL sau JavaScript) se decide la pagina de profil. Pierderile se numără ca `won is not true`, nu `won = false`, ca să intre și rundele abandonate | O singură sursă de adevăr, ca la puncte. Observația parțială din review: o rundă abandonată nu se deosebește de una jucată chiar atunci în alt tab; cazul rar e acceptat. |
| Ștergerea contului | `on delete cascade`: rundele dispar odată cu contul | Pregătește butonul „Șterge contul”. |
| Limita cunoscută | Baza nu poate dovedi că o rundă a fost jucată cinstit | Jucătorul ascuns e ales în browser. Ar trebui ca serverul să-l aleagă și să judece fiecare încercare; fără clasament public nu merită. |

## 23 nov 2026 — login-ul în pagină

| Decizie | Ce am ales | De ce |
|---|---|---|
| Biblioteca Supabase | `supabase-js` 2.119.0, găzduită în repo (`vendor/`, cu licența MIT); aleasă de Bogdan | Ca fontul: vizitatorii nu ajung la un CDN terț, iar site-ul nu depinde de el. 215 KB (~55 KB comprimat). Versiune veche de cel puțin două săptămâni, descărcată de pe npm. |
| Fluxul de login | PKCE: Google trimite înapoi un cod de unică folosință, pe care doar browserul care a pornit login-ul îl poate schimba pe o sesiune; biblioteca șterge apoi codul din adresă | Recomandat pentru site-uri fără server: tokenurile nu apar niciodată în link. |
| Cheia din browser | Cheia publică (publishable) stă în `auth.js`, în repo | E făcută pentru browser; ce poate atinge decid politicile RLS și drepturile din `sql/`. Parola bazei rămâne doar în `.env` și în secretul GitHub. |
| Butonul din header | Deconectat: „Conectare” (pe telefon doar iconița); conectat: inițiala numelui, cu un meniu (numele, „Deconectare”). Fără poza din contul Google | Poza ar face fiecare pagină să ceară o imagine de la Google. Numele vine din contul Google, deci se afișează doar ca text, niciodată ca HTML. |
| Lansarea | Login-ul nu ajunge live (push) până nu sunt gata politica de confidențialitate și butonul „Șterge contul” | Cerința etapei: politica se actualizează înaintea conturilor. |
| Meniul contului (după testul lui Bogdan) | Antet cu inițiala, numele și emailul; dedesubt, rânduri cu iconițe (acum doar „Deconectare”, apoi și „Profil”); se deschide lângă marginea din dreapta a header-ului, ca meniul ☰ | Primul meniu, cu un buton mare de formular, nu i-a plăcut lui Bogdan; aliniat la buton, ieșea din ecran pe telefon. |
| Încercările | Se salvează **la final**, toate odată, în fișa rundei (decis de Bogdan) | Varianta „fiecare încercare pe loc” ar fi păstrat și încercările rundelor abandonate și reluarea după refresh, dar cerea încă o funcție în bază. |
| Ce rundă se salvează | Doar una începută cu jucătorul deja logat; rândul se scrie la începutul rundei | O rundă începută înainte de login n-are un început cinstit în bază. |
| Mesajul de sub puncte | „Se salvează…”, „✓ Salvată în contul tău”, „Runda nu s-a putut salva”; deconectat: „Rundele se salvează doar cu un cont” + butonul Conectare | Jucătorul vede că runda a ajuns în cont, iar cine n-are cont află de ce i-ar folosi unul. |
| Codurile ligilor | Jocul își păstrează numele (`premier-league`); `saved-rounds.js` le traduce în codurile din bază (`PL`) | Cheia străină din `game_results` arată spre codurile football-data. |
| Contul în pagină | „Profilul meu” în meniul contului duce la `profile.html`: numele, emailul și istoricul rundelor; fiecare rundă terminată se deschide în pagina de rezultat | Cerut de Bogdan după primul test („unde e contul?”). |
| `player_stats` (23 nov) | View cu `security_invoker`, un rând pe jucător: puncte, jucate, câștigate, procent (rotunjit, întreg), streak curent și cel mai bun; rundele în ordinea începerii (`started_at`, apoi `id`); orice rundă pierdută sau abandonată rupe streak-ul. Cine n-are runde n-are rând, iar pagina arată zero | Cerința lui Bogdan. Un view peste `game_results` nu poate inventa un rând pentru cine n-are runde, iar `auth.users` nu e accesibil din browser. Fără `security_invoker`, view-ul ar citi ca proprietarul și ar arăta statisticile tuturor (verificat). |
| Cifrele în profil | Punctele totale în dreapta numelui (cerut de Bogdan); dedesubt, 5 carduri: jucate, câștigate, procent, serie curentă, cea mai bună serie | Punctele sunt cifra principală; restul încap pe un rând pe calculator și pe două pe telefon. |
| Reconectarea | Google arată mereu lista de conturi (`prompt: select_account`) | Deconectarea închide sesiunea de pe site, nu și contul Google din browser, așa că Google îl reconecta pe Bogdan fără nicio întrebare. E comportamentul normal, dar așa cineva cu două conturi Google n-ar fi putut alege niciodată celălalt cont. Parola tot nu se cere, cât timp browserul e logat în Google. |
| Rândul animat de pe prima pagină | Mbappé (Real Madrid, Forward, 27, #10, Franța), comparat cu un atacant mai tânăr de la Real Madrid, cu număr mai mare | Cerut de Bogdan: Salah nu mai e la Liverpool în 2026-27. Poza și sigla vin din `images/`, nu de la API-Football, ca prima pagină să nu facă cereri externe. |
| Ștergerea contului (23 nov) | Funcția `delete_my_account()` din bază, fără parametri, chemată din profil după o confirmare; șterge rândul din `auth.users`, iar rundele pleacă prin `on delete cascade` | Fără server propriu: din browser nu se poate folosi cheia de administrator. O funcție `security definer` fără parametri poate șterge doar contul celui care o cheamă. Doi pași, ca un click greșit să nu șteargă nimic. |
| Politica de confidențialitate (23 nov) | Rescrisă înaintea push-ului cu ștergerea contului; rămâne în engleză | Login-ul ajunsese live înaintea ei (commitul `46dd8f7`). Fiecare afirmație corespunde cu ce face codul: ce primește Supabase de la Google, ce se păstrează pentru o rundă, unde (Londra), cât timp, cum se șterge. |
| Statisticile din profil | Calculate în **SQL** (un view cu funcții fereastră pentru streak), pe ciclul de învățare; decis de Bogdan | Problema streak-ului („gaps and islands”) e o întrebare clasică la interviu și la testul SQL de la SAP. Varianta în JavaScript era mai rapidă, dar fără SQL de explicat, iar mutarea ulterioară ar fi dublat munca. |

## 23 nov 2026 — indiciul de start (cerința lui Bogdan)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Ce se salvează | Faptul (tip + valori), nu fraza; textul vine din `i18n.js` | 4 limbi; un fapt se poate verifica și testa. |
| Unde | Fișier separat, `data/seasons/2026-27/clues/<liga>.json`, cheia = ID-ul jucătorului; mai târziu tabelul `player_facts` | Nu atinge fișierele sezonului, la care lucrează sesiunea cu pozele; o singură sursă pe tip de informație. |
| Easy / Medium | Ultimul transfer + statisticile din sezonul trecut (2025-26) | Cerința lui Bogdan: cariera ajută la vedete. |
| Hard | Tot restul: postul exact, selecțiile, valoarea maximă din carieră, contractul, piciorul și înălțimea, locul nașterii (varianta b) | Cerința lui Bogdan: curiozități la jucătorii mai puțin cunoscuți. |
| Ce nu dezvăluie | Nimic din ce arată căsuțele (echipa, postul general, vârsta, numărul, naționalitatea) și niciun nume de club, nici cel vechi: „dintr-un club din Ligue 1” (varianta b) | Indiciul restrânge căutarea, nu e o căsuță gratis. |
| Fără fapt potrivit | Fapt de rezervă (varianta b) | Niciun jucător nu pierde indiciul și niciunul nu iese din joc. |
| Alegerea | La fiecare rundă, un fapt la întâmplare dintre cele ale jucătorului (varianta a) | Același jucător nu arată mereu la fel. |
| Rezerva (confirmată de Bogdan) | Piciorul și înălțimea, la orice dificultate | La portari, postul exact ar repeta căsuța „Portar”; piciorul și înălțimea le are ~94% dintre jucători. |
| Banii (confirmat de Bogdan) | Intervale: sub 5, 5–10, 10–20, 20–40, 40–70, 70–100, peste 100 mil. €; meciurile și golurile, exacte | O sumă exactă (116 mil. €) numește jucătorul. |
| Indiciul în fișa rundei (confirmat de Bogdan) | Versiunea 2 a fișei; linkurile de versiunea 1 se deschid în continuare, fără indiciu; un indiciu modificat în link e ignorat | Indiciul e un fapt al rundei: prietenul trebuie să vadă ce ai văzut tu. |
| Transferul, doar sigur | „A ajuns la clubul actual în …”: ultimul transfer plătit, cât timp jucătorul e tot la clubul care l-a plătit (un împrumut dus-întors nu-l șterge, ca la Pedri); la cine și-a schimbat clubul pentru 2026-27, doar dacă mutarea e în date (din mai 2026); contractul, la fel. Liga fostului club = liga din meciurile lui din anul dinaintea transferului; dacă nu se știe, propoziția nu o pomenește | Setul se oprește pe 6 iulie. Liga de azi a unui club poate fi alta decât cea de atunci (promovări, retrogradări). Găsit la verificarea pe 10 jucători aleși de Bogdan: Pedri n-avea transfer, pentru că ultimul rând era întoarcerea din împrumut. |
| Locul nașterii | Doar țara, și doar când e alta decât naționalitatea | Orașul (scris neuniform în set) și țara proprie ar da naționalitatea. |
| Jucători fără niciun fapt | Runda începe fără indiciu (7–15% din jucătorii de pe Hard; pe Easy și Medium, sub 1%) | Nu sunt găsiți în Transfermarkt. De reluat după sesiunea cu pozele: profilurile API-Football au înălțimea și locul nașterii. |
| Sezoanele cu indicii | `clueSeasons` în `data/manifest.json`, scris de `build_clues.py` | Jocul nu mai cere fișiere care nu există (2024-25). |

## 23 nov 2026 — jucătorii fără poză și număr (2026-27)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Ținta | Niciun jucător din 2026-27 fără poză sau număr: întâi din software, apoi manual | Cerința lui Bogdan, după ce Ekitike a apărut cu „HE” și „—”. Inventarul din 23 nov: 245 fără poză și 248 fără număr, din 2.664. Jucătorul ascuns era deja ales doar dintre cei compleți; problema apărea la încercări. |
| A doua potrivire (cerința lui Bogdan) | Doar jucătorii rămași nelegați pe ambele părți, în același club, cu vârsta cunoscută (±1 an). În plus, una din două dovezi: numele din Transfermarkt (găsit după data exactă a nașterii, trece regula strictă) sau numele de familie fără inițială. Perechea trebuie să fie unică în ambele sensuri | 54 de jucători legați fără nicio cerere (46 prin Transfermarkt, 8 prin numele de familie), verificați unul câte unul. Nu leagă după prenume (Carreras / „Álvaro Fernández”) și nu caută la alte cluburi („Arthur Vermeeren” → „Arthur” de la Werder, alt jucător). Perechile sunt în `data/raw/second_pass.txt`. |
| Cereri API-Football | O căutare după nume pe jucător (`/players/profiles?search=`), cel mult 60 pe zi (aprobat de Bogdan). Fiecare răspuns se salvează în `data/raw/api-football/profiles/`, deci nu se repetă | 184 de jucători lipseau din loturile API-Football (Ekitike, Rodrygo, Xavi Simons…). O căutare dă ID-ul, data nașterii, poza și numărul. Cele aproximativ 40 de cereri rămase pe zi sunt pentru proiectul de pariuri. |
| Termenul de căutare | Ultimul grup de cel puțin 4 litere simple din nume (`search_term()`) | Verificat pe API: refuză diacriticele, cratima și termenii sub 4 litere. Ignoră accentele („jaros” îl găsește pe Jaroš), dar nu și ø („jlund” pentru Højlund). |
| A treia potrivire | Data exactă a nașterii plus regula de nume din prima potrivire. Dacă jucătorul găsit e în lotul clubului, se ia rândul din lot. Dacă e în lotul altui club, se ia doar poza. Postul rămâne cel de la football-data | Data exactă e cea mai puternică dovadă. Contează numele întreg, nu doar cel de familie: gemenii Oscar și Emil Højlund au aceeași dată și același nume de familie. Prima variantă i-a dat lui Emil poza lui Oscar; greșeala a fost prinsă și acum e acoperită de un test. Postul din profil e uneori greșit (Ekitike apare Midfielder). |
| Corecturi manuale | `data/manual_links.csv` (pentru Excel, separat cu „;”): ID-ul football-data → ID-ul API-Football și/sau numărul. Corectura are prioritate față de potriviri; importul refuză numere în afara intervalului 1–99 | Pentru ce nu găsește software-ul: porecle, date de naștere diferite între surse, dubluri la API-Football (Cestero: #6 în lot, #14 în profil). |
| Ciclul de învățare | După a doua potrivire (cererile, a treia potrivire, excepțiile): fără review cu alt AI și fără explicația lui Bogdan; decizia lui, 23 nov | „Ideea să reușim să-l terminăm.” A doua potrivire a avut ciclul complet, în afară de review. |
| Limită cunoscută | Numărul din profil e cel de la clubul actual, după API-Football. Un jucător împrumutat în afara celor 5 ligi poate primi numărul de acolo (Jaroš: #1) | Clubul nu se poate verifica fără încă o cerere pe jucător. |
| Cine rămâne în joc (decizia lui Bogdan, 23 nov) | Un jucător fără poză sau număr cu valoare sub **1 mil. €** (sau fără valoare cunoscută) iese din JSON-ul jocului, automat, la fiecare rulare (`left_out()`). Cei cunoscuți rămân și se completează | „Păstrăm jucătorii cunoscuți, restul îi ștergem (juniorii sau jucătorii sub 1 mil.)”. Pe 23 nov au ieșit 78 de jucători (juniori, rezerve), iar 69 de jucători cunoscuți au rămas de completat. Jucătorii scoși rămân în `data/raw/incomplete.txt`, cu `in_game = no`. Linkurile rundelor vechi nu se strică, pentru că fișa rundei își poartă datele. |
| Corecturile manuale din 23 nov | 11 rânduri în `data/manual_links.csv`, aprobate de Bogdan: Carreras („Álvaro Fernández”), Gavi („Pablo Gavira”), Salvi Esquivel, Unai Eguíluz, Ramón Terrats, Chupe, Carlos López, Reque, Inao Oulaï, Cestero (lotul, #6) și Juma Bah („Abdulay Bah”, cel mai puțin sigur) | Toți sunt în lotul aceluiași club, cu aceeași vârstă, sub o altă formă a numelui. |
| Ordinea căutărilor | După valoarea de piață, nu după tier; pagina a doua (și a treia) doar pentru numele comune, cât jucătorul e încă negăsit | Cele 60 de cereri pe zi ajung întâi la jucătorii cunoscuți (Bradley, Leoni, Ferguson, Romagnoli). Gavi avea tier 3 pentru că valoarea lui nu s-a găsit („Pablo Gavira” la football-data, „Gavi” la Transfermarkt). |

## De decis
- **ID-uri pentru 2024-25**: JSON-ul scris de mână nu are ID-uri. Le potrivim cu loturile football-data din 2024-25 sau pagina de rezultat merge întâi doar pe 2026-27?
- **ID-uri pentru SuperLiga**: football-data.org nu are România, deci jucătorii de acolo nu au ID-ul folosit în rest.
- ~~**Tier-ul**~~ → decis pe 29 oct (mai sus).
- ~~**SQLite sau direct Supabase**~~ → direct în Supabase, decis pe 29 oct (mai sus).
- **Pauza Supabase** — ping-ul zilnic e decis pe 20 nov (mai sus); rămâne de decis rezerva statică în JSON, înainte ca jocul să citească din bază. Propunere 20 nov (un prieten al lui Bogdan): **UptimeRobot** (gratuit, verificare la 5 minute, email când pică), cu un monitor pe site-ul live și unul pe API-ul Supabase cu cheia publică; ar fi și alarmă, și un al doilea ping, fără regula GitHub de 60 de zile. Recomandarea lui Claude: la Etapa 2 sau cel târziu la înghețarea codului din ianuarie, nu acum. Contextul inițial: pe 5 nov, Supabase a anunțat prin email că proiectul `guessthefootballer` va fi pus pe pauză, pentru că a stat peste 7 zile fără activitate; se poate reporni din dashboard timp de 90 de zile. Acum nu e o problemă: site-ul live rulează pe JSON, iar schema e locală în `sql/schema.sql`. Riscul apare când jocul citește din Supabase: fără trafic, proiectul se oprește, iar linkul din CV pică exact când îl deschide un recrutor. Fără upgrade la Pro. Variante, separat sau împreună: activitate reală, programată, gratuită (ex. un GitHub Action care face o interogare); o rezervă statică în JSON, verificată, pe care jocul o folosește când baza nu răspunde. De reținut: GitHub dezactivează acțiunile programate după 60 de zile fără activitate în repo, deci nici acțiunea nu e suficientă singură.
- **Numărul pe tricou** pentru 2025-26: nicio sursă gratuită nu îl dă pe sezoane trecute. De verificat în setul Transfermarkt (`game_lineups` pare să aibă numărul la fiecare meci); altfel indiciul lipsește la sezonul respectiv sau îl înlocuim.
- ~~**Login**~~ → doar Google, decis pe 20 nov (mai sus).
- **Clubul în sezoanele trecute**: football-data.org dă clubul de la finalul sezonului (Trent = Real Madrid în 2024-25). Îl acceptăm ca regulă a jocului sau îl corectăm cu JSON-ul vechi pentru 2024-25?

## 25 nov 2026 — albumul

| Decizie | Ce am ales | De ce |
|---|---|---|
| Cardul | Bilet de meci: postul luminat, ștampila „Ghicit în N · data”, raritatea prin material | Arată complet fără poze și sigle |
| Ștampila | Cea mai bună rundă câștigată; la egalitate, prima | Un card se poate îmbunătăți |
| Cardurile câștigate | View (`user_cards`), nu tabel | Reies din runde; nimic scris de două ori |
| Locul gol | Arată postul și raritatea, nu numele | Numele ar da răspunsul unei runde |
| Insignele | Cotor de bilet din cod + culori (`tla`, `clubColors`) | Formă proprie, nimic din emblema reală |

## 25 nov 2026 — fără poze și sigle, PWA (Etapa 10)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Poze și sigle | Nu mai apar nicăieri: nici pozele jucătorilor, nici siglele cluburilor și ale ligilor | Pozele cer acordul jucătorului și al clubului; siglele sunt mărci înregistrate. **Înlocuiește decizia din 21 oct** (poze API-Football). |
| Comutatorul | `PORTRAIT_CLUBS` în `common.js`: lista cluburilor care au acceptat în scris; acum goală. O poză apare doar dacă e și în `images/portraits/` | Un singur loc de schimbat. Golind sau completând lista, pozele API-Football nu se pot întoarce din greșeală, nici dintr-un link vechi sau modificat. |
| Inițialele | În culorile clubului (câmp, margine, text), din aceeași paletă ca insignele | Fără poze, inițialele gri arătau toate la fel. |
| Dezvăluirea | Cardul-bilet din album, cu ștampila rundei; până la spoiler, cardul e întors. Dacă jucătorul n-are card (sezon vechi, mutat la alt club), insigna clubului + numele | Același obiect peste tot: runda, rezultatul, albumul. |
| Câștig cu cont | Biletul din pagină apare după fereastra cu cardul (sau după 3 secunde) | Altfel ar strica momentul în care se întoarce cardul. |
| Semnele ligilor | „Abonament de sezon”: codul ligii și steagul țării pe cotor, în `league-marks.js` | Același limbaj ca insignele (bilet), formă proprie. Steagul se recunoaște fără sigla ligii. |
| Sezonul 2024-25 | Scos (decizia lui Bogdan) | Avea pozele și siglele, n-avea ID-uri (deci nici carduri). Alegerea sezonului reapare singură când `manifest.json` are cel puțin două. Numele vechi de cluburi rămân în `badges.json`, pentru linkurile vechi. **Înlocuiește** „2026-27 și 2024-25” din 8 nov. |
| Cache-ul PWA | Întâi rețeaua, pentru toate fișierele (nu doar pentru date); copia locală doar fără internet | Fișierele vechi au mai stricat jocul, iar un JS vechi cu date noi e la fel de rău. Costul: câte o întrebare „s-a schimbat?” pe fișier. |
| Regula de 10 minute a GitHub Pages | `sw.js` cere mereu versiunea nouă și îi spune și paginii să întrebe de fiecare dată | Găsit la test: un tab deschis refolosea JS-ul vechi, deși pagina și datele erau noi. |
| Ce nu se păstrează | Paginile se salvează fără ce urmează după „?” | Un link de rundă sau codul de login nu rămân pe telefon. |
| Copia pentru offline | O listă scrisă de mână în `sw.js`, verificată de `tests/site.test.js` | Fără pas de build; testul pică dacă un fișier lipsește din listă. |
| Sigla | Bilet auriu cu „?” peste tot: aplicație, tab, antet; vulturul iese (cerut de Bogdan) | Vulturul nu se citea la dimensiunea unei iconițe. |
| Numele | „Guess the Footballer” pe toate paginile, netradus; „Bogdy's Games” iese | Prima pagină spunea una, jocul alta (observat de Bogdan). `tests/site.test.js` ține un singur nume. |
| Antetul | Sigla și numele în mijloc; ☰ și ⓘ la stânga, contul și limba la dreapta; pe telefon limba e un cod („RO”). Un singur fișier, `shell.css` | Cerut de Bogdan. Aceleași stiluri erau scrise de două ori. |
| Ecranul de start | Runda începe doar la „Începe runda” (`kickoff.js`); dificultatea se alege acolo, cu punctele maxime. Rândul din `game_results` se scrie atunci, nu la deschiderea paginii | Cerut de Bogdan. Din 43 de runde salvate, 28 erau neterminate: simpla deschidere a paginii pornea o rundă, deci o pierdea. |
| De ce nu la prima încercare | Respins: rândul scris la prima încercare | Indiciul de start s-ar vedea gratis: ai reîncărca pagina până îți convine jucătorul. |
| Părăsirea rundei | Browserul întreabă doar dacă runda începută e salvată într-un cont | O pagină închisă din greșeală ar costa o înfrângere și seria. Fără cont nu se pierde nimic. |
| Pagina de alegere | Doar liga (carduri cu țara) și „Cum să joci” în trei pași desenați | Cerut de Bogdan („mai friendly”). Dificultatea stă lângă butonul de start, unde contează. |
| Bara din joc | Un „tifo” pe ligă: steagul țării din puncte, ca o tribună cu cartoane colorate, sub două reflectoare; doar CSS | Cerut de Bogdan: fundal propriu pe fiecare ligă, fără imagini. |

## 25 nov 2026 — jucătorul zilei (Etapa 11)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Ziua | După ora României (`daily_date()`), același moment pentru toată lumea; o spune baza | Baza e pe UTC: la 00:30 în România ar fi încă ieri. Ceasul telefonului se poate muta cu o zi înainte. |
| Alegerea | Calendar (`daily_players`): un rând pe zi, scris dinainte. Respinsă: o formulă din dată | Repo-ul e public, deci formula ar spune și jucătorul de mâine. S-ar repeta (cu 200 de jucători, prima dublură vine în medie după ~18 zile) și s-ar schimba la fiecare transfer. |
| Umplerea | `scripts/plan_daily.py` ia vedetele din JSON; amestecarea o face baza (`plan_daily_players()`): la fiecare 5 zile trec toate cele 5 ligi. O nouă rulare schimbă doar zilele viitoare | `players` e gol. Ordinea rămâne doar în tabel și nu se afișează, deci nimeni nu știe jucătorul de mâine. |
| Fără repetări | Unic pe sezon și jucător | Unic pe tot calendarul ar fi scos vedetele pentru totdeauna, și din 2027-28. |
| Cine vede ce | RLS: `day <= daily_date()`, pentru vizitatori și conturi; scrie doar scriptul | Rândul de mâine nu există pentru browser. |
| Limita cunoscută | Pe cel de azi îl poate afla cine deschide uneltele browserului | Încercările se compară în pagină. La runda verificată pe server, `<=` devine `<`. |
| Liga, dificultatea, punctele (acceptate de Bogdan) | O ligă pe zi, doar vedete (tier 1), regulile și punctele de la Ușor (10–60), în totalul din profil; cardul intră în album | Jucătorul trebuie să fie cunoscut de toți; regulile rămân cele pe care le știu. |
| Seria (acceptată) | Zile la rând ghicite (`daily_stats`); o zi pierdută, sărită sau neterminată o rupe, iar ziua de azi nejucată încă nu | Separată de seria rundelor normale, care rămâne cum era. |
| O rundă pe zi | `game_results.daily_on` + index unic (cont, zi), `null` la rundele normale. Ziua o pune `start_daily_round()`, fără parametri; al doilea apel întoarce aceeași rundă | Un buton ascuns nu oprește al doilea tab. Cu o zi aleasă de browser s-ar putea repara seria. |
| Miezul nopții (acceptat) | Runda ține de ziua în care a început; se poate termina până la 01:00 (`daily_round_open()`) | Cine începe la 23:58 nu pierde ziua; fără termen, a doua zi s-ar putea termina o rundă cu răspunsul știut. |
| Finalul | La runda zilei, jucătorul ascuns îl scrie baza, din calendar | Browserul nu poate primi cardul altui jucător. |
| Refresh (acceptat) | Încercările stau în browser și runda continuă pe același dispozitiv; pe altul, pagina spune că e începută în altă parte. O salvare eșuată se reia la următoarea deschidere | Un refresh n-ar trebui să coste ziua, iar un al doilea dispozitiv ar da încă 6 încercări. |
| Fără cont | Se joacă o dată pe browser, nimic în bază; o rundă începută fără cont nu intră mai târziu în cont | Aceeași regulă ca la rundele normale: fără un început cinstit în bază nu se salvează. |
| Indiciul de start | Același pentru toți, ales după zi | La rundele normale e la întâmplare; aici toți primesc aceeași rundă. |
| Share | Pătrățele și link spre joc, nu spre pagina de rezultat | Linkul de rezultat conține răspunsul, iar azi toți au același jucător. |
| Cererile spre bază | Doar pagina zilei întreabă baza; prima pagină și alegerea ligii, nu | Un vizitator trimite ceva spre Supabase doar dacă deschide jucătorul zilei; scris în politica de confidențialitate. |

## 25 nov 2026 — interfața pe telefon (Etapa 12)

| Decizie | Ce am ales | De ce |
|---|---|---|
| Ordinea (Bogdan) | Finalul și traducerea → runda → accesibilitatea → prima pagină și ligile → albumul unei ligi | Finalul și runda se văd la fiecare joc. |
| Finalul rundei | Câmpul și legenda dispar; biletul mic lângă scor (se mărește la atingere); pe telefon, butoanele lipite jos | Biletul era la 678–726 px, sub scroll. |
| Înfrângerea | Biletul e gri, și mărit, și pe pagina de rezultat. „Cardul lui rămâne de câștigat” apare doar cu cont și doar dacă nu e deja în album | Arăta ca la câștig. |
| Țările | Se compară după cod (`countries.js`), nu după nume; numele îl traduce browserul, cu câteva excepții în `i18n.js` | Datele au „Congo DR” și „DR Congo”: doi congolezi ieșeau diferiți. Merge și la linkurile vechi. |
| Numele de pe bilet | Patru corectate de mână, după ID (`PRINTED_NAMES`) | „JUNIOR” și „AUREL BISSECK” nu spuneau cine e. |
| Tastatura | Cât scrii: indiciul pe două rânduri, ultima încercare pe un rând, sugestiile cât spațiu rămâne | Ultima încercare era acoperită. |
| Legenda | Pe telefon doar în ⓘ. **Înlocuiește** rândul de sub indicii din 8 nov (pe calculator rămâne) | Ocupa loc în fiecare rundă. |
| Încercarea pe două rânduri | Propunere, nefăcută (neîncercată) | La 320 px, numele și cluburile lungi ar sta pe ~90 px; varianta compactă apare doar cât scrii. |
| Respinse (Gemini) | Limba în ☰, ligile pe verticală, banda „RATAT”, fără ecran de start, statistici nelegate de cont | Limba nu s-ar mai găsi; ecranul de start oprește rundele pierdute din greșeală. |
| „Posibil” în sugestii | Nu acum | Arată candidații, deci schimbă dificultatea. |
