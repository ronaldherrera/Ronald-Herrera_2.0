<?php
// Piezas comunes de la voz del clon (chat.php firma el texto que se puede decir; voz.php lo convierte en audio).

// La voz está activa si en config-chat.php están la clave de ElevenLabs y el Voice ID
function vozDisponible($config): bool {
    return is_array($config) && !empty($config['elevenlabs_clave']) && !empty($config['elevenlabs_voz']) && !empty($config['clave']);
}

// Firma del texto con una clave del servidor: voz.php solo dice lo que chat.php respondió de verdad
function firmaVoz(array $config, string $texto): string {
    return hash_hmac('sha256', $texto, 'voz-clon|' . $config['clave'] . '|' . $config['elevenlabs_clave']);
}

// Lo que se lee en voz alta: los enlaces se quedan en su texto y las URL y los correos no se deletrean
function textoParaVoz(string $texto): string {
    return trim(textoParaVozTrozo($texto));
}

// Lo mismo para un trozo de la respuesta, sin recortar los extremos (cuerpo.php pega los trozos entre marcas)
function textoParaVozTrozo(string $texto): string {
    $texto = preg_replace('/\[([^\]]+)\]\([^)]+\)/u', '$1', $texto);
    $texto = preg_replace('#https?://\S+#u', 'el enlace', $texto);
    $texto = preg_replace('/[\w.+-]+@[\w-]+(\.[\w-]+)+/u', 'mi correo', $texto);
    // Los teléfonos tampoco se recitan: quedan escritos en el chat
    $texto = preg_replace('/\b(?:al|el) (?=\+?\d[\d ]{7,}\d)/u', 'a ', $texto);
    $texto = preg_replace('/\+?\d[\d ]{7,}\d/u', 'mi teléfono', $texto);
    $texto = preg_replace('/[*_#`>]+/u', '', $texto);
    // Siglas que la voz deletrearía, dichas enteras (el texto escrito no cambia)
    $texto = preg_replace('/\bCVs?\b/u', 'currículum', $texto);
    $texto = preg_replace('/\bIAs\b/u', 'inteligencias artificiales', $texto);
    $texto = preg_replace('/\bIA\b/u', 'inteligencia artificial', $texto);
    return preg_replace('/[ \t]+/u', ' ', $texto);
}

// Caracteres de voz gastados este mes (archivo fuera de public_html). false si se pasaría del tope
function gastarCaracteresVoz(array $config, int $caracteres): bool {
    return cambiarUsoVoz($config, $caracteres, true);
}

function devolverCaracteresVoz(array $config, int $caracteres): void {
    cambiarUsoVoz($config, -$caracteres, false);
}

function cambiarUsoVoz(array $config, int $cambio, bool $comprobar): bool {
    $tope = (int)($config['voz_caracteres_mes'] ?? 15000);
    $mes = date('Y-m');
    $archivo = dirname(__DIR__, 2) . '/voz-uso.json';
    $f = @fopen($archivo, 'c+');
    if (!$f) return !$comprobar;
    flock($f, LOCK_EX);
    $uso = json_decode((string)stream_get_contents($f), true);
    if (!is_array($uso) || ($uso['mes'] ?? '') !== $mes) $uso = ['mes' => $mes, 'caracteres' => 0];
    $ok = !$comprobar || $uso['caracteres'] + $cambio <= $tope;
    if ($ok) {
        $uso['caracteres'] = max(0, $uso['caracteres'] + $cambio);
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, json_encode($uso));
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $ok;
}

// Corta lo hablado tras la primera frase (si queda bastante detrás), para generar y empezar a decir esa frase mientras
// se genera el resto: [frase, resto, carácter donde empieza el resto]. Igual que partirVoz() del panel del clon
function partirVoz(string $hablado): array {
    $letras = mb_str_split($hablado);
    $n = count($letras);
    for ($i = 25; $i < $n - 20; $i++) {
        if (str_contains('.!?', $letras[$i]) && $letras[$i + 1] === ' ') {
            return [implode('', array_slice($letras, 0, $i + 1)), implode('', array_slice($letras, $i + 2)), $i + 2];
        }
    }
    return [$hablado, '', 0];
}
