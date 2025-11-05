// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 500;

// Game Constants
const GRAVITY = 0.5;
const JUMP_STRENGTH = -10;
const MOVE_SPEED = 3;
const FRICTION = 0.85;

// Game State
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    isPlaying: true,
    keys: {}
};

// Player Class (Gregory)
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isOnGround = false;
        this.isFacingRight = true;
    }

    update() {
        // Apply gravity
        this.velocityY += GRAVITY;

        // Horizontal movement
        if (gameState.keys['ArrowLeft']) {
            this.velocityX = -MOVE_SPEED;
            this.isFacingRight = false;
        } else if (gameState.keys['ArrowRight']) {
            this.velocityX = MOVE_SPEED;
            this.isFacingRight = true;
        } else {
            this.velocityX *= FRICTION;
        }

        // Jumping
        if ((gameState.keys[' '] || gameState.keys['ArrowUp']) && this.isOnGround) {
            this.velocityY = JUMP_STRENGTH;
            this.isOnGround = false;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Canvas boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Check if fallen off screen
        if (this.y > canvas.height) {
            this.die();
        }

        // Reset ground state
        this.isOnGround = false;
    }

    draw() {
        // Pixel art style - using only rectangles for blocky look

        // Hair (black) - top of head
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 6, this.y, 18, 8);

        // Gregory's head (brown skin tone) - blocky square head
        ctx.fillStyle = '#A0694D';
        ctx.fillRect(this.x + 6, this.y + 6, 18, 12);

        // Eyes (white with black pupils)
        ctx.fillStyle = 'white';
        if (this.isFacingRight) {
            ctx.fillRect(this.x + 16, this.y + 10, 4, 3);
            // Pupil
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 18, this.y + 11, 2, 2);
        } else {
            ctx.fillRect(this.x + 10, this.y + 10, 4, 3);
            // Pupil
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 10, this.y + 11, 2, 2);
        }

        // Mouth (simple line)
        ctx.fillStyle = '#8B5A3C';
        ctx.fillRect(this.x + 12, this.y + 15, 6, 2);

        // Neck
        ctx.fillStyle = '#A0694D';
        ctx.fillRect(this.x + 11, this.y + 18, 8, 3);

        // Shirt (red - vibrant color) - blocky rectangular body
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 5, this.y + 21, 20, 10);

        // Arms
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 2, this.y + 22, 3, 8); // Left arm
        ctx.fillRect(this.x + 25, this.y + 22, 3, 8); // Right arm

        // Hands
        ctx.fillStyle = '#A0694D';
        ctx.fillRect(this.x + 2, this.y + 29, 3, 3);
        ctx.fillRect(this.x + 25, this.y + 29, 3, 3);

        // Pants (blue) - blocky legs
        ctx.fillStyle = '#3498db';
        ctx.fillRect(this.x + 7, this.y + 31, 7, 7);  // Left leg
        ctx.fillRect(this.x + 16, this.y + 31, 7, 7); // Right leg

        // Shoes (black) - blocky pixel shoes
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 6, this.y + 38, 8, 2);  // Left shoe
        ctx.fillRect(this.x + 16, this.y + 38, 8, 2); // Right shoe
    }

    die() {
        gameState.lives--;
        updateUI();

        if (gameState.lives <= 0) {
            gameOver();
        } else {
            this.respawn();
        }
    }

    respawn() {
        this.x = 50;
        this.y = 100;
        this.velocityX = 0;
        this.velocityY = 0;
    }
}

// Platform Class
class Platform {
    constructor(x, y, width, height, color = '#27ae60') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    draw() {
        // Platform base
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Grass top layer (bright green)
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y, this.width, 3);

        // Add pixel art grass blades on top
        ctx.fillStyle = '#27ae60';
        for (let i = 0; i < this.width; i += 8) {
            ctx.fillRect(this.x + i + 2, this.y - 2, 2, 3);
            ctx.fillRect(this.x + i + 5, this.y - 3, 2, 4);
        }

        // Platform border (darker outline)
        ctx.fillStyle = '#1e8449';
        // Left border
        ctx.fillRect(this.x, this.y, 2, this.height);
        // Right border
        ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
        // Bottom border
        ctx.fillRect(this.x, this.y + this.height - 2, this.width, 2);
    }

    checkCollision(player) {
        if (player.x + player.width > this.x &&
            player.x < this.x + this.width &&
            player.y + player.height > this.y &&
            player.y < this.y + this.height) {

            // Landing on top
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= this.y) {
                player.y = this.y - player.height;
                player.velocityY = 0;
                player.isOnGround = true;
            }
            // Hitting from below
            else if (player.velocityY < 0 && player.y - player.velocityY >= this.y + this.height) {
                player.y = this.y + this.height;
                player.velocityY = 0;
            }
            // Hitting from sides
            else {
                if (player.velocityX > 0) {
                    player.x = this.x - player.width;
                } else {
                    player.x = this.x + this.width;
                }
                player.velocityX = 0;
            }
        }
    }
}

// Coin Class
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.collected = false;
        this.rotation = 0;
    }

    draw() {
        if (!this.collected) {
            // Pixel art style coin - simple animated square
            const size = 12;
            const offset = Math.abs(Math.sin(this.rotation)) * 3;
            this.rotation += 0.05; // Slower rotation for pixel art

            // Outer square (gold)
            ctx.fillStyle = '#f39c12';
            ctx.fillRect(this.x - size/2, this.y - size/2, size, size);

            // Inner square (yellow) - slightly smaller
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(this.x - (size-4)/2, this.y - (size-4)/2, size-4, size-4);

            // Center pixel
            ctx.fillStyle = '#f39c12';
            ctx.fillRect(this.x - 1, this.y - 1, 3, 3);

            // Add a simple animation effect - side pixels
            if (offset > 1.5) {
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(this.x - 2, this.y - 3, 1, 1);
                ctx.fillRect(this.x + 2, this.y - 3, 1, 1);
                ctx.fillRect(this.x - 2, this.y + 3, 1, 1);
                ctx.fillRect(this.x + 2, this.y + 3, 1, 1);
            }
        }
    }

    checkCollision(player) {
        if (!this.collected) {
            const dx = (player.x + player.width / 2) - this.x;
            const dy = (player.y + player.height / 2) - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + player.width / 2) {
                this.collected = true;
                gameState.score += 100;
                updateUI();
            }
        }
    }
}

// Goal Flag
class Goal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.waveOffset = 0;
    }

    draw() {
        this.waveOffset += 0.1;

        // Pole
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(this.x, this.y, 4, this.height);

        // Flag (Mexican-inspired colors)
        const flagWidth = 30;
        const flagHeight = 20;

        // Green stripe
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 5);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 5 + Math.sin(this.waveOffset) * 3);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 11 + Math.sin(this.waveOffset + 0.5) * 3);
        ctx.lineTo(this.x + 4, this.y + 11);
        ctx.fill();

        // White stripe
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 11);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 11 + Math.sin(this.waveOffset + 0.5) * 3);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 17 + Math.sin(this.waveOffset + 1) * 3);
        ctx.lineTo(this.x + 4, this.y + 17);
        ctx.fill();

        // Red stripe
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 17);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 17 + Math.sin(this.waveOffset + 1) * 3);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 23 + Math.sin(this.waveOffset + 1.5) * 3);
        ctx.lineTo(this.x + 4, this.y + 23);
        ctx.fill();
    }

    checkCollision(player) {
        if (player.x + player.width > this.x &&
            player.x < this.x + this.width &&
            player.y + player.height > this.y &&
            player.y < this.y + this.height) {
            levelComplete();
        }
    }
}

// Level Data
const levels = [
    {
        platforms: [
            new Platform(0, canvas.height - 40, 200, 40),
            new Platform(250, canvas.height - 100, 150, 20),
            new Platform(450, canvas.height - 160, 150, 20),
            new Platform(650, canvas.height - 120, 150, 40),
            new Platform(350, canvas.height - 250, 100, 20),
            new Platform(550, canvas.height - 300, 100, 20)
        ],
        coins: [
            new Coin(300, canvas.height - 140),
            new Coin(330, canvas.height - 140),
            new Coin(510, canvas.height - 200),
            new Coin(400, canvas.height - 290),
            new Coin(610, canvas.height - 340)
        ],
        goal: new Goal(720, canvas.height - 180)
    },
    {
        platforms: [
            new Platform(0, canvas.height - 40, 150, 40),
            new Platform(200, canvas.height - 120, 100, 20),
            new Platform(350, canvas.height - 180, 100, 20),
            new Platform(500, canvas.height - 240, 100, 20),
            new Platform(650, canvas.height - 200, 150, 20),
            new Platform(300, canvas.height - 300, 80, 20),
            new Platform(550, canvas.height - 350, 80, 20)
        ],
        coins: [
            new Coin(250, canvas.height - 160),
            new Coin(400, canvas.height - 220),
            new Coin(550, canvas.height - 280),
            new Coin(340, canvas.height - 340),
            new Coin(590, canvas.height - 390)
        ],
        goal: new Goal(730, canvas.height - 260)
    },
    {
        platforms: [
            new Platform(0, canvas.height - 40, 120, 40),
            new Platform(170, canvas.height - 100, 80, 20),
            new Platform(300, canvas.height - 160, 80, 20),
            new Platform(430, canvas.height - 220, 80, 20),
            new Platform(560, canvas.height - 280, 80, 20),
            new Platform(680, canvas.height - 200, 120, 40),
            new Platform(200, canvas.height - 320, 70, 20),
            new Platform(400, canvas.height - 380, 70, 20),
            new Platform(600, canvas.height - 420, 80, 20)
        ],
        coins: [
            new Coin(210, canvas.height - 140),
            new Coin(340, canvas.height - 200),
            new Coin(470, canvas.height - 260),
            new Coin(600, canvas.height - 320),
            new Coin(240, canvas.height - 360),
            new Coin(440, canvas.height - 420),
            new Coin(640, canvas.height - 460)
        ],
        goal: new Goal(730, canvas.height - 260)
    }
];

// Game Objects
let player = new Player(50, 100);
let currentLevel = levels[0];

// Input Handlers
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// UI Functions
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('level').textContent = gameState.level;
}

function showMessage(text) {
    document.getElementById('messageText').textContent = text;
    document.getElementById('gameMessage').classList.remove('hidden');
    gameState.isPlaying = false;
}

function hideMessage() {
    document.getElementById('gameMessage').classList.add('hidden');
    gameState.isPlaying = true;
}

function gameOver() {
    showMessage('Game Over! Final Score: ' + gameState.score);
}

function levelComplete() {
    if (gameState.level < levels.length) {
        gameState.level++;
        gameState.score += 500;
        updateUI();
        loadLevel(gameState.level - 1);
        showMessage('Level Complete! Next Level: ' + gameState.level);
        setTimeout(() => {
            hideMessage();
        }, 2000);
    } else {
        showMessage('Congratulations! You Won! Final Score: ' + gameState.score);
    }
}

function loadLevel(levelIndex) {
    if (levelIndex < levels.length) {
        currentLevel = levels[levelIndex];
        player.respawn();
    }
}

// Restart Button
document.getElementById('restartButton').addEventListener('click', () => {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.isPlaying = true;

    // Reset level data
    levels.forEach(level => {
        level.coins.forEach(coin => coin.collected = false);
    });

    loadLevel(0);
    updateUI();
    hideMessage();
    gameLoop();
});

// Draw background
function drawBackground() {
    // Sky gradient (pixel art style - simple two-tone)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pixel art clouds - blocky rectangles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    // Cloud 1
    ctx.fillRect(140, 75, 20, 15);
    ctx.fillRect(130, 80, 10, 10);
    ctx.fillRect(160, 80, 15, 10);
    ctx.fillRect(175, 75, 20, 15);
    ctx.fillRect(145, 70, 15, 10);
    ctx.fillRect(160, 68, 20, 10);

    // Cloud 2
    ctx.fillRect(540, 115, 20, 15);
    ctx.fillRect(530, 120, 10, 10);
    ctx.fillRect(560, 120, 15, 10);
    ctx.fillRect(575, 115, 15, 15);
    ctx.fillRect(550, 110, 15, 10);

    // Pixel art sun - blocky square sun
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(685, 45, 30, 30);

    // Sun inner glow
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(690, 50, 20, 20);

    // Sun rays (simple pixel style)
    ctx.fillStyle = '#f39c12';
    // Top ray
    ctx.fillRect(698, 35, 4, 8);
    // Bottom ray
    ctx.fillRect(698, 77, 4, 8);
    // Left ray
    ctx.fillRect(673, 58, 8, 4);
    // Right ray
    ctx.fillRect(719, 58, 8, 4);
    // Diagonal rays
    ctx.fillRect(677, 38, 5, 5);
    ctx.fillRect(718, 38, 5, 5);
    ctx.fillRect(677, 72, 5, 5);
    ctx.fillRect(718, 72, 5, 5);
}

// Game Loop
function gameLoop() {
    if (!gameState.isPlaying) return;

    // Draw background
    drawBackground();

    // Update and draw player
    player.update();
    player.draw();

    // Draw and check platforms
    currentLevel.platforms.forEach(platform => {
        platform.draw();
        platform.checkCollision(player);
    });

    // Draw and check coins
    currentLevel.coins.forEach(coin => {
        coin.draw();
        coin.checkCollision(player);
    });

    // Draw and check goal
    currentLevel.goal.draw();
    currentLevel.goal.checkCollision(player);

    requestAnimationFrame(gameLoop);
}

// Start the game
updateUI();
gameLoop();
