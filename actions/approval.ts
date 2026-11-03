import type { Action } from "../src/shared/actions";

/** This policy is code, so an AI-generated approval flag cannot weaken it. */
export function needsApproval(actions: Action[]) {
  return (
    actions.length > 3 ||
    actions.some(
      (a) =>
        a.type === "removeEntity" ||
        (a.type === "paintTerrain" &&
          (a.eraseIds.length > 0 || a.terrain.length > 3)) ||
        (a.type === "setWorldSettings" &&
          (a.settings.width !== undefined ||
            a.settings.height !== undefined ||
            a.settings.gravity !== undefined)),
    )
  );
}
