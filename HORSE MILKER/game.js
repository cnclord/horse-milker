// Game variables
let gameState = 'start'; // 'start', 'playing', 'victory'
let gameLevel = 1; // Starting at level 1
let horse = {
    x: 640, // Centered in the new larger game area
    y: 480, // Centered in the new larger game area
    width: 240, // Increased from 180 to 240
    height: 240, // Increased from 180 to 240
    speed: 1,
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
let milkDrops = []; // Array to hold milk drop objects
let levelInstructions = ''; // Text instructions for current level
// Variables for frame rate independence
let lastFrameTime = 0;
let deltaTime = 0;
// Game speed multiplier (3.0 = triple speed)
let gameSpeedMultiplier = 3.0;
// Target FPS that the game was designed for (used as reference for scaling)
const TARGET_FPS = 60;
// FPS monitoring (optional for debugging)
let fpsCounter = 0;
let fpsTimer = 0;
let currentFps = 0;
// Device detection
let isTouchDevice = false;
// Scale factor for responsive canvas
let canvasScaleFactor = 1;
// For iOS fullscreen
let isIOS = false;

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
const orientationWarning = document.getElementById('orientation-warning');

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

// Sound effects
const clickSound = document.getElementById('click-sound');
const upgradeSound = document.getElementById('upgrade-sound');
const enemySound = document.getElementById('enemy-sound');
const victorySound = document.getElementById('victory-sound');
const startSound = document.getElementById('start-sound');

// Play sound function with enhanced error handling and debugging
function playSound(sound) {
    try {
        if (!sound) {
            console.error('Failed to play sound: Sound element not found in DOM');
            // Try to use the generated sounds as fallback
            playGeneratedSound(sound.id);
            return;
        }
        
        console.log(`Attempting to play sound: ${sound.id || 'unnamed'}, src: ${sound.src}, readyState: ${sound.readyState}`);
        
        // Check if the audio file is missing
        if (!sound.src || sound.src === '') {
            console.error(`Sound source is empty for ${sound.id || 'unnamed sound'}`);
            // Try to use the generated sounds as fallback
            playGeneratedSound(sound.id);
            return;
        }
        
        // Reset playback to beginning
        sound.currentTime = 0;
        
        // Set maximum volume
        sound.volume = 1.0;
        
        // Unmute in case it was muted
        sound.muted = false;
        
        // Force load before playing
        sound.load();
        
        // Special handling for iOS - start playing silently first
        if (isIOS) {
            sound.volume = 0.01;
            sound.play().then(() => {
                sound.pause();
                sound.volume = 1.0;
                sound.currentTime = 0;
                sound.play().catch(err => {
                    console.error(`iOS sound error after priming: ${err}`);
                    playGeneratedSound(sound.id);
                });
            }).catch(err => {
                console.error(`iOS sound priming error: ${err}`);
                playGeneratedSound(sound.id);
            });
            return;
        }
        
        // Play with detailed error logging
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log(`✅ Successfully playing sound: ${sound.id || 'unnamed'}`);
                })
                .catch(err => {
                    console.error(`❌ Error playing sound ${sound.id || 'unnamed'}:`, err);
                    
                    // Log detailed AutoPlay policy error information
                    if (err.name === 'NotAllowedError') {
                        console.warn('Browser blocked autoplay. Sound will be enabled after user interaction.');
                        // Try to enable audio context on next user interaction
                        document.addEventListener('click', function enableAudio() {
                            sound.play().catch(e => console.error('Still cannot play sound after user interaction:', e));
                            document.removeEventListener('click', enableAudio);
                        }, { once: true });

                        // Also listen for touch events
                        document.addEventListener('touchstart', function enableAudioTouch() {
                            sound.play().catch(e => console.error('Still cannot play sound after touch interaction:', e));
                            document.removeEventListener('touchstart', enableAudioTouch);
                        }, { once: true });
                    } else {
                        // Try to use the generated sounds as fallback
                        playGeneratedSound(sound.id);
                    }
                });
        }
    } catch (e) {
        console.error('Critical error with sound playback:', e);
        // Try to use the generated sounds as fallback
        playGeneratedSound(sound.id);
    }
}

// Function to play a generated sound as fallback
function playGeneratedSound(soundId) {
    console.log(`Attempting to play generated sound as fallback for: ${soundId}`);
    
    // Extract the base name from the sound id (e.g., 'click-sound' -> 'click')
    const baseName = soundId ? soundId.split('-')[0] : '';
    
    if (baseName && window.generatedSounds && window.generatedSounds[baseName]) {
        window.generatedSounds[baseName]();
        console.log(`✅ Played generated fallback sound for: ${baseName}`);
    } else {
        console.warn(`No generated fallback sound available for: ${baseName}`);
    }
}

// Device detection and setup
function detectDevice() {
    // Detect touch device
    isTouchDevice = ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0) || 
                   (navigator.msMaxTouchPoints > 0);
    
    // Detect iOS specifically
    isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    console.log(`Device detection: Touch device: ${isTouchDevice}, iOS: ${isIOS}`);
    
    // Set up cursor visibility
    const customCursor = document.querySelector('.custom-cursor');
    if (customCursor) {
        if (isTouchDevice) {
            // Hide custom cursor on touch devices
            customCursor.style.display = 'none';
            document.body.style.cursor = 'auto';
        } else {
            // Show custom cursor on non-touch devices
            customCursor.style.display = 'block';
            document.body.style.cursor = 'none';
        }
    }
    
    // Fix for 100vh on mobile
    function setVH() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    // Run once on init
    setVH();
    
    // Update on resize or orientation change
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
}

// Handle orientation change
function checkOrientation() {
    if (isTouchDevice && window.matchMedia("(orientation: portrait) and (max-width: 768px)").matches) {
        orientationWarning.style.display = 'flex';
    } else {
        orientationWarning.style.display = 'none';
    }
}

// Responsive canvas setup
function setupResponsiveCanvas() {
    // Calculate scale based on container size
    const containerWidth = document.getElementById('game-container').clientWidth;
    const containerHeight = document.getElementById('game-container').clientHeight;
    
    // Set base sizes
    const baseWidth = 1280;
    const baseHeight = 960;
    
    // Calculate scale
    canvasScaleFactor = Math.min(containerWidth / baseWidth, containerHeight / baseHeight);
    
    // Update canvas sizes
    gameCanvas.width = baseWidth;
    gameCanvas.height = baseHeight;
    victoryCanvas.width = baseWidth;
    victoryCanvas.height = 600;
    
    // Update canvas styles to scale visually
    gameCanvas.style.width = '100%';
    gameCanvas.style.height = '100%';
    victoryCanvas.style.width = '100%';
    victoryCanvas.style.height = '100%';
    
    console.log(`Canvas setup: Scale factor ${canvasScaleFactor.toFixed(2)}, Game canvas: ${gameCanvas.width}x${gameCanvas.height}`);
}

// Completely remove the old cursor implementation and create a new one
// Remove the custom cursor element if it exists
const oldCursor = document.querySelector('.custom-cursor');
if (oldCursor) {
    document.body.removeChild(oldCursor);
}

// Create and add the cursor element
const customCursor = document.createElement('div');
customCursor.className = 'custom-cursor';
const cursorImage = document.createElement('img');
console.log("Attempting to load gnomeling image...");
cursorImage.src = 'assets/gnomeling.png?' + new Date().getTime(); // Add cache-busting parameter
cursorImage.style.width = '100%';
cursorImage.style.height = '100%';
cursorImage.onload = function() {
    console.log("✅ Custom cursor image loaded successfully! Size:", this.naturalWidth, "x", this.naturalHeight);
};
cursorImage.onerror = function(e) {
    console.error("❌ Failed to load gnomeling.png:", e);
    // Try with absolute path as fallback
    const absolutePath = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/assets/gnomeling.png';
    console.error("Trying alternate path:", absolutePath);
    cursorImage.src = absolutePath;
    // Fallback cursor
    document.body.style.cursor = 'pointer';
};
customCursor.appendChild(cursorImage);
document.body.appendChild(customCursor);

// Handle cursor movement - update to use top-left positioning
document.addEventListener('mousemove', (e) => {
    if (isTouchDevice) return; // Skip on touch devices
    
    requestAnimationFrame(() => {
        // No offset needed since we're using the top-left corner as the cursor point
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
    });
});

// Make all clickable elements work with the custom cursor
const clickableElements = [startButton, playAgainButton, gameCanvas];
clickableElements.forEach(element => {
    if (element) {
        element.style.cursor = 'none';
        // Add a hover effect to show interactivity
        element.addEventListener('mouseenter', () => {
            if (!isTouchDevice) customCursor.classList.add('clickable');
        });
        element.addEventListener('mouseleave', () => {
            if (!isTouchDevice) customCursor.classList.remove('clickable');
        });
    }
});

// Hide the cursor when it leaves the window
document.addEventListener('mouseout', (e) => {
    if (isTouchDevice) return; // Skip on touch devices
    
    if (e.relatedTarget === null || e.relatedTarget.nodeName === 'HTML') {
        customCursor.style.display = 'none';
    }
});

document.addEventListener('mouseover', () => {
    if (isTouchDevice) return; // Skip on touch devices
    
    customCursor.style.display = 'block';
});

// Initialize the game
function init() {
    console.log("Game initializing...");
    
    // Detect device capabilities
    detectDevice();
    
    // Check orientation
    checkOrientation();
    
    // Make canvas responsive
    setupResponsiveCanvas();
    
    // Set initial screen display
    startScreen.style.display = 'flex';
    gameScreen.style.display = 'none';
    victoryScreen.style.display = 'none';
    
    // Display fastest time if available and add solid shadow
    if (fastestTime) {
        fastestTimeDisplay.textContent = `Fastest Time: ${parseFloat(fastestTime).toFixed(1)}s`;
    } else {
        fastestTimeDisplay.textContent = 'Fastest Time: Never';
    }
    
    // Add solid shadow to fastest time display
    fastestTimeDisplay.style.textShadow = '2px 2px 0px #e6007e'; // Solid shadow, no blur
    fastestTimeDisplay.style.color = '#5d2906'; // Brown

    // Add event listeners
    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', resetGame);
    
    // Add touch/mouse listeners to canvas - combined for cross-platform support
    gameCanvas.addEventListener('mousedown', handleCanvasInteraction);
    gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // Add orientation change listener
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Style the play again button with the hot pink color
    if (playAgainButton) {
        playAgainButton.style.boxShadow = 'none'; // Remove glow
        playAgainButton.style.border = '3px solid #5d2906'; // Brown border
        playAgainButton.style.backgroundColor = '#e6007e'; // Hot pink background
        playAgainButton.style.color = '#ffffff'; // White text for better visibility
        playAgainButton.style.textShadow = 'none'; // No text shadow for buttons
    }
    
    // Generate custom sound effects to use as fallback
    generateCustomSoundEffects();
    
    // Initialize and check audio files
    initializeAudio();
    
    console.log("Game initialized!");
}

// Handle touch events
function handleTouchStart(e) {
    e.preventDefault(); // Prevent default browser behavior
    
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    // Convert touch position to canvas coordinates
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;
    
    // Check if horse was touched
    checkHorseHit(touchX, touchY);
}

// Handle canvas interactions (works for both mouse and converted touch)
function handleCanvasInteraction(e) {
    if (gameState !== 'playing') return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    
    let clickX, clickY;
    
    // Check if it's a touch event
    if (e.type === 'touchstart' && e.touches && e.touches[0]) {
        clickX = (e.touches[0].clientX - rect.left) * scaleX;
        clickY = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
        // It's a mouse event
        clickX = (e.clientX - rect.left) * scaleX;
        clickY = (e.clientY - rect.top) * scaleY;
    }
    
    // Check if horse was clicked/touched
    checkHorseHit(clickX, clickY);
}

// Check if the player hit the horse
function checkHorseHit(x, y) {
    // Check if horse was hit
    if (
        x >= horse.x && 
        x <= horse.x + horse.width && 
        y >= horse.y && 
        y <= horse.y + horse.height
    ) {
        playSound(clickSound);
        xp += 10;
        xpDisplay.textContent = `XP: ${xp}`;
        
        // Create milk drops when horse is clicked
        createMilkEffect(horse.x + horse.width/2, horse.y + horse.height);
        
        // Check if player should advance to level 2
        if (xp >= 200 && gameLevel === 1) {
            playSound(upgradeSound);
            gameLevel = 2;
            
            // Switch horse types at level 2
            horse.isRacehorse = true;
            
            // Update level 2 instructions
            levelInstructions = 'Careful! The terrorists steal the milky!';
            
            // Add a level up text effect
            freedomText.push({
                text: 'LEVEL 2!!!',
                x: horse.x,
                y: horse.y - 40,
                life: 120,
                dy: -1.5
            });
            
            // Add "RACE HORSE" text moving across the screen
            freedomText.push({
                text: 'RACE HORSE',
                x: 0, // Start from the left edge
                y: gameCanvas.height / 2,
                life: 400, // Longer life to cross the screen more slowly
                dy: 0, // No vertical movement
                dx: 3, // Slower horizontal movement speed (reduced from 10)
                isRaceHorseText: true, // Special flag for this text
                isBigText: true // Flag for larger text
            });
            
            // Make more challenging in level 2
            // Speed up the horse
            horse.speed = 3;
        }
        
        // Check if player reached 420 XP to win
        if (xp >= 420) {
            endGame();
            return;
        }
    }
}

// Initialize and verify audio files
function initializeAudio() {
    // Define the sound elements and their expected sources
    const sounds = [
        { element: clickSound, id: 'click-sound', expectedSrc: 'assets/click.mp3' },
        { element: upgradeSound, id: 'upgrade-sound', expectedSrc: 'assets/upgrade.mp3' },
        { element: enemySound, id: 'enemy-sound', expectedSrc: 'assets/enemy.mp3' },
        { element: victorySound, id: 'victory-sound', expectedSrc: 'assets/victory.mp3' },
        { element: startSound, id: 'start-sound', expectedSrc: 'assets/start.mp3' }
    ];
    
    console.log("🔊 Initializing audio system with provided sound assets...");
    
    // Create a div to show sound warnings if needed
    const warningDiv = document.createElement('div');
    warningDiv.style.position = 'fixed';
    warningDiv.style.bottom = '10px';
    warningDiv.style.left = '10px';
    warningDiv.style.padding = '10px';
    warningDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    warningDiv.style.color = '#fff';
    warningDiv.style.fontSize = '14px';
    warningDiv.style.maxWidth = '300px';
    warningDiv.style.zIndex = '1000';
    warningDiv.style.display = 'none';
    document.body.appendChild(warningDiv);
    
    // Check if audio context is available in this browser
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            // Create a temporary audio context to check browser audio capability
            const tempContext = new AudioContext();
            console.log(`🔊 Audio context state: ${tempContext.state}`);
            
            // Store the context for later use
            window.audioContext = tempContext;
            
            // Resume context if suspended
            if (tempContext.state === 'suspended') {
                console.log("🔊 Audio context suspended, will be resumed on user interaction");
                
                // Combined mouse/touch handler for audio unlock
                const resumeAudio = function() {
                    tempContext.resume().then(() => console.log("🔊 Audio context resumed"));
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('touchstart', resumeAudio);
                };
                
                document.addEventListener('click', resumeAudio, { once: true });
                document.addEventListener('touchstart', resumeAudio, { once: true });
            }
        } else {
            console.warn("⚠️ AudioContext not supported in this browser");
            warningDiv.innerHTML = "Your browser doesn't fully support audio features.";
            warningDiv.style.display = 'block';
        }
    } catch (e) {
        console.error("❌ Error creating AudioContext:", e);
    }
    
    // Check individual sound files
    let emptySoundFiles = 0;
    sounds.forEach(sound => {
        if (!sound.element) {
            console.error(`❌ Sound element "${sound.id}" not found in the DOM`);
            return;
        }
        
        console.log(`🔊 Checking sound: ${sound.id}, current src: ${sound.element.src}`);
        
        // Verify sound file path and existence
        if (!sound.element.src || !sound.element.src.includes(sound.expectedSrc)) {
            console.warn(`⚠️ Sound ${sound.id} has unexpected src: ${sound.element.src}, expected: ${sound.expectedSrc}`);
            
            // Try to fix the source using a direct asset reference
            if (!sound.element.src || sound.element.src === '') {
                sound.element.src = sound.expectedSrc + '?' + new Date().getTime(); // Add cache buster
                console.log(`🔊 Setting source for ${sound.id} to ${sound.element.src}`);
            }
        }
        
        // Check if the sound file is empty or has no duration once metadata is loaded
        sound.element.addEventListener('loadedmetadata', () => {
            if (sound.element.duration === 0 || isNaN(sound.element.duration)) {
                console.error(`❌ Sound ${sound.id} has no duration - likely an empty file`);
                emptySoundFiles++;
                
                // Show warning after all sounds are checked
                if (emptySoundFiles > 0) {
                    warningDiv.innerHTML = `${emptySoundFiles} sound files appear to be empty. Will use generated sounds.`;
                    warningDiv.style.display = 'block';
                    setTimeout(() => {
                        warningDiv.style.display = 'none';
                    }, 5000);
                }
            } else {
                console.log(`✅ Sound ${sound.id} has duration: ${sound.element.duration}s`);
            }
        });
        
        // Set up event listeners for debugging
        sound.element.addEventListener('canplaythrough', () => {
            console.log(`✅ Sound ${sound.id} loaded successfully and can play without buffering`);
        });
        
        sound.element.addEventListener('error', (e) => {
            console.error(`❌ Error loading sound ${sound.id}:`, e);
            warningDiv.innerHTML = `Error loading sound files. Using generated sounds as fallback.`;
            warningDiv.style.display = 'block';
        });
        
        // Force preload
        sound.element.preload = 'auto';
        
        // Try to load the audio file
        try {
            sound.element.load();
        } catch (e) {
            console.error(`❌ Error loading sound ${sound.id}:`, e);
        }
    });
    
    // Add unlocking logic for iOS/mobile devices which require user interaction to play audio
    const unlockAudio = () => {
        sounds.forEach(sound => {
            if (sound.element) {
                // For iOS, we need to play and immediately pause to "unlock" audio
                if (isIOS) {
                    sound.element.volume = 0.01;
                }
                sound.element.play().catch(() => {});
                sound.element.pause();
                sound.element.currentTime = 0;
                if (isIOS) {
                    sound.element.volume = 1.0;
                }
            }
        });
        
        // Also unlock the Web Audio API context
        if (window.audioContext && window.audioContext.state === 'suspended') {
            window.audioContext.resume();
        }
        
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
    };
    
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
    
    // Create a success message
    const successDiv = document.createElement('div');
    successDiv.style.position = 'fixed';
    successDiv.style.bottom = '10px';
    successDiv.style.right = '10px';
    successDiv.style.padding = '10px';
    successDiv.style.backgroundColor = 'rgba(0,100,0,0.7)';
    successDiv.style.color = '#fff';
    successDiv.style.fontSize = '14px';
    successDiv.style.maxWidth = '300px';
    successDiv.style.zIndex = '1000';
    successDiv.style.display = 'none';
    successDiv.innerHTML = 'New sound effects loaded successfully!';
    document.body.appendChild(successDiv);
    
    // Show success message briefly
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Start the game
function startGame() {
    playSound(startSound);
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    startTime = Date.now();
    lastFrameTime = performance.now(); // Initialize lastFrameTime
    resetGameVariables();
    
    // Set level 1 instructions
    levelInstructions = 'Click the horse to milk it and earn XP!';
    
    // iOS specific - try to request fullscreen if available
    if (isIOS && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("Fullscreen request failed on iOS:", err);
        });
    }
    
    requestAnimationFrame(gameLoop);
}

// Reset game variables
function resetGameVariables() {
    gameLevel = 1; // Reset to level 1
    horse = {
        x: 640, // Centered in the new larger game area
        y: 480, // Centered in the new larger game area
        width: 240, // Increased from 180 to 240
        height: 240, // Increased from 180 to 240
        speed: 1,
        directionX: 1,
        directionY: 1,
        isRacehorse: false
    };
    xp = 0;
    gameTime = 0;
    enemies = [];
    enemySpawnTimer = 0;
    freedomText = [];
    milkDrops = [];
}

// Create milk effect when horse is clicked
function createMilkEffect(x, y) {
    // Create multiple milk drops
    for (let i = 0; i < 10; i++) {
        milkDrops.push({
            x: x - 20 + Math.random() * 40, // Random X position near horse center
            y: y, // Bottom of the horse
            speedX: -2 + Math.random() * 4, // Random horizontal speed
            speedY: 2 + Math.random() * 3, // Random downward speed
            size: 5 + Math.random() * 10, // Random size
            life: 30 + Math.random() * 30 // Random lifetime
        });
    }
}

// Update milk drops
function updateMilkDrops() {
    for (let i = milkDrops.length - 1; i >= 0; i--) {
        const drop = milkDrops[i];
        
        // Move drop with time-based movement
        drop.x += drop.speedX * deltaTime * TARGET_FPS;
        drop.y += drop.speedY * deltaTime * TARGET_FPS;
        
        // Apply gravity with time-based calculation
        drop.speedY += 0.2 * deltaTime * TARGET_FPS;
        
        // Decrease life with time-based calculation
        drop.life -= deltaTime * TARGET_FPS;
        
        // Remove if dead
        if (drop.life <= 0) {
            milkDrops.splice(i, 1);
        }
    }
}

// Draw milk drops
function drawMilkDrops() {
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Milk color (slightly transparent white)
    
    milkDrops.forEach(drop => {
        gameCtx.beginPath();
        gameCtx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
        gameCtx.fill();
    });
}

// Game loop
function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    // Calculate delta time (time since last frame in seconds)
    deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    
    // Apply game speed multiplier
    deltaTime *= gameSpeedMultiplier;
    
    // FPS calculation for debugging (optional)
    fpsCounter++;
    fpsTimer += deltaTime / gameSpeedMultiplier; // Use original deltaTime for FPS calculation
    if (fpsTimer >= 1) { // Update FPS count every second
        currentFps = Math.round(fpsCounter / fpsTimer);
        console.log("Current FPS:", currentFps);
        fpsCounter = 0;
        fpsTimer = 0;
    }
    
    // Cap delta time to prevent huge jumps if the game is paused/frozen
    if (deltaTime > 0.2 * gameSpeedMultiplier) deltaTime = 0.2 * gameSpeedMultiplier;

    // Update game time - use real time for the clock, not the accelerated time
    gameTime = (Date.now() - startTime) / 1000;
    timeDisplay.textContent = `Time: ${gameTime.toFixed(1)}s`;

    // Clear canvas
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Draw background if available
    try {
        if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
            gameCtx.drawImage(backgroundImg, 0, 0, gameCanvas.width, gameCanvas.height);
        } else {
            // Fallback background
            gameCtx.fillStyle = '#222222'; // Darker gray background
            gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        }
    } catch (e) {
        console.error("Error drawing background:", e);
        // Emergency fallback
        gameCtx.fillStyle = '#222222'; // Darker gray background
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    }

    // Update HUD - move this earlier so it's under everything else
    xpDisplay.textContent = `XP: ${xp}/420 - Level ${gameLevel}`;
    timeDisplay.textContent = `Time: ${gameTime.toFixed(1)}s`;
    
    // Style HUD elements to match the color scheme - SOLID SHADOW
    xpDisplay.style.color = '#5d2906'; // Brown
    xpDisplay.style.textShadow = '2px 2px 0px #e6007e'; // Solid shadow, no blur
    timeDisplay.style.color = '#5d2906'; // Brown
    timeDisplay.style.textShadow = '2px 2px 0px #e6007e'; // Solid shadow, no blur

    // Display level instructions (positioned back up but below HUD)
    if (levelInstructions) {
        gameCtx.font = 'bold 36px Comic Sans MS';
        gameCtx.fillStyle = '#5d2906'; // Brown
        gameCtx.strokeStyle = '#e6007e'; // Hot pink color
        gameCtx.lineWidth = 4;
        gameCtx.textAlign = 'center';
        gameCtx.strokeText(levelInstructions, gameCanvas.width/2, 160); // Moved back up but below HUD
        gameCtx.fillText(levelInstructions, gameCanvas.width/2, 160);
    }

    // Update and draw horse
    updateHorse();
    drawHorse();

    // Update and draw milk drops
    updateMilkDrops();
    drawMilkDrops();

    // Update and draw enemies - only in level 2 now
    if (gameLevel >= 2) {
        updateEnemies();
        drawEnemies();
    }

    // Update and draw freedom text
    updateFreedomText();

    requestAnimationFrame(gameLoop);
}

// Update horse position
function updateHorse() {
    // Change direction randomly
    if (Math.random() < 0.01 * deltaTime * TARGET_FPS) {
        horse.directionX = Math.random() < 0.5 ? -1 : 1;
    }
    if (Math.random() < 0.01 * deltaTime * TARGET_FPS) {
        horse.directionY = Math.random() < 0.5 ? -1 : 1;
    }

    // Update position with time-based movement
    horse.x += horse.speed * horse.directionX * deltaTime * TARGET_FPS;
    horse.y += horse.speed * horse.directionY * deltaTime * TARGET_FPS;

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
    try {
        if (horse.isRacehorse) {
            if (racehorseImg.complete && racehorseImg.naturalWidth > 0) {
                gameCtx.drawImage(racehorseImg, horse.x, horse.y, horse.width, horse.height);
            } else {
                // Fallback if image not loaded
                gameCtx.fillStyle = '#e6007e'; // New hot pink color
                gameCtx.fillRect(horse.x, horse.y, horse.width, horse.height);
                gameCtx.strokeStyle = '#5d2906'; // Darker brown
                gameCtx.strokeRect(horse.x, horse.y, horse.width, horse.height);
                gameCtx.fillStyle = '#fff';
                gameCtx.font = '24px Arial'; // Increased from 12px for larger text
                gameCtx.fillText('Real', horse.x + 20, horse.y + horse.height/2);
            }
        } else {
            if (horseImg.complete && horseImg.naturalWidth > 0) {
                gameCtx.drawImage(horseImg, horse.x, horse.y, horse.width, horse.height);
            } else {
                // Fallback if image not loaded
                gameCtx.fillStyle = '#5d2906'; // Darker brown
                gameCtx.fillRect(horse.x, horse.y, horse.width, horse.height);
                gameCtx.strokeStyle = '#e6007e'; // New hot pink color
                gameCtx.strokeRect(horse.x, horse.y, horse.width, horse.height);
                gameCtx.fillStyle = '#fff';
                gameCtx.font = '24px Arial'; // Increased from 12px for larger text
                gameCtx.fillText('Blanco', horse.x + 20, horse.y + horse.height/2);
            }
        }
    } catch (e) {
        console.error("Error drawing horse:", e);
        
        // Emergency fallback
        gameCtx.fillStyle = '#5d2906'; // Darker brown
        gameCtx.fillRect(horse.x, horse.y, horse.width, horse.height);
        gameCtx.strokeStyle = '#e6007e'; // New hot pink color
        gameCtx.strokeRect(horse.x, horse.y, horse.width, horse.height);
    }
}

// Update enemies
function updateEnemies() {
    // Spawn enemies less frequently (every 5 seconds in level 1, every 3 seconds in level 2)
    // Use time-based incrementation instead of frame-based
    const spawnIntervalSeconds = gameLevel === 2 ? 3 : 5; // Directly use seconds instead of frames
    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer >= spawnIntervalSeconds) {
        enemySpawnTimer = 0;
        
        // In level 2, sometimes spawn two enemies
        const spawnCount = gameLevel === 2 && Math.random() < 0.5 ? 2 : 1;
        
        for (let i = 0; i < spawnCount; i++) {
            if (Math.random() < 0.5) {
                // Spawn from left
                enemies.push({
                    x: -90, // Smaller enemy size
                    y: Math.random() * (gameCanvas.height - 90),
                    width: 90, // Reduced from 180 to 90 (half size)
                    height: 90, // Reduced from 180 to 90 (half size)
                    speed: 2 + Math.random() * (gameLevel === 2 ? 2 : 1), // Faster in level 2
                    direction: 'right'
                });
            } else {
                // Spawn from right
                enemies.push({
                    x: gameCanvas.width,
                    y: Math.random() * (gameCanvas.height - 90),
                    width: 90, // Reduced from 180 to 90 (half size)
                    height: 90, // Reduced from 180 to 90 (half size)
                    speed: 2 + Math.random() * (gameLevel === 2 ? 2 : 1), // Faster in level 2
                    direction: 'left'
                });
            }
        }
    }

    // Move enemies and check collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move enemy with time-based movement
        if (enemy.direction === 'right') {
            enemy.x += enemy.speed * deltaTime * TARGET_FPS;
        } else {
            enemy.x -= enemy.speed * deltaTime * TARGET_FPS;
        }
        
        // Move toward horse gradually, with time-based movement
        if (enemy.y < horse.y) {
            enemy.y += enemy.speed * 0.5 * deltaTime * TARGET_FPS;
        } else if (enemy.y > horse.y) {
            enemy.y -= enemy.speed * 0.5 * deltaTime * TARGET_FPS;
        }
        
        // Check collision with horse
        if (
            enemy.x < horse.x + horse.width &&
            enemy.x + enemy.width > horse.x &&
            enemy.y < horse.y + horse.height &&
            enemy.y + enemy.height > horse.y
        ) {
            // Enemy hits horse - reduce XP
            xp = Math.max(0, xp - 10);
            playSound(enemySound);
            
            // Remove enemy
            enemies.splice(i, 1);
            
            // Don't go below level 1
            if (xp < 100) {
                if (gameLevel > 1) {
                    levelDown();
                }
            }
            
            continue;
        }
        
        // Remove enemy if it leaves the screen
        if (
            enemy.x < -enemy.width * 2 ||
            enemy.x > gameCanvas.width + enemy.width * 2 ||
            enemy.y < -enemy.height * 2 ||
            enemy.y > gameCanvas.height + enemy.height * 2
        ) {
            enemies.splice(i, 1);
        }
    }
}

// Draw enemies
function drawEnemies() {
    try {
        // Draw enemies
        enemies.forEach(enemy => {
            if (enemyImg.complete && enemyImg.naturalWidth > 0) {
                gameCtx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                // Fallback if image not loaded
                gameCtx.fillStyle = '#e6007e'; // New hot pink color
                gameCtx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                gameCtx.strokeStyle = '#5d2906'; // Darker brown
                gameCtx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
                gameCtx.fillStyle = '#fff';
                gameCtx.font = '24px Arial'; // Increased from 12px for larger text
                gameCtx.fillText('Ememy', enemy.x + 20, enemy.y + enemy.height/2);
            }
        });
        
        // Changed text colors in freedom text (moved to updateFreedomText function)
    } catch (e) {
        console.error("Error drawing enemies:", e);
    }
}

// Update freedom text with time-based movement
function updateFreedomText() {
    // First draw all freedom text
    // Draw freedom text with special handling for RACE HORSE
    freedomText.forEach(text => {
        gameCtx.globalAlpha = text.life / (60 * TARGET_FPS / 60); // Adjust alpha based on relative life
        
        // Use a bigger font for RACE HORSE text
        if (text.isBigText) {
            gameCtx.font = 'bold 80px Comic Sans MS'; // Much bigger font for RACE HORSE
            gameCtx.lineWidth = 8; // Thicker outline for bigger text
        } else {
            gameCtx.font = 'bold 36px Comic Sans MS'; // Regular size for other text
            gameCtx.lineWidth = 5;
        }
        
        gameCtx.fillStyle = '#5d2906'; // Brown
        gameCtx.strokeStyle = '#e6007e'; // Hot pink color
        gameCtx.textAlign = 'center';
        
        gameCtx.strokeText(text.text, text.x, text.y);
        gameCtx.fillText(text.text, text.x, text.y);
    });
    
    gameCtx.globalAlpha = 1;
    
    // Then update positions
    for (let i = freedomText.length - 1; i >= 0; i--) {
        const text = freedomText[i];
        
        // Move text with time-based movement
        text.x += (text.dx || 0) * deltaTime * TARGET_FPS;
        text.y += (text.dy || 0) * deltaTime * TARGET_FPS;
        
        // Decrease life with time-based calculation
        text.life -= deltaTime * TARGET_FPS;
        
        // Remove if dead
        if (text.life <= 0) {
            freedomText.splice(i, 1);
        }
    }
}

// End the game
function endGame() {
    gameState = 'victory';
    playSound(victorySound);
    
    // Set the final stats
    finalTimeDisplay.textContent = `Time: ${gameTime.toFixed(1)}s`;
    finalXpDisplay.textContent = `XP: ${xp}/420`;
    
    // Add solid shadows to these elements
    finalTimeDisplay.style.textShadow = '2px 2px 0px #e6007e'; // Solid shadow, no blur
    finalXpDisplay.style.textShadow = '2px 2px 0px #e6007e'; // Solid shadow, no blur
    
    // Check for new best time
    if ((fastestTime === null || gameTime < parseFloat(fastestTime)) && xp >= 420) {
        localStorage.setItem('horseMilkerFastestTime', gameTime);
        fastestTimeDisplay.textContent = `Fastest Time: ${gameTime.toFixed(1)}s`;
    }
    
    // Show victory screen
    gameScreen.style.display = 'none';
    victoryScreen.style.display = 'flex';
    
    // Style the play again button - no glow
    if (playAgainButton) {
        playAgainButton.style.boxShadow = 'none'; // Remove glow
        playAgainButton.style.border = '3px solid #5d2906'; // Brown border
        playAgainButton.style.backgroundColor = '#e6007e'; // Hot pink background 
        playAgainButton.style.color = '#ffffff'; // White text
        playAgainButton.style.textShadow = 'none'; // No text shadow for buttons
    }
    
    // Initialize lastFrameTime for victory animation
    lastFrameTime = performance.now();
    
    // Start the victory animation loop
    requestAnimationFrame(updateVictoryAnimation);
}

// Update the victory animation loop to use delta time
function updateVictoryAnimation() {
    if (gameState !== 'victory') return;
    
    // Calculate delta time for victory animations
    const timestamp = performance.now();
    deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    
    // Apply game speed multiplier
    deltaTime *= gameSpeedMultiplier;
    
    // Cap delta time
    if (deltaTime > 0.2 * gameSpeedMultiplier) deltaTime = 0.2 * gameSpeedMultiplier;
    
    // Draw celebration
    drawVictoryCelebration();
    
    // Request next frame
    requestAnimationFrame(updateVictoryAnimation);
}

// Draw victory celebration
function drawVictoryCelebration() {
    try {
        // Clear canvas
        victoryCtx.clearRect(0, 0, victoryCanvas.width, victoryCanvas.height);
        
        // Draw background
        victoryCtx.fillStyle = '#1a1a1a'; // Darker background
        victoryCtx.fillRect(0, 0, victoryCanvas.width, victoryCanvas.height);
        
        // Draw ONE large celebratory horse with gnomeling on top
        // Calculate position to center the horse in the canvas
        const x = victoryCanvas.width / 2 - 250; // Half the canvas width minus half the horse width
        
        // Use total elapsed time for smooth animation regardless of frame rate
        // We multiply by a constant factor to control the speed
        const bounceFactor = 0.4 * gameSpeedMultiplier; // Controls bounce speed
        const y = 270 + Math.sin(performance.now() * bounceFactor / 1000) * 30; // Slight bouncing animation
        
        // Draw horse - much bigger
        if (racehorseImg.complete && racehorseImg.naturalWidth > 0) {
            victoryCtx.drawImage(racehorseImg, x, y, 500, 360); // One large horse
                
            // Draw gnomeling directly on top of horse - directly on the horse's back
            if (cursorImage && cursorImage.complete && cursorImage.naturalWidth > 0) {
                // Center the gnomeling on the horse
                victoryCtx.drawImage(cursorImage, x + 150, y + 0, 200, 200);
                    
                // Draw fireworks effect (pee streams)
                drawFireworks(x + 250, y + 80);
            }
        } else {
            // Fallback for missing horse image
            victoryCtx.fillStyle = '#e6007e'; // Hot pink color
            victoryCtx.fillRect(x, y, 500, 360);
            victoryCtx.strokeStyle = '#5d2906'; // Brown
            victoryCtx.strokeRect(x, y, 500, 360);
                
            // Fallback gnomeling
            victoryCtx.fillStyle = '#00FF00';
            victoryCtx.fillRect(x + 150, y + 0, 200, 200);
            victoryCtx.strokeStyle = '#000000';
            victoryCtx.strokeRect(x + 150, y + 0, 200, 200);
        }
        
        // Draw victory text - with consistent SOLID shadows and no blur
        victoryCtx.font = 'bold 80px Comic Sans MS, Arial, sans-serif';
        victoryCtx.fillStyle = '#5d2906'; // Brown
        victoryCtx.strokeStyle = '#e6007e'; // Hot pink
        victoryCtx.lineWidth = 10;
        victoryCtx.textAlign = 'center';
        victoryCtx.strokeText('You milked the horse!', victoryCanvas.width/2, 140);
        victoryCtx.fillText('You milked the horse!', victoryCanvas.width/2, 140);
        
        // Draw 420 text
        victoryCtx.font = 'bold 60px Comic Sans MS, Arial, sans-serif';
        victoryCtx.fillStyle = '#5d2906'; // Brown
        victoryCtx.strokeStyle = '#e6007e'; // Hot pink
        victoryCtx.strokeText('420 XP ACHIEVED!', victoryCanvas.width/2, 220);
        victoryCtx.fillText('420 XP ACHIEVED!', victoryCanvas.width/2, 220);
        
        // FREEDOM text
        victoryCtx.font = 'bold 60px Comic Sans MS';
        victoryCtx.fillStyle = '#5d2906'; // Brown
        victoryCtx.strokeStyle = '#e6007e'; // Hot pink
        victoryCtx.lineWidth = 6;
        victoryCtx.textAlign = 'center';
        victoryCtx.strokeText('FREEDOM', victoryCanvas.width/2, y + 450);
        victoryCtx.fillText('FREEDOM', victoryCanvas.width/2, y + 450);
        
        // Add "Freedom Pee" text at the bottom
        victoryCtx.font = 'bold 18px Comic Sans MS';
        victoryCtx.fillStyle = '#5d2906'; // Brown
        victoryCtx.strokeStyle = '#e6007e'; // Hot pink
        victoryCtx.lineWidth = 2;
        victoryCtx.textAlign = 'center';
        victoryCtx.strokeText('Freedom Pee', victoryCanvas.width/2, victoryCanvas.height - 20);
        victoryCtx.fillText('Freedom Pee', victoryCanvas.width/2, victoryCanvas.height - 20);
        
        // Ensure play again button has correct styling - no glow
        if (playAgainButton) {
            playAgainButton.style.boxShadow = 'none'; // Remove glow
            playAgainButton.style.border = '3px solid #5d2906'; // Brown border
            playAgainButton.style.backgroundColor = '#e6007e';
            playAgainButton.style.color = '#ffffff'; // White text
            playAgainButton.style.textShadow = 'none'; // No text shadow for buttons
        }
    } catch (e) {
        console.error("Error drawing victory:", e);
        
        // Emergency fallback
        victoryCtx.fillStyle = '#1a1a1a';
        victoryCtx.fillRect(0, 0, victoryCanvas.width, victoryCanvas.height);
        victoryCtx.font = 'bold 72px Arial';
        victoryCtx.fillStyle = '#5d2906'; // Brown
        victoryCtx.strokeStyle = '#e6007e'; // Hot pink
        victoryCtx.textAlign = 'center';
        victoryCtx.strokeText('VICTORY - 420!', victoryCanvas.width/2, 140);
        victoryCtx.fillText('VICTORY - 420!', victoryCanvas.width/2, 140);
    }
}

// Helper function to draw fireworks for victory celebration - more like the reference image
function drawFireworks(centerX, centerY) {
    // Use performance.now with a consistent speed factor
    // This ensures the animation runs at the same speed regardless of frame rate
    const animationSpeed = 0.1 * gameSpeedMultiplier; // Controls animation speed
    const time = performance.now() * animationSpeed / 100;
    
    // Define the colors - red, white, and blue like the reference image
    const colors = ['#ff0000', '#ffffff', '#0000ff']; // Red, white, blue
    
    // Single starting point for all lines - position kept at same absolute location
    // This is where the gnome's "pee" originates
    const sourceX = centerX; // Center horizontally
    const sourceY = centerY + 100; // Position at the bottom of the gnome - lowered by another 10px
    
    // Total lines to draw
    const totalLines = 8;
    
    // Center angle (horizontal to the RIGHT now instead of left)
    const centerAngle = 0; // Right direction (0 radians points right)
    
    // Define the max angle spread (10 degrees up and 10 degrees down = 20 degree total)
    const maxAngleSpread = (20 * Math.PI) / 180; // Convert 20 degrees to radians
    
    // Draw all lines from the single source point
    for (let i = 0; i < totalLines; i++) {
        // Calculate the angle for this line
        // Distribute the lines evenly within the 20 degree range
        const angleOffset = (i / (totalLines - 1) * maxAngleSpread) - (maxAngleSpread / 2);
        const angle = centerAngle + angleOffset;
        
        // Calculate the line length with some variation
        const length = 250 + (i % 3) * 30;
        
        // Set color based on position (3 red, 2 white, 3 blue)
        let color;
        if (i < 3) {
            color = '#ff0000'; // Red for first few lines
        } else if (i < 5) {
            color = '#ffffff'; // White for middle lines
        } else {
            color = '#0000ff'; // Blue for last few lines
        }
        
        // Draw the line with more waviness
        victoryCtx.beginPath();
        victoryCtx.moveTo(sourceX, sourceY);
        
        // Add control points for more wave effect while keeping start point fixed
        // Instead of drawing straight lines, use quadratic curves
        // For more waviness, we'll use multiple connected bezier curves
        const segments = 5; // Break each line into multiple segments for waviness
        let lastX = sourceX;
        let lastY = sourceY;
        
        for (let j = 1; j <= segments; j++) {
            // Calculate where this segment should end
            const segmentLength = length / segments;
            const targetX = sourceX + Math.cos(angle) * (segmentLength * j);
            const targetY = sourceY + Math.sin(angle) * (segmentLength * j);
            
            // Add waviness - the further from source, the more wave
            const waveStrength = 15 * (j / segments); // Increased wave strength
            const waveX = Math.sin(time / 5 + i * 0.5 + j) * waveStrength;
            const waveY = Math.cos(time / 4 + i * 0.7 + j * 1.5) * waveStrength;
            
            // Control point for the curve
            const controlX = (lastX + targetX) / 2 + waveX;
            const controlY = (lastY + targetY) / 2 + waveY;
            
            // Draw curve segment
            victoryCtx.quadraticCurveTo(controlX, controlY, targetX, targetY);
            
            // Update last point
            lastX = targetX;
            lastY = targetY;
        }
        
        victoryCtx.lineWidth = 5;
        victoryCtx.strokeStyle = color;
        victoryCtx.stroke();
    }
}

// Reset game for replay
function resetGame() {
    console.log("Resetting game...");
    
    // Try to play the start sound with extra debugging
    if (startSound) {
        console.log(`Attempting to play start sound on reset: ${startSound.src}`);
        startSound.volume = 1.0;
        startSound.currentTime = 0;
        startSound.muted = false;
        
        try {
            startSound.load();
            let playPromise = startSound.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log("Start sound played successfully on reset"))
                    .catch(error => {
                        console.error("Error playing start sound during reset:", error);
                        
                        // Try alternate approach for stubborn browsers
                        setTimeout(() => {
                            startSound.play().catch(e => console.log("Still can't play sound after timeout:", e));
                        }, 100);
                    });
            }
        } catch (e) {
            console.error("Critical error trying to play start sound:", e);
        }
    } else {
        console.warn("Start sound not available for reset - element not found");
    }
    
    victoryScreen.style.display = 'none';
    startScreen.style.display = 'flex';
    gameState = 'start';
}

// Generate custom sound effects
function generateCustomSoundEffects() {
    console.log("Generating custom sound effects as fallback...");
    
    try {
        // Create audio context if Web Audio API is supported
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn("Web Audio API not supported in this browser. Cannot generate sounds.");
            return;
        }
        
        // Use existing audio context or create a new one
        const audioCtx = window.audioContext || new AudioContext();
        
        // Store generated sound functions in a global object
        window.generatedSounds = {};
        
        // Generate click sound function
        window.generatedSounds.click = function() {
            generateSound({
                type: "sine", 
                frequency: 800, 
                duration: 0.08, 
                fadeOut: 0.03,
                gain: 0.3
            });
        };
        
        // Generate upgrade sound function
        window.generatedSounds.upgrade = function() {
            generateSound({
                type: "square",
                frequency: 440,
                duration: 0.4,
                sweep: true,
                sweepTarget: 880,
                gain: 0.2
            });
        };
        
        // Generate enemy sound function
        window.generatedSounds.enemy = function() {
            generateSound({
                type: "sawtooth",
                frequency: 180,
                duration: 0.2,
                sweep: true,
                sweepTarget: 120,
                gain: 0.25
            });
        };
        
        // Generate victory sound function
        window.generatedSounds.victory = function() {
            generateVictorySound();
        };
        
        // Generate start sound function
        window.generatedSounds.start = function() {
            generateSound({
                type: "triangle",
                frequency: 523.25, // C5
                duration: 0.6,
                chord: true,
                gain: 0.3
            });
        };
        
        function generateSound(options) {
            // Create an oscillator
            const oscillator = audioCtx.createOscillator();
            oscillator.type = options.type || "sine";
            oscillator.frequency.setValueAtTime(options.frequency, audioCtx.currentTime);
            
            // Create a gain node for volume control
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(options.gain || 0.5, audioCtx.currentTime);
            
            // Connect oscillator to gain node and gain node to destination
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            // Frequency sweep if requested
            if (options.sweep && options.sweepTarget) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    options.sweepTarget, 
                    audioCtx.currentTime + options.duration
                );
            }
            
            // Add chord tones if requested
            if (options.chord) {
                const fifthOsc = audioCtx.createOscillator();
                fifthOsc.type = options.type;
                fifthOsc.frequency.setValueAtTime(options.frequency * 1.5, audioCtx.currentTime); // Perfect fifth
                fifthOsc.connect(gainNode);
                
                const thirdOsc = audioCtx.createOscillator();
                thirdOsc.type = options.type;
                thirdOsc.frequency.setValueAtTime(options.frequency * 1.25, audioCtx.currentTime); // Major third-ish
                thirdOsc.connect(gainNode);
                
                fifthOsc.start();
                thirdOsc.start();
                
                setTimeout(() => {
                    fifthOsc.stop();
                    thirdOsc.stop();
                }, options.duration * 1000);
            }
            
            // Set fade-out if specified
            if (options.fadeOut) {
                gainNode.gain.exponentialRampToValueAtTime(
                    0.001, 
                    audioCtx.currentTime + options.duration
                );
            }
            
            // Start and schedule stop
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, options.duration * 1000);
        }
        
        function generateVictorySound() {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const durations = [0.2, 0.2, 0.2, 0.5];
            let startTime = 0;
            
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    
                    // Fade out
                    gain.gain.exponentialRampToValueAtTime(
                        0.001, 
                        audioCtx.currentTime + durations[index]
                    );
                    
                    osc.start();
                    setTimeout(() => osc.stop(), durations[index] * 1000);
                }, startTime * 1000);
                
                startTime += durations[index];
            });
        }
        
        console.log("✅ Generated sound effect functions ready as fallback");
        
    } catch (e) {
        console.error("❌ Error generating custom sound effects:", e);
    }
}

// Call init when the page loads
window.addEventListener('load', function() {
    console.log("Window loaded!");
    
    // Style the buttons - no glow
    if (startButton) {
        startButton.style.boxShadow = 'none'; // Remove glow
        startButton.style.border = '3px solid #5d2906'; // Brown border
        startButton.style.backgroundColor = '#e6007e'; // Hot pink background
        startButton.style.color = '#ffffff'; // White text for better visibility
        startButton.style.textShadow = 'none'; // No text shadow needed with colored background
    }
    
    if (playAgainButton) {
        playAgainButton.style.boxShadow = 'none'; // Remove glow
        playAgainButton.style.border = '3px solid #5d2906'; // Brown border
        playAgainButton.style.backgroundColor = '#e6007e'; // Hot pink background
        playAgainButton.style.color = '#ffffff'; // White text for better visibility
        playAgainButton.style.textShadow = 'none'; // No text shadow needed with colored background
    }
    
    // Style text elements - SOLID SHADOWS
    const textElements = document.querySelectorAll('#start-screen h1, #victory-screen h1, #fastest-time, #final-time, #final-xp');
    textElements.forEach(element => {
        element.style.color = '#5d2906'; // Brown text
        element.style.textShadow = '2px 2px 0px #e6007e'; // Solid shadow, no blur
    });
    
    // Check if audio is already in use by some other tab
    navigator.mediaSession && navigator.mediaSession.setActionHandler('play', () => {
        console.log("Media session play handler activated");
    });
    
    init();
});