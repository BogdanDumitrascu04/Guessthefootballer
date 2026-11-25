// Keeps an offline copy of the site (sw.js) and, on the home page, offers to install it as an app.
{
    const worker = new URL('sw.js', document.currentScript.src);
    if ('serviceWorker' in navigator) {
        addEventListener('load', () => {
            navigator.serviceWorker.register(worker).catch(error => console.warn('No offline copy:', error.message));
        });
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
