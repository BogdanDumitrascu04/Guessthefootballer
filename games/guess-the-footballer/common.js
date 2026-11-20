// Loading and drawing shared by the game and the result page, so a guess looks the same on both.
const ROOT = '../../';
const ATTRIBUTES = [
    { key: 'team' },
    { key: 'position' },
    { key: 'age', numeric: true },
    { key: 'number', numeric: true },
    { key: 'nationality' },
];

// Data changes when a season is rebuilt, so the browser must check for a newer copy instead of reusing its cache.
async function getJson(path) {
    const response = await fetch(`${ROOT}${path}`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
}

// Older seasons use local images, newer ones full URLs.
function asset(path) {
    return /^https?:/.test(path) ? path : `${ROOT}${path}`;
}

// Older seasons repeat the club badge as "photo" for players without a portrait.
function hasPortrait(player, teams) {
    return Boolean(player.photo) && player.photo !== teams[player.team];
}

function createAvatar(player, teams, hidden = false) {
    if (!hidden && hasPortrait(player, teams)) {
        const img = document.createElement('img');
        img.className = 'avatar';
        img.src = asset(player.photo);
        img.alt = '';
        return img;
    }
    const initials = document.createElement('span');
    initials.className = 'avatar';
    const words = player.name.split(' ');
    initials.textContent = hidden ? '?' : (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
    return initials;
}

// A result link can outlive a club's place in the league file, so a missing badge is left out.
function createTeamLogo(team, teams, className) {
    if (!teams[team]) return document.createTextNode('');
    const img = document.createElement('img');
    img.className = `logo-chip ${className}`;
    img.src = asset(teams[team]);
    img.alt = '';
    return img;
}

function createReveal(player, teams) {
    const card = document.createElement('div');
    card.className = 'reveal';
    const portrait = hasPortrait(player, teams);
    if (portrait || teams[player.team]) {
        const photo = document.createElement('img');
        photo.className = portrait ? 'reveal-photo' : 'reveal-photo logo-chip';
        photo.src = asset(portrait ? player.photo : teams[player.team]);
        photo.alt = player.name;
        card.appendChild(photo);
    }
    const name = document.createElement('div');
    name.className = 'reveal-name';
    name.textContent = player.name;
    const details = document.createElement('div');
    details.className = 'reveal-details';
    details.textContent = [player.team, player.position, player.number != null ? `#${player.number}` : null].filter(Boolean).join(' · ');
    card.append(name, details);
    return card;
}

// hidden: the result page keeps the answer's name back until the viewer asks for it.
function createAttempt(player, number, { target, teams, fresh = false, hidden = false }) {
    const row = document.createElement('div');
    row.className = fresh ? 'attempt fresh' : 'attempt';

    const who = document.createElement('div');
    who.className = 'attempt-player';
    const position = document.createElement('span');
    position.className = 'attempt-number';
    position.textContent = `${number}.`;
    const name = document.createElement('span');
    name.textContent = hidden ? '???' : player.name;
    who.append(position, createAvatar(player, teams, hidden), name);
    row.appendChild(who);

    ATTRIBUTES.forEach((attribute, i) => {
        const tile = createTile(player, attribute, target, teams, hidden);
        tile.style.setProperty('--i', i);
        row.appendChild(tile);
    });
    return row;
}

function isMatch(player, target, key) {
    return player[key] != null && player[key] === target[key];
}

// hidden: the winning row's values (club, age, number...) would give the name away, so only the ticks show.
function createTile(player, { key, numeric }, target, teams, hidden = false) {
    const tile = document.createElement('div');
    tile.className = `tile tile-${key}`;
    const label = document.createElement('span');
    label.className = 'tile-label';
    label.textContent = t(key);
    const body = document.createElement('span');
    body.className = 'tile-body';
    if (key === 'team' && !hidden) body.appendChild(createTeamLogo(player.team, teams, 'tile-logo'));

    const value = document.createElement('span');
    value.className = 'tile-value';
    const guessed = player[key];
    const wanted = target[key];
    if (guessed == null) {
        value.textContent = '—';
    } else if (hidden) {
        tile.classList.add('match');
        value.textContent = '✓';
    } else if (isMatch(player, target, key)) {
        tile.classList.add('match');
        value.textContent = `${guessed} ✓`;
    } else if (numeric && wanted != null) {
        value.textContent = `${guessed} ${guessed < wanted ? '↑' : '↓'}`;
    } else {
        value.textContent = guessed;
    }
    body.appendChild(value);
    tile.append(label, body);
    return tile;
}
