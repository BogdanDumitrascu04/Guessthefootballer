// The player's own page: who they are, their numbers (from the player_stats and daily_stats views) and their rounds,
// newest first.
// A round that was started and left has no result: it is shown, and counted, as lost.
const profileBox = document.getElementById('profile');
const STAT_CARDS = [
    ['rounds_played', 'statPlayed'],
    ['rounds_won', 'statWon'],
    ['win_percent', 'statWinRate', '%'],
    ['current_streak', 'statStreak'],
    ['best_streak', 'statBestStreak'],
];
const DAILY_CARDS = [
    ['current_streak', 'statStreak'],
    ['best_streak', 'statBestStreak'],
    ['days_won', 'statDaysWon'],
];
let rounds = null; // kept, so a change of language redraws without asking the database again
let stats = null; // null while loading, or if the numbers could not be read: the page then shows none
let dailyStats = null;
let roundsFailed = false;
let shownUser; // undefined until the first draw, so the first answer (even "nobody") is always shown
let deleteStep = null; // null, 'confirm', 'working' or 'failed'
let accountDeleted = false; // after deleting, the page says so instead of offering to sign in again

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(className, text, onClick) {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
}

function renderSignedOut() {
    const box = el('section', 'profile-empty');
    if (accountDeleted) {
        const home = el('a', 'primary-button', t('allGames'));
        home.href = '../../index.html';
        box.append(el('p', '', t('accountDeleted')), home);
    } else {
        box.append(el('p', '', t('profileSignedOut')), button('primary-button', t('signIn'), signIn));
    }
    profileBox.replaceChildren(box);
}

async function deleteAccount() {
    deleteStep = 'working';
    renderProfile();
    const { error } = await supabaseClient.rpc('delete_my_account');
    if (error) {
        console.warn('Account not deleted:', error.message);
        deleteStep = 'failed';
        return renderProfile();
    }
    accountDeleted = true;
    // Local only: the account, and with it the session on the server, no longer exists.
    await supabaseClient.auth.signOut({ scope: 'local' });
}

function renderAccountSection() {
    const section = el('section', 'profile-section profile-danger');
    const privacy = el('a', '', t('privacyLink'));
    privacy.href = '../../privacy-policy.html';
    section.append(el('h2', '', t('accountSection')), el('p', 'profile-note', t('deleteAccountInfo')));
    const actions = el('div', 'danger-actions');
    if (deleteStep === 'confirm' || deleteStep === 'working') {
        const yes = button('danger-button', t('deleteConfirmYes'), deleteAccount);
        const no = button('secondary-button', t('cancel'), () => { deleteStep = null; renderProfile(); });
        yes.disabled = no.disabled = deleteStep === 'working';
        actions.append(el('strong', 'danger-question', t('deleteConfirm')), yes, no);
    } else {
        actions.append(button('danger-outline-button', t('deleteAccount'), () => { deleteStep = 'confirm'; renderProfile(); }));
        if (deleteStep === 'failed') actions.append(el('span', 'profile-note error', t('deleteFailed')));
    }
    section.append(actions, privacy);
    return section;
}

function renderHead() {
    const name = displayName(currentUser);
    const head = el('section', 'profile-head');
    const who = el('div', 'profile-who');
    who.append(el('h1', 'profile-name', name));
    if (currentUser.email && currentUser.email !== name) who.append(el('p', 'profile-email', currentUser.email));
    head.append(el('span', 'account-head-avatar profile-avatar', initial(name)), who);
    if (stats) {
        const points = el('div', 'profile-points');
        points.append(el('span', 'profile-points-value', `${stats.total_points}`), el('span', 'profile-points-label', t('totalPoints')));
        head.append(points);
    }
    return head;
}

function renderStats(cards, values) {
    const grid = el('section', 'profile-stats');
    for (const [key, label, suffix = ''] of cards) {
        const card = el('div', 'stat-card');
        card.append(el('span', 'stat-value', `${values[key]}${suffix}`), el('span', 'stat-label', t(label)));
        grid.append(card);
    }
    return grid;
}

function renderDaily() {
    const section = el('section', 'profile-section');
    section.append(el('h2', '', t('daily')), renderStats(DAILY_CARDS, dailyStats));
    return section;
}

// Unlike any other round, the round of the day can still be continued until its day is over.
function isOpenToday(round) {
    return !round.finished_at && round.daily_on === daily.romanianDay();
}

function outcome(round) {
    if (isOpenToday(round)) return el('span', 'history-outcome abandoned', t('roundInProgress'));
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
    } else if (isOpenToday(round)) {
        row = el('a', 'history-row');
        row.href = 'game.html?daily';
    } else {
        row = el('div', 'history-row');
    }
    const main = el('div', 'history-main');
    const meta = el('div', 'history-meta');
    if (round.daily_on) meta.append(el('span', 'daily-chip', t('daily')));
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
    profileBox.replaceChildren(
        renderHead(),
        ...(stats ? [renderStats(STAT_CARDS, stats)] : []),
        ...(dailyStats ? [renderDaily()] : []),
        renderHistory(),
        renderAccountSection(),
    );
}

const KEPT = 'gtf-profile'; // removed at sign-out (auth.js)

function keptProfile(userId) {
    try {
        const copy = JSON.parse(localStorage.getItem(KEPT));
        return copy?.userId === userId ? copy : null;
    } catch {
        return null;
    }
}

// The copy kept in this browser is drawn at once; the database's answer replaces it.
async function showProfile() {
    const userId = currentUser?.id;
    const copy = userId ? keptProfile(userId) : null;
    rounds = copy?.rounds ?? null;
    stats = copy?.stats ?? null;
    dailyStats = copy?.dailyStats ?? null;
    roundsFailed = false;
    renderProfile();
    if (!userId) return;
    const [history, numbers, dailyNumbers] = await Promise.allSettled([loadRoundHistory(), loadPlayerStats(), loadDailyStats()]);
    if (currentUser?.id !== userId) return; // another account signed in meanwhile
    if (history.status === 'fulfilled') rounds = history.value;
    else {
        console.warn('Rounds not loaded:', history.reason.message);
        roundsFailed = !rounds;
    }
    if (numbers.status === 'fulfilled') stats = numbers.value;
    else console.warn('Stats not loaded:', numbers.reason.message);
    if (dailyNumbers.status === 'fulfilled') dailyStats = dailyNumbers.value;
    else console.warn('Daily stats not loaded:', dailyNumbers.reason.message);
    if ([history, numbers, dailyNumbers].every(answer => answer.status === 'fulfilled')) {
        localStorage.setItem(KEPT, JSON.stringify({ userId, rounds, stats, dailyStats }));
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
