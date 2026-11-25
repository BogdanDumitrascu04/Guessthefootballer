import { loadClub, loadIndex } from './data.js';
import { showWin } from './win.js';

// After a won round is saved. Nothing is shown when the player already had this card with an equal or better stamp.
export async function showRoundCard(player, team, roundId, isCurrent) {
    const [index, saved, round] = await Promise.all([
        loadIndex(),
        supabaseClient.from('user_cards').select('guesses, guessed_at, wins_count').eq('user_id', currentUser.id).eq('player_id', player.id).single(),
        supabaseClient.from('game_results').select('finished_at').eq('id', roundId).single(),
    ]);
    if (saved.error || round.error) throw saved.error ?? round.error;
    const { guesses, guessed_at, wins_count } = saved.data;
    if (guessed_at !== round.data.finished_at) return; // the stamp belongs to an older round

    const [clubId, club] = Object.entries(index.clubs).find(([, c]) => c.name === team) ?? [];
    const card = club && (await loadClub(clubId)).cards.find(c => c.id === player.id);
    if (!card || !isCurrent()) return; // the next round has already begun
    const league = index.leagues.find(l => l.id === club.league);
    await showWin(card, club, { league, season: index.season, win: { guesses, date: new Date(guessed_at) } }, {
        improved: wins_count > 1,
        albumUrl: `album.html#/${league.id}/${clubId}/${card.id}`,
    });
}
