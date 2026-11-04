<?php
// Voz del clon: convierte en audio, con la voz clonada de Ronald en ElevenLabs, una respuesta que ya dio chat.php.
// Solo acepta textos firmados por chat.php (así nadie puede usar la voz de Ronald para decir otra cosa) y tiene un
// tope de caracteres al mes, porque los créditos de ElevenLabs se comparten con otros proyectos.
// Devuelve el audio (mp3 en base64) y el momento en que suena cada carácter, para mover los labios del avatar.
// La clave y la voz se leen de config-chat.php, FUERA de public_html (ver docs/config-chat.ejemplo.php).

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

require __DIR__ . '/_lib/conversaciones.php';
require __DIR__ . '/_lib/voz.php';

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(405, ['ok' => false, 'error' => 'Método no permitido']);

$config = null;
foreach ([dirname(__DIR__) . '/config-chat.php', __DIR__ . '/_lib/config-chat.php'] as $ruta) {
    if (is_file($ruta)) { $config = require $ruta; break; }
}
if (!vozDisponible($config)) responder(503, ['ok' => false, 'error' => 'Voz no disponible']);

$entrada = json_decode((string)file_get_contents('php://input'), true);
$texto = (string)($entrada['texto'] ?? '');
$firma = (string)($entrada['firma'] ?? '');
if ($texto === '' || mb_strlen($texto) > 1500 || !hash_equals(firmaVoz($config, $texto), $firma)) {
    responder(400, ['ok' => false, 'error' => 'Texto no válido']);
}

// Límites: por IP y hora, y caracteres al mes en total
$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
if (!contador('voz-ip-' . $ip, 3600, (int)($config['voz_por_hora'] ?? 40))) {
    responder(429, ['ok' => false, 'error' => 'Demasiadas peticiones']);
}
if (!gastarCaracteresVoz($config, mb_strlen($texto))) {
    responder(429, ['ok' => false, 'error' => 'Tope de voz del mes alcanzado']);
}

// Eleven v4: el que suena más real con la voz clonada (elegido a oído frente a Flash, Multilingual v2 y v3).
// Velocidad 1 = la de la grabación (ElevenLabs admite de 0,7 a 1,2)
function cuerpoVoz(string $texto, array $config): array {
    $modelo = $config['voz_modelo'] ?? 'eleven_v4';
    $velocidad = (float)($config['voz_velocidad'] ?? 1);
    $cuerpo = ['text' => $texto, 'model_id' => $modelo];
    if ($modelo === 'eleven_flash_v2_5') $cuerpo['language_code'] = 'es';
    if ($velocidad !== 1.0) $cuerpo['voice_settings'] = ['speed' => $velocidad];
    return $cuerpo;
}

$curl = curl_init('https://api.elevenlabs.io/v1/text-to-speech/' . rawurlencode($config['elevenlabs_voz'])
    . '/with-timestamps?output_format=mp3_44100_128');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'xi-api-key: ' . $config['elevenlabs_clave']],
    CURLOPT_POSTFIELDS => json_encode(cuerpoVoz($texto, $config), JSON_UNESCAPED_UNICODE),
]);
$cuerpo = curl_exec($curl);
$estado = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$error = curl_error($curl);
curl_close($curl);

$json = is_string($cuerpo) ? json_decode($cuerpo, true) : null;
if ($estado !== 200 || empty($json['audio_base64'])) {
    registrar('Voz: ElevenLabs respondió ' . $estado . ' ' . ($error ?: mb_substr((string)$cuerpo, 0, 300)));
    devolverCaracteresVoz($config, mb_strlen($texto));
    responder(502, ['ok' => false, 'error' => 'No se pudo generar la voz']);
}

// Para los labios, lo que suena de verdad (normalized: «2022» -> «dos mil veintidós»); para las marcas del cuerpo,
// el texto tal cual se envió, que es donde chat.php contó su posición
$tiempos = $json['normalized_alignment'] ?? $json['alignment'] ?? null;
responder(200, [
    'ok' => true,
    'audio' => $json['audio_base64'],
    'inicios' => $json['alignment']['character_start_times_seconds'] ?? null,
    'tiempos' => $tiempos ? [
        'caracteres' => $tiempos['characters'] ?? [],
        'inicios' => $tiempos['character_start_times_seconds'] ?? [],
        'finales' => $tiempos['character_end_times_seconds'] ?? [],
    ] : null,
]);
