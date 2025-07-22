class GameHub {
    constructor() {
        this.soundEnabled = true;
        this.particleSystem = null;
        this.audioContext = null;
        this.sounds = {};

        this.init();
    }

    async init() {
        await this.setupAudio();
        this.setupParticleSystem();
        this.setupEventListeners();
        this.setupLoadingScreen();
        this.setupSoundEffects();
        this.startEntranceAnimations();

        
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 2000);
    }

    async setupAudio() {
        try {
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });

            
            await this.loadSounds();
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }

    async loadSounds() {
        const soundFiles = {
            hover: this.createBeepSound(800, 0.1, 0.05),
            click: this.createBeepSound(600, 0.15, 0.08),
            success: this.createBeepSound(1000, 0.3, 0.2),
            error: this.createBeepSound(300, 0.4, 0.15)
        };

        for (const [name, buffer] of Object.entries(soundFiles)) {
            this.sounds[name] = buffer;
        }
    }

    createBeepSound(frequency, duration, volume) {
        if (!this.audioContext) return null;

        const buffer = this.audioContext.createBuffer(1, 
            this.audioContext.sampleRate * duration, 
            this.audioContext.sampleRate
        );

        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const time = i / this.audioContext.sampleRate;
            const envelope = Math.max(0, 1 - time / duration);
            channelData[i] = Math.sin(frequency * time * 2 * Math.PI) * volume * envelope;
        }

        return buffer;
    }

    playSound(soundName) {
        if (!this.soundEnabled || !this.audioContext || !this.sounds[soundName]) return;

        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds[soundName];
            source.connect(this.audioContext.destination);
            source.start();
        } catch (error) {
            console.log('Sound play error:', error);
        }
    }

    setupParticleSystem() {
        const canvas = document.getElementById('particle-canvas');
        if (canvas) {
            this.particleSystem = new ParticleSystem(canvas);
            this.particleSystem.start();
        }
    }

    setupEventListeners() {
        
        document.querySelectorAll('.game-card').forEach(card => {
            this.setupCardEvents(card);
        });

        
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                this.toggleSound();
            });
        }

        
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

       
        this.setupTouchEvents();

        
        window.addEventListener('resize', () => {
            if (this.particleSystem) {
                this.particleSystem.handleResize();
            }
        });
    }

    setupCardEvents(card) {
        const gameName = card.dataset.game;

        
        card.addEventListener('mouseenter', () => {
            this.playSound('hover');
            this.createHoverParticles(card);
            this.addGlowEffect(card);
        });

        card.addEventListener('mouseleave', () => {
            this.removeGlowEffect(card);
        });

     
        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.playSound('click');
            this.createClickEffect(card, e);
            this.navigateToGame(gameName, card);
        });

        
        card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.playSound('click');
            this.createClickEffect(card, e.touches[0]);
        }, { passive: false });

        card.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.navigateToGame(gameName, card);
        }, { passive: false });
    }

    setupTouchEvents() {
        
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.game-card')) {
                e.preventDefault();
            }
        }, { passive: false });

        
        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.game-card');
            if (card) {
                card.classList.add('touch-active');
            }
        });

        document.addEventListener('touchend', (e) => {
            
            document.querySelectorAll('.game-card').forEach(card => {
                card.classList.remove('touch-active');
            });
        });
    }

    createHoverParticles(card) {
        const rect = card.getBoundingClientRect();
        const particles = [];

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'hover-particle';
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: radial-gradient(circle, rgba(0,245,255,1) 0%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${rect.left + Math.random() * rect.width}px;
                top: ${rect.top + Math.random() * rect.height}px;
                animation: hover-particle-float 2s ease-out forwards;
            `;

            document.body.appendChild(particle);
            particles.push(particle);

            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 2000);
        }

     
        if (!document.getElementById('hover-particle-style')) {
            const style = document.createElement('style');
            style.id = 'hover-particle-style';
            style.textContent = `
                @keyframes hover-particle-float {
                    0% {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-50px) scale(0);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    createClickEffect(card, pointer) {
        const rect = card.getBoundingClientRect();
        const x = (pointer.clientX || pointer.pageX) - rect.left;
        const y = (pointer.clientY || pointer.pageY) - rect.top;

        
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
            transform: translate(-50%, -50%);
            animation: ripple-expand 0.8s ease-out forwards;
            pointer-events: none;
            z-index: 10;
        `;

        card.appendChild(ripple);

        
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple-expand {
                    0% {
                        width: 0;
                        height: 0;
                        opacity: 1;
                    }
                    100% {
                        width: 200px;
                        height: 200px;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 800);

        
        this.addScreenShake();
    }

    addScreenShake() {
        document.body.style.animation = 'screen-shake 0.3s ease-in-out';

        
        if (!document.getElementById('shake-style')) {
            const style = document.createElement('style');
            style.id = 'shake-style';
            style.textContent = `
                @keyframes screen-shake {
                    0%, 100% { transform: translateX(0); }
                    10% { transform: translateX(-2px); }
                    20% { transform: translateX(2px); }
                    30% { transform: translateX(-2px); }
                    40% { transform: translateX(2px); }
                    50% { transform: translateX(-1px); }
                    60% { transform: translateX(1px); }
                    70% { transform: translateX(-1px); }
                    80% { transform: translateX(1px); }
                    90% { transform: translateX(-1px); }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            document.body.style.animation = '';
        }, 300);
    }

    addGlowEffect(card) {
        card.style.boxShadow = '0 0 30px rgba(0, 245, 255, 0.6), 0 0 60px rgba(0, 245, 255, 0.4)';
        card.style.borderColor = 'rgba(0, 245, 255, 0.8)';
    }

    removeGlowEffect(card) {
        card.style.boxShadow = '';
        card.style.borderColor = 'transparent';
    }

    navigateToGame(gameName, card) {
        
        card.style.animation = 'scale-out 0.5s ease-in forwards';

        
        if (!document.getElementById('scale-out-style')) {
            const style = document.createElement('style');
            style.id = 'scale-out-style';
            style.textContent = `
                @keyframes scale-out {
                    0% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1.2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        
        setTimeout(() => {
            this.showLoadingScreen();
            setTimeout(() => {
                window.location.href = `games/${gameName}.html`;
            }, 500);
        }, 500);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundToggle = document.getElementById('soundToggle');
        const icon = soundToggle.querySelector('.sound-icon');

        icon.textContent = this.soundEnabled ? '🔊' : '🔇';
        soundToggle.style.animation = 'bounce-in 0.3s ease-out';

        setTimeout(() => {
            soundToggle.style.animation = '';
        }, 300);

        
        if (this.soundEnabled) {
            setTimeout(() => this.playSound('success'), 100);
        }
    }

    handleKeyboardShortcuts(e) {
        
        if (e.key === 'Escape') {
            e.preventDefault();
            this.toggleSound();
        }

        
        const gameCards = document.querySelectorAll('.game-card');
        const num = parseInt(e.key);
        if (num >= 1 && num <= gameCards.length) {
            e.preventDefault();
            gameCards[num - 1].click();
        }

       
        if (e.key === ' ') {
            e.preventDefault();
            const randomCard = gameCards[Math.floor(Math.random() * gameCards.length)];
            randomCard.click();
        }
    }

    setupSoundEffects() {
      
        this.playAmbientSound();
    }

    playAmbientSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    startEntranceAnimations() {
        
        const cards = document.querySelectorAll('.game-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px) scale(0.8)';

            setTimeout(() => {
                card.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) scale(1)';
            }, 200 * index + 1000);
        });
    }

    setupLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (!loadingScreen) return;

        
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            let dotCount = 0;
            this.loadingInterval = setInterval(() => {
                dotCount = (dotCount + 1) % 4;
                loadingText.textContent = 'Loading awesome games' + '.'.repeat(dotCount);
            }, 500);
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }

        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new GameHub();
});


const touchStyles = document.createElement('style');
touchStyles.textContent = `
    .game-card.touch-active {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 10px 25px rgba(0, 245, 255, 0.4);
    }

    @media (hover: none) {
        .game-card:hover {
            transform: none;
            box-shadow: none;
        }
    }
`;
document.head.appendChild(touchStyles);