// Tests for games/guess-the-footballer/round.js. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRound, isWon, encodeRound, decodeRound } = require('../games/guess-the-footballer/round.js');

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
    return createRound({ league: 'premier-league', season: '2026-27', difficulty: 'easy', date: '2026-11-20', hints, target, guesses });
}

test('a won round reads back the same', () => {
    const decoded = decodeRound(encodeRound(round([diakite, kroupi], kroupi, ['team'])));
    assert.deepEqual(decoded, round([diakite, kroupi], kroupi, ['team']));
    assert.equal(isWon(decoded), true);
    assert.equal(decoded.guesses.length, 2);
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

test('a broken or unknown code gives null', () => {
    const code = encodeRound(round([kroupi]));
    assert.equal(decodeRound(''), null);
    assert.equal(decodeRound('not a round'), null);
    assert.equal(decodeRound(code.slice(0, 20)), null);
    const future = Buffer.from(JSON.stringify([2, 'premier-league'])).toString('base64url');
    assert.equal(decodeRound(future), null);
    const outOfRange = Buffer.from(JSON.stringify([1, 'premier-league', '2026-27', 'easy', '2026-11-20', [], [[1]], [3]])).toString('base64url');
    assert.equal(decodeRound(outOfRange), null);
});
