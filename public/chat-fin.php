<?php
// El navegador avisa (con sendBeacon) de que el visitante ha cerrado el chat o la página:
// se envía a Ronald la conversación tal y como la guardó el servidor. El navegador solo manda el id.

header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

require __DIR__ . '/_lib/conversaciones.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$entrada = json_decode((string)file_get_contents('php://input'), true);
$id = idConversacion($entrada['id'] ?? '');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';

if ($id !== null && contador('fin-' . $ip, 3600, 20)) {
    enviarConversacion($id);
}
http_response_code(204);
