const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export const motionAllowed = () => !reduced.matches;

const clamp = (value, low = 0, high = 1) => Math.min(Math.max(value, low), high);
let phoneMoves = false;

function point(element, px, py) {
    element.style.setProperty('--px', px.toFixed(3));
    element.style.setProperty('--py', py.toFixed(3));
}

function rest(element) {
    element.classList.remove('live');
    for (const property of ['--px', '--py', '--lift']) element.style.removeProperty(property);
}

export function followPointer(element, { rotate = true } = {}) {
    element.addEventListener('pointermove', event => {
        if (!motionAllowed()) return;
        const box = element.getBoundingClientRect();
        element.classList.add('live');
        if (rotate) element.style.setProperty('--lift', 1);
        point(element, clamp((event.clientX - box.left) / box.width), clamp((event.clientY - box.top) / box.height));
    });
    for (const type of ['pointerleave', 'pointercancel']) element.addEventListener(type, () => rest(element));
}

export function tilt(element) {
    element.classList.add('tilt');
    followPointer(element);
    return element;
}

function eachVisible(act) {
    for (const element of document.querySelectorAll('.tilt')) {
        const box = element.getBoundingClientRect();
        if (box.bottom > 0 && box.top < innerHeight) act(element, box);
    }
}

let neutral = null;
let queued = false;

// The way the phone is held when the page opens counts as flat; only the change from there tilts the cards.
function onOrientation({ beta, gamma }) {
    if (beta == null || gamma == null || !motionAllowed()) return;
    phoneMoves = true;
    neutral ??= { beta, gamma };
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        const px = clamp(0.5 + (gamma - neutral.gamma) / 50);
        const py = clamp(0.35 + (beta - neutral.beta) / 60);
        eachVisible(element => {
            element.style.setProperty('--lift', 0.8);
            point(element, px, py);
        });
    });
}

const touchScreen = matchMedia('(hover: none)').matches;
const sensor = typeof DeviceOrientationEvent === 'undefined' ? null : DeviceOrientationEvent;

// No effect on scroll: repainting every visible card on each scrolled frame made phones stutter (measured 25 nov).
if (touchScreen && sensor) addEventListener('deviceorientation', onOrientation);

// Safari on iPhone sends nothing until the person agrees, and it may only be asked after a tap.
export function askPhone() {
    if (touchScreen && !phoneMoves && motionAllowed()) sensor?.requestPermission?.().catch(() => {});
}

reduced.addEventListener('change', () => {
    if (!motionAllowed()) document.querySelectorAll('.tilt').forEach(rest);
});
