"""Builds data/badges.json: the code and colours behind each club's own badge, under the names the game uses.

Run from the project folder (after build_season.py):
    .venv\\Scripts\\python.exe scripts\\build_badges.py
"""

import json
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"
SEASON = "2026-27"
SEASON_DIR = PROJECT_DIR / "data" / "seasons" / SEASON
OUT = PROJECT_DIR / "data" / "badges.json"
LEAGUES = {"PL": "premier-league", "PD": "la-liga", "BL1": "bundesliga", "SA": "serie-a", "FL1": "ligue-1"}
CODE_FIXES = {576: "RCS"}  # football-data.org gives Strasbourg "RC ", two letters and a space


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    team_map = read(RAW_DIR / "api-football" / "team_map.json")
    badges = read(OUT)  # names from earlier seasons stay: the rounds in old links still need their badges
    for code, league in LEAGUES.items():
        teams = {team_map[str(t["id"])]["name"]: t for t in read(RAW_DIR / f"{code}_{SEASON}.json")["teams"]}
        for name in read(SEASON_DIR / f"{league}.json")["teams"]:
            team = teams[name]
            badges[name] = {
                "code": CODE_FIXES.get(team["id"], team["tla"].strip()),
                "colors": [color.strip() for color in team["clubColors"].split("/")],
            }
    lines = [f"  {json.dumps(n, ensure_ascii=False)}: {json.dumps(b)}" for n, b in sorted(badges.items())]
    OUT.write_text("{\n" + ",\n".join(lines) + "\n}\n", encoding="utf-8", newline="\n")
    print(f"{len(badges)} club names -> {OUT.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
