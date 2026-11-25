"""Builds data/badges.json: the code and colours behind each club's own badge, under the names the game uses.

Run from the project folder (after build_season.py):
    .venv\\Scripts\\python.exe scripts\\build_badges.py
"""

import json
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
SEASONS_DIR = PROJECT_DIR / "data" / "seasons"
LEAGUES = {"PL": "premier-league", "PD": "la-liga", "BL1": "bundesliga", "SA": "serie-a", "FL1": "ligue-1"}
CODE_FIXES = {576: "RCS"}  # football-data.org gives Strasbourg "RC ", two letters and a space
HAND_WRITTEN = {  # the 2024-25 files were typed by hand, so these names match no source: football-data.org ID
    "Nottingham Forest": 351, "Manchester City": 65, "Manchester United": 66, "West Ham United": 563,
    "Newcastle United": 67, "Tottenham Hotspur": 73, "Wolverhampton Wanderers": 76, "Brighton & Hove Albion": 397,
    "Atlético Madrid": 78, "Celta Vigo": 558, "Real Valladolid": 250, "RCD Espanyol": 80,
    "Bayern Munich": 5, "Bayer Leverkusen": 3, "Borussia Monchengladbach": 18, "TSG Hoffenheim": 2,
    "Werder Bremen": 12, "Mainz 05": 15, "VfL Bochum": 36, "FC Heidenheim": 44, "FC St. Pauli": 20,
    "Como": 7397, "Hellas Verona": 450, "Venezia": 454, "Paris Saint-Germain": 524, "Olympique Marseille": 516,
    "AS Monaco": 548, "Stade Brestois": 512, "RC Strasbourg": 576, "AS Saint-Etienne": 527,
}  # fmt: skip


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    team_map = read(RAW_DIR / "api-football" / "team_map.json")
    badges = {}
    for code, league in LEAGUES.items():
        for season in ("2024-25", "2026-27"):
            teams = {t["id"]: t for t in read(RAW_DIR / f"{code}_{season}.json")["teams"]}
            ids = {name: team["id"] for team in teams.values() for name in (team["shortName"], team["name"])}
            if season == "2026-27":
                ids = {team_map[str(team_id)]["name"]: team_id for team_id in teams}
            for name in read(SEASONS_DIR / season / f"{league}.json")["teams"]:
                team = teams[ids.get(name) or HAND_WRITTEN[name]]
                badges[name] = {
                    "code": CODE_FIXES.get(team["id"], team["tla"].strip()),
                    "colors": [color.strip() for color in team["clubColors"].split("/")],
                }
    out = PROJECT_DIR / "data" / "badges.json"
    lines = [f"  {json.dumps(n, ensure_ascii=False)}: {json.dumps(b)}" for n, b in sorted(badges.items())]
    out.write_text("{\n" + ",\n".join(lines) + "\n}\n", encoding="utf-8", newline="\n")
    print(f"{len(badges)} club names -> {out.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
