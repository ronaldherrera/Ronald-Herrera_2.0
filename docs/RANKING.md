# Ranking del juego de Skills

La página `/skills` tiene el juego «A producción». Quien despliega las 17 habilidades puede entrar en el top 10 de su nivel (Fácil, Normal o Difícil), ordenado por tiempo.

## Cómo funciona

`public/ranking.php`, en el mismo Hostinger que la web:

- `GET`: devuelve el top 10 de cada nivel.
- `POST accion=empezar&nivel=…`: al empezar la partida. El servidor apunta la hora y devuelve un token de un solo uso.
- `POST accion=terminar&token=…`: al ganar. El servidor apunta la hora de fin. **El tiempo del ranking lo mide el servidor**, así que no se puede inventar desde el navegador. Menos de 12 segundos se rechaza.
- `POST accion=guardar&token=…&nombre=…&linkedin=…`: guarda el récord si entra en el top 10. El token se gasta.

Nombre: hasta 24 caracteres, sin HTML. LinkedIn: opcional, solo perfiles `linkedin.com/in/…`; se guarda como `https://www.linkedin.com/in/…`. Los enlaces se publican con `rel="nofollow ugc"`.

Límite: 60 partidas por hora y dirección IP.

## Datos

En el servidor, **fuera de `public_html`**: `ranking-skills/ranking.json` (el ranking) y `ranking-skills/partidas.json` (partidas en curso; caducan a las 2 horas). PHP crea la carpeta la primera vez. Desplegar la web no los borra.

**Quitar una entrada** (un nombre ofensivo, o alguien que pide que lo borres): edita `ranking-skills/ranking.json` desde el administrador de archivos de Hostinger y borra su objeto.

## En local

El servidor de Vite no ejecuta PHP: en desarrollo el ranking sale como «no disponible» y las partidas se juegan igual, sin registrarse.
