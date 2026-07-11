import type { RoomData } from '../RoomData';
import { entrada } from './entrada';
import { tunel } from './tunel';
import { santuario } from './santuario';

/** Todas las salas del mundo. La primera es donde arranca el jugador. */
export const ROOMS: RoomData[] = [entrada, tunel, santuario];
