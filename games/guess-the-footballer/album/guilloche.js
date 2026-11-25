// The fine wave printed on tickets against forgery. Each strand is the same curve, a little further along.
export function guillocheMask(width, height, strands = 18) {
    const paths = [];
    for (const [middle, swing, reach, wave] of [[0.3, 0.1, 0.3, 64], [0.78, -0.12, 0.26, 52]]) {
        for (let i = 0; i < strands; i++) {
            const shift = (i / strands) * 2 * Math.PI;
            let d = '';
            for (let x = -4; x <= width + 4; x += 3) {
                const centre = height * (middle + swing * Math.sin(x / 71));
                const spread = height * reach * (0.55 + 0.45 * Math.sin(x / 58 + middle * 9));
                d += `${d ? 'L' : 'M'}${x},${(centre + spread * 0.5 * Math.sin((x / wave) * 2 * Math.PI * 0.5 + shift)).toFixed(1)}`;
            }
            paths.push(d);
        }
    }
    const markup = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='none' fill='none' stroke='#000' stroke-width='.55'><path d='${paths.join('')}'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}

export function rosettePath(radius, strands = 16) {
    let d = '';
    for (let i = 0; i < strands; i++) {
        const shift = (i / strands) * 2 * Math.PI;
        for (let step = 0; step <= 180; step++) {
            const angle = (step / 180) * 2 * Math.PI;
            const r = radius * (0.66 + 0.2 * Math.sin(6 * angle + shift) + 0.14 * Math.sin(12 * angle - shift));
            d += `${step ? 'L' : 'M'}${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
        }
    }
    return d;
}
