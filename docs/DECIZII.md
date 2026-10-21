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

## De decis
- **Tier-ul** (vedetă / titular / lot) pentru jucătorii noi: azi e pus de mână doar pentru 2024-25. Variante: popularitatea paginii de Wikipedia (API Wikimedia, gratuit), păstrarea tier-ului vechi pentru cei care au rămas, corecție manuală pe vedete.
- **Numărul pe tricou** pentru 2025-26: nicio sursă gratuită nu îl dă pe sezoane trecute. Variante: indiciul lipsește la sezonul respectiv sau îl înlocuim.
- **Login**: doar email + parolă sau și Google.
- **Clubul în sezoanele trecute**: football-data.org dă clubul de la finalul sezonului (Trent = Real Madrid în 2024-25). Îl acceptăm ca regulă a jocului sau îl corectăm cu JSON-ul vechi pentru 2024-25?
