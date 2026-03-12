class TigerExperience {
    constructor() {
        this.ambientCanvas = document.getElementById('ambient-canvas');
        this.ambientCtx = this.ambientCanvas.getContext('2d');
        
        this.tigerCanvas = document.getElementById('tiger-canvas');
        this.tigerCtx = this.tigerCanvas.getContext('2d');
        
        this.frameCount = 242;
        this.images = [];
        this.currentFrame = 0;
        this.isLoaded = false;
        
        this.resizeTimer = null;
        
        this.init();
    }

    async init() {
        this.initLenis();
        await this.preloadFrames();
        this.handleResize();
        this.renderFrame(0);
        this.initScroll();
        this.addEventListeners();
    }

    initLenis() {
        this.lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
        });

        const raf = (time) => {
            this.lenis.raf(time);
            requestAnimationFrame(raf);
        };

        requestAnimationFrame(raf);
    }

    async preloadFrames() {
        return new Promise((resolve) => {
            let loadedCount = 0;
            
            for (let i = 1; i <= this.frameCount; i++) {
                const img = new Image();
                // Format number with leading zeros: 001, 002, etc.
                const frameNumber = i.toString().padStart(3, '0');
                const src = `assets/nike-tiger-images/ezgif-frame-${frameNumber}.webp`;
                
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === this.frameCount) {
                        this.isLoaded = true;
                        resolve();
                    }
                };
                
                img.onerror = () => {
                    console.error(`Failed to load image: ${src}`);
                    // Still increment to avoid getting stuck if an image is missing
                    loadedCount++;
                    if (loadedCount === this.frameCount) {
                        this.isLoaded = true;
                        resolve();
                    }
                };

                img.src = src;
                this.images.push(img);
            }
        });
    }

    updateFrame(progress) {
        if (!this.isLoaded || this.images.length === 0) return;
        
        const frameIndex = Math.min(
            this.frameCount - 1,
            Math.floor(progress * this.frameCount)
        );
        
        if (this.currentFrame !== frameIndex) {
            this.currentFrame = frameIndex;
            requestAnimationFrame(() => this.renderFrame(frameIndex));
        }
    }

    renderFrame(index) {
        const img = this.images[index];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        // Clear both canvases
        this.ambientCtx.clearRect(0, 0, this.ambientCanvas.width, this.ambientCanvas.height);
        this.tigerCtx.clearRect(0, 0, this.tigerCanvas.width, this.tigerCanvas.height);

        // Calculate aspect ratios
        const imgRatio = img.width / img.height;
        
        // For ambient canvas (object-fit: cover equivalent)
        const ambientCanvasRatio = this.ambientCanvas.width / this.ambientCanvas.height;
        let ambientRenderWidth = this.ambientCanvas.width;
        let ambientRenderHeight = this.ambientCanvas.height;
        let ambientOffsetX = 0;
        let ambientOffsetY = 0;

        if (ambientCanvasRatio > imgRatio) {
            ambientRenderHeight = this.ambientCanvas.width / imgRatio;
            ambientOffsetY = (this.ambientCanvas.height - ambientRenderHeight) / 2;
        } else {
            ambientRenderWidth = this.ambientCanvas.height * imgRatio;
            ambientOffsetX = (this.ambientCanvas.width - ambientRenderWidth) / 2;
        }

        this.ambientCtx.drawImage(
            img,
            ambientOffsetX,
            ambientOffsetY,
            ambientRenderWidth,
            ambientRenderHeight
        );

        // For tiger canvas (object-fit: contain equivalent)
        const tigerCanvasRatio = this.tigerCanvas.width / this.tigerCanvas.height;
        let tigerRenderWidth = this.tigerCanvas.width;
        let tigerRenderHeight = this.tigerCanvas.height;
        let tigerOffsetX = 0;
        let tigerOffsetY = 0;

        if (tigerCanvasRatio > imgRatio) {
            tigerRenderWidth = this.tigerCanvas.height * imgRatio;
            tigerOffsetX = (this.tigerCanvas.width - tigerRenderWidth) / 2;
        } else {
            tigerRenderHeight = this.tigerCanvas.width / imgRatio;
            tigerOffsetY = (this.tigerCanvas.height - tigerRenderHeight) / 2;
        }

        this.tigerCtx.drawImage(
            img,
            tigerOffsetX,
            tigerOffsetY,
            tigerRenderWidth,
            tigerRenderHeight
        );
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.ambientCanvas.width = width;
        this.ambientCanvas.height = height;
        
        this.tigerCanvas.width = width;
        this.tigerCanvas.height = height;

        if (this.isLoaded) {
            this.renderFrame(this.currentFrame);
        }
    }

    addEventListeners() {
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 150); // Debounce resize
        });
    }

    initScroll() {
        gsap.registerPlugin(ScrollTrigger);

        // Sync lenis and ScrollTrigger
        this.lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
            this.lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        // Create the scroll trigger for the hero section
        ScrollTrigger.create({
            trigger: ".hero-section",
            start: "top top",
            end: "bottom bottom",
            scrub: 1, // Add a bit of smoothing to the scrub
            onUpdate: (self) => {
                this.updateFrame(self.progress);
            }
        });

        // Fade out overlay text as you scroll
        gsap.to(".hero-overlay-text", {
            opacity: 0,
            y: -50,
            scrollTrigger: {
                trigger: ".hero-section",
                start: "top top",
                end: "20% top",
                scrub: true
            }
        });
    }
}

class UIController {
    constructor() {
        this.initLazyLoading();
        this.initCarousel();
        this.initFadeInSections();
    }

    initLazyLoading() {
        const lazyImages = document.querySelectorAll('.lazy-image');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.onload = () => img.classList.add('loaded');
                    } else {
                        img.classList.add('loaded'); // Fallback if no real source
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: "0px 0px 50px 0px"
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    initCarousel() {
        const carousel = document.getElementById('carousel');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        if (!carousel || !prevBtn || !nextBtn) return;

        const scrollAmount = () => {
            const item = carousel.querySelector('.carousel-item');
            if (item) {
                return item.offsetWidth + parseFloat(getComputedStyle(carousel).gap || 0);
            }
            return 300;
        };

        prevBtn.addEventListener('click', () => {
            carousel.scrollBy({
                left: -scrollAmount(),
                behavior: 'smooth'
            });
        });

        nextBtn.addEventListener('click', () => {
            carousel.scrollBy({
                left: scrollAmount(),
                behavior: 'smooth'
            });
        });
    }

    initFadeInSections() {
        const sections = document.querySelectorAll('.fade-in-section');
        
        const sectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        });

        sections.forEach(section => sectionObserver.observe(section));
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new TigerExperience();
    new UIController();
});
// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();
