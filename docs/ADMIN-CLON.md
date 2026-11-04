# Panel del clon (/avatar-admin)

Panel solo para Ronald, para gestionar la versión con IA del portfolio:

- **Conversaciones**: las charlas de los visitantes (las que guarda `chat.php` fuera de `public_html`, 30 días). Leerlas y borrarlas.
- **Enséñale**: datos sobre ti («Algo sobre mí») y forma de responder («Cómo debe responder»). Entran en lo que sabe el clon en su siguiente respuesta.
- **Entrevista**: el clon te pregunta lo que le falta saber. Tú contestas, él propone cómo guardarlo y tú lo revisas antes de guardarlo.
- **Evolución**: el clon lee las conversaciones nuevas y propone qué aprender. Lo que le faltó saber pasa a la entrevista y las mejoras de cómo responder pasan a «Cómo responde». **Nada entra sin tu visto bueno**, así un visitante no puede colarle datos falsos ni instrucciones.
- **Banco de pruebas**: el avatar, la voz y el chat de pruebas. Solo funciona en local (`npm run dev`).

## Dónde está cada cosa

| Pieza | Archivo |
|---|---|
| Página | `src/pages/AvatarAdmin.jsx` |
| API en el servidor | `public/admin-clon.php` |
| API en desarrollo (sin contraseña, solo este ordenador) | `scripts/panel-clon-local.mjs` (`/admin-clon-local`) |
| Lo aprendido | En el servidor, `clon-aprendido.json`, una carpeta por encima de `public_html` (junto a `config-chat.php`). En local, `datos-clon.local/`, que no se sube a git |
| Tareas con Claude (preguntar, resumir tu respuesta, analizar) | `public/_lib/aprender-clon.json` |
| Cómo se añade a lo que sabe el clon | `textoAprendido()` en `public/_lib/aprendido.php` (lo usa `chat.php`) |

Las tareas del panel usan `claude-sonnet-5-5`, que razona mejor que el modelo del chat. Se cambia con `modelo_admin` en `config-chat.php`. Gastan solo cuando pulsas: unos céntimos por análisis y menos aún por pregunta.

## Activarlo en el servidor (una vez)

1. Sube `public/admin-clon.php`, `public/_lib/aprendido.php`, `public/_lib/aprender-clon.json`, el `chat.php` actualizado y el resto de `_lib`.
2. Crea tu contraseña cifrada **en el servidor, por SSH** (así la contraseña no pasa por ningún chat ni archivo):

   ```bash
   php -r 'echo password_hash(trim(fgets(STDIN)), PASSWORD_DEFAULT), PHP_EOL;'
   ```

   Escribe la contraseña, pulsa Enter y copia la línea que empieza por `$2y$`. Usa una contraseña larga y que no uses en otro sitio.
3. Añádela a `config-chat.php` (fuera de `public_html`):

   ```php
   'admin_clave_hash' => '$2y$...',
   ```

4. Entra en `https://ronaldherrera.es/avatar-admin`.

**Seguridad:**
- La sesión dura 14 días en ese navegador, con una cookie firmada que solo lee el servidor.
- Hay 5 intentos por IP cada 15 minutos y 20 en total por hora; los fallos quedan en `chat-errores.log`.
- Al cambiar la contraseña (un `admin_clave_hash` nuevo) se cierran todas las sesiones.
- La página no se indexa: robots.txt y la etiqueta noindex.

## Privacidad

Las conversaciones ya se guardan 30 días y te llegan por correo. El panel las lee para que el clon mejore. Las propuestas no incluyen datos de visitantes, porque así se le pide a Claude, y además tú las revisas. Conviene añadir una línea a `/privacidad` que diga que las conversaciones se usan también para mejorar las respuestas del clon. El texto, antes de publicarlo, para revisarlo.
