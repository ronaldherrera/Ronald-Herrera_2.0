<?php
// Recibe el formulario de contacto de ronaldherrera.es y lo envía por SMTP al buzón propio.
// Las credenciales NO están aquí: se leen de config-correo.php, fuera de la carpeta pública
// (ver docs/CORREO.md). Así desplegar una versión nueva de la web no borra la contraseña.

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(405, ['ok' => false, 'error' => 'Método no permitido']);

// --- Configuración -----------------------------------------------------------
$rutasConfig = [dirname(__DIR__) . '/config-correo.php', __DIR__ . '/_lib/config-correo.php'];
$config = null;
foreach ($rutasConfig as $ruta) {
    if (is_file($ruta)) { $config = require $ruta; break; }
}
if (!is_array($config) || empty($config['clave'])) responder(500, ['ok' => false, 'error' => 'Correo sin configurar']);

require __DIR__ . '/_lib/phpmailer/src/Exception.php';
require __DIR__ . '/_lib/phpmailer/src/PHPMailer.php';
require __DIR__ . '/_lib/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// --- Datos ---------------------------------------------------------------------
$campo = function (string $nombre, int $max = 200): string {
    $v = trim((string)($_POST[$nombre] ?? ''));
    $v = preg_replace('/[\r\n]+/', ' ', $v) ?? '';
    return mb_substr(strip_tags($v), 0, $max);
};

// Campo trampa: los robots lo rellenan, las personas no lo ven
if ($campo('web') !== '') responder(200, ['ok' => true]);

$nombre  = $campo('nombre', 120);
$email   = $campo('email', 160);
$mensaje = mb_substr(strip_tags(trim((string)($_POST['mensaje'] ?? ''))), 0, 3000);

if ($nombre === '' || $email === '' || $mensaje === '') responder(400, ['ok' => false, 'error' => 'Faltan datos']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responder(400, ['ok' => false, 'error' => 'El email no es válido']);

// Límite sencillo: 5 envíos por hora y dirección IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$registro = sys_get_temp_dir() . '/ronaldherrera-envios-' . md5($ip);
$ahora = time();
$envios = is_file($registro) ? array_filter(array_map('intval', explode(',', (string)file_get_contents($registro))), fn($t) => $t > $ahora - 3600) : [];
if (count($envios) >= 5) responder(429, ['ok' => false, 'error' => 'Demasiados envíos. Inténtalo más tarde.']);
$envios[] = $ahora;
@file_put_contents($registro, implode(',', $envios));

$h = fn(string $t): string => htmlspecialchars($t, ENT_QUOTES, 'UTF-8');

// Registro de errores de envío, fuera de public_html (no se sirve ni se borra al desplegar)
function registrar(string $texto): void {
    @file_put_contents(dirname(__DIR__) . '/correo-errores.log', date('Y-m-d H:i:s') . ' ' . $texto . "\n", FILE_APPEND);
}

// --- Aviso al buzón ------------------------------------------------------------
$filas = [
    'Nombre' => $nombre,
    'Email' => $email,
    'Mensaje' => $mensaje,
    'Fecha' => date('d/m/Y H:i'),
];
$tabla = '';
foreach ($filas as $k => $v) {
    $tabla .= "<tr><td style='padding:8px 12px;color:#8a8470;vertical-align:top;white-space:nowrap'>{$h($k)}</td><td style='padding:8px 12px;color:#1a1a1a'>" . nl2br($h($v)) . "</td></tr>";
}
$asunto = "Mensaje desde ronaldherrera.es: $nombre";

try {
    $m = new PHPMailer(true);
    $m->isSMTP();
    $m->Host = $config['host'];
    $m->SMTPAuth = true;
    $m->Username = $config['usuario'];
    $m->Password = $config['clave'];
    $m->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $m->Port = (int)($config['puerto'] ?? 465);
    $m->CharSet = 'UTF-8';
    $m->isHTML(true);
    $m->setFrom($config['usuario'], 'Web ronaldherrera.es');
    foreach ($config['destinatarios'] as $d) $m->addAddress($d);
    // Responder al correo contesta directamente a quien escribió
    $m->addReplyTo($email, $nombre);
    $m->Subject = $asunto;
    $m->Body = "<div style='font-family:Arial,sans-serif;font-size:15px'>"
        . "<h2 style='color:#101010;margin:0 0 12px'>{$h($asunto)}</h2>"
        . "<table style='border-collapse:collapse;background:#f4f1e4;border-radius:10px'>$tabla</table>"
        . "<p style='color:#8a8470;font-size:13px;margin:14px 0 0'>Pulsa «Responder» para contestar a {$h($email)}.</p></div>";
    $m->AltBody = implode("\n", array_map(fn($k, $v) => "$k: $v", array_keys($filas), $filas));
    $m->send();
} catch (Exception $e) {
    registrar('Contacto: ' . ($m->ErrorInfo ?? $e->getMessage()));
    responder(500, ['ok' => false, 'error' => 'No se pudo enviar']);
}

responder(200, ['ok' => true]);
