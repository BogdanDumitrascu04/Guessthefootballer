// A finished round as a short text that fits in a link. It keeps only what happened; whether the
// round was won, the colours and the points are worked out from it. Each player carries what was
// shown during the round, so a later transfer or birthday does not change an old round.
const ROUND_VERSION = 1; // bump when the format changes, and keep reading the old versions
const PLAYER_FIELDS = ['id', 'name', 'team', 'position', 'age', 'number', 'nationality', 'photo'];
const AF_PHOTO = /^https:\/\/media\.api-sports\.io\/football\/players\/(\d+)\.png$/; // most photos; storing the number halves the link
const LOCAL_PHOTO = /^images\/(?!.*\.\.)[\w./ -]+$/;

function snapshot(player) {
    return Object.fromEntries(PLAYER_FIELDS.map(key => [key, player[key] ?? null]));
}

function createRound({ league, season, difficulty, date, max, hints, target, guesses }) {
    const copy = snapshot(target);
    return {
        league,
        season,
        difficulty,
        date,
        max, // the attempt limit of that day: a later change of rules must not rewrite old rounds
        hints: [...hints],
        target: copy,
        // The winning guess is the target itself, so it is stored once and compared by identity.
        guesses: guesses.map(p => (p === target ? copy : snapshot(p))),
    };
}

function isWon(round) {
    return round.guesses[round.guesses.length - 1] === round.target;
}

function packPlayer(player) {
    return PLAYER_FIELDS.map(key => {
        const photo = key === 'photo' && player.photo ? player.photo.match(AF_PHOTO) : null;
        return photo ? Number(photo[1]) : player[key];
    });
}

function unpackPlayer(values) {
    const player = Object.fromEntries(PLAYER_FIELDS.map((key, i) => [key, values[i] ?? null]));
    // Anyone can edit a link, so only our own images and API-Football portraits are shown.
    if (Number.isInteger(player.photo)) player.photo = `https://media.api-sports.io/football/players/${player.photo}.png`;
    else if (!LOCAL_PHOTO.test(player.photo ?? '')) player.photo = null;
    return player;
}

// Base64url: links break on "+", "/" and "=".
function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
    const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

function encodeRound(round) {
    // Positions instead of field names keep the link short; the target is player 0.
    const players = [round.target, ...round.guesses.filter(p => p !== round.target)];
    const order = round.guesses.map(p => players.indexOf(p));
    const packed = [
        ROUND_VERSION, round.league, round.season, round.difficulty, round.date, round.max, round.hints, players.map(packPlayer), order,
    ];
    return toBase64Url(JSON.stringify(packed));
}

// Links are typed, cut and pasted by people, so anything unreadable gives null instead of an error.
function decodeRound(code) {
    try {
        const [version, league, season, difficulty, date, max, hints, players, order] = JSON.parse(fromBase64Url(code));
        if (version !== ROUND_VERSION || !Array.isArray(players) || !players.length || !Array.isArray(order)) return null;
        if (!players.every(p => Array.isArray(p) && typeof p[1] === 'string' && p[1])) return null; // every player needs a name
        if (!Number.isInteger(max) || max < 1 || !Array.isArray(hints) || order.some(i => !Number.isInteger(i) || i < 0 || i >= players.length)) return null;
        const unpacked = players.map(unpackPlayer);
        return { league, season, difficulty, date, max, hints, target: unpacked[0], guesses: order.map(i => unpacked[i]) };
    } catch {
        return null;
    }
}

if (typeof module !== 'undefined') module.exports = { createRound, isWon, encodeRound, decodeRound };
