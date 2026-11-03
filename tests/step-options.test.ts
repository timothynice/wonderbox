import { describe, it, expect } from 'vitest';
import planStep from '../actions/plan-static-step';
import applyEdit from '../actions/apply-transaction';
import { createStarterProject } from '../src/shared/starter';
import { replayWitness } from '../src/shared/reachability';

const check = { targetTerrainId: 'optional-float-ledge' };
describe('bounded mechanical step planning', () => {
  it('offers pure, bounded options that Apply rechecks and production motion replays', async () => {
    const project = createStarterProject(); project.entities[0].locked = true;
    const before = structuredClone(project);
    const result = await planStep.run({ project, check });
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.options.length).toBeLessThanOrEqual(3);
    expect(result.attempts).toBeLessThanOrEqual(result.maxAttempts);
    expect(project).toEqual(before);
    for (const option of result.options) {
      expect(option.preview.baseRevision).toBe(0);
      const applied = await applyEdit.run({ project, actions: option.actions, expectedRevision: 0, source: 'ai', approved: true, checkRequest: check });
      expect(applied.evidence?.passed).toBe(true);
      expect(applied.project.entities).toEqual(before.entities);
      expect(replayWitness(applied.project, option.evidence.witness!).y).toBe(264);
      await expect(applyEdit.run({ project: applied.project, actions: option.actions, expectedRevision: 0, source: 'ai', approved: true, checkRequest: check })).rejects.toThrow(/revision|changed/i);
    }
  });
  it('does not invent options for unsupported dynamics or an already satisfied goal', async () => {
    const dynamic = createStarterProject(); dynamic.entities.find(e => e.kind === 'enemy')!.x = 340;
    const unsupported = await planStep.run({ project: dynamic, check });
    expect(unsupported.baseline.status).toBe('unsupported');expect(unsupported.options).toEqual([]);expect(unsupported.attempts).toBe(0);
    const project = createStarterProject(); project.entities[0].behaviors.floatSeconds = .8;
    const satisfied = await planStep.run({ project, check });
    expect(satisfied.baseline.passed).toBe(true);expect(satisfied.options).toEqual([]);
  });
  it('derives geometry from renamed and translated authored content', async () => {
    const project = createStarterProject();
    project.entities = project.entities.map(e => ({ ...e, id: `other-${e.id}`, x: e.x + 40 }));
    project.terrain = project.terrain.map(t => ({ ...t, id: `other-${t.id}`, x: t.x + 40 }));
    project.world.width += 40;
    const result = await planStep.run({ project, check: { targetTerrainId: `other-${check.targetTerrainId}` } });
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.options.every(o => o.evidence.passed)).toBe(true);
  });
});
