<?php
// Ranking del juego «A producción» (página de Skills): top 10 por nivel de quienes despliegan
// las 17 habilidades en menos tiempo.
//
// El tiempo lo mide el servidor, no el navegador: «empezar» apunta la hora de inicio con un
// token de un solo uso, «terminar» apunta la hora de fin y «guardar» usa esa diferencia.
// Así nadie puede mandar un récord inventado a mano.
//
// Los datos viven fuera de public_html (carpeta ranking-skills/), así que desplegar la web
// no los borra. Para quitar una entrada, edita ranking-skills/ranking.json en el servidor.

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

const NIVELES = ['facil', 'normal', 'dificil'];
const PUESTOS = 10;
const TIEMPO_MINIMO = 12;      // segundos: por debajo no es una partida real
const CADUCIDAD = 2 * 3600;    // segundos que se guarda una partida empezada

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$carpeta = dirname(__DIR__) . '/ranking-skills';
if (!is_dir($carpeta) && !@mkdir($carpeta, 0750, true)) responder(500, ['ok' => false, 'error' => 'Ranking no disponible']);
$archivoRanking = $carpeta . '/ranking.json';
$archivoPartidas = $carpeta . '/partidas.json';

// Lee y escribe un JSON con bloqueo, para que dos partidas a la vez no se pisen
function conArchivo(string $ruta, callable $cambio) {
    $f = fopen($ruta, 'c+');
    if (!$f) responder(500, ['ok' => false, 'error' => 'Ranking no disponible']);
    flock($f, LOCK_EX);
    $datos = json_decode(stream_get_contents($f) ?: '', true);
    if (!is_array($datos)) $datos = [];
    [$nuevos, $resultado] = $cambio($datos);
    if ($nuevos !== null) {
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, json_encode($nuevos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $resultado;
}

function rankingPublico(array $ranking): array {
    $salida = [];
    foreach (NIVELES as $n) $salida[$n] = array_slice($ranking[$n] ?? [], 0, PUESTOS);
    return $salida;
}

// --- Consultar el ranking --------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $ranking = conArchivo($archivoRanking, fn($d) => [null, $d]);
    responder(200, ['ok' => true, 'ranking' => rankingPublico($ranking)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(405, ['ok' => false, 'error' => 'Método no permitido']);

$accion = (string)($_POST['accion'] ?? '');
$ahora = microtime(true);

// --- Empezar una partida ----------------------------------------------------------
if ($accion === 'empezar') {
    $nivel = (string)($_POST['nivel'] ?? '');
    if (!in_array($nivel, NIVELES, true)) responder(400, ['ok' => false, 'error' => 'Nivel no válido']);

    // Límite sencillo: 60 partidas por hora y dirección IP
    $ip = md5($_SERVER['REMOTE_ADDR'] ?? 'desconocida');
    $token = bin2hex(random_bytes(16));
    $permitido = conArchivo($archivoPartidas, function ($partidas) use ($token, $nivel, $ip, $ahora) {
        $partidas = array_filter($partidas, fn($p) => $p['inicio'] > $ahora - CADUCIDAD);
        $deEstaIp = count(array_filter($partidas, fn($p) => $p['ip'] === $ip && $p['inicio'] > $ahora - 3600));
        if ($deEstaIp >= 60) return [$partidas, false];
        $partidas[$token] = ['nivel' => $nivel, 'inicio' => $ahora, 'fin' => null, 'ip' => $ip];
        return [$partidas, true];
    });
    if (!$permitido) responder(429, ['ok' => false, 'error' => 'Demasiadas partidas. Inténtalo más tarde.']);
    responder(200, ['ok' => true, 'token' => $token]);
}

$token = preg_replace('/[^a-f0-9]/', '', (string)($_POST['token'] ?? ''));
if (strlen($token) !== 32) responder(400, ['ok' => false, 'error' => 'Partida no válida']);

// --- Terminar una partida ganada: el servidor apunta la hora de fin -------------------
if ($accion === 'terminar') {
    $tiempo = conArchivo($archivoPartidas, function ($partidas) use ($token, $ahora) {
        if (!isset($partidas[$token])) return [null, null];
        if ($partidas[$token]['fin'] === null) $partidas[$token]['fin'] = $ahora;
        return [$partidas, $partidas[$token]['fin'] - $partidas[$token]['inicio']];
    });
    if ($tiempo === null) responder(400, ['ok' => false, 'error' => 'Partida no válida']);
    if ($tiempo < TIEMPO_MINIMO) responder(400, ['ok' => false, 'error' => 'Partida no válida']);
    responder(200, ['ok' => true, 'tiempo' => round($tiempo, 2)]);
}

// --- Guardar un récord en el ranking --------------------------------------------------
if ($accion === 'guardar') {
    $nombre = trim(preg_replace('/\s+/u', ' ', strip_tags((string)($_POST['nombre'] ?? ''))) ?? '');
    $nombre = mb_substr($nombre, 0, 24);
    if ($nombre === '') responder(400, ['ok' => false, 'error' => 'Escribe tu nombre']);

    $linkedin = trim((string)($_POST['linkedin'] ?? ''));
    if ($linkedin !== '') {
        if (!preg_match('~^(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/in/([A-Za-z0-9\-_%]{3,100})/?(?:[?#].*)?$~i', $linkedin, $m)) {
            responder(400, ['ok' => false, 'error' => 'El enlace de LinkedIn no es válido']);
        }
        $linkedin = 'https://www.linkedin.com/in/' . $m[1];
    }

    // La partida se consume: un token solo sirve para un récord
    $partida = conArchivo($archivoPartidas, function ($partidas) use ($token) {
        $p = $partidas[$token] ?? null;
        if (!$p || $p['fin'] === null) return [null, null];
        unset($partidas[$token]);
        return [$partidas, $p];
    });
    if (!$partida) responder(400, ['ok' => false, 'error' => 'Partida no válida']);
    $tiempo = round($partida['fin'] - $partida['inicio'], 2);
    if ($tiempo < TIEMPO_MINIMO) responder(400, ['ok' => false, 'error' => 'Partida no válida']);
    $nivel = $partida['nivel'];

    [$posicion, $ranking] = conArchivo($archivoRanking, function ($ranking) use ($nivel, $nombre, $linkedin, $tiempo) {
        $lista = $ranking[$nivel] ?? [];
        $lista[] = ['nombre' => $nombre, 'linkedin' => $linkedin ?: null, 'tiempo' => $tiempo, 'fecha' => date('Y-m-d')];
        usort($lista, fn($a, $b) => $a['tiempo'] <=> $b['tiempo']);
        $lista = array_slice($lista, 0, PUESTOS);
        $posicion = null;
        foreach ($lista as $i => $fila) {
            if ($fila['nombre'] === $nombre && $fila['tiempo'] === $tiempo) { $posicion = $i + 1; break; }
        }
        $ranking[$nivel] = $lista;
        return [$ranking, [$posicion, $ranking]];
    });
    if ($posicion === null) responder(200, ['ok' => false, 'error' => 'No entra en el top 10', 'ranking' => rankingPublico($ranking)]);
    responder(200, ['ok' => true, 'posicion' => $posicion, 'nivel' => $nivel, 'tiempo' => $tiempo, 'ranking' => rankingPublico($ranking)]);
}

responder(400, ['ok' => false, 'error' => 'Acción no válida']);
