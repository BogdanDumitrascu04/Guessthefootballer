// One engine for every league and season: the URL decides which JSON file to load.
const MAX_ATTEMPTS = 6;
const MAX_SUGGESTIONS = 30;
// Tiers the hidden player may come from: 1 star, 2 regular, 3 deep squad.
const TARGET_TIERS = { easy: [1], medium: [1, 2], hard: [2, 3] };
// Each hint unlocks after this many guesses, so the game stays a deduction game.
const HINTS = [
    { key: 'team', after: 2 },
    { key: 'age', after: 4 },
];
// Facts for the opening clue, by difficulty; "body" (foot and height) is the fallback, since almost everyone has it.
const CLUES_BY_DIFFICULTY = {
    easy: ['transfer', 'season'],
    medium: ['transfer', 'season'],
    hard: ['position', 'caps', 'peak', 'contract', 'body', 'born'],
};
// Letters that Unicode normalization does not reduce to a plain one.
const SPECIAL_LETTERS = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i' };

const params = new URLSearchParams(location.search);
const requestedLeague = params.get('league') || 'premier-league';
const requestedSeason = params.get('season');
const difficulty = TARGET_TIERS[params.get('difficulty')] ? params.get('difficulty') : 'medium';

let league, players, targetPool, targetPlayer;
let clues = {}; // player ID -> facts; seasons without a clues file simply have none
let currentClue = null;
let lastRound = null; // what the result page and the account receive
let roundStart = null; // the promise of this round's row in the account
let saveState = null; // 'saving', 'saved', 'failed' or 'signedOut', shown under the points
let guesses = [];
const revealedHints = new Set();
let roundOver = false;
let message = null; // kept as a key, so it can be redrawn when the language changes
let highlighted = -1;
let animateLast = false; // only a new guess flips; redrawing for another language must not

const inputBox = document.getElementById('guessInput');
const resultsBox = document.querySelector('.result-box');
const feedback = document.getElementById('feedback');
const playerInfo = document.getElementById('playerInfo');
const hintsBox = document.getElementById('hints');
const restartContainer = document.getElementById('restartContainer');
const attemptCounter = document.getElementById('attemptCounter');

async function loadLeague() {
    const manifest = await getJson('data/manifest.json');
    const info = manifest.leagues.find(l => l.id === requestedLeague) || manifest.leagues[0];
    const season = info.seasons.includes(requestedSeason) ? requestedSeason : manifest.defaultSeason;
    league = await getJson(`data/seasons/${season}/${info.id}.json`);
    clues = (manifest.clueSeasons || []).includes(season)
        ? await getJson(`data/seasons/${season}/clues/${info.id}.json`).then(data => data.players, () => ({}))
        : {};
    await clubBadges.ready;
    league.info = info;
    league.seasonUsed = season;
    players = league.players;
    for (const p of players) p.searchName = normalize(p.name);
    // The hidden player needs every clue; some players have no known number or age.
    const complete = players.filter(p => p.number != null && p.age != null);
    targetPool = complete.filter(p => TARGET_TIERS[difficulty].includes(p.tier));
    if (!targetPool.length) targetPool = complete;

    document.title = `${info.name} ${season} — Guess the Footballer`;
    document.documentElement.style.setProperty('--league-bg', `url('${ROOT}${info.background}')`);
    document.getElementById('gameSubtitle').textContent = `${info.name} · ${season}`;
    document.getElementById('leagueLogo').src = `${ROOT}${info.logo}`;
    document.getElementById('difficultyChip').className = `difficulty-chip difficulty-${difficulty}`;
    buildNavbar(manifest);
    startRound();
}

function buildNavbar(manifest) {
    const menu = document.getElementById('menuContent');
    menu.innerHTML = '';
    for (const l of manifest.leagues) {
        const a = document.createElement('a');
        a.href = `game.html?league=${l.id}&season=${league.seasonUsed}&difficulty=${difficulty}`;
        a.textContent = l.name;
        menu.appendChild(a);
    }
    const settings = document.createElement('a');
    settings.href = 'index.html';
    settings.setAttribute('data-translate', 'changeSettings');
    settings.textContent = t('changeSettings');
    menu.appendChild(settings);
    const hub = document.createElement('a');
    hub.href = '../../index.html';
    hub.setAttribute('data-translate', 'allGames');
    hub.textContent = t('allGames');
    menu.appendChild(hub);
}

function startRound() {
    guesses = [];
    lastRound = null;
    revealedHints.clear();
    roundOver = false;
    message = null;
    saveState = null;
    targetPlayer = targetPool[Math.floor(Math.random() * targetPool.length)];
    currentClue = pickClue(targetPlayer);
    // Saved as soon as it starts, so leaving the page counts as a loss instead of erasing it.
    roundStart = saveRoundStart({ league: league.info.id, season: league.seasonUsed, difficulty });
    roundStart.catch(() => {}); // a failure is reported when the round ends; an abandoned round has nobody to tell
    inputBox.disabled = false;
    inputBox.value = '';
    restartContainer.innerHTML = '';
    closeSuggestions();
    render();
    focusInput();
}

// A different fact each round, so the same player does not always open the same way.
function pickClue(player) {
    const facts = clues[player.id] || [];
    const suited = facts.filter(f => CLUES_BY_DIFFICULTY[difficulty].includes(f.type));
    const pool = suited.length ? suited : facts.filter(f => f.type === 'body');
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function focusInput() {
    // On phones this would open the keyboard over the result of the guess.
    if (matchMedia('(pointer: fine)').matches) inputBox.focus();
}

// "Ødegaard" and "odegaard", "Alexander-Arnold" and "alexander arnold" must match.
function normalize(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[øæœßłđðþı]/g, letter => SPECIAL_LETTERS[letter])
        .replace(/['’.]/g, '')
        .replace(/-/g, ' ')
        .trim();
}

function findPlayerByName(name) {
    const wanted = normalize(name);
    return players.find(p => p.searchName === wanted);
}

// Autocomplete
function matchRank(player, input) {
    if (player.searchName === input) return -1;
    if (player.searchName.startsWith(input)) return 0;
    return ` ${player.searchName}`.includes(` ${input}`) ? 1 : 2; // a surname beats the middle of a word
}

function closeSuggestions() {
    resultsBox.innerHTML = '';
    highlighted = -1;
}

function showSuggestions() {
    closeSuggestions();
    const input = normalize(inputBox.value);
    if (!input) return;
    const matches = players
        .filter(p => p.searchName.includes(input) && !guesses.includes(p))
        .sort((a, b) => matchRank(a, input) - matchRank(b, input))
        .slice(0, MAX_SUGGESTIONS);
    if (!matches.length) return;

    const list = document.createElement('ul');
    for (const p of matches) {
        const li = document.createElement('li');
        li.dataset.name = p.name;
        const name = document.createElement('span');
        name.className = 'suggestion-name';
        name.textContent = p.name;
        const team = document.createElement('small');
        team.textContent = p.team;
        name.appendChild(team);
        li.append(createAvatar(p, league.teams), name, createTeamLogo(p.team, 'team-logo-small'));
        list.appendChild(li);
    }
    resultsBox.appendChild(list);
    highlight(0, false); // Enter picks the highlighted name
}

function highlight(index, scroll = true) {
    const items = [...resultsBox.querySelectorAll('li')];
    highlighted = index;
    items.forEach((li, i) => li.classList.toggle('active', i === index));
    if (scroll) items[index]?.scrollIntoView({ block: 'nearest' });
}

inputBox.addEventListener('input', showSuggestions);

resultsBox.addEventListener('click', event => {
    const li = event.target.closest('li[data-name]');
    if (!li) return;
    inputBox.value = li.dataset.name;
    checkGuess();
});

inputBox.addEventListener('keydown', event => {
    const items = [...resultsBox.querySelectorAll('li')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!items.length) return;
        if (event.key === 'ArrowDown') highlight((highlighted + 1) % items.length);
        else highlight(highlighted <= 0 ? items.length - 1 : highlighted - 1);
    } else if (event.key === 'Enter') {
        if (highlighted >= 0) inputBox.value = items[highlighted].dataset.name;
        checkGuess();
    } else if (event.key === 'Escape') {
        closeSuggestions();
    }
});

document.addEventListener('click', event => {
    if (!event.target.closest('.Guess')) closeSuggestions();
});

// Game logic
function checkGuess() {
    const guessedPlayer = findPlayerByName(inputBox.value);
    closeSuggestions();
    if (!guessedPlayer) {
        message = { kind: 'error', key: 'notFound' }; // typos don't consume attempts
        renderMessage();
        return;
    }
    if (guesses.includes(guessedPlayer)) {
        message = { kind: 'error', key: 'alreadyGuessed', params: { name: guessedPlayer.name } };
        inputBox.value = '';
        renderMessage();
        return;
    }

    guesses.push(guessedPlayer);
    animateLast = true;
    inputBox.value = '';
    if (guessedPlayer === targetPlayer) {
        message = { kind: 'success', key: 'congrats' };
        endRound();
    } else if (guesses.length >= MAX_ATTEMPTS) {
        message = { kind: 'error', key: 'gameOver', params: { name: targetPlayer.name } };
        endRound();
    } else {
        const left = MAX_ATTEMPTS - guesses.length;
        message = left === 1 ? { kind: 'error', key: 'incorrectLast' } : { kind: 'error', key: 'incorrect', params: { n: left } };
        focusInput();
    }
    render();
}

// The player's own calendar day, not the UTC one.
function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function endRound() {
    roundOver = true;
    lastRound = createRound({
        league: league.info.id,
        season: league.seasonUsed,
        difficulty,
        date: localDate(),
        max: MAX_ATTEMPTS,
        hints: [...revealedHints],
        target: targetPlayer,
        guesses,
        clue: currentClue,
    });
    saveRound(roundStart, lastRound);
    inputBox.disabled = true;
    const restartButton = document.createElement('button');
    restartButton.className = 'primary-button';
    restartButton.setAttribute('data-translate', 'restart');
    restartButton.textContent = t('restart');
    restartButton.addEventListener('click', startRound);
    const shareButton = document.createElement('button');
    shareButton.className = 'secondary-button';
    shareButton.setAttribute('data-translate', 'share');
    shareButton.textContent = t('share');
    shareButton.addEventListener('click', () => shareResult(shareButton));
    restartContainer.append(restartButton, shareButton);
}

async function saveRound(start, round) {
    const setState = state => {
        if (start !== roundStart) return; // "Restart" was pressed meanwhile: this message belongs to the old round
        saveState = state;
        renderMessage();
    };
    try {
        const roundId = await start;
        if (!roundId) return setState(currentUser ? null : 'signedOut');
        setState('saving');
        await saveRoundEnd(roundId, round);
        setState('saved');
    } catch (error) {
        console.warn('Round not saved:', error.message);
        setState('failed');
    }
}

// Colours only, never names, so the text does not spoil the answer; the link opens the full round.
function shareText() {
    const won = isWon(lastRound);
    const rows = guesses.map(p => ATTRIBUTES.map(({ key }) => (isMatch(p, targetPlayer, key) ? '🟩' : '⬜')).join(''));
    const hints = lastRound.hints.length ? ` · 💡${lastRound.hints.length}` : '';
    const link = new URL('result.html', location.href);
    link.searchParams.set('r', encodeRound(lastRound));
    return [
        `Guess the Footballer · ${league.info.name} ${league.seasonUsed} · ${t(difficulty)}`,
        `${won ? guesses.length : 'X'}/${MAX_ATTEMPTS}${hints} · ${t('pointsLine', { n: roundPoints(lastRound) })}`,
        ...rows,
        link.href,
    ].join('\n');
}

async function shareResult(button) {
    const text = shareText();
    try {
        // Phones open their share sheet; desktops copy, because the Windows share sheet has few useful targets.
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            await navigator.share({ text });
            return;
        }
        await navigator.clipboard.writeText(text);
        button.textContent = t('copied');
    } catch (error) {
        if (error.name !== 'AbortError') window.prompt(t('share'), text);
    }
}

// Rendering
function render() {
    document.getElementById('difficultyChip').textContent = t(difficulty);
    attemptCounter.textContent = `${t('guesses')}: ${guesses.length}/${MAX_ATTEMPTS}`;
    renderClue();
    renderMessage();
    renderHints();
    renderAttempts();
}

function renderClue() {
    const card = createClueCard(currentClue, difficulty);
    document.getElementById('clue').replaceChildren(...(card ? [card] : []));
}

function renderMessage() {
    feedback.innerHTML = '';
    if (!message) return;
    feedback.className = `feedback-${message.kind}`;
    const text = document.createElement('strong');
    text.innerHTML = t(message.key, message.params); // the dictionaries contain <br>
    feedback.appendChild(text);
    if (!roundOver) return;
    const points = document.createElement('div');
    points.className = 'points-earned';
    points.textContent = t('pointsLine', { n: roundPoints(lastRound) });
    feedback.append(points);
    if (saveState) feedback.append(createSaveStatus());
    feedback.append(createReveal(targetPlayer, league.teams));
}

const SAVE_TEXT = { saving: 'roundSaving', saved: 'roundSaved', failed: 'roundNotSaved', signedOut: 'signInToSave' };

function createSaveStatus() {
    const status = document.createElement('div');
    status.className = `save-status save-${saveState}`;
    if (saveState !== 'signedOut') {
        status.textContent = t(SAVE_TEXT[saveState]);
        return status;
    }
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'link-button';
    link.textContent = t('signIn');
    link.addEventListener('click', signIn);
    status.append(`${t(SAVE_TEXT.signedOut)} `, link);
    return status;
}

function renderHints() {
    hintsBox.innerHTML = '';
    if (roundOver) return;
    for (const { key, after } of HINTS) hintsBox.appendChild(createHint(key, after));
}

function createHint(key, after) {
    const chip = document.createElement('button');
    chip.type = 'button';
    const label = document.createElement('span');
    label.className = 'hint-label';
    const value = document.createElement('span');
    value.className = 'hint-value';
    if (revealedHints.has(key)) {
        chip.className = 'hint-chip revealed';
        chip.disabled = true;
        label.textContent = t(key);
        if (key === 'team') value.appendChild(createTeamLogo(targetPlayer.team, 'hint-logo'));
        value.append(String(targetPlayer[key]));
    } else if (guesses.length >= after) {
        chip.className = 'hint-chip ready';
        label.textContent = `💡 ${t(key)}`;
        value.textContent = t('hintShow');
        chip.addEventListener('click', () => {
            revealedHints.add(key);
            renderHints();
        });
    } else {
        chip.className = 'hint-chip locked';
        chip.disabled = true;
        label.textContent = `🔒 ${t(key)}`;
        value.textContent = t('hintAfter', { n: after });
    }
    chip.append(label, value);
    return chip;
}

function renderAttempts() {
    const fresh = animateLast;
    animateLast = false;
    playerInfo.innerHTML = '';
    for (let i = guesses.length - 1; i >= 0; i--) {
        const isNew = fresh && i === guesses.length - 1;
        playerInfo.appendChild(createAttempt(guesses[i], i + 1, { target: targetPlayer, teams: league.teams, fresh: isNew }));
    }
}

document.addEventListener('languagechange', () => {
    if (league) render();
});

document.addEventListener('DOMContentLoaded', () => {
    loadLeague().catch(error => {
        console.error('Could not load the league data:', error);
        inputBox.disabled = true;
        message = { kind: 'error', key: 'loadError' };
        renderMessage();
    });
});
