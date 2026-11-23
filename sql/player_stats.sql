-- Profile numbers, one row per player, worked out from game_results on every read: nothing is stored twice.
-- A player with no rounds has no row; the profile then shows zeros. Runs after game_results.sql; safe to run again.

-- security_invoker: the view reads with the rights of whoever asks, so the policies on game_results still apply
-- and each player sees only their own row. Without it, the view would read as its owner and show everyone.
create or replace view player_stats with (security_invoker = true) as
with rounds_in_groups as (
    select
        user_id,
        won,
        points,
        -- A running count of the rounds not won (lost or abandoned): each one starts a new group,
        -- so the wins inside one group are one streak. The id only breaks ties between equal start times.
        sum(case when won then 0 else 1 end) over (partition by user_id order by started_at, id) as streak_group
    from game_results
),
streaks as (
    select
        user_id,
        streak_group,
        count(*) as rounds,
        count(*) filter (where won) as wins,
        sum(points) as points,
        streak_group = max(streak_group) over (partition by user_id) as is_latest
    from rounds_in_groups
    group by user_id, streak_group
)
select
    user_id,
    sum(points)::integer as total_points,
    sum(rounds)::integer as rounds_played,
    sum(wins)::integer as rounds_won,
    -- 100.0, not 100: whole numbers divide into whole numbers (1 / 3 = 0). Never zero rounds: no rounds, no row.
    round(100.0 * sum(wins) / sum(rounds))::integer as win_percent,
    (max(wins) filter (where is_latest))::integer as current_streak,
    max(wins)::integer as best_streak
from streaks
group by user_id;

-- Supabase gives the browser roles every right on a new view; only a signed-in player may read it.
revoke all on player_stats from anon, authenticated;
grant select on player_stats to authenticated;
