"""Tests for sql/schema.sql on the Supabase database (need internet and SUPABASE_DB_URL in .env).

They never touch the real tables: everything happens in a temporary schema,
inside a transaction that is rolled back at the end.
"""

import os
from uuid import uuid4

import psycopg
import pytest
from dotenv import load_dotenv
from psycopg import errors, sql

from scripts.apply_schema import PROJECT_DIR, apply_schema, table_names

load_dotenv(PROJECT_DIR / ".env")
URL = os.environ.get("SUPABASE_DB_URL")

pytestmark = pytest.mark.skipif(not URL, reason="lipsește SUPABASE_DB_URL în .env")

MBAPPE, CLUB, SEASON = 1, 86, "2026-27"


@pytest.fixture(scope="module")
def conn():
    """A test schema created and dropped in the same transaction: nothing stays in the database."""
    with psycopg.connect(URL, autocommit=True) as c, c.transaction(force_rollback=True):
        schema = f"test_{uuid4().hex[:8]}"
        c.execute(sql.SQL("create schema {}").format(sql.Identifier(schema)))
        c.execute(sql.SQL("set local search_path to {}").format(sql.Identifier(schema)))
        apply_schema(c)  # also adds the leagues and seasons, La Liga and 2026-27 among them
        c.execute("insert into clubs (id, name) values (86, 'Real Madrid CF'), (524, 'Paris Saint-Germain FC')")
        c.execute(
            "insert into players (id, name, date_of_birth, tm_id) values (1, 'Kylian Mbappé', '1998-12-20', 342229)"
        )
        yield c


@pytest.fixture
def db(conn):
    """Each test runs in a savepoint rolled back at the end, so tests can't affect each other."""
    with conn.transaction(force_rollback=True):
        yield conn


def add_entry(db, player=MBAPPE, club=CLUB, season=SEASON, **columns):
    names = ["player_id", "club_id", "season_id", "league_id", *columns]
    values = [player, club, season, "PD", *columns.values()]
    query = sql.SQL("insert into squad_entries ({}) values ({})").format(
        sql.SQL(", ").join(map(sql.Identifier, names)), sql.SQL(", ").join(sql.Placeholder() * len(values))
    )
    db.execute(query, values)


def refused(db, error, action):
    """The action must be refused by the database with the given error."""
    with pytest.raises(error), db.transaction():
        action()


def test_all_tables_are_created(db):
    assert table_names(db) == [
        "clubs",
        "game_results",
        "leagues",
        "market_values",
        "players",
        "seasons",
        "squad_entries",
    ]


def test_schema_can_run_twice(db):
    apply_schema(db)


def test_valid_entry_is_accepted(db):
    add_entry(db, position="Forward", shirt_number=10, tier=1)
    db.execute("insert into market_values values (1, '2026-06-05', 180000000)")
    assert db.execute("select count(*) from squad_entries").fetchone() == (1,)


def test_same_player_twice_in_same_squad_is_refused(db):
    add_entry(db)
    refused(db, errors.UniqueViolation, lambda: add_entry(db))


def test_same_player_in_two_clubs_same_season_is_accepted(db):
    add_entry(db, club=86)
    add_entry(db, club=524)  # a transfer during the season


def test_entry_for_unknown_player_is_refused(db):
    refused(db, errors.ForeignKeyViolation, lambda: add_entry(db, player=999))


def test_entry_for_unknown_season_is_refused(db):
    refused(db, errors.ForeignKeyViolation, lambda: add_entry(db, season="2030-31"))


@pytest.mark.parametrize(
    "column, value",
    [("shirt_number", 0), ("shirt_number", 100), ("tier", 0), ("tier", 4), ("position", "Striker")],
)
def test_impossible_values_are_refused(db, column, value):
    refused(db, errors.CheckViolation, lambda: add_entry(db, **{column: value}))


def test_player_cannot_be_deleted_while_in_a_squad(db):
    add_entry(db)
    refused(db, errors.ForeignKeyViolation, lambda: db.execute("delete from players where id = 1"))


def test_two_players_with_same_transfermarkt_id_are_refused(db):
    refused(
        db,
        errors.UniqueViolation,
        lambda: db.execute("insert into players (id, name, tm_id) values (2, 'Altcineva', 342229)"),
    )


def test_zero_market_value_is_refused(db):
    refused(db, errors.CheckViolation, lambda: db.execute("insert into market_values values (1, '2026-06-05', 0)"))


def test_same_player_twice_on_same_day_is_refused(db):
    db.execute("insert into market_values values (1, '2026-06-05', 180000000)")
    refused(db, errors.UniqueViolation, lambda: db.execute("insert into market_values values (1, '2026-06-05', 1)"))
