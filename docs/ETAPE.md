# Etape

**Regula:** la începutul fiecărei etape, Claude amintește:
- scopul;
- pașii;
- ce face Bogdan și ce face Claude;
- cum știm că etapa e gata.

Bifăm aici pe parcurs.

## Etapa 0 — Fundația (21 oct)
**Scop:** știm ce construim, cu ce, și ce date primim — testat, nu presupus.

- [x] linkul live regăsit: https://bogdandumitrascu04.github.io/Guessthefootballer/
- [x] proiectul real identificat (`Projects\Guessthefootballer`; `Desktop\Joc` e o copie veche)
- [x] deciziile: Supabase, mod mixt, poze API-Football (`DECIZII.md`)
- [x] sursele testate: football-data.org dă loturile pe 3 sezoane, API-Football dă pozele (`SURSE-DATE.md`)
- [ ] **Bogdan:** cont Supabase (cu GitHub-ul `BogdanDumitrascu04`), proiect nou, regiunea Frankfurt (eu-central-1)
- [x] **Bogdan:** primul commit cu documentele (`CLAUDE.md`, `docs/`) — „pasul 0”, pushed 22 oct. GitHub Desktop e pe contul `BogdanDumitrascu4`, care e colaborator pe repo; emailul local al repo-ului e gmail-ul (legat de `BogdanDumitrascu04`)

**Gata când:** totul e bifat.

## Etapa 1 — Datele (mod: ciclul complet)
**Scop:** o bază locală (SQLite) cu toți jucătorii din 5 ligi × 3 sezoane, verificată.
- [x] `.venv` (Python 3.13) + `.env` (aceleași chei) + `.env.example` + `.gitignore` + `requirements.txt` (Claude, 21 oct)
- [x] test pe toate cele 15 loturi — rezultatele în `SURSE-DATE.md` (21 oct)
- [ ] pasul 1: descărcarea loturilor de la football-data.org (15 cereri) — `scripts/download_squads.py`
  - [x] cerința (Bogdan, cu variante): `data/raw/PL_2024-25.json`; sezoanele terminate o dată, cel curent la fiecare rulare; la 429 așteaptă și reîncearcă o dată; la eroare trece mai departe; un rând pe fișier
  - [x] codul + 16 teste fără internet (Claude, 21 oct)
  - [x] commit + push (în „pasul 0”, 22 oct)
  - [x] rularea pe date reale (Bogdan, 22 oct): 15 fișiere, 9.081 de jucători în loturi, 0 erori; a doua rulare: „existent” + „actualizat”, fără pauză
  - [x] review cu Gemma 4 E4B, local în Bionic (22 oct, 14 min): 5 observații, verificate una câte una — niciuna valabilă (4 descriu cod care există deja, 1 e o alegere de design)
  - [x] decizia lui Bogdan (22 oct): nu reparăm nimic
  - [ ] commit (Bogdan)
- [ ] schema: `leagues`, `seasons`, `clubs`, `players`, `squad_entries`
- [ ] încărcarea în SQLite + verificări (câți jucători pe ligă/sezon, duplicate)
- [ ] pozele + numerele de la API-Football, potrivite cu jucătorii (96 de cereri, pe o zi)
- [ ] importul datelor vechi (tier + număr, 2024-25)
- [ ] decizia pentru tier la jucătorii noi

## Etapa 2 — Supabase (mod: ciclul complet la schemă și SQL)
- [ ] aceeași schemă în PostgreSQL + politici RLS (citire publică a jucătorilor)
- [ ] încărcarea datelor din SQLite în Supabase
- [ ] jocul citește jucătorii din Supabase în loc de JSON (arată la fel ca acum)

## Etapa 3 — Interfața nouă (mod: construiește Claude)
- [ ] temă nouă, lizibilă, pe toată pagina; grilă cu toate încercările (nu doar ultima)
- [ ] pozele jucătorilor în autocomplete și în rezultat
- [ ] mobil
- [ ] hub-ul: numerele de ligi și jucători luate din bază (acum scrie greșit „3 leagues · 669 players")

## Etapa 4 — Conturi
- [ ] înregistrare / login (Supabase Auth)
- [ ] fiecare joc terminat se salvează (`games`)
- [ ] pagina de profil: statistici, streak

## Etapa 5 — Publicarea
- [ ] deploy pe GitHub Pages + ping-ul care ține Supabase activ
- [ ] README nou, capturi noi, credit pentru surse

## După
- provocarea zilnică (același jucător pentru toți), clasament, butonul de share, modul Icons
