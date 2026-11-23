// Tests for games/guess-the-footballer/round.js. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRound, isWon, roundPoints, encodeRound, decodeRound } = require('../games/guess-the-footballer/round.js');

const kroupi = {
    id: 7, name: 'Eli Kroupi', team: 'Bournemouth', position: 'Forward', age: 20, number: 22,
    nationality: 'France', photo: 'https://media.api-sports.io/football/players/368030.png', tier: 1, searchName: 'eli kroupi',
};
const diakite = {
    id: 8, name: 'Bafodé Diakité', team: 'Bournemouth', position: 'Defender', age: 25, number: 18,
    nationality: 'France', photo: 'https://media.api-sports.io/football/players/162016.png', tier: 2,
};
const odegaard = { name: 'Martin Ødegaard', team: 'Arsenal', position: 'Midfielder', age: 26, number: 8, nationality: 'Norway', photo: 'images/ode.png' };

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

test('players without an ID and local photos survive the trip', () => {
    const decoded = decodeRound(encodeRound(round([odegaard], odegaard)));
    assert.equal(decoded.target.id, null);
    assert.equal(decoded.target.photo, 'images/ode.png');
    assert.equal(decoded.target.name, 'Martin Ødegaard');
});

test('the code is safe in a link and stays short', () => {
    const six = [diakite, odegaard, { ...diakite, id: 9 }, { ...diakite, id: 10 }, { ...diakite, id: 11 }, kroupi];
    const code = encodeRound(round(six, kroupi, ['team', 'age']));
    assert.match(code, /^[A-Za-z0-9_-]+$/);
    assert.ok(code.length < 1000, `${code.length} characters`);
});

test('a link cannot bring in pictures from other sites', () => {
    const edited = round([diakite], { ...kroupi, photo: 'https://example.com/anything.png' });
    assert.equal(decodeRound(encodeRound(edited)).target.photo, null);
    const climbing = round([diakite], { ...kroupi, photo: 'images/../../secret.png' });
    assert.equal(decodeRound(encodeRound(climbing)).target.photo, null);
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
    const future = Buffer.from(JSON.stringify([2, 'premier-league'])).toString('base64url');
    assert.equal(decodeRound(future), null);
    const outOfRange = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', 6, [], [[1]], [3]])).toString('base64url');
    assert.equal(decodeRound(outOfRange), null);
    const noLimit = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', null, [], [[1]], [0]])).toString('base64url');
    assert.equal(decodeRound(noLimit), null);
    const noName = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', 6, [], [[1, null]], [0]])).toString('base64url');
    assert.equal(decodeRound(noName), null);
});
