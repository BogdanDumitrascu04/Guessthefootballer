"""Tests for sql/game_results.sql, sql/player_stats.sql, sql/user_cards.sql and sql/delete_account.sql: who may do
what, the points, the rules, the profile numbers, the album, deleting an account (need SUPABASE_DB_URL in .env).
"""

import json
import re
from datetime import UTC, datetime, timedelta

import pytest
from psycopg import errors, sql

from scripts.apply_schema import PROJECT_DIR
from tests.accounts import ANDREI, BOGDAN, CODE, as_owner, as_player, finish, needs_database, refused, start

pytestmark = needs_database

# The same table is checked against roundPoints() in tests/round.test.js.
POINTS_CASES = json.loads((PROJECT_DIR / "tests" / "points_cases.json").read_text(encoding="utf-8"))
ENGINE = (PROJECT_DIR / "games" / "guess-the-footballer" / "engine.js").read_text(encoding="utf-8")
GAME_MAX = int(re.search(r"const MAX_ATTEMPTS = (\d+);", ENGINE).group(1))


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


# player_stats: the profile numbers.

START = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)
STATS_COLUMNS = "total_points, rounds_played, rounds_won, win_percent, current_streak, best_streak"


def add_rounds(db, user, outcomes, first_minute=0):
    """Rounds one minute apart, written straight as the owner: W won at the 3rd guess (80 points on Medium),
    L lost, A abandoned (started and never finished)."""
    as_owner(db)
    for minute, outcome in enumerate(outcomes, start=first_minute):
        started = START + timedelta(minutes=minute)
        if outcome == "A":
            result = [None] * 5
        else:
            won = outcome == "W"
            result = [started + timedelta(seconds=30), 3 if won else 6, 0, won, CODE]
        db.execute(
            "insert into game_results (user_id, league_id, season_id, difficulty, started_at,"
            " finished_at, guesses, hints_used, won, round_code) values (%s, 'PL', '2026-27', 'medium', %s, %s, %s, %s, %s, %s)",
            [user, started, *result],
        )


def stats(db, user):
    as_player(db, user)
    return db.execute(f"select {STATS_COLUMNS} from player_stats").fetchone()


def test_stats_count_every_round_and_abandoned_ones_are_losses(db):
    add_rounds(db, BOGDAN, "WLAW")
    # 160 points, 4 played, 2 won, 50%, current streak 1, best 1
    assert stats(db, BOGDAN) == (160, 4, 2, 50, 1, 1)


@pytest.mark.parametrize(
    "outcomes, current, best",
    [
        ("WWLWWWAWW", 2, 3),  # the example from the concept: three islands of wins, 2, 3 and 2
        ("WWW", 3, 3),
        ("WWL", 0, 2),  # the last round was lost, so there is no current streak
        ("WWA", 0, 2),  # an abandoned round breaks it the same way
        ("A", 0, 0),
    ],
)
def test_streaks_are_islands_of_wins(db, outcomes, current, best):
    add_rounds(db, BOGDAN, outcomes)
    assert stats(db, BOGDAN)[4:] == (current, best)


def test_streaks_follow_the_start_time_not_the_order_of_saving(db):
    add_rounds(db, BOGDAN, "W", first_minute=2)  # saved first, played last
    add_rounds(db, BOGDAN, "L", first_minute=1)
    assert stats(db, BOGDAN)[4:] == (1, 1)


@pytest.mark.parametrize("outcomes, percent", [("WLL", 33), ("WWL", 67), ("L", 0), ("W", 100)])
def test_win_percent_is_rounded_not_cut_to_zero(db, outcomes, percent):
    add_rounds(db, BOGDAN, outcomes)
    assert stats(db, BOGDAN)[3] == percent


def test_a_player_without_rounds_has_no_row(db):
    add_rounds(db, BOGDAN, "W")
    assert stats(db, ANDREI) is None  # the profile shows zeros


def test_players_see_only_their_own_stats(db):
    add_rounds(db, BOGDAN, "WWW")
    add_rounds(db, ANDREI, "L")
    as_player(db, ANDREI)
    assert db.execute(f"select user_id, {STATS_COLUMNS} from player_stats").fetchall() == [(ANDREI, 0, 1, 0, 0, 0, 0)]


def test_a_visitor_who_is_not_logged_in_cannot_read_stats(db):
    add_rounds(db, BOGDAN, "W")
    as_player(db, None)
    refused(db, errors.InsufficientPrivilege, lambda: db.execute("select * from player_stats"))


# user_cards: the album.

SAKA, RICE, GYOKERES = 99813, 8215, 8279  # football-data.org IDs
CARD_COLUMNS = "player_id, guesses, guessed_at, first_unlocked_at, wins_count"


def november(day):
    return datetime(2026, 11, day, 21, 30, tzinfo=UTC)


def add_round(db, user, player, day, guesses=3, won=True):
    """A round finished on a day of November, written straight as the owner, who can choose the time."""
    as_owner(db)
    db.execute(
        "insert into game_results (user_id, league_id, season_id, difficulty, started_at, finished_at, guesses,"
        " hints_used, won, target_player_id, round_code) values (%s, 'PL', '2026-27', 'medium', %s, %s, %s, 0, %s, %s, %s)",
        [user, november(day) - timedelta(minutes=2), november(day), guesses, won, player, CODE],
    )


def cards(db, user):
    as_player(db, user)
    return db.execute(f"select {CARD_COLUMNS} from user_cards order by player_id").fetchall()


def test_a_guessed_player_is_one_card_with_that_rounds_guesses_and_time(db):
    add_round(db, BOGDAN, SAKA, day=10, guesses=5)
    add_round(db, BOGDAN, RICE, day=12, guesses=1)
    assert cards(db, BOGDAN) == [
        (RICE, 1, november(12), november(12), 1),
        (SAKA, 5, november(10), november(10), 1),
    ]


def test_a_better_round_improves_the_card_and_brings_its_own_date(db):
    add_round(db, BOGDAN, SAKA, day=10, guesses=5)
    add_round(db, BOGDAN, SAKA, day=25, guesses=2)
    # "Guessed in 2 on 10 Nov" never happened: the stamp is one round, not the best of each column.
    assert cards(db, BOGDAN) == [(SAKA, 2, november(25), november(10), 2)]


def test_a_worse_round_later_does_not_spoil_the_card(db):
    add_round(db, BOGDAN, SAKA, day=10, guesses=2)
    add_round(db, BOGDAN, SAKA, day=25, guesses=5)
    assert cards(db, BOGDAN) == [(SAKA, 2, november(10), november(10), 2)]


def test_an_equal_round_later_keeps_the_first_date(db):
    # Saved first, played last: the date decides, not the order of saving.
    add_round(db, BOGDAN, SAKA, day=25, guesses=2)
    add_round(db, BOGDAN, SAKA, day=10, guesses=2)
    assert cards(db, BOGDAN) == [(SAKA, 2, november(10), november(10), 2)]


def test_two_equal_wins_at_the_same_moment_are_still_one_card(db):
    add_round(db, BOGDAN, SAKA, day=10, guesses=2)
    add_round(db, BOGDAN, SAKA, day=10, guesses=2)
    assert cards(db, BOGDAN) == [(SAKA, 2, november(10), november(10), 2)]


def test_a_round_played_through_the_game_gives_its_card(db):
    as_player(db, BOGDAN)
    finish(db, start(db), guesses=3, hints=1, target=SAKA)
    [(player, guesses, _, _, wins)] = cards(db, BOGDAN)
    assert (player, guesses, wins) == (SAKA, 3, 1)


def test_lost_abandoned_and_unidentified_rounds_give_no_card(db):
    add_round(db, BOGDAN, SAKA, day=10, guesses=6, won=False)
    add_round(db, BOGDAN, None, day=11)  # 2024-25: the player has no ID
    as_player(db, BOGDAN)
    start(db)  # never finished
    assert cards(db, BOGDAN) == []


def test_lost_rounds_do_not_touch_a_card_already_won(db):
    add_round(db, BOGDAN, GYOKERES, day=8, guesses=6, won=False)
    add_round(db, BOGDAN, GYOKERES, day=9, guesses=6)
    add_round(db, BOGDAN, GYOKERES, day=20, guesses=6, won=False)
    assert cards(db, BOGDAN) == [(GYOKERES, 6, november(9), november(9), 1)]


def test_two_users_who_guess_the_same_player_have_a_card_each(db):
    add_round(db, BOGDAN, SAKA, day=10, guesses=5)
    add_round(db, ANDREI, SAKA, day=11, guesses=2)
    as_owner(db)  # the owner is above the policies, so here only the view itself keeps the two apart
    rows = db.execute("select user_id, player_id, guesses from user_cards order by guesses").fetchall()
    assert rows == [(ANDREI, SAKA, 2), (BOGDAN, SAKA, 5)]


def test_users_see_only_their_own_cards(db):
    add_round(db, BOGDAN, SAKA, day=10)
    add_round(db, ANDREI, RICE, day=11)
    as_player(db, ANDREI)
    assert db.execute("select user_id, player_id from user_cards").fetchall() == [(ANDREI, RICE)]


def test_a_visitor_who_is_not_logged_in_cannot_read_cards(db):
    add_round(db, BOGDAN, SAKA, day=10)
    as_player(db, None)
    refused(db, errors.InsufficientPrivilege, lambda: db.execute("select * from user_cards"))


@pytest.mark.parametrize(
    "action",
    [
        "insert into user_cards (user_id, player_id, guesses) values (auth.uid(), 1, 1)",
        "update user_cards set guesses = 1",
        "delete from user_cards",
    ],
    ids=["insert", "update", "delete"],
)
def test_a_card_cannot_be_written_only_won(db, action):
    add_round(db, BOGDAN, SAKA, day=10)
    as_player(db, BOGDAN)
    # Not a question of rights: a view worked out from several rounds has no row to write to.
    refused(db, errors.ObjectNotInPrerequisiteState, lambda: db.execute(action))


# delete_my_account: the "Delete account" button.


def test_a_player_can_delete_their_own_account_and_rounds(db):
    add_rounds(db, BOGDAN, "WLA")
    add_rounds(db, ANDREI, "W")
    as_player(db, BOGDAN)
    db.execute("select delete_my_account()")
    as_owner(db)
    assert db.execute("select count(*) from auth.users where id = %s", [BOGDAN]).fetchone() == (0,)
    rounds_left = db.execute("select user_id, count(*) from game_results group by user_id").fetchall()
    assert rounds_left == [(ANDREI, 1)]  # Andrei's account and round are untouched


def test_a_visitor_who_is_not_logged_in_cannot_delete_accounts(db):
    as_player(db, None)
    refused(db, errors.InsufficientPrivilege, lambda: db.execute("select delete_my_account()"))
