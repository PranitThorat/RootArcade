class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.gameRunning = false;
        this.gamePaused = false;
        this.soundEnabled = true;
        this.audioContext = null;
        
        this.snake = [{ x: 200, y: 200 }];
        this.direction = { x: this.gridSize, y: 0 };
        this.food = this.generateFood();
        this.score = 0;
        this.highScore = Utils.loadFromLocalStorage('snakeHighScore', 0);
        this.speed = 1;
        this.gameSpeed = 150;
        
        this.colors = {
            snake: '#39ff14',
            food: '#ff006e',
            grid: 'rgba(57, 255, 20, 0.1)',
            text: '#ffffff'
        };

        this.init();
    }

    async init() {
        await this.setupAudio();
        this.setupEventListeners();
        this.setupMobileControls();
        this.updateDisplay();
        this.drawGame();
    }

    async setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }

    setupEventListeners() {
        
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction.y === 0) {
                        this.direction = { x: 0, y: -this.gridSize };
                        this.playSound('move');
                    }
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction.y === 0) {
                        this.direction = { x: 0, y: this.gridSize };
                        this.playSound('move');
                    }
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction.x === 0) {
                        this.direction = { x: -this.gridSize, y: 0 };
                        this.playSound('move');
                    }
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction.x === 0) {
                        this.direction = { x: this.gridSize, y: 0 };
                        this.playSound('move');
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });

        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('soundToggleBtn').addEventListener('click', () => this.toggleSound());
    }

    setupMobileControls() {
        const directions = {
            'upBtn': { x: 0, y: -this.gridSize },
            'downBtn': { x: 0, y: this.gridSize },
            'leftBtn': { x: -this.gridSize, y: 0 },
            'rightBtn': { x: this.gridSize, y: 0 }
        };

        Object.entries(directions).forEach(([btnId, dir]) => {
            document.getElementById(btnId).addEventListener('click', () => {
                if (!this.gameRunning || this.gamePaused) return;
                
                if ((dir.x !== 0 && this.direction.x === 0) || (dir.y !== 0 && this.direction.y === 0)) {
                    this.direction = dir;
                    this.playSound('move');
                }
            });
        });

        
        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gamePaused) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const minSwipeDistance = 30;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                
                if (Math.abs(deltaX) > minSwipeDistance && this.direction.x === 0) {
                    this.direction = deltaX > 0 ? 
                        { x: this.gridSize, y: 0 } : 
                        { x: -this.gridSize, y: 0 };
                    this.playSound('move');
                }
            } else {
                
                if (Math.abs(deltaY) > minSwipeDistance && this.direction.y === 0) {
                    this.direction = deltaY > 0 ? 
                        { x: 0, y: this.gridSize } : 
                        { x: 0, y: -this.gridSize };
                    this.playSound('move');
                }
            }
        });
    }

    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gamePaused = false;
        this.snake = [{ x: 200, y: 200 }];
        this.direction = { x: this.gridSize, y: 0 };
        this.food = this.generateFood();
        this.score = 0;
        this.speed = 1;
        this.gameSpeed = 150;
        
        this.updateDisplay();
        this.playSound('start');
        this.gameLoop();
        
        document.getElementById('gameOver').style.display = 'none';
    }

    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.gamePaused ? '▶️ Resume' : '⏸️ Pause';
        
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.snake = [{ x: 200, y: 200 }];
        this.direction = { x: this.gridSize, y: 0 };
        this.food = this.generateFood();
        this.score = 0;
        this.speed = 1;
        this.gameSpeed = 150;
        
        this.updateDisplay();
        this.drawGame();
        document.getElementById('pauseBtn').textContent = '⏸️ Pause';
        document.getElementById('gameOver').style.display = 'none';
    }

    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;

        this.update();
        this.drawGame();

        setTimeout(() => {
            this.gameLoop();
        }, this.gameSpeed);
    }

    update() {
        
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;

        
        if (head.x < 0 || head.x >= this.canvas.width || 
            head.y < 0 || head.y >= this.canvas.height) {
            this.gameOver();
            return;
        }

        
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.speed = Math.floor(this.score / 50) + 1;
            this.gameSpeed = Math.max(80, 150 - (this.speed - 1) * 10);
            
            this.food = this.generateFood();
            this.playSound('eat');
            this.createFoodParticles();
            this.updateDisplay();
        } else {
            this.snake.pop();
        }
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)) * this.gridSize,
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)) * this.gridSize
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        
        return newFood;
    }

    drawGame() {
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        
        this.drawGrid();

        
        this.drawFood();

        
        this.drawSnake();

        
        if (!this.gameRunning) {
            this.drawStartScreen();
        } else if (this.gamePaused) {
            this.drawPausedScreen();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawSnake() {
        this.snake.forEach((segment, index) => {
            this.ctx.save();
            
            
            this.ctx.shadowColor = this.colors.snake;
            this.ctx.shadowBlur = 15;
            
            
            if (index === 0) {
                this.ctx.fillStyle = this.colors.snake;
                this.ctx.fillRect(segment.x + 2, segment.y + 2, this.gridSize - 4, this.gridSize - 4);
                
                
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(segment.x + 6, segment.y + 6, 3, 3);
                this.ctx.fillRect(segment.x + 11, segment.y + 6, 3, 3);
            } else {
                
                const alpha = Math.max(0.3, 1 - (index * 0.05));
                this.ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`;
                this.ctx.fillRect(segment.x + 1, segment.y + 1, this.gridSize - 2, this.gridSize - 2);
            }
            
            this.ctx.restore();
        });
    }

    drawFood() {
        this.ctx.save();
        
        
        const time = Date.now() * 0.005;
        const glowSize = 20 + Math.sin(time) * 5;
        
        this.ctx.shadowColor = this.colors.food;
        this.ctx.shadowBlur = glowSize;
        
        this.ctx.fillStyle = this.colors.food;
        this.ctx.fillRect(this.food.x + 2, this.food.y + 2, this.gridSize - 4, this.gridSize - 4);
        
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(this.food.x + 8, this.food.y + 6, 2, 2);
        this.ctx.fillRect(this.food.x + 12, this.food.y + 10, 1, 1);
        
        this.ctx.restore();
    }

    drawStartScreen() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = this.colors.snake;
        this.ctx.font = '24px Fredoka One';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press Start to Play!', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Poppins';
        this.ctx.fillStyle = this.colors.text;
        this.ctx.fillText('Use arrow keys or swipe to control', this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        this.ctx.restore();
    }

    drawPausedScreen() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = this.colors.snake;
        this.ctx.font = '32px Fredoka One';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.restore();
    }

    createFoodParticles() {
        const centerX = this.food.x + this.gridSize / 2;
        const centerY = this.food.y + this.gridSize / 2;
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: ${this.colors.food};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 10px ${this.colors.food};
            `;
            
            const rect = this.canvas.getBoundingClientRect();
            const screenX = rect.left + centerX;
            const screenY = rect.top + centerY;
            
            particle.style.left = screenX + 'px';
            particle.style.top = screenY + 'px';
            
            document.body.appendChild(particle);
            
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 40 + Math.random() * 20;
            const endX = screenX + Math.cos(angle) * distance;
            const endY = screenY + Math.sin(angle) * distance;
            
            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${endX - screenX}px, ${endY - screenY}px) scale(0)`, opacity: 0 }
            ], {
                duration: 600,
                easing: 'ease-out'
            }).onfinish = () => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            };
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.playSound('gameOver');
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            Utils.saveToLocalStorage('snakeHighScore', this.highScore);
            this.playSound('highScore');
        }
        
        this.updateDisplay();
        
        const gameOverDiv = document.getElementById('gameOver');
        document.getElementById('finalScore').textContent = `Final Score: ${this.score}`;
        gameOverDiv.style.display = 'block';
        
        
        document.body.style.animation = 'screen-shake 0.5s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        document.getElementById('speed').textContent = this.speed;
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const frequencies = {
            move: 400,
            eat: 800,
            gameOver: 200,
            start: 600,
            highScore: 1000
        };
        
        const frequency = frequencies[type] || 400;
        const duration = type === 'gameOver' ? 0.5 : 0.1;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type === 'gameOver' ? 'sawtooth' : 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.log('Sound play error:', error);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('soundToggleBtn');
        btn.textContent = this.soundEnabled ? '🔊 Toggle Sound' : '🔇 Toggle Sound';
        
        if (this.soundEnabled) {
            this.playSound('start');
        }
    }
}


let snakeGame;
document.addEventListener('DOMContentLoaded', () => {
    snakeGame = new SnakeGame();
});
