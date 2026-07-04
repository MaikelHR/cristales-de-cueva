import type { RoomDef } from './RoomDef';
import { entrada } from './entrada';
import { tunel } from './tunel';
import { santuario } from './santuario';

/** Todas las salas del mundo. La primera es donde arranca el jugador. */
export const ROOMS: RoomDef[] = [entrada, tunel, santuario];
