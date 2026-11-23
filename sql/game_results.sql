-- Accounts: one row per round played by a logged-in player. Runs after schema.sql and reference_data.sql.
-- Safe to run again.

-- A round is saved when it starts, so leaving the page cannot hide a loss: a round never finished counts as lost.
create table if not exists game_results (
    id               uuid        primary key default gen_random_uuid(),
    user_id          uuid        not null default auth.uid() references auth.users (id) on delete cascade, -- deleting an account deletes its rounds
    league_id        text        not null references leagues (id),
    season_id        text        not null references seasons (id),
    difficulty       text        not null check (difficulty in ('easy', 'medium', 'hard')),
    max_guesses      smallint    not null check (max_guesses between 1 and 10),
    started_at       timestamptz not null default now(),
    -- Written once, by finish_round().
    finished_at      timestamptz,
    guesses          smallint,
    hints_used       smallint    check (hints_used between 0 and 2), -- two hints exist: team and age
    won              boolean,
    target_player_id integer,    -- football-data.org ID, unknown for 2024-25; no foreign key while players is empty
    round_code       text,       -- encodeRound(), opened by result.html?r=
    -- The rule of roundPoints() in round.js; tests/points_cases.json keeps the two in step.
    points           integer     generated always as (
        case when won then 10
            * case difficulty when 'easy' then 1 when 'medium' then 2 when 'hard' then 4 end
            * greatest(1, max_guesses + 1 - guesses - hints_used)
        else 0 end
    ) stored,
    check (guesses between 1 and max_guesses),
    check (won or guesses = max_guesses), -- a round is lost only after the last guess
    check (finished_at >= started_at),
    -- Only what encodeRound() writes (letters, digits, - and _), because the profile puts it in links.
    -- Real codes stay under 1,500 characters.
    check (round_code ~ '^[A-Za-z0-9_-]+$' and length(round_code) <= 4000),
    -- In progress: no result yet. Finished: the whole result.
    check (
        (finished_at is null and num_nonnulls(guesses, hints_used, won, target_player_id, round_code) = 0)
        or (finished_at is not null and num_nulls(guesses, hints_used, won, round_code) = 0)
    )
);

-- The game's attempt limit (MAX_ATTEMPTS in engine.js), set by the database, not by the browser.
-- Applied on every run: changing it here changes new rounds only; old ones keep the limit they were played with.
alter table game_results alter column max_guesses set default 6;

create index if not exists game_results_user_started on game_results (user_id, started_at); -- the profile reads one player's rounds in order

-- The only way to change a round: once, by its own player, while it is still in progress.
-- Security definer: it runs with the owner's rights, because the browser has no update right on the table.
-- It keeps the search path it was created with, so a look-alike table elsewhere cannot take its place.
create or replace function finish_round(
    p_round_id uuid, p_guesses integer, p_hints_used integer, p_won boolean, p_target_player_id integer, p_round_code text
) returns integer
language plpgsql
security definer
set search_path from current
as $$
declare
    earned integer;
begin
    update game_results
       set finished_at      = now(),
           guesses          = p_guesses,
           hints_used       = p_hints_used,
           won              = p_won,
           target_player_id = p_target_player_id,
           round_code       = p_round_code
     where id = p_round_id
       and user_id = auth.uid()
       and finished_at is null
    returning points into earned;

    if not found then
        raise exception 'No round in progress with this id for this player';
    end if;
    return earned;
end;
$$;

-- Rows: each player sees and starts only their own rounds. No update or delete policy: the history cannot be rewritten.
alter table game_results enable row level security;

drop policy if exists "read own rounds" on game_results;
create policy "read own rounds" on game_results for select to authenticated
    using (user_id = (select auth.uid())); -- in a sub-select it is worked out once per query, not once per row

drop policy if exists "start own rounds" on game_results;
create policy "start own rounds" on game_results for insert to authenticated
    with check (user_id = (select auth.uid()));

-- Columns: Supabase gives the browser roles every right by default; here they keep only what the game needs.
-- A round starts with these three columns; the owner, the limit, the time and the result come from the database.
revoke all on game_results from anon, authenticated;
grant select on game_results to authenticated;
grant insert (league_id, season_id, difficulty) on game_results to authenticated;

revoke all on function finish_round from public, anon;
grant execute on function finish_round to authenticated;
