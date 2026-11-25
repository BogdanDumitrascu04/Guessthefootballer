import { svg } from './dom.js';
import { SPOTS, ZONES, perspective, pitchPath } from './pitch.js';
import { seededRandom } from './random.js';

const WIDTH = 256;
const HEIGHT = 270;
const MIDDLE = WIDTH / 2;

const STAND = [40, 98];
const LIGHTS = [[13, 31], [243, 31]];
const project = perspective({ centerX: MIDDLE, near: [259, 268], far: [106, 150] });
let scenes = 0;

const points = list => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const band = (from, to) => [project(-34, from), project(34, from), project(34, to), project(-34, to)];
const layer = (className, ...children) => svg('svg', {
    class: `stage-layer ${className}`, viewBox: `0 0 ${WIDTH} ${HEIGHT}`, preserveAspectRatio: 'none', 'aria-hidden': 'true',
}, ...children);

// The lines are a mask, so the metal of the card shines through them.
export function pitchMask(strokeWidth, detailed) {
    const dots = detailed
        ? Object.values(SPOTS).map(([u, v]) => {
            const [x, y] = project(u, v);
            const r = project(u + 1, v)[0] - x;
            return `<ellipse cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' rx='${r.toFixed(1)}' ry='${(r * 0.55).toFixed(1)}' fill='#000' stroke='none'/>`;
        }).join('')
        : '';
    const markup = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${WIDTH} ${HEIGHT}' preserveAspectRatio='none' fill='none' stroke='#000' stroke-width='${strokeWidth}' stroke-linejoin='round'><path d='${pitchPath(project, detailed)}'/>${dots}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}

// Two waves with seeded rhythms give every player a different mosaic in the same two colours.
function crowd(seed, [top, bottom]) {
    const random = seededRandom(seed);
    const [fx, fy, px, py] = [0.022 + random() * 0.045, 0.05 + random() * 0.09, random() * 6.3, random() * 6.3];
    const groups = { field: '', trim: '', lamps: '' };
    const gangway = top + (bottom - top) * 0.52;
    for (let y = top + 1; y < bottom - 3; y += 4) {
        if (Math.abs(y - gangway) < 2.4) continue;
        for (let x = 1 + random() * 2; x < WIDTH; x += 3.5) {
            if (random() < 0.12) continue;
            const wave = Math.sin(x * fx + px + y * 0.05) + Math.sin(y * fy + py);
            const group = random() < 0.03 ? 'lamps' : wave > 0.35 ? 'trim' : 'field';
            groups[group] += `M${x.toFixed(1)},${(y + random() * 0.9).toFixed(1)}h2v2.2h-2z`;
        }
    }
    return groups;
}

export function createBackdrop(card, theme) {
    const id = `scene-${++scenes}`;
    const [top, bottom] = STAND;
    const people = crowd(card.id, [top, bottom]);
    const box = { x: 0, y: top - 4, width: WIDTH, height: bottom - top + 4 };
    return layer('stage-back',
        svg('defs', {},
            svg('linearGradient', { id: `${id}-depth`, x2: 0, y2: 1 },
                svg('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0.72 }),
                svg('stop', { offset: 0.35, 'stop-color': '#000', 'stop-opacity': 0.18 }),
                svg('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0 }))),
        svg('rect', { class: 'stand', ...box }),
        svg('path', { d: people.field, fill: theme.field, opacity: 0.8 }),
        svg('path', { d: people.trim, fill: theme.trim, opacity: 0.72 }),
        svg('path', { d: people.lamps, fill: '#fff' }),
        svg('rect', { ...box, fill: `url(#${id}-depth)` }),
        svg('rect', { class: 'roof', x: 0, y: top - 6, width: WIDTH, height: 3 }));
}

export function createGrass(compact) {
    const bottom = STAND[1];
    const stripes = Array.from({ length: 10 }, (_, i) => band(i * 10.5, (i + 1) * 10.5));
    return layer('stage-grass',
        svg('rect', { class: 'runoff', x: 0, y: bottom, width: WIDTH, height: HEIGHT - bottom }),
        !compact && svg('rect', { class: 'led', x: 0, y: bottom - 4, width: WIDTH, height: 4.4 }),
        !compact && svg('path', { class: 'led-text', d: `M0,${bottom - 1.8}H${WIDTH}` }),
        stripes.map((stripe, i) => svg('polygon', { class: i % 2 ? 'grass-b' : 'grass-a', points: points(stripe) })));
}

function target(spot) {
    if (SPOTS[spot]) {
        const [u, v] = SPOTS[spot];
        const [x, y] = project(u, v);
        return {
            x, y, exact: true,
            rx: project(u + 7, v)[0] - x,
            ry: Math.max((project(u, v - 5.2)[1] - project(u, v + 5.2)[1]) / 2, 4.6),
        };
    }
    const zone = band(...ZONES[spot]);
    const [x, y] = project(0, (ZONES[spot][0] + ZONES[spot][1]) / 2);
    return { x, y, rx: (zone[1][0] - zone[0][0]) / 2, zone, exact: false };
}

// Two floodlights meet exactly where the player plays; that crossing is the portrait of a card without a face.
export function createLight(card, compact) {
    const id = `light-${++scenes}`;
    const at = target(card.spot);
    const reach = i => {
        if (at.exact) return [[at.x + at.rx, at.y], [at.x - at.rx, at.y]];
        const [nearLeft, nearRight, farRight, farLeft] = at.zone;
        return i === 0 ? [farRight, nearRight, nearLeft] : [nearRight, nearLeft, farLeft];
    };
    const beams = LIGHTS.map(([x, y], i) => svg('polygon', {
        fill: `url(#${id}-beam-${i})`,
        points: points([[x, y - 3.5], ...reach(i), [x, y + 3.5]]),
    }));
    const pool = at.exact
        ? [
            svg('ellipse', { cx: at.x, cy: at.y, rx: at.rx * 6, ry: at.ry * 6, fill: `url(#${id}-halo)`, opacity: 0.3 }),
            svg('ellipse', { cx: at.x, cy: at.y, rx: at.rx * 2.2, ry: at.ry * 2.2, fill: `url(#${id}-halo)` }),
            svg('ellipse', { class: 'pool', cx: at.x, cy: at.y, rx: at.rx, ry: at.ry }),
            svg('ellipse', { class: 'pool-core', cx: at.x, cy: at.y, rx: at.rx * 0.36, ry: at.ry * 0.36 }),
        ]
        : [svg('polygon', { class: 'pool pool-zone', points: points(at.zone) })];
    return layer('stage-light',
        svg('defs', {},
            LIGHTS.map(([x, y], i) => svg('linearGradient', { id: `${id}-beam-${i}`, gradientUnits: 'userSpaceOnUse', x1: x, y1: y, x2: at.x, y2: at.y },
                svg('stop', { class: `beam-stop-${i}`, offset: 0, 'stop-opacity': 0.85 }),
                svg('stop', { class: `beam-stop-${i}`, offset: 0.4, 'stop-opacity': at.exact ? 0.42 : 0.2 }),
                svg('stop', { class: `beam-stop-${i}`, offset: 1, 'stop-opacity': at.exact ? 0.3 : 0.14 }))),
            svg('radialGradient', { id: `${id}-halo` },
                svg('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.8 }),
                svg('stop', { offset: 0.45, 'stop-color': '#fff', 'stop-opacity': 0.3 }),
                svg('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 })),
            svg('radialGradient', { id: `${id}-lamp` },
                svg('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }),
                svg('stop', { offset: 0.2, 'stop-color': '#fff', 'stop-opacity': 0.45 }),
                svg('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }))),
        beams,
        pool,
        LIGHTS.map(([x, y]) => [
            svg('circle', { cx: x, cy: y, r: compact ? 20 : 30, fill: `url(#${id}-lamp)`, opacity: 0.75 }),
            [-4.4, 0, 4.4].map(dx => [-2.4, 2.4].map(dy => svg('circle', { cx: x + dx, cy: y + dy, r: 1.7, fill: '#fff' }))),
        ]));
}

export function createEmptyPitch(spot) {
    const at = target(spot);
    return svg('svg', { class: 'empty-pitch', viewBox: `-9 98 ${WIDTH + 18} 166`, 'aria-hidden': 'true' },
        svg('path', { class: 'empty-lines', d: pitchPath(project, false) }),
        at.exact
            ? svg('ellipse', { class: 'empty-spot', cx: at.x, cy: at.y, rx: at.rx * 1.15, ry: at.ry * 1.3 })
            : svg('polygon', { class: 'empty-spot', points: points(at.zone) }));
}
