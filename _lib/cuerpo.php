<?php
// El cuerpo del clon: la IA mueve el avatar con marcas {tipo:valor} dentro de su respuesta, justo antes de las
// palabras que acompañan ({cara:sonrisa} Claro, te cuento… {gesto:asentir} Lo hice yo solo).
// Aquí se separan del texto: el visitante ve el texto limpio, la voz lee su versión hablada y cada marca guarda en
// qué carácter de los dos ocurre, para dispararla cuando la voz llega a ese punto.
// La misma lógica está en src/components/clon/marcas.js (chat de desarrollo): si cambias una, cambia la otra.

require_once __DIR__ . '/voz.php';

function vocabularioCuerpo(): array {
    static $v = null;
    $v ??= json_decode((string)@file_get_contents(__DIR__ . '/cuerpo-clon.json'), true) ?: [];
    return $v;
}

// Para las instrucciones: «cara: neutral, sonrisa…» por tipo
function listaCuerpo(string $tipo): string {
    $lista = vocabularioCuerpo()[$tipo] ?? [];
    return implode(', ', array_is_list($lista) ? $lista : array_keys($lista));
}

// Devuelve el valor que entiende el avatar, o null si la marca no es válida
function valorMarca(string $tipo, string $valor): ?string {
    $lista = vocabularioCuerpo()[$tipo] ?? null;
    if (!is_array($lista)) return null;
    if (array_is_list($lista)) return in_array($valor, $lista, true) ? $valor : null;
    return $lista[$valor] ?? null;
}

// ['texto' => lo que se ve, 'hablado' => lo que lee la voz, 'marcas' => [['tipo','valor','pos','posVoz'], …]]
function separarMarcas(string $texto): array {
    $trozos = preg_split('/\{(cara|gesto|cuerpo|accion|camara):([a-z0-9-]+)\}/u', $texto, -1, PREG_SPLIT_DELIM_CAPTURE);
    $limpio = '';
    $hablado = '';
    $marcas = [];
    // Pega un trozo sin dejar espacios dobles donde estaba la marca
    $pegar = function (string $base, string $trozo): string {
        if ($base === '') $trozo = ltrim($trozo);
        elseif (preg_match('/\s$/u', $base)) $trozo = preg_replace('/^[ \t]+/u', '', $trozo);
        return $base . $trozo;
    };
    for ($i = 0; $i < count($trozos); $i += 3) {
        $limpio = $pegar($limpio, $trozos[$i]);
        $hablado = $pegar($hablado, textoParaVozTrozo($trozos[$i]));
        if (!isset($trozos[$i + 1])) break;
        $valor = valorMarca($trozos[$i + 1], $trozos[$i + 2]);
        if ($valor !== null && count($marcas) < 8) {
            $marcas[] = ['tipo' => $trozos[$i + 1], 'valor' => $valor, 'pos' => mb_strlen($limpio), 'posVoz' => mb_strlen($hablado)];
        }
    }
    $limpio = rtrim($limpio);
    $hablado = rtrim($hablado);
    foreach ($marcas as &$m) {
        $m['pos'] = min($m['pos'], mb_strlen($limpio));
        $m['posVoz'] = min($m['posVoz'], mb_strlen($hablado));
    }
    return ['texto' => $limpio, 'hablado' => $hablado, 'marcas' => $marcas];
}
