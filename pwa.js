// Keeps an offline copy of the site (sw.js) and, on the home page, offers to install it as an app.
{
    const worker = new URL('sw.js', document.currentScript.src);
    if ('serviceWorker' in navigator) {
        addEventListener('load', () => {
            navigator.serviceWorker.register(worker).catch(error => console.warn('No offline copy:', error.message));
        });
        leaveIfMoved(worker);
    }

    const button = document.getElementById('installButton');
    if (button) {
        let offer = null;
        addEventListener('beforeinstallprompt', event => {
            event.preventDefault(); // the page's own button takes the place of the browser's banner
            offer = event;
            button.hidden = false;
        });
        button.addEventListener('click', () => {
            button.hidden = true; // an offer can be used only once
            offer.prompt();
        });
        // Safari on iPhone never makes the offer. This property exists only there, and is false outside the installed app.
        document.getElementById('installHint').hidden = navigator.standalone !== false;
    }
}

// When the site moves to its own domain, GitHub sends every address there, sw.js included, and a worker is never
// updated through a redirect. The copy is then removed, and the page opened again from the new address.
async function leaveIfMoved(worker) {
    const response = await fetch(new URL('version.json', worker), { method: 'HEAD', cache: 'no-store', redirect: 'manual' }).catch(() => null);
    if (response?.type !== 'opaqueredirect') return;
    await (await navigator.serviceWorker.getRegistration(new URL('./', worker)))?.unregister();
    for (const name of await caches.keys()) if (name.startsWith('gtf-')) await caches.delete(name);
    location.reload();
}
