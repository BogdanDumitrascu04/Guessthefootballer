// Guess the Footballer — game engine.
// One engine for every league/season: reads ?league=&season=&difficulty= from the
// URL and loads the matching JSON from data/seasons/<season>/<league>.json.
const ROOT = '../../';
const MAX_ATTEMPTS = 10;
// difficulty → tiers the hidden player may come from (1 star, 2 regular, 3 deep squad)
const TARGET_TIERS = { easy: [1], medium: [1, 2], hard: [2, 3] };

const params = new URLSearchParams(location.search);
const requestedLeague = params.get('league') || 'premier-league';
const requestedSeason = params.get('season');
const difficulty = TARGET_TIERS[params.get('difficulty')] ? params.get('difficulty') : 'medium';

let league, players, targetPool, targetPlayer;
let attempt = 0;
let hintStage = 0;

const inputBox = document.getElementById('guessInput');
const resultsBox = document.querySelector('.result-box');
const feedback = document.getElementById('feedback');
const playerInfo = document.getElementById('playerInfo');
const hintButton = document.getElementById('hintButton');
const hintDiv = document.getElementById('hint');
const restartContainer = document.getElementById('restartContainer');

async function loadLeague() {
    const manifest = await (await fetch(`${ROOT}data/manifest.json`)).json();
    const info = manifest.leagues.find(l => l.id === requestedLeague) || manifest.leagues[0];
    const season = info.seasons.includes(requestedSeason) ? requestedSeason : manifest.defaultSeason;
    league = await (await fetch(`${ROOT}data/seasons/${season}/${info.id}.json`)).json();
    league.info = info;
    league.seasonUsed = season;
    players = league.players;
    targetPool = players.filter(p => TARGET_TIERS[difficulty].includes(p.tier));
    if (!targetPool.length) targetPool = players;

    document.title = `${info.name} ${season} — Guess the Footballer`;
    document.documentElement.style.setProperty('--league-bg', `url('${ROOT}${info.background}')`);
    document.getElementById('gameSubtitle').textContent = `${info.name} · ${season}`;
    const diffChip = document.getElementById('difficultyChip');
    diffChip.textContent = t(difficulty);
    diffChip.className = `difficulty-chip difficulty-${difficulty}`;
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
    attempt = 0;
    hintStage = 0;
    targetPlayer = targetPool[Math.floor(Math.random() * targetPool.length)];
    inputBox.disabled = false;
    inputBox.value = '';
    feedback.innerHTML = '';
    playerInfo.innerHTML = '';
    hintDiv.innerHTML = '';
    restartContainer.innerHTML = '';
    hintButton.style.display = '';
}

function findPlayerByName(name) {
    return players.find(p => p.name.toLowerCase() === name.toLowerCase());
}

// --- autocomplete -----------------------------------------------------------
inputBox.addEventListener('input', () => {
    const input = inputBox.value.toLowerCase().trim();
    if (!input) { resultsBox.innerHTML = ''; return; }
    const matches = players.filter(p => p.name.toLowerCase().includes(input));
    resultsBox.innerHTML = matches.length
        ? `<ul>${matches.map(p => `
            <li data-name="${p.name}">
                <img src="${ROOT}${p.photo}" alt="" class="player-logo-small">
                <span>${p.name}</span>
                <img src="${ROOT}${league.teams[p.team]}" alt="${p.team} logo" class="team-logo-small">
            </li>`).join('')}</ul>`
        : '';
});

resultsBox.addEventListener('click', event => {
    const li = event.target.closest('li[data-name]');
    if (!li) return;
    inputBox.value = li.dataset.name;
    resultsBox.innerHTML = '';
    checkGuess();
});

inputBox.addEventListener('keypress', e => {
    if (e.key === 'Enter') checkGuess();
});

// --- game logic --------------------------------------------------------------
function checkGuess() {
    const guessedPlayer = findPlayerByName(inputBox.value.trim());
    if (!guessedPlayer) {
        feedback.style.color = 'white';
        feedback.innerHTML = `<strong>${t('notFound')}</strong>`;
        return; // typos don't consume attempts
    }
    attempt++;
    resultsBox.innerHTML = '';

    if (guessedPlayer.name === targetPlayer.name) {
        feedback.style.color = 'green';
        feedback.innerHTML = `<strong>${t('congrats')}<br><br>${revealPhoto()}</strong>`;
        endRound();
    } else if (attempt >= MAX_ATTEMPTS) {
        displayComparison(guessedPlayer);
        feedback.style.color = 'white';
        feedback.innerHTML = `<strong>${t('gameOver', { name: targetPlayer.name })}</strong><br><br>${revealPhoto()}`;
        endRound();
    } else {
        displayComparison(guessedPlayer);
        feedback.style.color = 'red';
        feedback.innerHTML = `<strong>${t('incorrect', { n: MAX_ATTEMPTS - attempt })}</strong>`;
        inputBox.value = '';
    }
}

function revealPhoto() {
    return `<img src="${ROOT}${targetPlayer.photo}" alt="${targetPlayer.name}" style="max-width: 100%; height: auto; border-radius: 10px;">`;
}

function endRound() {
    inputBox.disabled = true;
    inputBox.value = '';
    playerInfo.innerHTML = '';
    hintDiv.innerHTML = '';
    hintButton.style.display = 'none';
    const restartButton = document.createElement('button');
    restartButton.textContent = t('restart');
    restartButton.addEventListener('click', startRound);
    restartContainer.appendChild(restartButton);
}

function displayComparison(player) {
    playerInfo.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'player-card';
    const details = [
        { key: 'team', label: t('team') },
        { key: 'position', label: t('position') },
        { key: 'age', label: t('age'), numeric: true },
        { key: 'number', label: t('number'), numeric: true },
        { key: 'nationality', label: t('nationality') },
    ];
    for (const detail of details) {
        const row = document.createElement('div');
        row.className = 'player-detail';
        const label = document.createElement('label');
        label.textContent = `${detail.label}:`;
        const span = document.createElement('span');
        let value = player[detail.key];
        if (value === targetPlayer[detail.key]) {
            row.classList.add('match');
        } else if (detail.numeric) {
            value += value < targetPlayer[detail.key] ? ' ↑' : ' ↓';
        }
        span.textContent = value;
        row.append(label, span);
        card.appendChild(row);
    }
    playerInfo.appendChild(card);
}

// --- hints (club, then age) --------------------------------------------------
hintButton.addEventListener('click', () => {
    hintStage++;
    hintDiv.style.color = 'white';
    if (hintStage === 1) {
        hintDiv.innerHTML = `<strong>${t('hintTeam', { team: targetPlayer.team })}</strong>`;
    } else {
        hintDiv.innerHTML += `<br><strong>${t('hintAge', { age: targetPlayer.age })}</strong>`;
        hintStage = 0;
    }
});

document.addEventListener('DOMContentLoaded', loadLeague);
