import { clubTheme } from './colors.js';
import { el } from './dom.js';
import { guillocheMask } from './guilloche.js';
import { createBackdrop, createGrass, createLight, pitchMask } from './stage.js';
import { createStamp, stampAngle } from './stamp.js';
import { countryName, positionName, seatText, shortDate, tierName } from './text.js';

const root = document.documentElement;
root.style.setProperty('--pitch-lines', pitchMask(1.5, true));
root.style.setProperty('--pitch-lines-compact', pitchMask(3.2, false));
root.style.setProperty('--guilloche', guillocheMask(320, 242));

export function splitName(name) {
    const space = name.indexOf(' ');
    return space < 0 ? ['', name] : [name.slice(0, space), name.slice(space + 1)];
}

const ONE_LINE = 12; // longer names would drop under 12 px on a phone-sized album card

// Two lines as even as possible, broken only where the name already has a space or a hyphen.
function compactLines(last) {
    const breaks = [...last.matchAll(/[ -]/g)].map(match => match.index + 1);
    if (last.length <= ONE_LINE || breaks.length === 0) return [last];
    const uneven = at => Math.max(at, last.length - at);
    const at = breaks.reduce((best, i) => (uneven(i) < uneven(best) ? i : best));
    return [last.slice(0, at).trimEnd(), last.slice(at)];
}

// In this font a capital Ø takes more room than it fills, which leaves a hole inside the name.
export function bigName(text) {
    return text.split(/([øØ])/).map(part => (/^[øØ]$/.test(part) ? el('span', { class: 'o-slash' }, part) : part));
}

export function cardLabel(card, club, league, win) {
    return [
        card.name, club.name, league.name, positionName(card.spot), countryName(card.country),
        `${t('age')}: ${card.age}`, tierName(card.tier),
        win && t('cardGuessed', { n: win.guesses, date: shortDate(win.date) }),
        seatText(card, club),
    ].filter(Boolean).join('. ');
}

export function themeStyle(club) {
    const theme = clubTheme(club.colors);
    return { '--field': theme.field, '--trim': theme.trim, '--accent-club': theme.accent, '--on-field': theme.ink, '--stage': theme.stage };
}

function fact(label, value) {
    return el('div', { class: 'fact' }, el('dt', {}, label), el('dd', {}, value));
}

function createStage(card, club, compact) {
    return el('div', { class: 'ticket-stage' },
        !compact && createBackdrop(card, clubTheme(club.colors)),
        createGrass(compact),
        el('div', { class: 'ticket-lines' }),
        createLight(card, compact));
}

export function createTicket(card, club, { league, season, win, compact = false }) {
    const [first, last] = splitName(card.name);
    const lines = compact ? compactLines(last) : [last];
    const ticket = el('article', {
        class: compact ? 'ticket compact' : 'ticket',
        'data-tier': card.tier,
        'aria-label': cardLabel(card, club, league, win),
        style: { ...themeStyle(club), '--len': Math.max(...lines.map(line => line.length), 4), '--facts': positionName(card.spot).length + countryName(card.country).length + 2, '--stamp-angle': `${stampAngle(card.id)}deg` },
    });
    const name = el('p', { class: 'ticket-name' },
        first && el('span', { class: 'ticket-first' }, first),
        el('span', { class: lines.length > 1 ? 'ticket-last two-lines' : 'ticket-last' }, lines.map((line, i) => [i > 0 && el('br'), bigName(line)])));
    const body = el('div', { class: 'ticket-body' },
        el('div', { class: 'ticket-metal' }),
        !compact && el('div', { class: 'ticket-print' }),
        createStage(card, club, compact),
        el('div', { class: 'ticket-band' },
            el('span', { class: 'ticket-code' }, club.code),
            !compact && el('span', { class: 'ticket-club' }, club.name)));

    if (compact) {
        body.append(
            el('div', { class: 'ticket-paper' }, name),
            el('div', { class: 'ticket-foot' },
                el('span', { class: 'ticket-tier' }, tierName(card.tier)),
                win && el('span', { class: 'mini-stamp' }, String(win.guesses))));
        ticket.append(body);
        return ticket;
    }

    body.append(
        el('div', { class: 'ticket-event' }, el('span', {}, league.name), el('span', {}, season.replace('-', '–'))),
        el('div', { class: 'ticket-paper' },
            name,
            el('dl', { class: 'ticket-facts' },
                fact(t('position'), positionName(card.spot)),
                fact(t('nationality'), countryName(card.country)),
                fact(t('age'), String(card.age)))),
        el('div', { class: 'ticket-stub' },
            el('p', { class: 'ticket-rarity' }, tierName(card.tier)),
            el('dl', { class: 'ticket-seat' }, fact(t('sector'), club.code), fact(t('row'), String(card.row)), fact(t('seat'), String(card.seat)))),
        el('div', { class: 'ticket-tear' }));
    ticket.append(body);
    if (win) ticket.append(el('div', { class: 'ticket-stamp' }, createStamp(win.guesses, shortDate(win.date), card.id)));
    return ticket;
}
