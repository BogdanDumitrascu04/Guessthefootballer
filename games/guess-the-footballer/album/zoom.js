import { el } from './dom.js';
import { tilt } from './motion.js';
import { createTicket } from './ticket.js';

export function openCard(card, club, options) {
    const close = el('button', { class: 'zoom-close', type: 'button', 'aria-label': t('close') }, '×');
    const dialog = el('dialog', { class: 'zoom', 'aria-label': card.name }, el('div', { class: 'zoom-card' }, options.lost ? createTicket(card, club, options) : tilt(createTicket(card, club, options))), close);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
}
