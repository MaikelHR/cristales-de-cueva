// ============================================================
//  BOSS — El Custodio de la Puerta (end of world 1)
// ------------------------------------------------------------
//  The warden of the great door, and the game's ONLY bullet hell:
//  the danmaku is HIS, nobody else's. A tall crystal figure that
//  never walks — it dissolves into motes and re-forms on a FIXED
//  anchor rotation (left → right → top → left…): learn the wheel and
//  you always know where it goes next. The fight is one honest loop
//  per life — pattern, travel move, verb window — repeated until you
//  take the window. Everything announces itself: the halo swells
//  before each ring burst, glints mark every curtain column before
//  the orbs drop, it trembles before the sweep and the slam, and the
//  halo's color ALWAYS names the verb its life demands:
//   · GOLD (3 hp) — rings of orbs whose gap rotates one half-step
//     per burst; then it sinks to a low perch — a plain STOMP.
//   · CYAN (2 hp) — a slow two-armed spiral, then a SWEEP at body
//     height (duck it or hop it) that leaves a sinking wake; it hangs
//     dazed in MID-AIR — only the DASH-LUNGE (ride a blink slab up).
//   · VIOLET (1 hp) — curtains from the roof, a THREE-slot doorway
//     marching steadily right; then a slam whose impact fans orbs
//     upward, and a dome that swallows stomps — only the POUND.
//  Rage only makes orbs faster — never shortens your windows. It
//  sleeps mid-air until you come close: read the arena first.
//  While it lives, the great door won't open.
// ============================================================

import type { Box } from '../../../engine/canvas';
import type { StrKey } from '../../i18n';
import { Level, TILE } from '../../world/Level';
import { drawGlow } from '../../art/glow';
import { sfx } from '../../sfx';
import type { Enemy } from './Enemy';

const MAX_HP = 3;
const GATHER = 0.7;          // motes converge before it re-forms (intangible)
const HOVER = [0, 2.6, 2.4, 2.4];    // [by hp] seconds of pattern per loop
const WINDOW = [0, 2.6, 2.4, 2.6];   // [by hp] seconds the verb window stays open
const TELEGRAPH = 0.5;       // trembling before the sweep / slam
const RING_WARN = 0.5;       // the halo swells this long before each ring
const CURTAIN_WARN = 0.55;   // glints mark the columns before orbs drop
const SWEEP_SPEED = 140;     // px/s of the horizontal sweep (2 hp)
const SLAM_SPEED = 300;      // px/s of the floor slam (1 hp)
const PERCH_SPEED = 90;      // px/s while sinking to the gold perch
const ARENA_HALF = 104;      // px it may stray from the spawn (sweep/curtain width)
const ORB_LIFE = 6;          // seconds an orb lives if it hits nothing
const SHARD_G = 240;         // gravity of the falling gold shards
const HIT_INVULN = 0.6;      // i-frames after a valid hit
const CURTAIN_SLOTS = 13;    // columns per curtain wave
const CURTAIN_GAP = 3;       // slots of doorway per wave

/** The anchor wheel, relative to the spawn center. It ALWAYS advances
 *  in this order — the player can learn where it re-forms next. */
const ANCHORS: ReadonlyArray<{ x: number; y: number }> = [
  { x: -64, y: -6 },
  { x: 64, y: -6 },
  { x: 18, y: -34 },
];

/** The verb each life demands, and the halo color that announces it. */
const VERB_COLOR = ['', '#b98bff', '#7ce0ff', '#ffd23a']; // [hp]

interface Shard { x: number; y: number; vx: number; vy: number; }
interface Orb { x: number; y: number; vx: number; vy: number; life: number; }
/** A curtain wave already announced (glints showing) but not yet fired. */
interface PendingWave { xs: number[]; timer: number; }

type State = 'gather' | 'hover' | 'telegraph' | 'sweep' | 'slam' | 'window';

export class Custodio implements Enemy {
  readonly layer = 'enemy' as const;
  x: number;
  y: number;
  readonly w = 12;
  readonly h = 20;
  dead = false;
  readonly isBoss = true;
  readonly gooColors = ['#ffd76a', '#7ce0ff', '#b98bff'];
  hp = MAX_HP;

  /** Asleep mid-air until the player comes close: you enter on a high
   *  ledge and READ the arena before anything moves (the entry rule). */
  private awake = false;
  private state: State = 'gather';
  private stateTimer = 0;
  private anchor = 0;
  private bursts = 0;      // ring bursts fired (rotates the gap predictably)
  private waves = 0;       // curtain waves fired (marches the doorway)
  private spiralAngle = 0;
  private emitTimer = 0;
  private ringWarn = 0;    // >0 = the halo is swelling toward a burst
  private pending: PendingWave | null = null;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly groundY: number; // top of the arena floor, in px
  private sweepDir: 1 | -1 = 1;
  private trailTimer = 0;
  private invuln = 0;
  private t = 0;
  private shards: Shard[] = [];
  private orbs: Orb[] = [];

  constructor(px: number, py: number, level: Level) {
    this.spawnX = px;
    this.spawnY = py;
    this.x = px;
    this.y = py;
    // Find the arena floor under the spawn: the slam and the gold
    // perch measure themselves against it.
    let gy = py + this.h;
    while (gy < level.heightPx && !level.isSolidAt(px + this.w / 2, gy)) gy += TILE;
    this.groundY = gy - (gy % TILE);
  }

  /** The boss theme plays only while the fight is actually on. */
  get engaged(): boolean {
    return this.awake && !this.dead;
  }

  /** Only the GOLD window (3 hp) accepts a plain stomp. */
  get stompable(): boolean {
    return this.state === 'window' && this.hp === 3;
  }

  /** Untouchable from above except in the gold and violet windows —
   *  and the violet one still needs the pound (stompable stays false,
   *  so only `player.pounding` gets through isStomp). */
  get invulnerable(): boolean {
    return !(this.state === 'window' && this.hp !== 2);
  }

  /** Only the CYAN window (2 hp): the dash-lunge is the answer. */
  get dashVulnerable(): boolean {
    return this.state === 'window' && this.hp === 2;
  }

  /** Its halo names the verb and the verb CHANGES with each life, so
   *  the HUD changes with it: stomp, then dash-lunge, then pound.
   *  A single "stomp the guardian" line would be wrong twice. */
  get hintKey(): StrKey {
    if (this.hp === 2) return 'hud_dash_boss';
    if (this.hp === 1) return 'hud_pound_boss';
    return 'hud_stomp_boss';
  }

  box(): Box {
    // While gathering it has no body yet: motes can't be touched.
    if (this.awake && this.state === 'gather') return { x: -99, y: -999, w: 0, h: 0 };
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hazards(): Box[] {
    const boxes: Box[] = this.orbs.map((o) => ({ x: o.x - 2, y: o.y - 2, w: 4, h: 4 }));
    for (const s of this.shards) boxes.push({ x: s.x - 2, y: s.y - 2, w: 4, h: 4 });
    return boxes;
  }

  onStomp(): boolean {
    if (this.state !== 'window' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = HIT_INVULN;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // Hit taken: it flees to the next anchor on the wheel, and the
    // halo already announces the NEXT verb.
    this.teleport();
    return false;
  }

  /** The rage: orbs fly faster with every hit taken — but the hover,
   *  telegraph and window duractions never shrink: reading time is sacred. */
  private rage(): number {
    return 1 + (MAX_HP - this.hp) * 0.15;
  }

  /** Dissolve and re-form at the NEXT anchor on the wheel — always in
   *  order, so the fight can be learned like a dance. */
  private teleport(): void {
    this.anchor = (this.anchor + 1) % ANCHORS.length;
    this.x = this.spawnX + ANCHORS[this.anchor].x;
    this.y = this.spawnY + ANCHORS[this.anchor].y;
    this.state = 'gather';
    this.stateTimer = GATHER;
    this.emitTimer = 0;
    this.ringWarn = 0;
    this.pending = null;
    sfx.crackle();
  }

  private spawnOrb(x: number, y: number, vx: number, vy: number): void {
    this.orbs.push({ x, y, vx, vy, life: ORB_LIFE });
  }

  /** A ring of orbs bursting from the body. The gap rotates exactly
   *  one half-step per burst: watch two rings and you know them all. */
  private ringBurst(): void {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const speed = 42 * this.rage();
    const tilt = this.bursts * (Math.PI / 8);
    this.bursts++;
    for (let i = 0; i < 8; i++) {
      const a = tilt + (Math.PI * 2 * i) / 8;
      this.spawnOrb(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed);
    }
  }

  /** Gold shards raining from the roof over the player's column. */
  private rainShards(targetX: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const k = Math.floor(this.t * 60) + i * 17;
      this.shards.push({
        x: targetX + (i - (count - 1) / 2) * 14 + ((k * 31) % 9) - 4,
        y: 12,
        vx: 0,
        vy: 15 + ((k * 13) % 25),
      });
    }
  }

  /** Announce one curtain wave: glints mark every column that will
   *  fire, the doorway marches steadily RIGHT one slot per wave (and
   *  wraps) — stand in the light that stays dark. */
  private announceCurtain(): void {
    const gapStart = this.waves % (CURTAIN_SLOTS - CURTAIN_GAP + 1);
    this.waves++;
    const xs: number[] = [];
    for (let i = 0; i < CURTAIN_SLOTS; i++) {
      if (i >= gapStart && i < gapStart + CURTAIN_GAP) continue; // the doorway
      xs.push(this.spawnX + this.w / 2 - ARENA_HALF + (i * (ARENA_HALF * 2)) / (CURTAIN_SLOTS - 1));
    }
    this.pending = { xs, timer: CURTAIN_WARN };
    sfx.crackle();
  }

  /** The slam's impact: a fan of orbs bursting up and out of the floor. */
  private impactFan(): void {
    const cx = this.x + this.w / 2;
    const speed = 52 * this.rage();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / 7; // upward half-circle
      this.spawnOrb(cx, this.groundY - 4, Math.cos(a) * speed, Math.sin(a) * speed);
    }
  }

  update(dt: number, target: { x: number; y: number }): void {
    this.t += dt;

    // Asleep it only breathes; coming close wakes it, and it opens the
    // fight the way it fights: dissolving and re-forming somewhere else.
    if (!this.awake) {
      this.y = this.spawnY + Math.sin(this.t * 1.2) * 2;
      if (Math.abs(target.x - (this.x + this.w / 2)) < 120) {
        this.awake = true;
        this.teleport();
      }
      return;
    }

    this.invuln = Math.max(0, this.invuln - dt);

    // A pending curtain fires when its warning runs out — wherever the
    // state machine is (the announcement was the commitment).
    if (this.pending) {
      this.pending.timer -= dt;
      if (this.pending.timer <= 0) {
        for (const x of this.pending.xs) this.spawnOrb(x, 10, 0, 58 * this.rage());
        this.pending = null;
      }
    }

    switch (this.state) {
      case 'gather': {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'hover';
          this.stateTimer = HOVER[this.hp];
          this.emitTimer = 0;
        }
        break;
      }
      case 'hover': {
        // Bobs on its anchor, pouring out this life's pattern. One
        // hover = one pattern = one window afterwards, every time.
        this.y = this.spawnY + ANCHORS[this.anchor].y + Math.sin(this.t * 2.2) * 3;
        this.stateTimer -= dt;
        this.emitTimer += dt;

        if (this.hp === 3) {
          // Anillos: the halo swells, then a ring; twice per hover,
          // with gold shards over your column between them.
          const half = HOVER[3] / 2;
          const inHalf = this.emitTimer % half;
          this.ringWarn = Math.max(0, 1 - (half - inHalf) / RING_WARN);
          if (this.emitTimer >= half) {
            this.emitTimer -= half;
            this.ringBurst();
            this.rainShards(target.x, 3);
            sfx.crackle();
          }
        } else if (this.hp === 2) {
          // Espiral: two slow arms, rotating steadily — a clock to read.
          if (this.emitTimer >= 0.3) {
            this.emitTimer -= 0.3;
            this.spiralAngle += 0.55;
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;
            const speed = 46 * this.rage();
            for (const side of [0, Math.PI]) {
              this.spawnOrb(
                cx, cy,
                Math.cos(this.spiralAngle + side) * speed,
                Math.sin(this.spiralAngle + side) * speed,
              );
            }
          }
        } else {
          // Cortina: two announced waves per hover, doorway marching.
          const half = HOVER[1] / 2.2;
          if (this.emitTimer >= half) {
            this.emitTimer -= half;
            this.announceCurtain();
          }
        }

        if (this.stateTimer <= 0) {
          this.ringWarn = 0;
          if (this.hp === 3) {
            // Rings done: sink to the gold perch. The window is EARNED
            // by surviving the pattern, every single loop.
            this.openWindow();
          } else {
            // The other lives cap their loop with their travel attack.
            this.state = 'telegraph';
            this.stateTimer = TELEGRAPH;
            this.sweepDir = target.x > this.x ? 1 : -1;
            sfx.crackle();
          }
        }
        break;
      }
      case 'telegraph': {
        // Trembles in place: the sweep (2 hp) or the slam (1 hp) is coming.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = this.hp === 2 ? 'sweep' : 'slam';
        break;
      }
      case 'sweep': {
        // Glides horizontally at body height — duck under or hop over —
        // leaving a sparse wake of slow-sinking orbs.
        this.x += this.sweepDir * SWEEP_SPEED * this.rage() * dt;
        this.trailTimer += dt;
        if (this.trailTimer >= 0.16) {
          this.trailTimer -= 0.16;
          this.spawnOrb(this.x + this.w / 2, this.y + this.h / 2, 0, 26);
        }
        if (Math.abs(this.x - this.spawnX) >= ARENA_HALF) {
          this.x = this.spawnX + this.sweepDir * ARENA_HALF;
          this.openWindow(); // dazed in mid-air, right where it stopped
        }
        break;
      }
      case 'slam': {
        // Drops like a stone; the floor answers with a fan of orbs.
        this.y += SLAM_SPEED * dt;
        if (this.y + this.h >= this.groundY) {
          this.y = this.groundY - this.h;
          this.impactFan();
          sfx.crack();
          this.openWindow(); // the dome rises where it landed
        }
        break;
      }
      case 'window': {
        // The gold perch approaches the floor first (3 hp); the others
        // hold where their attack left them.
        if (this.hp === 3) {
          const perchY = this.groundY - this.h - 6;
          if (this.y < perchY) this.y = Math.min(perchY, this.y + PERCH_SPEED * dt);
        }
        this.stateTimer -= dt;
        // Window missed: on to the next anchor, same loop again. No
        // punishment spiral — the same fair dance until you take it.
        if (this.stateTimer <= 0) this.teleport();
        break;
      }
    }

    // Gold shards: fall accelerating and die against the rock.
    for (const s of this.shards) {
      s.vy += SHARD_G * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.shards = this.shards.filter((s) => s.y < this.groundY + TILE);

    // Violet orbs: straight and patient, gone against the rock.
    for (const o of this.orbs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
    }
    this.orbs = this.orbs.filter(
      (o) => o.life > 0 && o.y < this.groundY - 1 && o.y > 4 &&
        Math.abs(o.x - this.spawnX) < ARENA_HALF + 60,
    );
  }

  private openWindow(): void {
    this.state = 'window';
    this.stateTimer = WINDOW[this.hp];
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const verb = VERB_COLOR[this.hp];

    // A pending curtain: glints over every column about to fire.
    if (this.pending) {
      const p = 1 - this.pending.timer / CURTAIN_WARN;
      for (const x of this.pending.xs) {
        ctx.globalAlpha = 0.3 + p * 0.7;
        ctx.fillStyle = '#e9d6ff';
        ctx.fillRect(Math.round(x - camX), Math.round(10 - camY), 1, 2 + Math.round(p * 3));
        ctx.globalAlpha = 1;
      }
    }

    // The danmaku: violet-white orbs...
    for (const o of this.orbs) {
      drawGlow(ctx, o.x - camX, o.y - camY, 5, '#b98bff', 0.6);
      ctx.fillStyle = '#e9d6ff';
      ctx.fillRect(Math.round(o.x - camX) - 1, Math.round(o.y - camY) - 1, 2, 2);
    }
    // ...and the falling gold shards.
    for (const s of this.shards) {
      drawGlow(ctx, s.x - camX, s.y - camY, 6, '#ffd76a', 0.6);
      ctx.fillStyle = '#fff3c0';
      ctx.fillRect(Math.round(s.x - camX) - 1, Math.round(s.y - camY) - 1, 2, 2);
    }

    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    const cx = px + this.w / 2;

    if (this.state === 'gather' && this.awake) {
      // Only motes converging where it will re-form: read it and move.
      const p = 1 - this.stateTimer / GATHER;
      drawGlow(ctx, cx, py + this.h / 2, 14, verb, p * 0.4);
      ctx.fillStyle = '#fff3c0';
      for (let i = 0; i < 6; i++) {
        const a = this.t * 4 + i * 1.05;
        const r = (1 - p) * 18 + 3;
        ctx.globalAlpha = 0.3 + p * 0.7;
        ctx.fillRect(
          Math.round(cx + Math.cos(a) * r),
          Math.round(py + this.h / 2 + Math.sin(a) * r),
          1, 1,
        );
      }
      ctx.globalAlpha = 1;
      return;
    }

    const windowOpen = this.state === 'window';
    const shaking = this.state === 'telegraph' ? Math.round(Math.sin(this.t * 40)) : 0;
    const bx = px + shaking;
    const flashing = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    // The halo: a ring behind the head, ALWAYS in the demanded verb's
    // color — and it SWELLS before each ring burst (the warning).
    const swell = this.ringWarn * 8;
    drawGlow(ctx, cx, py + 4, (windowOpen ? 18 : 12) + swell, verb, (windowOpen ? 0.65 : 0.35) + this.ringWarn * 0.25);

    // Sweep trail.
    if (this.state === 'sweep') {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = verb;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(bx + (this.sweepDir === 1 ? -5 - i * 4 : this.w + 2 + i * 4), py + 6 + i * 3, 4, 1);
      }
      ctx.globalAlpha = 1;
    }

    // Robe: a tall dark crystal that tapers to a floating hem.
    ctx.fillStyle = flashing ? '#ffffff' : '#241436';
    ctx.fillRect(bx + 1, py + 4, this.w - 2, this.h - 7);
    ctx.fillRect(bx + 2, py + 2, this.w - 4, 3);
    if (!flashing) {
      ctx.fillStyle = '#472a6e';
      ctx.fillRect(bx + 2, py + 12, this.w - 4, this.h - 15);
      // Hem: loose crystal fragments floating under the robe.
      ctx.fillStyle = '#3a2456';
      const hemBob = Math.round(Math.sin(this.t * 3) * 1);
      ctx.fillRect(bx + 2, py + this.h - 2 + hemBob, 2, 2);
      ctx.fillRect(bx + 5, py + this.h - 1 - hemBob, 2, 2);
      ctx.fillRect(bx + 8, py + this.h - 2 + hemBob, 2, 2);

      // Mask: a pale face with one slit eye, lit by the verb. Asleep,
      // the slit is shut: a statue until you wake it.
      ctx.fillStyle = '#e9d6ff';
      ctx.fillRect(bx + 3, py + 4, this.w - 6, 5);
      ctx.fillStyle = this.awake ? verb : '#3a2456';
      ctx.fillRect(bx + 4, py + 6, this.w - 8, 1);

      // Crown: three shards orbiting the head. In a window they spread
      // WIDE open (the tell that it can be hurt right now).
      const spread = windowOpen ? 7 : 3;
      ctx.fillStyle = this.awake ? verb : '#4a2e70';
      for (let i = -1; i <= 1; i++) {
        const wob = Math.round(Math.sin(this.t * 5 + i) * (windowOpen ? 1.5 : 0.5));
        ctx.fillRect(cx - 1 + i * spread, py - 4 + wob + Math.abs(i), 2, 3);
      }

      if (windowOpen && this.hp === 3) {
        // Gold perch: the exposed core over the head — STOMP IT.
        const pulse = Math.sin(this.t * 10) > 0;
        ctx.fillStyle = pulse ? '#fff3c0' : '#ffd23a';
        ctx.fillRect(bx + 4, py, this.w - 8, 2);
      }
      if (windowOpen && this.hp === 2) {
        // Dazed in mid-air: dizzy stars — the dash-lunge window.
        ctx.fillStyle = '#d6f7ff';
        for (let i = 0; i < 3; i++) {
          const a = this.t * 4 + (i * Math.PI * 2) / 3;
          ctx.fillRect(Math.round(cx + Math.cos(a) * 8), Math.round(py - 6 + Math.sin(a) * 2), 1, 1);
        }
      }
      if (windowOpen && this.hp === 1) {
        // The violet dome: it swallows stomps — only the pound cracks it.
        ctx.globalAlpha = 0.3 + Math.sin(this.t * 6) * 0.08;
        ctx.fillStyle = '#b98bff';
        ctx.beginPath();
        ctx.arc(cx, py + this.h, this.w + 2, Math.PI, 0);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#e9d6ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, py + this.h, this.w + 2, Math.PI, 0);
        ctx.stroke();
      }
    }

    // Health pips above the crown.
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < this.hp ? '#ffd76a' : '#4a2e70';
      ctx.fillRect(cx - 7 + i * 5, py - 9, 3, 2);
    }
  }
}
