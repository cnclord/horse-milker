 // Game variables
let gameState = 'start'; // 'start', 'playing', 'victory'
let horse = {
    x: 400,
    y: 300,
    width: 64,
    height: 64,
    speed: 2,
    directionX: 1,
    directionY: 1,
    isRacehorse: false
};
let xp = 0;
let gameTime = 0;
let startTime = 0;
let enemies = [];
let enemySpawnTimer = 0;
let fastestTime = localStorage.getItem('horseMilkerFastestTime') || null;
let freedomText = [];

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const victoryScreen = document.getElementById('victory-screen');
const startButton = document.getElementById('start-button');
const playAgainButton = document.getElementById('play-again-button');
const fastestTimeDisplay = document.getElementById('fastest-time');
const xpDisplay = document.getElementById('xp-display');
const timeDisplay = document.getElementById('time-display');
const finalTimeDisplay = document.getElementById('final-time');
const finalXpDisplay = document.getElementById('final-xp');

// Canvas and context
const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
const victoryCanvas = document.getElementById('victory-canvas');
const victoryCtx = victoryCanvas.getContext('2d');

// Images
const horseImg = document.getElementById('horse-img');
const racehorseImg = document.getElementById('racehorse-img');
const gnomeImg = document.getElementById('gnome-img');
const enemyImg = document.getElementById('enemy-img');
const backgroundImg = document.getElementById('background-img');

// Custom cursor
const customCursor = document.createElement('img');
customCursor.src = 'assets/gnome.png';
customCursor.classList.add('custom-cursor');
document.body.appendChild(customCursor);

// Update cursor position on mouse move
document.addEventListener('mousemove', (e) => {
    customCursor.style.left = `${e.clientX}px`;
    customCursor.style.top = `${e.clientY}px`;
});

// Initialize the game
function init() {
    // Display fastest time if available
    if (fastestTime) {
        fastestTimeDisplay.textContent = `Fastest Time: ${parseFloat(fastestTime).toFixed(1)}s`;
    } else {
        fastestTimeDisplay.textContent = 'Fastest Time: Never';
    }

    // Add event listeners
    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', resetGame);
    gameCanvas.addEventListener('click', handleClick);
}

// Start the game
function startGame() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    startTime = Date.now();
    resetGameVariables();
    requestAnimationFrame(gameLoop);
}

// Reset game variables
function resetGameVariables() {
    horse = {
        x: 400,
        y: 300,
        width: 64,
        height: 64,
        speed: 2,
        directionX: 1,
        directionY: 1,
        isRacehorse: false
    };
    xp = 0;
    gameTime = 0;
    enemies = [];
    enemySpawnTimer = 0;
    freedomText = [];
}

// Handle canvas clicks
function handleClick(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if horse was clicked
    if (
        clickX >= horse.x && 
        clickX <= horse.x + horse.width && 
        clickY >= horse.y && 
        clickY <= horse.y + horse.height
    ) {
        xp += 10;
        xpDisplay.textContent = `XP: ${xp}`;
        
        // Check if horse should upgrade to racehorse
        if (xp >= 100 && !horse.isRacehorse) {
            horse.isRacehorse = true;
            horse.speed = 4; // Racehorse is faster
        }
    }
}

// Game loop
function gameLoop() {
    if (gameState !== 'playing') return;

    // Update game time
    gameTime = (Date.now() - startTime) / 1000;
    timeDisplay.textContent = `Time: ${gameTime.toFixed(1)}s`;

    // Check if game should end (60 second limit)
    if (gameTime >= 60) {
        endGame();
        return;
    }

    // Clear canvas
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Draw background if available
    if (backgroundImg.complete) {
        gameCtx.drawImage(backgroundImg, 0, 0, gameCanvas.width, gameCanvas.height);
    }

    // Update and draw horse
    updateHorse();
    drawHorse();

    // Update and draw enemies
    if (horse.isRacehorse) {
        updateEnemies();
        drawEnemies();
    }

    // Update HUD
    xpDisplay.textContent = `XP: ${xp}`;
    timeDisplay.textContent = `Time: ${gameTime.toFixed(1)}s`;

    requestAnimationFrame(gameLoop);
}

// Update horse position
function updateHorse() {
    // Change direction randomly
    if (Math.random() < 0.01) {
        horse.directionX = Math.random() < 0.5 ? -1 : 1;
    }
    if (Math.random() < 0.01) {
        horse.directionY = Math.random() < 0.5 ? -1 : 1;
    }

    // Update position
    horse.x += horse.speed * horse.directionX;
    horse.y += horse.speed * horse.directionY;

    // Bounce off walls
    if (horse.x <= 0 || horse.x >= gameCanvas.width - horse.width) {
        horse.directionX *= -1;
    }
    if (horse.y <= 0 || horse.y >= gameCanvas.height - horse.height) {
        horse.directionY *= -1;
    }

    // Keep horse in bounds
    horse.x = Math.max(0, Math.min(gameCanvas.width - horse.width, horse.x));
    horse.y = Math.max(0, Math.min(gameCanvas.height - horse.height, horse.y));
}

// Draw horse on canvas
function drawHorse() {
    if (horse.isRacehorse) {
        gameCtx.drawImage(racehorseImg, horse.x, horse.y, horse.width, horse.height);
    } else {
        gameCtx.drawImage(horseImg, horse.x, horse.y, horse.width, horse.height);
    }
}

// Update enemies
function updateEnemies() {
    // Spawn enemies every 2 seconds after reaching 100 XP
    enemySpawnTimer += 1;
    if (enemySpawnTimer >= 120) { // 60 fps, so 120 frames = 2 seconds
        enemySpawnTimer = 0;
        
        // Spawn from left
        enemies.push({
            x: -64,
            y: Math.random() * (gameCanvas.height - 64),
            width: 64,
            height: 64,
            speed: 2 + Math.random() * 1,
            direction: 'right'
        });
        
        // Spawn from right
        enemies.push({
            x: gameCanvas.width,
            y: Math.random() * (gameCanvas.height - 64),
            width: 64,
            height: 64,
            speed: 2 + Math.random() * 1,
            direction: 'left'
        });
    }

    // Move enemies and check collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move enemy
        if (enemy.direction === 'right') {
            enemy.x += enemy.speed;
        } else {
            enemy.x -= enemy.speed;
        }
        
        // Move toward horse gradually
        if (enemy.y < horse.y) {
            enemy.y += enemy.speed * 0.5;
        } else if (enemy.y > horse.y) {
            enemy.y -= enemy.speed * 0.5;
        }
        
        // Check collision with horse
        if (
            enemy.x < horse.x + horse.width &&
            enemy.x + enemy.width > horse.x &&
            enemy.y < horse.y + horse.height &&
            enemy.