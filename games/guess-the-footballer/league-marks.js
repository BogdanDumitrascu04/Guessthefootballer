// The leagues' own marks: a season pass with the country's flag on its stub, instead of the leagues' logos.
// One name in the global space shared by the game's scripts; everything else stays inside.
const leagueMarks = (() => {
    const cross = (field, bar) => `
        <rect y="41" width="48" height="19" fill="${field}"/>
        <path d="M0,48.5H48v4.6H0zM21.7,41h4.6v19h-4.6z" fill="${bar}"/>`;
    const rows = colors => colors.map((color, i) => `<rect y="${41 + i * 6}" width="48" height="7" fill="${color}"/>`).join('');
    const columns = colors => colors.map((color, i) => `<rect x="${i * 16}" y="41" width="17" height="19" fill="${color}"/>`).join('');

    // flag: on the stub of the pass; tifo: the same flag as a CSS background, shown as a crowd holding up coloured cards.
    const MARKS = {
        'premier-league': {
            code: 'PL', country: 'GB-ENG', field: '#f3f5f9', ink: '#c8102e', glow: '#b51a33', flag: cross('#f3f5f9', '#c8102e'),
            tifo: 'linear-gradient(90deg, #0000 45%, #c8102e 45% 55%, #0000 55%), linear-gradient(#0000 36%, #c8102e 36% 64%, #0000 64%), #f3f5f9',
        },
        'la-liga': {
            code: 'LL', country: 'ES', field: '#b3121f', ink: '#ffd327', glow: '#b3261c', flag: rows(['#c60b1e', '#ffc400', '#c60b1e']),
            tifo: 'linear-gradient(#d3142a 28%, #ffc400 28% 72%, #d3142a 72%)',
        },
        bundesliga: {
            code: 'BL', country: 'DE', field: '#191c24', ink: '#ffce00', glow: '#7a5c0d', flag: rows(['#15181f', '#d8121a', '#ffce00']),
            tifo: 'linear-gradient(#454c5e 34%, #e0202a 34% 67%, #ffce00 67%)',
        },
        'serie-a': {
            code: 'SA', country: 'IT', field: '#0a6f3a', ink: '#ffffff', glow: '#0d7a45', flag: columns(['#0b8a43', '#f3f5f9', '#ce2b37']),
            tifo: 'linear-gradient(90deg, #12a552 34%, #f3f5f9 34% 67%, #dc3443 67%)',
        },
        'ligue-1': {
            code: 'L1', country: 'FR', field: '#1b3a92', ink: '#ffffff', glow: '#2a4fc0', flag: columns(['#1f3f9e', '#f3f5f9', '#e1303f']),
            tifo: 'linear-gradient(90deg, #3560d8 34%, #f3f5f9 34% 67%, #ea4453 67%)',
        },
    };
    const PASS = 'M6,1H42a5,5 0 0 1 5,5V37.5a4,4 0 0 0 0,8V54a5,5 0 0 1 -5,5H6a5,5 0 0 1 -5,-5V45.5a4,4 0 0 0 0,-8V6a5,5 0 0 1 5,-5Z';
    const SLOT = 'M18.6,5H29.4a1.7,1.7 0 0 1 0,3.4H18.6a1.7,1.7 0 0 1 0,-3.4Z'; // where the lanyard goes through
    let drawn = 0;

    // Decoration only: the league's name is always written next to its mark.
    function create(leagueId) {
        if (!Object.hasOwn(MARKS, leagueId)) return null; // a link can name a league that does not exist
        const { code, field, ink, flag } = MARKS[leagueId];
        const id = `league-mark-${++drawn}`;
        const holder = document.createElement('template');
        holder.innerHTML = `<svg class="league-mark" viewBox="0 0 48 60" aria-hidden="true">
            <defs>
                <clipPath id="${id}-shape"><path d="${PASS}${SLOT}" clip-rule="evenodd"/></clipPath>
                <linearGradient id="${id}-light" x2="0" y2="1">
                    <stop offset="0" stop-color="#fff" stop-opacity="0.2"/>
                    <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
                    <stop offset="1" stop-opacity="0.2"/>
                </linearGradient>
            </defs>
            <g clip-path="url(#${id}-shape)">
                <rect width="48" height="60" fill="${field}"/>${flag}
                <rect width="48" height="60" fill="url(#${id}-light)"/>
                <path d="M7,41.5H41" stroke="rgb(8 12 20 / 0.65)" stroke-width="1.5" stroke-dasharray="1.7 2" stroke-linecap="round"/>
            </g>
            <path d="${PASS}${SLOT}" fill="none" stroke="rgb(255 255 255 / 0.45)"/>
            <text x="24" y="34" fill="${ink}" text-anchor="middle" style="font: 700 29px var(--font-display)">${code}</text>
        </svg>`;
        return holder.content.firstElementChild;
    }

    // The league's colours for an element and what is inside it: the bar above a round, a card on the picker.
    function paint(element, leagueId) {
        if (!Object.hasOwn(MARKS, leagueId)) return;
        element.style.setProperty('--league-glow', MARKS[leagueId].glow);
        element.style.setProperty('--league-tifo', MARKS[leagueId].tifo);
    }

    // In the player's language; England is not a country to the browser.
    function country(leagueId) {
        if (!Object.hasOwn(MARKS, leagueId)) return '';
        const { country: code } = MARKS[leagueId];
        return code.startsWith('GB-') ? t(`nation_${code}`) : new Intl.DisplayNames([currentLanguage], { type: 'region' }).of(code);
    }

    // The home page writes its league links in HTML and gets only the marks from here.
    for (const link of document.querySelectorAll('[data-league]')) link.prepend(create(link.dataset.league) ?? '');

    return { create, paint, country };
})();
