# CV interactivo (WebAR) — `/cv` y `/ar-cv`

Experiencia de realidad aumentada para el CV impreso. MindAR reconoce la hoja y
A-Frame dibuja cinco tarjetas ancladas al papel. Al tocar una tarjeta se abre un
panel HTML con el contenido. Sin cámara, la misma información se muestra como
una página web normal.

## Archivos

| Archivo | Función |
| --- | --- |
| `arCvData.js` | **Todos los datos editables**: contacto, redes, proyectos, Lab, textos y rutas de recursos. Un enlace `null` oculta su botón. |
| `ARExperience.jsx` | Estados (bienvenida → AR → versión web), mensajes de error, analítica anónima y metadatos SEO. |
| `ARScene.jsx` | Crea la escena A-Frame/MindAR, gestiona los toques, la pausa de la pestaña y la orientación, y libera la cámara al salir. |
| `arComponents.js` | Componentes A-Frame (`rh-card`, `rh-outline`, `rh-follow`) y ajustes del ciclo de vida de MindAR. |
| `arEngine.js` | Permiso de cámara, descarga del motor y del target con progreso real. |
| `cardTextures.js` | Dibujo en canvas de las tarjetas (tipografía y colores de la marca). |
| `WelcomeScreen`, `TrackingGuide`, `BottomSheet`, `FloatingMenu`, `FallbackExperience`, `panels/` | Interfaz HTML. |

Recursos en `public/AR-CV/`: `vendor/` (A-Frame 1.5.0 + MindAR 1.2.5, builds
oficiales), `proyectos/` (miniaturas WebP), `ronald-herrera.vcf` y `og-cv.jpg`.

## Generar o sustituir `targets.mind`

1. Exporta el CV definitivo como `public/AR-CV/cv-target.png`: plano, sin
   perspectiva, sombras, fondo ni márgenes añadidos. La versión actual
   (1785 × 2526 px) funciona bien.
2. Ejecuta `npm run ar:compile`. Compila la imagen con el compilador de MindAR
   de `vendor/` en Chrome sin interfaz, escribe `public/AR-CV/targets.mind` e
   informa de los puntos obtenidos.
   - Puntos de detección: más resolución da más puntos, y el CV se reconoce
     antes y desde más lejos.
   - Puntos de seguimiento: MindAR siempre reduce la imagen a 256 px, así que
     dependen del contraste y la textura del diseño, no de la resolución.
3. Alternativa: el compilador web oficial
   (<https://hiukim.github.io/mind-ar-js-doc/tools/compile>). En algunos
   navegadores falla con `r.backend(...).compileAndRun is not a function`.

Si cambias el diseño del CV impreso, vuelve a compilar.

Mientras no exista `targets.mind`, «Activar experiencia» muestra la versión web
con el aviso «La experiencia con cámara estará disponible muy pronto». En ese
caso no se pide la cámara.

## Probar en local

- `npm run dev:https` sirve la web por HTTPS con un certificado local. Abre
  `https://<IP-del-PC>:5173/cv` en el móvil (misma red) y acepta el aviso del
  certificado. La cámara solo funciona en HTTPS o en `localhost`.
- `npm run build && npm run preview` sirve el build de producción e imita la
  regla de `.htaccess` para `/cv` y `/ar-cv`.
