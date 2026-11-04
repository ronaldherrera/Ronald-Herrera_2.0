<?php
// Lo que el clon ha ido aprendiendo desde el panel (/avatar-admin): datos que Ronald le cuenta o responde en la
// entrevista, y lecciones sacadas de las conversaciones. Solo entra lo que Ronald aprueba.
// Se guarda FUERA de public_html, en clon-aprendido.json. chat.php lo añade a lo que sabe el clon.

const ARCHIVO_APRENDIDO = __DIR__ . '/../../clon-aprendido.json';
const MAX_DATOS = 300;
const MAX_TEXTO = 2000;

function leerAprendido(): array {
    $vacio = ['datos' => [], 'propuestas' => [], 'preguntas' => [], 'analizadoHasta' => 0];
    if (!is_file(ARCHIVO_APRENDIDO)) return $vacio;
    $datos = json_decode((string)file_get_contents(ARCHIVO_APRENDIDO), true);
    return is_array($datos) ? array_merge($vacio, $datos) : $vacio;
}

function guardarAprendido(array $datos): void {
    @file_put_contents(ARCHIVO_APRENDIDO, json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function nuevoId(): string {
    return bin2hex(random_bytes(8));
}

// Lo aprendido, listo para añadir al conocimiento del clon
function textoAprendido(?array $aprendido = null): string {
    $aprendido ??= leerAprendido();
    $datos = array_filter($aprendido['datos'], fn($d) => ($d['tipo'] ?? '') === 'dato');
    $lecciones = array_filter($aprendido['datos'], fn($d) => ($d['tipo'] ?? '') === 'leccion');
    $texto = '';
    if ($datos) {
        $texto .= "\n\n## Más cosas sobre mí (me las ha contado Ronald; si algo choca con lo de arriba, vale esto, que es más reciente)\n";
        foreach ($datos as $d) $texto .= '- ' . str_replace("\n", ' ', $d['texto']) . "\n";
    }
    if ($lecciones) {
        $texto .= "\n## Criterios que he aprendido para responder mejor (ideas que aplico con mis palabras, no frases para repetir)\n";
        foreach ($lecciones as $d) $texto .= '- ' . str_replace("\n", ' ', $d['texto']) . "\n";
    }
    return $texto;
}

// Respuestas del clon que indican que no sabía algo (para el listado del panel)
function respuestasSinDato(array $mensajes): int {
    $n = 0;
    foreach ($mensajes as $m) {
        if (($m['rol'] ?? '') === 'assistant' && preg_match('/no lo tengo aquí|no tengo (ese|eso|ese dato)|(contártelo|te lo cuento|lo hablo|hablarlo|lo hablamos)( yo)? en persona|eso no lo sé/iu', (string)($m['texto'] ?? ''))) $n++;
    }
    return $n;
}

// Lo que el clon sabe de base, por temas, para verlo en el panel (solo lectura): el conocimiento (secciones «## »)
// y su personalidad y forma de responder (las listas de instrucciones-clon.md, sin la parte técnica del cuerpo)
function baseClon(): array {
    $temas = function (string $texto, callable $titulo): array {
        $lista = [];
        $actual = null;
        // Cada título abre un tema con los puntos de lista que le siguen; cualquier otro párrafo lo cierra
        foreach (preg_split('/\R/', $texto) as $linea) {
            $linea = trim($linea);
            if ($linea === '') continue;
            if (str_starts_with($linea, '- ')) {
                if ($actual !== null) $lista[$actual]['puntos'][] = substr($linea, 2);
                continue;
            }
            $t = $titulo($linea);
            $actual = $t === null ? null : count($lista);
            if ($t !== null) $lista[] = ['titulo' => $t, 'puntos' => []];
        }
        return array_values(array_filter($lista, fn($s) => $s['puntos']));
    };
    $conocimiento = $temas((string)@file_get_contents(__DIR__ . '/conocimiento-clon.md'), fn($l) => str_starts_with($l, '## ') ? substr($l, 3) : null);
    $NOMBRES = ['Tu personaje' => 'Su personalidad', 'Preguntas típicas' => 'Preguntas típicas', 'Cómo respondes' => 'Cómo responde'];
    $forma = $temas((string)@file_get_contents(__DIR__ . '/instrucciones-clon.md'), function ($l) use ($NOMBRES) {
        foreach ($NOMBRES as $inicio => $nombre) if (str_starts_with($l, $inicio) && str_ends_with($l, ':')) return $nombre;
        return null;
    });
    return ['conocimiento' => $conocimiento, 'forma' => $forma];
}
