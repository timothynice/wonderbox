import {z} from 'zod';
import {describe,it,expect,afterEach,vi} from 'vitest';
import {createStarterProject,makeEntity} from '../src/shared/starter';
import {applyTransaction,type Action} from '../src/shared/actions';
import {intentPlanSchema,validateIntent,checkEditIntent,canonicalEditSummary,canonicalInspection,type EditIntent} from '../src/shared/intent';
import {buildTransactionPreview} from '../src/shared/preview';
import checkIntent from '../actions/check-edit-intent';
import applyEdit from '../actions/apply-transaction';
import {proposeEdit,geminiResponseSchema,proposalSchema} from '../server/agent';

const empty:EditIntent={mode:'edit',fields:[],counts:[],existence:[],readFields:[],allowTerrainChanges:false,explanation:''};
const compound:EditIntent={...empty,fields:[
  {target:'world',id:null,kind:null,field:'theme',value:'autumn'},
  {target:'world',id:null,kind:null,field:'terrainStyle',value:'crystal'},
  {target:'world',id:null,kind:null,field:'atmosphere',value:'moonlight'},
]};
const partial:Action[]=[{type:'setWorldSettings',settings:{theme:'autumn',terrainStyle:'crystal'}}];
const complete:Action[]=[{type:'setWorldSettings',settings:{theme:'autumn',terrainStyle:'crystal',atmosphere:'moonlight'}}];
const native=(body:unknown)=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(body)}]}}]}));
function scripted(values:unknown[]){const queue=[...values];return vi.fn<typeof fetch>().mockImplementation(async()=>{if(!queue.length)throw Error('Unexpected extra model call');return native(queue.shift());});}

describe('Independent AI request contract and truthful summaries',()=>{
  afterEach(()=>vi.unstubAllEnvs());
  it('does not treat an empty terrain candidate as a completed edit',()=>{
    const project=createStarterProject(),intent={...empty,allowTerrainChanges:true};
    const none=checkEditIntent(project,project,intent);
    expect(none.passed).toBe(false);expect(none.requested).toBe(1);
    expect(none.missing).toContain('Requested terrain edit changes authored terrain.');
    const next=applyTransaction(project,[{type:'paintTerrain',terrain:[{id:'requested-step',x:120,y:480,width:80,height:20}],eraseIds:[]}]);
    expect(checkEditIntent(project,next,intent).passed).toBe(true);
  });
  it('scopes Gemini world grammar to all independent requested settings',()=>{
    const grammar=geminiResponseSchema(z.toJSONSchema(proposalSchema),compound);
    const settings=grammar.properties.actions.items.properties.settings;
    expect(settings.required).toEqual(['theme','terrainStyle','atmosphere']);
    expect(Object.keys(settings.properties)).toEqual(['atmosphere','theme','terrainStyle']);
    expect(settings.properties.atmosphere.enum).toEqual(['day','moonlight']);
  });
  it('catches omitted moonlight and unrequested physics/geometry despite successful prose',async()=>{
    const project=createStarterProject();
    const missing=await checkIntent.run({project,actions:partial,intent:compound,expectedRevision:0});
    expect(missing.passed).toBe(false);expect(missing.missing).toEqual(['World · atmosphere: moonlight']);
    const altered=applyTransaction(project,[...complete,{type:'setWorldSettings',settings:{gravity:2000}},{type:'moveEntity',id:'pip',x:180,y:564}]);
    const result=checkEditIntent(project,altered,compound);
    expect(result.missing).toContain('Unrequested world change: gravity');
    expect(result.missing).toContain('Unrequested change: Pip · garden dreamer · x');
    expect(project.revision).toBe(0);expect(project.world.atmosphere).toBe('day');
  });
  it('enforces schema property types, parameter limits, object IDs and unambiguous requirements',()=>{
    const project=createStarterProject();
    expect(()=>validateIntent({...compound,fields:[{target:'entity',id:'pip',kind:null,field:'behaviors.floatSeconds',value:20}]},project)).toThrow(/limits/);
    expect(()=>validateIntent({...compound,fields:[{target:'entity',id:'missing',kind:null,field:'appearance.palette',value:'mint'}]},project)).toThrow(/missing/);
    expect(()=>validateIntent({...compound,fields:[...compound.fields,{target:'world',id:null,kind:null,field:'atmosphere',value:'day'}]},project)).toThrow(/Conflicting/);
    expect(()=>intentPlanSchema.parse({...compound,fields:[{target:'world',id:null,kind:null,field:'__proto__.constructor',value:'evil'}]})).toThrow();
    expect(()=>validateIntent({...compound,mode:'inspect'},project)).toThrow(/read-only/);
    expect(()=>validateIntent(empty,project)).toThrow(/supported change/);
  });
  it('checks exact added counts, new-object properties, specific removals and terrain preservation',()=>{
    const project=createStarterProject();
    const intent:EditIntent={...empty,counts:[{kind:'plant',delta:2}],fields:[{target:'newEntities',id:null,kind:'plant',field:'behaviors.throwable',value:true}]};
    const plant1=makeEntity('plant',200,580,'new-one',{behaviors:{throwable:true}}),plant2=makeEntity('plant',300,580,'new-two',{behaviors:{throwable:true}});
    const candidate=applyTransaction(project,[{type:'addEntity',entity:plant1},{type:'addEntity',entity:plant2}]);
    expect(checkEditIntent(project,candidate,intent).passed).toBe(true);
    candidate.entities.find(e=>e.id==='new-two')!.behaviors.throwable=false;
    expect(checkEditIntent(project,candidate,intent).passed).toBe(false);
    candidate.terrain[0].y--;
    expect(checkEditIntent(project,candidate,intent).missing).toContain('Terrain must remain unchanged.');
    const removal:EditIntent={...empty,existence:[{id:'demo-plant',exists:false}]};
    expect(checkEditIntent(project,applyTransaction(project,[{type:'removeEntity',id:'demo-plant'}]),removal).passed).toBe(true);
    expect(checkEditIntent(project,applyTransaction(project,[{type:'removeEntity',id:'toss-plant'}]),removal).passed).toBe(false);
  });
  it('rechecks the same contract at shared Apply with atomic rollback, revisions and locks',async()=>{
    const project=createStarterProject(),snapshot=structuredClone(project);
    await expect(checkIntent.run({project,actions:[],intent:compound,expectedRevision:9})).rejects.toThrow(/changed/);
    await expect(applyEdit.run({project,actions:partial,intent:compound,expectedRevision:0,source:'ai',approved:true})).rejects.toThrow(/requested checks/);
    expect(project).toEqual(snapshot);
    const next=await applyEdit.run({project,actions:complete,intent:compound,expectedRevision:0,source:'ai',approved:true});
    expect(next.project.world.atmosphere).toBe('moonlight');
    await expect(applyEdit.run({project:next.project,actions:complete,intent:compound,expectedRevision:0,source:'ai',approved:true})).rejects.toThrow(/changed/);
    project.entities[0].locked=true;
    const character:EditIntent={...empty,fields:[{target:'entity',id:'pip',kind:null,field:'appearance.palette',value:'mint'}]};
    await expect(applyEdit.run({project,actions:[{type:'updateEntity',id:'pip',patch:{appearance:{palette:'mint'}}}],intent:character,expectedRevision:0,source:'ai'})).rejects.toThrow(/locked/);
  });
  it('extracts intent independently, rejects a partial candidate and repairs once against the original',async()=>{
    vi.stubEnv('AI_PROVIDER','gemini');vi.stubEnv('GEMINI_API_KEY','test-only');
    const project=createStarterProject();
    const fetcher=scripted([compound,{summary:'Moonlight, win, everything is done!',actions:partial},{summary:'I also made a multiplayer game.',actions:complete}]);
    const result=await proposeEdit({project,prompt:'Use autumn, moonlight and crystal while preserving every platform.'},fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const bodies=fetcher.mock.calls.map(([,options])=>JSON.parse(String(options!.body)));
    const contexts=bodies.map(body=>JSON.parse(body.contents[0].parts[0].text));
    expect(contexts[0].workflow.phase).toBe('understand-request');
    expect(contexts[0].workflow).not.toHaveProperty('actions');
    expect(contexts[2].workflow.previousAttempts[0].missing).toContain('World · atmosphere: moonlight');
    expect(contexts.every(context=>context.project.revision===0)).toBe(true);
    expect(result.intentEvidence?.passed).toBe(true);expect(result.intentEvidence?.matched).toHaveLength(3);
    expect(result.summary).toContain('Atmosphere: day → moonlight');
    expect(result.summary).not.toMatch(/multiplayer|win|everything/i);
    expect(result.requiresApproval).toBe(true);expect(project.world.theme).toBe('garden');
    expect(result.activity.some(step=>step.capability==='verify'&&step.status==='rejected')).toBe(true);
  });
  it('fails atomically after the bounded repair instead of returning partial edits or scripted replacements',async()=>{
    vi.stubEnv('AI_PROVIDER','gemini');vi.stubEnv('GEMINI_API_KEY','test-only');
    const project=createStarterProject(),snapshot=structuredClone(project);
    await expect(checkIntent.run({project,actions:[],intent:compound,expectedRevision:9})).rejects.toThrow(/changed/);
    const fetcher=scripted([compound,{summary:'All done',actions:partial},{summary:'All done again',actions:partial}]);
    await expect(proposeEdit({project,prompt:'Autumn, moonlight and crystal'},fetcher)).rejects.toMatchObject({status:422,activity:expect.arrayContaining([expect.objectContaining({capability:'verify',status:'rejected'})])});
    expect(fetcher).toHaveBeenCalledTimes(3);expect(project).toEqual(snapshot);
  });
  it('derives read-only answers from current authored state and never prepares a transaction',async()=>{
    vi.stubEnv('AI_PROVIDER','gemini');vi.stubEnv('GEMINI_API_KEY','test-only');
    const project=createStarterProject();project.entities[0].appearance.primaryColor='#456abc';project.entities[0].behaviors.floatSeconds=.8;
    const intent:EditIntent={...empty,mode:'inspect',readFields:[{target:'entity',id:'pip',kind:null,field:'appearance.primaryColor'},{target:'entity',id:'pip',kind:null,field:'behaviors.floatSeconds'}]};
    const fetcher=scripted([intent]);
    const result=await proposeEdit({project,prompt:'What are Pip current exact color and float? Do not change anything.'},fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);expect(result.actions).toEqual([]);
    expect(result.summary).toContain('#456abc');expect(result.summary).toContain('0.8');expect(result.summary).toContain('No changes made');
    expect(canonicalInspection(project,intent)).toBe(result.summary);
  });
  it('uses authoritative diffs for successful, already-satisfied and checked-route summaries',async()=>{
    const project=createStarterProject();
    expect(canonicalEditSummary(buildTransactionPreview(project,complete))).toContain('World theme: garden → autumn');
    expect(canonicalEditSummary(buildTransactionPreview(project,[{type:'setWorldSettings',settings:{atmosphere:'day'}}]))).toContain('No authored changes');
    vi.stubEnv('AI_PROVIDER','gemini');vi.stubEnv('GEMINI_API_KEY','test-only');
    const already:EditIntent={...empty,fields:[{target:'world',id:null,kind:null,field:'atmosphere',value:'day'}]};
    const result=await proposeEdit({project,prompt:'Set day'},scripted([already,{summary:'Victory and multiplayer unlocked',actions:[]}]));
    expect(result.summary).toContain('already set');expect(result.summary).not.toMatch(/Victory|multiplayer/);
  });
});
