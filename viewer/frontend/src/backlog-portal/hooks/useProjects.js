import { useState } from 'react';
import { addProject, pickProjectFolder } from '../../shared/files.js';

const SETTLE_FAILED = 'The latest changes could not be saved yet, so the project was not changed.';

// The Project dropdown and the Add Project dialog.
// `settleAll` resolves true once every pending save is on disk; `settingsState` is useSettings' result, which holds the
// project list (`settings.projects`, `settings.activeProject`) and the switch that saves the active path and reloads.
// dialog: null when closed, else { mode: 'link' | 'new', name, offer } where `offer` is { codeBase } while the folder has
// no .plans and the user has to accept or decline creating it.
export function useProjects(settleAll, settingsState) {
  const { settings, actions } = settingsState;
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState(null); // shown in the dialog while it is open, else under the bar
  const [working, setWorking] = useState(false);

  const projects = settings?.projects ?? [];
  const activeProject = settings?.activeProject ?? -1;

  const run = async (action) => {
    setError(null);
    setWorking(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  };

  // Choosing a saved project. A missing folder and the active project do nothing.
  const choose = (index) => {
    const project = projects[index];
    if (!project || !project.exists || index === activeProject) return undefined;
    return run(() => actions.switchProject(project));
  };

  const openDialog = () => {
    setError(null);
    setDialog({ mode: 'link', name: '', offer: null });
  };

  const closeDialog = () => {
    setError(null);
    setDialog(null);
  };

  const setMode = (mode) => {
    setError(null);
    setDialog((d) => ({ ...d, mode, offer: null }));
  };

  const setName = (name) => setDialog((d) => ({ ...d, name }));

  // The server adds and switches in one call, so pending saves are settled first. Reloads when the active project changed.
  const submit = async (body) => {
    if (!(await settleAll())) throw new Error(SETTLE_FAILED);
    const result = await addProject(body);
    if (result.needsInit) {
      setDialog((d) => ({ ...d, offer: { codeBase: body.codeBase } }));
      return;
    }
    if (result.switched) {
      actions.finishSwitch(result.init ?? null);
      return;
    }
    setDialog(null); // already the active project: nothing to change
  };

  // Link a code base: the folder dialog opens first; a cancelled dialog checks, saves and switches nothing.
  const linkCodeBase = () =>
    run(async () => {
      const picked = await pickProjectFolder();
      if (picked.cancelled) return;
      const name = dialog.name.trim();
      await submit(name ? { codeBase: picked.dir, name } : { codeBase: picked.dir });
    });

  // The user's answer to the offer to create .plans.
  const acceptOffer = () =>
    run(() => {
      const name = dialog.name.trim();
      const { codeBase } = dialog.offer;
      return submit(name ? { codeBase, name, init: true } : { codeBase, init: true });
    });

  const declineOffer = () => {
    setError(null);
    setDialog((d) => ({ ...d, offer: null }));
  };

  const createProject = () => run(() => submit({ newName: dialog.name.trim() }));

  return {
    projects, activeProject, dialog, error, working,
    actions: { choose, openDialog, closeDialog, setMode, setName, linkCodeBase, acceptOffer, declineOffer, createProject },
  };
}
