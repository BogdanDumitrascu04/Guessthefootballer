// The colours and the code come from badge.js; the cards only add the stadium at night.
const { palette } = clubBadges;

// White and black say nothing about a club at night, and a dark yellow turns brown.
function stageTint(names) {
    const name = names.find(n => !['White', 'Black', 'Yellow', 'Gold', 'Orange'].includes(n))
        ?? names.find(n => n === 'Orange');
    return name ? palette[name] : '#4a5872';
}

// Same hue, brought down to floodlit-grass darkness: mixing a pale colour with black would only give grey.
function atNight(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const hue = chroma === 0 ? 0
        : max === r ? ((g - b) / chroma + 6) % 6
            : max === g ? (b - r) / chroma + 2
                : (r - g) / chroma + 4;
    const saturation = chroma / (1 - Math.abs(max + min - 1));
    return `hsl(${Math.round(hue * 60)} ${Math.round(Math.min(Math.max(saturation, 0.22), 0.72) * 100)}% 33%)`;
}

export function clubTheme(names) {
    return { ...clubBadges.theme(names), stage: atNight(stageTint(names)) };
}
