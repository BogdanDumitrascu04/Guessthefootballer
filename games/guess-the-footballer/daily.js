// The player of the day: the same hidden player for everyone, chosen by the database (sql/daily_players.sql).
// What this browser has played of the day stays in localStorage, so a reload continues the round and a visitor without
// an account plays it once. One name in the global space shared by the game's scripts.
const daily = (() => {
    const RECORD_KEY = 'gtf-daily';
    const TIMEOUT = 8000; // ms; a paused database must not leave the page waiting for ever
    const DAY_LENGTH = 86_400_000;

    // A private window may refuse to store anything: the round is then played as usual, but a reload loses it.
    function readRecord() {
        try {
            return JSON.parse(localStorage.getItem(RECORD_KEY));
        } catch {
            return null;
        }
    }

    function writeRecord(record) {
        try {
            localStorage.setItem(RECORD_KEY, JSON.stringify(record));
        } catch (error) {
            console.warn('Round of the day not kept in this browser:', error.message);
        }
    }

    // Romania's date, like daily_date() in the database: for the labels only, the player always comes from the database.
    function romanianDay(now = new Date()) {
        const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
        return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
    }

    function dayBefore(day) {
        return new Date(Date.parse(day) - DAY_LENGTH).toISOString().slice(0, 10);
    }

    // Noon, because midnight belongs to another date in other time zones.
    function dateOf(day) {
        return new Date(`${day}T12:00:00`);
    }

    function timeLeft(ms) {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        return [seconds / 3600, (seconds / 60) % 60, seconds % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':');
    }

    // The same clue for everyone: chosen by the day, not at random.
    function pickOfDay(list, day) {
        return list.length ? list[Math.floor(Date.parse(day) / DAY_LENGTH) % list.length] : null;
    }

    // What to show for a day, from the account's row (null: none) and this browser's record (null: none).
    // guest: the round was begun without an account, so no account can have it.
    function decide({ day, userId, row, record }) {
        const mine = record?.day === day ? record : null;
        if (row?.finished_at) return { state: 'done', code: row.round_code };
        if (row) {
            if (mine?.roundId !== row.id) return { state: 'elsewhere' };
            if (mine.code) return { state: 'unsaved', code: mine.code, roundId: row.id };
            return { state: 'open', roundId: row.id, guesses: mine.guesses, hints: mine.hints };
        }
        if (!mine || (mine.userId && userId)) return { state: 'new' }; // the account has no round today, whoever played here
        if (mine.code) return { state: 'done', code: mine.code, guest: !mine.userId };
        if (mine.userId) return { state: 'signIn' };
        return { state: 'open', roundId: null, guesses: mine.guesses, hints: mine.hints, guest: true };
    }

    async function ask(query) {
        const { data, error } = await query.abortSignal(AbortSignal.timeout?.(TIMEOUT));
        if (error) throw error;
        return data;
    }

    function dayRow(day) {
        return ask(supabaseClient.from('daily_players').select('day, season_id, league_id, player_id').eq('day', day).maybeSingle());
    }

    function accountRow(day, userId) {
        return ask(supabaseClient.from('game_results').select('id, finished_at, round_code').eq('user_id', userId).eq('daily_on', day).maybeSingle());
    }

    function leagueOf(row) {
        return LEAGUES.find(league => league.code === row.league_id)?.slug;
    }

    // A round begun before midnight can still be ended for a while; the database says for how long.
    async function stillOpen(record, today) {
        if (!record || record.code || record.day >= today) return null;
        return (await ask(supabaseClient.rpc('daily_round_open', { daily_on: record.day }))) ? dayRow(record.day) : null;
    }

    // Null when the calendar has no player for today.
    async function load() {
        await accountReady;
        const userId = currentUser?.id ?? null;
        const now = await ask(supabaseClient.from('daily_today').select('day, season_id, league_id, player_id, seconds_left').maybeSingle());
        if (!now) return null;
        const record = readRecord();
        const unfinished = await stillOpen(record, now.day);
        const shown = unfinished ?? now;
        const row = userId ? await accountRow(shown.day, userId) : null;
        return {
            day: shown.day,
            season: shown.season_id,
            league: leagueOf(shown),
            playerId: shown.player_id,
            endsAt: unfinished ? 0 : Date.now() + now.seconds_left * 1000, // 0: the next player is already here
            userId,
            ...decide({ day: shown.day, userId, row, record }),
        };
    }

    // "moved": the page no longer shows what the database says (midnight, another tab), so it has to be loaded again.
    async function start(today) {
        const begin = round => writeRecord({ userId: today.userId, guesses: [], hints: [], ...round });
        const record = readRecord();
        if (!today.userId) {
            if (record?.day === today.day || Date.now() >= today.endsAt) return { moved: true };
            begin({ day: today.day, roundId: null });
            return { roundId: null };
        }
        const round = await ask(supabaseClient.rpc('start_daily_round').maybeSingle());
        if (!round) throw new Error('no player of the day');
        const playedHere = record?.roundId === round.round_id;
        if (!playedHere) begin({ day: round.day, roundId: round.round_id });
        return { roundId: round.round_id, moved: playedHere || Boolean(round.finished_at) || round.day !== today.day };
    }

    // A page left open over midnight must not write into the round that another tab has begun since.
    function update(day, changes) {
        const record = readRecord();
        if (record?.day === day) writeRecord({ ...record, ...changes });
    }

    function keep(day, guesses, hints) {
        update(day, { guesses: guesses.map(player => player.id), hints });
    }

    function finish(round) {
        const score = `${isWon(round) ? round.guesses.length : 'X'}/${round.max}`;
        update(round.date, { code: encodeRound(round), score });
    }

    // { name, team }, or null: the first day of the calendar has no day before it.
    async function yesterday(day) {
        const row = await dayRow(dayBefore(day));
        if (!row) return null;
        const { players } = await getJson(`data/seasons/${row.season_id}/${leagueOf(row)}.json`);
        return players.find(player => player.id === row.player_id) ?? null;
    }

    // Counts down to the next player, then offers it. It stops by itself once it is no longer on the page.
    function createCountdown(endsAt) {
        const box = document.createElement('span');
        const draw = () => {
            const left = endsAt - Date.now();
            if (left > 0) {
                box.textContent = t('dailyNext', { time: timeLeft(left) });
                return true;
            }
            const link = document.createElement('a');
            link.className = 'link-button';
            link.href = 'game.html?daily';
            link.textContent = t('dailyReady');
            box.replaceChildren(link);
            return false;
        };
        if (draw()) {
            const timer = setInterval(() => {
                if (!box.isConnected || !draw()) clearInterval(timer);
            }, 1000);
        }
        return box;
    }

    // The way in from the home page and the picker, with the date on its stub. It asks nothing from the database.
    function paintCards() {
        const day = romanianDay();
        const record = readRecord();
        const ownRecord = !record?.userId || !currentUser || record.userId === currentUser.id;
        const score = record?.day === day && ownRecord ? record.score : null;
        for (const card of document.querySelectorAll('.daily-card')) {
            card.querySelector('.daily-day').textContent = dateOf(day).getDate();
            card.querySelector('.daily-month').textContent = dateOf(day).toLocaleDateString(currentLanguage, { month: 'short' });
            card.querySelector('.daily-line').textContent = score ? t('dailyPlayed', { score }) : t('dailyTagline');
            card.querySelector('.daily-go').textContent = t(score ? 'dailySee' : 'play');
        }
    }

    if (typeof document !== 'undefined') {
        for (const event of ['DOMContentLoaded', 'languagechange', 'accountchange']) document.addEventListener(event, paintCards);
    }

    return { load, start, keep, finish, yesterday, createCountdown, dateOf, pickOfDay, timeLeft, decide, romanianDay, dayBefore };
})();

if (typeof module !== 'undefined') module.exports = daily;
