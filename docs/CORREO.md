# Formulario de contacto

El formulario de `/contacto` envía los mensajes a `public/send-mail.php`, que los manda por SMTP con PHPMailer (`public/_lib/phpmailer`, protegido con `_lib/.htaccess`) al buzón `hola@ronaldherrera.es`. Al pulsar «Responder» en el correo recibido se contesta directamente a quien escribió.

## Contraseña del buzón

`config-correo.php` va en el servidor, **una carpeta por encima de `public_html`** (por ejemplo `domains/ronaldherrera.es/config-correo.php`), así que desplegar la web no lo borra. Nunca va en git ni en `public_html`. Plantilla: `docs/config-correo.ejemplo.php`.

Si falta, el formulario responde «No se ha podido enviar» y ofrece escribir directamente al correo.

## Protección

- Campo trampa `web`: si llega relleno (lo rellenan los robots), se responde OK sin enviar nada.
- Máximo 5 envíos por hora y dirección IP.
- Los errores de envío se apuntan en `correo-errores.log`, también fuera de `public_html`.

## En local

El servidor de Vite no ejecuta PHP: en desarrollo el formulario siempre muestra el error y el enlace al correo.
