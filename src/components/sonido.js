// Música y efectos del juego «A producción», generados con Web Audio: sin archivos de audio.
// La música es un bucle de 4 compases en La menor (Am, F, C, G) con bajo, arpegio y batería;
// se programa con antelación (planificador de «lookahead») para que no se descuadre el ritmo.
const nota = (midi) => 440 * 2 ** ((midi - 69) / 12);

const ACORDES = [
  { bajo: 45, arpegio: [57, 60, 64, 69] }, // Am
  { bajo: 41, arpegio: [53, 57, 60, 65] }, // F
  { bajo: 48, arpegio: [60, 64, 67, 72] }, // C
  { bajo: 43, arpegio: [55, 59, 62, 67] }, // G
];
const BAJO = [0, 0, 12, 0, 0, 7, 12, 7]; // corcheas, en semitonos sobre la raíz
const ARPEGIO = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 2, 1];
const TEMPO = { facil: 100, normal: 116, dificil: 134 };

export function crearSonido() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const general = ctx.createGain();
  general.gain.value = 1;
  general.connect(ctx.destination);
  const musica = ctx.createGain();
  musica.gain.value = 0.11;
  musica.connect(general);
  const efectos = ctx.createGain();
  efectos.gain.value = 0.32;
  efectos.connect(general);

  // Ruido blanco para la batería y los impactos
  const ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const datos = ruido.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;

  const tono = (destino, { tipo = 'square', desde, hasta = desde, t = ctx.currentTime, dur = 0.1, vol = 0.3, ataque = 0.005 }) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(desde, t);
    if (hasta !== desde) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  const golpeRuido = (destino, { t = ctx.currentTime, dur = 0.1, vol = 0.3, filtro = 'highpass', frecuencia = 6000 }) => {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.value = frecuencia;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(destino);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  };

  // --- Música ------------------------------------------------------------------------
  let planificador = null;
  let semicorchea = 0;
  let siguiente = 0;
  let duracion = 0.13;

  const programar = (paso, t) => {
    const compas = Math.floor(paso / 16) % ACORDES.length;
    const dentro = paso % 16;
    const acorde = ACORDES[compas];
    if (dentro % 2 === 0) {
      tono(musica, { tipo: 'triangle', desde: nota(acorde.bajo + BAJO[dentro / 2]), t, dur: duracion * 1.8, vol: 0.55 });
    }
    tono(musica, { tipo: 'square', desde: nota(acorde.arpegio[ARPEGIO[dentro]] + 12), t, dur: duracion * 0.8, vol: 0.12 });
    if (dentro === 0 || dentro === 8) tono(musica, { tipo: 'sine', desde: 150, hasta: 45, t, dur: 0.22, vol: 0.9 });
    if (dentro === 4 || dentro === 12) golpeRuido(musica, { t, dur: 0.14, vol: 0.35, filtro: 'bandpass', frecuencia: 1800 });
    if (dentro % 4 === 2) golpeRuido(musica, { t, dur: 0.04, vol: 0.18 });
  };

  const iniciarMusica = (nivel = 'normal') => {
    pararMusica();
    duracion = 60 / (TEMPO[nivel] ?? TEMPO.normal) / 4;
    semicorchea = 0;
    siguiente = ctx.currentTime + 0.08;
    planificador = setInterval(() => {
      while (siguiente < ctx.currentTime + 0.12) {
        programar(semicorchea, siguiente);
        semicorchea += 1;
        siguiente += duracion;
      }
    }, 25);
  };

  function pararMusica() {
    if (planificador) clearInterval(planificador);
    planificador = null;
  }

  // --- Efectos -----------------------------------------------------------------------
  const ahora = () => ctx.currentTime;

  return {
    reanudar: () => ctx.state === 'suspended' && ctx.resume(),
    activarMusica: (si) => musica.gain.setTargetAtTime(si ? 0.11 : 0, ctx.currentTime, 0.02),
    activarEfectos: (si) => efectos.gain.setTargetAtTime(si ? 0.32 : 0, ctx.currentTime, 0.02),
    iniciarMusica,
    pararMusica,
    disparo: () => tono(efectos, { desde: 1400, hasta: 900, dur: 0.05, vol: 0.05 }),
    recoger: () => {
      tono(efectos, { tipo: 'triangle', desde: nota(84), dur: 0.09, vol: 0.4 });
      tono(efectos, { tipo: 'triangle', desde: nota(91), t: ahora() + 0.07, dur: 0.16, vol: 0.4 });
    },
    aplastar: () => {
      golpeRuido(efectos, { dur: 0.12, vol: 0.35, filtro: 'lowpass', frecuencia: 2500 });
      tono(efectos, { desde: 320, hasta: 70, dur: 0.12, vol: 0.18 });
    },
    golpe: () => {
      tono(efectos, { tipo: 'sawtooth', desde: 150, hasta: 60, dur: 0.35, vol: 0.3 });
      golpeRuido(efectos, { dur: 0.2, vol: 0.25, filtro: 'lowpass', frecuencia: 900 });
    },
    // Victoria: arpegio que sube, redoble y acorde de Do mayor mantenido, con bajo y platillo
    ganar: () => {
      const t = ahora() + 0.05;
      [60, 64, 67, 72, 76, 79].forEach((m, i) =>
        tono(efectos, { tipo: 'square', desde: nota(m), t: t + i * 0.08, dur: 0.12, vol: 0.16 }));
      for (let i = 0; i < 6; i++) golpeRuido(efectos, { t: t + 0.5 + i * 0.05, dur: 0.05, vol: 0.2, filtro: 'bandpass', frecuencia: 1800 });
      const final = t + 0.82;
      [72, 76, 79, 84].forEach((m) => tono(efectos, { tipo: 'triangle', desde: nota(m), t: final, dur: 1.3, vol: 0.22, ataque: 0.02 }));
      [72, 76, 79].forEach((m) => tono(efectos, { tipo: 'square', desde: nota(m), t: final, dur: 0.9, vol: 0.06, ataque: 0.02 }));
      tono(efectos, { tipo: 'triangle', desde: nota(48), t: final, dur: 1.3, vol: 0.5 });
      tono(efectos, { tipo: 'sine', desde: 160, hasta: 50, t: final, dur: 0.3, vol: 0.8 });
      golpeRuido(efectos, { t: final, dur: 1.2, vol: 0.18, filtro: 'highpass', frecuencia: 5000 });
    },
    // Derrota: cuatro notas que caen («uooo, uooo, uooo, uoooooh») con vibrato al final y golpe grave
    perder: () => {
      const t = ahora() + 0.05;
      [[67, 0], [66, 0.32], [65, 0.64]].forEach(([m, d]) =>
        tono(efectos, { tipo: 'sawtooth', desde: nota(m), hasta: nota(m - 0.5), t: t + d, dur: 0.3, vol: 0.12, ataque: 0.02 }));
      const final = t + 0.96;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(nota(64), final);
      o.frequency.exponentialRampToValueAtTime(nota(58), final + 1.1);
      lfo.frequency.value = 6;
      lfoG.gain.value = 9;
      lfo.connect(lfoG).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, final);
      g.gain.exponentialRampToValueAtTime(0.13, final + 0.03);
      g.gain.setValueAtTime(0.13, final + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, final + 1.2);
      o.connect(g).connect(efectos);
      o.start(final); lfo.start(final);
      o.stop(final + 1.25); lfo.stop(final + 1.25);
      tono(efectos, { tipo: 'triangle', desde: nota(36), t: final, dur: 1.1, vol: 0.45 });
      golpeRuido(efectos, { t: final, dur: 0.4, vol: 0.2, filtro: 'lowpass', frecuencia: 600 });
    },
    cerrar: () => { pararMusica(); ctx.close(); },
  };
}
