// The screen before a round. Nothing is saved until its button is pressed, so opening or reloading the page
// is never an abandoned round. One name in the global space shared by the game's scripts.
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

    function create({ difficulty, attempts, onDifficulty, onStart }) {
        const card = el('div', 'reveal-unknown kickoff-card', '?');
        card.setAttribute('aria-hidden', 'true');
        const text = el('div', 'kickoff-text');
        text.append(
            el('h2', '', t('kickoffTitle')),
            el('p', 'kickoff-intro', t('kickoffText', { n: attempts })),
            createOptions(difficulty, attempts, onDifficulty),
            el('p', 'kickoff-level', t(`${difficulty}Desc`)),
            button('start-button', t('startRound'), onStart),
            createAccountNote(),
        );
        return [card, text];
    }

    return { create };
})();
