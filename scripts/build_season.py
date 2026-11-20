"""Builds data/seasons/2026-27/<league>.json for the game from the downloaded sources.

- squads, full names, nationality, date of birth: football-data.org;
- photo and shirt number: API-Football, linked to each player by club, name and age;
- tier: suggested from the latest Transfermarkt market value, ranked within the league.

Run from the project folder (after download_squads.py and download_api_football.py):
    .venv\\Scripts\\python.exe scripts\\build_season.py
"""

import csv
import gzip
import html
import json
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
AF_DIR = RAW_DIR / "api-football"
TM_DIR = RAW_DIR / "transfermarkt"
SEASON = "2026-27"
OUT_DIR = PROJECT_DIR / "data" / "seasons" / SEASON
MANIFEST = PROJECT_DIR / "data" / "manifest.json"

LEAGUES = {
    "PL": ("premier-league", "Premier League"),
    "PD": ("la-liga", "La Liga"),
    "BL1": ("bundesliga", "Bundesliga"),
    "SA": ("serie-a", "Serie A"),
    "FL1": ("ligue-1", "Ligue 1"),
}
STARS, REGULARS = 40, 180  # value rank within the league: 1-40 tier 1, 41-180 tier 2, the rest tier 3

AF_POSITIONS = {"Goalkeeper": "Goalkeeper", "Defender": "Defender", "Midfielder": "Midfielder", "Attacker": "Forward"}
FD_POSITIONS = [  # football-data.org mixes 4 groups with detailed positions
    ("goalkeeper", "Goalkeeper"),
    ("back", "Defender"),
    ("defen", "Defender"),
    ("midfield", "Midfielder"),
    ("wing", "Forward"),
    ("forward", "Forward"),
    ("striker", "Forward"),
    ("offence", "Forward"),
]
SPECIAL_LETTERS = str.maketrans({"ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "ł": "l", "đ": "d", "ð": "d", "ı": "i"})


def normalize(name: str) -> str:
    name = name.lower().translate(SPECIAL_LETTERS)
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(name.replace("-", " ").replace(".", " ").replace("'", "").split())


def age_on(birth: str | None, today: date) -> int | None:
    if not birth:
        return None
    born = date.fromisoformat(birth[:10])
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def best_age(fd_age: int | None, af_age: int | None) -> int | None:
    """football-data.org has a few wrong birth dates (a 21-year-old listed at 48), so a big gap trusts API-Football."""
    if fd_age is None or (af_age is not None and abs(fd_age - af_age) > 3):
        return af_age
    return fd_age


def position(fd_position: str | None, af_position: str | None) -> str | None:
    if af_position in AF_POSITIONS:
        return AF_POSITIONS[af_position]
    text = (fd_position or "").lower()
    return next((group for key, group in FD_POSITIONS if key in text), None)


def same_person(fd_name: str, af_name: str) -> bool:
    """API-Football often shortens first names ("H. Davies"); football-data.org does not."""
    fd_tokens = normalize(fd_name).split()
    af_tokens = normalize(html.unescape(af_name)).split()  # the API sends "O&apos;Reilly"
    initials = [t for t in af_tokens if len(t) == 1]
    af_words = [t for t in af_tokens if len(t) > 1]
    if af_words and all(w in fd_tokens for w in af_words):
        return not initials or fd_tokens[0].startswith(initials[0])
    fd_words = [t for t in fd_tokens if len(t) > 1]
    return bool(fd_words) and all(w in af_tokens for w in fd_words)


def match_players(fd_squad: list[dict], af_players: list[dict], today: date) -> dict[int, dict]:
    """football-data.org player ID -> API-Football player, for one club. Unclear cases stay unmatched."""
    matches, claimed = {}, defaultdict(list)
    for af in af_players:
        found = [p for p in fd_squad if same_person(p["name"], af["name"])]
        if len(found) > 1 and af.get("age"):
            found = [p for p in found if abs((age_on(p.get("dateOfBirth"), today) or 0) - af["age"]) <= 1]
        if len(found) == 1:
            claimed[found[0]["id"]].append(af)
    for fd_id, afs in claimed.items():
        if len(afs) == 1:  # two API-Football players on one name: neither is certain
            matches[fd_id] = afs[0]
    return matches


def assign_tiers(values: dict[str, int | None]) -> dict[str, int]:
    """Player key -> tier, by market value rank. No known value: tier 3."""
    ranked = sorted((v, k) for k, v in values.items() if v)
    ranked.reverse()
    tiers = {k: 3 for k in values}
    for rank, (_, key) in enumerate(ranked, 1):
        tiers[key] = 1 if rank <= STARS else 2 if rank <= REGULARS else 3
    return tiers


def unique_names(players: list[dict]) -> None:
    """The game finds players by name, so equal names in one league get their club added."""
    counts = defaultdict(int)
    for p in players:
        counts[normalize(p["name"])] += 1
    for p in players:
        if counts[normalize(p["name"])] > 1:
            p["name"] = f"{p['name']} ({p['team']})"


def tm_rows(name: str):
    with gzip.open(TM_DIR / f"{name}.csv.gz", "rt", encoding="utf-8", newline="") as f:
        yield from csv.DictReader(f)


def load_market_values(today: date) -> tuple[dict, dict]:
    """(date of birth -> Transfermarkt players born that day, Transfermarkt ID -> latest value)."""
    by_birth = defaultdict(list)
    for row in tm_rows("players"):
        if row["date_of_birth"]:
            by_birth[row["date_of_birth"][:10]].append(row)
    latest = {}
    for row in tm_rows("player_valuations"):
        if row["date"] <= today.isoformat() and row["date"] >= latest.get(row["player_id"], ("",))[0]:
            latest[row["player_id"]] = (row["date"], int(row["market_value_in_eur"]))
    return by_birth, {k: v for k, (_, v) in latest.items()}


def market_value(player: dict, by_birth: dict, values: dict) -> int | None:
    """Same birth date and the same name, or one name word in common if only one player fits."""
    born = (player.get("dateOfBirth") or "")[:10]
    wanted = normalize(player["name"])
    same_day = by_birth.get(born, [])
    found = [r for r in same_day if normalize(r["name"]) == wanted]
    if not found:
        words = set(wanted.split())
        found = [r for r in same_day if words & set(normalize(r["name"]).split())]
    return values.get(found[0]["player_id"]) if len(found) == 1 else None


def player_entry(fd: dict, af: dict, team: str, today: date) -> dict:
    """The football-data.org ID is kept because it never changes: shared links and saved rounds point to it."""
    return {
        "id": fd["id"],
        "name": fd["name"],
        "team": team,
        "position": position(fd.get("position"), af.get("position")),
        "age": best_age(age_on(fd.get("dateOfBirth"), today), af.get("age")),
        "number": af.get("number"),
        "nationality": fd.get("nationality"),
        "photo": af.get("photo"),
    }


def build_league(code: str, today: date, team_map: dict, by_birth: dict, values: dict) -> dict:
    league_id, league_name = LEAGUES[code]
    fd = json.loads((RAW_DIR / f"{code}_{SEASON}.json").read_text(encoding="utf-8"))
    teams, players, worth = {}, [], {}
    for team in fd["teams"]:
        af_team = team_map[str(team["id"])]
        squad_file = AF_DIR / f"squad_{af_team['id']}.json"
        af_players = []
        if squad_file.exists():
            response = json.loads(squad_file.read_text(encoding="utf-8"))["response"]
            af_players = response[0]["players"] if response else []
        matched = match_players(team["squad"], af_players, today)
        teams[af_team["name"]] = af_team["logo"]
        for p in team["squad"]:
            players.append(player_entry(p, matched.get(p["id"], {}), af_team["name"], today))
            worth[len(players) - 1] = market_value(p, by_birth, values)
    tiers = assign_tiers(worth)
    for index, p in enumerate(players):
        p["tier"] = tiers[index]
    unique_names(players)
    return {"id": league_id, "name": league_name, "season": SEASON, "teams": teams, "players": players}


def update_manifest() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if SEASON not in manifest["seasons"]:
        manifest["seasons"].append(SEASON)
    manifest["defaultSeason"] = SEASON
    for league in manifest["leagues"]:
        if SEASON not in league["seasons"]:
            league["seasons"].append(SEASON)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    today = date.today()
    team_map = json.loads((AF_DIR / "team_map.json").read_text(encoding="utf-8"))
    by_birth, values = load_market_values(today)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for code in LEAGUES:
        data = build_league(code, today, team_map, by_birth, values)
        path = OUT_DIR / f"{data['id']}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        players = data["players"]
        complete = sum(p["photo"] is not None and p["number"] is not None for p in players)
        tiers = [sum(p["tier"] == t for p in players) for t in (1, 2, 3)]
        print(
            f"{data['name']:<15} {len(players):>4} players, {complete:>4} with photo + number "
            f"({100 * complete / len(players):.0f}%), tiers 1/2/3: {tiers}"
        )
    update_manifest()
    print(f"Written to {OUT_DIR}; manifest default season: {SEASON}")


if __name__ == "__main__":
    main()
