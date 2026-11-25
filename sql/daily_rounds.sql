-- The round of the day in the player's account: starting it, and the streak. Runs after game_results.sql; safe to run again.

-- Starts today's round, or gives back the one already started: a second tab, a reload or a second press get the same row.
-- Security definer, because the browser has no right to write daily_on. No parameters: a player who could choose the
-- day could go back and repair a broken streak.
create or replace function start_daily_round()
returns table (round_id uuid, day date, season_id text, league_id text, player_id integer, finished_at timestamptz)
language sql
security definer
set search_path from current
as $$
    insert into game_results (user_id, daily_on, season_id, league_id, difficulty)
    select auth.uid(), day, season_id, league_id, 'easy'
    from daily_players
    where day = daily_date()
    on conflict (user_id, daily_on) do nothing;

    select r.id, d.day, d.season_id, d.league_id, d.player_id, r.finished_at
    from daily_players d
    join game_results r on r.daily_on = d.day
    where d.day = daily_date()
        and r.user_id = auth.uid();
$$;

revoke all on function start_daily_round from public, anon;
grant execute on function start_daily_round to authenticated;

-- The streak of days: won days in a row. A day lost, skipped or left unfinished breaks it.
-- One row per player who has played a round of the day; the page shows zeros for anyone else.
-- security_invoker: the policies on game_results still apply, so each player sees only their own row.
create or replace view daily_stats with (security_invoker = true) as
with days_won as (
    select
        user_id,
        daily_on,
        -- The day minus its place in line: days in a row all give the same date, and a gap starts a new group.
        daily_on - (row_number() over (partition by user_id order by daily_on))::integer as streak_group
    from game_results
    where daily_on is not null
        and won
),
streaks as (
    select user_id, count(*) as days, max(daily_on) as last_day
    from days_won
    group by user_id, streak_group
),
best as (
    select
        user_id,
        max(days) as best_streak,
        max(days) filter (where last_day >= daily_date() - 1) as latest_streak -- today may still be to play
    from streaks
    group by user_id
),
played as (
    select
        user_id,
        count(*) as days_played,
        count(*) filter (where won) as days_won,
        bool_or(daily_on = daily_date() and not won) as lost_today -- a round still in progress (null) is not lost yet
    from game_results
    where daily_on is not null
    group by user_id
)
select
    user_id,
    days_played::integer,
    days_won::integer,
    (case when lost_today then 0 else coalesce(latest_streak, 0) end)::integer as current_streak,
    coalesce(best_streak, 0)::integer as best_streak
from played
left join best using (user_id);

revoke all on daily_stats from anon, authenticated;
grant select on daily_stats to authenticated;
