// Shared header behaviour for the game pages: burger menu and "how to play" panel.
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const navbar = document.getElementById('navbar');
    const infoButton = document.getElementById('infoButton');
    const infoContent = document.getElementById('infoContent');
    const closeButton = document.getElementById('closeButton');

    function closePanels() {
        navbar.classList.remove('show');
        infoContent.classList.remove('show');
    }

    menuButton.addEventListener('click', event => {
        event.stopPropagation();
        navbar.classList.toggle('show');
        infoContent.classList.remove('show');
    });
    infoButton.addEventListener('click', event => {
        event.stopPropagation();
        infoContent.classList.toggle('show');
        navbar.classList.remove('show');
    });
    closeButton.addEventListener('click', closePanels);

    document.addEventListener('click', event => {
        if (!navbar.contains(event.target) && !infoContent.contains(event.target)) closePanels();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePanels();
    });
});
