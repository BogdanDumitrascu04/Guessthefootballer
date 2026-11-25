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

function createTeamLogo(team, className) {
    const badge = clubBadges.create(team);
    if (!badge) return document.createTextNode('');
    badge.classList.add(className);
    return badge;
}

function createReveal(player, teams) {
    const card = document.createElement('div');
    card.className = 'reveal';
    if (hasPortrait(player, teams)) {
        const photo = document.createElement('img');
        photo.className = 'reveal-photo';
        photo.src = asset(player.photo);
        photo.alt = player.name;
        card.appendChild(photo);
    } else {
        card.appendChild(createTeamLogo(player.team, 'reveal-badge'));
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
    if (key === 'team' && !hidden) body.appendChild(createTeamLogo(player.team, 'tile-logo'));

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

// The opening clue: the game and the result page write the same sentence from the same fact.
const CLUE_WHEN = { summer: 'whenSummer', winter: 'whenWinter', year: 'whenYear' };

function clueMoney([min, max]) {
    if (!min) return t('moneyUnder', { max });
    if (max == null) return t('moneyOver', { min });
    return t('moneyRange', { min, max });
}

function clueCountry(code) {
    if (String(code).startsWith('GB-')) return t(`nation_${code}`); // England, Scotland... are not countries to the browser
    try {
        return new Intl.DisplayNames([currentLanguage], { type: 'region' }).of(code);
    } catch {
        return code;
    }
}

function clueHeight(cm) {
    return `${(cm / 100).toLocaleString(currentLanguage, { minimumFractionDigits: 2 })} m`;
}

const CLUE_TEXT = {
    transfer: c => t(c.league ? 'clueTransfer' : 'clueTransferNoLeague', {
        when: t(CLUE_WHEN[c.window] || 'whenYear', { year: c.year }), league: c.league, fee: clueMoney(c.fee),
    }),
    season: c => t('clueSeason', c),
    position: c => t('cluePosition', { detail: t(`pos_${c.detail}`) }),
    caps: c => t('clueCaps', c),
    peak: c => t('cluePeak', { value: clueMoney(c.value) }),
    contract: c => t('clueContract', c),
    body: c => [c.foot && t('clueFoot', { foot: t(`foot_${c.foot}`) }), c.height && t('clueHeight', { height: clueHeight(c.height) })]
        .filter(Boolean).join(' · '),
    born: c => t('clueBorn', { country: clueCountry(c.country) }),
};

function describeClue(clue) {
    const text = clue && CLUE_TEXT[clue.type];
    return text ? text(clue) : null;
}

// Stars are recognised by their careers, lesser-known players by curiosities (Bogdan's choice, 23 Nov 2026).
function clueTitle(difficulty) {
    return t(difficulty === 'hard' ? 'clueTrivia' : 'clueScout');
}

function createClueCard(clue, difficulty) {
    const text = describeClue(clue);
    if (!text) return null;
    const card = document.createElement('section');
    card.className = 'clue-card';
    const title = document.createElement('span');
    title.className = 'clue-title';
    title.textContent = `💡 ${clueTitle(difficulty)}`;
    const body = document.createElement('p');
    body.className = 'clue-text';
    body.textContent = text; // a clue can come from a link anyone can edit: text only, never HTML
    card.append(title, body);
    return card;
}
