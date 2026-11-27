// Copy first: every page opens from the copy kept in the browser, and that copy is always one whole version of the site.
// A new version is downloaded in the background, every file checked against version.json, and it is taken over only
// as a page opens, so a page never mixes files from two pushes. The scope is the folder of this file, the whole site.
const VERSION = 'fc39136134e4';
const CACHE = `gtf-${VERSION}`;
const OLD_CACHE = 'guess-the-footballer'; // the network-first copy, before 26 nov
const LIST = 'version.json';
const SCOPE = self.registration.scope;
const AT_ONCE = 6; // downloads in parallel, so an update never crowds out the page the player is looking at

// Git's fingerprint of a file ("blob <size>\0" + the bytes, SHA-1): scripts/build_version.py writes the same one.
async function fingerprint(bytes) {
    const head = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
    const all = new Uint8Array(head.length + bytes.byteLength);
    all.set(head);
    all.set(new Uint8Array(bytes), head.length);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', all));
    return [...hash].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const urlOf = path => new URL(path, SCOPE).href;

// A file that did not change since the last version is taken from the copy instead of downloaded again.
async function previousCopy(url, hash) {
    for (const name of await caches.keys()) {
        if (name === CACHE || !name.startsWith('gtf-')) continue;
        const kept = await caches.match(url, { cacheName: name });
        if (kept && await fingerprint(await kept.clone().arrayBuffer()) === hash) return kept;
    }
    return null;
}

async function keep(cache, path, hash) {
    const url = urlOf(path);
    const response = await previousCopy(url, hash) ?? await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    const bytes = await response.arrayBuffer();
    // GitHub Pages may still be publishing the push, or answer from an older copy: try again at the next visit.
    if (await fingerprint(bytes) !== hash) throw new Error(`${path} is not from version ${VERSION}`);
    const type = response.headers.get('Content-Type');
    await cache.put(url, new Response(bytes, { headers: type ? { 'Content-Type': type } : {} }));
}

async function download() {
    const list = await (await fetch(urlOf(LIST), { cache: 'no-cache' })).json();
    if (list.version !== VERSION) throw new Error(`${LIST} is version ${list.version}, not ${VERSION}`);
    const cache = await caches.open(CACHE);
    const queue = Object.entries(list.files);
    const worker = async () => {
        while (queue.length) await keep(cache, ...queue.shift());
    };
    try {
        await Promise.all(Array.from({ length: AT_ONCE }, worker));
    } catch (error) {
        await caches.delete(CACHE); // half a version is never used
        throw error;
    }
}

self.addEventListener('install', event => {
    event.waitUntil(download().then(async () => {
        // The network-first copy never mixed versions while online, so it can be replaced at once.
        if (await caches.has(OLD_CACHE)) await self.skipWaiting();
    }));
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const name of await caches.keys()) {
            if (name === OLD_CACHE || (name.startsWith('gtf-') && name !== CACHE)) await caches.delete(name);
        }
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data === 'take-over') self.skipWaiting();
});

// A newer version waits until a page opens in the only tab, then the page loads again under it. Another tab in the
// background still runs the old version, so the newer one keeps waiting until that tab is closed.
async function takeOver() {
    const waiting = self.registration.waiting;
    if (!waiting) return false;
    const pages = await self.clients.matchAll({ type: 'window' });
    if (pages.length > 1 || (pages.length === 1 && pages[0].visibilityState !== 'visible')) return false;
    const activated = new Promise(resolve => {
        waiting.addEventListener('statechange', () => waiting.state === 'activated' && resolve(true));
        setTimeout(() => resolve(false), 3000); // never stall a page on an update
    });
    waiting.postMessage('take-over');
    return activated;
}

const AGAIN = '<!doctype html><meta http-equiv="refresh" content="0">';

// A page is the same file whatever follows "?": a league, a shared round, a sign-in code that must not be kept.
function cacheKey(request) {
    const url = new URL(request.url);
    url.hash = '';
    if (request.mode === 'navigate') {
        url.search = '';
        if (url.pathname.endsWith('/')) url.pathname += 'index.html';
    }
    return url.href;
}

async function answer(event) {
    const { request } = event;
    if (request.mode === 'navigate') {
        if (await takeOver()) return new Response(AGAIN, { headers: { 'Content-Type': 'text/html' } });
    }
    return await caches.match(cacheKey(request), { cacheName: CACHE }) ?? fetch(request);
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return; // Supabase and Google are never touched
    event.respondWith(answer(event));
});
