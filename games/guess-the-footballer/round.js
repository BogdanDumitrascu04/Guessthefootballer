// A finished round as a short text that fits in a link. It keeps only what happened; whether the
// round was won, the colours and the points are worked out from it. Each player carries what was
// shown during the round, so a later transfer or birthday does not change an old round.
const ROUND_VERSION = 2; // bump when the format changes, and keep reading the old versions
const READABLE_VERSIONS = [1, 2]; // 2 added the opening clue
const CLUE_TYPES = ['transfer', 'season', 'position', 'caps', 'peak', 'contract', 'body', 'born'];
const PLAYER_FIELDS = ['id', 'name', 'team', 'position', 'age', 'number', 'nationality', 'photo'];
const OWN_PORTRAIT = /^images\/portraits\/(?!.*\.\.)[\w./ -]+$/;

// Old links carry pictures from other sites or folders, and anyone can edit a link: only our own portraits are kept.
function isOwnPortrait(photo) {
    return typeof photo === 'string' && OWN_PORTRAIT.test(photo);
}

function snapshot(player) {
    const copy = Object.fromEntries(PLAYER_FIELDS.map(key => [key, player[key] ?? null]));
    if (!isOwnPortrait(copy.photo)) copy.photo = null;
    return copy;
}

function createRound({ league, season, difficulty, date, max, hints, target, guesses, clue = null }) {
    const copy = snapshot(target);
    return {
        league,
        season,
        difficulty,
        date,
        max, // the attempt limit of that day: a later change of rules must not rewrite old rounds
        hints: [...hints],
        clue: clue ? { ...clue } : null, // the opening clue the player saw, so a friend sees it too
        target: copy,
        // The winning guess is the target itself, so it is stored once and compared by identity.
        guesses: guesses.map(p => (p === target ? copy : snapshot(p))),
    };
}

function isWon(round) {
    return round.guesses[round.guesses.length - 1] === round.target;
}

const POINT_STEP = 10;
const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 2, hard: 4 };

// Points come from the round, never from the browser's word: every extra guess or hint costs one step,
// and a win is worth at least one step. Easy at the 1st guess (60) equals Medium at the 4th.
function roundPoints(round) {
    const multiplier = DIFFICULTY_MULTIPLIER[round.difficulty];
    if (!isWon(round) || !multiplier) return 0;
    const steps = Math.max(1, round.max + 1 - round.guesses.length - round.hints.length);
    return POINT_STEP * multiplier * steps;
}

function packPlayer(player) {
    return PLAYER_FIELDS.map(key => player[key]);
}

function unpackPlayer(values) {
    return snapshot(Object.fromEntries(PLAYER_FIELDS.map((key, i) => [key, values[i]])));
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
        round.clue,
    ];
    return toBase64Url(JSON.stringify(packed));
}

// A clue from a link is shown as text only; anything that is not a known type with plain values is dropped.
function cleanClue(clue) {
    if (!clue || typeof clue !== 'object' || Array.isArray(clue) || !CLUE_TYPES.includes(clue.type)) return null;
    const plain = value => value === null || ['string', 'number'].includes(typeof value);
    const ok = Object.values(clue).every(v => plain(v) || (Array.isArray(v) && v.length === 2 && v.every(plain)));
    return ok ? clue : null;
}

// Links are typed, cut and pasted by people, so anything unreadable gives null instead of an error.
function decodeRound(code) {
    try {
        const [version, league, season, difficulty, date, max, hints, players, order, clue] = JSON.parse(fromBase64Url(code));
        if (!READABLE_VERSIONS.includes(version) || !Array.isArray(players) || !players.length || !Array.isArray(order)) return null;
        if (!players.every(p => Array.isArray(p) && typeof p[1] === 'string' && p[1])) return null; // every player needs a name
        if (!Number.isInteger(max) || max < 1 || !Array.isArray(hints) || order.some(i => !Number.isInteger(i) || i < 0 || i >= players.length)) return null;
        const unpacked = players.map(unpackPlayer);
        const opening = version >= 2 ? cleanClue(clue) : null;
        return { league, season, difficulty, date, max, hints, clue: opening, target: unpacked[0], guesses: order.map(i => unpacked[i]) };
    } catch {
        return null;
    }
}

if (typeof module !== 'undefined') module.exports = { createRound, isWon, roundPoints, encodeRound, decodeRound };
