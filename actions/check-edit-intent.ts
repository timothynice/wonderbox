import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { projectSchema } from '../src/shared/model.js';
import { actionSchema,applyTransaction } from '../src/shared/actions.js';
import { intentPlanSchema,checkEditIntent } from '../src/shared/intent.js';
export default defineAction({
  description:'Check a candidate transaction against independently extracted requested properties, object counts, preservation and scope. Read-only; no authored mutation. Does not prove arbitrary free-form intent or human usability.',
  schema:z.object({project:projectSchema,actions:z.array(actionSchema).max(100),intent:intentPlanSchema,expectedRevision:z.number().int().nonnegative()}).strict(),
  readOnly:true,
  run:async({project,actions,intent,expectedRevision})=>{
    if(project.revision!==expectedRevision)throw Error('The project changed. Request a fresh edit before applying.');
    return checkEditIntent(project,actions.length?applyTransaction(project,actions,{source:'ai',expectedRevision}):project,intent);
  },
});
