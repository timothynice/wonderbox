/** TEST ONLY: supplies an independently declared expected contract to model-transport fixtures.
 * Never imported by the app. The omission regression hand-authors its expectations separately. */
import type { Action } from '../src/shared/actions';
import type { EditIntent } from '../src/shared/intent';

export const emptyFixtureIntent = (): EditIntent => ({mode:'edit',fields:[],counts:[],existence:[],readFields:[],allowTerrainChanges:false,explanation:''});
export function fixtureIntent(actions: readonly Action[], explanation = 'This request is unsupported in the test fixture.'): EditIntent {
  const intent=emptyFixtureIntent();
  const entityField=(id:string,field:string,value:unknown)=>intent.fields.push({target:'entity',id,kind:null,field,value:value as string|number|boolean|null});
  for(const action of actions) {
    if(action.type==='setWorldSettings') for(const [field,value] of Object.entries(action.settings))intent.fields.push({target:'world',id:null,kind:null,field,value:value!});
    else if(action.type==='setBehavior') for(const [field,value] of Object.entries(action.behaviors))entityField(action.id,`behaviors.${field}`,value);
    else if(action.type==='updateEntity') for(const [field,value] of Object.entries(action.patch)) {
      if(field==='appearance'||field==='behaviors')for(const [nested,entry] of Object.entries(value!))entityField(action.id,`${field}.${nested}`,entry);
      else entityField(action.id,field,value);
    }
    else if(action.type==='moveEntity'){entityField(action.id,'x',action.x);entityField(action.id,'y',action.y);}
    else if(action.type==='removeEntity')intent.existence.push({id:action.id,exists:false});
    else if(action.type==='addEntity'){
      const count=intent.counts.find(count=>count.kind===action.entity.kind);
      if(count)count.delta++;else intent.counts.push({kind:action.entity.kind,delta:1});
    }
    else if(action.type==='paintTerrain')intent.allowTerrainChanges=true;
  }
  if(!actions.length){intent.mode='unsupported';intent.explanation=explanation;}
  return intent;
}
export function fixtureContext(options?: RequestInit): any {
  const body=JSON.parse(String(options?.body));
  return JSON.parse(body.contents?.[0]?.parts?.[0]?.text??body.messages.at(-1).content);
}
export function geminiFixture(value:unknown): Response {
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]}),{status:200});
}
export function openaiFixture(value:unknown): Response {
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}),{status:200});
}
