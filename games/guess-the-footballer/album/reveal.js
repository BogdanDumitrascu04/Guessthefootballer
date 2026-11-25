import { findCard, loadIndex } from './data.js';
import { tilt } from './motion.js';
import { createTicket } from './ticket.js';

export function preload() {
    loadIndex().catch(() => {}); // asked for again, and reported, when the ticket is needed
}

// Null when the player has no card. The age is the one shown in the round: an old result must not grow older.
export async function createRevealTicket(player, season, win) {
    const found = await findCard(player, season);
    if (!found) return null;
    const { card, club, league } = found;
    return tilt(createTicket({ ...card, age: player.age ?? card.age }, club, { league, season, win }));
}
