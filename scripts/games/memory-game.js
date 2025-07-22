class MemoryGame {
    constructor() {
        this.board = [];
        this.flippedCards = [];
        this.matchedCards = [];
        this.moves = 0;
        this.matches = 0;
        this.gameTime = 0;
        this.gameTimer = null;
        this.gameStarted = false;
        this.soundEnabled = true;
        this.audioContext = null;
        this.canFlip = true;
        
        this.difficulties = {
            easy: { rows: 3, cols: 4, total: 12 },
            medium: { rows: 4, cols: 4, total: 16 },
            hard: { rows: 4, cols: 6, total: 24 }
        };
        
        this.currentDifficulty = 'medium';
        
        this.cardEmojis = [
            '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎸', '🎺', 
            '🎹', '🎪', '🎊', '🎉', '🎈', '🎆', '🎇', '✨',
            '🎠', '🎡', '🎢', '🎳', '🎯', '🎰', '🎲', '🃏',
            '🎖️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎗️', '🎫'
        ];
        
        this.bestTimes = Utils.loadFromLocalStorage('memoryBestTimes', {
            easy: null,
            medium: null,
            hard: null
        });

        this.init();
    }

    async init() {
        await this.setupAudio();
        this.setupEventListeners();
        this.updateDisplay();
        this.newGame();
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
        
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDifficulty = e.target.dataset.level;
                this.newGame();
                this.playSound('click');
            });
        });

        
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
            this.playSound('click');
        });
        
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffleCards();
            this.playSound('shuffle');
        });
        
        document.getElementById('hintBtn').addEventListener('click', () => {
            this.showHint();
            this.playSound('hint');
        });
        
        document.getElementById('soundToggleBtn').addEventListener('click', () => {
            this.toggleSound();
        });

        
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'n':
                case 'N':
                    this.newGame();
                    break;
                case 'h':
                case 'H':
                    this.showHint();
                    break;
                case 's':
                case 'S':
                    this.shuffleCards();
                    break;
            }
        });
    }

    newGame() {
        this.resetGame();
        this.generateBoard();
        this.renderBoard();
        this.updateDisplay();
    }

    resetGame() {
        this.board = [];
        this.flippedCards = [];
        this.matchedCards = [];
        this.moves = 0;
        this.matches = 0;
        this.gameTime = 0;
        this.gameStarted = false;
        this.canFlip = true;
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        document.getElementById('victoryMessage').style.display = 'none';
    }

    generateBoard() {
        const config = this.difficulties[this.currentDifficulty];
        const totalCards = config.total;
        const totalPairs = totalCards / 2;
        
        
        const cardPairs = [];
        for (let i = 0; i < totalPairs; i++) {
            const emoji = this.cardEmojis[i % this.cardEmojis.length];
            cardPairs.push({ id: i, emoji: emoji });
            cardPairs.push({ id: i, emoji: emoji });
        }
        
        
        this.board = Utils.shuffleArray(cardPairs);
        
        
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        this.board.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'memory-card';
            cardElement.dataset.index = index;
            cardElement.dataset.cardId = card.id;
            
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.textContent = card.emoji;
            
            cardElement.appendChild(cardContent);
            cardElement.addEventListener('click', () => this.flipCard(index));
            
            
            cardElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.flipCard(index);
            });
            
            gameBoard.appendChild(cardElement);
        });
    }

    flipCard(index) {
        if (!this.canFlip) return;
        if (this.flippedCards.includes(index)) return;
        if (this.matchedCards.includes(index)) return;
        
        
        if (!this.gameStarted) {
            this.startTimer();
            this.gameStarted = true;
        }
        
        const cardElement = document.querySelector(`[data-index="${index}"]`);
        cardElement.classList.add('flipped');
        this.flippedCards.push(index);
        
        this.playSound('flip');
        this.createFlipParticles(cardElement);
        
        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateDisplay();
            this.checkMatch();
        }
    }

    checkMatch() {
        this.canFlip = false;
        const [firstIndex, secondIndex] = this.flippedCards;
        const firstCard = this.board[firstIndex];
        const secondCard = this.board[secondIndex];
        
        setTimeout(() => {
            if (firstCard.id === secondCard.id) {
                
                this.handleMatch(firstIndex, secondIndex);
            } else {
                
                this.handleMismatch(firstIndex, secondIndex);
            }
            
            this.flippedCards = [];
            this.canFlip = true;
        }, 1000);
    }

    handleMatch(firstIndex, secondIndex) {
        const firstElement = document.querySelector(`[data-index="${firstIndex}"]`);
        const secondElement = document.querySelector(`[data-index="${secondIndex}"]`);
        
        firstElement.classList.add('matched');
        secondElement.classList.add('matched');
        
        this.matchedCards.push(firstIndex, secondIndex);
        this.matches++;
        
        this.playSound('match');
        this.createMatchParticles(firstElement);
        this.createMatchParticles(secondElement);
        
        this.updateDisplay();
        
        // Check if game is complete
        if (this.matchedCards.length === this.board.length) {
            setTimeout(() => this.gameComplete(), 500);
        }
    }

    handleMismatch(firstIndex, secondIndex) {
        const firstElement = document.querySelector(`[data-index="${firstIndex}"]`);
        const secondElement = document.querySelector(`[data-index="${secondIndex}"]`);
        
        firstElement.classList.add('wrong');
        secondElement.classList.add('wrong');
        
        this.playSound('wrong');
        
        setTimeout(() => {
            firstElement.classList.remove('flipped', 'wrong');
            secondElement.classList.remove('flipped', 'wrong');
        }, 500);
    }

    gameComplete() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        this.playSound('victory');
        this.createVictoryEffect();
        
        
        const currentTime = this.gameTime;
        const bestTime = this.bestTimes[this.currentDifficulty];
        
        if (!bestTime || currentTime < bestTime) {
            this.bestTimes[this.currentDifficulty] = currentTime;
            Utils.saveToLocalStorage('memoryBestTimes', this.bestTimes);
            this.updateDisplay();
        }
        
        
        const victoryMessage = document.getElementById('victoryMessage');
        const victoryStats = document.getElementById('victoryStats');
        
        victoryStats.textContent = `You won in ${this.moves} moves and ${this.formatTime(this.gameTime)}!`;
        victoryMessage.style.display = 'block';
    }

    createVictoryEffect() {
        
        const colors = ['#00f5ff', '#ff006e', '#39ff14', '#bf40bf'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * window.innerWidth}px;
                top: -10px;
                z-index: 10000;
                pointer-events: none;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            `;

            document.body.appendChild(confetti);

            confetti.animate([
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
            ], {
                duration: 3000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            };
        }

        
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(57,255,20,0.3) 0%, transparent 70%);
            pointer-events: none;
            z-index: 9999;
            animation: victory-flash 0.8s ease-out;
        `;

        
        if (!document.getElementById('victory-flash-style')) {
            const style = document.createElement('style');
            style.id = 'victory-flash-style';
            style.textContent = `
                @keyframes victory-flash {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(flash);
        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 800);
    }

    createFlipParticles(cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: var(--neon-blue);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
                box-shadow: 0 0 8px var(--neon-blue);
            `;

            document.body.appendChild(particle);

            const angle = (i / 6) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;

            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`, opacity: 0 }
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

    createMatchParticles(cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: var(--neon-green);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
                box-shadow: 0 0 10px var(--neon-green);
            `;

            document.body.appendChild(particle);

            const angle = (i / 10) * Math.PI * 2;
            const distance = 50 + Math.random() * 30;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;

            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`, opacity: 0 }
            ], {
                duration: 800,
                easing: 'ease-out'
            }).onfinish = () => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            };
        }
    }

    shuffleCards() {
        if (this.gameStarted) {
            this.resetGame();
        }
        this.generateBoard();
        this.renderBoard();
    }

    showHint() {
        if (!this.gameStarted) return;
        if (this.flippedCards.length > 0) return;
        
        
        const unmatchedCards = [];
        this.board.forEach((card, index) => {
            if (!this.matchedCards.includes(index)) {
                unmatchedCards.push({ index, card });
            }
        });
        
        
        const cardGroups = {};
        unmatchedCards.forEach(({ index, card }) => {
            if (!cardGroups[card.id]) {
                cardGroups[card.id] = [];
            }
            cardGroups[card.id].push(index);
        });
        
        
        const hintPair = Object.values(cardGroups).find(group => group.length === 2);
        
        if (hintPair) {
            hintPair.forEach(index => {
                const cardElement = document.querySelector(`[data-index="${index}"]`);
                cardElement.style.border = '3px solid var(--neon-green)';
                cardElement.style.boxShadow = '0 0 20px rgba(57, 255, 20, 0.8)';
                
                setTimeout(() => {
                    cardElement.style.border = '2px solid transparent';
                    cardElement.style.boxShadow = '';
                }, 2000);
            });
        }
    }

    startTimer() {
        this.gameTimer = setInterval(() => {
            this.gameTime++;
            this.updateDisplay();
        }, 1000);
    }

    updateDisplay() {
        document.getElementById('moves').textContent = this.moves;
        document.getElementById('matches').textContent = `${this.matches}/${this.board.length / 2}`;
        document.getElementById('time').textContent = this.formatTime(this.gameTime);
        
        const bestTime = this.bestTimes[this.currentDifficulty];
        document.getElementById('bestTime').textContent = bestTime ? this.formatTime(bestTime) : '--:--';
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const frequencies = {
            flip: 600,
            match: 800,
            wrong: 300,
            victory: 1000,
            click: 500,
            shuffle: 400,
            hint: 700
        };
        
        const frequency = frequencies[type] || 500;
        const duration = type === 'victory' ? 0.8 : 0.15;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type === 'wrong' ? 'sawtooth' : 'sine';
            
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
            this.playSound('click');
        }
    }
}


let memoryGame;
document.addEventListener('DOMContentLoaded', () => {
    memoryGame = new MemoryGame();
});
