// i18n for Guess the Footballer — EN / ES / FR / RO.
// t(key, params) formats {placeholders}; language persists in localStorage.
const translations = {
    en: {
        guessTheFootballer: 'Guess the footballer',
        guessTheFootballPlayer: 'Guess the Football Player',
        howToPlay: 'How to Play',
        selectLeague: '1. Select a league, a season and a difficulty.',
        guessFootballer: '2. Guess the footballer based on the clues provided.',
        enjoyGame: '3. Enjoy the game!',
        showHint: 'Show Hint',
        typePlayerName: 'Type player name...',
        congrats: 'Congratulations! You guessed correctly!',
        incorrect: 'Incorrect! You have {n} attempts left.',
        notFound: 'Player not found. Please try again.',
        gameOver: 'Game over! No more attempts left.<br><br>The player was: {name}',
        hintTeam: 'The player plays for: {team}',
        hintAge: "Player's age is: {age}",
        team: 'Team', position: 'Position', age: 'Age', number: 'Number', nationality: 'Nationality',
        restart: 'Restart',
        chooseLeague: 'Choose a league',
        season: 'Season', difficulty: 'Difficulty',
        easy: 'Easy', medium: 'Medium', hard: 'Hard',
        easyDesc: 'Only the stars of the league',
        mediumDesc: 'Stars plus trickier regulars',
        hardDesc: 'Full squads — no stars as the answer',
        changeSettings: 'Change league / difficulty',
        allGames: 'All games',
    },
    es: {
        guessTheFootballer: 'Adivina el futbolista',
        guessTheFootballPlayer: 'Adivina al futbolista',
        howToPlay: 'Cómo jugar',
        selectLeague: '1. Selecciona una liga, una temporada y una dificultad.',
        guessFootballer: '2. Adivina el futbolista basado en las pistas proporcionadas.',
        enjoyGame: '3. ¡Disfruta del juego!',
        showHint: 'Mostrar pista',
        typePlayerName: 'Escribe el nombre del jugador...',
        congrats: '¡Felicidades! ¡Adivinaste correctamente!',
        incorrect: '¡Incorrecto! Te quedan {n} intentos.',
        notFound: 'Jugador no encontrado. Por favor, inténtalo de nuevo.',
        gameOver: '¡Juego terminado! No quedan más intentos.<br><br>El jugador era: {name}',
        hintTeam: 'El jugador juega para: {team}',
        hintAge: 'La edad del jugador es: {age}',
        team: 'Equipo', position: 'Posición', age: 'Edad', number: 'Número', nationality: 'Nacionalidad',
        restart: 'Reiniciar',
        chooseLeague: 'Elige una liga',
        season: 'Temporada', difficulty: 'Dificultad',
        easy: 'Fácil', medium: 'Medio', hard: 'Difícil',
        easyDesc: 'Solo las estrellas de la liga',
        mediumDesc: 'Estrellas y titulares menos obvios',
        hardDesc: 'Plantillas completas — sin estrellas como respuesta',
        changeSettings: 'Cambiar liga / dificultad',
        allGames: 'Todos los juegos',
    },
    fr: {
        guessTheFootballer: 'Devinez le footballeur',
        guessTheFootballPlayer: 'Devinez le joueur de football',
        howToPlay: 'Comment jouer',
        selectLeague: '1. Sélectionnez une ligue, une saison et une difficulté.',
        guessFootballer: '2. Devinez le footballeur en fonction des indices fournis.',
        enjoyGame: '3. Profitez du jeu!',
        showHint: 'Afficher un indice',
        typePlayerName: 'Tapez le nom du joueur...',
        congrats: 'Félicitations ! Vous avez deviné correctement !',
        incorrect: 'Incorrect ! Il vous reste {n} tentatives.',
        notFound: 'Joueur non trouvé. Veuillez réessayer.',
        gameOver: 'Fin du jeu ! Plus de tentatives restantes.<br><br>Le joueur était : {name}',
        hintTeam: 'Le joueur joue pour : {team}',
        hintAge: "L'âge du joueur est : {age}",
        team: 'Équipe', position: 'Poste', age: 'Âge', number: 'Numéro', nationality: 'Nationalité',
        restart: 'Recommencer',
        chooseLeague: 'Choisissez une ligue',
        season: 'Saison', difficulty: 'Difficulté',
        easy: 'Facile', medium: 'Moyen', hard: 'Difficile',
        easyDesc: 'Seulement les stars de la ligue',
        mediumDesc: 'Stars et titulaires moins évidents',
        hardDesc: 'Effectifs complets — pas de stars comme réponse',
        changeSettings: 'Changer de ligue / difficulté',
        allGames: 'Tous les jeux',
    },
    ro: {
        guessTheFootballer: 'Ghicește fotbalistul',
        guessTheFootballPlayer: 'Ghicește jucătorul de fotbal',
        howToPlay: 'Cum să joci',
        selectLeague: '1. Selectează o ligă, un sezon și o dificultate.',
        guessFootballer: '2. Ghicește fotbalistul pe baza indiciilor oferite.',
        enjoyGame: '3. Bucură-te de joc!',
        showHint: 'Arată indiciul',
        typePlayerName: 'Introdu numele jucătorului...',
        congrats: 'Felicitări! Ai ghicit corect!',
        incorrect: 'Incorect! Mai ai {n} încercări.',
        notFound: 'Jucătorul nu s-a găsit. Mai încearcă.',
        gameOver: 'Sfârșit de joc! Nu mai ai încercări.<br><br>Jucătorul era: {name}',
        hintTeam: 'Jucătorul joacă pentru: {team}',
        hintAge: 'Vârsta jucătorului este: {age}',
        team: 'Echipă', position: 'Poziție', age: 'Vârstă', number: 'Număr', nationality: 'Naționalitate',
        restart: 'Restart',
        chooseLeague: 'Alege o ligă',
        season: 'Sezon', difficulty: 'Dificultate',
        easy: 'Ușor', medium: 'Mediu', hard: 'Greu',
        easyDesc: 'Doar starurile ligii',
        mediumDesc: 'Staruri plus titulari mai puțin evidenți',
        hardDesc: 'Loturi complete — fără staruri ca răspuns',
        changeSettings: 'Schimbă liga / dificultatea',
        allGames: 'Toate jocurile',
    },
};

let currentLanguage = localStorage.getItem('gtf-lang') || 'en';
if (!translations[currentLanguage]) currentLanguage = 'en';

function t(key, params) {
    let text = (translations[currentLanguage] && translations[currentLanguage][key])
        || translations.en[key] || key;
    if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, v);
    return text;
}

function translatePage() {
    document.querySelectorAll('[data-translate]').forEach(el => {
        el.innerHTML = t(el.getAttribute('data-translate'));
    });
    const guessInput = document.getElementById('guessInput');
    if (guessInput) guessInput.placeholder = t('typePlayerName');
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLanguage = lang;
    localStorage.setItem('gtf-lang', lang);
    translatePage();
    document.dispatchEvent(new CustomEvent('languagechange'));
}

document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('language');
    if (selector) {
        selector.value = currentLanguage;
        selector.addEventListener('change', e => setLanguage(e.target.value));
    }
    translatePage();
});
