// One engine for every league and season: the URL decides which JSON file to load.
const MAX_ATTEMPTS = 6;
const MAX_SUGGESTIONS = 30;
// Tiers the hidden player may come from: 1 star, 2 regular, 3 deep squad.
const TARGET_TIERS = { easy: [1], medium: [1, 2], hard: [2, 3] };
// Each hint unlocks after this many guesses, so the game stays a deduction game.
const HINTS = [
    { key: 'team', after: 2 },
    { key: 'age', after: 4 },
];
// Facts for the opening clue, by difficulty; "body" (foot and height) is the fallback, since almost everyone has it.
const CLUES_BY_DIFFICULTY = {
    easy: ['transfer', 'season'],
    medium: ['transfer', 'season'],
    hard: ['position', 'caps', 'peak', 'contract', 'body', 'born'],
};
// Letters that Unicode normalization does not reduce to a plain one.
const SPECIAL_LETTERS = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i' };

const params = new URLSearchParams(location.search);
const requestedLeague = params.get('league') || 'premier-league';
const requestedSeason = params.get('season');
const dailyMode = params.has('daily'); // the league and the player then come from daily.js, and the round is an Easy one
let difficulty = dailyMode ? 'easy' : [params.get('difficulty'), localStorage.getItem('gtf-difficulty')].find(d => TARGET_TIERS[d]) ?? 'medium';

let league, players, targetPlayer;
let clues = {}; // player ID -> facts; seasons without a clues file simply have none
let currentClue = null;
let lastRound = null; // what the result page and the account receive
let roundStart = null; // the promise of this round's row in the account
let rowId = null; // that row, once it exists: leaving now would count as a loss
let started = false; // false: the screen before the round is shown
let saveState = null; // 'saving', 'saved', 'failed' or 'signedOut', shown under the points
let guesses = [];
const revealedHints = new Set();
let roundOver = false;
let message = null; // kept as a key, so it can be redrawn when the language changes
let highlighted = -1;
let animateLast = false; // only a new guess flips; redrawing for another language must not
let today = null; // the round of the day, as daily.js found it; null in every other round
let dailyState = 'loading'; // why the round of the day can or cannot be started, see kickoff.js
let startFailed = false;
let streak = 0; // days guessed in a row, known only with an account
let cardNote = null; // where the player's card stands after a saved round: { albumUrl } or { missing: true }
let yesterday = null; // the player of the day before

const kickoffBox = document.getElementById('kickoff');
const roundBox = document.getElementById('round');
const inputBox = document.getElementById('guessInput');
const resultsBox = document.querySelector('.result-box');
const lastGuessBox = document.getElementById('lastGuess');
const phone = matchMedia('(max-width: 640px)');
const touch = matchMedia('(pointer: coarse)');
const feedback = document.getElementById('feedback');
const playerInfo = document.getElementById('playerInfo');
const hintsBox = document.getElementById('hints');
const restartContainer = document.getElementById('restartContainer');
const outcomeBox = document.getElementById('outcome');
const revealBox = document.getElementById('reveal');
const attemptCounter = document.getElementById('attemptCounter');
const dayChip = document.getElementById('dayChip');
const nextBox = document.getElementById('dailyNext');

async function loadLeague() {
    const manifest = await getJson('data/manifest.json');
    if (dailyMode && !(await loadToday())) return buildNavbar(manifest, manifest.defaultSeason);
    const info = manifest.leagues.find(l => l.id === (today?.league ?? requestedLeague)) || manifest.leagues[0];
    const askedSeason = today?.season ?? requestedSeason;
    const season = info.seasons.includes(askedSeason) ? askedSeason : manifest.defaultSeason;
    league = await getJson(`data/seasons/${season}/${info.id}.json`);
    clues = (manifest.clueSeasons || []).includes(season)
        ? await getJson(`data/seasons/${season}/clues/${info.id}.json`).then(data => data.players, () => ({}))
        : {};
    await clubBadges.ready;
    league.info = info;
    league.seasonUsed = season;
    players = league.players;
    for (const p of players) p.searchName = normalize(p.name);

    showLeagueMark(info.id);
    buildNavbar(manifest, season);
    if (today) openDaily();
    else showKickoff();
    import('./album/reveal.js').then(album => album.preload(), () => {}); // the ticket is then ready when the round ends
}

// False when there is nobody to guess today: the database does not answer, or the calendar has no player.
async function loadToday() {
    render();
    try {
        today = await daily.load();
    } catch (error) {
        console.warn('Player of the day not loaded:', error.message);
    }
    if (!today) {
        dailyState = 'unavailable';
        render();
    }
    return Boolean(today);
}

function openDaily() {
    const target = players.find(p => p.id === today.playerId);
    const finished = today.code ? decodeRound(today.code) : null;
    dailyState = target && (finished || !today.code) ? today.state : 'unavailable';
    if (dailyState === 'open') return resumeDaily(target);
    if (finished && dailyState !== 'unavailable') showFinished(finished);
    else render();
    loadDailyFacts();
}

function buildNavbar(manifest, season) {
    const menu = document.getElementById('menuContent');
    menu.innerHTML = '';
    const day = document.createElement('a');
    day.href = 'game.html?daily';
    day.setAttribute('data-translate', 'daily');
    day.textContent = t('daily');
    menu.appendChild(day);
    for (const l of manifest.leagues) {
        const a = document.createElement('a');
        a.href = `game.html?league=${l.id}&season=${season}`;
        a.textContent = l.name;
        menu.appendChild(a);
    }
    const album = document.createElement('a');
    album.href = 'album.html';
    album.setAttribute('data-translate', 'album');
    album.textContent = t('album');
    menu.appendChild(album);
    const settings = document.createElement('a');
    settings.href = 'index.html';
    settings.setAttribute('data-translate', 'changeSettings');
    settings.textContent = t('changeSettings');
    menu.appendChild(settings);
    const hub = document.createElement('a');
    hub.href = '../../index.html';
    hub.setAttribute('data-translate', 'allGames');
    hub.textContent = t('allGames');
    menu.appendChild(hub);
}

function showKickoff() {
    started = false;
    render();
}

function setDifficulty(level) {
    difficulty = level;
    localStorage.setItem('gtf-difficulty', level);
    render();
    kickoffBox.querySelector('[aria-pressed="true"]').focus(); // drawing the screen again lost it
}

// The hidden player needs every clue; some players have no known number or age.
function pickTarget() {
    const complete = players.filter(p => p.number != null && p.age != null);
    const suited = complete.filter(p => TARGET_TIERS[difficulty].includes(p.tier));
    const pool = suited.length ? suited : complete;
    return pool[Math.floor(Math.random() * pool.length)];
}

function startRound() {
    const target = pickTarget();
    // Saved as soon as it starts, so leaving the page counts as a loss instead of erasing it.
    const start = saveRoundStart({ league: league.info.id, season: league.seasonUsed, difficulty });
    beginRound({ target, clue: pickClue(target), start });
}

// The round of the day waits for the database, which fixes the day and allows only one.
async function startDaily() {
    kickoffBox.querySelector('.start-button').disabled = true;
    try {
        const { roundId, moved } = await daily.start(today);
        if (moved) return location.reload();
        resumeDaily(players.find(p => p.id === today.playerId), roundId);
    } catch (error) {
        console.warn('Round of the day not started:', error.message);
        startFailed = true;
        render();
    }
}

// From the start, or from where a reload has interrupted it.
function resumeDaily(target, roundId = today.roundId) {
    const made = (today.guesses ?? []).map(id => players.find(p => p.id === id)).filter(Boolean);
    const clue = daily.pickOfDay(suitedClues(target), today.day);
    beginRound({ target, clue, start: Promise.resolve(roundId), made, hints: today.hints ?? [] });
}

function beginRound({ target, clue, start, made = [], hints = [] }) {
    started = true;
    guesses = [...made];
    lastRound = null;
    revealedHints.clear();
    for (const key of hints) revealedHints.add(key);
    roundOver = false;
    message = null;
    saveState = null;
    cardNote = null;
    rowId = null;
    targetPlayer = target;
    currentClue = clue;
    roundStart = start;
    start.then(id => {
        if (start === roundStart) rowId = id;
    }, () => {}); // a failure is reported when the round ends; an abandoned round has nobody to tell
    inputBox.disabled = false;
    inputBox.value = '';
    restartContainer.innerHTML = '';
    revealBox.replaceChildren();
    closeSuggestions();
    render();
    focusInput();
}

function suitedClues(player) {
    const facts = clues[player.id] || [];
    const suited = facts.filter(f => CLUES_BY_DIFFICULTY[difficulty].includes(f.type));
    return suited.length ? suited : facts.filter(f => f.type === 'body');
}

// A different fact each round, so the same player does not always open the same way.
function pickClue(player) {
    const pool = suitedClues(player);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// After a reload, the round of the day goes on from here.
function keepProgress() {
    if (today) daily.keep(today.day, guesses, [...revealedHints]);
}

function focusInput() {
    // On phones this would open the keyboard over the result of the guess.
    if (matchMedia('(pointer: fine)').matches) inputBox.focus();
}

// "Ødegaard" and "odegaard", "Alexander-Arnold" and "alexander arnold" must match.
function normalize(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[øæœßłđðþı]/g, letter => SPECIAL_LETTERS[letter])
        .replace(/['’.]/g, '')
        .replace(/-/g, ' ')
        .trim();
}

function findPlayerByName(name) {
    const wanted = normalize(name);
    return players.find(p => p.searchName === wanted);
}

// Autocomplete
function matchRank(player, input) {
    if (player.searchName === input) return -1;
    if (player.searchName.startsWith(input)) return 0;
    return ` ${player.searchName}`.includes(` ${input}`) ? 1 : 2; // a surname beats the middle of a word
}

function closeSuggestions() {
    resultsBox.innerHTML = '';
    highlighted = -1;
}

function showSuggestions() {
    closeSuggestions();
    const input = normalize(inputBox.value);
    if (!input) return;
    const matches = players
        .filter(p => p.searchName.includes(input) && !guesses.includes(p))
        .sort((a, b) => matchRank(a, input) - matchRank(b, input))
        .slice(0, MAX_SUGGESTIONS);
    if (!matches.length) return;

    const list = document.createElement('ul');
    for (const p of matches) {
        const li = document.createElement('li');
        li.dataset.name = p.name;
        const name = document.createElement('span');
        name.className = 'suggestion-name';
        name.textContent = p.name;
        const team = document.createElement('small');
        team.textContent = p.team;
        name.appendChild(team);
        li.append(createAvatar(p), name, createTeamLogo(p.team, 'team-logo-small'));
        list.appendChild(li);
    }
    resultsBox.appendChild(list);
    fitSuggestions();
    highlight(0, false); // Enter picks the highlighted name
}

function highlight(index, scroll = true) {
    const items = [...resultsBox.querySelectorAll('li')];
    highlighted = index;
    items.forEach((li, i) => li.classList.toggle('active', i === index));
    if (scroll) items[index]?.scrollIntoView({ block: 'nearest' });
}

inputBox.addEventListener('input', showSuggestions);

// With the keyboard open a phone keeps only what a guess needs: the clue, the last guess, the field and the names.
function setTyping(on) {
    document.body.classList.toggle('typing', on);
    renderClue();
    fitSuggestions();
}

function fitSuggestions() {
    if (!document.body.classList.contains('typing')) return;
    const room = (window.visualViewport?.height ?? innerHeight) - inputBox.getBoundingClientRect().bottom - 12;
    resultsBox.style.setProperty('--room', `${Math.max(104, Math.min(300, room))}px`);
}

inputBox.addEventListener('focus', () => {
    if (!phone.matches || !touch.matches || !started || roundOver) return;
    setTyping(true);
    requestAnimationFrame(() => scrollTo(0, 0));
});
inputBox.addEventListener('blur', () => setTyping(false));
window.visualViewport?.addEventListener('resize', fitSuggestions);

// A tap on a name must not close the keyboard.
resultsBox.addEventListener('mousedown', event => event.preventDefault());

resultsBox.addEventListener('click', event => {
    const li = event.target.closest('li[data-name]');
    if (!li) return;
    inputBox.value = li.dataset.name;
    checkGuess();
});

inputBox.addEventListener('keydown', event => {
    const items = [...resultsBox.querySelectorAll('li')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!items.length) return;
        if (event.key === 'ArrowDown') highlight((highlighted + 1) % items.length);
        else highlight(highlighted <= 0 ? items.length - 1 : highlighted - 1);
    } else if (event.key === 'Enter') {
        if (highlighted >= 0) inputBox.value = items[highlighted].dataset.name;
        checkGuess();
    } else if (event.key === 'Escape') {
        closeSuggestions();
    }
});

document.addEventListener('click', event => {
    if (!event.target.closest('.Guess')) closeSuggestions();
});

// Game logic
function checkGuess() {
    const guessedPlayer = findPlayerByName(inputBox.value);
    closeSuggestions();
    if (!guessedPlayer) {
        message = { kind: 'error', key: 'notFound' }; // typos don't consume attempts
        renderMessage();
        return;
    }
    if (guesses.includes(guessedPlayer)) {
        message = { kind: 'error', key: 'alreadyGuessed', params: { name: guessedPlayer.name } };
        inputBox.value = '';
        renderMessage();
        return;
    }

    guesses.push(guessedPlayer);
    animateLast = true;
    inputBox.value = '';
    keepProgress();
    if (guessedPlayer === targetPlayer || guesses.length >= MAX_ATTEMPTS) {
        endRound();
    } else {
        const left = MAX_ATTEMPTS - guesses.length;
        message = left === 1 ? { kind: 'error', key: 'incorrectLast' } : { kind: 'error', key: 'incorrect', params: { n: left } };
        focusInput();
    }
    render();
}

// The player's own calendar day, not the UTC one.
function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function endRound() {
    roundOver = true;
    lastRound = createRound({
        league: league.info.id,
        season: league.seasonUsed,
        difficulty,
        date: today?.day ?? localDate(),
        max: MAX_ATTEMPTS,
        hints: [...revealedHints],
        target: targetPlayer,
        guesses,
        clue: currentClue,
    });
    if (today) daily.finish(lastRound);
    revealAfter(saveRound(roundStart, lastRound), lastRound);
    showEnd();
}

// A round of the day that is already over: drawn again from its code, as on the result page.
function showFinished(round) {
    started = roundOver = true;
    lastRound = round;
    targetPlayer = round.target;
    guesses = round.guesses;
    currentClue = round.clue;
    if (dailyState === 'unsaved') { // the connection was lost at the end of the round
        roundStart = Promise.resolve(today.roundId);
        revealAfter(saveRound(roundStart, round), round);
    } else {
        if (today.guest) saveState = currentUser ? 'guest' : 'signedOut';
        else if (currentUser) {
            saveState = 'saved';
            loadCardNote(round);
        }
        showReveal();
    }
    showEnd();
    render();
}

function showEnd() {
    message = { kind: isWon(lastRound) ? 'success' : 'error' };
    inputBox.blur();
    inputBox.disabled = true;
    if (phone.matches) scrollTo(0, 0);
    const shareButton = document.createElement('button');
    shareButton.className = today ? 'primary-button' : 'secondary-button';
    shareButton.setAttribute('data-translate', 'shareShort');
    shareButton.textContent = t('shareShort');
    shareButton.addEventListener('click', () => shareResult(shareButton));
    if (today) {
        const play = document.createElement('a');
        play.className = 'secondary-button';
        play.href = 'index.html';
        play.setAttribute('data-translate', 'resultPlay');
        play.textContent = t('resultPlay');
        restartContainer.replaceChildren(shareButton, play);
        return;
    }
    const restartButton = document.createElement('button');
    restartButton.className = 'primary-button';
    restartButton.setAttribute('data-translate', 'restart');
    restartButton.textContent = t('restart');
    restartButton.addEventListener('click', startRound);
    const changeButton = document.createElement('button');
    changeButton.className = 'link-button';
    changeButton.setAttribute('data-translate', 'changeDifficulty');
    changeButton.textContent = t('changeDifficulty');
    changeButton.addEventListener('click', () => {
        showKickoff();
        kickoffBox.querySelector('.start-button').focus(); // the button just pressed is gone
        scrollTo(0, 0);
    });
    restartContainer.append(restartButton, shareButton, changeButton);
}

const CARD_WAIT = 3000; // ms; a slow connection must not hold the answer back for longer

// A saved win turns its card over in a window of its own; the same ticket in the page would spoil that moment.
function revealAfter(saved, round) {
    const show = () => {
        if (lastRound === round && !revealBox.hasChildNodes()) showReveal();
    };
    if (!isWon(round)) return show();
    saved.then(show);
    setTimeout(show, CARD_WAIT);
}

function showReveal() {
    const win = isWon(lastRound) ? { guesses: guesses.length, date: today ? daily.dateOf(today.day) : new Date() } : null;
    revealBox.replaceChildren(createReveal(targetPlayer, { season: league.seasonUsed, win, lost: !win, compact: phone.matches }));
}

async function saveRound(start, round) {
    const setState = state => {
        if (start !== roundStart) return; // "Restart" was pressed meanwhile: this message belongs to the old round
        saveState = state;
        renderMessage();
    };
    try {
        const roundId = await start;
        if (!roundId && currentUser) return setState(today ? 'guest' : null);
        if (!roundId) return setState('signedOut');
        setState('saving');
        await saveRoundEnd(roundId, round);
        setState('saved');
        if (today) loadDailyFacts();
        loadCardNote(round);
        if (isWon(round) && round.target.id) {
            // The round is saved either way; without its card the result still shows as before.
            await import('./album/round-win.js')
                .then(album => album.showRoundCard(round, roundId, () => lastRound === round))
                .catch(error => console.warn('Card not shown:', error.message));
        }
    } catch (error) {
        console.warn('Round not saved:', error.message);
        setState('failed');
    }
}

// An extra under the result: without it the round is still whole.
async function loadCardNote(round) {
    try {
        if (!round.target.id) return;
        const won = isWon(round);
        if (!won && (await hasCard(round.target.id))) return;
        const { findCard } = await import('./album/data.js');
        const found = await findCard(round.target, round.season);
        if (!found || lastRound !== round) return;
        cardNote = won ? { albumUrl: `album.html#/${found.league.id}/${found.clubId}` } : { missing: true };
        renderMessage();
    } catch (error) {
        console.warn('Card note not shown:', error.message);
    }
}

// Colours only, never names, so the text does not spoil the answer; the link opens the full round.
function shareText() {
    const won = isWon(lastRound);
    const rows = guesses.map(p => ATTRIBUTES.map(({ key }) => (isMatch(p, targetPlayer, key) ? '🟩' : '⬜')).join(''));
    const hints = lastRound.hints.length ? ` · 💡${lastRound.hints.length}` : '';
    const score = `${won ? guesses.length : 'X'}/${MAX_ATTEMPTS}${hints}`;
    // Everyone guesses the same player today, so this link leads to the round, not to a page with the answer in it.
    if (today) {
        const day = daily.dateOf(today.day).toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short', year: 'numeric' });
        return [
            `Guess the Footballer · ${t('daily')} · ${day}`,
            `${league.info.name} · ${score}${streak > 1 ? ` · 🔥${streak}` : ''}`,
            ...rows,
            new URL('game.html?daily', location.href).href,
        ].join('\n');
    }
    const link = new URL('result.html', location.href);
    link.searchParams.set('r', encodeRound(lastRound));
    return [
        `Guess the Footballer · ${league.info.name} ${league.seasonUsed} · ${t(difficulty)}`,
        `${score} · ${t('pointsLine', { n: roundPoints(lastRound) })}`,
        ...rows,
        link.href,
    ].join('\n');
}

async function shareResult(button) {
    const text = shareText();
    try {
        // Phones open their share sheet; desktops copy, because the Windows share sheet has few useful targets.
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            await navigator.share({ text });
            return;
        }
        await navigator.clipboard.writeText(text);
        button.textContent = t('copied');
    } catch (error) {
        if (error.name !== 'AbortError') window.prompt(t('share'), text);
    }
}

// Rendering
function renderHead() {
    const chip = document.getElementById('difficultyChip');
    chip.className = `difficulty-chip difficulty-${difficulty}`;
    chip.textContent = t(difficulty);
    chip.hidden = dailyMode && !today;
    const titles = (dailyMode ? [t('daily'), league?.info?.name] : [league.info.name, league.seasonUsed]).filter(Boolean);
    document.getElementById('gameSubtitle').textContent = titles.join(' · ');
    document.title = `${titles.join(' ')} — Guess the Footballer`;
    dayChip.hidden = !today;
    if (today) dayChip.textContent = daily.dateOf(today.day).toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short' });
}

function dailyFacts() {
    return { streak, yesterday, countdown: daily.createCountdown(today.endsAt) };
}

function createKickoff() {
    if (!dailyMode) return kickoff.create({ difficulty, attempts: MAX_ATTEMPTS, onDifficulty: setDifficulty, onStart: startRound });
    return kickoff.createDaily({
        state: dailyState,
        league: today && league?.info?.name,
        attempts: MAX_ATTEMPTS,
        failed: startFailed,
        facts: today && dailyFacts(),
        onStart: startDaily,
    });
}

// The streak and yesterday's player are extras: the page is shown without waiting for them.
async function loadDailyFacts() {
    const [stats, before] = await Promise.allSettled([
        currentUser ? loadDailyStats() : null,
        started || yesterday ? yesterday : daily.yesterday(today.day),
    ]);
    streak = stats.value?.current_streak ?? 0;
    yesterday = before.value ?? null;
    if (roundOver) renderMessage();
    else kickoffBox.querySelector('.daily-facts')?.replaceWith(kickoff.createFacts(dailyFacts()));
}

function render() {
    renderHead();
    kickoffBox.hidden = started;
    roundBox.hidden = attemptCounter.hidden = !started;
    if (!started) {
        kickoffBox.replaceChildren(...createKickoff());
        return;
    }
    outcomeBox.classList.toggle('over', roundOver);
    document.body.classList.toggle('round-over', roundOver);
    nextBox.replaceChildren(...(today && roundOver ? [daily.createCountdown(today.endsAt)] : []));
    attemptCounter.textContent = `${t('guesses')}: ${guesses.length}/${MAX_ATTEMPTS}`;
    renderClue();
    renderMessage();
    renderHints();
    renderAttempts();
}

function renderClue() {
    const card = createClueCard(currentClue, difficulty);
    document.getElementById('clue').replaceChildren(...(card ? [card] : []));
    const text = card?.querySelector('.clue-text');
    if (!text || !document.body.classList.contains('typing') || text.scrollHeight <= text.clientHeight + 2) return;
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'clue-more';
    more.textContent = '▾';
    more.setAttribute('aria-label', t('moreText'));
    more.addEventListener('mousedown', event => event.preventDefault()); // the keyboard stays open
    more.addEventListener('click', () => {
        card.classList.add('whole');
        more.remove();
        fitSuggestions();
    });
    card.append(more);
}

function renderMessage() {
    feedback.innerHTML = '';
    if (!message) return;
    feedback.className = `feedback-${message.kind}`;
    feedback.classList.toggle('attempts-left', ['incorrect', 'incorrectLast'].includes(message.key));
    if (!roundOver) {
        const text = document.createElement('strong');
        text.textContent = t(message.key, message.params);
        feedback.append(text);
        return;
    }
    const won = isWon(lastRound);
    addLine('end-title', won ? t('foundIn', { n: guesses.length }) : t('notFoundTitle'));
    addLine('end-name', targetPlayer.name);
    if (won) {
        addLine('points-earned', t('pointsLine', { n: roundPoints(lastRound) }));
        const sum = pointsSum(lastRound);
        if (sum) addLine('end-sum', sum);
    }
    if (today && streak) {
        const days = document.createElement('div');
        days.className = 'daily-streak';
        days.textContent = t('dailyStreak', { n: streak });
        feedback.append(days);
    }
    if (saveState) feedback.append(createSaveStatus());
    if (cardNote?.missing) addLine('end-sum', t('noNewCard'));
    if (cardNote?.albumUrl) {
        const link = document.createElement('a');
        link.className = 'end-album';
        link.href = cardNote.albumUrl;
        link.textContent = `${t('seeInAlbum')} ›`;
        feedback.append(link);
    }
}

function addLine(className, text) {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    feedback.append(line);
}

const SAVE_TEXT = { saving: 'roundSaving', saved: 'roundSaved', failed: 'roundNotSaved', signedOut: 'signInToSave', guest: 'dailyGuestRound' };

function createSaveStatus() {
    const status = document.createElement('div');
    status.className = `save-status save-${saveState}`;
    if (saveState !== 'signedOut') {
        status.textContent = t(SAVE_TEXT[saveState]);
        return status;
    }
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'link-button';
    link.textContent = t('signIn');
    link.addEventListener('click', signIn);
    status.append(`${t(SAVE_TEXT.signedOut)} `, link);
    return status;
}

function renderHints() {
    hintsBox.innerHTML = '';
    if (roundOver) return;
    for (const { key, after } of HINTS) hintsBox.appendChild(createHint(key, after));
}

function createHint(key, after) {
    const chip = document.createElement('button');
    chip.type = 'button';
    const label = document.createElement('span');
    label.className = 'hint-label';
    const value = document.createElement('span');
    value.className = 'hint-value';
    if (revealedHints.has(key)) {
        chip.className = 'hint-chip revealed';
        chip.disabled = true;
        label.textContent = t(key);
        if (key === 'team') value.appendChild(createTeamLogo(targetPlayer.team, 'hint-logo'));
        value.append(String(targetPlayer[key]));
    } else if (guesses.length >= after) {
        chip.className = 'hint-chip ready';
        label.textContent = `💡 ${t(key)}`;
        value.textContent = t('hintShow');
        chip.addEventListener('click', () => {
            revealedHints.add(key);
            keepProgress();
            renderHints();
        });
    } else {
        chip.className = 'hint-chip locked';
        chip.disabled = true;
        label.textContent = `🔒 ${t(key)}`;
        value.textContent = t('hintAfter', { n: after });
    }
    chip.append(label, value);
    return chip;
}

function renderAttempts() {
    const last = guesses.at(-1);
    lastGuessBox.replaceChildren(...(last && !roundOver ? [createAttempt(last, guesses.length, { target: targetPlayer, short: true })] : []));
    const fresh = animateLast;
    animateLast = false;
    playerInfo.innerHTML = '';
    for (let i = guesses.length - 1; i >= 0; i--) {
        const isNew = fresh && i === guesses.length - 1;
        playerInfo.appendChild(createAttempt(guesses[i], i + 1, { target: targetPlayer, fresh: isNew }));
    }
}

document.addEventListener('languagechange', () => {
    if (!players && !dailyMode) return;
    render();
    if (started && revealBox.hasChildNodes()) showReveal();
});

document.addEventListener('accountchange', () => {
    // Another account has another round of the day, or none.
    if (today && today.userId !== (currentUser?.id ?? null)) location.reload();
    else if (players && !started) render();
});

// A page closed by mistake would cost a player with an account the round, so the browser asks first.
// The round of the day goes on where it was left.
addEventListener('beforeunload', event => {
    if (started && !roundOver && rowId && !today) event.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
    loadLeague().catch(error => {
        console.error('Could not load the league data:', error);
        inputBox.disabled = true;
        kickoffBox.hidden = true;
        roundBox.hidden = false;
        message = { kind: 'error', key: 'loadError' };
        renderMessage();
    });
});
