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

function showLeagueMark(leagueId) {
    const mark = leagueMarks.create(leagueId);
    document.getElementById('leagueMark').replaceChildren(...(mark ? [mark] : []));
    leagueMarks.paint(document.documentElement, leagueId);
}

// The only switch for portraits: the clubs that agreed in writing to show their players. Empty: initials everywhere.
const PORTRAIT_CLUBS = [];

function hasPortrait(player) {
    return PORTRAIT_CLUBS.includes(player.team) && isOwnPortrait(player.photo);
}

// Namesakes in one league carry their club: "Raúl (Osasuna)".
function initialsOf(name) {
    const letters = name.replace(/\(.*\)/, '').split(' ').filter(Boolean).map(word => word[0]);
    return (letters.length > 1 ? letters[0] + letters.at(-1) : letters[0] ?? '?').toUpperCase();
}

function createAvatar(player, hidden = false) {
    if (!hidden && hasPortrait(player)) {
        const img = document.createElement('img');
        img.className = 'avatar';
        img.src = `${ROOT}${player.photo}`;
        img.alt = '';
        return img;
    }
    const initials = document.createElement('span');
    initials.className = 'avatar';
    initials.setAttribute('aria-hidden', 'true'); // the name is read out right after
    initials.textContent = hidden ? '?' : initialsOf(player.name);
    const colors = hidden ? null : clubBadges.themeOf(player.team);
    if (colors) {
        initials.classList.add('in-club-colours');
        for (const name of ['field', 'trim', 'ink']) initials.style.setProperty(`--${name}`, colors[name]);
    }
    return initials;
}

function createTeamLogo(team, className) {
    const badge = clubBadges.create(team);
    if (!badge) return document.createTextNode('');
    badge.classList.add(className);
    return badge;
}

function fillPlainReveal(card, player) {
    card.classList.add('reveal-plain');
    const name = document.createElement('div');
    name.className = 'reveal-name';
    name.textContent = player.name;
    const details = document.createElement('div');
    details.className = 'reveal-details';
    details.textContent = [player.team, shownValue('position', player.position), player.number != null ? `#${player.number}` : null].filter(Boolean).join(' · ');
    card.replaceChildren(createTeamLogo(player.team, 'reveal-badge'), name, details);
}

// The hidden player as his ticket from the album. Old seasons and players who have moved have none: there, the club's badge.
function createReveal(player, { season, win, lost = false, compact = false }) {
    const card = document.createElement('div');
    card.className = 'reveal';
    import('./album/reveal.js')
        .then(album => album.createRevealTicket(player, season, { win, lost, compact }))
        .catch(error => console.warn('Ticket not shown:', error.message))
        .then(ticket => (ticket ? card.replaceChildren(ticket) : fillPlainReveal(card, player)));
    return card;
}

// hidden: the result page keeps the answer's name back until the viewer asks for it.
function createAttempt(player, number, { target, fresh = false, hidden = false }) {
    const row = document.createElement('div');
    row.className = fresh ? 'attempt fresh' : 'attempt';

    const who = document.createElement('div');
    who.className = 'attempt-player';
    const position = document.createElement('span');
    position.className = 'attempt-number';
    position.textContent = `${number}.`;
    const name = document.createElement('span');
    name.textContent = hidden ? '???' : player.name;
    who.append(position, createAvatar(player, hidden), name);
    row.appendChild(who);

    ATTRIBUTES.forEach((attribute, i) => {
        const tile = createTile(player, attribute, target, hidden);
        tile.style.setProperty('--i', i);
        row.appendChild(tile);
    });
    return row;
}

// Countries are compared by code, because the same one can have two names in the data ("Congo DR", "DR Congo").
function compared(player, key) {
    return key === 'nationality' ? COUNTRY_CODES[player[key]] ?? player[key] : player[key];
}

function isMatch(player, target, key) {
    return player[key] != null && compared(player, key) === compared(target, key);
}

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward'];

// A value the dictionaries do not know (an edited link) is shown as it came.
function shownValue(key, value) {
    if (key === 'nationality' && Object.hasOwn(COUNTRY_CODES, value)) return clueCountry(COUNTRY_CODES[value]);
    const position = key === 'position' && String(value).toLowerCase();
    if (!POSITIONS.includes(position)) return value;
    const text = t(`pos_${position}`);
    return text[0].toUpperCase() + text.slice(1);
}

// hidden: the winning row's values (club, age, number...) would give the name away, so only the ticks show.
function createTile(player, { key, numeric }, target, hidden = false) {
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
        value.textContent = `${shownValue(key, guessed)} ✓`;
    } else if (numeric && wanted != null) {
        value.textContent = `${guessed} ${guessed < wanted ? '↑' : '↓'}`;
    } else {
        value.textContent = shownValue(key, guessed);
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
    const own = t(`nation_${code}`); // England, Scotland... are not countries to the browser, and some names are too long
    if (own !== `nation_${code}`) return own;
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
