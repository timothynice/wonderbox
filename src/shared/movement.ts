import { moveBody, type Body, type Rect } from '../game/physics.js';

export const MOTION_VERSION = 'wonderbox-motion-1';
export const FIXED_STEP = 1 / 120;
export type MotionState = { coyote: number; buffer: number; floatUsed: number; jumpCanCut: boolean };
export type MotionInput = { direction: -1 | 0 | 1; jumpHeld: boolean; jumpPressed?: boolean };
export const createMotionState = (): MotionState => ({ coyote: 0, buffer: 0, floatUsed: 0, jumpCanCut: false });
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Production player integration shared by the Phaser scene and static-route checks.
 * Dynamic riders/bounces/damage remain scene effects outside this static step. */
export function stepPlayerMotion(p: Body, state: MotionState, input: MotionInput, world: { gravity: number; width: number }, solids: Rect[], floatSeconds: number, dt = FIXED_STEP) {
  if (input.jumpPressed) state.buffer = 0.14;
  state.buffer -= dt;
  state.coyote = p.grounded ? 0.12 : state.coyote - dt;
  const target = input.direction * 285;
  const accel = input.direction ? 2100 : 2600;
  p.vx += clamp(target - p.vx, -accel * dt, accel * dt);
  let jumped = false;
  if (state.buffer > 0 && state.coyote > 0) {
    p.vy = -570; state.buffer = 0; state.coyote = 0; p.grounded = false;
    state.jumpCanCut = true; state.floatUsed = 0; jumped = true;
  }
  let gravity = world.gravity;
  if (!input.jumpHeld && state.jumpCanCut && p.vy < -180) { p.vy = -180; state.jumpCanCut = false; }
  if (input.jumpHeld && !p.grounded && state.floatUsed < floatSeconds) {
    gravity = 250; p.vy = Math.min(p.vy, 38); state.floatUsed += dt;
  }
  const oldY = p.y;
  p.vy = Math.min(950, p.vy + gravity * dt);
  moveBody(p, solids, dt);
  p.x = clamp(p.x, 0, world.width - p.width);
  if (p.grounded) state.floatUsed = 0;
  return { oldY, jumped };
}
