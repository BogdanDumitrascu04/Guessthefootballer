-- The rows other tables point to. Safe to run again: existing rows are left alone.

-- football-data.org codes; the game's own league names (premier-league…) are mapped to them in the browser.
insert into leagues (id, name, tm_code) values
    ('PL',  'Premier League', 'GB1'),
    ('PD',  'La Liga',        'ES1'),
    ('BL1', 'Bundesliga',     'L1'),
    ('SA',  'Serie A',        'IT1'),
    ('FL1', 'Ligue 1',        'FR1')
on conflict (id) do nothing;

-- July to June: the usual window of a European season.
insert into seasons (id, start_date, end_date) values
    ('2024-25', '2024-07-01', '2025-06-30'),
    ('2025-26', '2025-07-01', '2026-06-30'),
    ('2026-27', '2026-07-01', '2027-06-30')
on conflict (id) do nothing;
