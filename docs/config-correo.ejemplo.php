<?php
// Copia este archivo en el servidor como config-correo.php, UNA CARPETA POR ENCIMA de public_html
// (por ejemplo domains/ronaldherrera.es/config-correo.php), y pon la contraseña real del buzón.
// No lo subas nunca a git ni a public_html.
return [
    'host' => 'smtp.hostinger.com',
    'puerto' => 465,
    'usuario' => 'hola@ronaldherrera.es',
    'clave' => 'CONTRASEÑA_DEL_BUZÓN',
    // A quién llegan los mensajes del formulario
    'destinatarios' => ['hola@ronaldherrera.es'],
];
