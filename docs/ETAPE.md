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
- [ ] la reluare: repornirea proiectului din dashboard (pus pe pauză, anunț pe email 5 nov; se poate reporni timp de 90 de zile)
- [ ] **înainte de trecerea pe Supabase:** soluția pentru pauză, gratuită, fără Pro (activitate programată și/sau rezervă statică în JSON, vezi „De decis” în `DECIZII.md`), verificată: cu baza oprită, linkul din CV tot merge
- [ ] jocul citește jucătorii din Supabase în loc de JSON (arată la fel ca acum)

## Etapa 3 — Interfața nouă (mod: construiește Claude)
Făcută pe 5 nov, înaintea Supabase, pe datele din JSON (2024-25). Testată local: toate paginile, desktop și telefon (375 px), cele 5 ligi, 10 încercări, câștig, repornire, schimbarea limbii, fără erori în consolă.
- [x] temă nouă, lizibilă, pe toată pagina; grilă cu toate încercările (nu doar ultima)
- [x] pozele jucătorilor în autocomplete și în rezultat (unde există portret; Bundesliga, Serie A și Ligue 1 au doar sigla, deci inițiale în grilă)
- [x] mobil
- [x] căutare fără diacritice („odegaard”), cu săgeți + Enter; o încercare repetată nu se mai consumă; numele jucătorului apare la final
- [x] hub-ul: cifrele corecte („5 leagues · 1,186 players”), scrise de mână
- [ ] testul lui Bogdan + push
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

## Etapa 7 — Conturi (decembrie)
- [ ] înregistrare / login (Supabase Auth)
- [ ] fiecare joc terminat se salvează (`game_results`, cu jocul, scorul, data)
- [ ] pagina de profil: statistici, streak

## După
- provocarea zilnică (același jucător pentru toți), clasament, butonul de share, modul Icons
