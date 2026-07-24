// ============================================================
//  THE LORE (what the cave remembers)
// ------------------------------------------------------------
//  The grotto always had a story — it is written all over the level
//  names, the bosses and the architecture — but the player was never
//  told any of it. This is where it lives: carved inscriptions the
//  cave wears on its walls, found by standing still next to one.
//
//  It is PURE DATA and it lives here rather than in i18n.ts for two
//  reasons. i18n's tables are one flat line per string, which is the
//  right shape for "PAUSE" and the wrong one for a four-line
//  inscription that has to stay together in both languages; and the
//  `LORE` table below is the SOURCE OF TRUTH for the ids, the way
//  INSTRUMENTS is for the orchestra — `LoreId` is derived from it, so
//  a glyph in a room can only ever ask for an inscription that exists,
//  and a typo is a compile error instead of a blank wall.
//
//  No DOM, no Tone, no canvas: readable under Node, so the tests can
//  hold the writing to its own rules (every entry reachable, both
//  languages present, nothing long enough to overflow its plaque).
//
//  ON THE WRITING. These are epitaphs, not tutorials. An inscription
//  never explains a mechanic, never addresses the player as a player,
//  and never finishes the story — it is one voice, from one moment,
//  that did not know how things turned out. What the cave is comes
//  from reading several and doing the arithmetic yourself.
// ============================================================

import { getLang } from './i18n';

export interface LoreEntry {
  /** The level whose rooms carry it — the Archive groups by this. */
  level: string;
  /** Short heading for the Archive list. */
  title: { es: string; en: string };
  /** The inscription itself, already broken into lines that fit the
   *  plaque (the renderer does NOT wrap: a line is a line). */
  lines: { es: readonly string[]; en: readonly string[] };
}

// ------------------------------------------------------------
//  The inscriptions, in the game's own level order — so reading the
//  Archive top to bottom is reading them in the order a player could
//  have found them. The challenge levels (simas, reloj, cripta) come
//  last because they are played AFTER the door: that road is
//  archaeology, you climb out and then go back down to learn the cost.
// ------------------------------------------------------------
export const LORE = {
  cav_senda: {
    level: 'cavernas',
    title: { es: 'La luz en la piedra', en: 'The light in the stone' },
    lines: {
      es: ['La piedra guarda luz.', 'Mi madre me enseñó a verla', 'antes que a caminar.'],
      en: ['The stone keeps light.', 'My mother taught me to see it', 'before she taught me to walk.'],
    },
  },
  cav_umbral: {
    level: 'cavernas',
    title: { es: 'La primera veta', en: 'The first seam' },
    lines: {
      es: ['Bajamos por el agua', 'y encontramos la luz', 'dormida en la piedra.'],
      en: ['We followed the water down', 'and found the light', 'asleep inside the stone.'],
    },
  },
  gal_rumor: {
    level: 'galerias',
    title: { es: 'Lo que se cuenta', en: 'What they say' },
    lines: {
      es: ['Dicen que arriba hay otra cueva,', 'y sobre esa, otra, y así.', 'Nadie nacido aquí ha visto ninguna.'],
      en: ['They say there is another cave above,', 'and above that another, and so on.', 'No one born here has seen one.'],
    },
  },
  gal_tiro: {
    level: 'galerias',
    title: { es: 'El primer tiro', en: 'The first shaft' },
    lines: {
      es: ['Cortamos hacia arriba, no de lado.', 'Los viejos decían que era gastar', 'buena piedra. Ya no están los viejos.'],
      en: ['We cut upward, not sideways.', 'The old hands called it a waste', 'of good stone. The old hands are gone.'],
    },
  },
  cor_ensayo: {
    level: 'corazon',
    title: { es: 'Ensayo', en: 'Rehearsal' },
    lines: {
      es: ['Aquí aprendimos a dejar algo', 'cuidando una puerta.', 'No distingue quién quiere pasar.'],
      en: ['Here we learned to leave a thing', 'minding a door.', 'It cannot tell who wants through.'],
    },
  },
  esp_vergel: {
    level: 'esporas',
    title: { es: 'No es obra nuestra', en: 'Not our work' },
    lines: {
      es: ['Esto ya estaba.', 'No lo sembramos: abrimos el paso', 'y lo dejamos cerrarse detrás.'],
      en: ['This was already here.', 'We did not plant it. We cut the path', 'and let it close behind us.'],
    },
  },
  gla_ventisca: {
    level: 'glaciar',
    title: { es: 'El frío callado', en: 'The quiet cold' },
    lines: {
      es: ['Aquí se quedó Tulio.', 'No lo bajamos.', 'El hielo lo cuida mejor.'],
      en: ['Tulio stayed here.', 'We did not carry him down.', 'The ice keeps him better.'],
    },
  },
  fra_cuenta: {
    level: 'fragua',
    title: { es: 'Lista de fundición', en: 'Casting list' },
    lines: {
      es: ['Aquí se fundió la cuenta entera:', 'cadena, plato, válvula, badajo.', 'Y una cosa más, que no lleva nombre.'],
      en: ['The whole tally was cast here:', 'chain, plate, valve, censer.', 'And one more thing, with no name.'],
    },
  },
  fra_botas: {
    level: 'fragua',
    title: { es: 'Las botas de Neda', en: 'Neda\'s boots' },
    lines: {
      es: ['A Neda le herré las botas', 'el día que subió.', 'Alguien las trajo de vuelta.'],
      en: ['I shod Neda\'s boots', 'the day she went up.', 'Someone brought them back.'],
    },
  },
  cen_agua: {
    level: 'cenote',
    title: { es: 'Agua vieja', en: 'Old water' },
    lines: {
      es: ['El agua estaba antes que la obra.', 'No se vacía: se aprende a nadar', 'y se trabaja mojado.'],
      en: ['The water was here before the work.', 'It cannot be drained. You learn to swim', 'and you work wet.'],
    },
  },
  min_turno: {
    level: 'mina',
    title: { es: 'El turno', en: 'The shift' },
    lines: {
      es: ['Subimos ochenta cargas de luz.', 'La puerta pide más de las que hay.', 'El capataz no cierra el turno.'],
      en: ['Eighty loads of light carried up.', 'The door asks more than there is.', 'The foreman will not close the shift.'],
    },
  },
  min_farol: {
    level: 'mina',
    title: { es: 'El farol', en: 'The lantern' },
    lines: {
      es: ['El farol se lo cargamos lleno.', 'Va a durar más que un hombre.', 'Alguien tendrá que apagárselo.'],
      en: ['We filled his lantern to the brim.', 'It will burn longer than a man.', 'Someone will have to put it out.'],
    },
  },
  sed_hilo: {
    level: 'seda',
    title: { es: 'Aviso', en: 'Notice' },
    lines: {
      es: ['El hilo ya estaba aquí.', 'Se tejía antes de la primera veta', 'y se sigue tejiendo.'],
      en: ['The thread was already here.', 'It was spun before the first seam', 'and it is being spun still.'],
    },
  },
  pue_peaje: {
    level: 'puerta',
    title: { es: 'El peaje', en: 'The toll' },
    lines: {
      es: ['La hoja no conoce manos.', 'Conoce la luz. Cede ante quien', 'la trae entera. A los demás, pared.'],
      en: ['The door knows no hands.', 'It knows light. It gives to whoever', 'brings it whole. To the rest, wall.'],
    },
  },
  pue_capilla: {
    level: 'puerta',
    title: { es: 'El que hicimos', en: 'The one we made' },
    lines: {
      es: ['No nació: lo fundimos.', 'Le dimos un halo y una sola orden,', 'y rezamos por no dársela nunca.'],
      en: ['It was not born: we cast it.', 'We gave it a halo and one order,', 'and prayed we would never give it.'],
    },
  },
  pue_dintel: {
    level: 'puerta',
    title: { es: 'El primer peldaño', en: 'The first rung' },
    lines: {
      es: ['La cerramos desde este lado.', 'No es una salida: es el primero', 'de los peldaños que nos faltaban.'],
      en: ['We shut it from this side.', 'It is not a way out: it is the first', 'of the rungs we still had left.'],
    },
  },
  sim_contrapeso: {
    level: 'simas',
    title: { es: 'Regla de la cadena', en: 'Rule of the chain' },
    lines: {
      es: ['Nada sube si no baja algo.', 'Lo aprendimos con la piedra', 'y lo pagamos con gente.'],
      en: ['Nothing rises unless something falls.', 'We learned it with stone', 'and we paid for it with people.'],
    },
  },
  sim_fondo: {
    level: 'simas',
    title: { es: 'El fondo', en: 'The bottom' },
    lines: {
      es: ['Aquí abajo se acaba lo nuestro.', 'Medimos hasta el fondo: no hay puerta.', 'Una sola dirección. Siempre la hubo.'],
      en: ['Down here what is ours ends.', 'We measured to the bottom: no door.', 'One direction only. There always was.'],
    },
  },
  sim_tramo: {
    level: 'simas',
    title: { es: 'Fin de tramo', en: 'End of section' },
    lines: {
      es: ['Aquí acaba lo encadenado.', 'El resto del tiro va sin cadena:', 'más arriba no hay de dónde colgarla.'],
      en: ['The chained section ends here.', 'The rest of the shaft has no chain:', 'higher up, nothing to hang one from.'],
    },
  },
  rel_cuerda: {
    level: 'reloj',
    title: { es: 'Instrucción', en: 'Instructions' },
    lines: {
      es: ['Se le da cuerda cada mil mareas.', 'Si te toca a ti, dale y anótalo.', 'Si no queda nadie, sigue sola.'],
      en: ['Wind it every thousand tides.', 'If the turn is yours, wind it and log it.', 'If no one is left, it runs alone.'],
    },
  },
  rel_esfera: {
    level: 'reloj',
    title: { es: 'La última vuelta', en: 'The last winding' },
    lines: {
      es: ['Le di cuerda para mil años.', 'Si alguien lee esta cara,', 'que abra. Ya está bien.'],
      en: ['I wound it for a thousand years.', 'If anyone reads this face,', 'let them open it. It has been long enough.'],
    },
  },
  cri_portico: {
    level: 'cripta',
    title: { es: 'La bodega', en: 'The cellar' },
    lines: {
      es: ['Bajamos por nuestro propio pie.', 'No es una tumba: es una espera.', 'Que alguien nos despierte al abrir.'],
      en: ['We came down on our own feet.', 'This is not a tomb. It is a wait.', 'Wake us when it gives.'],
    },
  },
  cri_estela: {
    level: 'cripta',
    title: { es: 'Los que subieron', en: 'Those who climbed' },
    lines: {
      es: ['Subieron once. Volvió uno.', 'Traía la misma cara y otra voz.', 'Después de eso, sellamos.'],
      en: ['Eleven went up. One came back.', 'The same face and a different voice.', 'After that, we sealed it.'],
    },
  },
  cri_sepulcro: {
    level: 'cripta',
    title: { es: 'La última lámpara', en: 'The last lamp' },
    lines: {
      es: ['Cira apagó su lámpara', 'y se acostó a mi lado.', 'El reloj todavía sonaba.'],
      en: ['Cira put out her lamp', 'and lay down beside me.', 'The clock was still ticking.'],
    },
  },
} as const satisfies Record<string, LoreEntry>;

/** Every inscription id. A glyph can only ask for one of these. */
export type LoreId = keyof typeof LORE;

/** In Archive order. */
export const LORE_IDS = Object.keys(LORE) as LoreId[];

/** The inscription in the active language. */
export function loreText(id: LoreId): { title: string; lines: readonly string[] } {
  const entry: LoreEntry = LORE[id];
  const lang = getLang();
  return { title: entry.title[lang], lines: entry.lines[lang] };
}

/** The ids belonging to one level, in Archive order. */
export function loreOfLevel(levelId: string): LoreId[] {
  return LORE_IDS.filter((id) => LORE[id].level === levelId);
}

// ------------------------------------------------------------
//  MURALS — the same story with no words in it.
// ------------------------------------------------------------
//  Painted on the BACK WALL (render/backWall.ts's plane), behind the
//  play plane, so they read as something the room has rather than
//  something placed in it. A mural never carries information the
//  player needs; it carries what an inscription cannot, which is
//  scale — how many of them there were, how big the door is, what the
//  Custodio was before it was a boss fight.
// ------------------------------------------------------------
export const MURAL_NAMES = ['procesion', 'puerta', 'custodio', 'caida'] as const;
export type MuralName = (typeof MURAL_NAMES)[number];
