/**
 * Lightbox Universal - Componente reutilizable para presentaciones
 * Detecta automáticamente elementos con la clase .media-content
 */
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // Inyectar HTML del Lightbox al final del body
        const lightboxHTML = `
            <div id="universal-lightbox" class="lightbox-overlay">
                <button class="lightbox-close" aria-label="Cerrar">&times;</button>
                <div class="lightbox-content">
                    <img id="lightbox-img" src="" alt="">
                    <video id="lightbox-video" controls autoplay loop style="display: none;"></video>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', lightboxHTML);

        const overlay = document.getElementById('universal-lightbox');
        const lbImg = document.getElementById('lightbox-img');
        const lbVideo = document.getElementById('lightbox-video');
        const closeBtn = overlay.querySelector('.lightbox-close');

        // Función para abrir el lightbox
        window.openLightbox = function(src, isVideo = false) {
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
            
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeLightbox = () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            lbVideo.pause();
            lbVideo.src = '';
        };

        // Eventos de click
        document.addEventListener('click', (e) => {
            const media = e.target.closest('.media-content');
            if (media) {
                e.preventDefault();
                const src = media.src || media.querySelector('img')?.src || media.querySelector('video source')?.src || media.querySelector('source')?.src;
                const isVideo = media.tagName === 'VIDEO' || media.querySelector('video') !== null || src?.endsWith('.mp4');
                if (src) openLightbox(src, isVideo);
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === closeBtn) closeLightbox();
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) closeLightbox();
        });
    });
})();
