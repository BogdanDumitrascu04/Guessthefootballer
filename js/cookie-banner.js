function initCookieConsent() {
    let cookieConsent = localStorage.getItem('cookieConsent');
    
    if (!cookieConsent) {
        document.getElementById('cookieConsent').classList.remove('hidden');
    }

    document.getElementById('acceptCookies').addEventListener('click', function () {
        localStorage.setItem('cookieConsent', 'accepted');
        document.getElementById('cookieConsent').classList.add('hidden');
    });

    document.getElementById('rejectCookies').addEventListener('click', function () {
        localStorage.setItem('cookieConsent', 'rejected');
        document.getElementById('cookieConsent').classList.add('hidden');
    });
}

