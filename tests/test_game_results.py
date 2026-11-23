"""Tests for sql/game_results.sql: who may do what, the points, the rules (need SUPABASE_DB_URL in .env).

A player is simulated the way Supabase does it: the `authenticated` role plus the user ID in the
request claims, which is what auth.uid() reads. Everything happens in a temporary schema, inside a
transaction that is rolled back at the end, test users included.
"""

import json
import os
import re
from uuid import uuid4

import psycopg
import pytest
from dotenv import load_dotenv
from psycopg import errors, sql

from scripts.apply_schema import PROJECT_DIR, apply_schema

load_dotenv(PROJECT_DIR / ".env")
URL = os.environ.get("SUPABASE_DB_URL")

pytestmark = pytest.mark.skipif(not URL, reason="lipsește SUPABASE_DB_URL în .env")

# The same table is checked against roundPoints() in tests/round.test.js.
POINTS_CASES = json.loads((PROJECT_DIR / "tests" / "points_cases.json").read_text(encoding="utf-8"))
ENGINE = (PROJECT_DIR / "games" / "guess-the-footballer" / "engine.js").read_text(encoding="utf-8")
GAME_MAX = int(re.search(r"const MAX_ATTEMPTS = (\d+);", ENGINE).group(1))
BOGDAN, ANDREI = uuid4(), uuid4()
CODE = "WzEsInByZW1pZXItbGVhZ3VlIl0"  # the database stores the code, it never reads it


@pytest.fixture(scope="module")
def conn():
    with psycopg.connect(URL, autocommit=True) as c, c.transaction(force_rollback=True):
        schema = sql.Identifier(f"test_{uuid4().hex[:8]}")
        c.execute(sql.SQL("create schema {}").format(schema))
        c.execute(sql.SQL("set local search_path to {}, pg_temp").format(schema))
        apply_schema(c)
        c.execute(sql.SQL("grant usage on schema {} to anon, authenticated").format(schema))  # public has it already
        for user in (BOGDAN, ANDREI):
            c.execute("insert into auth.users (id, email) values (%s, %s)", [user, f"{user}@example.test"])
        yield c


@pytest.fixture
def db(conn):
    """Each test runs in a savepoint rolled back at the end, role and claims included."""
    with conn.transaction(force_rollback=True):
        yield conn


def as_player(db, user):
    """From here on the connection acts like the browser of `user`; None is a visitor who is not logged in."""
    claims = json.dumps({"sub": str(user), "role": "authenticated"}) if user else ""
    db.execute("set local role authenticated" if user else "set local role anon")
    db.execute("select set_config('request.jwt.claims', %s, true)", [claims])


def as_owner(db):
    db.execute("reset role")


def start(db, league="PL", season="2026-27", difficulty="medium"):
    return db.execute(
        "insert into game_results (league_id, season_id, difficulty) values (%s, %s, %s) returning id",
        [league, season, difficulty],
    ).fetchone()[0]


def finish(db, round_id, guesses=3, hints=0, won=True, target=7, code=CODE):
    return db.execute(
        "select finish_round(%s, %s, %s, %s, %s, %s)", [round_id, guesses, hints, won, target, code]
    ).fetchone()[0]


def refused(db, error, action):
    """The action must be refused by the database with the given error."""
    with pytest.raises(error), db.transaction():
        action()


def test_a_started_round_belongs_to_the_player_and_counts_as_lost(db):
    as_player(db, BOGDAN)
    round_id = start(db)
    row = db.execute(
        "select user_id, started_at is not null, finished_at, points from game_results where id = %s", [round_id]
    ).fetchone()
    assert row == (BOGDAN, True, None, 0)


def test_the_attempt_limit_comes_from_the_database_and_matches_the_game(db):
    as_player(db, BOGDAN)
    round_id = start(db)
    assert db.execute("select max_guesses from game_results where id = %s", [round_id]).fetchone() == (GAME_MAX,)


@pytest.mark.parametrize(
    "case", POINTS_CASES, ids=lambda c: f"{c['difficulty']}-{c['guesses']}-{c['hints']}-{c['won']}"
)
def test_points_follow_the_same_table_as_the_game(db, case):
    assert case["max"] == GAME_MAX, "the limit comes from the database, so every case must use the game's"
    as_player(db, BOGDAN)
    round_id = start(db, difficulty=case["difficulty"])
    assert finish(db, round_id, guesses=case["guesses"], hints=case["hints"], won=case["won"]) == case["points"]
    assert db.execute("select points from game_results where id = %s", [round_id]).fetchone() == (case["points"],)


def test_a_round_cannot_be_finished_twice(db):
    as_player(db, BOGDAN)
    round_id = start(db)
    finish(db, round_id, guesses=6, won=False)
    refused(db, errors.RaiseException, lambda: finish(db, round_id, guesses=1))


def test_other_players_cannot_see_or_finish_my_rounds(db):
    as_player(db, BOGDAN)
    round_id = start(db)
    as_player(db, ANDREI)
    assert db.execute("select count(*) from game_results").fetchone() == (0,)
    refused(db, errors.RaiseException, lambda: finish(db, round_id))


def test_rounds_cannot_be_changed_or_deleted_even_by_their_player(db):
    as_player(db, BOGDAN)
    round_id = start(db)
    finish(db, round_id, guesses=6, won=False)
    refused(db, errors.InsufficientPrivilege, lambda: db.execute("update game_results set won = true"))
    refused(db, errors.InsufficientPrivilege, lambda: db.execute("delete from game_results where id = %s", [round_id]))


@pytest.mark.parametrize(
    "column, value, error",
    [
        ("user_id", ANDREI, errors.InsufficientPrivilege),
        ("max_guesses", 10, errors.InsufficientPrivilege),  # a higher limit would mean more points
        ("started_at", "2020-01-01", errors.InsufficientPrivilege),
        ("finished_at", "2026-11-23", errors.InsufficientPrivilege),
        ("won", True, errors.InsufficientPrivilege),
        ("points", 9999, errors.GeneratedAlways),  # nobody can write a generated column, so this check comes first
    ],
)
def test_the_browser_cannot_choose_the_owner_the_limit_the_time_or_the_result(db, column, value, error):
    as_player(db, BOGDAN)
    query = sql.SQL(
        "insert into game_results (league_id, season_id, difficulty, {}) values ('PL', '2026-27', 'easy', %s)"
    )
    refused(db, error, lambda: db.execute(query.format(sql.Identifier(column)), [value]))


def test_a_visitor_who_is_not_logged_in_can_do_nothing(db):
    as_player(db, BOGDAN)
    round_id = start(db)
    as_player(db, None)
    refused(db, errors.InsufficientPrivilege, lambda: db.execute("select * from game_results"))
    refused(db, errors.InsufficientPrivilege, lambda: start(db))
    refused(db, errors.InsufficientPrivilege, lambda: finish(db, round_id))


@pytest.mark.parametrize("league, season", [("premier-league", "2026-27"), ("PL", "2030-31")])
def test_unknown_league_or_season_is_refused(db, league, season):
    as_player(db, BOGDAN)
    refused(db, errors.ForeignKeyViolation, lambda: start(db, league=league, season=season))


def test_unknown_difficulty_is_refused(db):
    as_player(db, BOGDAN)
    refused(db, errors.CheckViolation, lambda: start(db, difficulty="expert"))


@pytest.mark.parametrize(
    "result",
    [
        {"guesses": 0},
        {"guesses": 7},  # more than the limit of 6
        {"guesses": 3, "won": False},  # lost before the last guess
        {"hints": 3},
        {"code": "x" * 4001},
        {"code": None},  # finished without the code, so the profile could not open it
        {"code": ""},
        {"code": "<script>alert(1)</script>"},  # the profile puts the code in links
    ],
    ids=["no-guess", "over-limit", "lost-early", "three-hints", "huge-code", "no-code", "empty-code", "foreign-text"],
)
def test_impossible_results_are_refused(db, result):
    as_player(db, BOGDAN)
    round_id = start(db)
    refused(db, errors.CheckViolation, lambda: finish(db, round_id, **result))


def test_deleting_an_account_deletes_its_rounds(db):
    as_player(db, BOGDAN)
    finish(db, start(db))
    as_owner(db)
    db.execute("delete from auth.users where id = %s", [BOGDAN])
    assert db.execute("select count(*) from game_results where user_id = %s", [BOGDAN]).fetchone() == (0,)
