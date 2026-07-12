// ============================================================
//  MÚSICA (secuenciador por pasos)
// ------------------------------------------------------------
//  Una canción es DATOS: un tempo, un largo de loop y una lista
//  de notas con su beat de entrada. Nada de archivos de audio:
//  igual que los sprites, la música está "escrita" por código y
//  suena por el mismo mini-sintetizador de audio.ts.
//
//  El truco de que suene estable: cada frame, tickMusic() agenda
//  con ANTICIPACIÓN las notas que caen dentro de una ventana
//  corta de futuro (lookahead). El reloj es el del hardware de
//  audio, no el del juego: aunque un frame se trabe, las notas
//  ya agendadas suenan a tiempo.
//
//  El módulo es agnóstico del juego: no sabe de escenas ni de
//  niveles. El juego decide QUÉ canción suena (setSong) y cuánto
//  se atenúa (setMusicDuck, p. ej. durante la pausa).
// ============================================================

import { playTone, audioNow, type ToneType } from './audio';

export interface SongNote {
  /** Beat (desde el inicio del loop) en que entra la nota. */
  beat: number;
  freq: number;            // Hz (en 'noise': el color del ruido)
  beats: number;           // duración, en beats
  freqEnd?: number;        // barrido de frecuencia (gotas, bombos, silbidos)
  type?: ToneType;         // por defecto triangle (el timbre suave)
  vol?: number;            // 0..1, por defecto 0.06 (la música va DEBAJO de los sfx)
  attack?: number;         // segundos de ataque (largo = colchón)
}

export interface Song {
  /** Identidad de la canción: si ya está sonando, setSong no la reinicia. */
  id: string;
  bpm: number;
  /** Largo del loop, en beats. Una nota puede COLEAR más allá del final
   *  (su cola se superpone con la vuelta del loop): eso es deseable. */
  loopBeats: number;
  /** Multiplicador de volumen de toda la canción. */
  volume?: number;
  notes: SongNote[];
}

/** Problemas de integridad de una canción (para tests, como validateRooms). */
export function validateSong(song: Song): string[] {
  const errors: string[] = [];
  if (song.bpm <= 0) errors.push(`[${song.id}] bpm debe ser positivo`);
  if (song.loopBeats <= 0) errors.push(`[${song.id}] loopBeats debe ser positivo`);
  song.notes.forEach((n, i) => {
    if (n.beat < 0 || n.beat >= song.loopBeats) {
      errors.push(`[${song.id}] nota ${i}: beat ${n.beat} fuera del loop [0, ${song.loopBeats})`);
    }
    if (n.beats <= 0) errors.push(`[${song.id}] nota ${i}: duración no positiva`);
    if (n.freq <= 0) errors.push(`[${song.id}] nota ${i}: frecuencia no positiva`);
    if (n.freqEnd !== undefined && n.freqEnd <= 0) {
      errors.push(`[${song.id}] nota ${i}: freqEnd no positiva`);
    }
  });
  return errors;
}

// Cuánto futuro se agenda por tick. Corto para que los cambios de canción
// y el duck de pausa respondan rápido; largo para sobrevivir frames lentos.
const LOOKAHEAD = 0.35; // segundos

let current: Song | null = null;
let loopStart: number | null = null; // hora (reloj de audio) del beat 0 del loop en curso
let nextNote = 0;                    // próxima nota (por índice) a agendar
let duck = 1;                        // atenuación transitoria (pausa)

/** Cambia la canción de fondo (null = silencio). Si ya suena, no hace nada:
 *  se puede llamar cada frame con "la canción que corresponde ahora". */
export function setSong(song: Song | null): void {
  if (song?.id === current?.id) return;
  // Copia ordenada por beat: el agendador recorre las notas en orden.
  current = song
    ? { ...song, notes: [...song.notes].sort((a, b) => a.beat - b.beat) }
    : null;
  loopStart = null;
  nextNote = 0;
}

/** Atenuación momentánea de la música (1 = normal). Afecta a las notas
 *  que se agenden de acá en más: con el lookahead corto, casi al instante. */
export function setMusicDuck(factor: number): void {
  duck = factor;
}

/** Llamar una vez por frame: agenda las notas que entran en la ventana.
 *  Si el audio aún no despertó (falta el primer gesto), espera sin drama. */
export function tickMusic(): void {
  if (!current) return;
  const now = audioNow();
  if (now === null) return;

  const spb = 60 / current.bpm; // segundos por beat
  const loopLen = current.loopBeats * spb;

  // Arranque, o resincronización si pasó mucho sin ticks (pestaña oculta):
  // mejor retomar desde el beat 0 que "correr" para alcanzar el presente.
  if (loopStart === null || now - loopStart > loopLen + LOOKAHEAD) {
    loopStart = now + 0.05;
    nextNote = 0;
  }
  // Copia local ya sin null: TypeScript pierde el narrowing de una
  // variable de módulo entre llamadas a funciones. Se persiste al final.
  let start: number = loopStart;

  for (;;) {
    // ¿Se acabaron las notas del loop? Pasar al siguiente si ya asoma.
    if (nextNote >= current.notes.length) {
      const nextLoop = start + loopLen;
      if (nextLoop > now + LOOKAHEAD) break;
      start = nextLoop;
      nextNote = 0;
      continue;
    }
    const note = current.notes[nextNote];
    const t = start + note.beat * spb;
    if (t > now + LOOKAHEAD) break; // todavía no toca: hasta el próximo tick
    nextNote++;
    const volume = (note.vol ?? 0.06) * (current.volume ?? 1) * duck;
    if (t < now || volume < 0.001) continue; // nota ya pasada o inaudible
    playTone(
      {
        freq: note.freq,
        freqEnd: note.freqEnd,
        duration: note.beats * spb,
        type: note.type ?? 'triangle',
        volume,
        attack: note.attack,
        delay: t - now,
      },
      'music',
    );
  }
  loopStart = start;
}
