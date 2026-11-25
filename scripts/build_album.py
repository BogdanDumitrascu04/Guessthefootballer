"""Builds data/album/: the list of clubs and one small file of cards per club.

The page opens one club at a time, so each club has its own file and nothing else is downloaded.

Run from the project folder, as a module because it reuses the country table of build_clues.py:
    .venv\\Scripts\\python.exe -m scripts.build_album
"""

import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from scripts.build_badges import CODE_FIXES
from scripts.build_clues import COUNTRIES

PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
SEASON = "2026-27"
SEASON_DIR = PROJECT_DIR / "data" / "seasons" / SEASON
OUT_DIR = PROJECT_DIR / "data" / "album"

LEAGUES = {"PL": "premier-league", "PD": "la-liga", "BL1": "bundesliga", "SA": "serie-a", "FL1": "ligue-1"}
COUNTRY_ALIASES = {  # football-data.org spells these differently from Transfermarkt
    "Cape Verde Islands": "CV",
    "China PR": "CN",
    "Congo DR": "CD",
    "Ivory Coast": "CI",
    "South Korea": "KR",
    "Turkey": "TR",
    "USA": "US",
}
LINES = ["goalkeeper", "defender", "midfielder", "forward"]
GENERAL = {"Goalkeeper": "goalkeeper", "Defender": "defender", "Midfielder": "midfielder", "Forward": "forward"}
SPOTS = {  # exact position -> line of the pitch; the order here is also the order of the seats in a row
    "goalkeeper": "goalkeeper",
    "leftBack": "defender",
    "centreBack": "defender",
    "rightBack": "defender",
    "defensiveMidfield": "midfielder",
    "leftMidfield": "midfielder",
    "centralMidfield": "midfielder",
    "rightMidfield": "midfielder",
    "attackingMidfield": "midfielder",
    "leftWinger": "forward",
    "secondStriker": "forward",
    "centreForward": "forward",
    "rightWinger": "forward",
}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def clean_name(name: str) -> str:
    return " ".join(unicodedata.normalize("NFC", name).split())


def country_code(nationality: str) -> str:
    return COUNTRY_ALIASES.get(nationality) or COUNTRIES[nationality]


def exact_position(facts: list[dict]) -> str | None:
    return next((fact["detail"] for fact in facts if fact["type"] == "position"), None)


def make_card(player: dict, facts: list[dict]) -> dict:
    general = GENERAL[player["position"]]
    spot = exact_position(facts) or general
    return {
        "id": player["id"],
        "name": clean_name(player["name"]),
        "line": SPOTS.get(spot, general),
        "spot": spot,
        "age": player["age"],
        "country": country_code(player["nationality"]),
        "tier": player["tier"],
    }


def seat_order(card: dict) -> tuple:
    spots = list(SPOTS)
    place = spots.index(card["spot"]) if card["spot"] in SPOTS else len(spots)
    return place, card["tier"], card["name"]


def main() -> None:
    team_map = read(RAW_DIR / "api-football" / "team_map.json")
    clubs, leagues, entries = {}, [], []
    for code, league_id in LEAGUES.items():
        season = read(SEASON_DIR / f"{league_id}.json")
        facts = read(SEASON_DIR / "clues" / f"{league_id}.json")["players"]
        club_ids = {}
        for team in read(RAW_DIR / f"{code}_{SEASON}.json")["teams"]:
            name = team_map[str(team["id"])]["name"]
            club_ids[name] = team["id"]
            clubs[team["id"]] = {
                "name": name,
                "code": CODE_FIXES.get(team["id"], team["tla"].strip()),
                "colors": [color.strip() for color in team["clubColors"].split("/")],
                "league": league_id,
            }
        leagues.append(
            {"id": league_id, "name": season["name"], "clubs": sorted(club_ids.values(), key=lambda i: clubs[i]["name"])}
        )
        for player in season["players"]:
            entries.append((club_ids[player["team"]], player, facts.get(str(player["id"]), [])))

    # One player, one card: a shirt number means the player was found in the club's current squad.
    chosen: dict[int, tuple] = {}
    dropped = []
    for entry in sorted(entries, key=lambda e: e[1]["number"] is None):
        player_id = entry[1]["id"]
        if player_id in chosen:
            dropped.append((entry[1]["name"], clubs[entry[0]]["name"], clubs[chosen[player_id][0]]["name"]))
        else:
            chosen[player_id] = entry

    by_club = defaultdict(list)
    for club_id, player, facts in chosen.values():
        by_club[club_id].append(make_card(player, facts))

    for club_id, cards in by_club.items():
        ordered = []
        for row, line in enumerate(LINES, start=1):
            in_line = sorted((card for card in cards if card["line"] == line), key=seat_order)
            ordered += [card | {"row": row, "seat": seat} for seat, card in enumerate(in_line, start=1)]
        assert len(ordered) == len(cards), clubs[club_id]["name"]
        write(OUT_DIR / "clubs" / f"{club_id}.json", {"id": club_id, "cards": ordered})
        tiers = Counter(card["tier"] for card in cards)
        clubs[club_id]["cards"] = [tiers[tier] for tier in (1, 2, 3)]

    write(OUT_DIR / "index.json", {"season": SEASON, "leagues": leagues, "clubs": clubs})

    totals = Counter(card["tier"] for cards in by_club.values() for card in cards)
    exact = sum(card["spot"] in SPOTS for cards in by_club.values() for card in cards)
    print(f"{len(clubs)} clubs, {sum(totals.values())} cards: platinum {totals[1]}, gold {totals[2]}, silver {totals[3]}")
    print(f"exact position: {exact} ({exact / sum(totals.values()):.0%}, goalkeepers included)")
    for name, left_out, kept in dropped:
        print(f"one card for {name}: kept {kept}, left out {left_out}")


if __name__ == "__main__":
    main()
