import { z } from 'zod';
import { entityKindSchema, entitySchema, worldSchema, behaviorSchema, appearanceSchema, type Project } from './model.js';
import { type TransactionPreview } from './preview.js';

const entityFields = ['name','x','y','width','height','locked',...Object.keys(behaviorSchema.shape).map(k=>`behaviors.${k}`),...Object.keys(appearanceSchema.shape).map(k=>`appearance.${k}`)];
export const intentFields = [...new Set([...Object.keys(worldSchema.shape),...entityFields])] as [string,...string[]];
const selector = z.object({target:z.enum(['world','entity','newEntities']),id:z.string().max(100).nullable(),kind:entityKindSchema.nullable(),field:z.enum(intentFields)}).strict();
const primitive = z.union([z.string().max(160),z.number().finite(),z.boolean(),z.null()]);
export const intentPlanSchema = z.object({
  mode:z.enum(['edit','inspect','unsupported']),
  fields:z.array(selector.extend({value:primitive})).max(100),
  counts:z.array(z.object({kind:entityKindSchema,delta:z.number().int().min(-300).max(300)}).strict()).max(9),
  existence:z.array(z.object({id:z.string().min(1).max(100),exists:z.boolean()}).strict()).max(100),
  readFields:z.array(selector).max(30),
  allowTerrainChanges:z.boolean(),
  explanation:z.string().max(400),
}).strict();
export type EditIntent = z.infer<typeof intentPlanSchema>;
export type IntentField = EditIntent['fields'][number];
export type IntentEvidence = {passed:boolean;requested:number;matched:string[];missing:string[]};
export function readPath(object:unknown,field:string):unknown {
  return field.split('.').reduce<unknown>((value,key)=>value && typeof value==='object' ? (value as Record<string,unknown>)[key] : undefined,object);
}
function validator(target:string,field:string):z.ZodType | undefined {
  if(target==='world') return (worldSchema.shape as Record<string,z.ZodType>)[field];
  const [root,key]=field.split('.');
  if(root==='behaviors')return (behaviorSchema.shape as Record<string,z.ZodType>)[key];
  if(root==='appearance')return (appearanceSchema.shape as Record<string,z.ZodType>)[key];
  return ['name','x','y','width','height','locked'].includes(field) ? (entitySchema.shape as Record<string,z.ZodType>)[field] : undefined;
}
export function validateIntent(plan:EditIntent,project:Project):void {
  const signatures=new Map<string,unknown>();
  for(const check of [...plan.fields,...plan.readFields]) {
    if(!validator(check.target,check.field))throw Error(`Unsupported requested property: ${check.target}.${check.field}.`);
    if(check.target==='entity' && (!check.id || !project.entities.some(e=>e.id===check.id)))throw Error('A requested object is missing. Select an existing object and try again.');
    if(check.target==='world' && (check.id!==null || check.kind!==null))throw Error('Invalid world-property request.');
    if(check.target==='newEntities' && (!check.kind || check.id!==null))throw Error('A new-object request needs a supported kind.');
    if('value' in check) {
      const parsed=validator(check.target,check.field)!.safeParse(check.value);
      if(!parsed.success)throw Error(`The requested ${check.field} is outside supported limits.`);
      const signature=`${check.target}:${check.id}:${check.kind}:${check.field}`;
      if(signatures.has(signature)&&!equal(signatures.get(signature),check.value))throw Error(`Conflicting requested values for ${check.field}.`);
      signatures.set(signature,check.value);
    }
  }
  if(new Set(plan.counts.map(c=>c.kind)).size!==plan.counts.length)throw Error('Conflicting object-count requirements.');
  for(const requirement of plan.existence)if(!project.entities.some(e=>e.id===requirement.id))throw Error('A requested existing object was not found.');
  if(plan.mode!=='edit' && (plan.fields.length||plan.counts.length||plan.existence.length||plan.allowTerrainChanges))throw Error('A read-only or unsupported request cannot include edit requirements.');
  if(plan.mode==='edit'&&!plan.fields.length&&!plan.counts.length&&!plan.existence.length&&!plan.allowTerrainChanges)throw Error('I could not identify a supported change. Select an object and describe the property to edit.');
  if(plan.readFields.some(field=>field.target==='newEntities'))throw Error('Read-only queries need existing world or object fields.');
  if(plan.mode==='edit'&&plan.readFields.length)throw Error('A change request cannot also be classified as a read-only query.');
}
const equal=(a:unknown,b:unknown)=>typeof a==='string'&&typeof b==='string'&&/^#[a-f0-9]{6}$/i.test(a)&&/^#[a-f0-9]{6}$/i.test(b)?a.toLowerCase()===b.toLowerCase():a===b;
const display=(value:unknown)=>value===null?'automatic':typeof value==='boolean'?(value?'on':'off'):String(value);
export function describeRequirement(check:IntentField,project:Project) {
  const subject=check.target==='world'?'World':check.target==='newEntities'?`New ${check.kind} objects`:project.entities.find(e=>e.id===check.id)?.name??check.id;
  return `${subject} · ${check.field}: ${display(check.value)}`;
}
/** Checks requested final values and rejects unrequested changes. It never interprets prose. */
export function checkEditIntent(before:Project,after:Project,intent:EditIntent):IntentEvidence {
  validateIntent(intent,before);
  const matched:string[]=[],missing:string[]=[];
  for(const check of intent.fields) {
    const targets=check.target==='world'?[after.world]:check.target==='entity'?after.entities.filter(e=>e.id===check.id):after.entities.filter(e=>e.kind===check.kind&&!before.entities.some(old=>old.id===e.id));
    const description=describeRequirement(check,before);
    if(targets.length && targets.every(target=>equal(readPath(target,check.field),check.value)))matched.push(description);
    else missing.push(description);
  }
  for(const count of intent.counts) {
    const delta=after.entities.filter(e=>e.kind===count.kind).length-before.entities.filter(e=>e.kind===count.kind).length;
    const label=`${count.kind} count: ${count.delta>=0?'+':''}${count.delta}`;
    (delta===count.delta?matched:missing).push(label);
  }
  for(const item of intent.existence) {
    const label=`${item.id}: ${item.exists?'exists':'removed'}`;
    (after.entities.some(e=>e.id===item.id)===item.exists?matched:missing).push(label);
  }
  // A planner cannot silently move, resize, recolor or reconfigure unrelated authored objects.
  for(const key of Object.keys(before.world))if(!equal(readPath(before.world,key),readPath(after.world,key)) && !intent.fields.some(c=>c.target==='world'&&c.field===key))missing.push(`Unrequested world change: ${key}`);
  for(const old of before.entities) {
    const next=after.entities.find(e=>e.id===old.id);
    if(!next) {
      if(!intent.existence.some(e=>e.id===old.id&&!e.exists)&&!intent.counts.some(c=>c.kind===old.kind&&c.delta<0))missing.push(`Unrequested removal: ${old.name}`);
      continue;
    }
    for(const field of entityFields)if(!equal(readPath(old,field),readPath(next,field))&&!intent.fields.some(c=>c.target==='entity'&&c.id===old.id&&c.field===field))missing.push(`Unrequested change: ${old.name} · ${field}`);
  }
  for(const next of after.entities)if(!before.entities.some(e=>e.id===next.id)&&!intent.counts.some(c=>c.kind===next.kind&&c.delta>0))missing.push(`Unrequested addition: ${next.name}`);
  if(!intent.allowTerrainChanges&&JSON.stringify(before.terrain)!==JSON.stringify(after.terrain))missing.push('Terrain must remain unchanged.');
  return {passed:missing.length===0,requested:intent.fields.length+intent.counts.length+intent.existence.length,matched,missing};
}
export function canonicalEditSummary(preview:TransactionPreview):string {
  if(!preview.changes.length)return 'No authored changes. The requested values are already set.';
  const chosen:string[]=[];let length=0;
  for(const change of preview.changes){if(length+change.length>480)break;chosen.push(change);length+=change.length+2;}
  if(!chosen.length)return `${preview.changes.length} validated changes. Review the complete before/after list.`;
  return chosen.join('; ')+(chosen.length<preview.changes.length?`; +${preview.changes.length-chosen.length} more validated changes. Review the complete list.`:'.');
}
export function canonicalInspection(project:Project,intent:EditIntent):string {
  if(!intent.readFields.length)return `Current project: ${project.name}. ${project.entities.length} objects, ${project.terrain.length} terrain surfaces. World atmosphere: ${project.world.atmosphere}; theme: ${project.world.theme}. No changes made.`;
  const answers=intent.readFields.map(field=>{
    const target=field.target==='world'?project.world:project.entities.find(e=>e.id===field.id);
    return describeRequirement({...field,value:readPath(target,field.field) as IntentField['value']},project);
  });
  return `${answers.join('; ')}. No changes made.`.slice(0,600);
}
