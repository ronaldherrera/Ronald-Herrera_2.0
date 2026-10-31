/**
 * Índice de las presentaciones de producto.
 * Se construye solo a partir de las secciones de la página:
 * «El producto», cada .ecosystem-section (número del h3 y título del h4) y el resumen final.
 * Escritorio: riel fijo a la derecha con el número y el título de la sección actual.
 * Móvil: botón flotante que abre una hoja inferior.
 * Toma los colores de --accent y --bg de cada presentación.
 */
(function () {
    const css = `
        .indice-producto { position: fixed; right: 22px; top: 50%; transform: translateY(-50%); z-index: 900; display: flex; flex-direction: column; gap: 4px; }
        .indice-producto a { display: flex; align-items: center; justify-content: flex-end; gap: 10px; height: 30px; color: var(--muted, rgba(255,255,255,.45)); text-decoration: none; font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.08em; }
        .indice-producto a b { font-weight: 600; white-space: nowrap; max-width: 0; overflow: hidden; opacity: 0; transition: max-width .35s ease, opacity .25s ease; font-family: var(--font-heading); font-size: 0.8rem; letter-spacing: 0; color: var(--text, #fff); }
        .indice-producto a i { font-style: normal; width: 2.2em; text-align: right; transition: color .2s; }
        .indice-producto a::after { content: ''; width: 14px; height: 2px; border-radius: 2px; background: currentColor; opacity: .5; transition: width .3s ease, opacity .3s, background .3s; }
        @media (min-width: 1800px) { .indice-producto a.actual b { max-width: 260px; opacity: 1; } }
        .indice-producto a.actual { color: var(--accent); }
        .indice-producto a.actual::after { width: 30px; opacity: 1; background: var(--accent); }
        .indice-producto a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
        .indice-producto:hover a b { max-width: 260px; opacity: 1; }
        .indice-producto:hover { background: color-mix(in srgb, var(--bg, #000) 88%, transparent); padding: 12px 14px; margin-right: -14px; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.45); }

        .indice-boton, .indice-hoja { display: none; }

        .seguir { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 4rem; }
        .seguir a { display: block; padding: 1.6rem 1.8rem; border: 1px solid var(--border); border-radius: 16px; color: var(--text, #fff); text-decoration: none; transition: border-color .2s, background .2s; }
        .seguir a:hover, .seguir a:focus-visible { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, transparent); }
        .seguir small { display: block; font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 0.5rem; }
        .seguir b { font-size: 1.25rem; letter-spacing: -0.01em; }
        .seguir a:last-child { text-align: right; }
        .seguir a.identidad { position: relative; overflow: hidden; isolation: isolate; }
        .seguir a.identidad::before { content: ''; position: absolute; inset: 0; z-index: -2; background: var(--portada) var(--pos, right 30%) / 100% auto no-repeat, var(--bg, #000); transition: transform .6s cubic-bezier(.2,.8,.2,1); }
        .seguir a.identidad::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, var(--bg, #000) 46%, color-mix(in srgb, var(--bg, #000) 70%, transparent) 56%, transparent 74%); }

        /* El índice ya marca dónde estás: sin barra de desplazamiento */
        html, body { scrollbar-width: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
        .seguir a.identidad:hover::before, .seguir a.identidad:focus-visible::before { transform: scale(1.05); }
        .seguir a.identidad small { color: #fff; opacity: .8; }
        .seguir a.identidad b { color: #fff; }
        .seguir a.identidad:hover { background: none; }
        @media (prefers-reduced-motion: reduce) { .seguir a.identidad::before { transition: none; } }
        @media (max-width: 700px) { .seguir { grid-template-columns: 1fr; } .seguir a:last-child { text-align: left; } }

        @media (max-width: 1360px) {
            .indice-producto { display: none; }
            .indice-boton { display: flex; align-items: center; gap: 10px; position: fixed; right: 16px; bottom: max(16px, env(safe-area-inset-bottom)); z-index: 900; padding: 12px 18px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); background: color-mix(in srgb, var(--bg, #000) 90%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: var(--text, #fff); font: 600 0.85rem var(--font-heading); box-shadow: 0 12px 30px rgba(0,0,0,.5); cursor: pointer; }
            .indice-boton i { font-style: normal; font-family: var(--font-mono); color: var(--accent); font-size: 0.75rem; }
            .indice-hoja { display: block; position: fixed; inset: 0; z-index: 1000; visibility: hidden; }
            .indice-hoja.abierta { visibility: visible; }
            .indice-hoja::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,.55); opacity: 0; transition: opacity .25s; }
            .indice-hoja.abierta::before { opacity: 1; }
            .indice-hoja nav { position: absolute; left: 0; right: 0; bottom: 0; max-height: 80vh; overflow-y: auto; padding: 10px 16px max(20px, env(safe-area-inset-bottom)); background: var(--bg, #000); border-top: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 22px 22px 0 0; transform: translateY(100%); transition: transform .3s cubic-bezier(.2,.8,.2,1); }
            .indice-hoja.abierta nav { transform: none; }
            .indice-hoja nav::before { content: ''; display: block; width: 40px; height: 4px; border-radius: 2px; margin: 4px auto 14px; background: rgba(255,255,255,.2); }
            .indice-hoja a { display: flex; align-items: baseline; gap: 14px; padding: 14px 6px; color: var(--text, #fff); text-decoration: none; font: 600 1rem var(--font-heading); border-bottom: 1px solid rgba(255,255,255,.06); }
            .indice-hoja a i { font-style: normal; font-family: var(--font-mono); font-size: 0.75rem; color: var(--muted, rgba(255,255,255,.45)); width: 2em; }
            .indice-hoja a.actual, .indice-hoja a.actual i { color: var(--accent); }
        }
        @media (prefers-reduced-motion: reduce) {
            .indice-producto a b, .indice-producto a::after, .indice-hoja nav, .indice-hoja::before { transition: none; }
        }
    `;

    document.addEventListener('DOMContentLoaded', () => {
        const secciones = [];
        const producto = document.querySelector('.project-grid > .info-block:not(.conclusion)');
        if (producto) secciones.push({ el: producto, num: '', titulo: 'El producto' });
        document.querySelectorAll('.ecosystem-section').forEach((el) => {
            const h3 = el.querySelector('h3');
            const h4 = el.querySelector('h4');
            if (!h3 || !h4) return;
            const num = (h3.textContent.match(/^\s*(\d+)/) || [])[1] || '';
            secciones.push({ el, num, titulo: h4.textContent.trim() });
        });
        document.querySelectorAll('[data-indice]').forEach((el) => {
            secciones.push({ el, num: '', titulo: el.dataset.indice });
        });
        if (secciones.length < 3) return;

        const estilo = document.createElement('style');
        estilo.textContent = css;
        document.head.appendChild(estilo);

        secciones.forEach((s, i) => { if (!s.el.id) s.el.id = 'seccion-' + (i + 1); });
        const enlace = (s) => `<a href="#${s.el.id}"><i>${s.num || '·'}</i><b>${s.titulo}</b></a>`;

        const riel = document.createElement('nav');
        riel.className = 'indice-producto';
        riel.setAttribute('aria-label', 'Secciones');
        riel.innerHTML = secciones.map(enlace).join('');

        const boton = document.createElement('button');
        boton.className = 'indice-boton';
        boton.type = 'button';
        boton.setAttribute('aria-expanded', 'false');

        const hoja = document.createElement('div');
        hoja.className = 'indice-hoja';
        hoja.innerHTML = `<nav aria-label="Secciones">${secciones.map(enlace).join('')}</nav>`;

        document.body.append(riel, boton, hoja);

        const abrir = (si) => {
            hoja.classList.toggle('abierta', si);
            boton.setAttribute('aria-expanded', String(si));
        };
        boton.addEventListener('click', () => abrir(true));
        hoja.addEventListener('click', (e) => { if (e.target === hoja || e.target.closest('a')) abrir(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });

        const todos = [...riel.querySelectorAll('a'), ...hoja.querySelectorAll('a')];
        const marcar = () => {
            const linea = window.innerHeight * 0.35;
            let actual = 0;
            secciones.forEach((s, i) => { if (s.el.getBoundingClientRect().top <= linea) actual = i; });
            todos.forEach((a, i) => a.classList.toggle('actual', i % secciones.length === actual));
            const s = secciones[actual];
            boton.innerHTML = `<i>${s.num || '·'}</i>${s.titulo}`;
        };
        let pendiente = false;
        window.addEventListener('scroll', () => {
            if (pendiente) return;
            pendiente = true;
            requestAnimationFrame(() => { marcar(); pendiente = false; });
        }, { passive: true });
        marcar();
    });
})();
