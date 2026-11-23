// The player's own page: who they are and the rounds they played, newest first.
// A round that was started and left has no result: it is shown, and counted, as lost.
const profileBox = document.getElementById('profile');
let rounds = null; // kept, so a change of language redraws without asking the database again
let roundsFailed = false;
let shownUser; // undefined until the first draw, so the first answer (even "nobody") is always shown

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function renderSignedOut() {
    const box = el('section', 'profile-empty');
    const button = el('button', 'primary-button', t('signIn'));
    button.type = 'button';
    button.addEventListener('click', signIn);
    box.append(el('p', '', t('profileSignedOut')), button);
    profileBox.replaceChildren(box);
}

function renderHead() {
    const name = displayName(currentUser);
    const head = el('section', 'profile-head');
    const who = el('div', 'profile-who');
    who.append(el('h1', 'profile-name', name));
    if (currentUser.email && currentUser.email !== name) who.append(el('p', 'profile-email', currentUser.email));
    head.append(el('span', 'account-head-avatar profile-avatar', initial(name)), who);
    return head;
}

function outcome(round) {
    if (!round.finished_at) return el('span', 'history-outcome abandoned', t('roundAbandoned'));
    const score = round.won ? `${round.guesses}/${round.max_guesses}` : `X/${round.max_guesses}`;
    return el('span', `history-outcome ${round.won ? 'won' : 'lost'}`, score);
}

function historyRow(round, dateFormat) {
    const league = LEAGUES.find(l => l.code === round.league_id)?.name ?? round.league_id;
    // Finished rounds open on the result page; an abandoned one has no record of its guesses.
    let row;
    if (round.finished_at) {
        const link = new URL('result.html', location.href);
        link.searchParams.set('r', round.round_code);
        row = el('a', 'history-row');
        row.href = link.href;
    } else {
        row = el('div', 'history-row');
    }
    const main = el('div', 'history-main');
    const meta = el('div', 'history-meta');
    meta.append(
        el('span', `difficulty-chip difficulty-${round.difficulty}`, t(round.difficulty)),
        el('span', '', dateFormat.format(new Date(round.started_at))),
    );
    main.append(el('span', 'history-league', `${league} · ${round.season_id}`), meta);
    row.append(main, outcome(round), el('span', 'history-points', `${round.points}`));
    return row;
}

function renderHistory() {
    const section = el('section', 'profile-section');
    section.append(el('h2', '', t('yourRounds')));
    if (roundsFailed) {
        section.append(el('p', 'profile-note error', t('historyError')));
    } else if (!rounds) {
        section.append(el('p', 'profile-note', t('loading')));
    } else if (!rounds.length) {
        const play = el('a', 'primary-button', t('resultPlay'));
        play.href = 'index.html';
        section.append(el('p', 'profile-note', t('noRoundsYet')), play);
    } else {
        const dateFormat = new Intl.DateTimeFormat(currentLanguage, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const list = el('div', 'history');
        list.append(...rounds.map(round => historyRow(round, dateFormat)));
        section.append(list);
    }
    return section;
}

function renderProfile() {
    if (!accountKnown && supabaseClient) return;
    if (!currentUser) return renderSignedOut();
    profileBox.replaceChildren(renderHead(), renderHistory());
}

async function showProfile() {
    rounds = null;
    roundsFailed = false;
    renderProfile();
    if (!currentUser) return;
    try {
        rounds = await loadRoundHistory();
    } catch (error) {
        console.warn('Rounds not loaded:', error.message);
        roundsFailed = true;
    }
    renderProfile();
}

function onAccount() {
    const id = currentUser?.id ?? null;
    if (id === shownUser) return; // an hourly token refresh is still the same player
    shownUser = id;
    showProfile();
}

accountReady.then(onAccount);
document.addEventListener('accountchange', onAccount);
document.addEventListener('languagechange', renderProfile);
