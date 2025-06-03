const menuButton = document.getElementById('menuButton');
const navbar = document.getElementById('navbar');
const infoButton = document.getElementById('infoButton');
const infoContent = document.getElementById('infoContent');
const closeButton = document.getElementById('closeButton');
const content = document.querySelector('.content');

// Function to adjust margin-top of the content
function adjustContentPosition() {
    const headerHeight = document.querySelector('.header').offsetHeight;
    let navbarHeight = 0;
    let infoContentHeight = 0;

    if (navbar.classList.contains('show')) {
        navbarHeight = navbar.offsetHeight;
    }

    if (infoContent.classList.contains('show')) {
        infoContentHeight = infoContent.offsetHeight;
    }

    content.style.marginTop = `${headerHeight + navbarHeight + infoContentHeight + 20}px`;
}

window.addEventListener('resize', adjustContentPosition);
document.addEventListener('DOMContentLoaded', adjustContentPosition);

// Event listeners for navbar menu
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

adjustContentPosition();
document.getElementById('startButton').onclick = function (){
    window.location.assign("PremierLigueGame.html");
 };
