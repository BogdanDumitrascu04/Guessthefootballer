import { findCard, loadIndex } from './data.js';
import { tilt } from './motion.js';
import { createTicket } from './ticket.js';
import { openCard } from './zoom.js';
import { el } from './dom.js';

export function preload() {
    loadIndex().catch(() => {}); // asked for again, and reported, when the ticket is needed
}

// Null when the player has no card. The age is the one shown in the round: an old result must not grow older.
export async function createRevealTicket(player, season, { win, lost, compact }) {
    const found = await findCard(player, season);
    if (!found) return null;
    const { card, club, league } = found;
    const shown = { ...card, age: player.age ?? card.age };
    const options = { league, season, win, lost };
    if (!compact) return lost ? createTicket(shown, club, options) : tilt(createTicket(shown, club, options));
    const button = el('button', { class: 'reveal-button', type: 'button' }, createTicket(shown, club, { ...options, compact }));
    button.addEventListener('click', () => openCard(shown, club, options));
    return button;
}
