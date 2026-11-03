import { describe, it, expect } from "vitest";
import { moveBody, crossedTop, overlaps, type Body } from "../src/game/physics";
describe("deterministic platform collision", () => {
  it("lands on a surface without sinking over repeated frames", () => {
    const p: Body = {
      x: 20,
      y: 0,
      width: 40,
      height: 56,
      vx: 0,
      vy: 0,
      grounded: false,
    };
    for (let i = 0; i < 240; i++) {
      p.vy += 1500 / 120;
      moveBody(p, [{ x: 0, y: 200, width: 400, height: 100 }], 1 / 120);
    }
    expect(p.y).toBe(144);
    expect(p.grounded).toBe(true);
    expect(p.vy).toBe(0);
  });
  it("stops at walls while allowing vertical movement", () => {
    const p: Body = {
      x: 30,
      y: 30,
      width: 40,
      height: 56,
      vx: 300,
      vy: 100,
      grounded: false,
    };
    moveBody(p, [{ x: 80, y: 0, width: 40, height: 200 }], 0.1);
    expect(p.x).toBe(40);
    expect(p.vx).toBe(0);
    expect(p.y).toBe(40);
  });
  it("detects a moving-platform top crossing but rejects a side pass", () => {
    const platform = { x: 100, y: 200, width: 100, height: 20 };
    expect(
      crossedTop({ x: 110, y: 150, width: 40, height: 56 }, 140, platform),
    ).toBe(true);
    expect(
      crossedTop({ x: 0, y: 150, width: 40, height: 56 }, 140, platform),
    ).toBe(false);
    expect(overlaps({ x: 100, y: 150, width: 40, height: 56 }, platform)).toBe(
      true,
    );
  });
});
