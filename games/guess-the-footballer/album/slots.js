import { el, svg } from './dom.js';
import { followPointer } from './motion.js';
import { positionName, tierName } from './text.js';
import { cardLabel, createTicket, themeStyle } from './ticket.js';
import { createEmptyPitch } from './stage.js';

// The outline of a ticket, notches included: what an empty place in a paper album looks like.
const OUTLINE = 'M4,0.5H96a3.5,3.5 0 0 1 3.5,3.5V114.4a3.6,3.6 0 0 0 0,7.2V156a3.5,3.5 0 0 1 -3.5,3.5H4a3.5,3.5 0 0 1 -3.5,-3.5V121.6a3.6,3.6 0 0 0 0,-7.2V4a3.5,3.5 0 0 1 3.5,-3.5Z';

// The name stays hidden: the place tells what kind of player is missing, the game makes you find who.
export function createEmptySlot(card, club) {
    return el('li', { class: 'slot slot-empty', 'data-card': card.id, 'data-tier': card.tier, style: themeStyle(club) },
        el('div', { class: 'slot-ticket' },
            svg('svg', { class: 'slot-outline', viewBox: '0 0 100 160', 'aria-hidden': 'true' }, svg('path', { d: OUTLINE })),
            createEmptyPitch(card.spot),
            el('div', { class: 'slot-text' },
                el('span', { class: 'slot-seat' }, `${t('seat')} ${card.seat}`),
                el('span', { class: 'slot-spot' }, positionName(card.spot)),
                el('span', { class: 'slot-tier' }, el('span', { class: 'swatch' }), ` ${tierName(card.tier)}`))));
}

export function createFilledSlot(card, club, { league, win, onOpen }) {
    const ticket = createTicket(card, club, { league, win, compact: true });
    ticket.removeAttribute('aria-label');
    ticket.setAttribute('aria-hidden', 'true');
    const slot = el('li', { class: 'slot', 'data-card': card.id },
        el('button', { class: 'slot-ticket', type: 'button', 'aria-label': cardLabel(card, club, league, win), onclick: onOpen }, ticket));
    followPointer(ticket, { rotate: false });
    return slot;
}
