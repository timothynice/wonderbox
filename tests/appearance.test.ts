import { describe, expect, it, afterEach, vi } from 'vitest';
import { projectSchema, parseProject, serializeProject, DEFAULT_APPEARANCE } from '../src/shared/model.js';
import { createStarterProject } from '../src/shared/starter.js';
import { applyTransaction, type Action } from '../src/shared/actions.js';
import { ProjectHistory, saveProject, loadProject } from '../src/shared/history.js';
import { buildTransactionPreview } from '../src/shared/preview.js';
import inspectProject from '../actions/inspect-project.js';
import applyEdit from '../actions/apply-transaction.js';
import { needsApproval, proposeEdit } from '../server/agent.js';
import { fixtureIntent, fixtureContext, geminiFixture } from './intent-fixture';

const art: Action[] = [
  { type: 'updateEntity', id: 'pip', patch: { appearance: { palette: 'lavender', variant: 'round', pattern: 'spots', accessory: 'scarf', primaryColor: '#b49ae8', accentColor: '#FBE7A1' } } },
  { type: 'setWorldSettings', settings: { theme: 'autumn', terrainStyle: 'crystal', foliageDensity: .65, starDensity: .4 } },
];

describe('shared original artwork customization', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('imports legacy v1 worlds with original art defaults and roundtrips exact customization', () => {
    const legacy: any = createStarterProject();
    for (const entity of legacy.entities) delete entity.appearance;
    for (const key of ['theme', 'terrainStyle', 'foliageDensity', 'starDensity']) delete legacy.world[key];
    const original = parseProject(legacy);
    expect(original.entities[0].appearance).toEqual(DEFAULT_APPEARANCE);
    expect(original.world).toMatchObject({ theme: 'garden', terrainStyle: 'moss', foliageDensity: 1, starDensity: 1 });
    const customized = applyTransaction(original, art);
    expect(parseProject(serializeProject(customized))).toEqual(customized);
    let saved = ''; const storage = { setItem: (_key: string, value: string) => { saved = value; }, getItem: () => saved };
    saveProject(customized, storage); expect(loadProject(storage)).toEqual(customized);
  });
  it('merges partial appearance/world patches without resetting unrelated settings or behavior', () => {
    const base = applyTransaction(createStarterProject(), art);
    const next = applyTransaction(base, [
      { type: 'updateEntity', id: 'pip', patch: { name: 'Pip in autumn', appearance: { pattern: 'stripes' } } },
      { type: 'setWorldSettings', settings: { atmosphere: 'moonlight' } },
    ]);
    expect(next.entities[0].appearance).toEqual({ ...base.entities[0].appearance, pattern: 'stripes' });
    expect(next.entities[0].behaviors).toEqual(base.entities[0].behaviors);
    expect(next.world).toEqual({ ...base.world, atmosphere: 'moonlight' });
    expect(next.terrain).toEqual(base.terrain);
    expect(next.entities.map(({ appearance, name, ...rest }) => rest)).toEqual(base.entities.map(({ appearance, name, ...rest }) => rest));
  });
  it('validates colors, parameters and unsupported art fields atomically, and enforces AI locks', () => {
    const base = createStarterProject(); const snapshot = structuredClone(base);
    for (const appearance of [{primaryColor:'red'}, {accentColor:'#123'}, {palette:'nintendo'}, {variant:'image'}, {assetUrl:'https://example.com/a.png'}]) {
      expect(() => applyTransaction(base, [art[1], {type:'updateEntity',id:'pip',patch:{appearance}}])).toThrow();
    }
    for (const settings of [{theme:'custom'}, {foliageDensity:2}, {starDensity:-1}]) expect(() => applyTransaction(base, [{type:'setWorldSettings',settings}])).toThrow();
    expect(base).toEqual(snapshot);
    base.entities[0].locked = true;
    expect(() => applyTransaction(base, art, {source:'ai'})).toThrow(/locked/);
    expect(applyTransaction(base, art, {source:'manual'}).entities[0].appearance.palette).toBe('lavender');
    expect(() => applyTransaction(base, [{type:'updateEntity',id:'pip',patch:{locked:false}}, art[0]], {source:'ai'})).toThrow(/locked/);
  });
  it('classifies all visual settings as safe, describes actual fields and undoes one atomic transaction', () => {
    const base = createStarterProject(); const preview = buildTransactionPreview(base, art);
    expect(preview.impact.mode).toBe('preserve');
    expect(preview.impact.entityChanges[0].fields).toContain('appearance.palette');
    expect(preview.changes).toContain('Pip · garden dreamer · Art palette: original → lavender');
    expect(preview.changes).toContain('Pip · garden dreamer · Primary color: automatic → #b49ae8');
    expect(preview.changes).toContain('World theme: garden → autumn');
    expect(needsApproval(art)).toBe(true);
    const history = new ProjectHistory(base); const next = history.execute(art);
    expect(history.undo()).toEqual({...base, revision: next.revision+1});
    expect(history.redo()).toEqual({...next, revision: next.revision+2});
    expect(base.entities[0].appearance.palette).toBe('original');
  });
  it('shares actual Agent-Native art actions between manual editing and AI and exposes current art context', async () => {
    const project = createStarterProject();
    const manual = await applyEdit.run({project,actions:art,source:'manual',expectedRevision:0,approved:true});
    const agent = await applyEdit.run({project,actions:art,source:'ai',expectedRevision:0,approved:true});
    expect(manual).toEqual(agent);
    const inspection = await inspectProject.run({project:agent.project,selectedId:'pip'});
    expect(inspection.selectedEntity?.appearance).toMatchObject({palette:'lavender',accessory:'scarf'});
    expect(inspection).toHaveProperty('supportedAppearance');
    vi.stubEnv('AI_PROVIDER','gemini');vi.stubEnv('GEMINI_API_KEY','test-only-never-sent');
    let body: any;
    const fetcher: typeof fetch = async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return geminiFixture(fixtureContext(options).workflow?.phase==='understand-request' ? fixtureIntent(art) : {summary:'EVERYTHING SUCCEEDED including imaginary unrelated changes.',actions:art});
    };
    const proposal = await proposeEdit({project,prompt:'Make Pip lavender and the garden autumn. Preserve rules and platforms.',selectedId:'pip'},fetcher);
    expect(proposal.actions).toEqual(art);expect(proposal.requiresApproval).toBe(true);
    expect(proposal.preview?.impact.mode).toBe('preserve');
    expect(proposal.summary).toContain('Art palette: original → lavender');
    expect(proposal.summary).not.toContain('EVERYTHING SUCCEEDED');
    expect(body.generationConfig.responseJsonSchema.properties.actions.items.properties.patch.properties.appearance.properties.pattern.enum).toEqual(['plain','spots','stripes']);
    expect(body.generationConfig.responseJsonSchema.properties.actions.items.properties.entity.properties.appearance.properties.pattern).toBeDefined();
    expect(body.systemInstruction.parts[0].text).toContain('appearance');
    expect(body.systemInstruction.parts[0].text).toContain('not arbitrary image generation');
    expect(JSON.parse(body.contents[0].parts[0].text).project.entities[0].appearance).toEqual(DEFAULT_APPEARANCE);
    expect(projectSchema.parse(project)).toEqual(project);
  });
  it('explains depleted live-provider credits without applying a proposal or masking it as generated art', async () => {
    vi.stubEnv('AI_PROVIDER','gemini');vi.stubEnv('GEMINI_API_KEY','test-only-never-sent');
    const project = createStarterProject(); const snapshot = structuredClone(project);
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({error:{message:'Prepayment credits depleted.'}}),{status:402});
    await expect(proposeEdit({project,prompt:'Make Pip lavender.'},fetcher)).rejects.toMatchObject({status:402,message:expect.stringContaining('no available credits')});
    expect(project).toEqual(snapshot);
  });

});
