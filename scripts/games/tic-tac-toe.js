class TicTacToe {
    constructor() {
        this.board = Array(9).fill('');
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.scores = Utils.loadFromLocalStorage('ticTacToeScores', { x: 0, o: 0, draws: 0 });
        this.soundEnabled = true;
        this.audioContext = null;

        this.winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], 
            [0, 3, 6], [1, 4, 7], [2, 5, 8], 
            [0, 4, 8], [2, 4, 6] 
        ];

        this.init();
    }

    async init() {
        await this.setupAudio();
        this.createBoard();
        this.setupEventListeners();
        this.updateDisplay();
        this.loadScores();
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

    createBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', (e) => this.handleCellClick(e));
            cell.addEventListener('mouseenter', () => this.handleCellHover(cell));

            // Touch support
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleCellClick(e);
            });

            gameBoard.appendChild(cell);
        }
    }

    setupEventListeners() {
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
            this.playSound('success', 0.1);
        });

        document.getElementById('clearScoreBtn').addEventListener('click', () => {
            this.clearScores();
            this.playSound('success', 0.1);
        });

        document.getElementById('soundToggleBtn').addEventListener('click', () => {
            this.toggleSound();
        });

        
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9' && !this.gameOver) {
                const index = parseInt(e.key) - 1;
                if (this.board[index] === '') {
                    this.makeMove(index);
                }
            }
            if (e.key === 'r' || e.key === 'R') {
                this.resetGame();
            }
        });
    }

    handleCellClick(e) {
        const index = parseInt(e.target.dataset.index);

        if (this.board[index] === '' && !this.gameOver) {
            this.makeMove(index);
        }
    }

    handleCellHover(cell) {
        if (this.board[cell.dataset.index] === '' && !this.gameOver) {
            this.playSound('hover', 0.05);
            this.createHoverEffect(cell);
        }
    }

    createHoverEffect(cell) {
        
        if (cell.textContent === '') {
            cell.style.color = this.currentPlayer === 'X' ? 'rgba(255, 0, 110, 0.3)' : 'rgba(57, 255, 20, 0.3)';
            cell.textContent = this.currentPlayer;

            setTimeout(() => {
                if (this.board[cell.dataset.index] === '') {
                    cell.textContent = '';
                    cell.style.color = '';
                }
            }, 200);
        }
    }

    makeMove(index) {
        if (this.board[index] !== '' || this.gameOver) return;

        this.board[index] = this.currentPlayer;
        this.updateCell(index);
        this.playSound('click', 0.1);

        const winner = this.checkWinner();
        if (winner) {
            this.handleGameEnd(winner);
        } else if (this.board.every(cell => cell !== '')) {
            this.handleGameEnd('draw');
        } else {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            this.updateStatus();
        }
    }

    updateCell(index) {
        const cell = document.querySelector(`[data-index="${index}"]`);
        cell.textContent = this.currentPlayer;
        cell.classList.add(this.currentPlayer.toLowerCase());
        cell.style.color = this.currentPlayer === 'X' ? 'var(--neon-pink)' : 'var(--neon-green)';

        
        cell.style.transform = 'scale(0)';
        setTimeout(() => {
            cell.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            cell.style.transform = 'scale(1)';
        }, 10);

        this.createCellParticles(cell);
    }

    createCellParticles(cell) {
        const rect = cell.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: ${this.currentPlayer === 'X' ? 'var(--neon-pink)' : 'var(--neon-green)'};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
                box-shadow: 0 0 10px currentColor;
            `;

            document.body.appendChild(particle);

            
            const angle = (i / 6) * Math.PI * 2;
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

    checkWinner() {
        for (const combination of this.winningCombinations) {
            const [a, b, c] = combination;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return { player: this.board[a], combination };
            }
        }
        return null;
    }

    handleGameEnd(result) {
        this.gameOver = true;

        if (result === 'draw') {
            this.scores.draws++;
            this.updateStatus('It\'s a draw! 🤝', 'status-draw');
            this.playSound('error', 0.15);
            this.createDrawEffect();
        } else {
            this.scores[result.player.toLowerCase()]++;
            this.updateStatus(`Player ${result.player} wins! 🎉`, 'status-win');
            this.playSound('success', 0.2);
            this.highlightWinningCells(result.combination);
            this.createWinEffect();
        }

        this.saveScores();
        this.updateScoreDisplay();

        
        setTimeout(() => {
            this.resetGame();
        }, 3000);
    }

    highlightWinningCells(combination) {
        combination.forEach(index => {
            const cell = document.querySelector(`[data-index="${index}"]`);
            cell.classList.add('winning');
        });
    }

    createWinEffect() {
        
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(255,255,0,0.2) 0%, transparent 70%);
            pointer-events: none;
            z-index: 10000;
            animation: flash-effect 0.5s ease-out;
        `;

        // Add flash animation
        if (!document.getElementById('flash-style')) {
            const style = document.createElement('style');
            style.id = 'flash-style';
            style.textContent = `
                @keyframes flash-effect {
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
        }, 500);

        
        this.createConfetti();
    }

    createDrawEffect() {
        
        document.querySelector('.game-board').style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            document.querySelector('.game-board').style.animation = '';
        }, 500);
    }

    createConfetti() {
        const colors = ['#ff006e', '#39ff14', '#00f5ff', '#bf40bf'];

        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
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
    }

    updateStatus(message = null, className = 'status-turn') {
        const statusElement = document.getElementById('gameStatus');
        if (message) {
            statusElement.textContent = message;
        } else {
            statusElement.textContent = `Player ${this.currentPlayer}'s turn`;
        }
        statusElement.className = `game-status ${className}`;
    }

    resetGame() {
        this.board = Array(9).fill('');
        this.currentPlayer = 'X';
        this.gameOver = false;

        
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            setTimeout(() => {
                cell.style.animation = 'scale-out 0.3s ease-in';
                setTimeout(() => {
                    cell.textContent = '';
                    cell.className = 'cell';
                    cell.style = '';
                    cell.style.animation = 'scale-in 0.3s ease-out';
                }, 300);
            }, index * 50);
        });

        this.updateStatus();
    }

    clearScores() {
        this.scores = { x: 0, o: 0, draws: 0 };
        this.saveScores();
        this.updateScoreDisplay();
    }

    saveScores() {
        Utils.saveToLocalStorage('ticTacToeScores', this.scores);
    }

    loadScores() {
        this.scores = Utils.loadFromLocalStorage('ticTacToeScores', { x: 0, o: 0, draws: 0 });
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        document.getElementById('xScore').textContent = this.scores.x;
        document.getElementById('oScore').textContent = this.scores.o;
        document.getElementById('drawScore').textContent = this.scores.draws;
    }

    playSound(type, volume = 0.1) {
        if (!this.soundEnabled || !this.audioContext) return;

        const frequencies = {
            hover: 800,
            click: 600,
            success: 1000,
            error: 300
        };

        const frequency = frequencies[type] || 600;
        const duration = type === 'success' ? 0.3 : 0.1;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type === 'error' ? 'sawtooth' : 'sine';

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
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
            this.playSound('success', 0.1);
        }
    }

    updateDisplay() {
        this.updateStatus();
        this.updateScoreDisplay();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
});