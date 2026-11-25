"""Shared by the database tests: acting like the browser of a player, and the rounds a player may start and finish.

A player is simulated the way Supabase does it: the `authenticated` role plus the user ID in the request claims,
which is what auth.uid() reads.
"""

import json
import os
from uuid import uuid4

import pytest
from dotenv import load_dotenv

from scripts.apply_schema import PROJECT_DIR

load_dotenv(PROJECT_DIR / ".env")
URL = os.environ.get("SUPABASE_DB_URL")
needs_database = pytest.mark.skipif(not URL, reason="lipsește SUPABASE_DB_URL în .env")

BOGDAN, ANDREI = uuid4(), uuid4()
CODE = "WzEsInByZW1pZXItbGVhZ3VlIl0"  # the database stores the code, it never reads it


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
