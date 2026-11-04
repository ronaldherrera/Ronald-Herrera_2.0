<?php
// Copia este archivo en el servidor como config-chat.php, UNA CARPETA POR ENCIMA de public_html:
//   domains/ronaldherrera.es/config-chat.php
// No lo subas nunca a git ni a public_html.
return [
    // Clave de la API de Anthropic (console.anthropic.com → API Keys). Pon también un límite de gasto en la consola.
    'clave' => 'sk-ant-...',
    'modelo' => 'claude-haiku-5-5',
    // Mensajes que puede mandar una misma IP por hora
    'mensajes_por_hora' => 30,
    // Respuestas totales al día (tope de gasto)
    'tope_diario' => 300,

    // Voz del clon (ElevenLabs → Claves de API, solo con permiso de texto a voz). Los créditos se comparten con
    // otros proyectos de la misma cuenta: el tope evita que el clon se los gaste todos
    'elevenlabs_clave' => 'sk_...',    // clave propia del portfolio (no la de Krill), solo texto a voz
    'elevenlabs_voz' => 'uobB9qDh5VgiZpZhrrvZ',   // Voice ID de la voz clonada «Ronald»
    'voz_modelo' => 'eleven_v4',       // el más real con la voz clonada; 'eleven_flash_v2_5' gasta la mitad pero suena más plano
    'voz_velocidad' => 1,              // 1 = como la grabación; de 0.7 (lenta) a 1.2 (rápida)
    'voz_caracteres_mes' => 15000,     // tope al mes (con v4, 1 crédito por carácter; el plan Starter da 30.000 compartidos con Krill)

    // Panel del clon (/avatar-admin): contraseña cifrada, creada en el servidor (ver docs/ADMIN-CLON.md)
    'admin_clave_hash' => '$2y$...',
    'modelo_admin' => 'claude-sonnet-5-5',   // el de las tareas del panel (entrevista, análisis)
];
