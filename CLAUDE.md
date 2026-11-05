# Guess the Footballer — context pentru Claude

Proiect de portofoliu al lui Bogdan (repo public pe contul `BogdanDumitrascu04`, link în CV). Comunicarea se face în română. Buget: **0 €**.

**Documente — citește-le la începutul fiecărei sesiuni:**
- `docs/ETAPE.md` — unde suntem, ce urmează, ce e bifat.
- `docs/DECIZII.md` — deciziile luate. Orice decizie nouă se notează aici.
- `docs/SURSE-DATE.md` — ce date primim din fiecare sursă, verificat.

**Status (5 nov 2026):** site-ul live rulează pe JSON (2024-25), cu interfața nouă. Baza Supabase e în lucru: schema există local, fără commit, până când Bogdan o explică; loturile și setul Transfermarkt sunt descărcate.

**Termene:** CV-ul pleacă pe 5 nov, cu linkul live · noiembrie: baza + jocul 1 pe sezoane + jocul 2 (date de reconfirmat) · decembrie: jocul 3 + conturi · ianuarie: cod înghețat, înaintea interviului tehnic.

## Ce construim
O platformă cu **3 jocuri de fotbal pe aceeași bază de date** de jucători:
1. **Guess the Footballer pe sezoane** — jocul existent (Wordle cu fotbaliști, vanilla JS pe GitHub Pages), cu upgrade, nu rescris.
2. **Higher or lower** — doi jucători, alegi pe cel cu valoarea de piață mai mare; runde, scorul crește cât răspunzi corect.
3. **Ghicește jucătorul după carieră** — cluburile și anii (Monaco 2015–2017 → PSG 2017–2024 → Real Madrid 2024–).

Pentru jocul 1:
- jucătorii vin dintr-o **bază de date pe sezoane** (ultimele 3, accent pe 2026-27), nu din JSON scris de mână;
- **conturi** (login de pe internet), statistici, streak;
- interfață nouă, profesională, dar păstrând structura de acum.

**O singură bază, nu una pe joc:** câte un tabel pe tip de informație (`players`, `squad_entries`, `market_values`, `transfers`; `game_results` odată cu conturile). Fiecare joc citește ce-i trebuie printr-o interogare.

## Cum lucrăm — modul mixt
- **Date, SQL, schemă:** ciclul de învățare:
  1. explici conceptul (ce și de ce);
  2. Bogdan scrie cerința în cuvintele lui; îi spui ce lipsea;
  3. tu scrii codul și testele;
  4. Bogdan rulează și pune întrebări; tu îi pui 1–2 întrebări de verificare;
  5. review cu alt AI → Bogdan decide → el face commit-ul.
- **Interfață, login, deploy:** construiești tu, Bogdan testează și aprobă la fiecare etapă.
- Regula de aur la partea de date: nu trecem mai departe până nu explică în 2–3 propoziții ce face codul.
- Înainte de fiecare etapă: scopul, pașii, cine ce face, cum știm că e gata.

## Reguli
- **Poza aparține jucătorului, nu sezonului** (o singură poză pe jucător, în `players`). Ce se schimbă de la un sezon la altul (club, număr, post, tier) stă în `squad_entries`.
- Jucătorii se leagă **după ID-ul sursei**, niciodată doar după nume (numele diferă între surse: „H. Davies" vs „Harvey Davies").
- Date doar din surse care permit folosirea lor. **Nu facem noi scraping** (Transfermarkt, Sofascore etc.). Singura excepție, decisă pe 29 oct: setul public `transfermarkt-datasets` (Kaggle `davidcariboo/player-scores`, CC0), pentru valori de piață, transferuri și minute, cu sursa citată în README. Pozele nu se iau de acolo.
- **Tier-ul îl alege Bogdan** într-un Excel (o coloană cu listă: vedetă / titular / lot), precompletat cu o sugestie; importul validează fiecare rând și păstrează alegerile la actualizări.
- **Comentariile din cod** sunt în engleză și strict esențiale, ca în FlowLogix: explică de ce, nu ce; fără bannere și fără comentarii care repetă codul.
- Cheile API stau doar în `.env` (în `.gitignore`), niciodată în cod sau în commit-uri. În browser ajunge doar cheia publică (`anon`) de la Supabase; securitatea vine din politicile RLS.
- Limita API-Football (100 de cereri pe zi) e **comună cu alt proiect local al lui Bogdan** care folosește aceeași cheie.

## Structura
- `index.html` — hub-ul „Bogdy's Games”.
- `games/guess-the-footballer/` — picker (`index.html`) + jocul (`game.html`, `engine.js`, `i18n.js`, `game.css`).
- `data/` — JSON-ul vechi (2024-25, 1.186 de jucători, cu `tier` și număr curatoriate) — sursă pentru import, apoi iese din joc.
- `data/raw/` (în `.gitignore`) — ce descarcă scripturile: loturile football-data.org, setul Transfermarkt (`data/raw/transfermarkt/`).
- `scripts/` + `tests/` — scripturile de date (Python) și testele lor.
- `images/` — siglele cluburilor și pozele vechi (14 MB).

## Mediu
- Windows 11, Git, VS Code. Python 3.13 (de folosit un `.venv` propriu în Etapa 1).
- Testare locală: fișierele se servesc prin HTTP (jocul folosește `fetch()`), nu deschise direct de pe disc.
- Live: https://bogdandumitrascu04.github.io/Guessthefootballer/ (GitHub Pages, branch `master`).
- Supabase: proiectul `guessthefootballer` (organizația `BogdanDumitrascu04`, plan Free, regiunea London `eu-west-2`). Scripturile se conectează prin `SUPABASE_DB_URL` din `.env` (Session pooler, merge și pe rețele fără IPv6).
- `C:\Users\BogdanPC\Desktop\Joc` e o copie veche (aug 2024, repo `BodysGame`) — nu e proiectul ăsta.
