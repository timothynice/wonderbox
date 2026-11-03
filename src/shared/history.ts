import { applyTransaction, type Action, type ActionSource } from "./actions.js";
import {
  cloneProject,
  parseProject,
  serializeProject,
  type Project,
} from "./model.js";

export class ProjectHistory {
  project: Project;
  private past: Project[] = [];
  private future: Project[] = [];
  constructor(project: Project) {
    this.project = parseProject(project);
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  execute(
    actions: Action[],
    options: { expectedRevision?: number; source?: ActionSource } = {},
  ): Project {
    const next = applyTransaction(this.project, actions, options);
    this.past.push(cloneProject(this.project));
    if (this.past.length > 80) this.past.shift();
    this.future = [];
    return (this.project = next);
  }
  undo(): Project {
    const previous = this.past.pop();
    if (!previous) return this.project;
    this.future.push(cloneProject(this.project));
    return (this.project = {
      ...previous,
      revision: this.project.revision + 1,
    });
  }
  redo(): Project {
    const next = this.future.pop();
    if (!next) return this.project;
    this.past.push(cloneProject(this.project));
    return (this.project = { ...next, revision: this.project.revision + 1 });
  }
  replace(project: Project): Project {
    const valid = parseProject(project);
    this.past.push(cloneProject(this.project));
    this.future = [];
    return (this.project = { ...valid, revision: this.project.revision + 1 });
  }
}
export { ProjectHistory as History };
export const STORAGE_KEY = "wonderbox.project.v1";
export function saveProject(
  project: Project,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  storage.setItem(STORAGE_KEY, serializeProject(project));
}
export function loadProject(
  storage: Pick<Storage, "getItem"> = localStorage,
): Project | null {
  const saved = storage.getItem(STORAGE_KEY);
  return saved ? parseProject(saved) : null;
}
