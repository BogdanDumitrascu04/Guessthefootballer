// Tests for games/guess-the-footballer/round.js. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRound, isWon, roundPoints, pointsSum, encodeRound, decodeRound } = require('../games/guess-the-footballer/round.js');

const kroupi = {
    id: 7, name: 'Eli Kroupi', team: 'Bournemouth', position: 'Forward', age: 20, number: 22,
    nationality: 'France', photo: 'https://media.api-sports.io/football/players/368030.png', tier: 1, searchName: 'eli kroupi',
};
const diakite = {
    id: 8, name: 'Bafodé Diakité', team: 'Bournemouth', position: 'Defender', age: 25, number: 18,
    nationality: 'France', photo: 'https://media.api-sports.io/football/players/162016.png', tier: 2,
};
const odegaard = { name: 'Martin Ødegaard', team: 'Arsenal', position: 'Midfielder', age: 26, number: 8, nationality: 'Norway', photo: 'images/portraits/57/odegaard.webp' };

function round(guesses, target = kroupi, hints = []) {
    return createRound({ league: 'premier-league', season: '2026-27', difficulty: 'easy', date: '2026-11-20', max: 6, hints, target, guesses });
}

test('a won round reads back the same', () => {
    const decoded = decodeRound(encodeRound(round([diakite, kroupi], kroupi, ['team'])));
    assert.deepEqual(decoded, round([diakite, kroupi], kroupi, ['team']));
    assert.equal(isWon(decoded), true);
    assert.equal(decoded.guesses.length, 2);
    assert.equal(decoded.max, 6);
});

test('a lost round keeps the hidden player apart from the guesses', () => {
    const guesses = [diakite, odegaard];
    const decoded = decodeRound(encodeRound(round(guesses)));
    assert.equal(isWon(decoded), false);
    assert.equal(decoded.target.name, 'Eli Kroupi');
    assert.deepEqual(decoded.guesses.map(p => p.name), ['Bafodé Diakité', 'Martin Ødegaard']);
});

test('only the shown fields are kept, as they were during the round', () => {
    const player = { ...diakite };
    const saved = round([player], kroupi);
    player.team = 'Chelsea';
    player.age = 26;
    assert.equal(saved.guesses[0].team, 'Bournemouth');
    assert.equal(saved.guesses[0].age, 25);
    assert.equal('tier' in saved.target, false);
    assert.equal('searchName' in saved.target, false);
});

test('players without an ID and our own portraits survive the trip', () => {
    const decoded = decodeRound(encodeRound(round([odegaard], odegaard)));
    assert.equal(decoded.target.id, null);
    assert.equal(decoded.target.photo, 'images/portraits/57/odegaard.webp');
    assert.equal(decoded.target.name, 'Martin Ødegaard');
});

test('the code is safe in a link and stays short', () => {
    const six = [diakite, odegaard, { ...diakite, id: 9 }, { ...diakite, id: 10 }, { ...diakite, id: 11 }, kroupi];
    const code = encodeRound(round(six, kroupi, ['team', 'age']));
    assert.match(code, /^[A-Za-z0-9_-]+$/);
    assert.ok(code.length < 1000, `${code.length} characters`);
});

test('a link cannot bring in any picture but our own portraits', () => {
    const others = ['https://example.com/anything.png', kroupi.photo, 368030, 'images/leagues/LaLiga/Mbappe.png', 'images/portraits/../../secret.png'];
    for (const photo of others) {
        const packed = [2, 'premier-league', '2026-27', 'easy', '2026-11-25', 6, [], [[7, 'Eli Kroupi', 'Bournemouth', 'Forward', 20, 22, 'France', photo]], [0], null];
        assert.equal(decodeRound(Buffer.from(JSON.stringify(packed)).toString('base64url')).target.photo, null, String(photo));
    }
});

test('a round saved now carries no picture from another site', () => {
    const saved = round([diakite, kroupi]);
    assert.equal(saved.target.photo, null);
    assert.equal(saved.guesses[0].photo, null);
});

// n guesses, the last one right unless lost; the table agreed on 20 Nov 2026.
function played(n, difficulty, hints = [], won = true, max = 6) {
    const misses = Array.from({ length: won ? n - 1 : n }, (_, i) => ({ ...diakite, id: 100 + i }));
    const guesses = won ? [...misses, kroupi] : misses;
    return createRound({ league: 'premier-league', season: '2026-27', difficulty, date: '2026-11-20', max, hints, target: kroupi, guesses });
}

test('points follow the table: difficulty times the steps left', () => {
    assert.equal(roundPoints(played(1, 'easy')), 60);
    assert.equal(roundPoints(played(6, 'easy')), 10);
    assert.equal(roundPoints(played(4, 'medium')), 60); // the same as Easy at the 1st guess
    assert.equal(roundPoints(played(1, 'hard')), 240);
    assert.equal(roundPoints(played(4, 'hard')), 120);
});

test('each hint costs one step, but a win keeps at least one', () => {
    assert.equal(roundPoints(played(2, 'easy', ['team'])), 40);
    assert.equal(roundPoints(played(4, 'hard', ['team', 'age'])), 40);
    assert.equal(roundPoints(played(6, 'hard', ['team', 'age'])), 40);
});

test('a lost round or an unknown difficulty gives nothing', () => {
    assert.equal(roundPoints(played(6, 'hard', [], false)), 0);
    assert.equal(roundPoints(played(1, 'impossible')), 0);
    assert.equal(roundPoints(decodeRound(encodeRound(played(3, 'medium')))), 80);
});

// The database computes points too (sql/game_results.sql); tests/test_game_results.py checks it against the same table.
test('points match the table shared with the database', () => {
    for (const c of require('./points_cases.json')) {
        const round = played(c.guesses, c.difficulty, ['team', 'age'].slice(0, c.hints), c.won, c.max);
        assert.equal(roundPoints(round), c.points, JSON.stringify(c));
    }
});

test('a broken or unknown code gives null', () => {
    const code = encodeRound(round([kroupi]));
    assert.equal(decodeRound(''), null);
    assert.equal(decodeRound('not a round'), null);
    assert.equal(decodeRound(code.slice(0, 20)), null);
    const future = Buffer.from(JSON.stringify([3, 'premier-league'])).toString('base64url');
    assert.equal(decodeRound(future), null);
    const outOfRange = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', 6, [], [[1]], [3]])).toString('base64url');
    assert.equal(decodeRound(outOfRange), null);
    const noLimit = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', null, [], [[1]], [0]])).toString('base64url');
    assert.equal(decodeRound(noLimit), null);
    const noName = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', 6, [], [[1, null]], [0]])).toString('base64url');
    assert.equal(decodeRound(noName), null);
});

const scout = { type: 'transfer', window: 'summer', year: 2025, fee: [40, 70], league: 'Ligue 1' };

test('the opening clue travels with the round', () => {
    const played = createRound({ league: 'premier-league', season: '2026-27', difficulty: 'easy', date: '2026-11-23', max: 6, hints: [], target: kroupi, guesses: [kroupi], clue: scout });
    const decoded = decodeRound(encodeRound(played));
    assert.deepEqual(decoded.clue, scout);
    assert.deepEqual(decoded, played);
});

test('links made before the clue existed still open, without a clue', () => {
    const v1 = [1, 'premier-league', '2026-27', 'easy', '2026-11-20', 6, ['team'], [[7, 'Eli Kroupi', 'Bournemouth', 'Forward', 20, 22, 'France', 368030]], [0]];
    const decoded = decodeRound(Buffer.from(JSON.stringify(v1)).toString('base64url'));
    assert.equal(decoded.clue, null);
    assert.equal(decoded.target.name, 'Eli Kroupi');
    assert.equal(isWon(decoded), true);
});

// Made on 25 Nov 2026 by the code of commit 1a06fc3, while the game still had 2024-25 and its photos.
const LINK_2024_25 = 'WzIsInByZW1pZXItbGVhZ3VlIiwiMjAyNC0yNSIsImVhc3kiLCIyMDI2LTExLTIwIiw2LFsidGVhbSJdLFtbbnVsbCwiTWFydGluIE9kZWdhYXJkIiwiQXJzZW5hbCIsIk1pZGZpZWxkZXIiLDI1LDgsIk5vcndheSIsImltYWdlcy9sZWFndWVzL1ByZW1pZXJMZWFndWUvQXJzZW5hbC9PZGVnYWFyZC5wbmciXSxbbnVsbCwiTW9oYW1lZCBTYWxhaCIsIkxpdmVycG9vbCIsIkZvcndhcmQiLDMyLDExLCJFZ3lwdCIsImltYWdlcy9sZWFndWVzL1ByZW1pZXJMZWFndWUvTGl2ZXJwb29sL1NhbGFoLnBuZyJdLFtudWxsLCJEb21pbmlrIFN6b2Jvc3psYWkiLCJMaXZlcnBvb2wiLCJNaWRmaWVsZGVyIiwyMyw4LCJIdW5nYXJ5IiwiaW1hZ2VzL2xlYWd1ZXMvUHJlbWllckxlYWd1ZS9MaXZlcnBvb2wvU3pvYm9zemxhaS5wbmciXV0sWzEsMiwwXSxudWxsXQ';

test('a link to a 2024-25 round still opens, without its photos', () => {
    const decoded = decodeRound(LINK_2024_25);
    assert.equal(decoded.season, '2024-25');
    assert.equal(decoded.target.name, 'Martin Odegaard');
    assert.equal(decoded.target.id, null); // that season never had IDs
    assert.deepEqual(decoded.guesses.map(p => p.photo), [null, null, null]);
    assert.equal(isWon(decoded), true);
    assert.equal(roundPoints(decoded), 30);
});

test('an edited clue is dropped, the round still opens', () => {
    const base = [2, 'premier-league', '2026-27', 'easy', '2026-11-23', 6, [], [[7, 'Eli Kroupi']], [0]];
    for (const clue of [{ type: 'script', text: 'x' }, { type: 'caps', caps: { nested: 1 } }, ['transfer'], 'transfer']) {
        const decoded = decodeRound(Buffer.from(JSON.stringify([...base, clue])).toString('base64url'));
        assert.equal(decoded.clue, null);
        assert.equal(decoded.target.name, 'Eli Kroupi');
    }
});

test('the sum under the points agrees with them', () => {
    assert.equal(pointsSum(round([diakite, kroupi], kroupi, ['team'])), '60 − 2 × 10');
    assert.equal(roundPoints(round([diakite, kroupi], kroupi, ['team'])), 40);
    assert.equal(pointsSum(round([kroupi])), null);
    assert.equal(pointsSum(round([diakite])), null);
    const others = [diakite, odegaard, { ...diakite, id: 9 }, { ...diakite, id: 10 }, { ...diakite, id: 11 }];
    assert.equal(pointsSum(round([...others, kroupi], kroupi, ['team'])), null); // the minimum applied
});
