-- The player of the day: a calendar with one row per day, written ahead, so everyone gets the same hidden player.
-- Runs after reference_data.sql and before game_results.sql, which points to it. Safe to run again.

-- Which day it is, for everyone: Romania's calendar. Not the server's own day (UTC), which changes two or three hours
-- later, and not the phone's, which its owner can set to tomorrow.
-- The moment is a parameter so that midnight and the clock changes can be tested.
create or replace function daily_date(moment timestamptz default now()) returns date
language sql
stable
as $$
    select (moment at time zone 'Europe/Bucharest')::date;
$$;

-- A round of the day can still be finished until 01:00 the next day, so a start at 23:58 is not a lost day.
create or replace function daily_round_open(daily_on date, moment timestamptz default now()) returns boolean
language sql
stable
as $$
    select daily_on >= daily_date(moment - interval '1 hour');
$$;

create table if not exists daily_players (
    day       date    primary key,
    season_id text    not null references seasons (id),
    league_id text    not null references leagues (id),
    player_id integer not null, -- football-data.org ID; no foreign key while players is empty
    unique (season_id, player_id) -- nobody is picked twice in a season
);

-- Rows: a day can be read once it has begun, so for the browser tomorrow's row does not exist.
-- Today's player is readable because the browser compares the guesses; once the server does that, "<=" becomes "<".
alter table daily_players enable row level security;

drop policy if exists "read the days that have begun" on daily_players;
create policy "read the days that have begun" on daily_players for select to anon, authenticated
    using (day <= (select daily_date())); -- in a sub-select it is worked out once per query, not once per row

-- Supabase gives the browser roles every right by default; nobody writes the calendar from a browser.
revoke all on daily_players from anon, authenticated;
grant select on daily_players to anon, authenticated;

-- Today's row and the time left until the next one, so that the page needs neither the phone's clock nor its time zone.
-- security_invoker: the policy above still applies to whoever asks.
create or replace view daily_today with (security_invoker = true) as
select
    day,
    season_id,
    league_id,
    player_id,
    ceil(extract(epoch from (day + 1)::timestamp at time zone 'Europe/Bucharest' - now()))::integer as seconds_left
from daily_players
where day = daily_date();

revoke all on daily_today from anon, authenticated;
grant select on daily_today to anon, authenticated;

-- Plans the days to come; the past and today stay as they are. Run by scripts/plan_daily.py.
-- The order is drawn here and kept only in the table: the repository is public.
create or replace function plan_daily_players(p_season_id text, p_candidates jsonb) returns void
language sql
as $$
    delete from daily_players where day > daily_date();

    with candidates as (
        select league_id, player_id
        from jsonb_to_recordset(p_candidates) as c (league_id text, player_id integer)
        where player_id not in (select player_id from daily_players where season_id = p_season_id)
    ),
    turns as (
        select league_id, player_id, row_number() over (partition by league_id order by random()) as turn
        from candidates
    ),
    -- The first of every league, then the second of every league: each turn has all the leagues, in a random order.
    places as (
        select league_id, player_id, row_number() over (order by turn, random()) as place
        from turns
    ),
    first_day as (
        select greatest(daily_date(), max(day) + 1) as day from daily_players -- an empty calendar (null) starts today
    )
    insert into daily_players (day, season_id, league_id, player_id)
    select first_day.day + place::integer - 1, p_season_id, league_id, player_id
    from places, first_day;
$$;

revoke all on function plan_daily_players from public, anon, authenticated;
