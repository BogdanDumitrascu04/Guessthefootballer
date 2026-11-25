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
let difficulty = [params.get('difficulty'), localStorage.getItem('gtf-difficulty')].find(d => TARGET_TIERS[d]) ?? 'medium';

let league, players, targetPlayer;
let clues = {}; // player ID -> facts; seasons without a clues file simply have none
let currentClue = null;
let lastRound = null; // what the result page and the account receive
let roundStart = null; // the promise of this round's row in the account
let rowId = null; // that row, once it exists: leaving now would count as a loss
let started = false; // false: the screen before the round is shown
let saveState = null; // 'saving', 'saved', 'failed' or 'signedOut', shown under the points
let guesses = [];
const revealedHints = new Set();
let roundOver = false;
let message = null; // kept as a key, so it can be redrawn when the language changes
let highlighted = -1;
let animateLast = false; // only a new guess flips; redrawing for another language must not

const kickoffBox = document.getElementById('kickoff');
const roundBox = document.getElementById('round');
const inputBox = document.getElementById('guessInput');
const resultsBox = document.querySelector('.result-box');
const feedback = document.getElementById('feedback');
const playerInfo = document.getElementById('playerInfo');
const hintsBox = document.getElementById('hints');
const restartContainer = document.getElementById('restartContainer');
const outcomeBox = document.getElementById('outcome');
const revealBox = document.getElementById('reveal');
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

    document.title = `${info.name} ${season} — Guess the Footballer`;
    document.getElementById('gameSubtitle').textContent = `${info.name} · ${season}`;
    showLeagueMark(info.id);
    buildNavbar(manifest);
    showKickoff();
    import('./album/reveal.js').then(album => album.preload(), () => {}); // the ticket is then ready when the round ends
}

function buildNavbar(manifest) {
    const menu = document.getElementById('menuContent');
    menu.innerHTML = '';
    for (const l of manifest.leagues) {
        const a = document.createElement('a');
        a.href = `game.html?league=${l.id}&season=${league.seasonUsed}`;
        a.textContent = l.name;
        menu.appendChild(a);
    }
    const album = document.createElement('a');
    album.href = 'album.html';
    album.setAttribute('data-translate', 'album');
    album.textContent = t('album');
    menu.appendChild(album);
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

function showKickoff() {
    started = false;
    render();
}

function setDifficulty(level) {
    difficulty = level;
    localStorage.setItem('gtf-difficulty', level);
    render();
    kickoffBox.querySelector('[aria-pressed="true"]').focus(); // drawing the screen again lost it
}

// The hidden player needs every clue; some players have no known number or age.
function pickTarget() {
    const complete = players.filter(p => p.number != null && p.age != null);
    const suited = complete.filter(p => TARGET_TIERS[difficulty].includes(p.tier));
    const pool = suited.length ? suited : complete;
    return pool[Math.floor(Math.random() * pool.length)];
}

function startRound() {
    started = true;
    guesses = [];
    lastRound = null;
    revealedHints.clear();
    roundOver = false;
    message = null;
    saveState = null;
    rowId = null;
    targetPlayer = pickTarget();
    currentClue = pickClue(targetPlayer);
    // Saved as soon as it starts, so leaving the page counts as a loss instead of erasing it.
    const start = saveRoundStart({ league: league.info.id, season: league.seasonUsed, difficulty });
    roundStart = start;
    start.then(id => {
        if (start === roundStart) rowId = id;
    }, () => {}); // a failure is reported when the round ends; an abandoned round has nobody to tell
    inputBox.disabled = false;
    inputBox.value = '';
    restartContainer.innerHTML = '';
    revealBox.replaceChildren();
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
        li.append(createAvatar(p), name, createTeamLogo(p.team, 'team-logo-small'));
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
    revealAfter(saveRound(roundStart, lastRound), lastRound);
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
    const changeButton = document.createElement('button');
    changeButton.className = 'link-button';
    changeButton.setAttribute('data-translate', 'changeDifficulty');
    changeButton.textContent = t('changeDifficulty');
    changeButton.addEventListener('click', () => {
        showKickoff();
        kickoffBox.querySelector('.start-button').focus(); // the button just pressed is gone
        scrollTo(0, 0);
    });
    restartContainer.append(restartButton, shareButton, changeButton);
}

const CARD_WAIT = 3000; // ms; a slow connection must not hold the answer back for longer

// A saved win turns its card over in a window of its own; the same ticket in the page would spoil that moment.
function revealAfter(saved, round) {
    const show = () => {
        if (lastRound === round && !revealBox.hasChildNodes()) showReveal();
    };
    if (!isWon(round)) return show();
    saved.then(show);
    setTimeout(show, CARD_WAIT);
}

function showReveal() {
    const win = isWon(lastRound) ? { guesses: guesses.length, date: new Date() } : null;
    revealBox.replaceChildren(createReveal(targetPlayer, { season: league.seasonUsed, win }));
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
        if (isWon(round) && round.target.id) {
            // The round is saved either way; without its card the result still shows as before.
            await import('./album/round-win.js')
                .then(album => album.showRoundCard(round, roundId, () => lastRound === round))
                .catch(error => console.warn('Card not shown:', error.message));
        }
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
    const chip = document.getElementById('difficultyChip');
    chip.className = `difficulty-chip difficulty-${difficulty}`;
    chip.textContent = t(difficulty);
    kickoffBox.hidden = started;
    roundBox.hidden = attemptCounter.hidden = !started;
    if (!started) {
        kickoffBox.replaceChildren(...kickoff.create({ difficulty, attempts: MAX_ATTEMPTS, onDifficulty: setDifficulty, onStart: startRound }));
        return;
    }
    outcomeBox.classList.toggle('over', roundOver);
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
        playerInfo.appendChild(createAttempt(guesses[i], i + 1, { target: targetPlayer, fresh: isNew }));
    }
}

document.addEventListener('languagechange', () => {
    if (!league) return;
    render();
    if (started && revealBox.hasChildNodes()) showReveal();
});

document.addEventListener('accountchange', () => {
    if (league && !started) render();
});

// A page closed by mistake would cost a player with an account the round, so the browser asks first.
addEventListener('beforeunload', event => {
    if (started && !roundOver && rowId) event.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
    loadLeague().catch(error => {
        console.error('Could not load the league data:', error);
        inputBox.disabled = true;
        roundBox.hidden = false;
        message = { kind: 'error', key: 'loadError' };
        renderMessage();
    });
});
