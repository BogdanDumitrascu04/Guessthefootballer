// Elemente DOM
const menuButton = document.getElementById('menuButton');
const navbar = document.getElementById('navbar');
const infoButton = document.getElementById('infoButton');
const infoContent = document.getElementById('infoContent');
const closeButton = document.getElementById('closeButton');
const content = document.querySelector('.content');

// Funcție pentru a ajusta margin-top al conținutului
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

// Evenimente pentru meniul navbar
menuButton.addEventListener('click', () => {
    navbar.classList.toggle('show');
    infoContent.classList.remove('show');
    adjustContentPosition();
});

// Evenimente pentru secțiunea de informații
infoButton.addEventListener('click', () => {
    infoContent.classList.toggle('show');
    navbar.classList.remove('show');
    adjustContentPosition();
});

// Eveniment pentru butonul de închidere a informațiilor
closeButton.addEventListener('click', () => {
    infoContent.classList.remove('show');
    adjustContentPosition();
});

// Asigură-te că marginile sunt ajustate corect la redimensionarea ferestrei
window.addEventListener('resize', adjustContentPosition);

// Apelează funcția pentru a seta inițial marginile corect
adjustContentPosition();
// Players database — Bundesliga 2024/25 season, all 18 clubs.
// No individual player photos yet, so Photo falls back to the club badge.
const badge = folder => `images/leagues/Bundesliga/${folder}/Logo/${folder}.png`;
const p = (Name, Team, folder, Position, Age, Number, Nationality) =>
    ({ Name, Team, Position, Age, Number, Nationality, ImageTeam: badge(folder), Photo: badge(folder) });

const playersDatabase = [
    // Bayern Munich
    p('Manuel Neuer', 'Bayern Munich', 'Bayern', 'Goalkeeper', 38, 1, 'Germany'),
    p('Dayot Upamecano', 'Bayern Munich', 'Bayern', 'Defender', 26, 2, 'France'),
    p('Kim Min-jae', 'Bayern Munich', 'Bayern', 'Defender', 28, 3, 'South Korea'),
    p('Alphonso Davies', 'Bayern Munich', 'Bayern', 'Defender', 24, 19, 'Canada'),
    p('Joshua Kimmich', 'Bayern Munich', 'Bayern', 'Midfielder', 29, 6, 'Germany'),
    p('Leon Goretzka', 'Bayern Munich', 'Bayern', 'Midfielder', 29, 8, 'Germany'),
    p('Jamal Musiala', 'Bayern Munich', 'Bayern', 'Midfielder', 21, 42, 'Germany'),
    p('Aleksandar Pavlovic', 'Bayern Munich', 'Bayern', 'Midfielder', 20, 45, 'Germany'),
    p('Harry Kane', 'Bayern Munich', 'Bayern', 'Forward', 31, 9, 'England'),
    p('Leroy Sane', 'Bayern Munich', 'Bayern', 'Forward', 29, 10, 'Germany'),
    p('Serge Gnabry', 'Bayern Munich', 'Bayern', 'Forward', 29, 7, 'Germany'),
    p('Kingsley Coman', 'Bayern Munich', 'Bayern', 'Forward', 28, 11, 'France'),
    p('Michael Olise', 'Bayern Munich', 'Bayern', 'Forward', 23, 17, 'France'),
    p('Thomas Muller', 'Bayern Munich', 'Bayern', 'Forward', 35, 25, 'Germany'),
    // Bayer Leverkusen
    p('Lukas Hradecky', 'Bayer Leverkusen', 'Leverkusen', 'Goalkeeper', 35, 1, 'Finland'),
    p('Jonathan Tah', 'Bayer Leverkusen', 'Leverkusen', 'Defender', 28, 4, 'Germany'),
    p('Edmond Tapsoba', 'Bayer Leverkusen', 'Leverkusen', 'Defender', 26, 12, 'Burkina Faso'),
    p('Piero Hincapie', 'Bayer Leverkusen', 'Leverkusen', 'Defender', 23, 3, 'Ecuador'),
    p('Alejandro Grimaldo', 'Bayer Leverkusen', 'Leverkusen', 'Defender', 29, 20, 'Spain'),
    p('Jeremie Frimpong', 'Bayer Leverkusen', 'Leverkusen', 'Defender', 24, 30, 'Netherlands'),
    p('Granit Xhaka', 'Bayer Leverkusen', 'Leverkusen', 'Midfielder', 32, 34, 'Switzerland'),
    p('Exequiel Palacios', 'Bayer Leverkusen', 'Leverkusen', 'Midfielder', 26, 25, 'Argentina'),
    p('Florian Wirtz', 'Bayer Leverkusen', 'Leverkusen', 'Midfielder', 21, 10, 'Germany'),
    p('Jonas Hofmann', 'Bayer Leverkusen', 'Leverkusen', 'Midfielder', 32, 7, 'Germany'),
    p('Victor Boniface', 'Bayer Leverkusen', 'Leverkusen', 'Forward', 24, 22, 'Nigeria'),
    p('Patrik Schick', 'Bayer Leverkusen', 'Leverkusen', 'Forward', 29, 14, 'Czech Republic'),
    p('Martin Terrier', 'Bayer Leverkusen', 'Leverkusen', 'Forward', 27, 11, 'France'),
    // Borussia Dortmund
    p('Gregor Kobel', 'Borussia Dortmund', 'Dortmund', 'Goalkeeper', 27, 1, 'Switzerland'),
    p('Nico Schlotterbeck', 'Borussia Dortmund', 'Dortmund', 'Defender', 25, 4, 'Germany'),
    p('Waldemar Anton', 'Borussia Dortmund', 'Dortmund', 'Defender', 28, 3, 'Germany'),
    p('Julian Ryerson', 'Borussia Dortmund', 'Dortmund', 'Defender', 26, 26, 'Norway'),
    p('Ramy Bensebaini', 'Borussia Dortmund', 'Dortmund', 'Defender', 29, 5, 'Algeria'),
    p('Emre Can', 'Borussia Dortmund', 'Dortmund', 'Midfielder', 31, 23, 'Germany'),
    p('Marcel Sabitzer', 'Borussia Dortmund', 'Dortmund', 'Midfielder', 30, 20, 'Austria'),
    p('Julian Brandt', 'Borussia Dortmund', 'Dortmund', 'Midfielder', 28, 10, 'Germany'),
    p('Giovanni Reyna', 'Borussia Dortmund', 'Dortmund', 'Midfielder', 22, 7, 'USA'),
    p('Jamie Gittens', 'Borussia Dortmund', 'Dortmund', 'Forward', 20, 43, 'England'),
    p('Karim Adeyemi', 'Borussia Dortmund', 'Dortmund', 'Forward', 23, 27, 'Germany'),
    p('Serhou Guirassy', 'Borussia Dortmund', 'Dortmund', 'Forward', 29, 9, 'Guinea'),
    p('Maximilian Beier', 'Borussia Dortmund', 'Dortmund', 'Forward', 22, 14, 'Germany'),
    // RB Leipzig
    p('Peter Gulacsi', 'RB Leipzig', 'Leipzig', 'Goalkeeper', 34, 1, 'Hungary'),
    p('Willi Orban', 'RB Leipzig', 'Leipzig', 'Defender', 32, 4, 'Hungary'),
    p('Lukas Klostermann', 'RB Leipzig', 'Leipzig', 'Defender', 28, 16, 'Germany'),
    p('David Raum', 'RB Leipzig', 'Leipzig', 'Defender', 26, 22, 'Germany'),
    p('Benjamin Henrichs', 'RB Leipzig', 'Leipzig', 'Defender', 27, 39, 'Germany'),
    p('Amadou Haidara', 'RB Leipzig', 'Leipzig', 'Midfielder', 26, 8, 'Mali'),
    p('Nicolas Seiwald', 'RB Leipzig', 'Leipzig', 'Midfielder', 23, 13, 'Austria'),
    p('Christoph Baumgartner', 'RB Leipzig', 'Leipzig', 'Midfielder', 25, 14, 'Austria'),
    p('Xavi Simons', 'RB Leipzig', 'Leipzig', 'Midfielder', 21, 10, 'Netherlands'),
    p('Lois Openda', 'RB Leipzig', 'Leipzig', 'Forward', 24, 17, 'Belgium'),
    p('Benjamin Sesko', 'RB Leipzig', 'Leipzig', 'Forward', 21, 30, 'Slovenia'),
    p('Yussuf Poulsen', 'RB Leipzig', 'Leipzig', 'Forward', 30, 9, 'Denmark'),
    // Eintracht Frankfurt
    p('Kevin Trapp', 'Eintracht Frankfurt', 'Frankfurt', 'Goalkeeper', 34, 1, 'Germany'),
    p('Robin Koch', 'Eintracht Frankfurt', 'Frankfurt', 'Defender', 28, 4, 'Germany'),
    p('Tuta', 'Eintracht Frankfurt', 'Frankfurt', 'Defender', 25, 35, 'Brazil'),
    p('Arthur Theate', 'Eintracht Frankfurt', 'Frankfurt', 'Defender', 24, 47, 'Belgium'),
    p('Rasmus Kristensen', 'Eintracht Frankfurt', 'Frankfurt', 'Defender', 27, 2, 'Denmark'),
    p('Hugo Larsson', 'Eintracht Frankfurt', 'Frankfurt', 'Midfielder', 20, 16, 'Sweden'),
    p('Ellyes Skhiri', 'Eintracht Frankfurt', 'Frankfurt', 'Midfielder', 29, 15, 'Tunisia'),
    p('Mario Gotze', 'Eintracht Frankfurt', 'Frankfurt', 'Midfielder', 32, 27, 'Germany'),
    p('Ansgar Knauff', 'Eintracht Frankfurt', 'Frankfurt', 'Forward', 23, 36, 'Germany'),
    p('Omar Marmoush', 'Eintracht Frankfurt', 'Frankfurt', 'Forward', 25, 7, 'Egypt'),
    p('Hugo Ekitike', 'Eintracht Frankfurt', 'Frankfurt', 'Forward', 22, 11, 'France'),
    // VfB Stuttgart
    p('Alexander Nubel', 'VfB Stuttgart', 'Stuttgart', 'Goalkeeper', 28, 33, 'Germany'),
    p('Jeff Chabot', 'VfB Stuttgart', 'Stuttgart', 'Defender', 26, 24, 'Germany'),
    p('Maximilian Mittelstadt', 'VfB Stuttgart', 'Stuttgart', 'Defender', 27, 7, 'Germany'),
    p('Josha Vagnoman', 'VfB Stuttgart', 'Stuttgart', 'Defender', 24, 21, 'Germany'),
    p('Anthony Rouault', 'VfB Stuttgart', 'Stuttgart', 'Defender', 23, 4, 'France'),
    p('Atakan Karazor', 'VfB Stuttgart', 'Stuttgart', 'Midfielder', 28, 16, 'Germany'),
    p('Angelo Stiller', 'VfB Stuttgart', 'Stuttgart', 'Midfielder', 23, 6, 'Germany'),
    p('Enzo Millot', 'VfB Stuttgart', 'Stuttgart', 'Midfielder', 22, 8, 'France'),
    p('Chris Fuhrich', 'VfB Stuttgart', 'Stuttgart', 'Forward', 26, 27, 'Germany'),
    p('Jamie Leweling', 'VfB Stuttgart', 'Stuttgart', 'Forward', 23, 18, 'Germany'),
    p('Deniz Undav', 'VfB Stuttgart', 'Stuttgart', 'Forward', 28, 26, 'Germany'),
    p('Ermedin Demirovic', 'VfB Stuttgart', 'Stuttgart', 'Forward', 26, 9, 'Bosnia and Herzegovina'),
    // VfL Wolfsburg
    p('Kamil Grabara', 'VfL Wolfsburg', 'Wolfsburg', 'Goalkeeper', 26, 1, 'Poland'),
    p('Konstantinos Koulierakis', 'VfL Wolfsburg', 'Wolfsburg', 'Defender', 21, 15, 'Greece'),
    p('Sebastiaan Bornauw', 'VfL Wolfsburg', 'Wolfsburg', 'Defender', 25, 4, 'Belgium'),
    p('Joakim Maehle', 'VfL Wolfsburg', 'Wolfsburg', 'Defender', 27, 3, 'Denmark'),
    p('Maximilian Arnold', 'VfL Wolfsburg', 'Wolfsburg', 'Midfielder', 30, 27, 'Germany'),
    p('Mattias Svanberg', 'VfL Wolfsburg', 'Wolfsburg', 'Midfielder', 25, 24, 'Sweden'),
    p('Patrick Wimmer', 'VfL Wolfsburg', 'Wolfsburg', 'Midfielder', 23, 10, 'Austria'),
    p('Jonas Wind', 'VfL Wolfsburg', 'Wolfsburg', 'Forward', 26, 7, 'Denmark'),
    p('Mohamed Amoura', 'VfL Wolfsburg', 'Wolfsburg', 'Forward', 24, 21, 'Algeria'),
    p('Tiago Tomas', 'VfL Wolfsburg', 'Wolfsburg', 'Forward', 22, 19, 'Portugal'),
    // Borussia Monchengladbach
    p('Moritz Nicolas', 'Borussia Monchengladbach', 'Monchenglabach', 'Goalkeeper', 27, 1, 'Germany'),
    p('Nico Elvedi', 'Borussia Monchengladbach', 'Monchenglabach', 'Defender', 28, 30, 'Switzerland'),
    p('Ko Itakura', 'Borussia Monchengladbach', 'Monchenglabach', 'Defender', 27, 3, 'Japan'),
    p('Joe Scally', 'Borussia Monchengladbach', 'Monchenglabach', 'Defender', 22, 29, 'USA'),
    p('Julian Weigl', 'Borussia Monchengladbach', 'Monchenglabach', 'Midfielder', 29, 8, 'Germany'),
    p('Rocco Reitz', 'Borussia Monchengladbach', 'Monchenglabach', 'Midfielder', 22, 34, 'Germany'),
    p('Kevin Stoger', 'Borussia Monchengladbach', 'Monchenglabach', 'Midfielder', 31, 10, 'Austria'),
    p('Franck Honorat', 'Borussia Monchengladbach', 'Monchenglabach', 'Forward', 28, 9, 'France'),
    p('Tim Kleindienst', 'Borussia Monchengladbach', 'Monchenglabach', 'Forward', 29, 36, 'Germany'),
    p('Alassane Plea', 'Borussia Monchengladbach', 'Monchenglabach', 'Forward', 31, 14, 'France'),
    p('Robin Hack', 'Borussia Monchengladbach', 'Monchenglabach', 'Forward', 25, 21, 'Germany'),
    // SC Freiburg
    p('Noah Atubolu', 'SC Freiburg', 'Freiburg', 'Goalkeeper', 22, 1, 'Germany'),
    p('Matthias Ginter', 'SC Freiburg', 'Freiburg', 'Defender', 30, 28, 'Germany'),
    p('Philipp Lienhart', 'SC Freiburg', 'Freiburg', 'Defender', 28, 3, 'Austria'),
    p('Christian Gunter', 'SC Freiburg', 'Freiburg', 'Defender', 30, 30, 'Germany'),
    p('Lukas Kubler', 'SC Freiburg', 'Freiburg', 'Defender', 32, 17, 'Germany'),
    p('Maximilian Eggestein', 'SC Freiburg', 'Freiburg', 'Midfielder', 27, 8, 'Germany'),
    p('Patrick Osterhage', 'SC Freiburg', 'Freiburg', 'Midfielder', 24, 14, 'Germany'),
    p('Ritsu Doan', 'SC Freiburg', 'Freiburg', 'Forward', 26, 42, 'Japan'),
    p('Vincenzo Grifo', 'SC Freiburg', 'Freiburg', 'Forward', 31, 32, 'Italy'),
    p('Lucas Holer', 'SC Freiburg', 'Freiburg', 'Forward', 30, 9, 'Germany'),
    p('Junior Adamu', 'SC Freiburg', 'Freiburg', 'Forward', 23, 26, 'Austria'),
    // TSG Hoffenheim
    p('Oliver Baumann', 'TSG Hoffenheim', 'Hoffenheim', 'Goalkeeper', 34, 1, 'Germany'),
    p('Pavel Kaderabek', 'TSG Hoffenheim', 'Hoffenheim', 'Defender', 32, 3, 'Czech Republic'),
    p('Robin Hranac', 'TSG Hoffenheim', 'Hoffenheim', 'Defender', 24, 5, 'Czech Republic'),
    p('Kevin Akpoguma', 'TSG Hoffenheim', 'Hoffenheim', 'Defender', 29, 25, 'Nigeria'),
    p('Anton Stach', 'TSG Hoffenheim', 'Hoffenheim', 'Midfielder', 26, 16, 'Germany'),
    p('Tom Bischof', 'TSG Hoffenheim', 'Hoffenheim', 'Midfielder', 19, 46, 'Germany'),
    p('Andrej Kramaric', 'TSG Hoffenheim', 'Hoffenheim', 'Forward', 33, 27, 'Croatia'),
    p('Ihlas Bebou', 'TSG Hoffenheim', 'Hoffenheim', 'Forward', 30, 9, 'Togo'),
    p('Marius Bulter', 'TSG Hoffenheim', 'Hoffenheim', 'Forward', 31, 14, 'Germany'),
    p('Adam Hlozek', 'TSG Hoffenheim', 'Hoffenheim', 'Forward', 22, 23, 'Czech Republic'),
    // FC Augsburg
    p('Nediljko Labrovic', 'FC Augsburg', 'Augsburg', 'Goalkeeper', 25, 1, 'Croatia'),
    p('Jeffrey Gouweleeuw', 'FC Augsburg', 'Augsburg', 'Defender', 33, 6, 'Netherlands'),
    p('Keven Schlotterbeck', 'FC Augsburg', 'Augsburg', 'Defender', 27, 40, 'Germany'),
    p('Chrislain Matsima', 'FC Augsburg', 'Augsburg', 'Defender', 22, 5, 'France'),
    p('Kristijan Jakic', 'FC Augsburg', 'Augsburg', 'Midfielder', 27, 20, 'Croatia'),
    p('Elvis Rexhbecaj', 'FC Augsburg', 'Augsburg', 'Midfielder', 27, 8, 'Kosovo'),
    p('Frank Onyeka', 'FC Augsburg', 'Augsburg', 'Midfielder', 27, 35, 'Nigeria'),
    p('Ruben Vargas', 'FC Augsburg', 'Augsburg', 'Forward', 26, 16, 'Switzerland'),
    p('Phillip Tietz', 'FC Augsburg', 'Augsburg', 'Forward', 27, 21, 'Germany'),
    p('Alexis Claude-Maurice', 'FC Augsburg', 'Augsburg', 'Forward', 26, 10, 'France'),
    p('Samuel Essende', 'FC Augsburg', 'Augsburg', 'Forward', 26, 26, 'DR Congo'),
    // Werder Bremen
    p('Michael Zetterer', 'Werder Bremen', 'Bremen', 'Goalkeeper', 29, 1, 'Germany'),
    p('Marco Friedl', 'Werder Bremen', 'Bremen', 'Defender', 26, 32, 'Austria'),
    p('Niklas Stark', 'Werder Bremen', 'Bremen', 'Defender', 29, 4, 'Germany'),
    p('Milos Veljkovic', 'Werder Bremen', 'Bremen', 'Defender', 29, 5, 'Serbia'),
    p('Mitchell Weiser', 'Werder Bremen', 'Bremen', 'Defender', 30, 8, 'Germany'),
    p('Senne Lynen', 'Werder Bremen', 'Bremen', 'Midfielder', 25, 6, 'Belgium'),
    p('Jens Stage', 'Werder Bremen', 'Bremen', 'Midfielder', 28, 23, 'Denmark'),
    p('Romano Schmid', 'Werder Bremen', 'Bremen', 'Midfielder', 25, 20, 'Austria'),
    p('Marco Grull', 'Werder Bremen', 'Bremen', 'Forward', 26, 7, 'Austria'),
    p('Marvin Ducksch', 'Werder Bremen', 'Bremen', 'Forward', 30, 11, 'Germany'),
    p('Justin Njinmah', 'Werder Bremen', 'Bremen', 'Forward', 24, 30, 'Germany'),
    // Mainz 05
    p('Robin Zentner', 'Mainz 05', 'Mainz', 'Goalkeeper', 30, 27, 'Germany'),
    p('Andreas Hanche-Olsen', 'Mainz 05', 'Mainz', 'Defender', 27, 2, 'Norway'),
    p('Anthony Caci', 'Mainz 05', 'Mainz', 'Defender', 27, 3, 'France'),
    p('Dominik Kohr', 'Mainz 05', 'Mainz', 'Midfielder', 31, 21, 'Germany'),
    p('Kaishu Sano', 'Mainz 05', 'Mainz', 'Midfielder', 24, 6, 'Japan'),
    p('Nadiem Amiri', 'Mainz 05', 'Mainz', 'Midfielder', 28, 18, 'Germany'),
    p('Lee Jae-sung', 'Mainz 05', 'Mainz', 'Midfielder', 32, 7, 'South Korea'),
    p('Jonathan Burkardt', 'Mainz 05', 'Mainz', 'Forward', 24, 29, 'Germany'),
    p('Karim Onisiwo', 'Mainz 05', 'Mainz', 'Forward', 32, 17, 'Austria'),
    p('Paul Nebel', 'Mainz 05', 'Mainz', 'Forward', 22, 14, 'Germany'),
    p('Nelson Weiper', 'Mainz 05', 'Mainz', 'Forward', 19, 40, 'Germany'),
    // Union Berlin
    p('Frederik Ronnow', 'Union Berlin', 'UnionBerlin', 'Goalkeeper', 32, 1, 'Denmark'),
    p('Danilho Doekhi', 'Union Berlin', 'UnionBerlin', 'Defender', 26, 5, 'Netherlands'),
    p('Kevin Vogt', 'Union Berlin', 'UnionBerlin', 'Defender', 33, 4, 'Germany'),
    p('Christopher Trimmel', 'Union Berlin', 'UnionBerlin', 'Defender', 37, 28, 'Austria'),
    p('Alex Kral', 'Union Berlin', 'UnionBerlin', 'Midfielder', 26, 6, 'Czech Republic'),
    p('Rani Khedira', 'Union Berlin', 'UnionBerlin', 'Midfielder', 29, 8, 'Germany'),
    p('Andras Schafer', 'Union Berlin', 'UnionBerlin', 'Midfielder', 25, 17, 'Hungary'),
    p('Lucas Tousart', 'Union Berlin', 'UnionBerlin', 'Midfielder', 27, 11, 'France'),
    p('Benedict Hollerbach', 'Union Berlin', 'UnionBerlin', 'Forward', 23, 47, 'Germany'),
    p('Yorbe Vertessen', 'Union Berlin', 'UnionBerlin', 'Forward', 24, 7, 'Belgium'),
    p('Andrej Ilic', 'Union Berlin', 'UnionBerlin', 'Forward', 24, 19, 'Serbia'),
    // VfL Bochum
    p('Patrick Drewes', 'VfL Bochum', 'Bochum', 'Goalkeeper', 31, 1, 'Germany'),
    p('Ivan Ordets', 'VfL Bochum', 'Bochum', 'Defender', 32, 14, 'Ukraine'),
    p('Erhan Masovic', 'VfL Bochum', 'Bochum', 'Defender', 26, 4, 'Serbia'),
    p('Maximilian Wittek', 'VfL Bochum', 'Bochum', 'Defender', 29, 40, 'Germany'),
    p('Anthony Losilla', 'VfL Bochum', 'Bochum', 'Midfielder', 38, 8, 'France'),
    p('Ibrahima Sissoko', 'VfL Bochum', 'Bochum', 'Midfielder', 27, 27, 'France'),
    p('Matus Bero', 'VfL Bochum', 'Bochum', 'Midfielder', 29, 6, 'Slovakia'),
    p('Dani de Wit', 'VfL Bochum', 'Bochum', 'Midfielder', 27, 10, 'Netherlands'),
    p('Philipp Hofmann', 'VfL Bochum', 'Bochum', 'Forward', 31, 11, 'Germany'),
    p('Myron Boadu', 'VfL Bochum', 'Bochum', 'Forward', 24, 18, 'Netherlands'),
    // FC Heidenheim
    p('Kevin Muller', 'FC Heidenheim', 'Heidenheim', 'Goalkeeper', 33, 1, 'Germany'),
    p('Patrick Mainka', 'FC Heidenheim', 'Heidenheim', 'Defender', 30, 6, 'Germany'),
    p('Benedikt Gimber', 'FC Heidenheim', 'Heidenheim', 'Defender', 27, 5, 'Germany'),
    p('Marnon Busch', 'FC Heidenheim', 'Heidenheim', 'Defender', 30, 3, 'Germany'),
    p('Lennard Maloney', 'FC Heidenheim', 'Heidenheim', 'Midfielder', 25, 33, 'Germany'),
    p('Jan Schoppner', 'FC Heidenheim', 'Heidenheim', 'Midfielder', 25, 18, 'Germany'),
    p('Adrian Beck', 'FC Heidenheim', 'Heidenheim', 'Midfielder', 27, 10, 'Germany'),
    p('Paul Wanner', 'FC Heidenheim', 'Heidenheim', 'Midfielder', 19, 22, 'Germany'),
    p('Marvin Pieringer', 'FC Heidenheim', 'Heidenheim', 'Forward', 25, 14, 'Germany'),
    p('Mathias Honsak', 'FC Heidenheim', 'Heidenheim', 'Forward', 28, 16, 'Austria'),
    // Holstein Kiel
    p('Timon Weiner', 'Holstein Kiel', 'Kiel', 'Goalkeeper', 25, 1, 'Germany'),
    p('Timo Becker', 'Holstein Kiel', 'Kiel', 'Defender', 27, 5, 'Germany'),
    p('Marco Komenda', 'Holstein Kiel', 'Kiel', 'Defender', 28, 4, 'Germany'),
    p('Tom Rothe', 'Holstein Kiel', 'Kiel', 'Defender', 20, 3, 'Germany'),
    p('Patrick Erras', 'Holstein Kiel', 'Kiel', 'Defender', 29, 25, 'Germany'),
    p('Nicolai Remberg', 'Holstein Kiel', 'Kiel', 'Midfielder', 24, 6, 'Germany'),
    p('Armin Gigovic', 'Holstein Kiel', 'Kiel', 'Midfielder', 22, 8, 'Sweden'),
    p('Lewis Holtby', 'Holstein Kiel', 'Kiel', 'Midfielder', 34, 10, 'Germany'),
    p('Shuto Machino', 'Holstein Kiel', 'Kiel', 'Forward', 25, 23, 'Japan'),
    p('Steven Skrzybski', 'Holstein Kiel', 'Kiel', 'Forward', 32, 7, 'Germany'),
    p('Fiete Arp', 'Holstein Kiel', 'Kiel', 'Forward', 25, 11, 'Germany'),
    p('Phil Harres', 'Holstein Kiel', 'Kiel', 'Forward', 22, 9, 'Germany'),
    // FC St. Pauli
    p('Nikola Vasilj', 'FC St. Pauli', 'StPauli', 'Goalkeeper', 29, 22, 'Bosnia and Herzegovina'),
    p('Karol Mets', 'FC St. Pauli', 'StPauli', 'Defender', 31, 24, 'Estonia'),
    p('Hauke Wahl', 'FC St. Pauli', 'StPauli', 'Defender', 30, 5, 'Germany'),
    p('Manolis Saliakas', 'FC St. Pauli', 'StPauli', 'Defender', 28, 18, 'Greece'),
    p('Eric Smith', 'FC St. Pauli', 'StPauli', 'Defender', 27, 7, 'Sweden'),
    p('Jackson Irvine', 'FC St. Pauli', 'StPauli', 'Midfielder', 31, 13, 'Australia'),
    p('Danel Sinani', 'FC St. Pauli', 'StPauli', 'Midfielder', 27, 20, 'Luxembourg'),
    p('Johannes Eggestein', 'FC St. Pauli', 'StPauli', 'Forward', 26, 11, 'Germany'),
    p('Oladapo Afolayan', 'FC St. Pauli', 'StPauli', 'Forward', 27, 14, 'England'),
    p('Morgan Guilavogui', 'FC St. Pauli', 'StPauli', 'Forward', 26, 9, 'Guinea'),
];
let availableKeywords = playersDatabase.map(player => player.Name);

    const resultsBox = document.querySelector('.result-box');
    const inputBox = document.getElementById("guessInput");
    const feedback = document.getElementById('feedback');
    const playerInfo = document.getElementById('playerInfo');

    // Funcția de actualizare a sugestiilor de autocompletare
    inputBox.addEventListener('input', function () {
        let result = [];
        let input = inputBox.value.toLowerCase().trim();
        if (input.length) {
            result = availableKeywords.filter(keyword => keyword.toLowerCase().includes(input));
            displayResults(result);
        } else {
            resultsBox.innerHTML = "";
        }
    });
    // Funcția de afișare a rezultatelor căutării
    function displayResults(results) {
        resultsBox.innerHTML = "";
        if (results.length) {
            const content = results.map(playerName => {
                const player = playersDatabase.find(player => player.Name.toLowerCase() === playerName.toLowerCase());
                if (player) {
                    return `
                        <li>
                            <img src="${player.Photo}" alt="Logo" class="player-logo-small">
                            ${player.Name} 
                            <img src="${player.ImageTeam}" alt="${player.Team} logo" class="team-logo-small">
                            
                        </li>
                    `;
                } else {
                    return `<li>${playerName}</li>`;
                }
            }).join('');
            resultsBox.innerHTML = `<ul>${content}</ul>`;
        }
    }

    // Event listener pentru selectarea unui rezultat din listă
    resultsBox.addEventListener('click', function(event) {
        if (event.target.tagName === 'LI') {
            const selectedText = event.target.textContent;
            const selectedName = selectedText.split(' - ')[0].trim();
            inputBox.value = selectedName;
            resultsBox.innerHTML = '';
            checkGuess();
        }
    });
    // Funcția pentru selectarea aleatorie a unui jucător țintă din baza de date
    function getRandomPlayer() {
        const randomIndex = Math.floor(Math.random() * playersDatabase.length);
        return playersDatabase[randomIndex];
    }

    // Setăm jucătorul țintă și inițializăm numărul de încercări la începutul jocului
    let targetPlayer = getRandomPlayer();
    let attempt = 0;
    const maxAttempts = 10;

    // Funcția pentru găsirea unui jucător după nume din baza de date
    function findPlayerByName(name) {
        return playersDatabase.find(player => player.Name.toLowerCase() === name.toLowerCase());
    }
    //Language
    const languageSelector = document.getElementById('language');
    let selectedLanguage = 'en';  // Limba implicită este engleza
    
    languageSelector.addEventListener('change', function(event) {
        selectedLanguage = event.target.value;
        updateLanguage(selectedLanguage);
    });
    
    // Funcția de verificare a ghicitului utilizatorului
    function checkGuess() {
        const guessInput = inputBox.value.trim();
        const guessedPlayer = findPlayerByName(guessInput);
        attempt++;
    
        if (guessedPlayer) {
            if (guessedPlayer.Name === targetPlayer.Name) {
                let message;
                
                // Verificăm limba selectată și setăm mesajul corespunzător
                if (selectedLanguage === 'en') {
                    message = `<strong>Congratulations! You guessed correctly!<br><br> 
                    <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
                    feedback.style.color = 'green';
                } else if (selectedLanguage === 'es') {
                    message = `<strong>¡Felicidades! ¡Adivinaste correctamente!<br><br> 
                    <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
                    feedback.style.color = 'green';
                } else if (selectedLanguage === 'fr') {
                    message = `<strong>Félicitations ! Vous avez deviné correctement !<br><br> 
                    <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
                    feedback.style.color = 'green';
                } else if (selectedLanguage === 'ro') {
                    message = `<strong>Felicitări ! Ai ghicit corect !<br><br> 
                    <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
                    feedback.style.color = 'green';
                }
    
                feedback.innerHTML = message;
                inputBox.disabled = true;
                inputBox.value = '';
                displayPlayerInfo(guessedPlayer, targetPlayer, true); // Indică ghicitul corect
                showRestartButton(); // Afișează butonul de restart
                document.getElementById('hint').innerText = ''; 
                document.getElementById('Hint').innerText = '';
                document.getElementById('hintButton').style.display= 'none';     
            } else {
                // Mesaje pentru răspuns incorect
                let incorrectMessage;
                if (selectedLanguage === 'en') {
                    incorrectMessage = `<strong>Incorrect! You have ${maxAttempts - attempt} attempts left.</strong>`;
                } else if (selectedLanguage === 'es') {
                    incorrectMessage = `<strong>¡Incorrecto! Te quedan ${maxAttempts - attempt} intentos.</strong>`;
                } else if (selectedLanguage === 'fr') {
                    incorrectMessage = `<strong>Incorrect ! Il vous reste ${maxAttempts - attempt} tentatives.</strong>`;
                }
                else if (selectedLanguage === 'ro') {
                    incorrectMessage = `<strong>Incorect ! Mai ai ${maxAttempts - attempt} încercări.</strong>`;
                }
    
                feedback.innerHTML = incorrectMessage;
                feedback.style.color= 'red';
                displayPlayerInfo(guessedPlayer, targetPlayer, false); // Indică ghicitul incorect
            }
        } else {
            // Mesaje pentru jucător necunoscut
            let notFoundMessage;
            if (selectedLanguage === 'en') {
                notFoundMessage = '<strong>Player not found. Please try again.</strong>';
            } else if (selectedLanguage === 'es') {
                notFoundMessage = '<strong>Jugador no encontrado. Por favor, inténtalo de nuevo.</strong>';
            } else if (selectedLanguage === 'fr') {
                notFoundMessage = '<strong>Joueur non trouvé. Veuillez réessayer.</strong>';
            }else if (selectedLanguage === 'ro') {
                notFoundMessage = '<strong>Jucătorul nu s-a găsit. Vă rugăm mai încercați</strong>';
            }
    
            feedback.innerHTML = notFoundMessage;
            feedback.style.color='white';
        }
    
        // Verificăm dacă utilizatorul a epuizat toate încercările
        if (attempt >= maxAttempts) {
            let gameOverMessage;
            if (selectedLanguage === 'en') {
                gameOverMessage = `
                <strong>Game over! No more attempts left.<br><br>
                The player was: ${targetPlayer.Name}</strong><br><br>
                <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
            } else if (selectedLanguage === 'es') {
                gameOverMessage = `
                <strong>¡Juego terminado! No quedan más intentos.<br><br>
                El jugador era: ${targetPlayer.Name}</strong><br><br>
                <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
            } else if (selectedLanguage === 'fr') {
                gameOverMessage = `
                <strong>Fin du jeu ! Plus de tentatives restantes.<br><br>
                Le joueur était : ${targetPlayer.Name}</strong><br><br>
                <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
            }else if (selectedLanguage === 'ro') {
                gameOverMessage = `
                <strong>Sfârșit de joc! Nu mai ai incercări.<br><br>
                Jucătorul era: ${targetPlayer.Name}</strong><br><br>
                <img src="${targetPlayer.Photo}" alt="${targetPlayer.Name}" style="max-width: 100%; height: auto; border-radius: 10px;"></strong>`;
            }
    
            feedback.innerHTML = gameOverMessage;
            feedback.style.color='white';
            inputBox.disabled = true;
            inputBox.value = '';
            document.getElementById('hint').innerText = ''; 
            document.getElementById('Hint').innerText = ''; 
            document.getElementById('hintButton').style.display= 'none';
            showRestartButton(); // Afișează butonul de restart
        }
    }
    
    // Funcția de afișare a informațiilor jucătorului și evidențierea potrivirilor
    function displayPlayerInfo(player, targetPlayer) {
        playerInfo.innerHTML = '';
    
        if (player) {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
    
            // Etichete traduse în funcție de limba selectată
            let teamLabel, positionLabel, ageLabel, numberLabel, nationalityLabel;
    
            if (selectedLanguage === 'en') {
                teamLabel = 'Team';
                positionLabel = 'Position';
                ageLabel = 'Age';
                numberLabel = 'Number';
                nationalityLabel = 'Nationality';
            } else if (selectedLanguage === 'es') {
                teamLabel = 'Equipo';
                positionLabel = 'Posición';
                ageLabel = 'Edad';
                numberLabel = 'Número';
                nationalityLabel = 'Nacionalidad';
            } else if (selectedLanguage === 'fr') {
                teamLabel = 'Équipe';
                positionLabel = 'Poste';
                ageLabel = 'Âge';
                numberLabel = 'Numéro';
                nationalityLabel = 'Nationalité';
            }else if (selectedLanguage === 'ro') {
                teamLabel = 'Echipă';
                positionLabel = 'Poziție';
                ageLabel = 'Vârstă';
                numberLabel = 'Număr';
                nationalityLabel = 'Naționalitate';
            }
    
            // Detaliile jucătorului de afișat
            const playerDetails = [
                { label: teamLabel, value: player.Team, key: 'Team' },
                { label: positionLabel, value: player.Position, key: 'Position' },
                { label: ageLabel, value: player.Age, key: 'Age', compareTo: targetPlayer.Age },
                { label: numberLabel, value: player.Number, key: 'Number', compareTo: targetPlayer.Number },
                { label: nationalityLabel, value: player.Nationality, key: 'Nationality' }
            ];
            playerDetails.forEach(detail => {
                const detailDiv = document.createElement('div');
                detailDiv.className = 'player-detail';

                // Creează un label și un span pentru fiecare detaliu
                const label = document.createElement('label');
                label.textContent = `${detail.label}:`;

                const span = document.createElement('span');
                let displayValue = detail.value;

                // Evidențierea atributelor potrivite
                if (detail.value === targetPlayer[detail.key]) {
                    detailDiv.classList.add('match'); // Adaugă clasa pentru a evidenția potrivirile
                } else if (detail.label === 'Age' || detail.label === 'Number') {
                    // Adaugă săgeți pentru Age și Number
                    if (detail.value > detail.compareTo) {
                        displayValue += ' ↓'; // Valoarea este mai mare
                    } else if (detail.value < detail.compareTo) {
                        displayValue += ' ↑'; // Valoarea este mai mică
                    }
                }
                span.textContent = displayValue;

                detailDiv.appendChild(label);
                detailDiv.appendChild(span);
                playerCard.appendChild(detailDiv);
            });

            playerInfo.appendChild(playerCard);
        }
    }
    let clickCount = 0;

    function showHint() {
        const hintDiv = document.getElementById('hint');
        let hintMessage;
        if (selectedLanguage === 'en') {
            hintMessage = `<strong>The player plays for: ${targetPlayer.Team}</strong>`;
        } else if (selectedLanguage === 'es') {
            hintMessage = `<strong>El jugador juega para: ${targetPlayer.Team}</strong>`;
        } else if (selectedLanguage === 'fr') {
            hintMessage = `<strong>Le joueur joue pour: ${targetPlayer.Team}</strong>`;
        } else if (selectedLanguage === 'ro') {
            hintMessage = `<strong>Jucătorul joacă pentru: ${targetPlayer.Team}</strong>`;
        }
    
        hintDiv.innerHTML = hintMessage;
        hintDiv.style.color = 'white';
    }
    
    function showHint2() {
        const hintDiv = document.getElementById('Hint');
        let hintMessage;
        if (selectedLanguage === 'en') {
            hintMessage = `<strong>Player's age is: ${targetPlayer.Age}</strong>`;
        } else if (selectedLanguage === 'es') {
            hintMessage = `<strong>La edad del jugador es: ${targetPlayer.Age}</strong>`;
        } else if (selectedLanguage === 'fr') {
            hintMessage = `<strong>L'âge du joueur est: ${targetPlayer.Age}</strong>`;
        } else if (selectedLanguage === 'ro') {
            hintMessage = `<strong>Vârsta jucătorului este: ${targetPlayer.Age}</strong>`;
        }
    
        hintDiv.innerHTML = hintMessage;
        hintDiv.style.color = 'white';
    }
    
    function Hint() {
        clickCount++;
        if (clickCount == 1) {
            showHint();
        } else if (clickCount == 2) {
            showHint2();
            clickCount = 0; // Resetează clickCount după ce ai arătat al doilea indiciu
        }
    }
    
    document.getElementById('hintButton').addEventListener('click', Hint);
    // Afișează butonul de restart și resetează jocul la click
    function showRestartButton() {
        const restartButton = document.createElement('button');
        restartButton.innerText = 'Restart';
        restartButton.addEventListener('click', function() {
            attempt = 0;
            targetPlayer = getRandomPlayer();
            inputBox.disabled = false;
            feedback.innerText = '';
            playerInfo.innerHTML = '';
            inputBox.value = '';
            restartButton.remove();

            // Clear the hint text when restarting the game
            document.getElementById('hint').innerText = '';
            document.getElementById('Hint').innerText = '';
            document.getElementById('hintButton').style.display ='';
        });
        document.getElementById('restartContainer').appendChild(restartButton);
    
    }



    // Adaugă event listener pentru a rula funcția checkGuess când utilizatorul apasă enter
    inputBox.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            checkGuess();
        }
    });
