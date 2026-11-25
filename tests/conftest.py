"""The database the account tests run in: a temporary schema, rolled back at the end, test users included."""

from uuid import uuid4

import psycopg
import pytest
from psycopg import sql

from scripts.apply_schema import apply_schema
from tests.accounts import ANDREI, BOGDAN, URL


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
