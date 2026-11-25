// The result page: draws a shared round from the code in its link (result.html?r=...).
// The round carries its own players; the files only add the league's name, the badges and the ticket.
const code = new URLSearchParams(location.search).get('r');
const round = code ? decodeRound(code) : null;
const DIFFICULTIES = ['easy', 'medium', 'hard'];
let leagueInfo = null;
let leagueLoaded = false; // until then the header keeps "Result" rather than flashing a raw league id
let detailsOpen = false;
let revealed = false;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text; // round data comes from a link anyone can edit: never innerHTML
    return node;
}

async function loadLeague() {
    try {
        await clubBadges.ready;
        const manifest = await getJson('data/manifest.json');
        leagueInfo = manifest.leagues.find(l => l.id === round.league) || null;
    } catch (error) {
        console.error('Could not load the league data:', error); // the round still shows, without badges
    }
    leagueLoaded = true;
}

// Null for a date that someone has edited in the link.
function roundDay() {
    const [year, month, day] = String(round.date).split('-').map(Number);
    const when = new Date(year, month - 1, day);
    return Number.isNaN(when.getTime()) ? null : when;
}

function renderHead() {
    const name = leagueInfo ? leagueInfo.name : round.league;
    showLeagueMark(round.league);
    if (leagueLoaded) {
        const title = document.getElementById('resultTitle');
        title.removeAttribute('data-translate'); // otherwise a language change writes "Result" back over the league
        title.textContent = `${name} · ${round.season}`;
        document.title = `${name} ${round.season} · ${t('resultTitle')} — Guess the Footballer`;
    }

    const chip = document.getElementById('difficultyChip');
    if (DIFFICULTIES.includes(round.difficulty)) {
        chip.className = `difficulty-chip difficulty-${round.difficulty}`;
        chip.textContent = t(round.difficulty);
    }
    const date = roundDay();
    const dateChip = document.getElementById('dateChip');
    dateChip.classList.toggle('hidden', !date);
    dateChip.textContent = date ? date.toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function createMiniGrid() {
    const grid = el('div', 'mini-grid');
    grid.setAttribute('aria-hidden', 'true');
    for (const player of round.guesses) {
        const row = el('div', 'mini-row');
        for (const { key } of ATTRIBUTES) row.appendChild(el('span', isMatch(player, round.target, key) ? 'match' : ''));
        grid.appendChild(row);
    }
    return grid;
}

function renderSummary() {
    const won = isWon(round);
    const tries = round.guesses.length;
    const hintNames = round.hints.filter(key => ATTRIBUTES.some(a => a.key === key)).map(key => t(key));
    const summary = document.getElementById('summary');
    summary.replaceChildren(
        el('p', `result-score ${won ? 'won' : 'lost'}`, `${won ? tries : 'X'}/${round.max}`),
        el('p', 'result-outcome', won ? t('resultWon', { n: tries, max: round.max }) : t('resultLost', { max: round.max })),
        el('p', 'result-points', t('pointsLine', { n: roundPoints(round) })),
        el('p', 'result-hints', hintNames.length ? t('resultHints', { list: hintNames.join(', ') }) : t('resultNoHints')),
        ...[createClueCard(round.clue, round.difficulty)].filter(Boolean),
        createMiniGrid(),
    );
}

function renderActions() {
    const toggle = el('button', 'secondary-button', detailsOpen ? t('resultHideDetails') : t('resultDetails'));
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(detailsOpen));
    toggle.setAttribute('aria-controls', 'details');
    toggle.addEventListener('click', () => {
        detailsOpen = !detailsOpen;
        render();
    });
    const query = new URLSearchParams({ league: round.league, season: round.season, difficulty: round.difficulty });
    const play = el('a', 'primary-button', t('resultPlay'));
    play.href = `game.html?${query}`;
    document.getElementById('resultActions').replaceChildren(toggle, play);
}

function createHiddenCard() {
    if (revealed) {
        const date = roundDay();
        return createReveal(round.target, { season: round.season, win: isWon(round) && date ? { guesses: round.guesses.length, date } : null });
    }
    const card = el('div', 'reveal');
    const show = el('button', 'secondary-button', t('resultReveal'));
    show.type = 'button';
    show.addEventListener('click', () => {
        revealed = true;
        render();
    });
    card.append(el('span', 'reveal-unknown', '?'), el('div', 'reveal-details', t('resultHidden')), show);
    return card;
}

function renderDetails() {
    document.getElementById('details').classList.toggle('hidden', !detailsOpen);
    if (!detailsOpen) return;
    document.getElementById('hiddenPlayer').replaceChildren(createHiddenCard());
    // Oldest first: the page tells the story of the round, unlike the game, where the newest guess matters most.
    const rows = round.guesses.map((player, i) =>
        createAttempt(player, i + 1, { target: round.target, hidden: !revealed && player === round.target })
    );
    document.getElementById('playerInfo').replaceChildren(...rows);
}

function render() {
    renderHead();
    renderSummary();
    renderActions();
    renderDetails();
}

function renderInvalid() {
    document.getElementById('summary').replaceChildren(el('p', 'result-invalid', t('resultInvalid')));
    const play = el('a', 'primary-button', t('play'));
    play.href = 'index.html';
    document.getElementById('resultActions').replaceChildren(play);
}

document.addEventListener('languagechange', () => (round ? render() : renderInvalid()));

document.addEventListener('DOMContentLoaded', async () => {
    if (!round) {
        renderInvalid();
        return;
    }
    render(); // the round needs nothing else; badges and the league header follow when the file arrives
    await loadLeague();
    render();
});
