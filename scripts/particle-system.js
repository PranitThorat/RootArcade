class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouseParticles = [];
        this.mouse = { x: 0, y: 0, isPressed: false };
        this.animationId = null;

        this.config = {
            particleCount: 100,
            particleSpeed: 0.5,
            particleSize: { min: 1, max: 3 },
            connectionDistance: 100,
            mouseInfluence: 150,
            colors: [
                'rgba(0, 245, 255, 0.6)',
                'rgba(255, 0, 110, 0.6)',
                'rgba(57, 255, 20, 0.6)',
                'rgba(191, 64, 191, 0.6)'
            ]
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.createParticles();
        this.setupEventListeners();
    }

    setupCanvas() {
        this.resizeCanvas();
        this.ctx.imageSmoothingEnabled = true;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleResize() {
        this.resizeCanvas();
        // Redistribute particles
        this.particles.forEach(particle => {
            if (particle.x > this.canvas.width) particle.x = this.canvas.width - 10;
            if (particle.y > this.canvas.height) particle.y = this.canvas.height - 10;
        });
    }

    createParticles() {
        this.particles = [];

        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.config.particleSpeed,
                vy: (Math.random() - 0.5) * this.config.particleSpeed,
                size: Math.random() * (this.config.particleSize.max - this.config.particleSize.min) + this.config.particleSize.min,
                color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
                opacity: Math.random() * 0.5 + 0.3,
                originalSize: 0,
                pulseOffset: Math.random() * Math.PI * 2
            });
            this.particles[i].originalSize = this.particles[i].size;
        }
    }

    setupEventListeners() {
        
        const updateMousePosition = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = clientX - rect.left;
            this.mouse.y = clientY - rect.top;
        };

        
        this.canvas.addEventListener('mousemove', (e) => {
            updateMousePosition(e.clientX, e.clientY);
            this.createMouseParticle(this.mouse.x, this.mouse.y);
        });

        this.canvas.addEventListener('mousedown', () => {
            this.mouse.isPressed = true;
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouse.isPressed = false;
        });

        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            updateMousePosition(touch.clientX, touch.clientY);
            this.createMouseParticle(this.mouse.x, this.mouse.y);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mouse.isPressed = true;
            const touch = e.touches[0];
            updateMousePosition(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchend', () => {
            this.mouse.isPressed = false;
        });

        
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    createMouseParticle(x, y) {
        
        if (this.mouseParticles.length > 20) {
            this.mouseParticles.shift();
        }

        this.mouseParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 1,
            color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
            life: 1,
            decay: Math.random() * 0.02 + 0.01
        });
    }

    updateParticles() {
        const time = Date.now() * 0.001;

        this.particles.forEach(particle => {
            
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.config.mouseInfluence) {
                const force = (this.config.mouseInfluence - distance) / this.config.mouseInfluence;
                const angle = Math.atan2(dy, dx);

                if (this.mouse.isPressed) {
                    
                    particle.vx += Math.cos(angle) * force * 0.01;
                    particle.vy += Math.sin(angle) * force * 0.01;
                } else {
                    
                    particle.vx -= Math.cos(angle) * force * 0.005;
                    particle.vy -= Math.sin(angle) * force * 0.005;
                }

                
                particle.size = particle.originalSize + Math.sin(time * 5 + particle.pulseOffset) * force * 2;
            } else {
                
                particle.size = particle.originalSize;
            }

            
            particle.x += particle.vx;
            particle.y += particle.vy;

            
            if (particle.x <= 0 || particle.x >= this.canvas.width) {
                particle.vx *= -0.8;
                particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            }
            if (particle.y <= 0 || particle.y >= this.canvas.height) {
                particle.vy *= -0.8;
                particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            }

            
            particle.vx += (Math.random() - 0.5) * 0.001;
            particle.vy += (Math.random() - 0.5) * 0.001;

            
            particle.vx *= 0.999;
            particle.vy *= 0.999;

            
            particle.y += Math.sin(time + particle.pulseOffset) * 0.2;
        });

        
        this.mouseParticles = this.mouseParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.size *= 0.99;

            return particle.life > 0;
        });
    }

    drawParticles() {
        
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        
        this.drawConnections();

        
        this.particles.forEach(particle => {
            this.ctx.save();

            
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = particle.size * 2;

            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });

        
        this.mouseParticles.forEach(particle => {
            this.ctx.save();

            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = particle.size * 3;
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    drawConnections() {
        this.ctx.save();

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.connectionDistance) {
                    const opacity = 1 - distance / this.config.connectionDistance;

                    this.ctx.strokeStyle = `rgba(0, 245, 255, ${opacity * 0.3})`;
                    this.ctx.lineWidth = opacity * 2;
                    this.ctx.shadowColor = 'rgba(0, 245, 255, 0.5)';
                    this.ctx.shadowBlur = 2;

                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        this.ctx.restore();
    }

    animate() {
        this.updateParticles();
        this.drawParticles();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (!this.animationId) {
            this.animate();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    destroy() {
        this.stop();
        this.particles = [];
        this.mouseParticles = [];
    }
}