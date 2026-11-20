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

## De decis
- **ID-uri pentru 2024-25**: JSON-ul scris de mână nu are ID-uri. Le potrivim cu loturile football-data din 2024-25 sau pagina de rezultat merge întâi doar pe 2026-27?
- **ID-uri pentru SuperLiga**: football-data.org nu are România, deci jucătorii de acolo nu au ID-ul folosit în rest.
- ~~**Tier-ul**~~ → decis pe 29 oct (mai sus).
- ~~**SQLite sau direct Supabase**~~ → direct în Supabase, decis pe 29 oct (mai sus).
- **Pauza Supabase** — ping-ul zilnic e decis pe 20 nov (mai sus); rămâne de decis rezerva statică în JSON, înainte ca jocul să citească din bază. Contextul inițial: pe 5 nov, Supabase a anunțat prin email că proiectul `guessthefootballer` va fi pus pe pauză, pentru că a stat peste 7 zile fără activitate; se poate reporni din dashboard timp de 90 de zile. Acum nu e o problemă: site-ul live rulează pe JSON, iar schema e locală în `sql/schema.sql`. Riscul apare când jocul citește din Supabase: fără trafic, proiectul se oprește, iar linkul din CV pică exact când îl deschide un recrutor. Fără upgrade la Pro. Variante, separat sau împreună: activitate reală, programată, gratuită (ex. un GitHub Action care face o interogare); o rezervă statică în JSON, verificată, pe care jocul o folosește când baza nu răspunde. De reținut: GitHub dezactivează acțiunile programate după 60 de zile fără activitate în repo, deci nici acțiunea nu e suficientă singură.
- **Numărul pe tricou** pentru 2025-26: nicio sursă gratuită nu îl dă pe sezoane trecute. De verificat în setul Transfermarkt (`game_lineups` pare să aibă numărul la fiecare meci); altfel indiciul lipsește la sezonul respectiv sau îl înlocuim.
- ~~**Login**~~ → doar Google, decis pe 20 nov (mai sus).
- **Clubul în sezoanele trecute**: football-data.org dă clubul de la finalul sezonului (Trent = Real Madrid în 2024-25). Îl acceptăm ca regulă a jocului sau îl corectăm cu JSON-ul vechi pentru 2024-25?
