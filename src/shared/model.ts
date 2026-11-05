import { z } from "zod";

export const behaviorSchema = z
  .object({
    floatSeconds: z.number().min(0).max(2).default(0),
    throwable: z.boolean().default(false),
    portableLight: z.boolean().default(false),
    lightRadius: z.number().min(40).max(400).default(180),
    fearsLight: z.boolean().default(false),
    transformOnHit: z.boolean().default(false),
    bounceSpeed: z.number().min(300).max(1100).default(900),
    patrolSpeed: z.number().min(0).max(180).default(55),
    patrolRange: z.number().min(0).max(500).default(100),
    moveAxis: z.enum(["x", "y"]).default("x"),
    moveDistance: z.number().min(0).max(500).default(140),
    moveSpeed: z.number().min(0).max(200).default(65),
    requiredStars: z.number().int().min(0).max(30).default(3),
  })
  .strict();
/** Curated original procedural art. Colors and silhouettes never change collision geometry. */
export const ART_PALETTES = ["original", "mint", "lavender", "coral", "gold", "sky"] as const;
export const ART_VARIANTS = ["classic", "round", "spiky"] as const;
export const ART_PATTERNS = ["plain", "spots", "stripes"] as const;
export const ART_ACCESSORIES = ["none", "leaf", "crown", "scarf"] as const;
export const WORLD_THEMES = ["garden", "autumn", "candy", "aurora"] as const;
export const TERRAIN_STYLES = ["moss", "stone", "crystal"] as const;
const artColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color such as #b49ae8.").nullable();
export const appearanceSchema = z.object({
  palette: z.enum(ART_PALETTES).default("original"),
  variant: z.enum(ART_VARIANTS).default("classic"),
  pattern: z.enum(ART_PATTERNS).default("plain"),
  accessory: z.enum(ART_ACCESSORIES).default("none"),
  primaryColor: artColorSchema.default(null),
  accentColor: artColorSchema.default(null),
}).strict();
export const appearancePatchSchema = z.object({
  palette: appearanceSchema.shape.palette.removeDefault().optional(),
  variant: appearanceSchema.shape.variant.removeDefault().optional(),
  pattern: appearanceSchema.shape.pattern.removeDefault().optional(),
  accessory: appearanceSchema.shape.accessory.removeDefault().optional(),
  primaryColor: appearanceSchema.shape.primaryColor.removeDefault().optional(),
  accentColor: appearanceSchema.shape.accentColor.removeDefault().optional(),
}).strict();
export type Appearance = z.infer<typeof appearanceSchema>;
export const DEFAULT_APPEARANCE: Appearance = appearanceSchema.parse({});

export const entityKindSchema = z.enum([
  "player",
  "plant",
  "enemy",
  "star",
  "platform",
  "checkpoint",
  "exit",
  "lantern",
  "decoration",
]);
const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const entitySchema = z
  .object({
    id: idSchema,
    kind: entityKindSchema,
    name: z.string().min(1).max(80),
    x: z.number().min(0).max(6400),
    y: z.number().min(0).max(1440),
    width: z.number().min(12).max(320),
    height: z.number().min(12).max(320),
    locked: z.boolean().default(false),
    behaviors: behaviorSchema.prefault({}),
    appearance: appearanceSchema.prefault({}),
  })
  .strict();
export const terrainSchema = z
  .object({
    id: idSchema,
    x: z.number().min(0).max(6400),
    y: z.number().min(0).max(1440),
    width: z.number().min(8).max(6400),
    height: z.number().min(8).max(1440),
  })
  .strict();
export const worldSchema = z
  .object({
    width: z.number().int().min(960).max(6400).default(3200),
    height: z.number().int().min(540).max(1440).default(720),
    atmosphere: z.enum(["day", "moonlight"]).default("moonlight"),
    theme: z.enum(WORLD_THEMES).default("garden"),
    terrainStyle: z.enum(TERRAIN_STYLES).default("moss"),
    foliageDensity: z.number().min(0).max(1).default(1),
    starDensity: z.number().min(0).max(1).default(1),
    gravity: z.number().min(700).max(2200).default(1500),
  })
  .strict();
// Zod 4 applies defaults inside partial objects. Mutation patches must use the
// underlying validators, otherwise editing one field silently resets siblings.
export const behaviorPatchSchema = z
  .object({
    floatSeconds: behaviorSchema.shape.floatSeconds.removeDefault().optional(),
    throwable: behaviorSchema.shape.throwable.removeDefault().optional(),
    portableLight: behaviorSchema.shape.portableLight
      .removeDefault()
      .optional(),
    lightRadius: behaviorSchema.shape.lightRadius.removeDefault().optional(),
    fearsLight: behaviorSchema.shape.fearsLight.removeDefault().optional(),
    transformOnHit: behaviorSchema.shape.transformOnHit
      .removeDefault()
      .optional(),
    bounceSpeed: behaviorSchema.shape.bounceSpeed.removeDefault().optional(),
    patrolSpeed: behaviorSchema.shape.patrolSpeed.removeDefault().optional(),
    patrolRange: behaviorSchema.shape.patrolRange.removeDefault().optional(),
    moveAxis: behaviorSchema.shape.moveAxis.removeDefault().optional(),
    moveDistance: behaviorSchema.shape.moveDistance.removeDefault().optional(),
    moveSpeed: behaviorSchema.shape.moveSpeed.removeDefault().optional(),
    requiredStars: behaviorSchema.shape.requiredStars
      .removeDefault()
      .optional(),
  })
  .strict();
export const worldPatchSchema = z
  .object({
    width: worldSchema.shape.width.removeDefault().optional(),
    height: worldSchema.shape.height.removeDefault().optional(),
    atmosphere: worldSchema.shape.atmosphere.removeDefault().optional(),
    theme: worldSchema.shape.theme.removeDefault().optional(),
    terrainStyle: worldSchema.shape.terrainStyle.removeDefault().optional(),
    foliageDensity: worldSchema.shape.foliageDensity.removeDefault().optional(),
    starDensity: worldSchema.shape.starDensity.removeDefault().optional(),
    gravity: worldSchema.shape.gravity.removeDefault().optional(),
  })
  .strict();
export const projectSchema = z
  .object({
    version: z.literal(1),
    id: idSchema,
    name: z.string().min(1).max(80),
    revision: z.number().int().nonnegative(),
    world: worldSchema,
    terrain: z.array(terrainSchema).max(1200),
    entities: z.array(entitySchema).min(2).max(300),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = [...p.entities, ...p.terrain].map((e) => e.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Every object and terrain tile needs a unique ID.",
      });
    if (p.entities.filter((e) => e.kind === "player").length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "A world needs exactly one player spawn.",
      });
    if (p.entities.filter((e) => e.kind === "exit").length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "A world needs exactly one exit.",
      });
    for (const e of [...p.entities, ...p.terrain]) {
      if (e.x + e.width > p.world.width || e.y + e.height > p.world.height)
        ctx.addIssue({
          code: "custom",
          message: `${e.id} falls outside the world.`,
        });
    }
  });
export type Behaviors = z.infer<typeof behaviorSchema>;
export type Behavior = Behaviors;
export type Entity = z.infer<typeof entitySchema>;
export type EntityKind = Entity["kind"];
export type Terrain = z.infer<typeof terrainSchema>;
export type WorldSettings = z.infer<typeof worldSchema>;
export type Project = z.infer<typeof projectSchema>;
export const cloneProject = (p: Project): Project => structuredClone(p);
export const serializeProject = (p: Project): string =>
  JSON.stringify(projectSchema.parse(p), null, 2);
export function parseProject(input: string | unknown): Project {
  if (typeof input === "string" && input.length > 2_000_000)
    throw new Error("Project file exceeds 2 MB.");
  return projectSchema.parse(
    typeof input === "string" ? JSON.parse(input) : input,
  );
}
