document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-icon');

    let audioContext;
    let audioBuffer;
    let sourceNode;
    let gainNode;
    let startTime;
    let pauseTime;
    let tiles = [];
    let currentPattern = [];
    let userPattern = [];
    let score = 0;
    let gameStarted = false;
    let currentSong = null;
    let currentRound = 0;

    // Navigation
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetScreen = button.getAttribute('data-screen');
            showScreen(targetScreen);
        });
    });

    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // Song upload and management
    const songUploadForm = document.getElementById('song-upload-form');
    songUploadForm.addEventListener('submit', handleSongUpload);

    function handleSongUpload(event) {
        event.preventDefault();
        const file = document.getElementById('song-file').files[0];
        const name = document.getElementById('song-name').value;
        const difficulty = document.getElementById('song-difficulty').value;

        if (file && name && difficulty) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const song = {
                    name: name,
                    difficulty: difficulty,
                    data: e.target.result
                };
                saveSong(song);
                updateSongList();
                songUploadForm.reset();
            };
            reader.readAsDataURL(file);
        }
    }

    function saveSong(song) {
        let songs = JSON.parse(localStorage.getItem('songs')) || [];
        songs.push(song);
        localStorage.setItem('songs', JSON.stringify(songs));
    }

    function updateSongList() {
        const songList = document.getElementById('song-list');
        songList.innerHTML = '';
        const songs = JSON.parse(localStorage.getItem('songs')) || [];
        songs.forEach((song, index) => {
            const songElement = document.createElement('div');
            songElement.textContent = `${song.name} - ${song.difficulty}`;
            songElement.addEventListener('click', () => selectSong(index));
            songList.appendChild(songElement);
        });
    }

    function selectSong(index) {
        const songs = JSON.parse(localStorage.getItem('songs')) || [];
        currentSong = songs[index];
        document.getElementById('current-song').textContent = currentSong.name;
        initAudioContext(currentSong.data);
        showScreen('game-screen');
    }

    // Audio controls
    const playButton = document.getElementById('play');
    const pauseButton = document.getElementById('pause');
    const stopButton = document.getElementById('stop');
    const startButton = document.getElementById('start');

    playButton.addEventListener('click', playMusic);
    pauseButton.addEventListener('click', pauseMusic);
    stopButton.addEventListener('click', stopMusic);
    startButton.addEventListener('click', startGame);

    function initAudioContext(base64Audio) {
        if (audioContext) {
            audioContext.close();
        }
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        audioContext.decodeAudioData(arrayBuffer, buffer => {
            audioBuffer = buffer;
        });
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64.split(',')[1]);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function playMusic(offset = 0) {
        if (audioBuffer && !sourceNode) {
            sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            gainNode = audioContext.createGain();
            sourceNode.connect(gainNode);
            gainNode.connect(audioContext.destination);
            sourceNode.start(0, offset);
            startTime = audioContext.currentTime - offset;
            playButton.disabled = true;
            pauseButton.disabled = false;
            stopButton.disabled = false;
        }
    }
    
    function pauseMusic() {
        if (sourceNode) {
            pauseTime = audioContext.currentTime;
            sourceNode.stop();
            sourceNode = null;
            playButton.disabled = false;
            pauseButton.disabled = true;
        }
    }

    function resumeMusic() {
        if (pauseTime !== undefined) {
            const offset = pauseTime - startTime;
            playMusic(offset);
            pauseTime = undefined;
        }
    }
    
    function stopMusic() {
        if (sourceNode) {
            sourceNode.stop();
            sourceNode = null;
            playButton.disabled = false;
            pauseButton.disabled = true;
            stopButton.disabled = true;
            startTime = undefined;
            pauseTime = undefined;
        }
    }
// Start the game
function startGame() {
    if (!audioBuffer) {
        alert('Please select a song first.');
        return;
    }

    gameStarted = true;
    currentRound = 0;
    resetGame();
    nextRound();
    playMusic();
    startButton.disabled = true;
}

// Reset game state
function resetGame() {
    currentPattern = [];
    userPattern = [];
    score = 0;
    updateScore();
    tiles = Array.from(document.querySelectorAll('.tile'));
}

// Generate pattern for the round
function generatePattern() {
    const randomTile = Math.floor(Math.random() * tiles.length);
    currentPattern.push(randomTile);
}

function nextRound() {
    currentRound++;
    generatePattern();
    displayPattern();
}

// Display the pattern to the user
function displayPattern() {
    let index = 0;
    userPattern = [];
    disableUserInput();

    const interval = setInterval(() => {
        if (index >= currentPattern.length) {
            clearInterval(interval);
            pauseMusic();
            enableUserInput();
            return;
        }

        lightUpTile(currentPattern[index]);
        index++;
    }, 1000);
}

// Light up a specific tile
function lightUpTile(index) {
    tiles[index].classList.add('active');
    setTimeout(() => {
        tiles[index].classList.remove('active');
    }, 500);
}

// Disable user input
function disableUserInput() {
    tiles.forEach(tile => {
        tile.removeEventListener('click', handleUserClick);
    });
}

// Enable user input
function enableUserInput() {
    tiles.forEach((tile, index) => {
        tile.addEventListener('click', () => handleUserClick(index));
    });
}

// Handle user clicks
function handleUserClick(index) {
    if (!gameStarted) return;

    userPattern.push(index);
    lightUpTile(index);

    // Check if the clicked tile is the correct one
    // if (index !== currentPattern[userPattern.length - 1]) {
    //     endGame();
    //     return;
    // }

    // Check if the user has completed the pattern
    if (userPattern.length === currentPattern.length) {
        score++;
        updateScore();
        setTimeout(() => {
            resumeMusic();
            nextRound();
        }, 1000);
    }
}

// Update the score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}
    
    function endGame() {
        gameStarted = false;
        stopMusic();
        alert(`Game over! Your score: ${score}`);
        saveStats();
        updateStats();
        startButton.disabled = false;
    }

    // Statistics
    function saveStats() {
        let stats = JSON.parse(localStorage.getItem('stats')) || {};
        if (!stats[currentSong.name]) {
            stats[currentSong.name] = {
                highScore: 0,
                totalPlays: 0,
                totalScore: 0
            };
        }
        stats[currentSong.name].highScore = Math.max(stats[currentSong.name].highScore, score);
        stats[currentSong.name].totalPlays++;
        stats[currentSong.name].totalScore += score;
        localStorage.setItem('stats', JSON.stringify(stats));
    }

    function updateStats() {
        const overallStats = document.getElementById('overall-stats');
        const songStats = document.getElementById('song-stats');
        const stats = JSON.parse(localStorage.getItem('stats')) || {};

        let totalScore = 0;
        let totalPlays = 0;
        let overallHighScore = 0;

        overallStats.innerHTML = '';
        songStats.innerHTML = '';

        for (const [song, data] of Object.entries(stats)) {
            totalScore += data.totalScore;
            totalPlays += data.totalPlays;
            overallHighScore = Math.max(overallHighScore, data.highScore);

            const songStatElement = document.createElement('div');
            songStatElement.textContent = `${song}: High Score - ${data.highScore}, Avg Score - ${(data.totalScore / data.totalPlays).toFixed(2)}`;
            songStats.appendChild(songStatElement);
        }

        const overallStatsElement = document.createElement('div');
        overallStatsElement.innerHTML = `
            <p>Total Plays: ${totalPlays}</p>
            <p>Overall High Score: ${overallHighScore}</p>
            <p>Average Score: ${totalPlays > 0 ? (totalScore / totalPlays).toFixed(2) : 0}</p>
        `;
        overallStats.appendChild(overallStatsElement);
    }

    // Create tiles on page load
    const gameBoard = document.getElementById('game-board');
    const colorClasses = ['#ff9500', '#0019ff', '#eaff00', '#00d9ff', '#00ff7b', '#ff1a00'];

    // Function to get a random color from the colorClasses array
    function getRandomColor() {
        const randomIndex = Math.floor(Math.random() * colorClasses.length);
        return colorClasses[randomIndex];
    }

    // Create game board and assign a random color to each tile
    for (let i = 0; i < 9; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.style.backgroundColor = getRandomColor(); // Set random color
        gameBoard.appendChild(tile);
    }

    // Initial setup
    updateSongList();
    updateStats();
    showScreen('home-screen');
});