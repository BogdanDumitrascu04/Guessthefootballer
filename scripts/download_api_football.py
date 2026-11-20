"""Downloads the current squads from API-Football (photo, shirt number) into data/raw/api-football/.

Step 1 (--teams): one request per country lists its clubs; the clubs are matched with the
football-data.org clubs of the current season and the matches are printed for review.
Step 2 (--squads): one request per club. Saved files are never requested again, so a run that
hits the daily limit (100 requests, shared with another project) continues the next day.

Run from the project folder:
    .venv\\Scripts\\python.exe scripts\\download_api_football.py --teams
    .venv\\Scripts\\python.exe scripts\\download_api_football.py --squads
"""

import json
import os
import sys
import time
import unicodedata
from pathlib import Path

import httpx
from dotenv import load_dotenv

BASE_URL = "https://v3.football.api-sports.io"
PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
OUT_DIR = RAW_DIR / "api-football"
SEASON = "2026-27"
COUNTRIES = {"PL": "England", "PD": "Spain", "BL1": "Germany", "SA": "Italy", "FL1": "France"}
PAUSE = 6.5  # the free plan allows 10 requests per minute

# Words that say what kind of club it is, not which one.
# fmt: off
CLUB_WORDS = {
    "1", "1846", "1899", "1901", "1904", "1907", "1909", "1913", "ac", "acf", "afc", "as", "bc", "calcio",
    "cf", "club", "de", "del", "fc", "football", "hsc", "of", "ogc", "rc", "rcd", "sad", "sc", "ssc", "sv",
    "ud", "us", "vfb", "vfl", "tsg",
}
# fmt: on
# Pairs the name rules cannot find: football-data.org club ID -> API-Football club ID.
MANUAL = {529: 94}  # Stade Rennais -> Rennes


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return " ".join(text.replace("-", " ").replace(".", " ").replace("'", " ").split())


def words(name: str) -> set[str]:
    return set(normalize(name).split()) - CLUB_WORDS


def is_first_team(team: dict) -> bool:
    name = normalize(team["name"])
    last = name.split()[-1]
    youth = last.startswith("u") and last[1:].isdigit()
    return not team.get("national") and not youth and last not in ("w", "ii", "iii", "b", "women")


def match_team(fd_team: dict, af_teams: list[dict]) -> dict | None:
    """Most name words in common, then the same 3-letter code, then the fewest extra words.

    The last tie-break is the lower ID: API-Football gave the big clubs the first IDs.
    """
    if fd_team["id"] in MANUAL:
        return next((t for t in af_teams if t["id"] == MANUAL[fd_team["id"]]), None)
    wanted = words(fd_team["name"]) | words(fd_team.get("shortName") or "")
    scored = []
    for team in af_teams:
        theirs = words(team["name"])
        common = len(wanted & theirs)
        if common:
            same_code = bool(team.get("code")) and team["code"] == fd_team.get("tla")
            scored.append(((common, same_code, -len(theirs - wanted), -team["id"]), team))
    return max(scored, key=lambda s: s[0])[1] if scored else None


def get(client: httpx.Client, url: str, params: dict) -> dict:
    """One request. Raises RuntimeError when the daily limit is reached."""
    for attempt in (1, 2):
        data = client.get(url, params=params).raise_for_status().json()
        errors = data.get("errors") or {}
        if not errors:
            return data
        if "rateLimit" in errors and attempt == 1:
            time.sleep(61)
            continue
        raise RuntimeError(f"API-Football: {errors}")
    raise RuntimeError("API-Football: rate limit after waiting")


def fd_teams(code: str) -> list[dict]:
    data = json.loads((RAW_DIR / f"{code}_{SEASON}.json").read_text(encoding="utf-8"))
    return data["teams"]


def country_teams(client: httpx.Client, country: str) -> list[dict]:
    path = OUT_DIR / f"teams_{country}.json"
    if not path.exists():
        data = get(client, "/teams", {"country": country})
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        time.sleep(PAUSE)
    response = json.loads(path.read_text(encoding="utf-8"))["response"]
    return [item["team"] for item in response if is_first_team(item["team"])]


def team_map(client: httpx.Client) -> dict:
    """football-data.org club ID -> API-Football club, saved to team_map.json."""
    mapping, missing = {}, []
    for code, country in COUNTRIES.items():
        candidates = country_teams(client, country)
        for team in fd_teams(code):
            found = match_team(team, candidates)
            if found:
                mapping[str(team["id"])] = {"league": code, "fd_name": team["name"], **found}
                print(f"{code:<4} {team['name']:<34} -> {found['name']} ({found['id']})")
            else:
                missing.append(f"{code} {team['name']} (id {team['id']})")
    (OUT_DIR / "team_map.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=1), encoding="utf-8")
    if missing:
        print("\nNot matched, add them to MANUAL:\n  " + "\n  ".join(missing))
    return mapping


def download_squads(client: httpx.Client, mapping: dict) -> None:
    done = skipped = 0
    for team in mapping.values():
        path = OUT_DIR / f"squad_{team['id']}.json"
        if path.exists():
            skipped += 1
            continue
        try:
            data = get(client, "/players/squads", {"team": team["id"]})
        except RuntimeError as error:
            print(f"Stopped at {team['name']}: {error}")
            break
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        done += 1
        print(f"{done:>3}. {team['name']}: {len(data['response'][0]['players']) if data['response'] else 0} players")
        time.sleep(PAUSE)
    left = sum(not (OUT_DIR / f"squad_{t['id']}.json").exists() for t in mapping.values())
    print(f"\nDownloaded {done}, already saved {skipped}, still missing {left}.")


def main() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    key = os.getenv("API_FOOTBALL_KEY")
    if not key or len(sys.argv) < 2 or sys.argv[1] not in ("--teams", "--squads"):
        sys.exit("Usage: download_api_football.py --teams | --squads   (needs API_FOOTBALL_KEY in .env)")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with httpx.Client(base_url=BASE_URL, headers={"x-apisports-key": key}, timeout=30) as client:
        mapping = team_map(client)
        if sys.argv[1] == "--squads":
            download_squads(client, mapping)


if __name__ == "__main__":
    main()
