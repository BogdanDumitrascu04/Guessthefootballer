"""Fills the calendar of the player of the day (sql/daily_players.sql) with the stars of the current season.

Run from the project folder, after apply_schema.py and again after every rebuild of the season's files:
    .venv\\Scripts\\python.exe -m scripts.plan_daily
The past and today stay as they are; only the days to come are planned again. The database draws the order and
nothing prints it, so nobody knows tomorrow's player, the author included.
"""

import json
import os
import sys

import psycopg
from dotenv import load_dotenv

from scripts.build_season import LEAGUES, MANIFEST, PROJECT_DIR

STARS = 1  # the tier of the Easy rounds (TARGET_TIERS in engine.js)


def candidates(season: str) -> list[dict]:
    """The stars the game can hide: like in a round, a player needs a number and an age to be guessed."""
    found = []
    for code, (league_id, _) in LEAGUES.items():
        path = PROJECT_DIR / "data" / "seasons" / season / f"{league_id}.json"
        for p in json.loads(path.read_text(encoding="utf-8"))["players"]:
            if p["tier"] == STARS and p["number"] is not None and p["age"] is not None:
                found.append({"league_id": code, "player_id": p["id"]})
    return found


def plan(conn: psycopg.Connection, season: str, players: list[dict]) -> None:
    conn.execute("select plan_daily_players(%s, %s)", [season, json.dumps(players)])


def main() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        sys.exit("Lipsește SUPABASE_DB_URL în .env")
    season = json.loads(MANIFEST.read_text(encoding="utf-8"))["defaultSeason"]

    with psycopg.connect(url) as conn:  # commits on success, rolls back on error
        conn.execute("set local search_path to public, pg_temp")
        plan(conn, season, candidates(season))
        days, first, last = conn.execute(
            "select count(*), min(day), max(day) from daily_players where day >= daily_date()"
        ).fetchone()
        per_league = conn.execute(
            "select league_id, count(*) from daily_players where day >= daily_date() group by league_id order by league_id"
        ).fetchall()
    if not days:
        sys.exit("Calendarul e gol: toate vedetele sezonului au avut deja ziua lor.")
    print(f"Calendar: {days} zile, {first:%d.%m.%Y} – {last:%d.%m.%Y}")
    print("Pe ligi:", ", ".join(f"{league} {n}" for league, n in per_league))


if __name__ == "__main__":
    main()
