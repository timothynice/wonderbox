import {
  entitySchema,
  projectSchema,
  type Entity,
  type EntityKind,
  type Behaviors,
  type Project,
} from "./model";

export function makeEntity(
  kind: EntityKind,
  x: number,
  y: number,
  id = `${kind}-${crypto.randomUUID().slice(0, 8)}`,
  overrides: Partial<Omit<Entity, "behaviors">> & {
    behaviors?: Partial<Behaviors>;
  } = {},
): Entity {
  const sizes: Record<EntityKind, [number, number]> = {
    player: [40, 56],
    plant: [32, 40],
    enemy: [44, 40],
    star: [28, 28],
    platform: [112, 20],
    checkpoint: [32, 64],
    exit: [72, 104],
    lantern: [28, 38],
    decoration: [40, 56],
  };
  const [width, height] = sizes[kind];
  return entitySchema.parse({
    id,
    kind,
    name: kind[0].toUpperCase() + kind.slice(1),
    x,
    y,
    width,
    height,
    locked: false,
    ...overrides,
    behaviors: overrides.behaviors ?? {},
  });
}

export function createStarterProject(): Project {
  return projectSchema.parse({
    version: 1,
    id: "moonlight-garden",
    name: "Moonlight Garden",
    revision: 0,
    world: { width: 3200, height: 720, atmosphere: "day", gravity: 1500 },
    terrain: [
      { id: "garden-floor", x: 0, y: 620, width: 3200, height: 100 },
      { id: "first-step", x: 400, y: 520, width: 180, height: 24 },
      { id: "petal-step", x: 650, y: 438, width: 160, height: 24 },
      { id: "optional-float-ledge", x: 300, y: 320, width: 150, height: 24 },
      { id: "lantern-terrace", x: 1120, y: 520, width: 250, height: 24 },
      { id: "bounce-perch", x: 1720, y: 350, width: 180, height: 24 },
      { id: "last-step", x: 2110, y: 520, width: 170, height: 24 },
      { id: "star-terrace", x: 2340, y: 438, width: 190, height: 24 },
      { id: "exit-step", x: 2700, y: 548, width: 120, height: 24 },
    ],
    entities: [
      makeEntity("player", 100, 564, "pip", { name: "Pip · garden dreamer" }),
      makeEntity("plant", 250, 580, "demo-plant", { name: "Turnip sprout" }),
      makeEntity("plant", 910, 580, "toss-plant", {
        name: "Tossable sprout",
        behaviors: { throwable: true },
      }),
      makeEntity("enemy", 1020, 580, "practice-puff", {
        name: "Practice puff",
        behaviors: {
          patrolSpeed: 0,
          patrolRange: 0,
          transformOnHit: true,
          bounceSpeed: 900,
        },
      }),
      makeEntity("plant", 1410, 580, "bounce-plant", {
        name: "Moonroot",
        behaviors: { throwable: true },
      }),
      makeEntity("enemy", 1550, 580, "mossling", {
        name: "Mossling",
        behaviors: { patrolSpeed: 45, patrolRange: 90 },
      }),
      makeEntity("enemy", 1920, 580, "shadebug", {
        name: "Shadebug",
        behaviors: { patrolSpeed: 52, patrolRange: 90 },
      }),
      makeEntity("enemy", 2600, 580, "nightling", {
        name: "Nightling",
        behaviors: { patrolSpeed: 38, patrolRange: 75 },
      }),
      makeEntity("star", 470, 474, "star-one", { name: "First wish" }),
      makeEntity("star", 1190, 474, "star-two", { name: "Lantern wish" }),
      makeEntity("star", 2410, 392, "star-three", { name: "Last wish" }),
      makeEntity("platform", 850, 460, "drifting-leaf", {
        name: "Drifting leaf",
        behaviors: { moveAxis: "y", moveDistance: 110, moveSpeed: 45 },
      }),
      makeEntity("lantern", 1240, 482, "garden-lantern", {
        name: "Pocket lantern",
        behaviors: { portableLight: true, throwable: true, lightRadius: 210 },
      }),
      makeEntity("checkpoint", 1710, 556, "checkpoint", {
        name: "Wishing bell",
      }),
      makeEntity("exit", 3020, 516, "exit", {
        name: "Starlight gate",
        behaviors: { requiredStars: 3 },
      }),
      makeEntity("decoration", 345, 266, "optional-bloom", {
        name: "Secret moonflower",
      }),
    ],
  });
}
export const starterProject = createStarterProject;
