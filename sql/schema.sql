-- Database schema (PostgreSQL, Supabase): one table per type of information.
-- Safe to run again: existing tables are left alone.

create table if not exists leagues (
    id      text primary key,     -- football-data.org code: PL, PD, BL1, SA, FL1
    name    text not null,
    tm_code text unique           -- Transfermarkt code: GB1, ES1, L1, IT1, FR1
);

create table if not exists seasons (
    id         text primary key,  -- '2024-25'
    start_date date not null,
    end_date   date not null,
    check (end_date > start_date)
);

create table if not exists clubs (
    id         integer primary key,  -- football-data.org ID
    name       text not null,
    short_name text,
    tla        text,
    crest_url  text
);

-- What stays the same across seasons.
create table if not exists players (
    id              integer primary key,  -- football-data.org ID, never changes
    name            text not null,
    date_of_birth   date,                 -- missing for a few players at the source
    nationality     text,
    photo_url       text,
    tm_id           integer unique,       -- Transfermarkt ID, filled in when players are matched
    api_football_id integer unique
);

-- What changes: one row per player, squad and season.
-- A player can be at two clubs in one season (winter transfer), but not twice in the same squad.
create table if not exists squad_entries (
    player_id    integer  not null references players (id),
    club_id      integer  not null references clubs (id),
    season_id    text     not null references seasons (id),
    league_id    text     not null references leagues (id),
    position     text     check (position in ('Goalkeeper', 'Defender', 'Midfielder', 'Forward')),
    shirt_number smallint check (shirt_number between 1 and 99),
    tier         smallint check (tier between 1 and 3),  -- 1 star, 2 starter, 3 squad
    primary key (player_id, club_id, season_id)
);

-- Game 2. Zero values from the source are not imported.
create table if not exists market_values (
    player_id  integer not null references players (id),
    value_date date    not null,
    value_eur  bigint  not null check (value_eur > 0),
    primary key (player_id, value_date)
);

-- RLS with no policies: nothing can be read or written through the public (browser) key.
-- The scripts connect as the database owner, so they are not affected.
alter table leagues enable row level security;
alter table seasons enable row level security;
alter table clubs enable row level security;
alter table players enable row level security;
alter table squad_entries enable row level security;
alter table market_values enable row level security;
