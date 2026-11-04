import { useEffect, useRef, useState } from 'react';
import retrato from '../../assets/clon-avatar-3d.webp';

// Ronald en 3D: mientras carga (o sin WebGL, o con movimiento reducido) se ve su retrato fijo;
// después, el modelo en tiempo real que mira al ratón, parpadea y habla mientras piensa.
// respuesta: la última del clon ({ texto, gesto }); el gesto lo elige la IA según lo que dice.
// escuchando: el visitante está escribiendo.
// conVoz / habla: con la voz activada, la boca no se mueve sola; sigue al audio ({ audio, tiempos, inicios }) cuando
// llega, y las marcas del cuerpo que eligió la IA (respuesta.marcas) se disparan con él. Si la voz llega por trozos,
// cada trozo trae sus marcas (habla.marcas) y solo el último (habla.ultimo) devuelve la cara a neutral.
export default function AvatarClon({
  tamano = 40, pensando = false, respuesta = null, escuchando = false, conVoz = false, habla = null,
  encuadre = 'busto', libre = false, alMontar, className = '',
}) {
  const lienzo = useRef(null);
  const escena = useRef(null);
  const [listo, setListo] = useState(false);
  const alMontarRef = useRef(alMontar);
  useEffect(() => { alMontarRef.current = alMontar; });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let cancelado = false;
    import('./escena3d')
      .then(({ montarAvatar }) => montarAvatar(lienzo.current, { encuadre, libre, alListo: () => !cancelado && setListo(true) }))
      .then((e) => {
        if (cancelado) e.destruir();
        else { escena.current = e; alMontarRef.current?.(e); }
      })
      .catch(() => { /* sin WebGL: se queda el retrato */ });
    return () => {
      cancelado = true;
      escena.current?.destruir();
      escena.current = null;
    };
  }, [encuadre, libre]);

  // Mientras piensa, mira de lado; cuando llega la respuesta, «la cuenta» (más rato cuanto más larga),
  // sonríe y hace el gesto que eligió la IA
  const pensabaAntes = useRef(false);
  const esperaVoz = useRef(0);
  const respuestaRef = useRef(respuesta);
  respuestaRef.current = respuesta;
  useEffect(() => {
    const e = escena.current;
    if (!e) return undefined;
    e.pensar(pensando);
    let fin = 0;
    if (pensabaAntes.current && !pensando) {
      const { texto = '', gesto = null, marcas = [] } = respuestaRef.current || {};
      // La IA mueve el cuerpo con sus marcas; si no empieza marcando la cara, una sonrisa suave
      if (!(marcas[0]?.tipo === 'cara' && marcas[0].pos === 0)) e.expresion('sonrisa', 0.6);
      if (gesto && !marcas.length) e.movimiento(gesto);
      if (conVozRef.current) {
        // Con voz, las marcas esperan al audio; si no llega (sin créditos, error), van al ritmo de lectura
        if (marcas.length) fin = setTimeout(() => e.marcas(marcas), 4000);
        esperaVoz.current = fin;
      } else {
        e.hablar(true);
        e.marcas(marcas);
        const duracion = Math.min(9000, Math.max(2600, texto.length * 45));
        fin = setTimeout(() => { e.hablar(false); e.expresion('neutral'); }, duracion);
      }
    }
    pensabaAntes.current = pensando;
    return () => clearTimeout(fin);
  }, [pensando, listo]);

  useEffect(() => { escena.current?.escuchar(escuchando); }, [escuchando, listo]);

  const conVozRef = useRef(conVoz);
  conVozRef.current = conVoz;
  // La voz real: la boca sigue al audio mientras suena
  useEffect(() => {
    const e = escena.current;
    if (!e || !habla) return undefined;
    clearTimeout(esperaVoz.current);
    e.hablarCon(habla.audio, habla.tiempos);
    e.marcas(habla.marcas ?? respuestaRef.current?.marcas, { audio: habla.audio, inicios: habla.inicios });
    const acabar = () => { if (habla.ultimo !== false) e.expresion('neutral'); };
    habla.audio.addEventListener('ended', acabar, { once: true });
    return () => { habla.audio.removeEventListener('ended', acabar); e.hablar(false); };
  }, [habla, listo]);

  return (
    <span className={`av${listo ? ' av-listo' : ''} ${className}`} style={{ width: tamano, height: tamano }} aria-hidden="true">
      <img src={retrato} alt="" />
      <canvas ref={lienzo} />
    </span>
  );
}
