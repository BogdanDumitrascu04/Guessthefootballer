import { svg } from './dom.js';
import { seededRandom } from './random.js';

let stamps = 0;

// Every hand stamps a little differently; the same card always keeps its own angle.
export function stampAngle(seed) {
    return -16 + Math.round(seededRandom(seed * 7 + 3)() * 20);
}

export function createStamp(guesses, date, seed) {
    const id = `stamp-${++stamps}`;
    return svg('svg', { class: 'stamp', viewBox: '0 0 120 120', 'aria-hidden': 'true' },
        svg('defs', {},
            svg('path', { id: `${id}-top`, d: 'M19,60 A41,41 0 0 1 101,60' }),
            svg('path', { id: `${id}-bottom`, d: 'M8.5,60 A51.5,51.5 0 0 0 111.5,60' }),
            // Uneven ink: without it the stamp looks printed, not pressed.
            svg('filter', { id: `${id}-ink`, x: '-5%', y: '-5%', width: '110%', height: '110%' },
                svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.55, numOctaves: 2, seed: seed % 97, result: 'grain' }),
                svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'grain', scale: 1.2, result: 'rough' }),
                svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.09, numOctaves: 3, seed: seed % 89, result: 'patches' }),
                svg('feColorMatrix', { in: 'patches', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.6 3.5', result: 'cover' }),
                svg('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }))),
        svg('g', { filter: `url(#${id}-ink)`, fill: 'none', stroke: 'currentColor' },
            svg('circle', { cx: 60, cy: 60, r: 56.5, 'stroke-width': 3 }),
            svg('circle', { cx: 60, cy: 60, r: 36.5, 'stroke-width': 1.6 }),
            svg('g', { fill: 'currentColor', stroke: 'none', 'text-anchor': 'middle' },
                svg('text', { class: 'stamp-arc' }, svg('textPath', { href: `#${id}-top`, startOffset: '50%' }, t('stampTop'))),
                svg('text', { class: 'stamp-arc' }, svg('textPath', { href: `#${id}-bottom`, startOffset: '50%' }, date.toUpperCase())),
                svg('text', { class: 'stamp-count', x: 60, y: 79.5 }, String(guesses)))));
}
