import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import inspectProject from '../actions/inspect-project';
import previewTransaction from '../actions/preview-transaction';
import checkRoute from '../actions/check-reachability';
import applyEdit from '../actions/apply-transaction';
import { proposeEdit } from '../server/agent';
import { createStarterProject } from '../src/shared/starter';
import { mechanicsFingerprint } from '../src/shared/reachability';
import type { Action } from '../src/shared/actions';
import { app } from '../server/index';
import type { AddressInfo } from 'node:net';

const checkRequest = { targetTerrainId: 'optional-float-ledge' };
const goodActions: Action[] = [{ type: 'paintTerrain', terrain: [{ id: 'checked-step', x: 480, y: 420, width: 100, height: 20 }], eraseIds: [] }];
const noRouteActions: Action[] = [{ type: 'setWorldSettings', settings: { atmosphere: 'moonlight' } }];
const modelResponse = (actions: Action[], summary = 'A candidate edit.') => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ actions, summary }) }] } }] }), { status: 200 });

describe('Shared Agent-Native inspection, preview and reachability capabilities', () => {
  beforeEach(() => { vi.stubEnv('AI_PROVIDER', 'gemini'); vi.stubEnv('GEMINI_API_KEY', 'test-key'); vi.stubEnv('AI_MODEL', 'test-model'); vi.stubEnv('AI_FALLBACK_MODEL', ''); });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('inspects selection and locks, then previews without changing the source project', async () => {
    const project = createStarterProject(); project.entities[0].locked = true;
    const inspection = await inspectProject.run({ project, selectedId: 'pip', targetTerrainId: checkRequest.targetTerrainId });
    expect(inspection.selectedEntity?.id).toBe('pip');
    expect(inspection.lockedIds).toContain('pip');
    expect(inspection.targetTerrain?.id).toBe(checkRequest.targetTerrainId);
    const preview = await previewTransaction.run({ project, actions: goodActions, expectedRevision: 0, source: 'ai' });
    expect(preview.baseRevision).toBe(0); expect(preview.affectedIds).toContain('checked-step');
    expect(preview.changes.length).toBeGreaterThan(0);
    expect(project.terrain.some(t => t.id === 'checked-step')).toBe(false);
    await expect(previewTransaction.run({ project, actions: [{ type: 'setBehavior', id: 'pip', behaviors: { floatSeconds: 1 } }], expectedRevision: 0, source: 'ai' })).rejects.toThrow(/locked/);
  });

  it('runs a baseline, rejects an unhelpful candidate, feeds evidence back and returns a checked Apply preview', async () => {
    const project = createStarterProject();
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(modelResponse(noRouteActions, 'Moonlight may help.'))
      .mockResolvedValueOnce(modelResponse(goodActions, 'Added an intermediate step.'));
    const result = await proposeEdit({ project, prompt: 'Make this ledge reachable without changing my character.', ...checkRequest }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.requiresApproval).toBe(true);
    expect(result.actions).toEqual(goodActions);
    expect(result.evidence?.passed).toBe(true);
    expect(result.evidence?.revision).toBe(1);
    expect(result.preview?.baseRevision).toBe(0);
    expect(result.checkRequest).toEqual(checkRequest);
    expect(result.activity.filter(a => a.capability === 'check').map(a => a.status)).toEqual(['no-route-found', 'no-route-found', 'route-found']);
    const secondRequest = JSON.parse(fetcher.mock.calls[1][1]?.body as string);
    expect(secondRequest.contents[0].parts[0].text).toContain('previousAttempts');
    expect(secondRequest.contents[0].parts[0].text).toContain('no-route-found');
    expect(project.revision).toBe(0);
    expect(project.terrain.some(t => t.id === 'checked-step')).toBe(false);
  });

  it('gives the real model checked tool options without silently substituting them for its output', async () => {
    const project = createStarterProject();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const context = JSON.parse(JSON.parse(init?.body as string).contents[0].parts[0].text);
      expect(context.workflow.stepOptions.length).toBeGreaterThan(0);
      expect(context.workflow.planningNote).toContain('not model responses');
      return modelResponse(context.workflow.stepOptions[0].actions, 'Choose a mechanically checked step.');
    });
    const result = await proposeEdit({ project, prompt: 'Make this ledge reachable.', ...checkRequest }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.evidence?.passed).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.activity.some(a => a.capability === 'plan' && a.status === 'options-found')).toBe(true);
    expect(project.revision).toBe(0);
  });

  it('stops after three actual model requests without claiming an unchecked candidate solved the goal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => modelResponse(noRouteActions));
    const result = await proposeEdit({ project: createStarterProject(), prompt: 'Make this ledge reachable.', ...checkRequest }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.actions).toEqual([]);
    expect(result.summary).toContain('No checked edit');
    expect(result.evidence?.passed).toBe(false);
    expect(result.activity.filter(a => a.capability === 'preview')).toHaveLength(3);
  });
  it('rejects model shortcuts that change the player or target and replans intermediate terrain', async () => {
    const project = createStarterProject();
    const target = project.terrain.find(t => t.id === checkRequest.targetTerrainId)!;
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(modelResponse([{ type: 'setBehavior', id: 'pip', behaviors: { floatSeconds: 0.8 } }], 'Give Pip floating.'))
      .mockResolvedValueOnce(modelResponse([{ type: 'paintTerrain', terrain: [{ ...target, y: 400 }], eraseIds: [] }], 'Lower the goal.'))
      .mockResolvedValueOnce(modelResponse(goodActions, 'Add intermediate terrain.'));
    const result = await proposeEdit({ project, prompt: 'Make this ledge reachable.', ...checkRequest }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.actions).toEqual(goodActions);
    expect(result.evidence?.passed).toBe(true);
    const rejected = result.activity.filter(a => a.capability === 'preview' && a.status === 'rejected');
    expect(rejected).toHaveLength(2);
    expect(rejected[0].summary).toContain('preserve the player');
    expect(rejected[1].summary).toContain('preserve the target');
  });
  it('enforces checked intent again at Apply for player, target, automatic source and world physics', async () => {
    const project = createStarterProject();
    const target = project.terrain.find(t => t.id === checkRequest.targetTerrainId)!;
    const source = project.terrain.find(t => t.id === 'garden-floor')!;
    const forbidden: Action[][] = [
      [{ type: 'setBehavior', id: 'pip', behaviors: { floatSeconds: 0.8 } }],
      [{ type: 'paintTerrain', terrain: [{ ...target, y: 400 }], eraseIds: [] }],
      [{ type: 'paintTerrain', terrain: [{ ...source, y: 630, height: 90 }], eraseIds: [] }],
      [{ type: 'setWorldSettings', settings: { gravity: 900 } }],
    ];
    for (const actions of forbidden) {
      await expect(previewTransaction.run({ project, actions, source: 'ai', expectedRevision: 0, checkRequest })).rejects.toThrow(/must preserve/);
      await expect(applyEdit.run({ project, actions, source: 'ai', expectedRevision: 0, checkRequest, approved: true })).rejects.toThrow(/must preserve/);
    }
    const ordinary = await applyEdit.run({ project, actions: forbidden[0], source: 'ai', expectedRevision: 0 });
    expect(ordinary.project.entities.find(e => e.id === 'pip')?.behaviors.floatSeconds).toBe(0.8);
    expect((await checkRoute.run({ project: ordinary.project, check: checkRequest })).evidence.passed).toBe(true);
    expect(project.entities.find(e => e.id === 'pip')?.behaviors.floatSeconds).toBe(0);
  });

  it('does not invent a candidate for an unsupported or already satisfied bounded check', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const project = createStarterProject();
    const unsupported = await proposeEdit({ project, prompt: 'Make the moving-platform route easy.', targetTerrainId: 'first-step' }, fetcher);
    expect(unsupported.actions).toEqual([]); expect(unsupported.evidence?.status).toBe('unsupported');
    const satisfied = await proposeEdit({ project, prompt: 'Reach the starting floor.', targetTerrainId: 'garden-floor' }, fetcher);
    // The large floor corridor can contain dynamics; either an unsupported check
    // or a found route must report its actual evidence without invoking a model.
    expect(satisfied.actions).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rechecks exact candidate actions at Apply and refuses tampered or stale candidates', async () => {
    const project = createStarterProject();
    const baseline = await checkRoute.run({ project, check: checkRequest });
    expect(baseline.evidence.passed).toBe(false);
    await expect(applyEdit.run({ project, actions: goodActions, source: 'ai', expectedRevision: 0, checkRequest })).rejects.toThrow(/Apply/);
    const applied = await applyEdit.run({ project, actions: goodActions, source: 'ai', expectedRevision: 0, checkRequest, approved: true });
    expect(applied.evidence?.passed).toBe(true);
    expect(applied.evidence?.revision).toBe(applied.project.revision);
    expect(applied.evidence?.mechanicsFingerprint).toBe(mechanicsFingerprint(applied.project));
    await expect(applyEdit.run({ project, actions: noRouteActions, source: 'ai', expectedRevision: 0, checkRequest, approved: true })).rejects.toThrow(/required route check/);
    await expect(applyEdit.run({ project: applied.project, actions: goodActions, source: 'ai', expectedRevision: 0, checkRequest, approved: true })).rejects.toThrow(/changed/);
    expect(project.revision).toBe(0);
  });
  it('exposes the actual shared read and check capabilities to manual HTTP callers', async () => {
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(listener));
    });
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = async (endpoint: string, body: unknown) => {
      const response = await fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    try {
      const project = createStarterProject();
      const inspection = await post('/api/inspect', { project, selectedId: checkRequest.targetTerrainId });
      expect(inspection.status).toBe(200); expect(inspection.data.selectedTerrain.id).toBe(checkRequest.targetTerrainId);
      const preview = await post('/api/preview', { project, actions: goodActions, expectedRevision: 0, source: 'manual' });
      expect(preview.status).toBe(200); expect(preview.data.affectedIds).toContain('checked-step');
      const baseline = await post('/api/check', { project, check: checkRequest });
      expect(baseline.status).toBe(200); expect(baseline.data.evidence.status).toBe('no-route-found');
      const applied = await post('/api/action', { project, actions: goodActions, expectedRevision: 0, source: 'ai', approved: true, checkRequest });
      expect(applied.status).toBe(200); expect(applied.data.evidence.passed).toBe(true);
      const shortcut = [{ type: 'setBehavior', id: 'pip', behaviors: { floatSeconds: 0.8 } }];
      const rejectedPreview = await post('/api/preview', { project, actions: shortcut, expectedRevision: 0, source: 'ai', checkRequest });
      expect(rejectedPreview.status).toBe(422); expect(rejectedPreview.data.error).toContain('preserve the player');
      const rejectedApply = await post('/api/action', { project, actions: shortcut, expectedRevision: 0, source: 'ai', approved: true, checkRequest });
      expect(rejectedApply.status).toBe(422); expect(rejectedApply.data.error).toContain('preserve the player');
      const checked = await post('/api/check', { project: applied.data.project, check: checkRequest });
      expect(checked.status).toBe(200); expect(checked.data.evidence.mechanicsFingerprint).toBe(applied.data.evidence.mechanicsFingerprint);
      expect(project.revision).toBe(0);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});
