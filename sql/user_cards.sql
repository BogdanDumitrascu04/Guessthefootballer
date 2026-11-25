-- The album: one row per footballer a user has guessed, worked out from game_results on every read: nothing is
-- stored twice, and a won round is the only way to a card. Runs after game_results.sql; safe to run again.

-- security_invoker: the view reads with the rights of whoever asks, so the policies on game_results still apply
-- and each user sees only their own cards. Without it, the view would read as its owner and show everyone's.
create or replace view user_cards with (security_invoker = true) as
with won_rounds as (
    select
        user_id,
        target_player_id,
        guesses,
        finished_at,
        -- Number 1 is the round on the stamp: the fewest guesses, then the first time that record was reached.
        -- A whole round is chosen, so the guesses and the date always come from the same one; min() on each
        -- column would mix two rounds. The id only breaks ties between equal times.
        row_number() over (card order by guesses, finished_at, id) as place,
        min(finished_at) over card as first_unlocked_at,
        count(*) over card as wins_count
    from game_results
    where won -- leaves out lost rounds (false) and abandoned ones (null)
        and target_player_id is not null -- unknown for 2024-25
    window card as (partition by user_id, target_player_id)
)
select
    user_id,
    target_player_id as player_id,
    guesses,
    finished_at as guessed_at, -- with its time zone: the browser turns it into the user's own day
    first_unlocked_at,
    wins_count::integer as wins_count
from won_rounds
where place = 1;

-- Supabase gives the browser roles every right on a new view; only a signed-in user may read it.
revoke all on user_cards from anon, authenticated;
grant select on user_cards to authenticated;
