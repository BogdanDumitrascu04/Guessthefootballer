// The clubs' own badges, drawn from their code and colours instead of their crests.
// One name in the global space shared by the game's scripts; everything else stays inside.
const clubBadges = (() => {
    // football-data.org only names the colours; these shades are ours, not the clubs' official ones.
    const PALETTE = {
        Red: '#c81e2e',
        White: '#f3f5f9',
        Claret: '#7c1f3f',
        'Sky Blue': '#7cc3ec',
        'Royal Blue': '#1f4bc0',
        Blue: '#1a5fc4',
        Black: '#15181f',
        'Navy Blue': '#1b2b62',
        Orange: '#ef7a1f',
        Purple: '#6a31a4',
        Crimson: '#a5182f',
        Green: '#0d7441',
        Yellow: '#ffd327',
        Maroon: '#7f1c2c',
        Brown: '#6e2d20',
        Violet: '#6d40ae',
        Gold: '#d6a327',
    };
    const INK = '#10141d';
    const PAPER = '#ffffff';
    const READABLE = 4.5; // WCAG AA for small text: the code must stay readable on a 24 px badge

    function luminance(hex) {
        const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function contrast(a, b) {
        const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (light + 0.05) / (dark + 0.05);
    }

    function readableOn(field, candidates) {
        return candidates.find(color => contrast(color, field) >= READABLE)
            ?? (contrast(PAPER, field) > contrast(INK, field) ? PAPER : INK);
    }

    function svg(tag, attributes, ...children) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
        node.append(...children.filter(Boolean));
        return node;
    }

    // A ticket stub: the same object as the cards, and a shape no club uses as its crest.
    const STUB = 'M6,1H46.5a4.2,4.2 0 0 0 8.4,0H58a5,5 0 0 1 5,5V36a5,5 0 0 1 -5,5H54.9a4.2,4.2 0 0 0 -8.4,0H6a5,5 0 0 1 -5,-5V6a5,5 0 0 1 5,-5Z';
    const TEAR = 50.7;
    let badges = 0;

    function drawBadge(club) {
        const [field, trim, accent = trim] = club.colors.map(name => PALETTE[name]);
        const ink = readableOn(field, [trim, accent, PAPER, INK]);
        const id = `badge-${++badges}`;
        const dark = contrast(field, '#0b1220') < 2 || contrast(trim, '#0b1220') < 2;
        return svg('svg', { class: 'badge', viewBox: '0 0 64 42', 'aria-hidden': 'true' },
            svg('defs', {},
                svg('clipPath', { id: `${id}-shape` }, svg('path', { d: STUB })),
                svg('linearGradient', { id: `${id}-light`, x2: 0, y2: 1 },
                    svg('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.2 }),
                    svg('stop', { offset: 0.5, 'stop-color': '#fff', 'stop-opacity': 0 }),
                    svg('stop', { offset: 1, 'stop-opacity': 0.2 }))),
            svg('g', { 'clip-path': `url(#${id}-shape)` },
                svg('rect', { width: 64, height: 42, fill: field }),
                svg('rect', { x: TEAR, width: 14, height: 42, fill: trim }),
                accent !== trim && svg('rect', { x: 58.2, width: 6, height: 42, fill: accent }),
                svg('rect', { width: 64, height: 42, fill: `url(#${id}-light)` }),
                svg('path', { d: `M${TEAR},7.4V35.6`, stroke: 'rgb(8 12 20 / 0.6)', 'stroke-width': 1.5, 'stroke-dasharray': '1.7 2', 'stroke-linecap': 'round' })),
            svg('path', { d: STUB, fill: 'none', stroke: dark ? 'rgb(255 255 255 / 0.5)' : 'rgb(8 12 20 / 0.35)', 'stroke-width': 1 }),
            svg('text', { class: 'badge-code', x: 25.6, y: 30.1, fill: ink, 'text-anchor': 'middle' }, club.code));
    }

    let clubs = {};
    // The game starts with or without its badges: a failed download only leaves them out.
    const ready = getJson('data/badges.json').then(data => { clubs = data; }, error => console.error('Could not load the badges:', error));

    // A result link can outlive a club's place in the data, so an unknown club has no badge.
    function create(team) {
        return Object.hasOwn(clubs, team) ? drawBadge(clubs[team]) : null;
    }

    return { ready, create };
})();
