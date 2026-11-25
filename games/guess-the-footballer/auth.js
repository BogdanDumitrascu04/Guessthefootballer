// Accounts: Google sign-in through Supabase Auth, and the account button in the header.
// The publishable key is meant for browsers: what it can reach is decided by the RLS policies in sql/.
const SUPABASE_URL = 'https://ikdljmrobttbsloauhyh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_upVnirUamarzguZf-8bRxQ_VBKIga6i';

// PKCE: Google sends back a one-time code that only this browser can exchange, not the tokens themselves.
const supabaseClient = SUPABASE_KEY ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } }) : null;
let currentUser = null;
let accountKnown = false; // nothing is drawn until the saved session is read, so a signed-in player never sees "Sign in" flash
let markAccountKnown;
// Lets other scripts wait until the saved session has been read before asking who is playing.
const accountReady = supabaseClient ? new Promise(resolve => { markAccountKnown = resolve; }) : Promise.resolve();
// Next to this script, so the link works from the home page and from the game pages alike.
const PROFILE_URL = new URL('profile.html', document.currentScript.src).href;
const ALBUM_URL = new URL('album.html', document.currentScript.src).href;

const ICONS = {
    album: '<path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    signOut: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
};

function signIn() {
    const back = new URL(location.href);
    back.hash = '';
    // Google asks which account to use every time: without it, a player could never switch to another Google account.
    supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: back.href, queryParams: { prompt: 'select_account' } },
    });
}

function displayName(user) {
    const meta = user.user_metadata || {};
    return meta.full_name || meta.name || user.email || '';
}

function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name];
    return svg;
}

function element(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text !== undefined) el.textContent = text; // text, never HTML: names come from the Google account
    return el;
}

function initial(name) {
    return (name.trim()[0] || '?').toUpperCase();
}

function closeAccountMenu() {
    const menu = document.querySelector('.account-menu');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.querySelector('.account-avatar').setAttribute('aria-expanded', 'false');
}

function renderSignInButton(box) {
    const button = element('button', 'account-signin');
    button.type = 'button';
    button.setAttribute('aria-label', t('signInGoogle')); // the text is hidden on phones
    button.title = t('signInGoogle');
    button.append(icon('person'), element('span', 'account-signin-text', t('signIn')));
    button.addEventListener('click', signIn);
    box.append(button);
}

function renderAccountMenu(box) {
    const name = displayName(currentUser);
    const avatar = element('button', 'account-avatar', initial(name));
    avatar.type = 'button';
    avatar.setAttribute('aria-label', t('account'));
    avatar.setAttribute('aria-haspopup', 'true');
    avatar.setAttribute('aria-expanded', 'false');

    const head = element('div', 'account-head');
    const who = element('div', 'account-who');
    who.append(element('span', 'account-name', name));
    if (currentUser.email && currentUser.email !== name) who.append(element('span', 'account-email', currentUser.email));
    head.append(element('span', 'account-head-avatar', initial(name)), who);

    const profile = element('a', 'account-item');
    profile.href = PROFILE_URL;
    profile.append(icon('person'), element('span', '', t('myProfile')));

    const album = element('a', 'account-item');
    album.href = ALBUM_URL;
    album.append(icon('album'), element('span', '', t('album')));

    const signOut = element('button', 'account-item');
    signOut.type = 'button';
    signOut.append(icon('signOut'), element('span', '', t('signOut')));
    signOut.addEventListener('click', () => supabaseClient.auth.signOut());

    const menu = element('div', 'account-menu');
    menu.hidden = true;
    menu.append(head, element('hr', 'account-divider'), profile, album, signOut);

    avatar.addEventListener('click', event => {
        event.stopPropagation();
        menu.hidden = !menu.hidden;
        avatar.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu.addEventListener('click', event => event.stopPropagation());
    box.append(avatar, menu);
}

function renderAccount() {
    const box = document.getElementById('account');
    if (!box || !accountKnown) return;
    box.replaceChildren();
    if (currentUser) renderAccountMenu(box);
    else renderSignInButton(box);
}

if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user ?? null;
        accountKnown = true;
        markAccountKnown();
        renderAccount();
        document.dispatchEvent(new CustomEvent('accountchange', { detail: currentUser }));
    });
}

document.addEventListener('languagechange', renderAccount);
document.addEventListener('click', closeAccountMenu);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAccountMenu();
});
