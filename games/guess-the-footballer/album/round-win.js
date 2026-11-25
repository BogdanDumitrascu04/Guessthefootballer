import { findCard } from './data.js';
import { showWin } from './win.js';

// After a won round is saved. Nothing is shown when the player already had this card with an equal or better stamp.
export async function showRoundCard({ target, season }, roundId, isCurrent) {
    const [found, saved, round] = await Promise.all([
        findCard(target, season),
        supabaseClient.from('user_cards').select('guesses, guessed_at, wins_count').eq('user_id', currentUser.id).eq('player_id', target.id).single(),
        supabaseClient.from('game_results').select('finished_at').eq('id', roundId).single(),
    ]);
    if (saved.error || round.error) throw saved.error ?? round.error;
    const { guesses, guessed_at, wins_count } = saved.data;
    if (guessed_at !== round.data.finished_at) return; // the stamp belongs to an older round
    if (!found || !isCurrent()) return; // the next round has already begun
    const { card, club, clubId, league } = found;
    await showWin(card, club, { league, season, win: { guesses, date: new Date(guessed_at) } }, {
        improved: wins_count > 1,
        albumUrl: `album.html#/${league.id}/${clubId}/${card.id}`,
    });
}
