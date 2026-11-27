import { loadCards, winOf } from './cards.js';
import { loadClub, loadIndex } from './data.js';
import { el } from './dom.js';
import { createBar, createTierCounts, tally, updateBar } from './progress.js';
import { createEmptySlot, createFilledSlot } from './slots.js';
import { LINES } from './text.js';
import { landCard } from './win.js';
import { openCard } from './zoom.js';

const page = document.getElementById('album');
const sum = list => list.reduce((a, b) => a + b, 0);
let turn = 0;
let account; // undefined until the first draw: the first answer about the account is part of it

function sized(badge, width) {
    badge?.setAttribute('width', width);
    return badge;
}

function signInLine() {
    if (currentUser) return null;
    const button = el('button', { class: 'primary-button', type: 'button' }, t('signIn'));
    button.addEventListener('click', signIn);
    return el('div', { class: 'album-signin' }, el('p', {}, t('albumSignedOut')), button);
}

async function leagueView(index, league) {
    const counts = new Map(await Promise.all(currentUser
        ? league.clubs.map(async id => [id, tally((await loadClub(id)).cards, winOf)])
        : []));
    return [
        el('h1', { class: 'view-title' }, t('album')),
        signInLine(),
        el('nav', { class: 'league-tabs', 'aria-label': t('album') }, index.leagues.map(l => el('a', {
            href: `#/${l.id}`, 'aria-current': l === league && 'page',
        }, l.name))),
        el('ul', { class: 'club-grid' }, league.clubs.map(id => {
            const club = index.clubs[id];
            const count = counts.get(id) ?? { won: [0, 0, 0], total: club.cards };
            return el('li', {}, el('a', { class: 'club-link', href: `#/${league.id}/${id}` },
                sized(clubBadges.create(club.name), 62),
                el('span', { class: 'club-count' }, `${sum(count.won)}/${sum(count.total)}`),
                el('span', { class: 'club-name' }, club.name),
                createBar(count, club.name)));
        })),
    ];
}

async function clubView(index, clubId, arrivingId) {
    const club = index.clubs[clubId];
    const league = index.leagues.find(l => l.id === club.league);
    const { cards } = await loadClub(clubId);
    const arriving = cards.find(card => card.id === arrivingId && winOf(card.id));
    const options = card => ({ league, season: index.season, win: winOf(card.id) });
    let landed = !arriving;
    const shown = id => (!landed && id === arriving.id ? undefined : winOf(id));

    const createSlot = card => (shown(card.id)
        ? createFilledSlot(card, club, { league, win: shown(card.id), onOpen: () => openCard(card, club, options(card)) })
        : createEmptySlot(card, club));
    const bar = createBar(tally(cards, shown), club.name);
    const summary = el('p', { class: 'album-summary' });
    const counts = el('div', {});
    const status = el('p', { class: 'visually-hidden', role: 'status' });
    const rows = LINES.map((line, i) => el('section', { class: 'album-row', 'data-line': line },
        el('h2', { class: 'row-title' }, el('span', {}, `${t('row')} ${i + 1}`), ` ${t(`line_${line}`)} `, el('span', { class: 'row-count' })),
        el('ol', { class: 'slots' }, cards.filter(card => card.line === line).map(createSlot))));

    function refresh() {
        const count = tally(cards, shown);
        summary.textContent = t('albumSummary', { code: club.code, n: sum(count.won), total: sum(count.total) });
        counts.replaceChildren(createTierCounts(count));
        updateBar(bar, count);
        for (const row of rows) {
            const inLine = cards.filter(card => card.line === row.dataset.line);
            row.querySelector('.row-count').textContent = `${inLine.filter(card => shown(card.id)).length}/${inLine.length}`;
        }
    }
    refresh();

    function land() {
        const slot = page.querySelector(`[data-card="${arriving.id}"]`);
        return landCard(arriving, club, options(arriving), {
            slot,
            onPlaced: () => {
                landed = true;
                const filled = createSlot(arriving);
                filled.classList.add('just-won');
                slot.replaceWith(filled);
                refresh();
                filled.querySelector('button').focus({ preventScroll: true });
                status.textContent = `${arriving.name}: ${summary.textContent}`;
            },
        });
    }

    const content = [
        el('nav', { class: 'crumbs' }, el('a', { href: `#/${league.id}` }, `‹ ${league.name}`)),
        el('header', { class: 'album-head' }, sized(clubBadges.create(club.name), 92), el('div', {}, el('h1', { class: 'view-title' }, club.name), summary)),
        signInLine(), bar, counts, ...rows, status,
    ];
    return { content, after: arriving && land };
}

// Only the open view is in the page, and only the clubs it needs have been downloaded.
// quiet: newer cards from the server, drawn in place, without moving the page or closing an open card.
async function show({ quiet = false } = {}) {
    const mine = ++turn;
    try {
        const [leagueId, clubId, cardId] = location.hash.replace(/^#\//, '').split('/');
        const cards = loadCards({ onNewer: () => mine === turn && show({ quiet: true }), waitForServer: Boolean(cardId) });
        const [index] = await Promise.all([loadIndex(), cards, clubBadges.ready]);
        account = currentUser?.id ?? null;
        const league = index.leagues.find(l => l.id === leagueId) ?? index.leagues[0];
        const view = Object.hasOwn(index.clubs, clubId ?? '')
            ? await clubView(index, clubId, Number(cardId))
            : { content: await leagueView(index, league) };
        if (mine !== turn) return;
        if (!quiet) document.querySelectorAll('dialog').forEach(dialog => dialog.close());
        page.replaceChildren(...view.content.filter(Boolean));
        if (!quiet) scrollTo(0, 0);
        if (view.after) {
            history.replaceState(null, '', `#/${leagueId}/${clubId}`); // a reload must not play the arrival again
            await view.after();
        }
    } catch (error) {
        console.error(error);
        if (mine === turn) page.replaceChildren(el('p', { class: 'album-error' }, t('loadError')));
    }
}

addEventListener('hashchange', () => show());
document.addEventListener('languagechange', () => show());
// Supabase repeats this event when the tab regains focus; only another account changes the page.
document.addEventListener('accountchange', () => {
    if (account !== undefined && (currentUser?.id ?? null) !== account) show();
});
show();
