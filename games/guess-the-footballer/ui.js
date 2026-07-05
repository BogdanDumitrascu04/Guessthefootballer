// Shared header/navbar behaviour for the game pages.
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const navbar = document.getElementById('navbar');
    const infoButton = document.getElementById('infoButton');
    const infoContent = document.getElementById('infoContent');
    const closeButton = document.getElementById('closeButton');

    const content = document.querySelector('.content');
    function adjustContentPosition() {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const navbarHeight = navbar.classList.contains('show') ? navbar.offsetHeight : 0;
        const infoHeight = infoContent.classList.contains('show') ? infoContent.offsetHeight : 0;
        content.style.marginTop = `${headerHeight + navbarHeight + infoHeight + 20}px`;
    }

    menuButton.addEventListener('click', () => {
        navbar.classList.toggle('show');
        infoContent.classList.remove('show');
        adjustContentPosition();
    });
    infoButton.addEventListener('click', () => {
        infoContent.classList.toggle('show');
        navbar.classList.remove('show');
        adjustContentPosition();
    });
    closeButton.addEventListener('click', () => {
        infoContent.classList.remove('show');
        adjustContentPosition();
    });
    window.addEventListener('resize', adjustContentPosition);
    adjustContentPosition();
});
