// Tests for games/guess-the-footballer/daily.js. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const daily = require('../games/guess-the-footballer/daily.js');

const DAY = '2026-12-01';
const record = (more = {}) => ({ day: DAY, userId: null, roundId: null, guesses: [1, 2], hints: ['team'], ...more });
const decide = (more = {}) => daily.decide({ day: DAY, userId: null, row: null, record: null, ...more });

test('a visitor who has not played today can start', () => {
    assert.deepEqual(decide(), { state: 'new' });
    assert.deepEqual(decide({ record: record({ day: '2026-11-30', code: 'abc' }) }), { state: 'new' });
});

test('a visitor goes on with the round, and plays it only once', () => {
    assert.deepEqual(decide({ record: record() }), { state: 'open', roundId: null, guesses: [1, 2], hints: ['team'], guest: true });
    assert.deepEqual(decide({ record: record({ code: 'abc' }) }), { state: 'done', code: 'abc', guest: true });
});

test('an account goes on with its round only in the browser that has the guesses', () => {
    const row = { id: 'r1', finished_at: null, round_code: null };
    const mine = record({ userId: 'ana', roundId: 'r1' });
    assert.deepEqual(decide({ userId: 'ana', row, record: mine }), { state: 'open', roundId: 'r1', guesses: [1, 2], hints: ['team'] });
    assert.deepEqual(decide({ userId: 'ana', row }), { state: 'elsewhere' });
    assert.deepEqual(decide({ userId: 'ana', row, record: record() }), { state: 'elsewhere' });
});

test('a round that ended without reaching the database is sent again', () => {
    const row = { id: 'r1', finished_at: null, round_code: null };
    const mine = record({ userId: 'ana', roundId: 'r1', code: 'abc' });
    assert.deepEqual(decide({ userId: 'ana', row, record: mine }), { state: 'unsaved', code: 'abc', roundId: 'r1' });
});

test('a finished round comes from the account, whatever the browser remembers', () => {
    const row = { id: 'r1', finished_at: '2026-12-01T10:00:00Z', round_code: 'saved' };
    for (const mine of [null, record(), record({ userId: 'ana', roundId: 'r1', code: 'abc' })]) {
        assert.deepEqual(decide({ userId: 'ana', row, record: mine }), { state: 'done', code: 'saved' });
    }
});

test('a round begun without an account stays without one', () => {
    assert.equal(decide({ userId: 'ana', record: record() }).guest, true);
    assert.deepEqual(decide({ userId: 'ana', record: record({ code: 'abc' }) }), { state: 'done', code: 'abc', guest: true });
});

test("another account's round in this browser is not mine", () => {
    assert.deepEqual(decide({ userId: 'ben', record: record({ userId: 'ana', roundId: 'r1' }) }), { state: 'new' });
    assert.deepEqual(decide({ record: record({ userId: 'ana', roundId: 'r1' }) }), { state: 'signIn' });
});

test('the label of the day follows Romania, not the computer', () => {
    assert.equal(daily.romanianDay(new Date('2026-12-01T21:59:59Z')), '2026-12-01');
    assert.equal(daily.romanianDay(new Date('2026-12-01T22:00:00Z')), '2026-12-02');
    assert.equal(daily.romanianDay(new Date('2027-06-01T21:00:00Z')), '2027-06-02'); // summer time
});

test('the day before crosses months and years', () => {
    assert.equal(daily.dayBefore('2027-03-01'), '2027-02-28');
    assert.equal(daily.dayBefore('2027-01-01'), '2026-12-31');
});

test('everyone gets the same choice on a day, and another on the next', () => {
    const list = ['a', 'b', 'c'];
    assert.equal(daily.pickOfDay(list, DAY), daily.pickOfDay([...list], DAY));
    const week = ['2026-12-01', '2026-12-02', '2026-12-03'].map(day => daily.pickOfDay(list, day));
    assert.equal(new Set(week).size, 3);
    assert.equal(daily.pickOfDay([], DAY), null);
});

test('the time left is written as a clock and never below zero', () => {
    assert.equal(daily.timeLeft(0), '00:00:00');
    assert.equal(daily.timeLeft(-5000), '00:00:00');
    assert.equal(daily.timeLeft(1), '00:00:01');
    assert.equal(daily.timeLeft(59_000), '00:00:59');
    assert.equal(daily.timeLeft(3_600_000), '01:00:00');
    assert.equal(daily.timeLeft(86_399_000), '23:59:59');
});
