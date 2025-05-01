const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Debug: Verify canvas initialization
if (!canvas || !ctx) {
    console.error('Canvas or context not found. Ensure #gameCanvas exists in index.html and is not removed from DOM.');
    throw new Error('Canvas initialization failed');
} else {
    console.log('Canvas initialized successfully:', canvas.width, 'x', canvas.height);
}

// Initialize Canvas Size
function setCanvasSize() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        console.log('Canvas resized to:', canvas.width, 'x', canvas.height);
    }
}
setCanvasSize();

// Game State
let player = { x: 0, y: 0, width: 50, height: 50, speed: 10.5, originalSpeed: 10.5, shield: false, shieldTimer: 0, lives: 3 };
let playerName = '';
let keys = {};
let spaceObjects = [];
let powerUps = [];
let projectiles = [];
let dodgedScore = 0;
let destroyedScore = 0;
let totalScore = 0;
let level = 1;
let gameRunning = false;
let isPaused = false;
let doubleScoreActive = false;
let doubleScoreTimer = 0;
let gameTime = 0;
let lastShotTime = 0;
let shotCount = 0;
let shotCooldownActive = false;
let shotCooldownTimer = 0;
let powerUpHighlight = { active: false, type: null, timer: 0 };
let lifeLostNotification = { active: false, message: '', timer: 0 };
let spawnIntervalId = null;
let menuSpawnIntervalId = null;
const shotCooldown = 500; // 500ms between shots

// Images
let playerImg = null;
const images = {
    background: { src: 'assets/background.png', img: new Image(), loaded: false },
    asteroid: { src: 'assets/asteroid.png', img: new Image(), loaded: false },
    comet: { src: 'assets/comet.PNG', img: new Image(), loaded: false },
    debris: { src: 'assets/debris.png', img: new Image(), loaded: false },
    meteor: { src: 'assets/meteor.PNG', img: new Image(), loaded: false },
    space_junk: { src: 'assets/space_junk.PNG', img: new Image(), loaded: false },
    alien_probe: { src: 'assets/alien_probe.PNG', img: new Image(), loaded: false },
    shield: { src: 'assets/shield.png', img: new Image(), loaded: false },
    doubleScore: { src: 'assets/double_score.png', img: new Image(), loaded: false },
    heart: { src: 'assets/heart.png', img: new Image(), loaded: false }
};

// Sounds
const explosionSound = new Audio('assets/explosion.mp3');
const backgroundMusic = new Audio('assets/background_music.mp3');
backgroundMusic.loop = true;

// Background Scroll
let backgroundY = 0;
const backgroundSpeed = 2;

// Get Player Title
function getPlayerTitle(level) {
    const titles = [
        'Beginner', 'Novice', 'Apprentice', 'Initiate', 'Intermediate',
        'Skilled', 'Adept', 'Expert', 'Pro', 'Master',
        'Elite', 'Legend', 'John Wick', 'Hulk', 'Yoda',
        'Thor', 'Iron Man', 'Darth Vader', 'Superman', 'The One',
        'Cosmic Voyager', 'Star Seeker', 'Galactic Scout', 'Nebula Navigator', 'Astro Ace',
        'Meteor Marauder', 'Comet Crusader', 'Orbit Overlord', 'Stellar Soldier', 'Nova Knight',
        'Quantum Quill', 'Pulsar Pioneer', 'Black Hole Baron', 'Interstellar Icon', 'Celestial Champion',
        'Gravity Guru', 'Starstorm Sovereign', 'Cosmo Commander', 'Astral Admiral', 'Galaxy Guardian',
        'Eclipse Enforcer', 'Supernova Sage', 'Void Vanguard', 'Lunar Lord', 'Solar Sentinel',
        'Nebula Nomad', 'Starlight Strategist', 'Cosmic Conqueror', 'Universe Utopian', 'Eternal Explorer'
    ];
    const index = Math.min(Math.floor((level - 1) / 2), titles.length - 1);
    return titles[index];
}

// Handle Resize
function handleResize() {
    if (!canvas) return;
    const prevWidth = canvas.width;
    const prevHeight = canvas.height;
    setCanvasSize();

    // Scale player position
    if (gameRunning) {
        player.x = (player.x / prevWidth) * canvas.width;
        player.y = canvas.height - player.height - 20;
    }

    // Scale existing objects
    spaceObjects.forEach(obj => {
        obj.x = (obj.x / prevWidth) * canvas.width;
        obj.y = (obj.y / prevHeight) * canvas.height;
        obj.width = (obj.width / prevWidth) * canvas.width;
        obj.height = (obj.height / prevHeight) * canvas.height;
    });
    powerUps.forEach(p => {
        p.x = (p.x / prevWidth) * canvas.width;
        p.y = (p.y / prevHeight) * canvas.height;
        p.width = (p.width / prevWidth) * canvas.width;
        p.height = (p.height / prevHeight) * canvas.height;
    });
    projectiles.forEach(p => {
        p.x = (p.x / prevWidth) * canvas.width;
        p.y = (p.y / prevHeight) * canvas.height;
        p.width = (p.width / prevWidth) * canvas.width;
        p.height = (p.height / prevHeight) * canvas.height;
    });
}
window.addEventListener('resize', handleResize);

// Preload Images
function preloadImages(callback) {
    console.log('Starting image preload');
    let loadedCount = 0;
    const totalImages = Object.keys(images).length;
    const timeout = setTimeout(() => {
        console.warn('Image loading timeout reached (10s). Proceeding with available images.');
        callback();
    }, 10000);

    if (totalImages === 0) {
        console.warn('No images to preload');
        clearTimeout(timeout);
        callback();
        return;
    }

    for (const key in images) {
        console.log(`Attempting to load image: ${images[key].src}`);
        images[key].img.src = images[key].src;
        images[key].img.onload = () => {
            if (images[key].img.complete && images[key].img.naturalWidth > 0) {
                console.log(`Image loaded: ${images[key].src}, width=${images[key].img.naturalWidth}, height=${images[key].img.naturalHeight}`);
                images[key].loaded = true;
                console.log(`Successfully loaded ${key} image: ${images[key].src}`);
            } else {
                console.warn(`Image loaded but invalid: ${images[key].src}`);
                images[key].loaded = false;
            }
            loadedCount++;
            if (loadedCount === totalImages) {
                clearTimeout(timeout);
                console.log('All images processed');
                callback();
            }
        };
        images[key].img.onerror = () => {
            console.error(`Image load error: ${images[key].src}. Check file existence, path, or server access.`);
            console.error(`Failed to load image: ${images[key].src}. Check file path, case sensitivity, or file integrity.`);
            images[key].loaded = false;
            loadedCount++;
            if (loadedCount === totalImages) {
                clearTimeout(timeout);
                console.log('All images processed (some failed)');
                callback();
            }
        };
    }
}

// Choose Ship
function chooseShip(imgSrc, speed) {
    console.log(`chooseShip called: imgSrc=${imgSrc}, speed=${speed}`);
    playerName = document.getElementById('playerName').value.trim() || 'Player';
    // Stop menu loop
    console.log('Stopping menu spawn interval');
    if (menuSpawnIntervalId) {
        clearInterval(menuSpawnIntervalId);
        console.log('Menu spawn interval cleared');
    }
    spaceObjects = []; // Clear menu objects
    document.getElementById('menu').style.display = 'none';
    console.log('Menu hidden');
    playerImg = new Image();
    console.log(`Loading player image: ${imgSrc}`);
    playerImg.onload = () => {
        if (playerImg.complete && playerImg.naturalWidth > 0) {
            console.log(`Player image loaded: ${imgSrc}`);
            player.width = 60;
            player.height = 60;
            player.speed = speed;
            player.originalSpeed = speed;
            player.x = canvas.width / 2 - player.width / 2;
            player.y = canvas.height - player.height - 20;
            gameRunning = true;
            backgroundMusic.play();
            startSpawning();
            requestAnimationFrame(gameLoop);
        } else {
            console.warn(`Player image loaded but invalid: ${imgSrc}`);
            console.log('Starting game with fallback due to invalid player image');
            startGameWithFallback(speed);
        }
    };
    playerImg.onerror = () => {
        console.error(`Failed to load player image: ${imgSrc}`);
        startGameWithFallback(speed);
    };
    console.log(`Setting player image src: ${imgSrc}`);
    playerImg.src = imgSrc;

    function startGameWithFallback(speed) {
        player.width = 60;
        player.height = 60;
        player.speed = speed;
        player.originalSpeed = speed;
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
        gameRunning = true;
        backgroundMusic.play();
        startSpawning();
        requestAnimationFrame(gameLoop);
        console.log('Game started with fallback settings');
    }
}

// Debug: Confirm chooseShip is defined
console.log('chooseShip function defined:', typeof chooseShip === 'function');

// Handle Key Presses
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' && gameRunning) togglePause();
    if ((e.key === 'ArrowUp' || e.key === ' ') && gameRunning && !isPaused) shoot();
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Handle Mouse Click
if (canvas) {
    canvas.addEventListener('click', () => {
        if (gameRunning) togglePause();
    });
}

// Spawn Space Objects
function spawnSpaceObject(isMenu = false) {
    if ((isMenu && !menuSpawnIntervalId) || (!isMenu && (isPaused || !gameRunning))) return;
    const type = Math.random();
    let img, size, speed, fallbackColor;
    if (type < 0.1667) {
        img = images.asteroid.img;
        size = 40 + Math.random() * 30;
        speed = 2 + (isMenu ? 0 : level * 1.2);
        fallbackColor = 'gray';
    } else if (type < 0.3334) {
        img = images.comet.img;
        size = 20 + Math.random() * 20;
        speed = 4 + (isMenu ? 0 : level * 1.6);
        fallbackColor = 'gray';
    } else if (type < 0.5001) {
        img = images.debris.img;
        size = 60 + Math.random() * 40;
        speed = 1 + (isMenu ? 0 : level * 0.8);
        fallbackColor = 'gray';
    } else if (type < 0.6668) {
        img = images.meteor.img;
        size = 15 + Math.random() * 10;
        speed = 5 + (isMenu ? 0 : level * 2);
        fallbackColor = 'orange';
    } else if (type < 0.8335) {
        img = images.space_junk.img;
        size = 50 + Math.random() * 30;
        speed = 1.5 + (isMenu ? 0 : level * 0.96);
        fallbackColor = 'brown';
    } else {
        img = images.alien_probe.img;
        size = 70 + Math.random() * 30;
        speed = 0.8 + (isMenu ? 0 : level * 0.64);
        fallbackColor = 'green';
    }
    spaceObjects.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed,
        img,
        fallbackColor
    });
}

// Spawn Power-ups
function spawnPowerUp() {
    if (isPaused || !gameRunning) return;
    const baseProbability = 0.1;
    const probability = Math.min(baseProbability + level * 0.005, 0.15);
    if (Math.random() < probability) {
        const type = Math.random() < 0.5 ? 'shield' : 'doubleScore';
        const img = type === 'shield' ? images.shield.img : images.doubleScore.img;
        powerUps.push({
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 3,
            type,
            img
        });
    }
}

// Dynamic Spawn Interval for Space Objects
function startSpawning() {
    if (spawnIntervalId) clearInterval(spawnIntervalId);
    const interval = 800 / (1 + level * 0.3);
    spawnIntervalId = setInterval(() => spawnSpaceObject(false), interval);
}

// Menu Spawn Interval
function startMenuSpawning() {
    if (menuSpawnIntervalId) clearInterval(menuSpawnIntervalId);
    menuSpawnIntervalId = setInterval(() => spawnSpaceObject(true), 1000);
    console.log('Menu spawning started');
}

setInterval(spawnPowerUp, 500);

// Shoot Projectiles
function shoot() {
    if (shotCooldownActive) return;
    const currentTime = Date.now();
    if (currentTime - lastShotTime < shotCooldown) return;
    lastShotTime = currentTime;
    shotCount++;
    const maxShots = level <= 6 ? 7 : level <= 12 ? 13 : level <= 20 ? 20 : Infinity;
    if (shotCount >= maxShots && maxShots !== Infinity) {
        shotCooldownActive = true;
        shotCooldownTimer = 3 * 60;
        player.speed = 2;
        console.log(`Shooting cooldown triggered: ${maxShots} shots reached at level ${level}`);
    }
    projectiles.push({
        x: player.x + player.width / 2 - 5,
        y: player.y,
        width: 10,
        height: 20,
        speed: -10
    });
}

// Toggle Pause
function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseScreen').style.display = isPaused ? 'block' : 'none';
    if (isPaused) {
        backgroundMusic.pause();
    } else {
        backgroundMusic.play();
        if (gameRunning) {
            requestAnimationFrame(gameLoop);
        }
    }
}

// Format Time as MM:SS:mm
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${millis.toString().padStart(2, '0')}`;
}

// Download Score Card
function downloadScoreCard() {
    const title = getPlayerTitle(level);
    const text = `Nebula Nomad Score Card\n\nPlayer: ${playerName}\nRank: ${title}\nDodged: ${dodgedScore}\nDestroyed: ${destroyedScore}\nTotal Score: ${totalScore}\nLevel: ${level}\nTime: ${formatTime(gameTime)}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scorecard.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// Share Score Card
function shareScoreCard() {
    const title = getPlayerTitle(level);
    const text = `Nebula Nomad: ${playerName} (${title}) scored ${totalScore} (Dodged: ${dodgedScore}, Destroyed: ${destroyedScore}) on Level ${level} in ${formatTime(gameTime)}!`;
    navigator.clipboard.writeText(text).then(() => {
        alert('Score copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy score. Please try again.');
    });
}

// Menu Loop
function menuLoop() {
    if (gameRunning || !canvas || !ctx) return;

    try {
        console.log(`Menu Frame: spaceObjects=${spaceObjects.length}, canvas=${canvas.width}x${canvas.height}, backgroundLoaded=${images.background.loaded}`);

        // Move Background
        backgroundY += backgroundSpeed;
        if (backgroundY >= canvas.height) backgroundY = 0;

        // Clear Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Background
        if (images.background.loaded && images.background.img.complete && images.background.img.naturalWidth > 0) {
            console.log('Drawing background image');
            ctx.drawImage(images.background.img, 0, backgroundY - canvas.height, canvas.width, canvas.height);
            ctx.drawImage(images.background.img, 0, backgroundY, canvas.width, canvas.height);
        } else {
            console.warn('Background image not loaded or broken. Using black fallback.');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Move and Draw Space Objects
        for (let i = 0; i < spaceObjects.length; i++) {
            const obj = spaceObjects[i];
            obj.y += obj.speed;
            if (obj.img && obj.img.complete && obj.img.naturalWidth > 0) {
                ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
            } else {
                ctx.fillStyle = obj.fallbackColor || 'gray';
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                console.warn(`Space object image not loaded or broken for ${obj.img.src}, using ${obj.fallbackColor} fallback`);
            }

            // Remove off-screen
            if (obj.y > canvas.height) {
                spaceObjects.splice(i, 1);
                i--;
            }
        }

        // Debug: Draw Test Rectangle
        ctx.fillStyle = 'blue';
        ctx.fillRect(canvas.width - 50, 10, 40, 40);
    } catch (error) {
        console.error('Error in menuLoop:', error.message, error.stack);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(menuLoop);
}

// Game Loop
function gameLoop() {
    if (!gameRunning || isPaused || !canvas || !ctx) return;

    try {
        console.log(`Game Frame: gameRunning=${gameRunning}, isPaused=${isPaused}, spaceObjects=${spaceObjects.length}, powerUps=${powerUps.length}, projectiles=${projectiles.length}, lives=${player.lives}, canvas=${canvas.width}x${canvas.height}, level=${level}, title=${getPlayerTitle(level)}`);

        // Update Time
        gameTime += 1 / 60;

        // Update Shooting Cooldown
        if (shotCooldownActive) {
            shotCooldownTimer--;
            if (shotCooldownTimer <= 0) {
                shotCooldownActive = false;
                shotCount = 0;
                player.speed = player.originalSpeed;
                console.log('Shooting cooldown ended');
            }
        }

        // Update Power-Up Highlight
        if (powerUpHighlight.active) {
            powerUpHighlight.timer--;
            if (powerUpHighlight.timer <= 0) {
                powerUpHighlight.active = false;
                powerUpHighlight.type = null;
            }
        }

        // Update Shield Timer
        if (player.shield) {
            player.shieldTimer--;
            if (player.shieldTimer <= 0) {
                player.shield = false;
            }
        }

        // Update Life Lost Notification
        if (lifeLostNotification.active) {
            lifeLostNotification.timer--;
            if (lifeLostNotification.timer <= 0) {
                lifeLostNotification.active = false;
                lifeLostNotification.message = '';
            }
        }

        // Move Background
        backgroundY += backgroundSpeed;
        if (backgroundY >= canvas.height) backgroundY = 0;

        // Clear Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Background
        if (images.background.loaded && images.background.img.complete && images.background.img.naturalWidth > 0) {
            console.log('Drawing background image');
            ctx.drawImage(images.background.img, 0, backgroundY - canvas.height, canvas.width, canvas.height);
            ctx.drawImage(images.background.img, 0, backgroundY, canvas.width, canvas.height);
        } else {
            console.warn('Background image not loaded or broken. Using black fallback.');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Move Player
        if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
        if (keys['ArrowRight'] && player.x + player.width < canvas.width) player.x += player.speed;

        // Draw Player
        if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
            ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            console.warn('Player image not loaded or broken, using blue fallback');
        }

        // Player Highlights
        ctx.save();
        if (powerUpHighlight.active) {
            ctx.strokeStyle = powerUpHighlight.type === 'shield' ? 'green' : 'yellow';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(gameTime * 5);
            ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        }
        if (player.shield) {
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 3;
            ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        }
        if (shotCooldownActive) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(gameTime * 5);
            ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        }
        ctx.restore();

        // Move and Draw Space Objects
        for (let i = 0; i < spaceObjects.length; i++) {
            const obj = spaceObjects[i];
            obj.y += obj.speed;
            if (obj.img && obj.img.complete && obj.img.naturalWidth > 0) {
                ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
            } else {
                ctx.fillStyle = obj.fallbackColor || 'gray';
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                console.warn(`Space object image not loaded or broken for ${obj.img.src}, using ${obj.fallbackColor} fallback`);
            }

            // Collision with Player
            if (obj.x < player.x + player.width &&
                obj.x + obj.width > player.x &&
                obj.y < player.y + player.height &&
                obj.y + obj.height > player.y) {
                if (player.shield && player.shieldTimer > 0) {
                    player.shield = false;
                    player.shieldTimer = 0;
                    spaceObjects.splice(i, 1);
                    i--;
                    continue;
                }
                player.lives--;
                lifeLostNotification.active = true;
                lifeLostNotification.message = `${player.lives} Lives Left!`;
                lifeLostNotification.timer = 3 * 60;
                spaceObjects.splice(i, 1);
                i--;
                if (player.lives <= 0) {
                    endGame();
                    return;
                }
                player.x = canvas.width / 2 - player.width / 2;
                player.y = canvas.height - player.height - 20;
                continue;
            }

            // Remove off-screen
            if (obj.y > canvas.height) {
                spaceObjects.splice(i, 1);
                i--;
                dodgedScore += doubleScoreActive ? 2 : 1;
                totalScore = dodgedScore + destroyedScore;
                if (totalScore % 20 === 0) {
                    level++;
                    console.log(`Level up to ${level}: Player title is now ${getPlayerTitle(level)}`);
                    startSpawning();
                }
            }
        }

        // Move and Draw Power-ups
        for (let i = 0; i < powerUps.length; i++) {
            const p = powerUps[i];
            p.y += p.speed;
            ctx.save();
            if (p.img && p.img.complete && p.img.naturalWidth > 0) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.3 + 0.7 * Math.sin(gameTime * 0.8);
                ctx.strokeRect(p.x - 5, p.y - 5, p.width + 10, p.height + 10);
                ctx.globalAlpha = 1;
                ctx.drawImage(p.img, p.x, p.y, p.width, p.height);
            } else {
                ctx.fillStyle = 'purple';
                ctx.fillRect(p.x, p.y, p.width, p.height);
                console.warn(`Power-up image not loaded or broken for ${p.type}, using purple fallback`);
            }
            ctx.restore();

            // Collect Power-up
            if (p.x < player.x + player.width &&
                p.x + p.width > player.x &&
                p.y < player.y + player.height &&
                p.y + p.height > player.y) {
                if (p.type === 'shield') {
                    player.shield = true;
                    player.shieldTimer = 7 * 60;
                } else if (p.type === 'doubleScore') {
                    doubleScoreActive = true;
                    doubleScoreTimer = 12 * 60;
                }
                powerUpHighlight.active = true;
                powerUpHighlight.type = p.type;
                powerUpHighlight.timer = 3 * 60;
                powerUps.splice(i, 1);
                i--;
            }

            // Remove off-screen
            if (p.y > canvas.height) {
                powerUps.splice(i, 1);
                i--;
            }
        }

        // Move and Draw Projectiles
        for (let i = 0; i < projectiles.length; i++) {
            const p = projectiles[i];
            p.y += p.speed;
            ctx.fillStyle = 'red';
            ctx.fillRect(p.x, p.y, p.width, p.height);

            // Check Collision with Space Objects
            for (let j = 0; j < spaceObjects.length; j++) {
                const obj = spaceObjects[j];
                if (p.x < obj.x + obj.width &&
                    p.x + p.width > obj.x &&
                    p.y < obj.y + obj.height &&
                    p.y + p.height > obj.y) {
                    spaceObjects.splice(j, 1);
                    projectiles.splice(i, 1);
                    i--;
                    destroyedScore += doubleScoreActive ? 2 : 1;
                    totalScore = dodgedScore + destroyedScore;
                    if (totalScore % 20 === 0) {
                        level++;
                        console.log(`Level up to ${level}: Player title is now ${getPlayerTitle(level)}`);
                        startSpawning();
                    }
                    break;
                }
            }

            // Remove off-screen
            if (p.y < 0) {
                projectiles.splice(i, 1);
                i--;
            }
        }

        // Update Double Score Timer
        if (doubleScoreActive) {
            doubleScoreTimer--;
            if (doubleScoreTimer <= 0) {
                doubleScoreActive = false;
            }
        }

        // Draw Lifeline Bar
        if (images.heart.loaded && images.heart.img.complete && images.heart.img.naturalWidth > 0) {
            for (let i = 0; i < player.lives; i++) {
                ctx.drawImage(images.heart.img, 10 + i * 40, canvas.height - 40, 30, 30);
            }
        } else {
            ctx.fillStyle = 'red';
            for (let i = 0; i < player.lives; i++) {
                ctx.fillRect(10 + i * 40, canvas.height - 40, 30, 30);
            }
            console.warn('Heart image not loaded or broken, using red fallback');
        }

        // Draw Life Lost Notification
        if (lifeLostNotification.active) {
            ctx.save();
            ctx.font = '40px Arial';
            ctx.fillStyle = 'red';
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(gameTime * 10);
            ctx.textAlign = 'center';
            ctx.fillText(lifeLostNotification.message, canvas.width / 2, 50);
            ctx.restore();
        }

        // Draw UI
        ctx.save();
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Player: ${playerName}, Level: ${level}`, 10, 40);
        ctx.fillText(`Rank: ${getPlayerTitle(level)}`, 10, 80);
        ctx.fillText(`Dodged: ${dodgedScore}`, 10, 120);
        ctx.fillText(`Destroyed: ${destroyedScore}`, 10, 160);
        ctx.fillText(`Total Score: ${totalScore}`, 10, 200);
        let yOffset = 240;
        if (doubleScoreActive) {
            ctx.fillStyle = 'yellow';
            ctx.fillText(`Double Score: ${Math.ceil(doubleScoreTimer / 60)}s`, 10, yOffset);
            yOffset += 40;
        }
        if (shotCooldownActive) {
            ctx.fillStyle = 'red';
            ctx.fillText(`Shooting Cooldown: ${Math.ceil(shotCooldownTimer / 60)}s`, 10, yOffset);
            yOffset += 40;
        }
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(`Time: ${formatTime(gameTime)}`, canvas.width - 10, 40);
        ctx.textAlign = 'left';
        ctx.restore();

        // Debug: Draw Test Rectangle
        ctx.fillStyle = 'blue';
        ctx.fillRect(canvas.width - 50, 10, 40, 40);
    } catch (error) {
        console.error('Error in gameLoop:', error.message, error.stack);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(gameLoop);
}

// End Game
function endGame() {
    explosionSound.play();
    backgroundMusic.pause();
    gameRunning = false;
    const title = getPlayerTitle(level);
    const scoreCard = document.getElementById('scoreCard');
    scoreCard.innerHTML = `
        <h2>Nebula Nomad Retro Space Shooter Score Card</h2>
        <div class="scorecard-header">=== Cosmic Mission Report ===</div>
        <p>Player: ${playerName}</p>
        <p>Rank: ${title}</p>
        <p>Dodged: ${dodgedScore}</p>
        <p>Destroyed: ${destroyedScore}</p>
        <p>Total Score: ${totalScore}</p>
        <p>Level: ${level}</p>
        <p>Time: ${formatTime(gameTime)}</p>
        <button onclick="restartGame()">Restart</button>
        <button onclick="downloadScoreCard()">Download Score</button>
        <button onclick="shareScoreCard()">Share Score</button>
        <a href="https://www.buymeacoffee.com/TheRetroGameCoder" target="_blank" class="coffee-button">Support Nebula Nomad! ☕</a>
    `;
    document.getElementById('gameOver').style.display = 'block';
    if (spawnIntervalId) clearInterval(spawnIntervalId);
}

// Restart Game
function restartGame() {
    dodgedScore = 0;
    destroyedScore = 0;
    totalScore = 0;
    level = 1;
    gameTime = 0;
    spaceObjects = [];
    powerUps = [];
    projectiles = [];
    player.shield = false;
    player.shieldTimer = 0;
    player.lives = 3;
    doubleScoreActive = false;
    doubleScoreTimer = 0;
    shotCount = 0;
    shotCooldownActive = false;
    shotCooldownTimer = 0;
    powerUpHighlight = { active: false, type: null, timer: 0 };
    lifeLostNotification = { active: false, message: '', timer: 0 };
    player.speed = player.originalSpeed;
    document.getElementById('gameOver').style.display = 'none';
    gameRunning = true;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
    backgroundMusic.play();
    startSpawning();
    requestAnimationFrame(gameLoop);
}

// Start Menu Loop after Preloading
console.log('Starting preloadImages');
preloadImages(() => {
    console.log('preloadImages completed, starting menu spawning and loop');
    startMenuSpawning();
    requestAnimationFrame(menuLoop);
});