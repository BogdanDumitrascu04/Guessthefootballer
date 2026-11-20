"""Creates the tables from sql/schema.sql in the Supabase database.

The whole file runs in one transaction: either every table is created or none is.
Existing tables are left alone, so the script can be run again.

Run from the project folder:
    .venv\\Scripts\\python.exe scripts\\apply_schema.py
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent.parent
SCHEMA_FILE = PROJECT_DIR / "sql" / "schema.sql"


def apply_schema(conn: psycopg.Connection) -> None:
    """Runs the schema in the connection's current schema: public, or a test one."""
    conn.execute(SCHEMA_FILE.read_text(encoding="utf-8"))


def table_names(conn: psycopg.Connection) -> list[str]:
    rows = conn.execute(
        "select table_name from information_schema.tables where table_schema = current_schema() order by table_name"
    ).fetchall()
    return [name for (name,) in rows]


def main() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        sys.exit("Lipsește SUPABASE_DB_URL în .env")

    with psycopg.connect(url) as conn:  # commits on success, rolls back on error
        apply_schema(conn)
        names = table_names(conn)
    print(f"Schema aplicată. Tabele în bază ({len(names)}): {', '.join(names)}")


if __name__ == "__main__":
    main()
