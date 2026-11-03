import { z } from 'zod';
import { type Project, type Terrain } from './model.js';
import { overlaps, type Body, type Rect } from '../game/physics.js';
import { createMotionState, FIXED_STEP, MOTION_VERSION, stepPlayerMotion, type MotionInput, type MotionState } from './movement.js';

export const checkRequestSchema = z.object({ targetTerrainId: z.string().min(1).max(100), sourceTerrainId: z.string().min(1).max(100).optional() }).strict();
export type CheckRequest = z.infer<typeof checkRequestSchema>;
export type WitnessInput = { direction: -1 | 0 | 1; jumpHeld: boolean; jumpPressed: boolean; frames: number };
export type ReachabilityWitness = { start: Body; inputs: WitnessInput[]; points: { frame: number; x: number; y: number }[]; landings: string[]; durationSeconds: number };
export type ReachabilityEvidence = {
  status: 'route-found' | 'no-route-found' | 'unsupported' | 'inconclusive'; passed: boolean; summary: string;
  revision: number; mechanicsFingerprint: string; sourceTerrainId: string | null; targetTerrainId: string;
  limits: { timeStep: number; maxHops: number; maxStates: number; maxSteps: number; maxSurfaces: number; maxFramesPerTrajectory: number; corridorPadding: number; trajectories: number; steps: number };
  witness?: ReachabilityWitness;
};
const bodySchema = z.object({x:z.number(),y:z.number(),width:z.number().positive(),height:z.number().positive(),vx:z.number(),vy:z.number(),grounded:z.boolean()}).strict();
export const reachabilityEvidenceSchema = z.object({
  status:z.enum(['route-found','no-route-found','unsupported','inconclusive']),passed:z.boolean(),summary:z.string(),revision:z.number().int().nonnegative(),mechanicsFingerprint:z.string(),sourceTerrainId:z.string().nullable(),targetTerrainId:z.string(),
  limits:z.object({timeStep:z.number().positive(),maxHops:z.number().int(),maxStates:z.number().int(),maxSteps:z.number().int(),maxSurfaces:z.number().int(),maxFramesPerTrajectory:z.number().int(),corridorPadding:z.number(),trajectories:z.number().int(),steps:z.number().int()}).strict(),
  witness:z.object({start:bodySchema,inputs:z.array(z.object({direction:z.union([z.literal(-1),z.literal(0),z.literal(1)]),jumpHeld:z.boolean(),jumpPressed:z.boolean(),frames:z.number().int().positive()}).strict()),points:z.array(z.object({frame:z.number().int().nonnegative(),x:z.number(),y:z.number()}).strict()),landings:z.array(z.string()),durationSeconds:z.number().nonnegative()}).strict().optional(),
}).strict();
const MAX_HOPS = 6, MAX_STATES = 90, MAX_STEPS = 180_000, MAX_TERRAIN = 80;
export function mechanicsFingerprint(p: Project): string {
  const player = p.entities.find(e => e.kind === 'player');
  const value = JSON.stringify({ version: MOTION_VERSION, world: p.world, player, terrain: p.terrain, dynamics: p.entities.filter(e => e.kind === 'enemy' || e.kind === 'platform') });
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `${MOTION_VERSION}-${(hash >>> 0).toString(16)}`;
}
type Node = { body: Body; motion: MotionState; inputs: WitnessInput[]; points: ReachabilityWitness['points']; landings: string[]; frames: number; surface: Terrain; hops: number };
const copyNode = (n: Node): Node => structuredClone(n);
function surfaceBelow(p: Body, terrain: Terrain[]) {
  return terrain.find(t => p.x + p.width > t.x + 1 && p.x < t.x + t.width - 1 && Math.abs(p.y + p.height - t.y) < 0.1);
}
function appendInput(node: Node, input: MotionInput) {
  const last = node.inputs.at(-1), jumpPressed = !!input.jumpPressed;
  if (last && last.direction === input.direction && last.jumpHeld === input.jumpHeld && last.jumpPressed === jumpPressed && !jumpPressed) last.frames++;
  else node.inputs.push({ direction: input.direction, jumpHeld: input.jumpHeld, jumpPressed, frames: 1 });
}
/** Bounded witness search, not a proof of impossibility or a human difficulty rating. */
export function checkReachability(project: Project, rawRequest: CheckRequest): ReachabilityEvidence {
  const request = checkRequestSchema.parse(rawRequest);
  const target = project.terrain.find(t => t.id === request.targetTerrainId);
  const player = project.entities.find(e => e.kind === 'player')!;
  const start: Body = { x: player.x, y: player.y, width: player.width, height: player.height, vx: 0, vy: 0, grounded: false };
  let source = request.sourceTerrainId ? project.terrain.find(t => t.id === request.sourceTerrainId) : project.terrain.filter(t => t.y >= player.y + player.height - 1 && t.x < player.x + player.width && t.x + t.width > player.x).sort((a,b) => a.y - b.y)[0];
  const limits = { timeStep: FIXED_STEP, maxHops: MAX_HOPS, maxStates: MAX_STATES, maxSteps: MAX_STEPS, maxSurfaces: MAX_TERRAIN, maxFramesPerTrajectory: 900, corridorPadding: 350, trajectories: 0, steps: 0 };
  const base = { revision: project.revision, mechanicsFingerprint: mechanicsFingerprint(project), sourceTerrainId: source?.id ?? null, targetTerrainId: request.targetTerrainId, limits };
  const result = (status: ReachabilityEvidence['status'], summary: string, witness?: ReachabilityWitness): ReachabilityEvidence => ({ ...base, status, passed: status === 'route-found', summary, ...(witness ? { witness } : {}) });
  if (!target || !source) return result('unsupported', 'Choose existing source and target terrain. The spawn needs a static surface below it.');
  if (request.sourceTerrainId) { start.x = Math.max(source.x, Math.min(player.x, source.x + source.width - player.width)); start.y = source.y - player.height; }
  // A requested source is an explicit canonical standing position, not the current runtime/checkpoint position.
  else start.y = source.y - player.height;
  start.grounded = true;
  if (source.width < player.width || start.y < 0 || project.terrain.some(t => overlaps(start,t))) return result('unsupported', 'The source has no clear canonical standing position for this player.');
  const corridor: Rect = { x: Math.max(0, Math.min(start.x, target.x) - 350), y: 0, width: 0, height: project.world.height };
  corridor.width = Math.min(project.world.width, Math.max(start.x + start.width, target.x + target.width) + 350) - corridor.x;
  const terrain = project.terrain.filter(t => t.x < corridor.x + corridor.width && t.x + t.width > corridor.x);
  if (terrain.length > MAX_TERRAIN) return result('inconclusive', `This corridor exceeds the ${MAX_TERRAIN}-surface check budget.`);
  const dynamic = project.entities.find(e => {
    if (e.kind !== 'enemy' && e.kind !== 'platform') return false;
    const margin = e.kind === 'enemy' ? e.behaviors.patrolRange + 100 : e.behaviors.moveAxis === 'x' ? e.behaviors.moveDistance : 0;
    return overlaps({ x: e.x - margin, y: 0, width: e.width + margin * 2, height: project.world.height }, corridor);
  });
  if (dynamic) return result('unsupported', `${dynamic.name} can interfere in this corridor. This checker only verifies static terrain, not enemies, moving platforms, bounces or damage.`);
  const initial: Node = { body: { ...start }, motion: createMotionState(), inputs: [], points: [{ frame: 0, x: start.x, y: start.y }], landings: [source.id], frames: 0, surface: source, hops: 0 };
  const witness = (n: Node): ReachabilityWitness => ({ start, inputs: n.inputs, points: n.points, landings: n.landings, durationSeconds: n.frames * FIXED_STEP });
  if (source.id === target.id) return result('route-found', 'The canonical starting position is already on the target surface.', witness(initial));
  let exhausted = false;
  const advance = (n: Node, input: MotionInput) => {
    if (limits.steps >= MAX_STEPS) { exhausted = true; return; }
    limits.steps++;
    appendInput(n,input); stepPlayerMotion(n.body,n.motion,input,project.world,terrain,player.behaviors.floatSeconds);
    n.frames++;
    if (n.frames % 6 === 0 || n.body.grounded) n.points.push({ frame: n.frames, x: n.body.x, y: n.body.y });
  };
  const queue: Node[] = [initial], visited = new Set<string>([`${source.id}:${Math.round(start.x/30)}`]);
  let expanded = 0;
  while (queue.length && expanded < MAX_STATES && !exhausted) {
    const node = queue.shift()!; expanded++;
    if (node.hops >= MAX_HOPS) continue;
    const candidates = terrain.filter(t => t.id !== node.surface.id && t.y <= node.surface.y + 150 && Math.abs((t.x + t.width/2) - (node.body.x + node.body.width/2)) < 850).sort((a,b) => Math.abs(a.x-target.x)+Math.abs(a.y-target.y) - Math.abs(b.x-target.x)-Math.abs(b.y-target.y));
    for (const dest of candidates) for (const holdSeconds of [0.3, 0.8, 2.2]) {
      if (exhausted) break;
      limits.trajectories++;
      const n = copyNode(node);
      const right = dest.x + dest.width/2 >= n.body.x + n.body.width/2;
      const launch = Math.max(node.surface.x + 2, Math.min(right ? dest.x - 100 : dest.x + dest.width + 60, node.surface.x + node.surface.width - n.body.width - 2));
      for (let frame=0;frame<420 && !exhausted;frame++) {
        const dx = launch - n.body.x;
        const stop = n.body.vx * Math.abs(n.body.vx) / (2 * 2600);
        const direction = Math.abs(dx-stop)<3 ? 0 : Math.sign(dx-stop) as -1|1;
        advance(n,{direction,jumpHeld:false});
        if (Math.abs(dx)<5 && Math.abs(n.body.vx)<45) break;
        if (!n.body.grounded || surfaceBelow(n.body,project.terrain)?.id !== node.surface.id) break;
      }
      if (!n.body.grounded || exhausted) continue;
      const desiredX = dest.x + (dest.width-n.body.width)/2;
      let airborne = false;
      for (let frame=0;frame<480 && !exhausted;frame++) {
        const dx = desiredX-n.body.x, stop = n.body.vx*Math.abs(n.body.vx)/(2*2600);
        const direction = Math.abs(dx-stop)<4 ? 0 : Math.sign(dx-stop) as -1|1;
        advance(n,{direction,jumpHeld:frame*FIXED_STEP<holdSeconds,jumpPressed:frame===0});
        if (!n.body.grounded) airborne=true;
        if (n.body.y>project.world.height || n.body.x<corridor.x || n.body.x+n.body.width>corridor.x+corridor.width) break;
        if (airborne && n.body.grounded) {
          const landed = surfaceBelow(n.body,project.terrain);
          if (!landed || landed.id === node.surface.id) break;
          n.surface=landed;n.landings.push(landed.id);n.hops++;
          n.points.push({frame:n.frames,x:n.body.x,y:n.body.y});
          if (landed.id===target.id) {
            // A toe touching the edge for one frame is not a stable arrival.
            for(let settle=0;settle<100&&!exhausted;settle++) {
              const dx=target.x+(target.width-n.body.width)/2-n.body.x;
              const stop=n.body.vx*Math.abs(n.body.vx)/(2*2600);
              advance(n,{direction:Math.abs(dx-stop)<3?0:Math.sign(dx-stop) as -1|1,jumpHeld:false});
              if(!n.body.grounded||surfaceBelow(n.body,project.terrain)?.id!==target.id) break;
              const support=Math.min(n.body.x+n.body.width,target.x+target.width)-Math.max(n.body.x,target.x);
              if(settle>=10&&Math.abs(n.body.vx)<25&&support>=n.body.width*.75) {
                n.points.push({frame:n.frames,x:n.body.x,y:n.body.y});
                return result('route-found', `Found a ${n.hops}-jump static-terrain route with a stable landing. Replay the attached witness; this is not a human difficulty assessment.`,witness(n));
              }
            }
            break;
          }
          const key=`${landed.id}:${Math.round(n.body.x/30)}`;
          if (!visited.has(key)) {visited.add(key);queue.push(n);}
          break;
        }
      }
    }
  }
  return exhausted || queue.length ? result('inconclusive','The bounded search budget was exhausted. No impossibility claim is made.') : result('no-route-found','No route was found by the bounded static-terrain policies. This does not prove the jump impossible; try a small intermediate step or inspect the geometry.');
}
export const checkProject = checkReachability;

/** Deterministic replay uses exactly the same production motion, not sampled path interpolation. */
export function replayWitness(project: Project, witness: ReachabilityWitness) {
  const body={...witness.start}, motion=createMotionState();
  const float=project.entities.find(e=>e.kind==='player')!.behaviors.floatSeconds;
  for(const input of witness.inputs) for(let i=0;i<input.frames;i++) stepPlayerMotion(body,motion,input,project.world,project.terrain,float);
  return body;
}
