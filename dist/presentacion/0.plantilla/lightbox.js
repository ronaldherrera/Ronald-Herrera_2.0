/**
 * Lightbox Universal - Componente reutilizable para presentaciones
 * Detecta automáticamente elementos con la clase .media-content
 */
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Inyectar CSS del Lightbox mejorado
        const lightboxCSS = `
            .lightbox-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(15px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.4s ease;
            }

            .lightbox-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }

            .lightbox-content {
                position: relative;
                max-width: 90vw;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: scale(0.95);
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .lightbox-overlay.active .lightbox-content {
                transform: scale(1);
            }

            .lightbox-content img, .lightbox-content video {
                max-width: 100%;
                max-height: 85vh;
                border-radius: 4px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                display: block;
            }

            /* Botones de Control */
            .lb-btn {
                position: absolute;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                z-index: 10000;
            }

            .lb-btn:hover {
                background: rgba(255,255,255,0.15);
                transform: scale(1.1);
            }

            .lb-close {
                top: -60px;
                right: 0;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                font-size: 24px;
            }

            .lb-nav {
                top: 50%;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                font-size: 30px;
                transform: translateY(-50%);
            }

            .lb-prev { left: -80px; }
            .lb-next { right: -80px; }

            .media-content {
                cursor: zoom-in;
                transition: transform 0.3s ease;
            }

            .media-content:hover {
                transform: scale(1.02);
            }

            @media (max-width: 1100px) {
                .lb-prev { left: 10px; }
                .lb-next { right: 10px; }
                .lb-close { top: 10px; right: 10px; }
                .lb-nav { width: 44px; height: 44px; font-size: 20px; background: rgba(0,0,0,0.5); }
            }
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = lightboxCSS;
        document.head.appendChild(styleTag);

        // 2. Inyectar HTML del Lightbox
        const lightboxHTML = `
            <div id="universal-lightbox" class="lightbox-overlay">
                <div class="lightbox-content">
                    <button class="lb-btn lb-close" id="lb-close" aria-label="Cerrar">&times;</button>
                    <button class="lb-btn lb-nav lb-prev" id="lb-prev" aria-label="Anterior">&lsaquo;</button>
                    <button class="lb-btn lb-nav lb-next" id="lb-next" aria-label="Siguiente">&rsaquo;</button>
                    <img id="lightbox-img" src="" alt="">
                    <video id="lightbox-video" controls autoplay loop style="display: none;"></video>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', lightboxHTML);

        const overlay = document.getElementById('universal-lightbox');
        const lbImg = document.getElementById('lightbox-img');
        const lbVideo = document.getElementById('lightbox-video');
        const btnPrev = document.getElementById('lb-prev');
        const btnNext = document.getElementById('lb-next');
        const btnClose = document.getElementById('lb-close');

        let galleryItems = [];
        let currentIndex = 0;

        const updateGallery = () => {
            galleryItems = Array.from(document.querySelectorAll('.media-content'));
            if (galleryItems.length <= 1) {
                btnPrev.style.display = 'none';
                btnNext.style.display = 'none';
            } else {
                btnPrev.style.display = 'flex';
                btnNext.style.display = 'flex';
            }
        };

        const showItem = (index) => {
            if (index < 0) index = galleryItems.length - 1;
            if (index >= galleryItems.length) index = 0;
            currentIndex = index;

            const item = galleryItems[currentIndex];
            const src = item.src || item.querySelector('img')?.src || item.querySelector('video source')?.src || item.querySelector('source')?.src;
            const isVideo = item.tagName === 'VIDEO' || item.querySelector('video') !== null || src?.endsWith('.mp4');

            if (isVideo) {
                lbImg.style.display = 'none';
                lbVideo.style.display = 'block';
                lbVideo.src = src;
            } else {
                lbVideo.style.display = 'none';
                lbVideo.pause();
                lbImg.style.display = 'block';
                lbImg.src = src;
            }
        };

        const openLightbox = (index) => {
            updateGallery();
            showItem(index);
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeLightbox = () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            lbVideo.pause();
            lbVideo.src = '';
        };

        // Eventos de click en la página
        document.addEventListener('click', (e) => {
            const media = e.target.closest('.media-content');
            if (media) {
                e.preventDefault();
                updateGallery();
                const index = galleryItems.indexOf(media);
                if (index !== -1) openLightbox(index);
            }
        });

        // Eventos del Lightbox
        btnPrev.addEventListener('click', (e) => { e.stopPropagation(); showItem(currentIndex - 1); });
        btnNext.addEventListener('click', (e) => { e.stopPropagation(); showItem(currentIndex + 1); });
        btnClose.addEventListener('click', closeLightbox);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showItem(currentIndex - 1);
            if (e.key === 'ArrowRight') showItem(currentIndex + 1);
        });
    });
})();
