<?php
// Piezas comunes del chat con la versión IA de Ronald (chat.php y chat-fin.php).
// Las conversaciones se guardan FUERA de public_html, en chat-conversaciones/, y se envían enteras a Ronald
// por correo: al cerrar el chat (chat-fin.php) o, si el navegador no avisa, cuando llevan un rato paradas.
// Se borran a los 30 días (lo explica /privacidad).

const CARPETA_CONVERSACIONES = __DIR__ . '/../../chat-conversaciones';
const MINUTOS_PARADA = 20;
const DIAS_CONSERVAR = 30;

function registrar(string $texto): void {
    @file_put_contents(dirname(__DIR__, 2) . '/chat-errores.log', date('Y-m-d H:i:s') . ' ' . $texto . "\n", FILE_APPEND);
}

// Ventana deslizante sencilla en un archivo temporal: true si aún no se ha llegado al límite
function contador(string $clave, int $ventana, int $limite): bool {
    $archivo = sys_get_temp_dir() . '/ronaldherrera-chat-' . md5($clave);
    $ahora = time();
    $marcas = is_file($archivo) ? array_filter(array_map('intval', explode(',', (string)file_get_contents($archivo))), fn($t) => $t > $ahora - $ventana) : [];
    if (count($marcas) >= $limite) return false;
    $marcas[] = $ahora;
    @file_put_contents($archivo, implode(',', $marcas), LOCK_EX);
    return true;
}

// El navegador genera el id (crypto.randomUUID); aquí solo se acepta ese formato
function idConversacion($id): ?string {
    return is_string($id) && preg_match('/^[a-f0-9-]{36}$/', $id) ? $id : null;
}

function rutaConversacion(string $id): string {
    return CARPETA_CONVERSACIONES . '/' . $id . '.json';
}

function leerConversacion(string $id): ?array {
    $ruta = rutaConversacion($id);
    if (!is_file($ruta)) return null;
    $datos = json_decode((string)file_get_contents($ruta), true);
    return is_array($datos) ? $datos : null;
}

function escribirConversacion(string $id, array $datos): void {
    if (!is_dir(CARPETA_CONVERSACIONES)) @mkdir(CARPETA_CONVERSACIONES, 0700, true);
    @file_put_contents(rutaConversacion($id), json_encode($datos, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// Guarda la conversación tal y como la ha procesado el servidor, más la respuesta que se acaba de dar
function guardarConversacion(string $id, array $mensajes, string $respuesta, string $pagina): void {
    $previa = leerConversacion($id) ?? ['inicio' => time(), 'enviados' => 0, 'contacto' => null, 'paginas' => []];
    $lista = [];
    foreach ($mensajes as $m) {
        if (is_string($m['content'])) $lista[] = ['rol' => $m['role'], 'texto' => $m['content']];
    }
    $lista[] = ['rol' => 'assistant', 'texto' => $respuesta];
    if ($pagina !== '' && !in_array($pagina, $previa['paginas'], true)) $previa['paginas'][] = $pagina;
    escribirConversacion($id, array_merge($previa, ['ultima' => time(), 'mensajes' => $lista]));
}

function marcarContacto(string $id, array $filas): void {
    $datos = leerConversacion($id);
    if ($datos) escribirConversacion($id, array_merge($datos, ['contacto' => $filas]));
}

// Envía un correo a Ronald con una tabla de datos y la conversación. Devuelve true si salió
function enviarCorreo(string $asunto, string $titulo, array $filas, array $mensajes, ?string $responderA = null, string $nombre = ''): bool {
    $correo = null;
    foreach ([dirname(__DIR__, 2) . '/config-correo.php', __DIR__ . '/config-correo.php'] as $ruta) {
        if (is_file($ruta)) { $correo = require $ruta; break; }
    }
    if (!is_array($correo) || empty($correo['clave'])) {
        registrar('Correo sin configurar: ' . $asunto);
        return false;
    }
    require_once __DIR__ . '/phpmailer/src/Exception.php';
    require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/phpmailer/src/SMTP.php';

    $h = fn(string $t): string => htmlspecialchars($t, ENT_QUOTES, 'UTF-8');
    $tabla = '';
    foreach ($filas as $k => $v) {
        $tabla .= "<tr><td style='padding:8px 12px;color:#8a8470;vertical-align:top;white-space:nowrap'>{$h($k)}</td><td style='padding:8px 12px;color:#1a1a1a'>" . nl2br($h((string)$v)) . "</td></tr>";
    }
    $conversacion = '';
    $texto = '';
    foreach ($mensajes as $m) {
        $contenido = $m['texto'] ?? ($m['content'] ?? null);
        if (!is_string($contenido)) continue;
        $quien = in_array($m['rol'] ?? $m['role'] ?? '', ['user'], true) ? 'Visitante' : 'Tu IA';
        $color = $quien === 'Visitante' ? '#1a1a1a' : '#8a6d22';
        $conversacion .= "<p style='margin:0 0 10px'><b style='color:$color'>$quien:</b> " . nl2br($h($contenido)) . '</p>';
        $texto .= "$quien: $contenido\n\n";
    }
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $correo['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $correo['usuario'];
        $mail->Password = $correo['clave'];
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = (int)($correo['puerto'] ?? 465);
        $mail->CharSet = 'UTF-8';
        $mail->isHTML(true);
        $mail->setFrom($correo['usuario'], 'Tu IA en ronaldherrera.es');
        foreach ($correo['destinatarios'] as $d) $mail->addAddress($d);
        if ($responderA) $mail->addReplyTo($responderA, $nombre ?: $responderA);
        $mail->Subject = $asunto;
        $mail->Body = "<div style='font-family:Arial,sans-serif;font-size:15px'>"
            . "<h2 style='color:#101010;margin:0 0 12px'>{$h($titulo)}</h2>"
            . ($tabla ? "<table style='border-collapse:collapse;background:#f4f1e4;border-top:3px solid #ed8e6a'>$tabla</table>" : '')
            . "<h3 style='margin:20px 0 10px'>Conversación</h3>$conversacion</div>";
        $mail->AltBody = implode("\n", array_map(fn($k, $v) => "$k: $v", array_keys($filas), $filas)) . "\n\n" . $texto;
        $mail->send();
        return true;
    } catch (Throwable $e) {
        registrar('Correo sin enviar (' . $asunto . '): ' . $e->getMessage());
        return false;
    }
}

// Manda a Ronald la conversación completa si tiene mensajes que aún no le han llegado
function enviarConversacion(string $id): void {
    $datos = leerConversacion($id);
    if (!$datos || empty($datos['mensajes'])) return;
    $total = count($datos['mensajes']);
    if ($total <= (int)($datos['enviados'] ?? 0)) return;

    $preguntas = count(array_filter($datos['mensajes'], fn($m) => $m['rol'] === 'user'));
    $primera = '';
    foreach ($datos['mensajes'] as $m) {
        if ($m['rol'] === 'user') { $primera = mb_substr($m['texto'], 0, 60); break; }
    }
    $continuacion = (int)($datos['enviados'] ?? 0) > 0;
    $filas = [
        'Empezó' => date('d/m/Y H:i', (int)$datos['inicio']),
        'Último mensaje' => date('d/m/Y H:i', (int)$datos['ultima']),
        'Preguntas' => $preguntas,
        'Páginas' => implode(', ', $datos['paginas'] ?? []) ?: '—',
        'Pidió contacto' => $datos['contacto'] ? 'Sí: ' . ($datos['contacto']['Contacto'] ?? '') : 'No',
    ];
    $asunto = ($continuacion ? 'Conversación (continuación): ' : 'Conversación con tu IA: ') . '«' . $primera . (mb_strlen($primera) >= 60 ? '…' : '') . '»';
    if (enviarCorreo($asunto, 'Conversación con tu versión IA', $filas, $datos['mensajes'])) {
        escribirConversacion($id, array_merge($datos, ['enviados' => $total]));
    }
}

// Envía las conversaciones paradas que no han llegado a Ronald y borra las antiguas
function enviarConversacionesParadas(): void {
    if (!is_dir(CARPETA_CONVERSACIONES)) return;
    $ahora = time();
    $enviadas = 0;
    foreach (glob(CARPETA_CONVERSACIONES . '/*.json') ?: [] as $ruta) {
        $id = basename($ruta, '.json');
        $datos = leerConversacion($id);
        if (!$datos) continue;
        if ((int)$datos['ultima'] < $ahora - DIAS_CONSERVAR * 86400) { @unlink($ruta); continue; }
        if ($enviadas < 3 && (int)$datos['ultima'] < $ahora - MINUTOS_PARADA * 60 && count($datos['mensajes']) > (int)($datos['enviados'] ?? 0)) {
            enviarConversacion($id);
            $enviadas++;
        }
    }
}
