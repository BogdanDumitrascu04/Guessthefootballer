import { el, svg } from './dom.js';
import { rosettePath } from './guilloche.js';
import { askPhone, motionAllowed, tilt } from './motion.js';
import { seatText, tierName } from './text.js';
import { createTicket } from './ticket.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const EASE = 'cubic-bezier(0.22, 0.8, 0.24, 1)';

function createBack() {
    return el('div', { class: 'ticket-back', 'aria-hidden': 'true' },
        el('div', { class: 'ticket-back-body' },
            svg('svg', { viewBox: '-100 -160 200 320' },
                svg('path', { class: 'rosette', d: rosettePath(92) }),
                svg('circle', { class: 'rosette-seal', r: 47 })),
            el('span', { class: 'ticket-back-name' }, 'Guess the', el('br'), 'Footballer')));
}

function animate(element, frames, options) {
    return element.animate(frames, { fill: 'both', easing: EASE, ...options }).finished;
}

async function reveal({ card, front, back, flipper, stamp, texts }) {
    await animate(card, [{ opacity: 0, transform: 'translateY(60px) scale(0.86)' }, { opacity: 1, transform: 'none' }], { duration: 420 });
    await pause(240);
    await animate(flipper, [
        { transform: 'rotateY(0) scale(1)' },
        { transform: 'rotateY(96deg) scale(1.07)', offset: 0.5 },
        { transform: 'rotateY(180deg) scale(1)' },
    ], { duration: 950, easing: 'cubic-bezier(0.45, 0.05, 0.25, 1)' });
    // Once turned, the card lies flat again: a 3D parent would keep the stamp from blending into the metal.
    back.remove();
    front.classList.add('settled');
    flipper.getAnimations().forEach(animation => animation.cancel());
    front.animate([{ '--px': -0.2, '--py': 0.1 }, { '--px': 1.2, '--py': 0.7 }, { '--px': 0.5, '--py': 0.35 }], { duration: 1500, easing: 'ease-in-out' });
    await pause(380);
    stamp.style.visibility = 'visible';
    await animate(stamp, [
        { opacity: 0, scale: 1.9 },
        { opacity: 1, scale: 0.96, offset: 0.7 },
        { opacity: 1, scale: 1 },
    ], { duration: 260, easing: 'cubic-bezier(0.6, 0, 0.9, 0.4)' });
    front.animate([{ translate: '0 0' }, { translate: '0 4px' }, { translate: '0 0' }], { duration: 160 });
    await Promise.all(texts.map(text => animate(text, [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 320 })));
}

async function fly({ dialog, card, front, mini, texts, slot }) {
    slot.scrollIntoView({ block: 'center', behavior: 'instant' });
    const from = card.getBoundingClientRect();
    const to = slot.querySelector('.slot-ticket').getBoundingClientRect();
    const move = [to.left + to.width / 2 - from.left - from.width / 2, to.top + to.height / 2 - from.top - from.height / 2];
    const size = to.width / from.width;
    texts.forEach(text => animate(text, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 }));
    animate(dialog, [{ backgroundColor: getComputedStyle(dialog).backgroundColor }, { backgroundColor: 'rgb(7 10 18 / 0)' }], { duration: 760, easing: 'ease-in' });
    animate(mini, [{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1, offset: 0.4 }, { opacity: 1 }], { duration: 900, easing: 'linear' });
    front.animate([{ '--px': 0.5 }, { '--px': 1.3 }, { '--px': 0.5 }], { duration: 900 });
    await animate(card, [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: `translate(${move[0] * 0.35}px, ${move[1] * 0.35 - 46}px) scale(${0.45 + size * 0.5}) rotate(${move[0] < 0 ? -5 : 5}deg)`, offset: 0.45 },
        { transform: `translate(${move[0]}px, ${move[1]}px) scale(${size}) rotate(0deg)` },
    ], { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' });
}

function openDialog(card, club, options, head, foot) {
    const ticket = tilt(createTicket(card, club, options));
    const mini = el('div', { class: 'win-mini' }, createTicket(card, club, { ...options, compact: true }));
    const front = el('div', { class: 'win-front' }, ticket, mini);
    const flipper = el('div', { class: 'win-flipper' }, front);
    const moving = el('div', { class: 'win-card' }, flipper);
    const dialog = el('dialog', { class: 'win', 'aria-label': card.name }, head, moving, foot);
    document.body.append(dialog);
    dialog.showModal();
    return { dialog, ticket, mini, front, flipper, moving };
}

// At the end of a round. The card is already saved, so closing the window loses nothing.
export async function showWin(card, club, options, { improved, albumUrl }) {
    const title = el('p', { class: 'win-title' }, t(improved ? 'cardImproved' : 'cardNew', { name: card.name }));
    const detail = el('p', { class: 'win-detail' }, `${tierName(card.tier)} · ${seatText(card, club)}`);
    const stay = el('button', { class: 'secondary-button', type: 'button' }, t('cardStay'));
    const go = el('a', { class: 'primary-button', href: albumUrl }, t('cardToAlbum'));
    const actions = el('div', { class: 'win-actions' }, go, stay);
    const { dialog, ticket, front, flipper, moving } = openDialog(card, club, options, el('div', { class: 'win-head' }, title, detail), actions);
    stay.addEventListener('click', () => dialog.close());
    ticket.addEventListener('click', askPhone);
    dialog.addEventListener('close', () => dialog.remove());

    if (motionAllowed()) {
        const texts = [title, detail, actions];
        const stamp = ticket.querySelector('.ticket-stamp');
        const back = el('div', { class: 'win-back' }, createBack());
        flipper.prepend(back);
        texts.forEach(text => { text.style.opacity = 0; });
        stamp.style.visibility = 'hidden';
        await reveal({ card: moving, front, back, flipper, stamp, texts });
    } else {
        front.classList.add('settled');
    }
    go.focus({ preventScroll: true });
}

// In the album: the card arrives from the middle of the screen and takes its place.
export async function landCard(card, club, options, { slot, onPlaced }) {
    if (motionAllowed()) {
        const { dialog, mini, front, moving } = openDialog(card, club, options);
        front.classList.add('settled');
        await pause(500);
        if (dialog.open) await fly({ dialog, card: moving, front, mini, texts: [], slot });
        dialog.close();
        dialog.remove();
    } else {
        slot.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    onPlaced();
}
