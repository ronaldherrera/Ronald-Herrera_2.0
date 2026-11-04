<?php
// Panel del clon (/avatar-admin): conversaciones de los visitantes, enseñarle cosas, que te entreviste y lo que
// propone aprender de las conversaciones. Solo para Ronald: contraseña cifrada en config-chat.php
// ('admin_clave_hash', ver docs/ADMIN-CLON.md), cookie firmada y límite de intentos.
// Todo va por POST con JSON: { accion, ... }.

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

require __DIR__ . '/_lib/conversaciones.php';
require __DIR__ . '/_lib/aprendido.php';

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Solo peticiones del propio panel: POST con JSON y una cabecera propia (otra web no puede mandarla sin permiso)
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['HTTP_X_PANEL_CLON'] ?? '') !== '1') responder(405, ['ok' => false]);

$config = null;
foreach ([dirname(__DIR__) . '/config-chat.php', __DIR__ . '/_lib/config-chat.php'] as $ruta) {
    if (is_file($ruta)) { $config = require $ruta; break; }
}
$hash = is_array($config) ? (string)($config['admin_clave_hash'] ?? '') : '';
if ($hash === '') responder(503, ['ok' => false, 'error' => 'Falta configurar la contraseña del panel (docs/ADMIN-CLON.md)']);

$entrada = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($entrada)) responder(400, ['ok' => false, 'error' => 'Petición no válida']);
$accion = (string)($entrada['accion'] ?? '');

// --- Sesión: cookie firmada con la propia contraseña cifrada (al cambiarla, se cierran todas las sesiones) ---
const COOKIE_PANEL = 'rh_panel_clon';
const DIAS_SESION = 14;
function firmaSesion(string $hash, int $caduca): string {
    return hash_hmac('sha256', 'panel-clon|' . $caduca, $hash);
}
function sesionValida(string $hash): bool {
    $valor = (string)($_COOKIE[COOKIE_PANEL] ?? '');
    if (!preg_match('/^(\d+)\.([a-f0-9]{64})$/', $valor, $m)) return false;
    return (int)$m[1] > time() && hash_equals(firmaSesion($hash, (int)$m[1]), $m[2]);
}
function ponerCookie(string $valor, int $caduca): void {
    setcookie(COOKIE_PANEL, $valor, ['expires' => $caduca, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
}

if ($accion === 'entrar') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
    // 5 intentos por IP cada 15 minutos y 20 en total por hora
    if (!contador('panel-ip-' . $ip, 900, 5) || !contador('panel-total', 3600, 20)) {
        responder(429, ['ok' => false, 'error' => 'Demasiados intentos. Prueba dentro de un rato.']);
    }
    if (!password_verify((string)($entrada['clave'] ?? ''), $hash)) {
        registrar('Panel del clon: contraseña incorrecta desde ' . $ip);
        responder(401, ['ok' => false, 'error' => 'Contraseña incorrecta']);
    }
    $caduca = time() + DIAS_SESION * 86400;
    ponerCookie($caduca . '.' . firmaSesion($hash, $caduca), $caduca);
    responder(200, ['ok' => true, 'dentro' => true]);
}
if ($accion === 'salir') {
    ponerCookie('', time() - 3600);
    responder(200, ['ok' => true, 'dentro' => false]);
}
if (!sesionValida($hash)) responder($accion === 'sesion' ? 200 : 401, ['ok' => $accion === 'sesion', 'dentro' => false]);
if ($accion === 'sesion') responder(200, ['ok' => true, 'dentro' => true]);

// --- A partir de aquí, Ronald dentro ------------------------------------------------------------------------
$limpiar = fn($t, int $n = MAX_TEXTO): string => trim(mb_substr(strip_tags((string)$t), 0, $n));
$aprendido = leerAprendido();

// Lo que el clon sabe ahora (conocimiento base + lo aprendido), para las tareas con Claude
function conocimientoActual(array $aprendido): string {
    return (string)@file_get_contents(__DIR__ . '/_lib/conocimiento-clon.md') . textoAprendido($aprendido);
}

// Llama a Claude con una de las tareas de _lib/aprender-clon.json y devuelve el JSON que responde
function tareaClaude(array $config, string $tarea, string $contexto, string $pedido): array {
    $tareas = json_decode((string)file_get_contents(__DIR__ . '/_lib/aprender-clon.json'), true);
    require_once __DIR__ . '/_lib/vendor/autoload.php';
    putenv('ANTHROPIC_API_KEY=' . $config['clave']);
    $_ENV['ANTHROPIC_API_KEY'] = $config['clave'];
    $_SERVER['ANTHROPIC_API_KEY'] = $config['clave'];
    $cliente = new \Anthropic\Client();
    $respuesta = $cliente->messages->create(
        model: $config['modelo_admin'] ?? 'claude-sonnet-5-5',
        maxTokens: 4000,
        system: [
            ['type' => 'text', 'text' => $tareas['comun'] . "\n\n" . $tareas[$tarea]],
            ['type' => 'text', 'text' => "Lo que el clon sabe ahora:\n\n" . $contexto],
        ],
        messages: [['role' => 'user', 'content' => $pedido]],
    );
    $texto = '';
    foreach ($respuesta->content as $bloque) {
        if ($bloque->type === 'text') $texto .= $bloque->text;
    }
    $inicio = strpos($texto, '{');
    $fin = strrpos($texto, '}');
    $json = $inicio !== false && $fin !== false ? json_decode(substr($texto, $inicio, $fin - $inicio + 1), true) : null;
    if (!is_array($json)) throw new RuntimeException('Claude no devolvió JSON');
    return $json;
}

function conversacionesGuardadas(): array {
    $lista = [];
    foreach (glob(CARPETA_CONVERSACIONES . '/*.json') ?: [] as $ruta) {
        $datos = json_decode((string)file_get_contents($ruta), true);
        if (is_array($datos)) $lista[basename($ruta, '.json')] = $datos;
    }
    uasort($lista, fn($a, $b) => ($b['ultima'] ?? 0) <=> ($a['ultima'] ?? 0));
    return $lista;
}

try {
    switch ($accion) {
        case 'conversaciones':
            $resumen = [];
            foreach (conversacionesGuardadas() as $id => $c) {
                $mensajes = $c['mensajes'] ?? [];
                $primera = '';
                foreach ($mensajes as $m) if (($m['rol'] ?? '') === 'user') { $primera = mb_substr((string)$m['texto'], 0, 140); break; }
                $resumen[] = [
                    'id' => $id, 'inicio' => $c['inicio'] ?? 0, 'ultima' => $c['ultima'] ?? 0, 'mensajes' => count($mensajes),
                    'primera' => $primera, 'contacto' => !empty($c['contacto']), 'contactoDado' => !empty($c['contactoDado']), 'sinDato' => respuestasSinDato($mensajes),
                    'paginas' => $c['paginas'] ?? [],
                ];
            }
            responder(200, ['ok' => true, 'conversaciones' => $resumen, 'analizadoHasta' => $aprendido['analizadoHasta']]);

        case 'conversacion':
            $id = idConversacion($entrada['id'] ?? '');
            $c = $id ? leerConversacion($id) : null;
            if (!$c) responder(404, ['ok' => false, 'error' => 'No existe']);
            responder(200, ['ok' => true, 'conversacion' => $c]);

        case 'borrar-conversacion':
            $id = idConversacion($entrada['id'] ?? '');
            if ($id) @unlink(rutaConversacion($id));
            responder(200, ['ok' => true]);

        case 'aprendido':
            responder(200, ['ok' => true, 'aprendido' => $aprendido]);

        case 'base':
            responder(200, ['ok' => true, 'base' => baseClon()]);

        case 'guardar-dato':
            $texto = $limpiar($entrada['texto'] ?? '');
            $tipo = ($entrada['tipo'] ?? '') === 'leccion' ? 'leccion' : 'dato';
            $origen = in_array($entrada['origen'] ?? '', ['manual', 'entrevista', 'conversaciones'], true) ? $entrada['origen'] : 'manual';
            if ($texto === '') responder(400, ['ok' => false, 'error' => 'Texto vacío']);
            if (count($aprendido['datos']) >= MAX_DATOS) responder(400, ['ok' => false, 'error' => 'Ya hay demasiados datos: borra o junta alguno']);
            $id = $limpiar($entrada['id'] ?? '', 32);
            $existente = array_search($id, array_column($aprendido['datos'], 'id'), true);
            if ($id !== '' && $existente !== false) {
                $aprendido['datos'][$existente]['texto'] = $texto;
            } else {
                $aprendido['datos'][] = ['id' => nuevoId(), 'tipo' => $tipo, 'texto' => $texto, 'origen' => $origen, 'fecha' => time()];
            }
            // Si venía de una pregunta de la entrevista, queda respondida
            $pregunta = $limpiar($entrada['pregunta'] ?? '', 32);
            foreach ($aprendido['preguntas'] as &$p) if ($p['id'] === $pregunta) $p['estado'] = 'respondida';
            unset($p);
            guardarAprendido($aprendido);
            responder(200, ['ok' => true, 'aprendido' => $aprendido]);

        case 'borrar-dato':
            $id = $limpiar($entrada['id'] ?? '', 32);
            $aprendido['datos'] = array_values(array_filter($aprendido['datos'], fn($d) => $d['id'] !== $id));
            guardarAprendido($aprendido);
            responder(200, ['ok' => true, 'aprendido' => $aprendido]);

        case 'pregunta':
            // Primero las que salieron de las conversaciones (aceptadas por Ronald); si no hay, una nueva
            foreach ($aprendido['preguntas'] as $p) {
                if ($p['estado'] === 'pendiente') responder(200, ['ok' => true, 'pregunta' => $p]);
            }
            $hechas = array_slice(array_column($aprendido['preguntas'], 'texto'), -60);
            $pedido = "Preguntas que ya le he hecho:\n" . ($hechas ? '- ' . implode("\n- ", $hechas) : '(ninguna)');
            $json = tareaClaude($config, 'pregunta', conocimientoActual($aprendido), $pedido);
            $p = ['id' => nuevoId(), 'texto' => $limpiar($json['pregunta'] ?? '', 400), 'motivo' => $limpiar($json['motivo'] ?? '', 300), 'fecha' => time(), 'estado' => 'pendiente'];
            if ($p['texto'] === '') throw new RuntimeException('Pregunta vacía');
            $aprendido['preguntas'][] = $p;
            guardarAprendido($aprendido);
            responder(200, ['ok' => true, 'pregunta' => $p]);

        case 'saltar-pregunta':
            $id = $limpiar($entrada['id'] ?? '', 32);
            foreach ($aprendido['preguntas'] as &$p) if ($p['id'] === $id) $p['estado'] = 'saltada';
            unset($p);
            guardarAprendido($aprendido);
            responder(200, ['ok' => true]);

        case 'convertir-respuesta':
            // Propone cómo guardar la respuesta (Ronald la revisa antes de guardarla)
            $pregunta = $limpiar($entrada['pregunta'] ?? '', 400);
            $respuesta = $limpiar($entrada['respuesta'] ?? '');
            if ($respuesta === '') responder(400, ['ok' => false, 'error' => 'Respuesta vacía']);
            $json = tareaClaude($config, 'dato', conocimientoActual($aprendido), "Pregunta: $pregunta\n\nRespuesta de Ronald: $respuesta");
            responder(200, ['ok' => true, 'texto' => $limpiar($json['texto'] ?? '')]);

        case 'revisar-dato':
            // Antes de guardar lo que Ronald le enseña: si le falta contexto, pregunta (Ronald revisa el resultado)
            $tipo = ($entrada['tipo'] ?? '') === 'leccion' ? 'leccion' : 'dato';
            $charla = '';
            foreach (array_slice((array)($entrada['charla'] ?? []), 0, 6) as $m) {
                $charla .= ((($m['rol'] ?? '') === 'clon') ? 'CLON' : 'RONALD') . ': ' . $limpiar($m['texto'] ?? '') . "\n";
            }
            if (trim($charla) === '') responder(400, ['ok' => false, 'error' => 'Texto vacío']);
            $json = tareaClaude($config, 'revisar', conocimientoActual($aprendido), "Tipo: $tipo\n\n$charla");
            responder(200, ['ok' => true, 'pregunta' => $limpiar($json['pregunta'] ?? '', 400), 'texto' => $limpiar($json['texto'] ?? '')]);

        case 'analizar':
            // Conversaciones nuevas desde el último análisis (las más recientes, recortadas)
            $nuevas = array_filter(conversacionesGuardadas(), fn($c) => ($c['ultima'] ?? 0) > $aprendido['analizadoHasta']);
            if (!$nuevas) responder(200, ['ok' => true, 'nuevas' => 0, 'aprendido' => $aprendido]);
            $texto = '';
            foreach (array_slice($nuevas, 0, 40) as $c) {
                $trozo = '';
                foreach ($c['mensajes'] ?? [] as $m) $trozo .= (($m['rol'] ?? '') === 'assistant' ? 'CLON' : 'VISITANTE') . ': ' . $m['texto'] . "\n";
                $texto .= "<conversacion>\n" . mb_substr($trozo, 0, 4000) . "</conversacion>\n";
            }
            $json = tareaClaude($config, 'analizar', conocimientoActual($aprendido), $texto);
            foreach (array_slice((array)($json['propuestas'] ?? []), 0, 8) as $pr) {
                $tipo = ($pr['tipo'] ?? '') === 'leccion' ? 'leccion' : 'dato-que-falta';
                $t = $limpiar($pr['texto'] ?? '', 600);
                if ($t !== '') $aprendido['propuestas'][] = ['id' => nuevoId(), 'tipo' => $tipo, 'texto' => $t, 'motivo' => $limpiar($pr['motivo'] ?? '', 400), 'fecha' => time()];
            }
            $aprendido['analizadoHasta'] = time();
            guardarAprendido($aprendido);
            responder(200, ['ok' => true, 'nuevas' => count($nuevas), 'aprendido' => $aprendido]);

        case 'aceptar-propuesta':
        case 'rechazar-propuesta':
            $id = $limpiar($entrada['id'] ?? '', 32);
            $pos = array_search($id, array_column($aprendido['propuestas'], 'id'), true);
            if ($pos === false) responder(404, ['ok' => false, 'error' => 'No existe']);
            $pr = $aprendido['propuestas'][$pos];
            array_splice($aprendido['propuestas'], $pos, 1);
            if ($accion === 'aceptar-propuesta') {
                $texto = $limpiar($entrada['texto'] ?? $pr['texto'], 600) ?: $pr['texto'];
                // Una lección entra ya en lo que sabe; un dato que falta se convierte en pregunta para la entrevista
                if ($pr['tipo'] === 'leccion') $aprendido['datos'][] = ['id' => nuevoId(), 'tipo' => 'leccion', 'texto' => $texto, 'origen' => 'conversaciones', 'fecha' => time()];
                else $aprendido['preguntas'][] = ['id' => nuevoId(), 'texto' => $texto, 'motivo' => $pr['motivo'] ?: 'Lo preguntaron visitantes', 'fecha' => time(), 'estado' => 'pendiente'];
            }
            guardarAprendido($aprendido);
            responder(200, ['ok' => true, 'aprendido' => $aprendido]);

        default:
            responder(400, ['ok' => false, 'error' => 'Acción desconocida']);
    }
} catch (Throwable $e) {
    registrar('Panel del clon (' . $accion . '): ' . $e->getMessage());
    responder(502, ['ok' => false, 'error' => 'No se pudo completar: ' . $e->getMessage()]);
}
