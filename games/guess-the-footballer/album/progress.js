import { el } from './dom.js';
import { tierName } from './text.js';

export function tally(cards, winOf) {
    const won = [0, 0, 0];
    const total = [0, 0, 0];
    for (const card of cards) {
        total[card.tier - 1]++;
        if (winOf(card.id)) won[card.tier - 1]++;
    }
    return { won, total };
}

const sum = list => list.reduce((a, b) => a + b, 0);

export function createBar({ won, total }, label) {
    const [done, all] = [sum(won), sum(total)];
    return el('div', { class: 'bar', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuenow': done, 'aria-valuemax': all, 'aria-valuetext': `${done}/${all}` },
        won.map((n, i) => el('span', { class: 'bar-part', 'data-tier': i + 1, style: { 'flex-basis': `${(n / all) * 100}%` } })));
}

// The bar keeps its parts and only changes their widths, so a new card makes it grow instead of jump.
export function updateBar(bar, { won, total }) {
    const [done, all] = [sum(won), sum(total)];
    bar.setAttribute('aria-valuenow', done);
    bar.setAttribute('aria-valuetext', `${done}/${all}`);
    won.forEach((n, i) => bar.children[i].style.setProperty('flex-basis', `${(n / all) * 100}%`));
}

export function createTierCounts({ won, total }) {
    return el('ul', { class: 'tier-counts' },
        won.map((n, i) => el('li', { 'data-tier': i + 1 },
            el('span', { class: 'swatch' }), ` ${tierName(i + 1)} `, el('b', {}, `${n}/${total[i]}`))),
        el('li', { class: 'stamp-legend' }, el('span', { 'aria-hidden': 'true' }, '3'), t('stampLegend')));
}
