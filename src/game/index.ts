import Phaser from "phaser";
import { entityInk, worldArt } from "./art.js";
import type { Project, Entity, Terrain } from "../shared/model.js";
import {
  deriveEditImpact,
  type EditImpact,
  type ReconcileOptions,
} from "../shared/edit-impact.js";
import { stepPlayerMotion } from "../shared/movement.js";
import {
  checkReachability,
  mechanicsFingerprint,
  reachabilityEvidenceSchema,
  type ReachabilityEvidence,
  type WitnessInput,
} from "../shared/reachability.js";
import {
  moveBody,
  overlaps,
  crossedTop,
  type Body,
  type Rect,
} from "./physics.js";

type Kind = Entity["kind"];
export type GameTool = "select" | "terrain" | "erase" | Kind;
export type GameStatus = {
  health: number;
  maxHealth: number;
  stars: number;
  totalStars: number;
  deaths: number;
  checkpoint: string | null;
  won: boolean;
  carrying: string | null;
  message: string;
};
export type TouchInput = { left?: boolean; right?: boolean; jump?: boolean; interact?: boolean };
export type GameCallbacks = {
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onPaint?: (rect: Rect) => void;
  onEraseTerrain?: (id: string) => void;
  onPlace?: (kind: Kind, x: number, y: number) => void;
  onPause?: () => void;
  onStatus?: (status: GameStatus) => void;
};
type Live = Entity & {
  vx: number;
  vy: number;
  grounded: boolean;
  active: boolean;
  transformed: boolean;
  thrown: boolean;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  direction: number;
};
const clamp = Phaser.Math.Clamp;
const snap = (n: number) => Math.round(n / 20) * 20;
function isTyping() {
  const e = document.activeElement;
  return (
    e instanceof HTMLElement &&
    (e.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName))
  );
}

export function mountGame(
  container: HTMLElement,
  initialProject: Project,
  callbacks: GameCallbacks = {},
) {
  let project = structuredClone(initialProject),
    mode: "play" | "edit" = "play",
    tool: GameTool = "select",
    selected: string | null = null;
  let scene: GardenScene | undefined,
    ready = false,
    muted = false;
  let preview: EditImpact | null = null;
  let previewTrajectory: { x: number; y: number }[] = [];
  let cameraBookmark: number | null = null;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  class GardenScene extends Phaser.Scene {
    graphics!: Phaser.GameObjects.Graphics;
    overlay!: Phaser.GameObjects.Graphics;
    labels: Phaser.GameObjects.Text[] = [];
    hintText!: Phaser.GameObjects.Text;
    replayBadge!: Phaser.GameObjects.Text;
    replay: {
      inputs: WitnessInput[];
      index: number;
      frameInInput: number;
      frame: number;
      total: number;
      target: string;
    } | null = null;
    lastReplayResult: "reached" | "missed" | "cancelled" | null = null;
    feedback: {
      x: number;
      y: number;
      color: number;
      at: number;
      duration: number;
    }[] = [];
    highlights = new Map<string, number>();
    blockedSpawn = false;
    lastGrounded = false;
    bodies: Live[] = [];
    player!: Live;
    keys = new Set<string>();
    pressed = new Set<string>();
    touchKeys = new Set<string>();
    elapsed = 0;
    accumulator = 0;
    coyote = 0;
    buffer = 0;
    floatUsed = 0;
    jumpCanCut = false;
    facing = 1;
    invulnerable = 0;
    health = 3;
    deaths = 0;
    stars = new Set<string>();
    checkpoint: string | null = null;
    carrying: string | null = null;
    won = false;
    message = "Find three little stars. A whole garden is waiting.";
    messageUntil = 6;
    cameraX = 0;
    drag: {
      id: string;
      x: number;
      y: number;
      offsetX: number;
      offsetY: number;
      startX: number;
      startY: number;
      moved: boolean;
    } | null = null;
    paintStart: { x: number; y: number } | null = null;
    pointer = { x: 0, y: 0 };
    lastStatus = "";
    audio: AudioContext | null = null;
    constructor() {
      super("MoonlightGarden");
    }
    create() {
      scene = this;
      this.graphics = this.add.graphics();
      this.overlay = this.add.graphics().setScrollFactor(0);
      this.hintText = this.add
        .text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#f2f7dc",
          backgroundColor: "#203d42",
          padding: { x: 9, y: 5 },
        })
        .setOrigin(0.5, 1)
        .setDepth(6);
      this.replayBadge = this.add
        .text(0, 0, "ROUTE REPLAY · TEST INPUTS", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#fff0bd",
          backgroundColor: "#263c43",
          padding: { x: 10, y: 7 },
        })
        .setDepth(7)
        .setVisible(false);
      this.cameras.main.setBackgroundColor("#122d35");
      this.reset(false);
      ready = true;
      window.addEventListener("keydown", this.keyDown);
      window.addEventListener("keyup", this.keyUp);
      window.addEventListener("blur", this.blur);
      document.addEventListener("visibilitychange", this.visibilityChange);
      this.input.on("pointerdown", this.pointerDown);
      this.input.on("pointermove", this.pointerMove);
      this.input.on("pointerup", this.pointerUp);
      this.input.on(
        "wheel",
        (_p: unknown, _o: unknown, _dx: number, dy: number) => {
          if (mode === "edit")
            this.cameraX = clamp(
              this.cameraX + dy,
              0,
              Math.max(0, project.world.width - this.viewWidth()),
            );
        },
      );
      this.events.once("shutdown", () => {
        window.removeEventListener("keydown", this.keyDown);
        window.removeEventListener("keyup", this.keyUp);
        window.removeEventListener("blur", this.blur);
        document.removeEventListener("visibilitychange", this.visibilityChange);
        this.releaseTouch();
        void this.audio?.close();
      });
    }
    keyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (this.replay) {
        this.cancelReplay();
        this.note("Route replay stopped. You have the controls.");
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (e.code === "Escape") {
        this.keys.clear();
        this.releaseTouch();
        callbacks.onPause?.();
      }
    };
    keyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    visibilityChange = () => { if (document.hidden) this.blur(); };
    releaseTouch() {
      this.touchKeys.clear();
      this.pressed.delete("TouchJump");
      this.pressed.delete("TouchInteract");
    }
    setTouch(input: TouchInput) {
      if (mode !== "play" || isTyping() || document.hidden) { this.releaseTouch(); return; }
      if (this.replay) this.cancelReplay();
      for (const [key, down] of [["left", input.left], ["right", input.right], ["jump", input.jump], ["interact", input.interact]] as const) {
        if (down) {
          if (!this.touchKeys.has(key)) {
            if (key === "jump") this.pressed.add("TouchJump");
            if (key === "interact") this.pressed.add("TouchInteract");
          }
          this.touchKeys.add(key);
        } else this.touchKeys.delete(key);
      }
    }
    blur = () => {
      this.releaseTouch();
      this.keys.clear();
      this.pressed.clear();
      this.buffer = 0;
    };
    viewWidth() {
      return this.scale.width / (this.scale.height / 720);
    }
    point(p: Phaser.Input.Pointer) {
      const z = this.scale.height / 720;
      return { x: p.x / z + this.cameraX, y: p.y / z };
    }
    pointerDown = (p: Phaser.Input.Pointer) => {
      if (mode !== "edit") return;
      const q = this.point(p);
      this.pointer = q;
      if (tool === "terrain") {
        this.paintStart = {
          x: Math.floor(q.x / 20) * 20,
          y: Math.floor(q.y / 20) * 20,
        };
        return;
      }
      if (tool === "erase") {
        const t = project.terrain.find((t) =>
          overlaps({ ...q, width: 1, height: 1 }, t),
        );
        if (t) callbacks.onEraseTerrain?.(t.id);
        return;
      }
      if (tool !== "select") {
        callbacks.onPlace?.(tool, snap(q.x), snap(q.y));
        return;
      }
      const e = this.editorEntities()
        .reverse()
        .find((e) => overlaps({ ...q, width: 1, height: 1 }, e));
      selected =
        e?.id ??
        [...project.terrain]
          .reverse()
          .find((t) => overlaps({ ...q, width: 1, height: 1 }, t))?.id ??
        null;
      callbacks.onSelect?.(selected);
      if (e)
        this.drag = {
          id: e.id,
          x: e.x,
          y: e.y,
          offsetX: q.x - e.x,
          offsetY: q.y - e.y,
          startX: q.x,
          startY: q.y,
          moved: false,
        };
    };
    pointerMove = (p: Phaser.Input.Pointer) => {
      this.pointer = this.point(p);
      if (
        this.drag &&
        Math.hypot(
          this.pointer.x - this.drag.startX,
          this.pointer.y - this.drag.startY,
        ) > 3
      ) {
        this.drag.moved = true;
        this.drag.x = snap(this.pointer.x - this.drag.offsetX);
        this.drag.y = snap(this.pointer.y - this.drag.offsetY);
      }
    };
    pointerUp = () => {
      if (this.drag) {
        const e = project.entities.find((e) => e.id === this.drag!.id);
        if (
          this.drag.moved &&
          e &&
          (e.x !== this.drag.x || e.y !== this.drag.y)
        )
          callbacks.onMove?.(
            this.drag.id,
            clamp(this.drag.x, 0, project.world.width - e.width),
            clamp(this.drag.y, 0, project.world.height - e.height),
          );
        this.drag = null;
      }
      if (this.paintStart) {
        const a = this.paintStart;
        callbacks.onPaint?.({
          x: Math.min(a.x, Math.floor(this.pointer.x / 20) * 20),
          y: Math.min(a.y, Math.floor(this.pointer.y / 20) * 20),
          width: Math.abs(Math.floor(this.pointer.x / 20) * 20 - a.x) + 20,
          height: Math.abs(Math.floor(this.pointer.y / 20) * 20 - a.y) + 20,
        });
        this.paintStart = null;
      }
    };
    editorEntities(): (Entity & Partial<Live>)[] {
      return project.entities.map((authored) => {
        const live = this.bodies.find((e) => e.id === authored.id);
        return live
          ? {
              ...authored,
              x: live.x,
              y: live.y,
              transformed: live.transformed,
              vx: live.vx,
              direction: live.direction,
            }
          : authored;
      });
    }
    bounds(id: string): (Entity & Partial<Live>) | Terrain | undefined {
      return (
        this.editorEntities().find((e) => e.id === id) ??
        project.terrain.find((t) => t.id === id)
      );
    }
    pulse(x: number, y: number, color = 0xd6edb0, duration = 0.55) {
      this.feedback.push({ x, y, color, at: this.elapsed, duration });
      this.feedback = this.feedback.slice(-24);
    }
    resolveSpawn() {
      const p = this.player;
      const clear = (x: number, y: number) =>
        x >= 0 &&
        y >= 0 &&
        x + p.width <= project.world.width &&
        y + p.height <= project.world.height &&
        !project.terrain.some((t) =>
          overlaps({ x, y, width: p.width, height: p.height }, t),
        );
      if (clear(p.x, p.y)) return true;
      const origin = { x: p.x, y: p.y };
      const candidates = project.terrain
        .flatMap((t) => [
          {
            x: clamp(origin.x, t.x, Math.max(t.x, t.x + t.width - p.width)),
            y: t.y - p.height,
          },
          { x: t.x, y: t.y - p.height },
          { x: t.x + t.width - p.width, y: t.y - p.height },
        ])
        .filter((c) => clear(c.x, c.y))
        .sort(
          (a, b) =>
            Math.hypot(a.x - origin.x, a.y - origin.y) -
            Math.hypot(b.x - origin.x, b.y - origin.y),
        );
      if (candidates[0]) {
        p.x = candidates[0].x;
        p.y = candidates[0].y;
        return true;
      }
      for (let y = 0; y < project.world.height - p.height; y += 20)
        for (let x = 0; x < project.world.width - p.width; x += 20)
          if (clear(x, y)) {
            p.x = x;
            p.y = y;
            return true;
          }
      return false;
    }
    cancelReplay() {
      if (this.replay) {
        this.replay = null;
        this.lastReplayResult = "cancelled";
        this.keys.clear();
        this.releaseTouch();
        this.pressed.clear();
        this.buffer = 0;
      }
    }
    beginReplay(evidence: ReachabilityEvidence) {
      const parsed = reachabilityEvidenceSchema.parse(evidence);
      if (parsed.status !== "route-found" || !parsed.passed || !parsed.witness)
        throw new Error("Check a supported route before replaying it.");
      if (
        parsed.revision !== project.revision ||
        parsed.mechanicsFingerprint !== mechanicsFingerprint(project)
      )
        throw new Error(
          "The project changed. Check the route again before replaying.",
        );
      const total = parsed.witness.inputs.reduce((n, i) => n + i.frames, 0);
      if (total > 12000 || parsed.witness.inputs.length > 12000)
        throw new Error("The route exceeds the runtime replay budget.");
      const checked = checkReachability(project, {
        targetTerrainId: parsed.targetTerrainId,
        ...(parsed.sourceTerrainId
          ? { sourceTerrainId: parsed.sourceTerrainId }
          : {}),
      });
      if (
        checked.status !== "route-found" ||
        !checked.witness ||
        JSON.stringify(checked.witness.start) !==
          JSON.stringify(parsed.witness.start) ||
        JSON.stringify(checked.witness.inputs) !==
          JSON.stringify(parsed.witness.inputs)
      )
        throw new Error(
          "This witness no longer matches the current check. Check again.",
        );
      this.reset(false);
      Object.assign(this.player, structuredClone(parsed.witness.start));
      this.replay = {
        inputs: structuredClone(parsed.witness.inputs),
        index: 0,
        frameInInput: 0,
        frame: 0,
        total,
        target: parsed.targetTerrainId,
      };
      this.lastReplayResult = null;
      mode = "play";
      this.note(
        "Scripted route replay · fresh test run from the checked source.",
      );
      if (!total) this.finishReplay();
      return { started: true, frames: total };
    }
    finishReplay() {
      const target = project.terrain.find((t) => t.id === this.replay?.target),
        p = this.player;
      const support = target
        ? Math.min(p.x + p.width, target.x + target.width) -
          Math.max(p.x, target.x)
        : 0;
      const reached =
        !!target &&
        p.grounded &&
        Math.abs(p.y + p.height - target.y) < 0.1 &&
        support >= p.width * 0.75;
      this.replay = null;
      this.lastReplayResult = reached ? "reached" : "missed";
      mode = "edit";
      this.keys.clear();
      this.releaseTouch();
      this.pressed.clear();
      this.buffer = 0;
      callbacks.onPause?.();
      this.note(
        reached
          ? "Route replay reached the ledge · scripted input, not a human playtest."
          : "Replay ended without a stable target landing. Check the route again.",
      );
    }
    advanceReplay() {
      if (!this.replay) return;
      const r = this.replay;
      r.frame++;
      r.frameInInput++;
      if (r.frameInInput >= r.inputs[r.index].frames) {
        r.index++;
        r.frameInInput = 0;
        if (r.index >= r.inputs.length) this.finishReplay();
      }
    }
    reconcile(next: Project, impact: EditImpact) {
      this.cancelReplay();
      if (impact.mode === "restart") {
        const fresh = project.id !== next.id;
        project = structuredClone(next);
        this.reset(!fresh);
        this.note(
          this.blockedSpawn
            ? "No clear spawn space. Erase overlapping terrain, then restart."
            : impact.reason,
        );
        return;
      }
      project = structuredClone(next);
      for (const authored of project.entities) {
        const live = this.bodies.find((e) => e.id === authored.id);
        if (live) {
          live.name = authored.name;
          live.locked = authored.locked;
          live.behaviors = structuredClone(authored.behaviors);
          live.appearance = structuredClone(authored.appearance);
        }
      }
      if (this.carrying) {
        const carried = this.bodies.find((e) => e.id === this.carrying);
        if (
          !carried ||
          !carried.active ||
          (!carried.behaviors.throwable && !carried.behaviors.portableLight)
        ) {
          this.carrying = null;
          if (carried) {
            carried.vx = this.facing * 65;
            carried.vy = 45;
            carried.thrown = false;
          }
        }
      }
      if (
        this.won &&
        this.stars.size <
          (this.bodies.find((e) => e.kind === "exit")?.behaviors
            .requiredStars ?? 0)
      )
        this.won = false;
      this.keys.clear();
      this.releaseTouch();
      this.pressed.clear();
      this.buffer = 0;
      for (const id of impact.affectedIds)
        this.highlights.set(id, this.elapsed + 1.4);
      this.note(impact.reason);
    }
    reset(fromCheckpoint: boolean) {
      this.cancelReplay();
      const oldCheckpoint =
        fromCheckpoint &&
        project.entities.some(
          (entity) =>
            entity.id === this.checkpoint && entity.kind === "checkpoint",
        )
          ? this.checkpoint
          : null;
      this.bodies = project.entities.map((e) => ({
        ...structuredClone(e),
        vx: 0,
        vy: 0,
        grounded: false,
        active: true,
        transformed: false,
        thrown: false,
        originX: e.x,
        originY: e.y,
        lastX: e.x,
        lastY: e.y,
        direction: 1,
      }));
      this.player = this.bodies.find((e) => e.kind === "player")!;
      this.checkpoint = oldCheckpoint;
      const cp = this.bodies.find((e) => e.id === oldCheckpoint);
      if (cp) {
        this.player.x = cp.x;
        this.player.y = cp.y + cp.height - this.player.height;
      }
      if (!fromCheckpoint) this.stars.clear();
      this.stars = new Set(
        [...this.stars].filter((id) =>
          project.entities.some((e) => e.id === id && e.kind === "star"),
        ),
      );
      this.elapsed = 0;
      this.accumulator = 0;
      this.feedback = [];
      this.lastGrounded = false;
      this.highlights.clear();
      this.blockedSpawn = !this.resolveSpawn();
      if (this.blockedSpawn) {
        mode = "edit";
        callbacks.onPause?.();
      }
      this.health = 3;
      this.carrying = null;
      this.won = false;
      this.coyote = 0;
      this.buffer = 0;
      this.floatUsed = 0;
      this.jumpCanCut = false;
      this.invulnerable = 1;
      this.keys.clear();
      this.releaseTouch();
      this.pressed.clear();
      this.publish();
    }
    note(text: string) {
      this.message = text;
      this.messageUntil = this.elapsed + 4;
      this.publish();
    }
    tone(freq: number, duration = 0.12) {
      if (muted) return;
      try {
        this.audio ??= new AudioContext();
        void this.audio.resume();
        const o = this.audio.createOscillator(),
          g = this.audio.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, this.audio.currentTime);
        o.frequency.exponentialRampToValueAtTime(
          freq * 1.5,
          this.audio.currentTime + duration,
        );
        g.gain.setValueAtTime(0.055, this.audio.currentTime);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          this.audio.currentTime + duration,
        );
        o.connect(g);
        g.connect(this.audio.destination);
        o.start();
        o.stop(this.audio.currentTime + duration);
      } catch {
        /* Audio is optional. */
      }
    }
    publish() {
      const status: GameStatus = {
        health: this.health,
        maxHealth: 3,
        stars: this.stars.size,
        totalStars: project.entities.filter((e) => e.kind === "star").length,
        deaths: this.deaths,
        checkpoint: this.checkpoint,
        won: this.won,
        carrying: this.carrying,
        message: this.message,
      };
      const s = JSON.stringify(status);
      if (s !== this.lastStatus) {
        this.lastStatus = s;
        callbacks.onStatus?.(status);
      }
    }
    die() {
      this.deaths++;
      this.reset(true);
      this.note("A soft landing, a fresh start. Try again.");
      this.tone(130, 0.2);
    }
    interact() {
      if (this.carrying) {
        const e = this.bodies.find((e) => e.id === this.carrying)!;
        e.vx = this.facing * 650;
        e.vy = -220;
        e.thrown = true;
        this.carrying = null;
        this.pulse(e.x + e.width / 2, e.y + e.height / 2, 0xf5d391, 0.3);
        this.tone(260);
        return;
      }
      const e = this.bodies
        .filter(
          (e) =>
            e !== this.player &&
            e.active &&
            (e.behaviors.throwable || e.behaviors.portableLight) &&
            Math.hypot(e.x - this.player.x, e.y - this.player.y) < 90,
        )
        .sort(
          (a, b) =>
            Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x),
        )[0];
      if (e) {
        this.carrying = e.id;
        this.pulse(e.x + e.width / 2, e.y + e.height / 2, 0xf5d391, 0.3);
        e.thrown = false;
        this.note(`${e.name} in hand · E to throw`);
        this.tone(400);
      } else
        this.note(
          "Stand beside a throwable plant or a portable lantern, then press E.",
        );
    }
    update(_time: number, delta: number) {
      if (!this.player) return;
      if (isTyping()) {
        this.cancelReplay();
        this.keys.clear();
        this.releaseTouch();
        this.pressed.clear();
        this.buffer = 0;
      }
      const dt = Math.min(delta / 1000, 0.05);
      if (mode === "play" && !this.won) this.elapsed += dt;
      if (mode === "play" && !this.won) {
        if (
          this.pressed.has("TouchJump") ||
          this.pressed.has("Space") ||
          this.pressed.has("ArrowUp") ||
          this.pressed.has("KeyW")
        )
          this.buffer = 0.14;
        if (this.pressed.has("KeyE") || this.pressed.has("TouchInteract")) this.interact();
        this.accumulator += dt;
        while (this.accumulator >= 1 / 120 && mode === "play" && !this.won) {
          this.step(1 / 120);
          this.accumulator -= 1 / 120;
        }
        const target = clamp(
          this.player.x - this.viewWidth() * 0.36,
          0,
          Math.max(0, project.world.width - this.viewWidth()),
        );
        this.cameraX += (target - this.cameraX) * Math.min(1, dt * 6);
      }
      this.pressed.clear();
      this.draw();
      this.publish();
    }
    step(dt: number) {
      const p = this.player;
      this.invulnerable -= dt;
      const platforms = this.bodies.filter(
        (e) => e.kind === "platform" && e.active,
      );
      for (const e of platforms) {
        e.lastX = e.x;
        e.lastY = e.y;
        const offset =
          Math.sin(
            (this.elapsed * e.behaviors.moveSpeed) /
              Math.max(20, e.behaviors.moveDistance),
          ) * e.behaviors.moveDistance;
        if (e.behaviors.moveAxis === "y") e.y = e.originY + offset;
        else e.x = e.originX + offset;
      }
      for (const e of platforms)
        if (
          p.grounded &&
          Math.abs(p.y + p.height - e.lastY) < 4 &&
          p.x + p.width > e.lastX &&
          p.x < e.lastX + e.width
        ) {
          p.x += e.x - e.lastX;
          p.y += e.y - e.lastY;
        }
      const replayInput = this.replay?.inputs[this.replay.index];
      const dir =
        replayInput?.direction ??
        (this.touchKeys.has("right") || this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
          (this.touchKeys.has("left") || this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
      if (dir) this.facing = dir;
      const held =
        replayInput?.jumpHeld ??
        (this.touchKeys.has("jump") || this.keys.has("Space") ||
          this.keys.has("ArrowUp") ||
          this.keys.has("KeyW"));
      const { oldY, jumped } = stepPlayerMotion(
        p,
        this,
        {
          direction: dir as -1 | 0 | 1,
          jumpHeld: held,
          jumpPressed:
            !!replayInput?.jumpPressed && this.replay?.frameInInput === 0,
        },
        project.world,
        project.terrain,
        p.behaviors.floatSeconds,
        dt,
      );
      if (jumped) this.tone(380, 0.1);
      for (const e of platforms)
        if (p.vy >= 0 && crossedTop(p, oldY, e)) {
          p.y = e.y - p.height;
          p.vy = 0;
          p.grounded = true;
        }
      p.x = clamp(p.x, 0, project.world.width - p.width);
      if (p.grounded) {
        this.floatUsed = 0;
        if (!this.lastGrounded)
          this.pulse(p.x + p.width / 2, p.y + p.height, 0xc9dfb4, 0.35);
      }
      this.lastGrounded = p.grounded;
      const lights = this.bodies.filter(
        (e) => e.active && e.behaviors.portableLight,
      );
      for (const e of this.bodies) {
        if (e === p || !e.active) continue;
        if (e.id === this.carrying) {
          e.x = p.x + (this.facing > 0 ? p.width + 2 : -e.width - 2);
          e.y = p.y - 10;
          e.vx = 0;
          e.vy = 0;
          continue;
        }
        if (
          e.kind !== "enemy" &&
          e.kind !== "platform" &&
          (e.kind === "plant" ||
            e.kind === "lantern" ||
            e.thrown ||
            e.vx !== 0 ||
            e.vy !== 0)
        ) {
          if (e.thrown || e.vx !== 0 || e.vy !== 0) {
            e.vy += project.world.gravity * dt;
            const oldVx = e.vx;
            moveBody(e, project.terrain, dt);
            if (e.grounded) {
              e.vx *= 0.98;
              if (Math.abs(e.vx) < 25) e.thrown = false;
            }
            if (oldVx !== 0 && e.vx === 0) e.thrown = false;
          }
          if (e.y > project.world.height + 200) {
            e.x = e.originX;
            e.y = e.originY;
            e.vx = 0;
            e.vy = 0;
            e.thrown = false;
          }
        }
        if (e.kind === "enemy") {
          if (e.transformed) {
            if (p.vy >= 0 && crossedTop(p, oldY, e)) {
              p.y = e.y - p.height;
              p.vy = -e.behaviors.bounceSpeed;
              this.jumpCanCut = false;
              p.grounded = false;
              this.floatUsed = 0;
              this.tone(620);
              this.note("Boing! A new way up.");
            }
            continue;
          }
          const light = e.behaviors.fearsLight
            ? lights.find(
                (l) =>
                  Math.hypot(l.x - e.x, l.y - e.y) < l.behaviors.lightRadius,
              )
            : null;
          if (light) e.direction = e.x >= light.x ? 1 : -1;
          else if (e.x > e.originX + e.behaviors.patrolRange) e.direction = -1;
          else if (e.x < e.originX - e.behaviors.patrolRange) e.direction = 1;
          e.vx = e.direction * e.behaviors.patrolSpeed * (light ? 1.9 : 1);
          e.vy += project.world.gravity * dt;
          const vx = e.vx;
          moveBody(e, project.terrain, dt);
          if (vx !== 0 && e.vx === 0) e.direction *= -1;
          for (const thrown of this.bodies.filter(
            (t) => t !== e && t.active && t.thrown,
          ))
            if (overlaps(e, thrown)) {
              thrown.thrown = false;
              thrown.vx = -thrown.vx * 0.2;
              thrown.vy = -180;
              if (e.behaviors.transformOnHit) {
                e.transformed = true;
                e.vx = 0;
                this.pulse(e.x + e.width / 2, e.y + 10, 0xe3b1cf, 0.8);
                this.note("A grumble became a spring!");
                this.tone(700, 0.25);
              } else {
                e.active = false;
                this.tone(220);
              }
            }
          if (
            e.active &&
            !e.transformed &&
            overlaps(p, e) &&
            this.invulnerable <= 0
          ) {
            if (oldY + p.height <= e.y + 12 && p.vy > 0) {
              p.vy = -410;
              this.jumpCanCut = false;
              e.direction *= -1;
              this.invulnerable = 0.5;
              this.tone(280);
            } else {
              this.health--;
              if (this.health <= 0) {
                this.die();
                return;
              }
              this.invulnerable = 1.5;
              p.vx = -this.facing * 280;
              p.vy = -300;
              this.jumpCanCut = false;
              this.note("Ouch! " + this.health + " hearts left. Keep going.");
              this.tone(150, 0.15);
            }
          }
          if (e.y > project.world.height + 100) e.active = false;
        }
        if (
          e.kind === "star" &&
          !this.stars.has(e.id) &&
          overlaps(p, {
            ...e,
            x: e.x - 8,
            y: e.y - 8,
            width: e.width + 16,
            height: e.height + 16,
          })
        ) {
          this.stars.add(e.id);
          this.pulse(e.x + e.width / 2, e.y + e.height / 2, 0xffe0a0, 0.65);
          this.tone(720, 0.18);
          this.note(
            `${this.stars.size} star${this.stars.size === 1 ? "" : "s"} found. Keep exploring!`,
          );
        }
        if (
          e.kind === "checkpoint" &&
          overlaps(p, e) &&
          this.checkpoint !== e.id
        ) {
          this.checkpoint = e.id;
          this.pulse(e.x + e.width / 2, e.y + 4, 0xffe2a0, 0.9);
          this.note("Checkpoint lit. Your next fresh start is here.");
          this.tone(530, 0.25);
        }
        if (e.kind === "exit" && overlaps(p, e)) {
          if (this.stars.size >= e.behaviors.requiredStars) {
            this.won = true;
            this.pulse(e.x + e.width / 2, e.y + e.height / 2, 0xffe2a0, 1.2);
            this.note("You made a little wonder. Garden complete!");
            this.tone(880, 0.6);
          } else
            this.note(
              `${e.behaviors.requiredStars - this.stars.size} more stars to wake the gate.`,
            );
        }
      }
      if (p.y > project.world.height + 100) this.die();
      else this.advanceReplay();
    }
    draw() {
      const g = this.graphics;
      g.clear();
      const z = this.scale.height / 720,
        w = this.viewWidth(),
        moon = project.world.atmosphere === "moonlight",
        ambience = reducedMotion ? 0 : this.elapsed,
        art = worldArt(project.world.theme, moon),
        foliage = project.world.foliageDensity,
        starDensity = project.world.starDensity;
      this.cameras.main.setZoom(z);
      this.cameras.main.setScroll(
        this.cameraX + (w - this.scale.width) / 2,
        (720 - this.scale.height) / 2,
      );
      // Layered garden, drawn in world coordinates for crisp original vector artwork.
      g.fillStyle(art.sky);
      g.fillRect(this.cameraX, 0, w, 720);
      for (let band = 0; band < 7; band++) {
        g.fillStyle(art.skyBand, (1 - band / 7) * 0.08);
        g.fillRect(this.cameraX, band * 80, w, 80);
      }
      const celestialX = this.cameraX + w * 0.78;
      g.fillStyle(moon ? 0xc9e9cb : 0xf6e7ad, 0.08);
      g.fillCircle(celestialX, 115, 110);
      g.fillStyle(art.celestial, 0.95);
      g.fillCircle(celestialX, 115, 42);
      if (moon) {
        g.fillStyle(art.moonShade);
        g.fillCircle(celestialX + 19, 98, 39);
      }
      if (project.world.theme === "aurora") {
        // Layered translucent northern ribbons, behind every piece of playable geometry.
        for (let band = 0; band < 3; band++) {
          g.lineStyle(18 + band * 13, [0x83dfb5, 0x8fc7e2, 0xb3a5e7][band], moon ? 0.095 : 0.055);
          const points = [];
          for (let i = 0; i <= 32; i++) points.push({x:this.cameraX + i * w / 32,y:70 + band * 39 + Math.sin(i * .19 + band + ambience * .05) * 38});
          g.strokePoints(points, false);
        }
      }
      for (let i = 0; i < Math.round(70 * starDensity); i++) {
        const x = (i * 137.7 + 17) % 4000,
          y = 30 + ((i * 79.3) % 390);
        g.fillStyle(
          0xe5f8c9,
          moon ? 0.25 + 0.25 * Math.sin(ambience * 0.5 + i) : 0.2,
        );
        g.fillCircle(x - this.cameraX * 0.14, y, 1 + (i % 3) * 0.5);
      }
      for (let layer = 0; layer < 3; layer++) {
        const par = 0.12 + layer * 0.18;
        for (let i = -1; i < 17; i++) {
          const x = i * 340 - this.cameraX * par,
            base = 590 + layer * 30,
            h = 260 + ((i * 73) % 150),
            col = art.mountains[layer];
          g.fillStyle(col, 0.8);
          g.fillEllipse(x, base - h * 0.3, 190 + layer * 50, h);
          g.fillRect(x - 8, base - h * 0.25, 16, h * 0.5);
          g.fillEllipse(x + 110, base - h * 0.22, 140, h * 0.7);
        }
      }
      // Pale ribbon paths and flowering silhouettes give the world depth.
      g.fillStyle(art.path, 0.4);
      for (let i = 0; i < 12; i++)
        g.fillEllipse(i * 350 - this.cameraX * 0.3, 690, 540, 110);
      for (const t of project.terrain) {
        g.fillStyle(art.ground);
        g.fillRoundedRect(t.x, t.y, t.width, t.height, 10);
        g.fillStyle(art.soil);
        g.fillRect(t.x + 2, t.y + 14, t.width - 4, Math.max(0, t.height - 16));
        g.fillStyle(art.surface);
        g.fillRoundedRect(t.x, t.y, t.width, 13, 6);
        g.fillStyle(art.shine);
        g.fillRect(t.x + 4, t.y + 1, t.width - 8, 3);
        for (let x = t.x + 12; x < t.x + t.width - 4; x += 34) {
          if (project.world.terrainStyle === "crystal") {
            const depth = Math.min(32, Math.max(0, t.height - 18));
            g.fillStyle(art.shine, .22);
            g.fillTriangle(x, t.y + 16, Math.min(x + 25, t.x + t.width - 2), t.y + 16, x + 11, t.y + 16 + depth);
            g.lineStyle(1, art.shine, .32);
            g.lineBetween(x + 11, t.y + 16, x + 11, t.y + 16 + depth);
          } else if (project.world.terrainStyle === "stone") {
            g.lineStyle(2, art.ground, .55);
            const depth = Math.min(21, Math.max(0, t.height - 18));
            g.lineBetween(x, t.y + 15, x, t.y + 15 + depth);
            g.lineBetween(x, t.y + 15 + depth, Math.min(x + 30, t.x + t.width - 3), t.y + 15 + depth);
          } else {
            g.lineStyle(2, 0x506d60, 0.7);
            g.lineBetween(x, t.y + 18, x + 8, t.y + 35);
            g.fillStyle(0x203d42, 0.35);
            g.fillCircle(x + 12, t.y + 46, 3);
          }
        }
        for (let x = t.x + 15; foliage > 0 && x < t.x + t.width - 10; x += 49 / foliage) {
          g.lineStyle(2, art.stem);
          g.lineBetween(x, t.y, x - 4, t.y - 7);
          g.lineBetween(x, t.y, x + 5, t.y - 10);
          if (Math.floor(x) % 3 === 0) {
            g.fillStyle(art.flower);
            g.fillCircle(x + 5, t.y - 12, 3);
          }
        }
      }
      // Sprigs and clover near the foreground edge (deterministic, no external assets).
      for (let i = 0; i < Math.round(100 * foliage); i++) {
        const x = 30 + i * 35 / foliage,
          t = project.terrain.find(
            (t) => x > t.x && x < t.x + t.width && t.y >= 580,
          );
        if (!t) continue;
        const y = t.y;
        g.lineStyle(2, art.stem, 0.8);
        g.lineBetween(x, y, x + Math.sin(i) * 6, y - 18 - (i % 3) * 7);
        g.fillStyle(i % 4 === 0 ? art.flower : art.leaf);
        g.fillEllipse(x - 5, y - 14, 12, 5);
        g.fillEllipse(x + 4, y - 22, 13, 6);
      }
      const display =
        mode === "edit"
          ? this.editorEntities()
          : this.bodies.filter((e) => e.active);
      for (const entity of display) {
        const e = entity as Live;
        if (mode === "play" && e.kind === "star" && this.stars.has(e.id))
          continue;
        let x = e.x,
          y = e.y;
        if (this.drag?.id === e.id) {
          x = this.drag.x;
          y = this.drag.y;
        }
        this.drawEntity(e, x, y);
      }
      // Fireflies drift independently of gameplay and never obscure collision geometry.
      for (let i = 0; i < Math.round(23 * starDensity); i++) {
        const x =
            (i * 153 + Math.sin(ambience * 0.4 + i) * 18) % project.world.width,
          y = 250 + ((i * 59) % 320) + Math.sin(ambience + i) * 9;
        g.fillStyle(0xd7eeb4, 0.06);
        g.fillCircle(x, y, 12);
        g.fillStyle(art.glow, 0.35 + 0.2 * Math.sin(ambience * 2 + i));
        g.fillCircle(x, y, 2);
      }
      if (mode === "edit") {
        g.lineStyle(1, 0xffffff, 0.055);
        for (
          let x = Math.floor(this.cameraX / 20) * 20;
          x < this.cameraX + w;
          x += 20
        )
          g.lineBetween(x, 0, x, 720);
        for (let y = 0; y <= 720; y += 20)
          g.lineBetween(this.cameraX, y, this.cameraX + w, y);
        const e = selected ? this.bounds(selected) : undefined;
        if (e) {
          const x = this.drag?.id === e.id ? this.drag.x : e.x,
            y = this.drag?.id === e.id ? this.drag.y : e.y;
          g.lineStyle(2, "locked" in e && e.locked ? 0xe9b777 : 0xc9fca9);
          g.strokeRoundedRect(x - 5, y - 5, e.width + 10, e.height + 10, 7);
          for (const [cx, cy] of [
            [x - 5, y - 5],
            [x + e.width + 5, y - 5],
            [x - 5, y + e.height + 5],
            [x + e.width + 5, y + e.height + 5],
          ]) {
            g.fillStyle(0xc9fca9);
            g.fillRect(cx - 3, cy - 3, 6, 6);
          }
        }
        if (this.paintStart) {
          const a = this.paintStart;
          g.fillStyle(0xb7efab, 0.3);
          g.fillRect(
            Math.min(a.x, snap(this.pointer.x)),
            Math.min(a.y, snap(this.pointer.y)),
            Math.abs(snap(this.pointer.x) - a.x) + 20,
            Math.abs(snap(this.pointer.y) - a.y) + 20,
          );
        } else if (tool !== "select" && tool !== "erase") {
          g.lineStyle(2, 0xd7f8be, 0.7);
          g.strokeRect(
            snap(this.pointer.x),
            snap(this.pointer.y),
            tool === "terrain" ? 20 : 40,
            tool === "terrain" ? 20 : 40,
          );
        }
      }
      this.drawPreview();
      for (const [id, until] of this.highlights) {
        if (this.elapsed > until) {
          this.highlights.delete(id);
          continue;
        }
        const e = this.bounds(id);
        if (e) {
          g.lineStyle(2, 0xd9f6b7, 0.8);
          g.strokeRoundedRect(e.x - 6, e.y - 6, e.width + 12, e.height + 12, 7);
        }
      }
      this.feedback = this.feedback.filter(
        (f) => this.elapsed - f.at < f.duration,
      );
      for (const f of this.feedback) {
        const age = clamp((this.elapsed - f.at) / f.duration, 0, 1);
        g.lineStyle(2, f.color, (1 - age) * 0.6);
        g.strokeEllipse(
          f.x,
          f.y,
          reducedMotion ? 28 : 18 + age * 50,
          reducedMotion ? 12 : 8 + age * 24,
        );
      }
      const nearby = this.bodies
        .filter(
          (e) =>
            e !== this.player &&
            e.active &&
            (e.behaviors.throwable || e.behaviors.portableLight) &&
            Math.hypot(e.x - this.player.x, e.y - this.player.y) < 90,
        )
        .sort(
          (a, b) =>
            Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x),
        )[0];
      const throwTarget = this.carrying
        ? this.bodies.find(
            (e) =>
              e.kind === "enemy" &&
              e.active &&
              !e.transformed &&
              e.behaviors.transformOnHit &&
              Math.sign(e.x - this.player.x) === this.facing &&
              Math.abs(e.x - this.player.x) < 320,
          )
        : null;
      const hint = this.carrying
        ? throwTarget
          ? "E  Throw → make a spring"
          : "E  Throw"
        : nearby
          ? `E  Pick up ${nearby.name}`
          : "";
      this.hintText
        .setVisible(mode === "play" && !this.won && !!hint)
        .setText(hint)
        .setPosition(this.player.x + this.player.width / 2, this.player.y - 20);
      this.replayBadge
        .setVisible(!!this.replay)
        .setPosition(this.cameraX + 18, 24);
      this.overlay.clear();
      if (this.invulnerable > 0.65 && mode === "play") {
        this.overlay.fillStyle(0xf8daaa, (this.invulnerable - 0.65) * 0.18);
        this.overlay.fillRect(0, 0, this.scale.width, this.scale.height);
      }
    }
    drawPreview() {
      if (!preview) return;
      const g = this.graphics;
      const outline = (r: Rect, color: number, marker: "+" | "×" | "~") => {
        g.fillStyle(color, 0.1);
        g.fillRect(r.x, r.y, r.width, r.height);
        g.lineStyle(2, color, 0.95);
        g.strokeRect(r.x - 3, r.y - 3, r.width + 6, r.height + 6);
        const x = r.x + 7,
          y = r.y - 11;
        g.lineStyle(2, color);
        if (marker === "+") {
          g.lineBetween(x - 4, y, x + 4, y);
          g.lineBetween(x, y - 4, x, y + 4);
        } else if (marker === "×") {
          g.lineBetween(x - 4, y - 4, x + 4, y + 4);
          g.lineBetween(x - 4, y + 4, x + 4, y - 4);
        } else {
          g.strokeCircle(x, y, 4);
        }
      };
      for (const c of [...preview.terrainChanges, ...preview.entityChanges]) {
        const geometry =
          !c.before ||
          !c.after ||
          c.fields.some((f) =>
            ["x", "y", "width", "height", "kind"].includes(f),
          );
        if (c.before && geometry) outline(c.before, 0xf0b3a4, "×");
        if (c.after) {
          const live = !geometry ? this.bounds(c.id) : undefined;
          outline(live ?? c.after, 0xd6f5ad, c.before ? "~" : "+");
        }
        if (c.before && c.after && geometry) {
          const a = {
              x: c.before.x + c.before.width / 2,
              y: c.before.y + c.before.height / 2,
            },
            b = {
              x: c.after.x + c.after.width / 2,
              y: c.after.y + c.after.height / 2,
            };
          g.lineStyle(2, 0xe6f6cf, 0.8);
          g.lineBetween(a.x, a.y, b.x, b.y);
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          g.lineBetween(
            b.x,
            b.y,
            b.x - Math.cos(angle - 0.5) * 12,
            b.y - Math.sin(angle - 0.5) * 12,
          );
          g.lineBetween(
            b.x,
            b.y,
            b.x - Math.cos(angle + 0.5) * 12,
            b.y - Math.sin(angle + 0.5) * 12,
          );
        }
      }
      if (previewTrajectory.length > 1) {
        g.lineStyle(2, 0xffe3a1, 0.9);
        for (let i = 1; i < previewTrajectory.length; i++)
          if (i % 4 !== 0)
            g.lineBetween(
              previewTrajectory[i - 1].x,
              previewTrajectory[i - 1].y,
              previewTrajectory[i].x,
              previewTrajectory[i].y,
            );
        for (let i = 0; i < previewTrajectory.length; i += 20)
          g.strokeCircle(previewTrajectory[i].x, previewTrajectory[i].y, 3);
      }
    }
    drawEntity(e: Entity & Partial<Live>, x: number, y: number) {
      const ink = entityInk(e);
      const g = this.graphics,
        w = e.width,
        h = e.height,
        t = reducedMotion ? 0 : this.elapsed,
        bob = mode === "play" && !reducedMotion ? Math.sin(t * 2 + e.x) * 3 : 0;
      if (e.behaviors.portableLight) {
        for (let i = 4; i > 0; i--) {
          g.fillStyle(ink(0xf5db86), 0.018);
          g.fillCircle(x + w / 2, y + h / 2, (e.behaviors.lightRadius * i) / 4);
        }
      }
      if (e.kind === "player") {
        const walking = mode === "play" && Math.abs(e.vx ?? 0) > 10,
          step = walking ? Math.sin(t * 18) * 4 : 0;
        g.fillStyle(ink(0x173a40), 0.24);
        g.fillEllipse(x + w / 2, y + h + 3, w + 6, 9);
        g.fillStyle(ink(0x1f696d));
        g.fillRoundedRect(x + 5, y + h - 13 + step, 12, 16, 5);
        g.fillRoundedRect(x + w - 17, y + h - 13 - step, 12, 16, 5);
        g.fillStyle(ink(0xb9ddbd));
        g.fillRoundedRect(x + 4, y + 8, w - 8, h - 15, e.appearance.variant === "spiky" ? 7 : e.appearance.variant === "round" ? w / 2 : 15);
        g.fillStyle(ink(0x73bda5));
        g.fillRoundedRect(x, y + 21, w, 28, 13);
        g.fillStyle(ink(0xb9ddbd));
        if (e.appearance.variant === "round") {
          g.fillCircle(x + 8, y + 9, 10);
          g.fillCircle(x + w - 8, y + 9, 10);
          g.fillStyle(ink(0x8bb89f));
          g.fillCircle(x + 8, y + 9, 5);
          g.fillCircle(x + w - 8, y + 9, 5);
        } else if (e.appearance.variant === "spiky") {
          for (let i = 0; i < 4; i++) g.fillTriangle(x + 4 + i * (w - 8) / 4, y + 15, x + 8 + i * (w - 8) / 4, y - 9 - (i % 2) * 4, x + 15 + i * (w - 8) / 4, y + 15);
        } else {
          g.fillEllipse(x + 10, y + 4, 11, 24);
          g.fillEllipse(x + w - 10, y + 2, 10, 26);
          g.fillStyle(ink(0x8bb89f));
          g.fillEllipse(x + 10, y + 3, 4, 13);
          g.fillEllipse(x + w - 10, y + 1, 4, 15);
        }
        g.fillStyle(ink(0xe5edc9));
        g.fillEllipse(x + w / 2, y + 25, w - 10, 23);
        const f = mode === "play" ? this.facing : 1;
        g.fillStyle(ink(0x173f43));
        g.fillEllipse(x + w / 2 - 6 + f * 2, y + 23, 3.5, 6);
        g.fillEllipse(x + w / 2 + 7 + f * 2, y + 23, 3.5, 6);
        g.fillStyle(ink(0xe6a4a8));
        g.fillEllipse(x + 8, y + 29, 6, 3);
        g.fillEllipse(x + w - 8, y + 29, 6, 3);
        g.lineStyle(1.5, ink(0x326366));
        g.lineBetween(x + w / 2 - 2, y + 30, x + w / 2 + 2, y + 30);
        g.fillStyle(ink(0xe5989c));
        g.fillRoundedRect(x + 3, y + 35, w - 6, 7, 3);
        g.fillTriangle(
          x + 6,
          y + 39,
          x - 12,
          y + 46 + Math.sin(t * 5) * 3,
          x + 4,
          y + 48,
        );
        if (e.behaviors.floatSeconds > 0) {
          g.fillStyle(ink(0xe6edbd), 0.4);
          g.fillEllipse(x + w / 2, y + h + 10, w + 18, 5);
          if (
            mode === "play" &&
            this.floatUsed > 0 &&
            this.floatUsed < e.behaviors.floatSeconds
          ) {
            for (let i = 0; i < 5; i++) {
              g.fillStyle(ink(0xe5f9d0), 0.4);
              g.fillCircle(
                x - 7 + i * 13,
                y + h + 10 + Math.sin(t * 5 + i) * 5,
                2,
              );
            }
          }
        }
      } else if (e.kind === "plant") {
        g.lineStyle(4, ink(0x73ac7b));
        g.lineBetween(x + w / 2, y + h - 10, x + w / 2, y + 7);
        g.fillStyle(ink(0x8fbd82));
        g.fillEllipse(x + w / 2 - 9, y + 14, 23, 10);
        g.fillEllipse(x + w / 2 + 7, y + 7, 20, 10);
        g.fillStyle(ink(e.behaviors.throwable ? 0xf4c587 : 0xca99b5));
        g.fillRoundedRect(x + 3, y + h - 24, w - 6, 24, 9);
        g.fillStyle(ink(0xd99582));
        g.fillEllipse(x + w / 2, y + h - 20, w - 2, 9);
        if (e.behaviors.throwable) {
          g.lineStyle(2, ink(0xffdfaa));
          g.strokeEllipse(x + 1, y + h - 14, 7, 10);
          g.strokeEllipse(x + w - 1, y + h - 14, 7, 10);
        }
        g.fillStyle(ink(0x493c48));
        g.fillCircle(x + w / 2 - 4, y + h - 12, 1.5);
        g.fillCircle(x + w / 2 + 4, y + h - 12, 1.5);
      } else if (e.kind === "enemy") {
        if (e.transformed) {
          g.fillStyle(ink(0x88d4a7));
          g.fillRoundedRect(x, y + 12, w, 15, 7);
          g.fillStyle(ink(0xe3b1cf));
          g.fillEllipse(x + w / 2, y + 8 + Math.sin(t * 7) * 2, w + 7, 18);
          g.fillStyle(ink(0xffdfeb));
          g.fillEllipse(x + w / 2, y + 4, w - 7, 6);
          g.lineStyle(2, ink(0x4b836b));
          g.lineBetween(x + 10, y + 22, x + 14, y + 31);
          g.lineBetween(x + w - 10, y + 22, x + w - 14, y + 31);
        } else {
          const afraid =
            e.behaviors.fearsLight &&
            this.bodies.some(
              (l) =>
                l.behaviors.portableLight &&
                Math.hypot(l.x - x, l.y - y) < l.behaviors.lightRadius,
            );
          g.fillStyle(ink(0x1c3641), 0.25);
          g.fillEllipse(x + w / 2, y + h, w + 8, 8);
          g.fillStyle(ink(0x4a3d68));
          g.fillRoundedRect(x + 4, y + h - 8, w - 8, 10, 4);
          g.fillStyle(ink(afraid ? 0xaf91ca : 0x89749d));
          g.fillRoundedRect(x, y + 8 + Math.sin(t * 5 + x) * 2, w, h - 12, e.appearance.variant === "round" ? w / 2 : e.appearance.variant === "spiky" ? 6 : 14);
          if (e.appearance.variant === "spiky") for (let i = 0; i < 5; i++) g.fillTriangle(x + i * w / 5, y + 15, x + (i + .5) * w / 5, y - 3 - (i % 2) * 3, x + (i + 1) * w / 5, y + 15);
          else if (e.appearance.variant === "round") {
            g.fillCircle(x + 6, y + 9, 7);
            g.fillCircle(x + w - 6, y + 9, 7);
          }
          g.fillStyle(ink(0xaca0b9));
          g.fillEllipse(x + w / 2, y + 12, w - 2, 18);
          g.fillStyle(ink(0xe6d6cb));
          g.fillEllipse(x + w / 2 - 7, y + 24, 8, 10);
          g.fillEllipse(x + w / 2 + 7, y + 24, 8, 10);
          g.fillStyle(ink(0x342e46));
          g.fillCircle(x + w / 2 - 6 + (e.direction ?? 1) * 2, y + 25, 2);
          g.fillCircle(x + w / 2 + 8 + (e.direction ?? 1) * 2, y + 25, 2);
          g.lineStyle(2, ink(0x4e4661));
          if (!afraid) {
            g.lineBetween(x + 7, y + 16, x + 17, y + 20);
            g.lineBetween(x + w - 7, y + 16, x + w - 17, y + 20);
          }
          if (afraid) {
            g.lineStyle(2, ink(0xe9d4f0), 0.8);
            g.lineBetween(x - 5, y + 6, x - 10, y);
            g.lineBetween(x + w + 5, y + 6, x + w + 10, y);
            g.fillStyle(ink(0xc5dfeb));
            g.fillEllipse(x + w + 3, y + 17, 4, 7);
          }
          g.fillStyle(ink(0xc39fac));
          g.fillEllipse(x + w / 2, y + 34, 8, afraid ? 7 : 3);
        }
      } else if (e.kind === "star") {
        const cy = y + h / 2 + bob;
        g.fillStyle(ink(0xffdf91), 0.06);
        g.fillCircle(x + w / 2, cy, 34);
        g.fillStyle(ink(0xffdc89), 0.12);
        g.fillCircle(x + w / 2, cy, 23);
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5,
            r = i % 2 ? (e.appearance.variant === "round" ? 11 : 7) : (e.appearance.variant === "spiky" ? 19 : 16);
          pts.push({ x: x + w / 2 + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        g.fillStyle(ink(0xffe4a4));
        g.fillPoints(pts, true);
        g.fillStyle(ink(0x976d64));
        g.fillCircle(x + w / 2 - 3, cy, 1.2);
        g.fillCircle(x + w / 2 + 3, cy, 1.2);
      } else if (e.kind === "platform") {
        g.fillStyle(ink(0x3a5f60));
        g.fillRoundedRect(x, y, w, h, 9);
        g.fillStyle(ink(0x87b6a6));
        g.fillRoundedRect(x, y, w, 9, 4);
        g.lineStyle(2, ink(0xadcbb2), 0.7);
        g.lineBetween(x + 12, y + 14, x + w - 12, y + 14);
        g.fillStyle(ink(0xc7b69f));
        g.fillCircle(x + 12, y + 16, 3);
        g.fillCircle(x + w - 12, y + 16, 3);
      } else if (e.kind === "checkpoint") {
        const active = this.checkpoint === e.id;
        g.fillStyle(ink(0x546b62));
        g.fillRoundedRect(x + w / 2 - 4, y + 4, 8, h - 4, 3);
        g.fillStyle(ink(active ? 0xe9db9b : 0x95bdab));
        g.fillTriangle(
          x + w / 2,
          y + 3,
          x + w / 2 + 28,
          y + 12 + Math.sin(t * 3) * 2,
          x + w / 2,
          y + 28,
        );
        g.fillStyle(ink(active ? 0xffe6a1 : 0x97b2a4));
        g.fillCircle(x + w / 2, y + 2, 6);
        if (active) {
          g.fillStyle(ink(0xffe9ad), 0.08);
          g.fillCircle(x + w / 2, y + 2, 35);
        }
        g.fillStyle(ink(0x597c6c));
        g.fillEllipse(x + w / 2, y + h, w, 10);
      } else if (e.kind === "lantern") {
        g.lineStyle(3, ink(0xc3a77c));
        g.strokeCircle(x + w / 2, y + 7, 8);
        g.fillStyle(ink(0xdec998));
        g.fillRoundedRect(x + 4, y + 12, w - 8, h - 15, 5);
        g.fillStyle(ink(0xffe7a0));
        g.fillRect(x + 8, y + 17, w - 16, h - 25);
        g.fillStyle(ink(0x8b7663));
        g.fillRect(x + 1, y + h - 8, w - 2, 6);
        g.fillRect(x + 1, y + 11, w - 2, 5);
      } else if (e.kind === "exit") {
        const open = this.stars.size >= e.behaviors.requiredStars;
        g.fillStyle(ink(0x203f43), 0.8);
        g.fillRoundedRect(x, y, w, h, { tl: w / 2, tr: w / 2, bl: 4, br: 4 });
        g.lineStyle(8, ink(0x92ae8e));
        g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, {
          tl: w / 2,
          tr: w / 2,
          bl: 4,
          br: 4,
        });
        g.fillStyle(ink(open ? 0xecdca0 : 0x51736c), open ? 0.5 : 0.7);
        g.fillRoundedRect(x + 12, y + 15, w - 24, h - 20, {
          tl: 25,
          tr: 25,
          bl: 2,
          br: 2,
        });
        if (!open) {
          g.lineStyle(3, ink(0x9ab496));
          for (let k = 1; k < 4; k++)
            g.lineBetween(x + (w * k) / 4, y + 22, x + (w * k) / 4, y + h - 5);
        } else {
          g.fillStyle(ink(0xffe5a9), 0.05);
          g.fillCircle(x + w / 2, y + h / 2, 90);
        }
        for (let i = 0; i < e.behaviors.requiredStars; i++) {
          g.fillStyle(ink(i < this.stars.size ? 0xffdfa1 : 0x587c72));
          g.fillCircle(
            x + w / 2 + (i - (e.behaviors.requiredStars - 1) / 2) * 16,
            y - 14,
            4,
          );
        }
      } else {
        g.lineStyle(3, ink(0x78a388));
        g.lineBetween(x + w / 2, y + h, x + w / 2, y + 8);
        g.fillStyle(ink(0x8eb896));
        g.fillEllipse(x + w / 2 - 8, y + h / 2, w * 0.8, 12);
        g.fillEllipse(x + w / 2 + 8, y + h / 2 - 13, w * 0.8, 12);
        g.fillStyle(ink(0xd7abc1));
        for (let i = 0; i < 5; i++)
          g.fillCircle(
            x + w / 2 + Math.cos(i * 1.256) * 8,
            y + 8 + Math.sin(i * 1.256) * 8,
            6,
          );
        g.fillStyle(ink(0xedd8a2));
        g.fillCircle(x + w / 2, y + 8, 5);
      }
      const appearance = e.appearance;
      if (appearance.variant === "spiky" && !["player", "enemy", "star"].includes(e.kind)) {
        g.fillStyle(ink(0xd7abc1));
        for (let i = 0; i < 3; i++) g.fillTriangle(x + w / 2 - 11 + i * 8, y + 12, x + w / 2 - 7 + i * 8, y - 3, x + w / 2 - 3 + i * 8, y + 12);
      } else if (appearance.variant === "round" && !["player", "enemy", "star"].includes(e.kind)) {
        g.lineStyle(2, ink(0xffdfaa), .6);
        g.strokeEllipse(x + w / 2, y + h * .7, Math.max(8, w - 8), Math.min(18, h * .4));
      }
      // Patterns stay low on the body so eyes and interaction feedback remain readable.
      if (appearance.pattern !== "plain") {
        g.fillStyle(ink(0xffdfaa), .55);
        g.lineStyle(2, ink(0xffdfaa), .5);
        if (appearance.pattern === "spots") {
          for (let i = 0; i < 3; i++) g.fillCircle(x + w * (.25 + i * .25), y + h * .76 + (i % 2 ? 4 : -1), Math.min(3, w / 14));
        } else {
          for (let i = 0; i < 3; i++) g.lineBetween(x + w * .22, y + h * .68 + i * 4, x + w * .78, y + h * .68 + i * 4);
        }
      }
      if (appearance.accessory === "leaf") {
        g.lineStyle(2, ink(0x73ac7b));
        g.lineBetween(x + w / 2, y + 5, x + w / 2 + 3, y - 10);
        g.fillStyle(ink(0x73bda5));
        g.fillEllipse(x + w / 2 + 9, y - 9, 18, 8);
        g.fillEllipse(x + w / 2 - 4, y - 5, 13, 7);
      } else if (appearance.accessory === "crown") {
        g.fillStyle(ink(0xffe7a0));
        g.fillPoints([{x:x+w/2-13,y:y+4},{x:x+w/2-15,y:y-10},{x:x+w/2-5,y:y-5},{x:x+w/2,y:y-16},{x:x+w/2+6,y:y-5},{x:x+w/2+15,y:y-10},{x:x+w/2+13,y:y+4}],true);
        g.fillStyle(ink(0xd7abc1));
        g.fillCircle(x + w / 2, y - 4, 2);
      } else if (appearance.accessory === "scarf") {
        g.fillStyle(ink(0xe5989c));
        g.fillRoundedRect(x + 1, y + h * .62, Math.max(8, w - 2), Math.max(5, h * .12), 3);
        g.fillTriangle(x + w - 5, y + h * .68, x + w + 12, y + h * .8 + Math.sin(t * 4) * 2, x + w - 4, y + h * .85);
      }
      if (mode === "edit" && e.locked) {
        g.fillStyle(ink(0xe9b777), 0.9);
        g.fillRoundedRect(x + w - 10, y - 4, 12, 10, 2);
        g.lineStyle(2, ink(0xe9b777));
        g.strokeCircle(x + w - 4, y - 5, 4);
      }
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    backgroundColor: "#142e43",
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: container.clientWidth || 1280,
      height: container.clientHeight || 720,
    },
    scene: GardenScene,
    audio: { noAudio: true },
    banner: false,
  });
  return {
    setProject(next: Project, options: ReconcileOptions = {}) {
      const impact = deriveEditImpact(project, next, options);
      if (ready) {
        if (options.resetProgress) {
          scene!.checkpoint = null;
          scene!.stars.clear();
        }
        scene!.reconcile(next, impact);
      } else project = structuredClone(next);
      return impact;
    },
    setPreview(
      next: EditImpact | null,
      trajectory: { x: number; y: number }[] = [],
    ) {
      preview = next ? structuredClone(next) : null;
      previewTrajectory = trajectory.map((p) => ({ ...p }));
      if (!next && scene && cameraBookmark !== null) {
        scene.cameraX = cameraBookmark;
        cameraBookmark = null;
      }
    },
    focusPreview() {
      if (!scene || !preview) return;
      const bounds = [
        ...preview.entityChanges,
        ...preview.terrainChanges,
      ].flatMap((c) => {
        const geometry =
          !c.before ||
          !c.after ||
          c.fields.some((f) =>
            ["x", "y", "width", "height", "kind"].includes(f),
          );
        const live = !geometry ? scene!.bounds(c.id) : undefined;
        return live ? [live] : c.after ? [c.after] : c.before ? [c.before] : [];
      });
      if (!bounds.length) return;
      cameraBookmark ??= scene.cameraX;
      const min = Math.min(...bounds.map((e) => e.x)),
        max = Math.max(...bounds.map((e) => e.x + e.width));
      scene.cameraX = clamp(
        (min + max - scene.viewWidth()) / 2,
        0,
        Math.max(0, project.world.width - scene.viewWidth()),
      );
    },
    replayEvidence(evidence: ReachabilityEvidence) {
      if (!scene || !ready) throw new Error("The game is still loading.");
      return scene.beginReplay(evidence);
    },
    cancelReplay() {
      scene?.cancelReplay();
    },
    setMode(next: "play" | "edit") {
      if (next === mode) return;
      scene?.cancelReplay();
      mode = next;
      scene?.keys.clear();
      scene?.releaseTouch();
      scene?.pressed.clear();
      if (scene) scene.buffer = 0;
      if (next === "edit")
        scene?.note("Select a little thing. Make it your own.");
    },
    setTouchInput(input: TouchInput) {
      scene?.setTouch(input);
    },
    touchInteract() {
      if (scene && mode === "play" && !isTyping() && !document.hidden) scene.pressed.add("TouchInteract");
    },
    releaseTouchInput() {
      scene?.releaseTouch();
      if (scene) scene.buffer = 0;
    },
    setMuted(next: boolean) {
      muted = next;
    },
    setTool(next: GameTool) {
      tool = next;
    },
    setSelection(id: string | null) {
      selected = id;
      const e =
        scene?.bounds(id ?? "") ??
        project.entities.find((e) => e.id === id) ??
        project.terrain.find((t) => t.id === id);
      if (
        scene &&
        e &&
        (e.x < scene.cameraX + 20 ||
          e.x + e.width > scene.cameraX + scene.viewWidth() - 20)
      )
        scene.cameraX = clamp(
          e.x + e.width / 2 - scene.viewWidth() / 2,
          0,
          Math.max(0, project.world.width - scene.viewWidth()),
        );
    },
    restart(checkpoint = false) {
      if (ready) {
        scene!.reset(checkpoint);
        scene!.note(
          checkpoint ? "Back to your checkpoint." : "A fresh garden. Let’s go!",
        );
      }
    },
    getDebugState() {
      return scene
        ? {
            mode,
            health: scene.health,
            deaths: scene.deaths,
            carrying: scene.carrying,
            touchInput: [...scene.touchKeys],
            floatUsed: scene.floatUsed,
            elapsed: scene.elapsed,
            previewVisible: !!preview,
            replaying: !!scene.replay,
            replayFrame: scene.replay?.frame ?? 0,
            replayTotal: scene.replay?.total ?? 0,
            lastReplayResult: scene.lastReplayResult,
            player: scene.player
              ? {
                  x: scene.player.x,
                  y: scene.player.y,
                  vx: scene.player.vx,
                  vy: scene.player.vy,
                  grounded: scene.player.grounded,
                }
              : null,
            entities: scene.bodies.map((e) => ({
              id: e.id,
              kind: e.kind,
              x: e.x,
              y: e.y,
              active: e.active,
              transformed: e.transformed,
              thrown: e.thrown,
              appearance: structuredClone(e.appearance),
            })),
            stars: [...scene.stars],
            checkpoint: scene.checkpoint,
            won: scene.won,
            cameraX: scene.cameraX,
          }
        : null;
    },
    destroy() {
      scene?.blur();
      game.destroy(true);
    },
  };
}
