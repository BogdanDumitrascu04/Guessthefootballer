// Tests for the files of the site itself. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = file => fs.existsSync(path.join(ROOT, file));
const list = (folder, extension) => fs.readdirSync(path.join(ROOT, folder)).filter(f => f.endsWith(extension)).map(f => path.posix.join(folder, f));

const GAME = 'games/guess-the-footballer';
const PAGES = [...list('.', '.html'), ...list(GAME, '.html')];
const CODE = [...PAGES, ...list('.', '.css'), ...list('.', '.js'), ...list(GAME, '.css'), ...list(GAME, '.js'), ...list(`${GAME}/album`, '.css'), ...list(`${GAME}/album`, '.js')];
const SHELL = vm.runInNewContext(`${read('sw.js')};SHELL`, { self: { addEventListener() {} } });

// Local files named in a page, as paths from the root of the site.
function filesOf(page) {
    return [...read(page).matchAll(/(?:src|href)="([^"#?:]+)"/g)].map(match => path.posix.join(path.posix.dirname(page), match[1]));
}

test('every file a page names exists', () => {
    for (const page of PAGES) for (const file of filesOf(page)) assert.ok(exists(file), `${page} -> ${file}`);
});

test('no photos of players, no logos of clubs or leagues', () => {
    for (const file of CODE) assert.doesNotMatch(read(file), /api-sports|images\/leagues/, file);
    assert.equal(exists('images/leagues'), false);
});

test('portraits are off until a club agrees to them in writing', () => {
    assert.match(read(`${GAME}/common.js`), /const PORTRAIT_CLUBS = \[\];/);
});

test('the offline copy has every page, with its scripts and styles', () => {
    for (const file of SHELL) assert.ok(file === './' || exists(file), file);
    const needed = PAGES.flatMap(page => [page, ...filesOf(page).filter(file => /\.(css|js)$/.test(file))]);
    const modules = list(`${GAME}/album`, '.js');
    for (const file of [...needed, ...modules]) assert.ok(SHELL.includes(file), `${file} is missing from SHELL in sw.js`);
});

test('the site has one name, the same on every page', () => {
    for (const file of [...CODE, 'manifest.webmanifest', 'README.md']) assert.doesNotMatch(read(file), /Bogdy/, file);
    for (const page of PAGES.filter(page => page !== 'privacy-policy.html')) {
        assert.match(read(page), /class="brand-name"><span>Guess the<\/span> <strong>Footballer<\/strong>/, page);
    }
});

test('every page can be installed', () => {
    for (const page of PAGES) {
        for (const file of ['manifest.webmanifest', 'pwa.js', 'images/icons/apple-touch-icon.png']) assert.ok(filesOf(page).includes(file), `${page}: ${file}`);
    }
});

test('the icons of the app have the sizes the manifest says', () => {
    const { icons } = JSON.parse(read('manifest.webmanifest'));
    for (const icon of icons.filter(i => i.type === 'image/png')) {
        const png = fs.readFileSync(path.join(ROOT, icon.src));
        assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes, icon.src);
    }
    assert.ok(icons.some(icon => icon.purpose === 'maskable'));
});

test('the four languages have the same texts', () => {
    const page = { documentElement: {}, addEventListener() {}, querySelectorAll: () => [] };
    const translations = vm.runInNewContext(`${read(`${GAME}/i18n.js`)};translations`, { localStorage: { getItem: () => null }, document: page });
    const keys = Object.keys(translations.en).sort();
    for (const language of ['es', 'fr', 'ro']) assert.deepEqual(Object.keys(translations[language]).sort(), keys, language);
});

test('the numbers on the home page are those of the data', () => {
    const { leagues, defaultSeason } = JSON.parse(read('data/manifest.json'));
    const data = leagues.map(league => JSON.parse(read(`data/seasons/${defaultSeason}/${league.id}.json`)));
    const shown = key => Number(read('index.html').match(new RegExp(`<strong>(\\d+)</strong> <span data-translate="${key}">`))[1]);
    assert.equal(shown('statLeagues'), leagues.length);
    assert.equal(shown('statClubs'), data.reduce((n, league) => n + Object.keys(league.teams).length, 0));
    assert.equal(shown('statPlayers'), data.reduce((n, league) => n + league.players.length, 0));
});
