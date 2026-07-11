// ============================================================
//  RELOJ compartido de animación
// ------------------------------------------------------------
//  Un contador de segundos que la sesión hace avanzar y que los
//  actores leen para sus animaciones de reposo (bob, brillos).
//  Es un objeto (no un número) para que todos vean el MISMO valor:
//  también avanza en los menús, así el mundo respira de fondo.
// ============================================================

export interface Clock {
  t: number;
}
