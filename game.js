// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 500;

// Biome Types
const BIOMES = {
    GRASSLAND: 'grassland',
    UNDERWATER: 'underwater',
    SPACE: 'space',
    DESERT: 'desert',
    SNOW: 'snow'
};

// Base Game Constants (modified by biome)
const BASE_GRAVITY = 0.5;
const BASE_JUMP_STRENGTH = -10;
const BASE_MOVE_SPEED = 3;
const BASE_FRICTION = 0.85;

// Game State
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    isPlaying: true,
    keys: {},
    currentBiome: BIOMES.GRASSLAND,
    hasDoubleJump: false,
    hasShield: false,
    canShoot: false,
    shieldTimer: 0,
    playerJumps: 0
};

// Weather particles
let weatherParticles = [];

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
        this.jumps = 0;
        this.maxJumps = 1;
    }

    update() {
        // Get biome-modified physics
        const physics = getBiomePhysics(gameState.currentBiome);

        // Apply gravity
        this.velocityY += physics.gravity;

        // Horizontal movement
        if (gameState.keys['ArrowLeft']) {
            this.velocityX = -physics.moveSpeed;
            this.isFacingRight = false;
        } else if (gameState.keys['ArrowRight']) {
            this.velocityX = physics.moveSpeed;
            this.isFacingRight = true;
        } else {
            this.velocityX *= physics.friction;
        }

        // Jumping
        if ((gameState.keys[' '] || gameState.keys['ArrowUp']) && !this.jumpPressed) {
            if (this.isOnGround || (gameState.hasDoubleJump && this.jumps < 2)) {
                this.velocityY = physics.jumpStrength;
                this.isOnGround = false;
                this.jumps++;
                this.jumpPressed = true;
            }
        }

        if (!gameState.keys[' '] && !gameState.keys['ArrowUp']) {
            this.jumpPressed = false;
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

        // Update shield timer
        if (gameState.shieldTimer > 0) {
            gameState.shieldTimer--;
            if (gameState.shieldTimer === 0) {
                gameState.hasShield = false;
            }
        }
    }

    draw() {
        // Shield effect
        if (gameState.hasShield) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 25, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Pixel art Gregory - using only rectangles for blocky look

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
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 18, this.y + 11, 2, 2);
        } else {
            ctx.fillRect(this.x + 10, this.y + 10, 4, 3);
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 10, this.y + 11, 2, 2);
        }

        // Mouth
        ctx.fillStyle = '#8B5A3C';
        ctx.fillRect(this.x + 12, this.y + 15, 6, 2);

        // Neck
        ctx.fillStyle = '#A0694D';
        ctx.fillRect(this.x + 11, this.y + 18, 8, 3);

        // Shirt (red)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 5, this.y + 21, 20, 10);

        // Arms
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 2, this.y + 22, 3, 8);
        ctx.fillRect(this.x + 25, this.y + 22, 3, 8);

        // Hands
        ctx.fillStyle = '#A0694D';
        ctx.fillRect(this.x + 2, this.y + 29, 3, 3);
        ctx.fillRect(this.x + 25, this.y + 29, 3, 3);

        // Pants (blue)
        ctx.fillStyle = '#3498db';
        ctx.fillRect(this.x + 7, this.y + 31, 7, 7);
        ctx.fillRect(this.x + 16, this.y + 31, 7, 7);

        // Shoes (black)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 6, this.y + 38, 8, 2);
        ctx.fillRect(this.x + 16, this.y + 38, 8, 2);
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
        this.jumps = 0;
        gameState.hasShield = false;
        gameState.shieldTimer = 0;
    }
}

// Enemy Base Class
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 25;
        this.height = 25;
        this.velocityX = 1;
        this.defeated = false;
        this.patrolLeft = x - 60;
        this.patrolRight = x + 60;
    }

    update() {
        if (this.defeated) return;

        // Patrol movement
        this.x += this.velocityX;

        if (this.x <= this.patrolLeft || this.x >= this.patrolRight) {
            this.velocityX *= -1;
        }
    }

    draw() {
        if (this.defeated) return;

        ctx.save();

        // Different enemy types by biome
        switch(this.type) {
            case 'slime':
                this.drawSlime();
                break;
            case 'fish':
                this.drawFish();
                break;
            case 'alien':
                this.drawAlien();
                break;
            case 'scorpion':
                this.drawScorpion();
                break;
            case 'snowman':
                this.drawSnowman();
                break;
        }

        ctx.restore();
    }

    drawSlime() {
        // Green slime enemy
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x, this.y + 10, this.width, 15);
        ctx.fillRect(this.x + 5, this.y + 5, 15, 10);

        // Eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 8, this.y + 8, 3, 3);
        ctx.fillRect(this.x + 14, this.y + 8, 3, 3);
    }

    drawFish() {
        // Blue fish enemy
        ctx.fillStyle = '#3498db';
        ctx.fillRect(this.x + 5, this.y + 8, 15, 10);

        // Tail
        ctx.fillRect(this.x, this.y + 10, 5, 6);

        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 16, this.y + 10, 3, 3);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 17, this.y + 11, 1, 1);
    }

    drawAlien() {
        // Purple alien enemy
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(this.x + 5, this.y, 15, 10);
        ctx.fillRect(this.x + 3, this.y + 10, 19, 12);

        // Antennae
        ctx.fillRect(this.x + 7, this.y - 5, 2, 5);
        ctx.fillRect(this.x + 16, this.y - 5, 2, 5);
        ctx.fillRect(this.x + 6, this.y - 7, 4, 2);
        ctx.fillRect(this.x + 15, this.y - 7, 4, 2);

        // Eyes
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x + 8, this.y + 5, 4, 4);
        ctx.fillRect(this.x + 13, this.y + 5, 4, 4);
    }

    drawScorpion() {
        // Orange scorpion enemy
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(this.x + 5, this.y + 12, 15, 8);

        // Claws
        ctx.fillRect(this.x + 2, this.y + 15, 3, 3);
        ctx.fillRect(this.x + 20, this.y + 15, 3, 3);

        // Tail
        ctx.fillRect(this.x + 18, this.y + 8, 3, 4);
        ctx.fillRect(this.x + 19, this.y + 4, 3, 4);

        // Eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 8, this.y + 14, 2, 2);
        ctx.fillRect(this.x + 13, this.y + 14, 2, 2);
    }

    drawSnowman() {
        // White snowman enemy
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 6, this.y, 13, 12);
        ctx.fillRect(this.x + 5, this.y + 12, 15, 13);

        // Eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 9, this.y + 4, 2, 2);
        ctx.fillRect(this.x + 14, this.y + 4, 2, 2);

        // Buttons
        ctx.fillRect(this.x + 11, this.y + 15, 2, 2);
        ctx.fillRect(this.x + 11, this.y + 19, 2, 2);

        // Carrot nose
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(this.x + 11, this.y + 7, 3, 2);
    }

    checkCollision(player) {
        if (this.defeated) return false;

        if (player.x + player.width > this.x &&
            player.x < this.x + this.width &&
            player.y + player.height > this.y &&
            player.y < this.y + this.height) {

            // Jump on enemy to defeat
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= this.y + 5) {
                this.defeated = true;
                gameState.score += 50;
                updateUI();
                player.velocityY = -7; // Bounce
                return false;
            } else {
                // Hit by enemy
                if (!gameState.hasShield) {
                    return true;
                }
            }
        }
        return false;
    }
}

// Platform Class
class Platform {
    constructor(x, y, width, height, biome) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.biome = biome;
    }

    draw() {
        const colors = getBiomeColors(this.biome);

        // Platform base
        ctx.fillStyle = colors.platform;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Top layer
        ctx.fillStyle = colors.platformTop;
        ctx.fillRect(this.x, this.y, this.width, 3);

        // Grass blades or biome-specific decoration
        if (this.biome === BIOMES.GRASSLAND) {
            ctx.fillStyle = colors.platformAccent;
            for (let i = 0; i < this.width; i += 8) {
                ctx.fillRect(this.x + i + 2, this.y - 2, 2, 3);
                ctx.fillRect(this.x + i + 5, this.y - 3, 2, 4);
            }
        } else if (this.biome === BIOMES.SPACE) {
            // Space platforms have glowing edges
            ctx.fillStyle = '#9b59b6';
            for (let i = 0; i < this.width; i += 10) {
                ctx.fillRect(this.x + i, this.y, 2, 2);
            }
        } else if (this.biome === BIOMES.SNOW) {
            // Icicles
            ctx.fillStyle = '#d0f4f7';
            for (let i = 0; i < this.width; i += 15) {
                ctx.fillRect(this.x + i + 5, this.y + this.height, 3, 4);
            }
        }

        // Platform border
        ctx.fillStyle = colors.platformBorder;
        ctx.fillRect(this.x, this.y, 2, this.height);
        ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
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
                player.jumps = 0;
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
            const size = 12;
            const offset = Math.abs(Math.sin(this.rotation)) * 3;
            this.rotation += 0.05;

            ctx.fillStyle = '#f39c12';
            ctx.fillRect(this.x - size/2, this.y - size/2, size, size);

            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(this.x - (size-4)/2, this.y - (size-4)/2, size-4, size-4);

            ctx.fillStyle = '#f39c12';
            ctx.fillRect(this.x - 1, this.y - 1, 3, 3);

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

// Power-up Class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'shield', 'doublejump', 'speedboost'
        this.width = 20;
        this.height = 20;
        this.collected = false;
        this.bounce = 0;
    }

    draw() {
        if (!this.collected) {
            this.bounce += 0.1;
            const offsetY = Math.sin(this.bounce) * 3;

            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2 + offsetY);

            if (this.type === 'shield') {
                // Blue shield icon
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#3498db';
                ctx.fillRect(-3, -8, 6, 3);
            } else if (this.type === 'doublejump') {
                // Wings icon
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(-8, -5, 5, 8);
                ctx.fillRect(3, -5, 5, 8);
                ctx.fillRect(-6, -3, 3, 4);
                ctx.fillRect(3, -3, 3, 4);
            }

            ctx.restore();
        }
    }

    checkCollision(player) {
        if (!this.collected) {
            if (player.x + player.width > this.x &&
                player.x < this.x + this.width &&
                player.y + player.height > this.y &&
                player.y < this.y + this.height) {

                this.collected = true;

                if (this.type === 'shield') {
                    gameState.hasShield = true;
                    gameState.shieldTimer = 600; // 10 seconds at 60fps
                } else if (this.type === 'doublejump') {
                    gameState.hasDoubleJump = true;
                    player.maxJumps = 2;
                }

                gameState.score += 200;
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

        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 5);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 5 + Math.sin(this.waveOffset) * 3);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 11 + Math.sin(this.waveOffset + 0.5) * 3);
        ctx.lineTo(this.x + 4, this.y + 11);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 11);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 11 + Math.sin(this.waveOffset + 0.5) * 3);
        ctx.lineTo(this.x + 4 + flagWidth, this.y + 17 + Math.sin(this.waveOffset + 1) * 3);
        ctx.lineTo(this.x + 4, this.y + 17);
        ctx.fill();

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

// Helper Functions
function getBiomePhysics(biome) {
    switch(biome) {
        case BIOMES.UNDERWATER:
            return {
                gravity: 0.2,
                jumpStrength: -6,
                moveSpeed: 2,
                friction: 0.95
            };
        case BIOMES.SPACE:
            return {
                gravity: 0.15,
                jumpStrength: -12,
                moveSpeed: 3,
                friction: 0.98
            };
        case BIOMES.SNOW:
            return {
                gravity: 0.5,
                jumpStrength: -9,
                moveSpeed: 2.5,
                friction: 0.95
            };
        case BIOMES.DESERT:
            return {
                gravity: 0.5,
                jumpStrength: -10,
                moveSpeed: 3,
                friction: 0.85
            };
        default: // GRASSLAND
            return {
                gravity: BASE_GRAVITY,
                jumpStrength: BASE_JUMP_STRENGTH,
                moveSpeed: BASE_MOVE_SPEED,
                friction: BASE_FRICTION
            };
    }
}

function getBiomeColors(biome) {
    switch(biome) {
        case BIOMES.UNDERWATER:
            return {
                platform: '#2980b9',
                platformTop: '#3498db',
                platformAccent: '#1abc9c',
                platformBorder: '#1f618d',
                sky: '#154360',
                skyBottom: '#2874a6'
            };
        case BIOMES.SPACE:
            return {
                platform: '#34495e',
                platformTop: '#7f8c8d',
                platformAccent: '#9b59b6',
                platformBorder: '#2c3e50',
                sky: '#0a0a1a',
                skyBottom: '#1a1a3a'
            };
        case BIOMES.SNOW:
            return {
                platform: '#85c1e2',
                platformTop: '#d0f4f7',
                platformAccent: '#ffffff',
                platformBorder: '#5dade2',
                sky: '#a9cce3',
                skyBottom: '#d6eaf8'
            };
        case BIOMES.DESERT:
            return {
                platform: '#d68910',
                platformTop: '#f39c12',
                platformAccent: '#f4d03f',
                platformBorder: '#935116',
                sky: '#f8c471',
                skyBottom: '#fad7a0'
            };
        default: // GRASSLAND
            return {
                platform: '#27ae60',
                platformTop: '#2ecc71',
                platformAccent: '#27ae60',
                platformBorder: '#1e8449',
                sky: '#87CEEB',
                skyBottom: '#E0F6FF'
            };
    }
}

// Level Data - 12 levels across 5 biomes
const levels = [
    // Level 1-2: Grassland (Tutorial)
    {
        biome: BIOMES.GRASSLAND,
        platforms: [
            new Platform(0, 460, 200, 40, BIOMES.GRASSLAND),
            new Platform(250, 400, 150, 20, BIOMES.GRASSLAND),
            new Platform(450, 350, 150, 20, BIOMES.GRASSLAND),
            new Platform(650, 400, 150, 40, BIOMES.GRASSLAND)
        ],
        enemies: [
            new Enemy(300, 378, 'slime'),
            new Enemy(700, 358, 'slime')
        ],
        coins: [
            new Coin(300, 360),
            new Coin(330, 360),
            new Coin(510, 310),
            new Coin(720, 360)
        ],
        powerups: [],
        goal: new Goal(730, 340),
        weather: null
    },
    {
        biome: BIOMES.GRASSLAND,
        platforms: [
            new Platform(0, 460, 150, 40, BIOMES.GRASSLAND),
            new Platform(200, 400, 100, 20, BIOMES.GRASSLAND),
            new Platform(350, 350, 100, 20, BIOMES.GRASSLAND),
            new Platform(500, 300, 100, 20, BIOMES.GRASSLAND),
            new Platform(650, 380, 150, 20, BIOMES.GRASSLAND)
        ],
        enemies: [
            new Enemy(250, 378, 'slime'),
            new Enemy(400, 328, 'slime'),
            new Enemy(700, 358, 'slime')
        ],
        coins: [
            new Coin(250, 360),
            new Coin(400, 310),
            new Coin(550, 260),
            new Coin(720, 340)
        ],
        powerups: [
            new PowerUp(550, 260, 'shield')
        ],
        goal: new Goal(730, 320),
        weather: 'rain'
    },

    // Level 3-4: Underwater
    {
        biome: BIOMES.UNDERWATER,
        platforms: [
            new Platform(0, 460, 120, 40, BIOMES.UNDERWATER),
            new Platform(170, 380, 100, 20, BIOMES.UNDERWATER),
            new Platform(320, 320, 100, 20, BIOMES.UNDERWATER),
            new Platform(470, 260, 100, 20, BIOMES.UNDERWATER),
            new Platform(620, 320, 180, 20, BIOMES.UNDERWATER)
        ],
        enemies: [
            new Enemy(220, 358, 'fish'),
            new Enemy(370, 298, 'fish'),
            new Enemy(670, 298, 'fish')
        ],
        coins: [
            new Coin(220, 340),
            new Coin(370, 280),
            new Coin(520, 220),
            new Coin(700, 280)
        ],
        powerups: [
            new PowerUp(520, 220, 'doublejump')
        ],
        goal: new Goal(730, 260),
        weather: 'bubbles'
    },
    {
        biome: BIOMES.UNDERWATER,
        platforms: [
            new Platform(0, 460, 100, 40, BIOMES.UNDERWATER),
            new Platform(150, 400, 80, 20, BIOMES.UNDERWATER),
            new Platform(280, 340, 80, 20, BIOMES.UNDERWATER),
            new Platform(410, 280, 80, 20, BIOMES.UNDERWATER),
            new Platform(540, 220, 80, 20, BIOMES.UNDERWATER),
            new Platform(670, 280, 130, 40, BIOMES.UNDERWATER)
        ],
        enemies: [
            new Enemy(190, 378, 'fish'),
            new Enemy(320, 318, 'fish'),
            new Enemy(450, 258, 'fish'),
            new Enemy(720, 238, 'fish')
        ],
        coins: [
            new Coin(190, 360),
            new Coin(320, 300),
            new Coin(450, 240),
            new Coin(580, 180),
            new Coin(720, 240)
        ],
        powerups: [
            new PowerUp(580, 180, 'shield')
        ],
        goal: new Goal(730, 220),
        weather: 'bubbles'
    },

    // Level 5-6: Desert
    {
        biome: BIOMES.DESERT,
        platforms: [
            new Platform(0, 460, 150, 40, BIOMES.DESERT),
            new Platform(200, 380, 120, 20, BIOMES.DESERT),
            new Platform(370, 320, 100, 20, BIOMES.DESERT),
            new Platform(520, 380, 120, 20, BIOMES.DESERT),
            new Platform(680, 320, 120, 40, BIOMES.DESERT)
        ],
        enemies: [
            new Enemy(250, 358, 'scorpion'),
            new Enemy(420, 298, 'scorpion'),
            new Enemy(570, 358, 'scorpion')
        ],
        coins: [
            new Coin(260, 340),
            new Coin(420, 280),
            new Coin(580, 340),
            new Coin(730, 280)
        ],
        powerups: [
            new PowerUp(420, 280, 'shield')
        ],
        goal: new Goal(740, 260),
        weather: 'sandstorm'
    },
    {
        biome: BIOMES.DESERT,
        platforms: [
            new Platform(0, 460, 130, 40, BIOMES.DESERT),
            new Platform(180, 400, 90, 20, BIOMES.DESERT),
            new Platform(320, 340, 90, 20, BIOMES.DESERT),
            new Platform(460, 280, 90, 20, BIOMES.DESERT),
            new Platform(600, 340, 90, 20, BIOMES.DESERT),
            new Platform(720, 280, 80, 40, BIOMES.DESERT)
        ],
        enemies: [
            new Enemy(220, 378, 'scorpion'),
            new Enemy(360, 318, 'scorpion'),
            new Enemy(500, 258, 'scorpion'),
            new Enemy(640, 318, 'scorpion')
        ],
        coins: [
            new Coin(220, 360),
            new Coin(360, 300),
            new Coin(500, 240),
            new Coin(640, 300),
            new Coin(750, 240)
        ],
        powerups: [
            new PowerUp(500, 240, 'doublejump')
        ],
        goal: new Goal(745, 220),
        weather: 'sandstorm'
    },

    // Level 7-8: Space
    {
        biome: BIOMES.SPACE,
        platforms: [
            new Platform(0, 460, 120, 40, BIOMES.SPACE),
            new Platform(180, 380, 100, 20, BIOMES.SPACE),
            new Platform(340, 300, 100, 20, BIOMES.SPACE),
            new Platform(500, 220, 100, 20, BIOMES.SPACE),
            new Platform(660, 300, 140, 20, BIOMES.SPACE)
        ],
        enemies: [
            new Enemy(230, 358, 'alien'),
            new Enemy(390, 278, 'alien'),
            new Enemy(710, 278, 'alien')
        ],
        coins: [
            new Coin(230, 340),
            new Coin(390, 260),
            new Coin(550, 180),
            new Coin(720, 260)
        ],
        powerups: [
            new PowerUp(550, 180, 'shield')
        ],
        goal: new Goal(745, 240),
        weather: 'stars'
    },
    {
        biome: BIOMES.SPACE,
        platforms: [
            new Platform(0, 460, 100, 40, BIOMES.SPACE),
            new Platform(150, 400, 80, 20, BIOMES.SPACE),
            new Platform(280, 340, 80, 20, BIOMES.SPACE),
            new Platform(410, 280, 80, 20, BIOMES.SPACE),
            new Platform(540, 340, 80, 20, BIOMES.SPACE),
            new Platform(670, 280, 80, 20, BIOMES.SPACE),
            new Platform(750, 220, 50, 20, BIOMES.SPACE)
        ],
        enemies: [
            new Enemy(190, 378, 'alien'),
            new Enemy(320, 318, 'alien'),
            new Enemy(450, 258, 'alien'),
            new Enemy(580, 318, 'alien')
        ],
        coins: [
            new Coin(190, 360),
            new Coin(320, 300),
            new Coin(450, 240),
            new Coin(580, 300),
            new Coin(710, 240)
        ],
        powerups: [
            new PowerUp(450, 240, 'doublejump')
        ],
        goal: new Goal(765, 160),
        weather: 'stars'
    },

    // Level 9-10: Snow
    {
        biome: BIOMES.SNOW,
        platforms: [
            new Platform(0, 460, 140, 40, BIOMES.SNOW),
            new Platform(190, 390, 110, 20, BIOMES.SNOW),
            new Platform(350, 330, 110, 20, BIOMES.SNOW),
            new Platform(510, 390, 110, 20, BIOMES.SNOW),
            new Platform(670, 330, 130, 40, BIOMES.SNOW)
        ],
        enemies: [
            new Enemy(240, 368, 'snowman'),
            new Enemy(400, 308, 'snowman'),
            new Enemy(720, 288, 'snowman')
        ],
        coins: [
            new Coin(240, 350),
            new Coin(400, 290),
            new Coin(560, 350),
            new Coin(730, 290)
        ],
        powerups: [
            new PowerUp(400, 290, 'shield')
        ],
        goal: new Goal(745, 270),
        weather: 'snow'
    },
    {
        biome: BIOMES.SNOW,
        platforms: [
            new Platform(0, 460, 120, 40, BIOMES.SNOW),
            new Platform(170, 400, 90, 20, BIOMES.SNOW),
            new Platform(310, 340, 90, 20, BIOMES.SNOW),
            new Platform(450, 280, 90, 20, BIOMES.SNOW),
            new Platform(590, 340, 90, 20, BIOMES.SNOW),
            new Platform(710, 280, 90, 40, BIOMES.SNOW)
        ],
        enemies: [
            new Enemy(210, 378, 'snowman'),
            new Enemy(350, 318, 'snowman'),
            new Enemy(490, 258, 'snowman'),
            new Enemy(630, 318, 'snowman')
        ],
        coins: [
            new Coin(210, 360),
            new Coin(350, 300),
            new Coin(490, 240),
            new Coin(630, 300),
            new Coin(750, 240)
        ],
        powerups: [
            new PowerUp(490, 240, 'doublejump')
        ],
        goal: new Goal(750, 220),
        weather: 'snow'
    },

    // Level 11-12: Final Challenge (Mixed)
    {
        biome: BIOMES.GRASSLAND,
        platforms: [
            new Platform(0, 460, 110, 40, BIOMES.GRASSLAND),
            new Platform(160, 400, 80, 20, BIOMES.GRASSLAND),
            new Platform(290, 340, 80, 20, BIOMES.GRASSLAND),
            new Platform(420, 280, 80, 20, BIOMES.GRASSLAND),
            new Platform(550, 220, 80, 20, BIOMES.GRASSLAND),
            new Platform(680, 280, 120, 40, BIOMES.GRASSLAND)
        ],
        enemies: [
            new Enemy(200, 378, 'slime'),
            new Enemy(330, 318, 'slime'),
            new Enemy(460, 258, 'slime'),
            new Enemy(590, 198, 'slime'),
            new Enemy(730, 238, 'slime')
        ],
        coins: [
            new Coin(200, 360),
            new Coin(330, 300),
            new Coin(460, 240),
            new Coin(590, 180),
            new Coin(740, 240)
        ],
        powerups: [
            new PowerUp(330, 300, 'shield'),
            new PowerUp(590, 180, 'doublejump')
        ],
        goal: new Goal(750, 220),
        weather: 'rain'
    },
    {
        biome: BIOMES.SPACE,
        platforms: [
            new Platform(0, 460, 100, 40, BIOMES.SPACE),
            new Platform(140, 410, 70, 20, BIOMES.SPACE),
            new Platform(250, 360, 70, 20, BIOMES.SPACE),
            new Platform(360, 310, 70, 20, BIOMES.SPACE),
            new Platform(470, 260, 70, 20, BIOMES.SPACE),
            new Platform(580, 210, 70, 20, BIOMES.SPACE),
            new Platform(690, 260, 110, 40, BIOMES.SPACE)
        ],
        enemies: [
            new Enemy(175, 388, 'alien'),
            new Enemy(285, 338, 'alien'),
            new Enemy(395, 288, 'alien'),
            new Enemy(505, 238, 'alien'),
            new Enemy(615, 188, 'alien'),
            new Enemy(735, 218, 'alien')
        ],
        coins: [
            new Coin(175, 370),
            new Coin(285, 320),
            new Coin(395, 270),
            new Coin(505, 220),
            new Coin(615, 170),
            new Coin(745, 220)
        ],
        powerups: [
            new PowerUp(395, 270, 'shield'),
            new PowerUp(615, 170, 'doublejump')
        ],
        goal: new Goal(755, 200),
        weather: 'stars'
    }
];

// Game Objects
let player = new Player(50, 100);
let currentLevel = null;

// Weather Particle Class
class WeatherParticle {
    constructor(type) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.type = type;
        this.speed = Math.random() * 2 + 1;
        this.size = Math.random() * 3 + 1;
    }

    update() {
        switch(this.type) {
            case 'rain':
                this.y += this.speed * 5;
                this.x -= 1;
                if (this.y > canvas.height) {
                    this.y = 0;
                    this.x = Math.random() * canvas.width;
                }
                break;
            case 'snow':
                this.y += this.speed;
                this.x += Math.sin(this.y / 30) * 0.5;
                if (this.y > canvas.height) {
                    this.y = 0;
                    this.x = Math.random() * canvas.width;
                }
                break;
            case 'sandstorm':
                this.x += this.speed * 3;
                this.y += Math.sin(this.x / 20) * 2;
                if (this.x > canvas.width) {
                    this.x = 0;
                    this.y = Math.random() * canvas.height;
                }
                break;
            case 'bubbles':
                this.y -= this.speed;
                this.x += Math.sin(this.y / 20) * 0.5;
                if (this.y < 0) {
                    this.y = canvas.height;
                    this.x = Math.random() * canvas.width;
                }
                break;
            case 'stars':
                // Stars don't move
                break;
        }
    }

    draw() {
        ctx.save();
        switch(this.type) {
            case 'rain':
                ctx.strokeStyle = 'rgba(174, 214, 241, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - 2, this.y + 10);
                ctx.stroke();
                break;
            case 'snow':
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(this.x, this.y, this.size, this.size);
                break;
            case 'sandstorm':
                ctx.fillStyle = 'rgba(245, 176, 65, 0.4)';
                ctx.fillRect(this.x, this.y, this.size * 2, this.size);
                break;
            case 'bubbles':
                ctx.strokeStyle = 'rgba(174, 214, 241, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'stars':
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(this.x, this.y, 2, 2);
                ctx.fillRect(this.x - 1, this.y, 1, 1);
                ctx.fillRect(this.x + 2, this.y, 1, 1);
                ctx.fillRect(this.x, this.y - 1, 1, 1);
                ctx.fillRect(this.x, this.y + 2, 1, 1);
                break;
        }
        ctx.restore();
    }
}

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
        showMessage('Level ' + (gameState.level - 1) + ' Complete! Next: Level ' + gameState.level);
        setTimeout(() => {
            hideMessage();
        }, 2000);
    } else {
        showMessage('🎉 CONGRATULATIONS! You beat all ' + levels.length + ' levels! Final Score: ' + gameState.score);
    }
}

function loadLevel(levelIndex) {
    if (levelIndex < levels.length) {
        currentLevel = levels[levelIndex];
        gameState.currentBiome = currentLevel.biome;
        player.respawn();

        // Initialize weather
        weatherParticles = [];
        if (currentLevel.weather) {
            for (let i = 0; i < 50; i++) {
                weatherParticles.push(new WeatherParticle(currentLevel.weather));
            }
        }
    }
}

// Restart Button
document.getElementById('restartButton').addEventListener('click', () => {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.isPlaying = true;
    gameState.hasDoubleJump = false;
    gameState.hasShield = false;
    gameState.shieldTimer = 0;

    // Reset level data
    levels.forEach(level => {
        level.coins.forEach(coin => coin.collected = false);
        level.enemies.forEach(enemy => enemy.defeated = false);
        level.powerups.forEach(powerup => powerup.collected = false);
    });

    loadLevel(0);
    updateUI();
    hideMessage();
    gameLoop();
});

// Draw background
function drawBackground() {
    const colors = getBiomeColors(gameState.currentBiome);

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colors.sky);
    gradient.addColorStop(1, colors.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Biome-specific background elements
    if (gameState.currentBiome === BIOMES.GRASSLAND) {
        // Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(140, 75, 20, 15);
        ctx.fillRect(130, 80, 10, 10);
        ctx.fillRect(160, 80, 15, 10);
        ctx.fillRect(175, 75, 20, 15);

        // Sun
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(685, 45, 30, 30);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(690, 50, 20, 20);
    } else if (gameState.currentBiome === BIOMES.SPACE) {
        // Planets
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(650, 80, 40, 40);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(655, 85, 30, 30);

        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(150, 100, 25, 25);
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(153, 103, 19, 19);
    } else if (gameState.currentBiome === BIOMES.UNDERWATER) {
        // Seaweed
        ctx.fillStyle = '#27ae60';
        for (let i = 0; i < 800; i += 150) {
            ctx.fillRect(i + 20, 400, 4, 100);
            ctx.fillRect(i + 22, 390, 4, 110);
            ctx.fillRect(i + 50, 420, 4, 80);
        }
    } else if (gameState.currentBiome === BIOMES.DESERT) {
        // Sun (hotter)
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(685, 45, 35, 35);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(690, 50, 25, 25);

        // Cactus
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(100, 420, 10, 40);
        ctx.fillRect(95, 435, 8, 15);
        ctx.fillRect(110, 430, 8, 15);
    } else if (gameState.currentBiome === BIOMES.SNOW) {
        // Mountains
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(200, 150, 80, 60);
        ctx.fillRect(220, 130, 40, 40);
        ctx.fillRect(500, 180, 100, 80);
        ctx.fillRect(530, 160, 40, 40);
    }

    // Draw weather
    weatherParticles.forEach(particle => {
        particle.update();
        particle.draw();
    });
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

    // Draw and check power-ups
    currentLevel.powerups.forEach(powerup => {
        powerup.draw();
        powerup.checkCollision(player);
    });

    // Update and draw enemies
    currentLevel.enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
        if (enemy.checkCollision(player)) {
            player.die();
        }
    });

    // Draw and check goal
    currentLevel.goal.draw();
    currentLevel.goal.checkCollision(player);

    requestAnimationFrame(gameLoop);
}

// Start the game
updateUI();
loadLevel(0);
gameLoop();
