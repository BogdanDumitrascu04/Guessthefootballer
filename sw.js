// Keeps a copy of the site for when there is no connection. With a connection, every file comes from the network:
// old copies kept by the browser have broken the game before. The scope is the folder of this file, the whole site.
const CACHE = 'guess-the-footballer';

// What the pages need to open offline. A league's players are added the first time the league is played.
const GAME = 'games/guess-the-footballer/';
const SHELL = [
    './',
    'index.html',
    'index.css',
    'privacy-policy.html',
    'privacy-policy.css',
    'pwa.js',
    'manifest.webmanifest',
    'fonts/fonts.css',
    'fonts/barlow-condensed-700-latin.woff2',
    'fonts/barlow-condensed-700-latin-ext.woff2',
    'images/logo.svg',
    'images/Header/pitch-lines.svg',
    'images/icons/icon.svg',
    'vendor/supabase-js-2.119.0.js',
    'data/manifest.json',
    'data/badges.json',
    'data/album/index.json',
    ...[
        'index.html', 'game.html', 'result.html', 'profile.html', 'album.html',
        'game.css', 'shell.css', 'account.css', 'daily.css', 'album/album.css',
        'i18n.js', 'auth.js', 'ui.js', 'picker.js', 'round.js', 'countries.js', 'common.js', 'badge.js', 'league-marks.js',
        'saved-rounds.js', 'daily.js', 'kickoff.js', 'engine.js', 'result.js', 'profile.js',
        ...[
            'cards', 'colors', 'data', 'dom', 'guilloche', 'main', 'motion', 'pitch', 'progress', 'random', 'reveal',
            'round-win', 'slots', 'stage', 'stamp', 'text', 'ticket', 'win', 'zoom',
        ].map(name => `album/${name}.js`),
    ].map(path => GAME + path),
];

// Runs again whenever this file changes, and then downloads the whole list anew.
self.addEventListener('install', event => {
    self.skipWaiting(); // safe, because a page never mixes files from this copy with newer ones while online
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(path, { cache: 'no-cache' })))));
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// A page is the same file whatever follows "?": a league, a shared round, a sign-in code that must not be kept.
function cacheKey(request) {
    const url = new URL(request.url);
    if (request.mode === 'navigate') url.search = '';
    url.hash = '';
    return url.href;
}

// GitHub Pages lets a browser reuse a file for ten minutes without asking, which would hide an update from an open tab.
function askEveryTime(response) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-cache');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// "no-cache" asks the server even when the browser has a copy. Some browsers refuse to repeat the request of a page
// with other options, so a page is asked for by its address.
function fromNetwork(request) {
    if (request.mode === 'navigate') return fetch(request.url, { cache: 'no-cache', redirect: 'manual' });
    return fetch(request, { cache: 'no-cache' });
}

async function networkFirst(event) {
    const key = cacheKey(event.request);
    const cache = await caches.open(CACHE);
    try {
        const response = await fromNetwork(event.request);
        if (!response.ok || response.type !== 'basic') return response;
        event.waitUntil(cache.put(key, response.clone()).catch(() => {})); // a full disk must not stop the page
        return askEveryTime(response);
    } catch (error) {
        const copy = await cache.match(key);
        if (copy) return copy;
        throw error;
    }
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return; // Supabase and Google are never touched
    event.respondWith(networkFirst(event));
});
