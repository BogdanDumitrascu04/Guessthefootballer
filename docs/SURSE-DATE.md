# Surse de date

Cheile stau în `.env` (planuri gratuite), niciodată în repo.

## Verificat (21 oct 2026) — football-data.org, plan Free

Cerere: `GET /v4/competitions/PL/teams?season=<an>` (o cerere = o ligă întreagă, cu loturile tuturor echipelor).

Echipe / jucători în loturi (`season=2024` = 2024-25):

| Liga (cod) | 2024-25 | 2025-26 | 2026-27 |
|---|---|---|---|
| Premier League (`PL`) | 20 / 655 | 20 / 659 | 20 / 545 |
| La Liga (`PD`) | 20 / 693 | 20 / 718 | 20 / 522 |
| Bundesliga (`BL1`) | 18 / 582 | 18 / 564 | 18 / 523 |
| Serie A (`SA`) | 20 / 687 | 20 / 691 | 20 / 586 |
| Ligue 1 (`FL1`) | 18 / 580 | 18 / 601 | 18 / 475 |

Total: **9.081 de rânduri** (jucător × club × sezon), dar doar **5.054 de jucători diferiți**. 1.405 apar în toate cele 3 sezoane, 1.215 în două, 2.434 într-unul singur; 891 și-au schimbat clubul.

- Pe jucător: **`id` fix**, `name` (nume complet), `position`, `dateOfBirth`, `nationality`.
- **Nu are:** poză, număr pe tricou.
- Loturile sunt diferite pe sezon (ex. Arsenal 2024: Neto; 2025 și 2026: Kepa) → bun pentru „pe sezoane".
- Limita: 10 cereri pe minut. 5 ligi × 3 sezoane = 15 cereri pentru tot (testat: cu 6,5 s între cereri, toate 15 au mers).
- Sezonul curent are loturi mai mici: doar jucătorii înregistrați acum. Sezoanele trecute îi includ pe toți cei care au trecut pe la club.
- `position`: aproape toți au doar `Goalkeeper` / `Defence` / `Midfield` / `Offence`; ~370 au post detaliat (`Centre-Back`, `Left Winger`…), 23 nu au deloc → trebuie adus la 4 grupe.
- 15 jucători fără `dateOfBirth`; naționalitatea există la toți.
- ⚠️ **Un singur club pe sezon — cel de la finalul sezonului (30 iunie).** Ex.: Trent Alexander-Arnold apare la Real Madrid în 2024-25, deși a jucat tot sezonul la Liverpool (a semnat în iunie 2025). Rari: 2 jucători apar la 2 cluburi în același sezon (ex. Keito Nakamura, 2024).
- Comparat cu JSON-ul vechi 2024-25: 1.019 din 1.186 găsiți după nume; **982 la același club, 37 diferit** (transferuri din ianuarie + greșeli din JSON-ul scris de mână, ex. Sterling trecut la Chelsea, deși era împrumutat la Arsenal din august 2024). 167 negăsiți după nume → nume scrise diferit, de potrivit.
- Numele cluburilor sunt lungi („FC Bayern München", „Real Madrid CF"); există și `shortName` / `tla`.

## Verificat (21 oct 2026) — API-Football, plan Free

Cerere: `GET /players/squads?team=<id>` (fără parametru de sezon → merge pe planul gratuit, deși sezonul 2026 e blocat la celelalte endpoint-uri).

- Pe jucător: `id` (alt ID decât la football-data.org), `name` **prescurtat** („H. Davies"), `age`, `number`, `position`, **`photo`** (`https://media.api-sports.io/football/players/<id>.png`).
- Doar **lotul de acum** (2026-27).
- 96 de echipe = 96 de cereri; limita e 100 pe zi, **comună cu alt proiect care folosește aceeași cheie**.
- ⚠️ Jucătorii trebuie potriviți cu cei de la football-data.org (ID-uri diferite, nume prescurtate): echipă + nume de familie + vârstă.

## Verificat (29 oct 2026) — transfermarkt-datasets (Kaggle `davidcariboo/player-scores`)

Proiect public pe GitHub (`dcaribou/transfermarkt-datasets`), construit din datele Transfermarkt. **Licența CC0** e afișată pe repo; pagina nu spune explicit că acoperă și datele. Nu menționează termenii Transfermarkt și nu cere o formă anume de citare.

- 12 tabele: `competitions`, `clubs`, `players`, `games`, `appearances`, `player_valuations`, `club_games`, `game_events`, `game_lineups`, `transfers`, `countries`, `national_teams`.
- ⚠️ **Actualizările sunt oprite:** pagina scrie că datele sunt valabile până pe **6 iulie 2026**, fără dată de reluare. Lipsesc transferurile din vara lui 2026; valorile pentru 2026-27 sunt cele din iulie.
- Descărcare fără cont, fișier cu fișier, de pe `pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/` (fișiere din 5 sept 2026). Mărimi (`.csv.gz`, comprimat):

| Fișier | MB | La ce ne trebuie |
|---|---|---|
| `players` | 4,4 | legătura cu football-data.org (`player_id` Transfermarkt) |
| `player_valuations` | 7,2 | valorile de piață în timp → jocul 2 (peste 650.000 de rânduri) |
| `transfers` | 5,8 | cariera → jocul 3 (peste 175.000 de rânduri) |
| `clubs`, `competitions` | 0,05 | numele cluburilor și ligilor |
| `appearances` + `games` | 45 + 5 | minutele pe sezon → sugestia „titular” |
| `game_lineups` | 126 | probabil numărul pe tricou la fiecare meci (de verificat) |

Tot setul: zip de 241 MB sau un fișier DuckDB de 211 MB.

- ⚠️ ID-urile Transfermarkt diferă de cele de la football-data.org → potrivire o singură dată după **nume + data nașterii**, apoi `tm_id` se salvează în `players`.

### Inventar (29 oct 2026, primele 5 tabele descărcate în `data/raw/transfermarkt/`, UTF-8)

| Tabel | Rânduri | Coloane folositoare |
|---|---|---|
| `players` | 50.149 | `player_id`, `name`, `date_of_birth` (99,9%), `position` / `sub_position`, `country_of_citizenship`, `current_club_id`, `market_value_in_eur`, `highest_market_value_in_eur`, `international_caps`; are și `image_url` (Transfermarkt → **nu îl folosim**) |
| `player_valuations` | 656.301 (41.528 de jucători) | `player_id`, `date`, `market_value_in_eur`, `current_club_id` |
| `transfers` | 175.165 (23.379 de jucători) | `player_id`, `transfer_date`, `transfer_season` („25/26”), `from_club_id/name`, `to_club_id/name`, `transfer_fee` (65%), `market_value_in_eur` (61%) |
| `clubs` | 796 | `club_id`, `name`, `domestic_competition_id`; `total_market_value` e gol |
| `competitions` | 65 | codurile ligilor: `GB1`, `ES1`, `L1`, `IT1`, `FR1` |

**Potrivirea cu loturile football-data.org (5.054 de jucători):** 4.633 găsiți (**91,7%**): 4.158 după numele complet + data nașterii, 475 după un cuvânt din nume + data nașterii. Restul: 405 negăsiți, 3 ambigui, 13 fără dată de naștere. Printre negăsiți sunt și greșeli de dată la football-data.org (Simon Walde: „2026-06-30”), pe lângă nume scrise diferit (Yussuf Poulsen) → a doua regulă: nume + club.

**Valori de piață** (de la 2000 până pe **12 iunie 2026**; actualizări mari în martie, mai, iunie):

| Sezon | În lot | Potriviți | Cu o valoare în timpul sezonului |
|---|---|---|---|
| 2024-25 | 3.196 | 3.092 | 2.610 (82%) |
| 2025-26 | 3.233 | 3.116 | 2.574 (80%) |
| 2026-27 | 2.650 | 2.369 | 0 → folosim ultima valoare (iunie 2026): 2.274 |

**Transferuri:** din 4.633 de jucători potriviți, 3.939 au cel puțin un transfer, iar 3.747 au trei sau mai multe. Câteva capcane pentru cariere:
- Sunt incluse mutările la juniori (Mbappé: „Monaco Youth → Monaco U19 → Monaco”) → de filtrat echipele `Youth` / `U19` / `II`.
- Împrumutul apare ca două rânduri: PSG 31.08.2017, apoi „PSG → Monaco” pe 30.06.2018 (finalul împrumutului) și „Monaco → PSG” pe 01.07.2018 (180 mil. €) → perioadele consecutive la același club se unesc.
- 475 de transferuri au data în viitor (ex. întoarceri din armată în Coreea, 2028) → le ignorăm pe cele de după data importului.
- Unele transferuri din vara lui 2026 există (1.242 cu data între 1 iulie și 29 oct: semnate înainte de 6 iulie).
- Exemplu verificat: Mbappé → Monaco 2016 → PSG 2017 (împrumut, apoi 180 mil. €) → Real Madrid 2024.

## Verificat (29 oct 2026) — Wikidata (rezervă pentru cariere)

Gratuit, CC0, fără cheie. Proprietatea `P54` („member of sports team”) are anii de început și de sfârșit.
- Mbappé (`Q21621995`): Monaco 2015–2018, PSG 2017–2018 (împrumut) și 2018–2024, Real Madrid 2024–. Apar și echipele naționale, de tineret și secundele (Monaco II) → de filtrat.
- Doar anul, fără lună. Acoperirea pe toți cei 5.054 de jucători nu e testată.

## Ce avem și ce lipsește

| Ce | Sursa | Stare |
|---|---|---|
| Lotul pe sezon (3 sezoane) | football-data.org | ✅ |
| Naționalitate, data nașterii, post | football-data.org | ✅ |
| Poza jucătorului | API-Football | ✅ (lotul curent; jucătorii plecați din top 5 păstrează poza veche dacă o avem) |
| Număr pe tricou 2026-27 | API-Football | ✅ |
| Număr pe tricou 2024-25 | JSON-ul vechi din `data/` | ✅ parțial (1.186 de jucători) |
| Număr pe tricou 2025-26 | `game_lineups` din setul Transfermarkt | ⚠️ de verificat |
| Tier (vedetă / titular / lot) | Excelul lui Bogdan, precompletat din valoare + minute | ⚠️ după descărcare |
| Valoarea de piață pe sezon | setul Transfermarkt (`player_valuations`) | ✅ până în iul 2026 |
| Cariera (cluburi + ani) | setul Transfermarkt (`transfers`) + clubul din 2026-27 (football-data.org); rezervă: Wikidata | ✅ până în iul 2026 |
| Siglele cluburilor | football-data.org (`crest`) sau `images/` | ✅ |
