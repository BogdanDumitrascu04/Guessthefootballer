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
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(str => {
            const parser = new DOMParser();
            const data = parser.parseFromString(str, "text/xml");
            
            // Verify XML parsing
            if (data.getElementsByTagName("parsererror").length > 0) {
                throw new Error('Error parsing XML');
            }
            
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
        .catch(error => {
            console.error('Error loading XML:', error);
            // Fallback: Initialize with empty questions if XML fails
            questions = [];
            initTeams();
        });

    // Inițializare echipe
    function initTeams() {
        teamsContainer.innerHTML = ''; // Clear any existing content
        
        const teams = [
            'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford F.C', 'Brighton',
            'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich',
            'Leicester City', 'Liverpool', 'Man City', 'Man United', 'Newcastle',
            'Nottingham', 'Southampton', 'Tottenham', 'West Ham', 'Wolves'
        ];

        teams.forEach(team => {
            const teamDiv = document.createElement('div');
            teamDiv.className = 'team-item';
            teamDiv.innerHTML = `${team}<br><img src="images/leagues/PremierLeague/${team.replace(/\s+/g, '')}/Logo/${team.replace(/\s+/g, '')}.png">;
            
            teamDiv.addEventListener('click', () => {
                selectTeam(team);
                startButton.style.display = 'none'; // Hide start button when team is selected
            });
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
            teamsContainer.classList.add('hidden');
            
            // Obține întrebare aleatoare
            getNewQuestion();
        } else {
            alert(`No questions available for ${team}. Please select another team.`);
        }
    }

    // Rest of your JavaScript functions (getNewQuestion, checkAnswer, etc.) remain the same
    // ...

    // Evenimente
    startButton.addEventListener('click', function() {
        teamsContainer.classList.remove('hidden');
        startButton.style.display = 'none';
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
