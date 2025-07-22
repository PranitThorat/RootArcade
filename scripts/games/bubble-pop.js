class BubbleGame {
    constructor() {
        this.canvas = document.getElementById('bubbleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.bubbles = [];
        this.score = 0;
        this.level = 1;
        this.bubblesLeft = 0;
        this.highScore = Utils.loadFromLocalStorage('bubbleHighScore', 0);
        this.gameRunning = false;
        this.gamePaused = false;
        this.soundEnabled = true;
        this.audioContext = null;
        this.powerUps = {
            bomb: 3,
            lightning: 2,
            freeze: 1,
            rainbow: 1
        };
        this.combo = 0;
        this.lastPopTime = 0;
        
        this.bubbleColors = [
            '#ff006e', '#00f5ff', '#39ff14', '#bf40bf', 
            '#ffbe0b', '#fb5607', '#8338ec', '#3a86ff'
        ];

        this.init();
    }

    async init() {
        await this.setupAudio();
        this.setupEventListeners();
        this.updateDisplay();
        this.generateBubbles();
        this.startAnimationLoop();
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
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleCanvasClick({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        });

        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('soundToggleBtn').addEventListener('click', () => this.toggleSound());

        
        document.querySelectorAll('.power-up').forEach(powerUp => {
            powerUp.addEventListener('click', (e) => this.usePowerUp(e.target.dataset.power));
        });
    }

    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.generateBubbles();
        this.playSound('start');
    }

    generateBubbles() {
        this.bubbles = [];
        const bubbleCount = 15 + (this.level * 3);
        
        for (let i = 0; i < bubbleCount; i++) {
            this.bubbles.push({
                x: Math.random() * (this.canvas.width - 60) + 30,
                y: Math.random() * (this.canvas.height - 60) + 30,
                radius: Math.random() * 25 + 15,
                color: Utils.randomChoice(this.bubbleColors),
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                alpha: 0.8 + Math.random() * 0.2,
                pulse: Math.random() * Math.PI * 2
            });
        }
        
        this.bubblesLeft = this.bubbles.length;
        this.updateDisplay();
    }

    handleCanvasClick(e) {
        if (!this.gameRunning || this.gamePaused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if bubble was clicked
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            const distance = Math.sqrt((x - bubble.x) ** 2 + (y - bubble.y) ** 2);
            
            if (distance <= bubble.radius) {
                this.popBubble(i, x, y);
                break;
            }
        }
    }

    popBubble(index, x, y) {
        const bubble = this.bubbles[index];
        this.bubbles.splice(index, 1);
        this.bubblesLeft = this.bubbles.length;
        
        
        const currentTime = Date.now();
        if (currentTime - this.lastPopTime < 1000) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.lastPopTime = currentTime;
        
        const baseScore = 10 * this.level;
        const comboBonus = Math.min(this.combo * 5, 50);
        this.score += baseScore + comboBonus;
        
        this.playSound('pop');
        this.createPopParticles(bubble);
        this.updateDisplay();
        
        
        if (this.combo > 1) {
            this.showCombo();
        }
        
        
        if (this.bubblesLeft === 0) {
            this.nextLevel();
        }
        
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            Utils.saveToLocalStorage('bubbleHighScore', this.highScore);
        }
    }

    nextLevel() {
        this.level++;
        this.playSound('levelComplete');
        
        
        const levelComplete = document.getElementById('levelComplete');
        document.getElementById('levelStats').textContent = 
            `Level ${this.level - 1} Complete! | Score: ${this.score}`;
        levelComplete.style.display = 'block';
        
        setTimeout(() => {
            levelComplete.style.display = 'none';
            this.generateBubbles();
        }, 2000);
        
        // Add power-up rewards
        if (this.level % 3 === 0) {
            this.powerUps.bomb++;
            this.powerUps.lightning++;
        }
        if (this.level % 5 === 0) {
            this.powerUps.freeze++;
            this.powerUps.rainbow++;
        }
        
        this.updatePowerUpDisplay();
    }

    createPopParticles(bubble) {
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${bubble.color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 10px ${bubble.color};
            `;
            
            const rect = this.canvas.getBoundingClientRect();
            const screenX = rect.left + bubble.x;
            const screenY = rect.top + bubble.y;
            
            particle.style.left = screenX + 'px';
            particle.style.top = screenY + 'px';
            
            document.body.appendChild(particle);
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30 + Math.random() * 40;
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

    startAnimationLoop() {
        const animate = () => {
            if (this.gameRunning && !this.gamePaused) {
                this.updateBubbles();
            }
            this.drawBubbles();
            requestAnimationFrame(animate);
        };
        animate();
    }

    updateBubbles() {
        this.bubbles.forEach(bubble => {
            
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            
            
            if (bubble.x <= bubble.radius || bubble.x >= this.canvas.width - bubble.radius) {
                bubble.vx *= -1;
            }
            if (bubble.y <= bubble.radius || bubble.y >= this.canvas.height - bubble.radius) {
                bubble.vy *= -1;
            }
            
            
            bubble.x = Math.max(bubble.radius, Math.min(this.canvas.width - bubble.radius, bubble.x));
            bubble.y = Math.max(bubble.radius, Math.min(this.canvas.height - bubble.radius, bubble.y));
            
            
            bubble.pulse += 0.1;
        });
    }

    drawBubbles() {
        
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
        gradient.addColorStop(1, 'rgba(20,0,20,0.8)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        
        this.bubbles.forEach(bubble => {
            this.ctx.save();
            
            
            const glowSize = 15 + Math.sin(bubble.pulse) * 5;
            this.ctx.shadowColor = bubble.color;
            this.ctx.shadowBlur = glowSize;
            
            
            this.ctx.globalAlpha = bubble.alpha;
            this.ctx.fillStyle = bubble.color;
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, 
                         bubble.radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    showCombo() {
        const comboDisplay = document.getElementById('comboDisplay');
        comboDisplay.textContent = `COMBO x${this.combo}`;
        comboDisplay.style.display = 'block';
        
        setTimeout(() => {
            comboDisplay.style.display = 'none';
        }, 1500);
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('bubblesLeft').textContent = this.bubblesLeft;
        document.getElementById('highScore').textContent = this.highScore;
        
        
        const progress = ((15 + (this.level - 1) * 3) - this.bubblesLeft) / (15 + (this.level - 1) * 3) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
    }

    updatePowerUpDisplay() {
        Object.entries(this.powerUps).forEach(([power, count]) => {
            const element = document.getElementById(`${power}PowerUp`);
            element.textContent = element.textContent.split('(')[0] + `(${count})`;
            element.classList.toggle('cooldown', count <= 0);
        });
    }

    usePowerUp(powerType) {
        if (this.powerUps[powerType] <= 0 || !this.gameRunning) return;
        
        this.powerUps[powerType]--;
        this.playSound('powerUp');
        
        switch(powerType) {
            case 'bomb':
                this.explodeBubbles();
                break;
            case 'lightning':
                this.lightningStrike();
                break;
            case 'freeze':
                this.freezeTime();
                break;
            case 'rainbow':
                this.rainbowPop();
                break;
        }
        
        this.updatePowerUpDisplay();
    }

    explodeBubbles() {
        const bubblesToRemove = Math.min(5, this.bubbles.length);
        for (let i = 0; i < bubblesToRemove; i++) {
            if (this.bubbles.length > 0) {
                const randomIndex = Math.floor(Math.random() * this.bubbles.length);
                const bubble = this.bubbles[randomIndex];
                this.createPopParticles(bubble);
                this.bubbles.splice(randomIndex, 1);
            }
        }
        this.score += bubblesToRemove * 20;
        this.bubblesLeft = this.bubbles.length;
        this.updateDisplay();
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const frequencies = {
            pop: 800,
            start: 600,
            levelComplete: 1200,
            powerUp: 1000
        };
        
        const frequency = frequencies[type] || 600;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Sound play error:', error);
        }
    }

    togglePause() {
        if (!this.gameRunning) return;
        this.gamePaused = !this.gamePaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.gamePaused ? '▶️ Resume' : '⏸️ Pause';
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.level = 1;
        this.combo = 0;
        this.powerUps = { bomb: 3, lightning: 2, freeze: 1, rainbow: 1 };
        this.generateBubbles();
        this.updateDisplay();
        this.updatePowerUpDisplay();
        document.getElementById('pauseBtn').textContent = '⏸️ Pause';
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('soundToggleBtn');
        btn.textContent = this.soundEnabled ? '🔊 Toggle Sound' : '🔇 Toggle Sound';
    }
}


let bubbleGame;
document.addEventListener('DOMContentLoaded', () => {
    bubbleGame = new BubbleGame();
});
