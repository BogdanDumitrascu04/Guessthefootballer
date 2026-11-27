"""Tests for the player of the day: sql/daily_players.sql (which day it is, the calendar, who may see it),
sql/daily_rounds.sql (one round a day, the streak; both need SUPABASE_DB_URL in .env) and scripts/plan_daily.py.
"""

import re
from datetime import timedelta

import pytest
from psycopg import errors

from scripts.apply_schema import PROJECT_DIR
from scripts.plan_daily import EASY, candidates, plan
from tests.accounts import ANDREI, BOGDAN, CODE, as_owner, as_player, finish, needs_database, refused, start

pytestmark = needs_database

SEASON = "2026-27"
LEAGUES = ["PL", "PD", "BL1", "SA", "FL1"]
TODAYS_PLAYER = 1000


@pytest.fixture
def calendar(db):
    """Ten days behind and ten ahead; the player's ID is 1000 + the number of days from today."""
    db.execute(
        "insert into daily_players (day, season_id, league_id, player_id)"
        " select daily_date() + n, %s, (%s::text[])[1 + (n + 10) %% 5], 1000 + n from generate_series(-10, 10) as n",
        [SEASON, LEAGUES],
    )
    return db


def today(db):
    return db.execute("select daily_date()").fetchone()[0]


# Which day it is.


@pytest.mark.parametrize(
    "moment, day",
    [
        ("2026-12-01 21:59:59+00", "2026-12-01"),  # 23:59:59 in Romania
        ("2026-12-01 22:00:00+00", "2026-12-02"),  # midnight in Romania; still 1 December in UTC and in London
        ("2027-06-01 20:59:59+00", "2027-06-01"),  # summer time: midnight comes an hour earlier in UTC
        ("2027-06-01 21:00:00+00", "2027-06-02"),
        ("2026-12-31 22:00:00+00", "2027-01-01"),
    ],
)
def test_the_day_changes_at_midnight_in_romania(db, moment, day):
    assert db.execute("select daily_date(%s::timestamptz)::text", [moment]).fetchone() == (day,)


@pytest.mark.parametrize(
    "moment, still_open",
    [
        ("2026-12-01 21:58:00+00", True),  # 23:58, its own day
        ("2026-12-01 22:03:00+00", True),  # 00:03 the next day
        ("2026-12-01 22:59:59+00", True),  # 00:59:59
        ("2026-12-01 23:00:00+00", False),  # 01:00
        ("2026-12-02 10:00:00+00", False),
    ],
)
def test_a_round_stays_open_until_one_in_the_morning(db, moment, still_open):
    assert db.execute("select daily_round_open('2026-12-01', %s::timestamptz)", [moment]).fetchone() == (still_open,)


def test_the_countdown_ends_exactly_when_the_day_changes(calendar):
    day, left = calendar.execute("select day, seconds_left from daily_today").fetchone()
    after = "select daily_date(now() + make_interval(secs => %s))"
    assert calendar.execute(after, [left]).fetchone() == (day + timedelta(days=1),)
    assert calendar.execute(after, [left - 1]).fetchone() == (day,)


# Who may see the calendar.


@pytest.mark.parametrize("user", [None, BOGDAN], ids=["visitor", "player"])
def test_the_browser_sees_the_past_and_today_never_tomorrow(calendar, user):
    last_day = today(calendar)
    as_player(calendar, user)
    assert calendar.execute("select count(*), max(day) from daily_players").fetchone() == (11, last_day)
    assert calendar.execute("select * from daily_players where player_id > %s", [TODAYS_PLAYER]).fetchall() == []
    assert calendar.execute("select day, player_id from daily_today").fetchall() == [(last_day, TODAYS_PLAYER)]


@pytest.mark.parametrize("user", [None, BOGDAN], ids=["visitor", "player"])
@pytest.mark.parametrize(
    "action",
    [
        "insert into daily_players values ('2030-01-01', '2026-27', 'PL', 1)",
        "update daily_players set player_id = 1",
        "delete from daily_players",
        "select plan_daily_players('2026-27', '[]')",  # it empties the days to come
    ],
    ids=["insert", "update", "delete", "plan"],
)
def test_the_browser_cannot_change_the_calendar(calendar, user, action):
    as_player(calendar, user)
    refused(calendar, errors.InsufficientPrivilege, lambda: calendar.execute(action))


@pytest.mark.parametrize("role", ["anon", "authenticated"])
def test_the_browser_may_not_even_call_the_planning(db, role):
    query = "select has_function_privilege(%s, 'plan_daily_players(text, jsonb)', 'execute')"
    assert db.execute(query, [role]).fetchone() == (False,)


@pytest.mark.parametrize(
    "day, player",
    [(0, 5), (50, TODAYS_PLAYER)],
    ids=["two-players-one-day", "one-player-two-days"],
)
def test_one_player_a_day_and_one_day_a_player(calendar, day, player):
    query = "insert into daily_players values (daily_date() + %s, %s, 'PL', %s)"
    refused(calendar, errors.UniqueViolation, lambda: calendar.execute(query, [day, SEASON, player]))


def test_a_player_may_return_in_another_season(calendar):
    calendar.execute("insert into daily_players values (daily_date() + 300, '2025-26', 'PL', %s)", [TODAYS_PLAYER])


# Planning the days.


def some_players(ids):
    return [{"league_id": LEAGUES[n % 5], "player_id": n} for n in ids]


def planned(db):
    return db.execute("select day, league_id, player_id from daily_players order by day").fetchall()


def test_a_plan_gives_every_player_one_day_with_no_gaps(db):
    plan(db, SEASON, some_players(range(40)))
    rows = planned(db)
    assert [day for day, _, _ in rows] == [today(db) + timedelta(days=n) for n in range(40)]
    assert sorted(player for _, _, player in rows) == list(range(40))


def test_every_five_days_all_the_leagues_come_up(db):
    plan(db, SEASON, some_players(range(40)))
    leagues = [league for _, league, _ in planned(db)]
    for first in range(0, 40, 5):
        assert sorted(leagues[first : first + 5]) == sorted(LEAGUES)


def test_the_order_is_drawn_again_each_time(db):
    plan(db, SEASON, some_players(range(40)))
    first = planned(db)
    db.execute("delete from daily_players")
    plan(db, SEASON, some_players(range(40)))
    assert planned(db) != first


def test_a_new_plan_keeps_the_past_and_today_and_changes_only_the_days_to_come(calendar):
    before = [row for row in planned(calendar) if row[0] <= today(calendar)]
    # 991-1000 have had their day; 1001-1010 were planned, and of them only 1001-1004 are still in the squads.
    plan(calendar, SEASON, some_players([*range(991, 1005), *range(2000, 2006)]))
    rows = planned(calendar)
    assert rows[:11] == before
    assert sorted(player for _, _, player in rows[11:]) == [1001, 1002, 1003, 1004, *range(2000, 2006)]
    assert rows[11][0] == today(calendar) + timedelta(days=1)


def test_a_plan_after_the_calendar_ran_out_starts_today_not_in_the_past(db):
    db.execute("insert into daily_players values (daily_date() - 3, %s, 'PL', 1)", [SEASON])
    plan(db, SEASON, some_players(range(1, 6)))  # player 1 has had his day
    assert [day for day, _, _ in planned(db)[1:]] == [today(db) + timedelta(days=n) for n in range(4)]


def test_a_plan_with_nobody_left_leaves_the_calendar_without_days_to_come(calendar):
    plan(calendar, SEASON, some_players(range(990, 1001)))
    assert calendar.execute("select max(day) from daily_players").fetchone() == (today(calendar),)


def test_a_player_in_an_unknown_league_is_refused(db):
    unknown = [{"league_id": "premier-league", "player_id": 1}]
    refused(db, errors.ForeignKeyViolation, lambda: plan(db, SEASON, unknown))


def test_the_stars_of_the_season_fill_the_calendar(db):
    stars = candidates(SEASON)
    assert {s["league_id"] for s in stars} == set(LEAGUES)
    plan(db, SEASON, stars)
    assert len(planned(db)) == len(stars)


def test_the_calendar_takes_the_players_of_the_easy_rounds():
    engine = (PROJECT_DIR / "games" / "guess-the-footballer" / "engine.js").read_text(encoding="utf-8")
    assert re.search(r"dailyMode \? '(\w+)'", engine).group(1) == EASY
    assert "p.level === difficulty" in engine


# The round of the day.


def start_daily(db):
    return db.execute("select round_id, league_id, player_id, finished_at from start_daily_round()").fetchone()


def test_the_round_of_the_day_takes_everything_from_the_calendar(calendar):
    day = today(calendar)
    as_player(calendar, BOGDAN)
    round_id, league, player, finished_at = start_daily(calendar)
    assert (league, player, finished_at) == ("PL", TODAYS_PLAYER, None)
    row = calendar.execute(
        "select user_id, daily_on, league_id, season_id, difficulty from game_results where id = %s", [round_id]
    ).fetchone()
    assert row == (BOGDAN, day, "PL", SEASON, "easy")


def test_a_second_start_on_the_same_day_gives_back_the_same_round(calendar):
    as_player(calendar, BOGDAN)
    first = start_daily(calendar)
    assert start_daily(calendar) == first
    assert calendar.execute("select count(*) from game_results").fetchone() == (1,)


def test_a_finished_round_of_the_day_cannot_be_played_again(calendar):
    as_player(calendar, BOGDAN)
    round_id, *_ = start_daily(calendar)
    finish(calendar, round_id, guesses=6, won=False)
    again, _, _, finished_at = start_daily(calendar)
    assert again == round_id and finished_at is not None
    refused(calendar, errors.RaiseException, lambda: finish(calendar, again, guesses=1))


def test_every_player_has_their_own_round_on_the_same_hidden_player(calendar):
    as_player(calendar, BOGDAN)
    mine = start_daily(calendar)
    as_player(calendar, ANDREI)
    his = start_daily(calendar)
    assert mine[0] != his[0] and mine[2] == his[2] == TODAYS_PLAYER


def test_the_browser_cannot_choose_the_day_of_a_round(calendar):
    yesterday = today(calendar) - timedelta(days=1)
    as_player(calendar, BOGDAN)
    query = "insert into game_results (league_id, season_id, difficulty, daily_on) values ('PL', '2026-27', 'easy', %s)"
    refused(calendar, errors.InsufficientPrivilege, lambda: calendar.execute(query, [yesterday]))


def test_a_second_round_on_the_same_day_is_refused_even_to_the_owner(calendar):
    as_player(calendar, BOGDAN)
    start_daily(calendar)
    as_owner(calendar)
    query = (
        "insert into game_results (user_id, league_id, season_id, difficulty, daily_on)"
        " values (%s, 'PL', '2026-27', 'easy', daily_date())"
    )
    refused(calendar, errors.UniqueViolation, lambda: calendar.execute(query, [BOGDAN]))


def test_other_rounds_are_not_limited(calendar):
    as_player(calendar, BOGDAN)
    start_daily(calendar)
    start(calendar)
    start(calendar)
    assert calendar.execute("select count(*) from game_results").fetchone() == (3,)


def test_a_visitor_cannot_start_a_round_of_the_day(calendar):
    as_player(calendar, None)
    refused(calendar, errors.InsufficientPrivilege, lambda: start_daily(calendar))


def test_without_a_player_today_there_is_no_round(db):
    as_player(db, BOGDAN)
    assert start_daily(db) is None
    assert db.execute("select count(*) from game_results").fetchone() == (0,)


def test_the_calendar_says_who_the_player_was_not_the_browser(calendar):
    as_player(calendar, BOGDAN)
    round_id, *_ = start_daily(calendar)
    assert finish(calendar, round_id, guesses=3, target=99) == 40  # Easy, at the 3rd guess
    assert calendar.execute("select player_id from user_cards").fetchall() == [(TODAYS_PLAYER,)]


def test_other_rounds_still_say_their_own_player(calendar):
    as_player(calendar, BOGDAN)
    finish(calendar, start(calendar), target=99)
    assert calendar.execute("select player_id from user_cards").fetchall() == [(99,)]


def add_day(db, user, days_ago, outcome):
    """A round of the day, written straight as the owner, who can choose the day:
    W won, L lost, A started and never finished."""
    as_owner(db)
    result = [None] * 4 if outcome == "A" else [3 if outcome == "W" else 6, 0, outcome == "W", CODE]
    db.execute(
        "insert into game_results (user_id, league_id, season_id, difficulty, daily_on, started_at, finished_at,"
        " guesses, hints_used, won, round_code)"
        " select %s, 'PL', '2026-27', 'easy', daily_date() - %s, at, case when %s <> 'A' then at end, %s, %s, %s, %s"
        " from (select now() - make_interval(days => %s) as at) as moment",
        [user, days_ago, outcome, *result, days_ago],
    )


def test_a_round_from_two_days_ago_can_no_longer_be_finished(calendar):
    add_day(calendar, BOGDAN, 2, "A")
    as_player(calendar, BOGDAN)
    [(round_id,)] = calendar.execute("select id from game_results").fetchall()
    refused(calendar, errors.RaiseException, lambda: finish(calendar, round_id))


# The streak.


def daily_stats(db, user):
    as_player(db, user)
    return db.execute("select days_played, days_won, current_streak, best_streak from daily_stats").fetchone()


def add_days(db, user, outcomes):
    """One letter per day, today last; a dot is a day without a round."""
    for days_ago, outcome in enumerate(reversed(outcomes)):
        if outcome != ".":
            add_day(db, user, days_ago, outcome)


@pytest.mark.parametrize(
    "outcomes, current, best",
    [
        ("W", 1, 1),
        ("WWW", 3, 3),
        ("WWLWW", 2, 2),
        ("WWW.W", 1, 3),  # a skipped day breaks it
        ("WW.WWW.W", 1, 3),
        ("WWW.", 3, 3),  # today is still to play
        ("WWWA", 3, 3),  # today is in progress
        ("WWWL", 0, 3),  # today is lost
        ("WWW..", 0, 3),  # yesterday was skipped
        ("WWA.", 0, 2),  # yesterday was never finished
        ("L", 0, 0),
        ("A", 0, 0),
    ],
)
def test_the_streak_counts_days_won_in_a_row(calendar, outcomes, current, best):
    add_days(calendar, BOGDAN, outcomes)
    played, won = len(outcomes.replace(".", "")), outcomes.count("W")
    assert daily_stats(calendar, BOGDAN) == (played, won, current, best)


def test_other_rounds_do_not_touch_the_streak_of_days(calendar):
    add_days(calendar, BOGDAN, "WW")
    as_player(calendar, BOGDAN)
    finish(calendar, start(calendar), guesses=6, won=False)
    assert daily_stats(calendar, BOGDAN) == (2, 2, 2, 2)


def test_a_player_without_a_round_of_the_day_has_no_row(calendar):
    as_player(calendar, BOGDAN)
    finish(calendar, start(calendar))
    assert daily_stats(calendar, BOGDAN) is None


def test_players_see_only_their_own_streak(calendar):
    add_days(calendar, BOGDAN, "WWW")
    add_days(calendar, ANDREI, "LW")
    as_player(calendar, ANDREI)
    assert calendar.execute("select user_id, current_streak from daily_stats").fetchall() == [(ANDREI, 1)]


def test_a_visitor_cannot_read_streaks(calendar):
    add_days(calendar, BOGDAN, "W")
    as_player(calendar, None)
    refused(calendar, errors.InsufficientPrivilege, lambda: calendar.execute("select * from daily_stats"))


def test_rounds_of_the_day_also_count_in_the_profile(calendar):
    add_days(calendar, BOGDAN, "WL")
    as_player(calendar, BOGDAN)
    assert calendar.execute("select total_points, rounds_played, rounds_won from player_stats").fetchone() == (40, 2, 1)
