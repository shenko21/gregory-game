// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 500;

// Game Constants
const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const MOVE_SPEED = 5;
const FRICTION = 0.8;

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
        // Gregory's body (brown skin tone)
        ctx.fillStyle = '#8B5A3C';
        ctx.fillRect(this.x, this.y + 15, this.width, 25);

        // Gregory's head
        ctx.fillStyle = '#A0694D';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 10, 12, 0, Math.PI * 2);
        ctx.fill();

        // Hair (black)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 5, 13, Math.PI, 0);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        if (this.isFacingRight) {
            ctx.fillRect(this.x + this.width / 2 + 2, this.y + 8, 4, 3);
        } else {
            ctx.fillRect(this.x + this.width / 2 - 6, this.y + 8, 4, 3);
        }

        // Shirt (red - vibrant color)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 5, this.y + 20, this.width - 10, 12);

        // Pants (blue)
        ctx.fillStyle = '#3498db';
        ctx.fillRect(this.x + 5, this.y + 32, this.width - 10, 8);

        // Shoes (black)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 2, this.y + 38, 12, 4);
        ctx.fillRect(this.x + this.width - 14, this.y + 38, 12, 4);
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

        // Platform border
        ctx.strokeStyle = '#229954';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Grass texture
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y, this.width, 4);
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
            this.rotation += 0.1;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            // Outer circle (gold)
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner circle (yellow)
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius - 3, 0, Math.PI * 2);
            ctx.fill();

            // Center symbol
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);

            ctx.restore();
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
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(150, 80, 30, 0, Math.PI * 2);
    ctx.arc(180, 80, 40, 0, Math.PI * 2);
    ctx.arc(210, 80, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(550, 120, 25, 0, Math.PI * 2);
    ctx.arc(580, 120, 35, 0, Math.PI * 2);
    ctx.arc(610, 120, 25, 0, Math.PI * 2);
    ctx.fill();

    // Sun
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(700, 60, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(700, 60, 28, 0, Math.PI * 2);
    ctx.fill();
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
