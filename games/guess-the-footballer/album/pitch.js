// Metres. u: from the middle line of the pitch to the right touchline; v: from the player's own goal to the other one.
const HALF_WIDTH = 34;
const LENGTH = 105;

export const SPOTS = {
    goalkeeper: [0, 5.5],
    leftBack: [-25, 25],
    centreBack: [0, 20],
    rightBack: [25, 25],
    defensiveMidfield: [0, 37],
    leftMidfield: [-25, 54],
    centralMidfield: [0, 52.5],
    rightMidfield: [25, 54],
    attackingMidfield: [0, 67],
    leftWinger: [-24, 82],
    secondStriker: [0, 79],
    centreForward: [0, 92],
    rightWinger: [24, 82],
};
// One player in five has only a general position, so a whole band of the pitch is lit.
export const ZONES = { defender: [10, 34], midfielder: [38, 68], forward: [72, 98] };

function arc(cu, cv, radius, from, to, steps) {
    return Array.from({ length: steps + 1 }, (_, i) => {
        const angle = from + ((to - from) * i) / steps;
        return [cu + radius * Math.cos(angle), cv + radius * Math.sin(angle)];
    });
}

function box(halfWidth, depth, far) {
    const [base, edge] = far ? [LENGTH, LENGTH - depth] : [0, depth];
    return [[-halfWidth, base], [-halfWidth, edge], [halfWidth, edge], [halfWidth, base]];
}

// Where the circle around the penalty spot leaves the penalty area.
const ARC_ANGLE = Math.asin((16.5 - 11) / 9.15);

function markings(detailed) {
    const lines = [
        [[-HALF_WIDTH, 0], [HALF_WIDTH, 0], [HALF_WIDTH, LENGTH], [-HALF_WIDTH, LENGTH], [-HALF_WIDTH, 0]],
        [[-HALF_WIDTH, LENGTH / 2], [HALF_WIDTH, LENGTH / 2]],
        arc(0, LENGTH / 2, 9.15, 0, 2 * Math.PI, 48),
        box(20.16, 16.5, false),
        box(20.16, 16.5, true),
    ];
    if (!detailed) return lines;
    return lines.concat([
        box(9.16, 5.5, false),
        box(9.16, 5.5, true),
        arc(0, 11, 9.15, ARC_ANGLE, Math.PI - ARC_ANGLE, 16),
        arc(0, LENGTH - 11, 9.15, -ARC_ANGLE, ARC_ANGLE - Math.PI, 16),
        [[-3.66, LENGTH], [-3.66, LENGTH + 2.4], [3.66, LENGTH + 2.4], [3.66, LENGTH]],
        arc(-HALF_WIDTH, 0, 1.5, 0, Math.PI / 2, 4),
        arc(HALF_WIDTH, 0, 1.5, Math.PI, Math.PI / 2, 4),
        arc(-HALF_WIDTH, LENGTH, 1.5, 0, -Math.PI / 2, 4),
        arc(HALF_WIDTH, LENGTH, 1.5, Math.PI, (3 * Math.PI) / 2, 4),
    ]);
}

export function pitchPath(project, detailed = true) {
    return markings(detailed)
        .map(points => `M${points.map(([u, v]) => project(u, v).map(n => n.toFixed(1)).join(',')).join('L')}`)
        .join('');
}

// A camera high behind the player's own goal: near line `near`, far line `far`, both given as [y, width] in pixels.
export function perspective({ centerX, near: [nearY, nearWidth], far: [farY, farWidth] }) {
    const distance = LENGTH / (nearWidth / farWidth - 1);
    const focal = (nearWidth * distance) / (2 * HALF_WIDTH);
    const height = (nearY - farY) / (focal / distance - focal / (distance + LENGTH));
    const horizon = nearY - (height * focal) / distance;
    return (u, v) => {
        const scale = focal / (distance + v);
        return [centerX + u * scale, horizon + height * scale];
    };
}
