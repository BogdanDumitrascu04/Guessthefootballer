// League / season / difficulty picker. Clicking a league card starts the game
// with the currently selected season and difficulty.
const ROOT = '../../';
const DIFFICULTIES = ['easy', 'medium', 'hard'];

let selectedSeason;
let selectedDifficulty = localStorage.getItem('gtf-difficulty') || 'medium';
if (!DIFFICULTIES.includes(selectedDifficulty)) selectedDifficulty = 'medium';

async function initPicker() {
    const manifest = await (await fetch(`${ROOT}data/manifest.json`)).json();
    selectedSeason = manifest.defaultSeason;

    const seasonRow = document.getElementById('seasonRow');
    for (const season of manifest.seasons) {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.textContent = season;
        btn.classList.toggle('selected', season === selectedSeason);
        btn.addEventListener('click', () => {
            selectedSeason = season;
            seasonRow.querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
        seasonRow.appendChild(btn);
    }

    const difficultyRow = document.getElementById('difficultyRow');
    for (const diff of DIFFICULTIES) {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.dataset.difficulty = diff;
        btn.classList.toggle('selected', diff === selectedDifficulty);
        btn.addEventListener('click', () => {
            selectedDifficulty = diff;
            localStorage.setItem('gtf-difficulty', diff);
            difficultyRow.querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
        difficultyRow.appendChild(btn);
    }
    renderDifficultyLabels();

    const leagueGrid = document.getElementById('leagueGrid');
    for (const league of manifest.leagues) {
        const card = document.createElement('button');
        card.className = 'league-card';
        card.innerHTML = `<img src="${ROOT}${league.logo}" alt="${league.name}"><span>${league.name}</span>`;
        card.addEventListener('click', () => {
            location.href = `game.html?league=${league.id}&season=${selectedSeason}&difficulty=${selectedDifficulty}`;
        });
        leagueGrid.appendChild(card);
    }

    // populate the burger menu with the same leagues
    const menu = document.getElementById('menuContent');
    for (const league of manifest.leagues) {
        const a = document.createElement('a');
        a.href = `game.html?league=${league.id}&season=${manifest.defaultSeason}&difficulty=${selectedDifficulty}`;
        a.textContent = league.name;
        menu.appendChild(a);
    }
    const hub = document.createElement('a');
    hub.href = '../../index.html';
    hub.setAttribute('data-translate', 'allGames');
    hub.textContent = t('allGames');
    menu.appendChild(hub);
}

function renderDifficultyLabels() {
    document.querySelectorAll('#difficultyRow .option-button').forEach(btn => {
        const diff = btn.dataset.difficulty;
        btn.innerHTML = `${t(diff)}<small>${t(diff + 'Desc')}</small>`;
    });
}
document.addEventListener('languagechange', renderDifficultyLabels);

document.addEventListener('DOMContentLoaded', initPicker);
