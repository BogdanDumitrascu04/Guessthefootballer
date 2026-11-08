// One engine for every league and season: the URL decides which JSON file to load.
const ROOT = '../../';
const MAX_ATTEMPTS = 10;
const MAX_SUGGESTIONS = 30;
const MAX_HINTS = 2;
// Tiers the hidden player may come from: 1 star, 2 regular, 3 deep squad.
const TARGET_TIERS = { easy: [1], medium: [1, 2], hard: [2, 3] };
const ATTRIBUTES = [
    { key: 'team' },
    { key: 'position' },
    { key: 'age', numeric: true },
    { key: 'number', numeric: true },
    { key: 'nationality' },
];
// Letters that Unicode normalization does not reduce to a plain one.
const SPECIAL_LETTERS = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i' };

const params = new URLSearchParams(location.search);
const requestedLeague = params.get('league') || 'premier-league';
const requestedSeason = params.get('season');
const difficulty = TARGET_TIERS[params.get('difficulty')] ? params.get('difficulty') : 'medium';

let league, players, targetPool, targetPlayer;
let guesses = [];
let hintStage = 0;
let roundOver = false;
let message = null; // kept as a key, so it can be redrawn when the language changes
let highlighted = -1;

const inputBox = document.getElementById('guessInput');
const resultsBox = document.querySelector('.result-box');
const feedback = document.getElementById('feedback');
const playerInfo = document.getElementById('playerInfo');
const hintButton = document.getElementById('hintButton');
const hintDiv = document.getElementById('hint');
const restartContainer = document.getElementById('restartContainer');
const attemptCounter = document.getElementById('attemptCounter');

// Data changes when a season is rebuilt, so the browser must check for a newer copy instead of reusing its cache.
async function getJson(path) {
    return (await fetch(`${ROOT}${path}`, { cache: 'no-cache' })).json();
}

async function loadLeague() {
    const manifest = await getJson('data/manifest.json');
    const info = manifest.leagues.find(l => l.id === requestedLeague) || manifest.leagues[0];
    const season = info.seasons.includes(requestedSeason) ? requestedSeason : manifest.defaultSeason;
    league = await getJson(`data/seasons/${season}/${info.id}.json`);
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
    hintStage = 0;
    roundOver = false;
    message = null;
    targetPlayer = targetPool[Math.floor(Math.random() * targetPool.length)];
    inputBox.disabled = false;
    inputBox.value = '';
    restartContainer.innerHTML = '';
    hintButton.style.display = '';
    closeSuggestions();
    render();
    focusInput();
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

// Older seasons use local images, newer ones full URLs.
function asset(path) {
    return /^https?:/.test(path) ? path : `${ROOT}${path}`;
}

// Older seasons repeat the club badge as "photo" for players without a portrait.
function hasPortrait(player) {
    return Boolean(player.photo) && player.photo !== league.teams[player.team];
}

function createAvatar(player) {
    if (hasPortrait(player)) {
        const img = document.createElement('img');
        img.className = 'avatar';
        img.src = asset(player.photo);
        img.alt = '';
        return img;
    }
    const initials = document.createElement('span');
    initials.className = 'avatar';
    const words = player.name.split(' ');
    initials.textContent = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
    return initials;
}

function createTeamLogo(team, className) {
    const img = document.createElement('img');
    img.className = `logo-chip ${className}`;
    img.src = asset(league.teams[team]);
    img.alt = '';
    return img;
}

// Autocomplete
function matchRank(player, input) {
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
        if (event.key === 'ArrowDown') highlighted = (highlighted + 1) % items.length;
        else highlighted = highlighted <= 0 ? items.length - 1 : highlighted - 1;
        items.forEach((li, i) => li.classList.toggle('active', i === highlighted));
        items[highlighted].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
        if (highlighted >= 0) inputBox.value = items[highlighted].dataset.name;
        else if (items.length === 1) inputBox.value = items[0].dataset.name;
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
    inputBox.value = '';
    if (guessedPlayer === targetPlayer) {
        message = { kind: 'success', key: 'congrats' };
        endRound();
    } else if (guesses.length >= MAX_ATTEMPTS) {
        message = { kind: 'error', key: 'gameOver', params: { name: targetPlayer.name } };
        endRound();
    } else {
        message = { kind: 'error', key: 'incorrect', params: { n: MAX_ATTEMPTS - guesses.length } };
        focusInput();
    }
    render();
}

function endRound() {
    roundOver = true;
    inputBox.disabled = true;
    hintButton.style.display = 'none';
    const restartButton = document.createElement('button');
    restartButton.setAttribute('data-translate', 'restart');
    restartButton.textContent = t('restart');
    restartButton.addEventListener('click', startRound);
    restartContainer.appendChild(restartButton);
}

// Rendering
function render() {
    document.getElementById('difficultyChip').textContent = t(difficulty);
    attemptCounter.textContent = `${t('guesses')}: ${guesses.length}/${MAX_ATTEMPTS}`;
    renderMessage();
    renderHints();
    renderAttempts();
}

function renderMessage() {
    feedback.innerHTML = '';
    if (!message) return;
    feedback.className = `feedback-${message.kind}`;
    const text = document.createElement('strong');
    text.innerHTML = t(message.key, message.params); // the dictionaries contain <br>
    feedback.appendChild(text);
    if (roundOver) feedback.appendChild(createReveal());
}

function createReveal() {
    const card = document.createElement('div');
    card.className = 'reveal';
    const photo = document.createElement('img');
    const portrait = hasPortrait(targetPlayer);
    photo.className = portrait ? 'reveal-photo' : 'reveal-photo logo-chip';
    photo.src = asset(portrait ? targetPlayer.photo : league.teams[targetPlayer.team]);
    photo.alt = targetPlayer.name;
    const name = document.createElement('div');
    name.className = 'reveal-name';
    name.textContent = targetPlayer.name;
    const details = document.createElement('div');
    details.className = 'reveal-details';
    details.textContent = `${targetPlayer.team} · ${targetPlayer.position} · #${targetPlayer.number}`;
    card.append(photo, name, details);
    return card;
}

function renderHints() {
    hintDiv.innerHTML = '';
    if (roundOver || !hintStage) return;
    const hints = [t('hintTeam', { team: targetPlayer.team }), t('hintAge', { age: targetPlayer.age })];
    for (const hint of hints.slice(0, hintStage)) {
        const line = document.createElement('div');
        line.textContent = hint;
        hintDiv.appendChild(line);
    }
}

function renderAttempts() {
    playerInfo.innerHTML = '';
    for (let i = guesses.length - 1; i >= 0; i--) {
        playerInfo.appendChild(createAttempt(guesses[i], i + 1));
    }
}

function createAttempt(player, number) {
    const row = document.createElement('div');
    row.className = 'attempt';

    const who = document.createElement('div');
    who.className = 'attempt-player';
    const position = document.createElement('span');
    position.className = 'attempt-number';
    position.textContent = `${number}.`;
    const name = document.createElement('span');
    name.textContent = player.name;
    who.append(position, createAvatar(player), name);
    row.appendChild(who);

    for (const attribute of ATTRIBUTES) row.appendChild(createTile(player, attribute));
    return row;
}

function createTile(player, { key, numeric }) {
    const tile = document.createElement('div');
    tile.className = `tile tile-${key}`;
    const label = document.createElement('span');
    label.className = 'tile-label';
    label.textContent = t(key);
    const body = document.createElement('span');
    body.className = 'tile-body';
    if (key === 'team') body.appendChild(createTeamLogo(player.team, 'tile-logo'));

    const value = document.createElement('span');
    value.className = 'tile-value';
    const guessed = player[key];
    const target = targetPlayer[key];
    if (guessed == null) {
        value.textContent = '—';
    } else if (guessed === target) {
        tile.classList.add('match');
        value.textContent = `${guessed} ✓`;
    } else if (numeric) {
        value.textContent = `${guessed} ${guessed < target ? '↑' : '↓'}`;
    } else {
        value.textContent = guessed;
    }
    body.appendChild(value);
    tile.append(label, body);
    return tile;
}

// Hints: club, then age
hintButton.addEventListener('click', () => {
    hintStage++;
    if (hintStage >= MAX_HINTS) hintButton.style.display = 'none';
    renderHints();
});

document.addEventListener('languagechange', () => {
    if (league) render();
});

document.addEventListener('DOMContentLoaded', () => {
    loadLeague().catch(error => {
        console.error('Could not load the league data:', error);
        inputBox.disabled = true;
        hintButton.style.display = 'none';
        message = { kind: 'error', key: 'loadError' };
        renderMessage();
    });
});
