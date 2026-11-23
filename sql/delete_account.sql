-- "Delete account" on the profile page. Runs after game_results.sql; safe to run again.

-- Removes the signed-in player from Supabase Auth; their rounds go with them through the foreign key's
-- "on delete cascade" in game_results. Security definer: only the owner may delete from auth.users, and the
-- function has no parameter, so a player can only ever delete themselves.
create or replace function delete_my_account() returns void
language sql
security definer
set search_path from current
as $$
    delete from auth.users where id = auth.uid();
$$;

revoke all on function delete_my_account from public, anon;
grant execute on function delete_my_account to authenticated;
