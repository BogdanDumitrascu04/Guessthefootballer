"""Etapa 1, pasul 1: descarcă loturile de pe football-data.org în data/raw/.

Ce face:
- 5 ligi × ultimele 3 sezoane, câte un JSON pe ligă și sezon, exact cum vine de la sursă;
- numele fișierelor: PL_2024-25.json;
- sezoanele terminate se descarcă doar dacă lipsesc (nu se mai schimbă);
- sezonul curent se descarcă la fiecare rulare (loturile se schimbă la transferuri);
- sursa permite 10 cereri pe minut: nu facem pauze, dar la refuz (429) așteptăm cât cere sursa
  și reîncercăm o singură dată;
- răspunsul e verificat înainte de salvare și merge întâi într-un fișier .part, redenumit abia când e complet;
- la eroare trece la următorul fișier; la final afișează un rezumat, un rând pe fișier.

Rulare (din folderul proiectului):
    .venv\\Scripts\\python.exe scripts\\download_squads.py
"""

import json
import os
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import httpx
from dotenv import load_dotenv

BASE_URL = "https://api.football-data.org/v4"
PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"

SEASONS = 3  # ultimele 3 sezoane, inclusiv cel curent

# Codul ligii la football-data.org → numele afișat
LEAGUES = {"PL": "Premier League", "PD": "La Liga", "BL1": "Bundesliga", "SA": "Serie A", "FL1": "Ligue 1"}

MAX_WAIT = 65  # secunde; sursa își resetează contorul la fiecare minut

Fetch = Callable[[str, dict], httpx.Response]  # adresa relativă + parametrii → răspunsul sursei
Sleep = Callable[[float], None]


@dataclass
class Result:
    league: str
    season: str
    teams: int | None
    players: int | None
    status: str


# --- Funcții fără internet (le verifică testele din tests/) ---


def current_season_start(today: date) -> int:
    """Sezonul începe vara: din iulie 2026 suntem în 2026/27, până în iunie 2026 în 2025/26."""
    return today.year if today.month >= 7 else today.year - 1


def seasons_to_download(current: int) -> list[int]:
    """2026 -> [2024, 2025, 2026]"""
    return list(range(current - SEASONS + 1, current + 1))


def season_label(start_year: int) -> str:
    """2024 -> '2024-25' (în numele fișierului; '/' nu e voie pe Windows)."""
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def file_path(raw_dir: Path, code: str, start_year: int) -> Path:
    return raw_dir / f"{code}_{season_label(start_year)}.json"


def count_squads(content: bytes, start_year: int) -> tuple[int, int]:
    """(echipe, jucători). Aruncă ValueError dacă răspunsul nu arată ca loturile sezonului cerut."""
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError("nu e un JSON valid") from error
    teams = data.get("teams") if isinstance(data, dict) else None
    if not teams:
        raise ValueError("lipsesc echipele")
    # pentru un sezon pe care nu-l are, o sursă poate trimite în liniște alt sezon
    sent = str((data.get("season") or {}).get("startDate", ""))[:4]
    if sent != str(start_year):
        raise ValueError(f"sursa a trimis alt sezon ({sent or 'necunoscut'})")
    empty = [team.get("name", "?") for team in teams if not team.get("squad")]
    if empty:
        raise ValueError(f"echipe fără lot: {', '.join(empty)}")
    return len(teams), sum(len(team["squad"]) for team in teams)


def save_complete(path: Path, content: bytes) -> None:
    """Scrie în .part, apoi redenumește. Un fișier final există doar dacă e complet."""
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(path.name + ".part")
    part.write_bytes(content)
    part.replace(path)


def wait_seconds(response: httpx.Response) -> float:
    """Cât cere sursa să așteptăm după un refuz (429). Fără indicație: un minut întreg."""
    try:
        seconds = float(response.headers.get("X-RequestCounter-Reset", MAX_WAIT))
    except ValueError:
        seconds = MAX_WAIT
    return min(max(seconds, 1), MAX_WAIT)


def get_squads(fetch: Fetch, sleep: Sleep, code: str, start_year: int) -> bytes:
    """O cerere pentru o ligă și un sezon. La 429 așteaptă și reîncearcă o singură dată."""
    url, params = f"/competitions/{code}/teams", {"season": start_year}
    response = fetch(url, params)
    if response.status_code == 429:
        seconds = wait_seconds(response)
        print(f"  limita sursei (10 cereri pe minut): aștept {seconds:.0f} s, apoi continui singur...", flush=True)
        sleep(seconds)
        response = fetch(url, params)  # dacă și acum e 429, raise_for_status îl face eroare
    response.raise_for_status()
    return response.content


def process(fetch: Fetch, sleep: Sleep, raw_dir: Path, code: str, start_year: int, current: int) -> Result:
    """Un fișier: îl sare, îl descarcă sau îl actualizează. Nu aruncă erori, le pune în Result."""
    league, label = LEAGUES[code], season_label(start_year)
    path = file_path(raw_dir, code, start_year)
    is_current = start_year == current

    local_broken = False
    if path.exists() and not is_current:
        try:
            return Result(league, label, *count_squads(path.read_bytes(), start_year), "existent")
        except ValueError:
            local_broken = True  # e doar o copie a datelor de la sursă: îl luăm din nou

    existed = path.exists()
    try:
        content = get_squads(fetch, sleep, code, start_year)
        teams, players = count_squads(content, start_year)  # verificăm ÎNAINTE să salvăm
        save_complete(path, content)
    except (httpx.HTTPError, ValueError, OSError) as error:
        kept = " (am păstrat fișierul vechi)" if existed else ""
        return Result(league, label, None, None, f"EROARE: {describe(error)}{kept}")

    if local_broken:
        status = "descărcat din nou (fișierul local era stricat)"
    elif existed:
        status = "actualizat (sezon curent)"
    else:
        status = "descărcat"
    return Result(league, label, teams, players, status)


def describe(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        if code == 429:
            return "prea multe cereri (429), chiar și după așteptare"
        if code == 403:
            return "acces refuzat (403): planul gratuit nu acoperă liga sau sezonul"
        return f"sursa a răspuns cu codul {code}"
    if isinstance(error, httpx.HTTPError):
        return f"problemă de rețea ({type(error).__name__})"
    if isinstance(error, OSError):
        return f"nu pot salva fișierul ({error.strerror or type(error).__name__})"
    return str(error)


def format_row(r: Result) -> str:
    counts = f"{r.teams:>2} echipe  {r.players:>4} jucători" if r.players is not None else f"{'—':>23}"
    return f"{r.league:<15} {r.season}  {counts}  {r.status}"


# --- Partea cu internetul ---


def download_all(key: str, show: bool = True) -> list[Result]:
    current = current_season_start(date.today())
    results = []
    with httpx.Client(base_url=BASE_URL, headers={"X-Auth-Token": key}, timeout=30) as client:

        def fetch(url: str, params: dict) -> httpx.Response:
            return client.get(url, params=params)

        for code in LEAGUES:
            for start_year in seasons_to_download(current):
                result = process(fetch, time.sleep, RAW_DIR, code, start_year, current)
                if show:
                    print(format_row(result), flush=True)
                results.append(result)
    return results


def main() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    key = os.getenv("FOOTBALL_DATA_ORG_KEY")
    if not key:
        sys.exit("Lipsește FOOTBALL_DATA_ORG_KEY în .env (vezi .env.example).")
    results = download_all(key)
    errors = sum(r.status.startswith("EROARE") for r in results)
    total = sum(r.players or 0 for r in results)
    print(f"\n{len(results)} fișiere, {total} jucători în loturi, {errors} erori. Folder: {RAW_DIR}")
    if errors:
        sys.exit(1)  # cine pornește scriptul automat trebuie să afle că n-a mers tot


if __name__ == "__main__":
    main()
