// ============================================================
//  RELIQUIA (recogible de habilidad)
// ------------------------------------------------------------
//  Un orbe que respira luz. Recogerlo otorga su habilidad para
//  siempre (en esta corrida) y lo anuncia en grande en pantalla.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { Clock } from '../../clock';
import type { AbilityName } from '../../abilities';
import type { CollectContext, Pickup } from '../Actor';
import { sprites } from '../../art/sprites';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';
import { t, type StrKey } from '../../i18n';

// Clave de texto (i18n) del aviso al ganar cada habilidad. Se traduce al
// mostrarlo, así respeta el idioma activo en ese momento.
const ABILITY_KEY: Record<AbilityName, StrKey> = {
  doubleJump: 'ab_doubleJump',
  dash: 'ab_dash',
  wallJump: 'ab_wallJump',
  glide: 'ab_glide',
  pound: 'ab_pound',
  smash: 'ab_smash',
};

const ABILITY_GLOW: Record<AbilityName, string> = {
  doubleJump: '#7ce0ff',
  dash: '#ff9a5a',
  wallJump: '#5ce06a',
  glide: '#6ee08a',
  pound: '#bfeaff',
  smash: '#ffb03a',
};

export class Relic implements Pickup {
  readonly layer = 'pickup' as const;
  dead = false; // recogida
  readonly w = 6;
  readonly h = 6;

  constructor(
    public x: number,
    public y: number,
    readonly ability: AbilityName,
    private clock: Clock,
  ) {}

  box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(): void {
    // Su animación es de reposo: lee el reloj compartido en draw().
  }

  collect(ctx: CollectContext): void {
    this.dead = true;
    ctx.player.abilities[this.ability] = true;
    ctx.particles.burst(this.x + 3, this.y + 4, 22, ['#7ce0ff', '#f5fcff', '#b98bff']);
    ctx.announce(t(ABILITY_KEY[this.ability]));
    sfx.relic();
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const time = this.clock.t;
    const bob = Math.sin(time * 2.2 + this.x) * 2;
    const cx = this.x + 3 - camX;
    const cy = this.y + 4 - camY + bob;
    const shine = Math.sin(time * 5 + this.x);
    drawGlow(ctx, cx, cy, 15, ABILITY_GLOW[this.ability], 0.5 + shine * 0.2);
    // Respira luz: en el pico del pulso, el orbe se enciende (frame 2)
    const spr = shine > 0.3 ? sprites.relic2 : sprites.relic;
    spr.draw(ctx, cx - spr.w / 2, cy - spr.h / 2);
  }
}
