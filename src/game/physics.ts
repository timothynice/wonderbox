/** Small deterministic AABB solver. Authored rectangles are never mutated. */
export type Rect = { x: number; y: number; width: number; height: number };
export type Body = Rect & { vx: number; vy: number; grounded: boolean };
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
export function moveBody(body: Body, solids: Rect[], dt: number): void {
  body.grounded = false;
  body.x += body.vx * dt;
  for (const s of solids)
    if (overlaps(body, s)) {
      if (body.vx > 0) body.x = s.x - body.width;
      else if (body.vx < 0) body.x = s.x + s.width;
      body.vx = 0;
    }
  body.y += body.vy * dt;
  for (const s of solids)
    if (overlaps(body, s)) {
      if (body.vy >= 0) {
        body.y = s.y - body.height;
        body.grounded = true;
      } else body.y = s.y + s.height;
      body.vy = 0;
    }
}
export function crossedTop(a: Rect, previousY: number, b: Rect): boolean {
  return (
    a.x + a.width > b.x &&
    a.x < b.x + b.width &&
    previousY + a.height <= b.y + 3 &&
    a.y + a.height >= b.y
  );
}
