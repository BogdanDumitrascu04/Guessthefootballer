document.addEventListener('DOMContentLoaded', function() {
    // Elemente DOM
    const menuButton = document.getElementById('menuButton');
    const navbar = document.getElementById('navbar');
    const infoButton = document.getElementById('infoButton');
    const infoContent = document.getElementById('infoContent');
    const closeButton = document.getElementById('closeButton');
    const content = document.querySelector('.content');
    const teamsContainer = document.querySelector('.Teams');
    const quizContainer = document.getElementById('quizContainer');
    const questionText = document.getElementById('questionText');
    const playerImage = document.getElementById('playerImage');
    const hintText = document.getElementById('hintText');
    const answerInput = document.getElementById('answerInput');
    const submitAnswer = document.getElementById('submitAnswer');
    const nextQuestion = document.getElementById('nextQuestion');
    const showHint = document.getElementById('showHint');
    const resultMessage = document.getElementById('resultMessage');
    const scoreElement = document.getElementById('score');
    const attemptsElement = document.getElementById('attempts');
    const startButton = document.getElementById('startButton');

    // Variabile de stare
    let currentTeam = null;
    let currentQuestion = null;
    let score = 0;
    let attemptsLeft = 3;
    let questions = [];
    let usedQuestions = [];

    // Încărcare XML
    fetch('data/premier_league_quizzes.xml')
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
        .then(data => {
            const quizNodes = data.querySelectorAll('quiz');
            quizNodes.forEach(quizNode => {
                const team = quizNode.getAttribute('team');
                const teamQuestions = [];
                
                quizNode.querySelectorAll('question').forEach(qNode => {
                    teamQuestions.push({
                        id: qNode.getAttribute('id'),
                        text: qNode.querySelector('text').textContent,
                        answer: qNode.querySelector('answer').textContent,
                        image: qNode.querySelector('image').textContent,
                        hint: qNode.querySelector('hint').textContent
                    });
                });
                
                questions.push({ team, questions: teamQuestions });
            });
            initTeams();
        })
        .catch(error => console.error('Error loading XML:', error));

    // Inițializare echipe
    function initTeams() {
        const teams = [
            'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford F.C', 'Brighton',
            'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich',
            'Leicester City', 'Liverpool', 'Man.City', 'Man.United', 'Newcastle',
            'Nottingham', 'Southampton', 'Tottenham', 'West Ham', 'Wolves'
        ];

        teams.forEach(team => {
            const teamDiv = document.createElement('div');
            teamDiv.className = team.replace(/\s+/g, '');
            teamDiv.innerHTML = `${team}<br><img src="images/leagues/PremierLeague/${team.replace(/\s+/g, '')}/Logo/${team.replace(/\s+/g, '')}.png">`;
            
            teamDiv.addEventListener('click', () => selectTeam(team));
            teamsContainer.appendChild(teamDiv);
        });
    }

    // Selectare echipă
    function selectTeam(team) {
        currentTeam = team;
        const teamData = questions.find(q => q.team === team);
        
        if (teamData && teamData.questions.length > 0) {
            // Resetare stare quiz
            score = 0;
            attemptsLeft = 3;
            usedQuestions = [];
            updateScore();
            
            // Afișare container quiz
            quizContainer.classList.remove('hidden');
            startButton.classList.add('hidden');
            
            // Obține întrebare aleatoare
            getNewQuestion();
        } else {
            alert(`No questions available for ${team}. Please select another team.`);
        }
    }

    // Obține nouă întrebare
    function getNewQuestion() {
        const teamData = questions.find(q => q.team === currentTeam);
        const availableQuestions = teamData.questions.filter(q => !usedQuestions.includes(q.id));
        
        if (availableQuestions.length === 0) {
            // Nu mai sunt întrebări disponibile
            endQuiz();
            return;
        }
        
        // Selectare întrebare aleatoare
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        currentQuestion = availableQuestions[randomIndex];
        usedQuestions.push(currentQuestion.id);
        
        // Resetare stare întrebare
        attemptsLeft = 3;
        updateScore();
        
        // Afișare întrebare
        questionText.textContent = currentQuestion.text;
        playerImage.src = currentQuestion.image;
        playerImage.classList.add('hidden');
        hintText.textContent = '';
        document.getElementById('hintContainer').classList.add('hidden');
        answerInput.value = '';
        resultMessage.textContent = '';
        resultMessage.className = '';
        
        // Reset butoane
        submitAnswer.classList.remove('hidden');
        nextQuestion.classList.add('hidden');
        showHint.classList.remove('hidden');
    }

    // Verificare răspuns
    function checkAnswer() {
        const userAnswer = answerInput.value.trim();
        const correctAnswer = currentQuestion.answer.toLowerCase();
        
        if (userAnswer.toLowerCase() === correctAnswer) {
            // Răspuns corect
            score += attemptsLeft * 10; // Mai multe puncte pentru răspuns rapid
            resultMessage.textContent = 'Correct! Well done!';
            resultMessage.className = 'correct';
            playerImage.src = currentQuestion.image;
            playerImage.classList.remove('hidden');
            
            submitAnswer.classList.add('hidden');
            nextQuestion.classList.remove('hidden');
            showHint.classList.add('hidden');
        } else {
            // Răspuns incorect
            attemptsLeft--;
            
            if (attemptsLeft <= 0) {
                resultMessage.textContent = `Wrong! The correct answer was ${currentQuestion.answer}.`;
                resultMessage.className = 'incorrect';
                playerImage.src = currentQuestion.image;
                playerImage.classList.remove('hidden');
                
                submitAnswer.classList.add('hidden');
                nextQuestion.classList.remove('hidden');
                showHint.classList.add('hidden');
            } else {
                resultMessage.textContent = `Wrong! Try again. ${attemptsLeft} attempts left.`;
                resultMessage.className = 'incorrect';
            }
        }
        
        updateScore();
    }

    // Actualizare scor
    function updateScore() {
        scoreElement.textContent = score;
        attemptsElement.textContent = attemptsLeft;
    }

    // Sfârșit quiz
    function endQuiz() {
        quizContainer.classList.add('hidden');
        startButton.classList.remove('hidden');
        questionText.textContent = `Quiz completed! Your final score: ${score}`;
    }

    // Evenimente
    submitAnswer.addEventListener('click', checkAnswer);
    nextQuestion.addEventListener('click', getNewQuestion);
    showHint.addEventListener('click', function() {
        hintText.textContent = currentQuestion.hint;
        document.getElementById('hintContainer').classList.remove('hidden');
        showHint.classList.add('hidden');
    });
    
    startButton.addEventListener('click', function() {
        quizContainer.classList.add('hidden');
        teamsContainer.classList.remove('hidden');
        startButton.classList.add('hidden');
    });

    // Meniu și info (existente)
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
    adjustContentPosition();
});
