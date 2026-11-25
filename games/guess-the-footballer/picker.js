// The league is chosen here; the difficulty and the start wait on the game page.
const ROOT = '../../';
let manifest;
let selectedSeason;

function gameUrl(league) {
    return `game.html?league=${league.id}&season=${selectedSeason}`;
}

function renderLeagues() {
    document.getElementById('leagueGrid').replaceChildren(...manifest.leagues.map(league => {
        const card = document.createElement('a');
        card.className = 'league-card';
        card.href = gameUrl(league);
        leagueMarks.paint(card, league.id);
        const name = document.createElement('span');
        name.className = 'league-name';
        name.textContent = league.name;
        const country = document.createElement('span');
        country.className = 'league-country';
        country.textContent = leagueMarks.country(league.id);
        card.append(leagueMarks.create(league.id) ?? '', name, country);
        return card;
    }));
}

function renderSeasons() {
    const row = document.getElementById('seasonRow');
    const oneSeason = manifest.seasons.length < 2; // nothing to choose: the season becomes a note
    row.hidden = oneSeason;
    document.getElementById('seasonNote').textContent = oneSeason ? `${t('season')} ${selectedSeason}.` : '';
    row.replaceChildren(...manifest.seasons.map(season => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = season === selectedSeason ? 'option-button selected' : 'option-button';
        button.textContent = season === manifest.defaultSeason ? `${season} · ${t('currentSeason')}` : season;
        button.addEventListener('click', () => {
            selectedSeason = season;
            render();
        });
        return button;
    }));
}

function render() {
    renderSeasons();
    renderLeagues();
}

function buildMenu() {
    const menu = document.getElementById('menuContent');
    for (const league of manifest.leagues) {
        const link = document.createElement('a');
        link.href = gameUrl(league);
        link.textContent = league.name;
        menu.append(link);
    }
    const home = document.createElement('a');
    home.href = '../../index.html';
    home.setAttribute('data-translate', 'allGames');
    home.textContent = t('allGames');
    menu.append(home);
}

async function initPicker() {
    manifest = await (await fetch(`${ROOT}data/manifest.json`, { cache: 'no-cache' })).json();
    selectedSeason = manifest.defaultSeason;
    const [first, second, third] = manifest.leagues.map(league => leagueMarks.create(league.id));
    document.getElementById('stepLeagues').append(first, third, second);
    buildMenu();
    render();
}

document.addEventListener('languagechange', () => {
    if (manifest) render();
});

document.addEventListener('DOMContentLoaded', initPicker);
