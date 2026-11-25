// The screen before a round, or before the round of the day. Nothing is saved until its button is pressed, so opening
// or reloading the page is never an abandoned round. One name in the global space shared by the game's scripts.
const kickoff = (() => {
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function button(className, text, onClick) {
        const node = el('button', className, text);
        node.type = 'button';
        node.addEventListener('click', onClick);
        return node;
    }

    function createOptions(selected, attempts, onDifficulty) {
        const group = el('div', 'difficulty-options');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', t('difficulty'));
        for (const [level, multiplier] of Object.entries(DIFFICULTY_MULTIPLIER)) {
            const option = button(`difficulty-option option-${level}`, undefined, () => onDifficulty(level));
            option.setAttribute('aria-pressed', String(level === selected));
            option.append(el('strong', '', t(level)), el('small', '', t('upToPoints', { n: POINT_STEP * multiplier * attempts })));
            group.append(option);
        }
        return group;
    }

    // Who is signed in is known only after the saved session is read: until then, neither sentence.
    function createAccountNote() {
        const note = el('p', 'kickoff-note');
        if (currentUser) note.textContent = t('kickoffCounts');
        else if (accountKnown) note.append(`${t('kickoffNoAccount')} `, button('link-button', t('signIn'), signIn));
        return note;
    }

    function createCard() {
        const card = el('div', 'reveal-unknown kickoff-card', '?');
        card.setAttribute('aria-hidden', 'true');
        return card;
    }

    function create({ difficulty, attempts, onDifficulty, onStart }) {
        const text = el('div', 'kickoff-text');
        text.append(
            el('h2', '', t('kickoffTitle')),
            el('p', 'kickoff-intro', t('kickoffText', { n: attempts })),
            createOptions(difficulty, attempts, onDifficulty),
            el('p', 'kickoff-level', t(`${difficulty}Desc`)),
            button('start-button', t('startRound'), onStart),
            createAccountNote(),
        );
        return [createCard(), text];
    }

    function createDailyNote() {
        const note = el('p', 'kickoff-note');
        if (currentUser) note.textContent = t('dailyCounts');
        else note.append(`${t('dailyNoAccount')} `, button('link-button', t('signIn'), signIn));
        return note;
    }

    const CANNOT_START = { loading: 'loading', unavailable: 'dailyUnavailable', elsewhere: 'dailyElsewhere', signIn: 'dailySignInToContinue' };

    // Why there is no start button, and what can be done instead.
    function createNoStart(state) {
        const note = el('p', 'kickoff-note daily-note', t(CANNOT_START[state]));
        if (state === 'signIn') note.append(' ', button('link-button', t('signIn'), signIn));
        if (state === 'unavailable') {
            const play = el('a', 'link-button', t('resultPlay'));
            play.href = 'index.html';
            note.append(' ', play);
        }
        return note;
    }

    // What the database still has to say (streak, yesterday's player) is added when it arrives.
    function createFacts({ streak, countdown, yesterday }) {
        const facts = el('ul', 'daily-facts');
        const add = content => {
            const item = el('li');
            item.append(content);
            facts.append(item);
        };
        if (streak) add(t('dailyStreak', { n: streak }));
        if (countdown) add(countdown);
        if (yesterday) add(t('dailyYesterday', { name: yesterday.name, team: yesterday.team }));
        return facts;
    }

    // state: what daily.js decided, or 'loading' / 'unavailable' while there is no player to play for.
    function createDaily({ state, league, attempts, failed, facts, onStart }) {
        const text = el('div', 'kickoff-text');
        text.append(el('h2', '', t('dailyQuestion')));
        const known = league && state !== 'unavailable';
        if (known) text.append(el('p', 'kickoff-intro', t('dailyText', { league, n: attempts })));
        if (state !== 'new') text.append(createNoStart(state));
        else {
            text.append(button('start-button', t('startRound'), onStart));
            if (failed) text.append(el('p', 'kickoff-note daily-failed', t('dailyStartFailed')));
            text.append(createDailyNote());
        }
        if (known) text.append(createFacts(facts));
        return [createCard(), text];
    }

    return { create, createDaily, createFacts };
})();
