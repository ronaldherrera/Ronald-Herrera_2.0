/**
 * Componente Universal de Botón "VOLVER AL LAB"
 * Replicando la funcionalidad y estética del Laboratorio Virtual.
 */
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // Si estamos dentro del Lab (iframe), el Lab ya provee su propio botón draggable.
        // Ocultamos este para evitar duplicidad.
        const isInsideLab = window.self !== window.top;
        
        const buttonHTML = `
            <a href="/lab" class="back-to-lab-btn" id="universalBackBtn" style="position: fixed; z-index: 999999; display: ${isInsideLab ? 'none' : 'flex'};">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>LAB</span>
            </a>
        `;

        // Inyectar el botón en el body
        document.body.insertAdjacentHTML('afterbegin', buttonHTML);

        const btn = document.getElementById('universalBackBtn');
        if (!btn || isInsideLab) return;

        // Lógica de Draggable (Arrastrable)
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let hasMoved = false;

        // Cargar posición guardada (opcional, para persistencia)
        const savedPos = JSON.parse(localStorage.getItem('labBtnPos') || '{"x": 32, "y": 32}');
        btn.style.left = savedPos.x + "px";
        btn.style.top = savedPos.y + "px";

        function dragStart(e) {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (e.target === btn || btn.contains(e.target)) {
                isDragging = true;
                btn.classList.add('dragging');
                hasMoved = false;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            btn.classList.remove('dragging');
            
            // Guardar posición
            if (hasMoved) {
                const rect = btn.getBoundingClientRect();
                localStorage.setItem('labBtnPos', JSON.stringify({ x: rect.left, y: rect.top }));
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                hasMoved = true;

                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, btn);
            }
        }

        function setTranslate(xPos, yPos, el) {
            // Obtenemos los valores base
            const baseLeft = savedPos.x;
            const baseTop = savedPos.y;
            el.style.left = (baseLeft + xPos) + "px";
            el.style.top = (baseTop + yPos) + "px";
        }

        // Eventos
        document.addEventListener("mousedown", dragStart, false);
        document.addEventListener("mouseup", dragEnd, false);
        document.addEventListener("mousemove", drag, false);

        document.addEventListener("touchstart", dragStart, false);
        document.addEventListener("touchend", dragEnd, false);
        document.addEventListener("touchmove", drag, false);

        // Evitar que el click se dispare si se ha movido (drag)
        btn.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                hasMoved = false;
            }
        });
    });
})();
