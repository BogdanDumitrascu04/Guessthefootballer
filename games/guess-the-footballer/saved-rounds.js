// Rounds in the player's account (sql/game_results.sql): a row when the round starts, the result once it ends.
// A round that is started and never finished stays in the account as lost.

// The game's league names, the football-data.org codes the database uses, and the names shown on the profile.
const LEAGUES = [
    { slug: 'premier-league', code: 'PL', name: 'Premier League' },
    { slug: 'la-liga', code: 'PD', name: 'La Liga' },
    { slug: 'bundesliga', code: 'BL1', name: 'Bundesliga' },
    { slug: 'serie-a', code: 'SA', name: 'Serie A' },
    { slug: 'ligue-1', code: 'FL1', name: 'Ligue 1' },
];

// Resolves to the round's ID, or null when nobody is signed in: a round begun before signing in has no honest start.
async function saveRoundStart({ league, season, difficulty }) {
    await accountReady;
    const code = LEAGUES.find(l => l.slug === league)?.code;
    if (!currentUser || !code) return null;
    const { data, error } = await supabaseClient
        .from('game_results')
        .insert({ league_id: code, season_id: season, difficulty })
        .select('id')
        .single();
    if (error) throw error;
    return data.id;
}

// The database works out the points itself; a different number here means the two formulas have drifted apart.
async function saveRoundEnd(roundId, round) {
    const { data: points, error } = await supabaseClient.rpc('finish_round', {
        p_round_id: roundId,
        p_guesses: round.guesses.length,
        p_hints_used: round.hints.length,
        p_won: isWon(round),
        p_target_player_id: round.target.id,
        p_round_code: encodeRound(round),
    });
    if (error) throw error;
    if (points !== roundPoints(round)) console.warn(`Points differ: database ${points}, game ${roundPoints(round)}`);
    return points;
}

const NO_STATS = { total_points: 0, rounds_played: 0, rounds_won: 0, win_percent: 0, current_streak: 0, best_streak: 0 };

// The player_stats view (sql/player_stats.sql) has no row for a player who has not played yet: that is all zeros.
async function loadPlayerStats() {
    const { data, error } = await supabaseClient
        .from('player_stats')
        .select(Object.keys(NO_STATS).join(', '))
        .eq('user_id', currentUser.id)
        .maybeSingle();
    if (error) throw error;
    return data ?? NO_STATS;
}

const NO_DAILY_STATS = { days_played: 0, days_won: 0, current_streak: 0, best_streak: 0 };

// The daily_stats view (sql/daily_rounds.sql) has no row for a player who has never played the round of the day.
async function loadDailyStats() {
    const { data, error } = await supabaseClient
        .from('daily_stats')
        .select(Object.keys(NO_DAILY_STATS).join(', '))
        .eq('user_id', currentUser.id)
        .maybeSingle();
    if (error) throw error;
    return data ?? NO_DAILY_STATS;
}

// Newest first. The policies already keep other players' rounds out; the filter lets the index do the work.
async function loadRoundHistory(limit = 100) {
    const { data, error } = await supabaseClient
        .from('game_results')
        .select('id, league_id, season_id, difficulty, max_guesses, started_at, finished_at, guesses, won, points, round_code, daily_on')
        .eq('user_id', currentUser.id)
        .order('started_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}
