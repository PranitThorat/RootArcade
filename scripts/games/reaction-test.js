class ReactionTest {
    constructor() {
        this.reactionArea = document.getElementById('reactionArea');
        this.reactionText = document.getElementById('reactionText');
        this.attempts = [];
        this.isWaiting = false;
        this.startTime = 0;
        this.timeout = null;
        this.soundEnabled = true;
        this.audioContext = null;
        this.gameMode = 'normal';
        
        this.bestTimes = Utils.loadFromLocalStorage('reactionBestTimes', []);

        this.init();
    }

    async init() {
        await this.setupAudio();
        this.setupEventListeners();
        this.updateDisplay();
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
        this.reactionArea.addEventListener('click', () => this.handleClick());
        this.reactionArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick();
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.resetStats());
        document.getElementById('practiceBtn').addEventListener('click', () => this.setPracticeMode());
        document.getElementById('challengeBtn').addEventListener('click', () => this.setChallengeMode());
        document.getElementById('soundToggleBtn').addEventListener('click', () => this.toggleSound());
    }

    handleClick() {
        if (this.reactionArea.classList.contains('waiting')) {
            
            this.handleTooEarly();
        } else if (this.reactionArea.classList.contains('ready')) {
            
            this.handleGoodReaction();
        } else {
            
            this.startTest();
        }
    }

    startTest() {
        this.isWaiting = true;
        this.reactionArea.className = 'reaction-area waiting';
        this.reactionText.textContent = 'Wait for GREEN...';
        
        // Random delay between 1-5 seconds
        const delay = 1000 + Math.random() * 4000;
        
        this.timeout = setTimeout(() => {
            this.showGreen();
        }, delay);
    }

    showGreen() {
        this.reactionArea.className = 'reaction-area ready';
        this.reactionText.textContent = 'CLICK NOW!';
        this.startTime = performance.now();
        this.playSound('ready');
        
        
        this.timeout = setTimeout(() => {
            this.handleTimeout();
        }, 2000);
    }

    handleGoodReaction() {
        const reactionTime = Math.round(performance.now() - this.startTime);
        clearTimeout(this.timeout);
        
        this.attempts.push({
            time: reactionTime,
            timestamp: new Date(),
            success: true
        });
        
        this.reactionArea.className = 'reaction-area';
        this.reactionText.innerHTML = `
            <strong>${reactionTime}ms</strong><br>
            Click to try again
        `;
        
        this.playSound('success');
        this.updateDisplay();
        this.addAttemptToList(reactionTime, true);
        this.saveBestTimes();
    }

    handleTooEarly() {
        clearTimeout(this.timeout);
        this.attempts.push({
            time: null,
            timestamp: new Date(),
            success: false,
            reason: 'too_early'
        });
        
        this.reactionArea.className = 'reaction-area too-early';
        this.reactionText.innerHTML = `
            <strong>Too Early!</strong><br>
            Wait for GREEN<br>
            Click to try again
        `;
        
        this.playSound('error');
        this.updateDisplay();
        this.addAttemptToList('Too Early', false);
    }

    handleTimeout() {
        this.attempts.push({
            time: null,
            timestamp: new Date(),
            success: false,
            reason: 'timeout'
        });
        
        this.reactionArea.className = 'reaction-area';
        this.reactionText.innerHTML = `
            <strong>Too Slow!</strong><br>
            Click to try again
        `;
        
        this.playSound('error');
        this.updateDisplay();
        this.addAttemptToList('Too Slow', false);
    }

    updateDisplay() {
        const successfulAttempts = this.attempts.filter(a => a.success);
        const totalAttempts = this.attempts.length;
        
        
        const bestTime = successfulAttempts.length > 0 ? 
            Math.min(...successfulAttempts.map(a => a.time)) : null;
        document.getElementById('bestTime').textContent = 
            bestTime ? `${bestTime}ms` : '---';
        
        
        const avgTime = successfulAttempts.length > 0 ?
            Math.round(successfulAttempts.reduce((sum, a) => sum + a.time, 0) / successfulAttempts.length) : null;
        document.getElementById('avgTime').textContent = 
            avgTime ? `${avgTime}ms` : '---';
        
        
        document.getElementById('attempts').textContent = totalAttempts;
        
        
        const successRate = totalAttempts > 0 ? 
            Math.round((successfulAttempts.length / totalAttempts) * 100) : 0;
        document.getElementById('successRate').textContent = `${successRate}%`;
    }

    addAttemptToList(time, success) {
        const attemptsList = document.getElementById('attemptsList');
        
        if (attemptsList.children.length === 1 && 
            attemptsList.children[0].textContent.includes('Your reaction times')) {
            attemptsList.innerHTML = '';
        }
        
        const attemptItem = document.createElement('div');
        attemptItem.className = 'attempt-item';
        attemptItem.innerHTML = `
            <span>Attempt ${this.attempts.length}</span>
            <span class="attempt-time" style="color: ${success ? 'var(--neon-green)' : 'var(--neon-pink)'}">${time}</span>
        `;
        
        attemptsList.insertBefore(attemptItem, attemptsList.firstChild);
        
        
        while (attemptsList.children.length > 10) {
            attemptsList.removeChild(attemptsList.lastChild);
        }
    }

    saveBestTimes() {
        const successfulAttempts = this.attempts.filter(a => a.success);
        if (successfulAttempts.length > 0) {
            const bestTime = Math.min(...successfulAttempts.map(a => a.time));
            this.bestTimes.push(bestTime);
            this.bestTimes.sort((a, b) => a - b);
            this.bestTimes = this.bestTimes.slice(0, 10); // Keep top 10
            Utils.saveToLocalStorage('reactionBestTimes', this.bestTimes);
        }
    }

    resetStats() {
        this.attempts = [];
        this.bestTimes = [];
        Utils.saveToLocalStorage('reactionBestTimes', []);
        
        document.getElementById('attemptsList').innerHTML = 
            '<div style="text-align: center; opacity: 0.7;">Your reaction times will appear here...</div>';
        
        this.reactionArea.className = 'reaction-area';
        this.reactionText.textContent = 'Click to Start!';
        
        this.updateDisplay();
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const frequencies = {
            ready: 1000,
            success: 800,
            error: 300
        };
        
        const frequency = frequencies[type] || 600;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type === 'error' ? 'sawtooth' : 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Sound play error:', error);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('soundToggleBtn');
        btn.textContent = this.soundEnabled ? '🔊 Toggle Sound' : '🔇 Toggle Sound';
    }
}


let reactionTest;
document.addEventListener('DOMContentLoaded', () => {
    reactionTest = new ReactionTest();
});
