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

## Ce avem și ce lipsește

| Ce | Sursa | Stare |
|---|---|---|
| Lotul pe sezon (3 sezoane) | football-data.org | ✅ |
| Naționalitate, data nașterii, post | football-data.org | ✅ |
| Poza jucătorului | API-Football | ✅ (lotul curent; jucătorii plecați din top 5 păstrează poza veche dacă o avem) |
| Număr pe tricou 2026-27 | API-Football | ✅ |
| Număr pe tricou 2024-25 | JSON-ul vechi din `data/` | ✅ parțial (1.186 de jucători) |
| Număr pe tricou 2025-26 | — | ❌ |
| Tier (vedetă / titular / lot) | JSON-ul vechi pentru 2024-25; pentru rest de decis | ⚠️ |
| Siglele cluburilor | football-data.org (`crest`) sau `images/` | ✅ |
