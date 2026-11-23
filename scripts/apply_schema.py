"""Creates the tables from sql/ in the Supabase database: the schema, the leagues and seasons, the game results.

Everything runs in one transaction: either all of it is applied or nothing is.
Existing tables and rows are left alone, so the script can be run again.

Run from the project folder:
    .venv\\Scripts\\python.exe scripts\\apply_schema.py
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent.parent
SQL_FILES = [
    PROJECT_DIR / "sql" / name
    for name in ("schema.sql", "reference_data.sql", "game_results.sql", "player_stats.sql", "delete_account.sql")
]


def apply_schema(conn: psycopg.Connection) -> None:
    """Runs the SQL files, in order, in the connection's current schema: public, or a test one."""
    for path in SQL_FILES:
        conn.execute(path.read_text(encoding="utf-8"))


def table_names(conn: psycopg.Connection) -> list[str]:
    """Tables only: views such as player_stats store nothing."""
    rows = conn.execute(
        "select table_name from information_schema.tables"
        " where table_schema = current_schema() and table_type = 'BASE TABLE' order by table_name"
    ).fetchall()
    return [name for (name,) in rows]


def main() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        sys.exit("Lipsește SUPABASE_DB_URL în .env")

    with psycopg.connect(url) as conn:  # commits on success, rolls back on error
        # finish_round() keeps this search path; pg_temp last, so a temporary table cannot stand in for a real one.
        conn.execute("set local search_path to public, pg_temp")
        apply_schema(conn)
        names = table_names(conn)
        views = [
            v for (v,) in conn.execute("select table_name from information_schema.views where table_schema = 'public'")
        ]
    print(f"Schema aplicată. Tabele în bază ({len(names)}): {', '.join(names)}")
    print(f"View-uri ({len(views)}): {', '.join(views)}")


if __name__ == "__main__":
    main()
