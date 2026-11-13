import { useCallback, useEffect, useState } from 'react';
import type { FolderTarget, Migration, ProjectInit, ProjectSettings } from '../../../../shared/api/files.ts';
import { FileApiError, messageOf, getProject, saveProject, pickProjectFolder, initProjectFolder, planProjectRelocation, applyProjectRelocation, migrateOlderLayout } from '../../../../shared/api/files.ts';

// Survives the page reload that follows a switch, so the Settings tab can still show the note about skill sessions.
const SWITCHED_KEY = 'planner.dataDirSwitched';
// The same, for the init result (created list, already-there list, created backlog); read once, then cleared on the first load.
const INIT_RESULT_KEY = 'planner.initResult';
// The same, for the copy result of a relocation ({ copied, overwritten, skipped } counts).
const COPY_RESULT_KEY = 'planner.copyResult';
const SETTLE_FAILED = 'The latest changes could not be saved yet, so the folder was not changed.';

// The counts of a relocation copy, kept across the reload.
export interface CopyCounts {
  copied: number;
  overwritten: number;
  skipped: number;
}

// While the user chooses overwrite, switch or cancel: `target`, `dir`, `exists` (the files an overwrite would replace) and
// `isCodeBase`; when only the switch or relocation is left because a save was running: `ready` and `retry`.
export interface RelocationOffer {
  target?: FolderTarget;
  dir?: string;
  exists?: string[];
  isCodeBase?: boolean;
  ready?: boolean;
  retry?: () => Promise<unknown>;
}

const isBusy = (err: unknown) => err instanceof FileApiError && err.code === 'busy';

// Storage may be unavailable (private mode, blocked); the page works without it, only the note is lost.
function readStored(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Without storage the init result is not shown after the reload; the switch itself still works.
  }
}

function clearStored(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing stored, nothing to clear.
  }
}

function readStoredResult<T>(key: string): T | null {
  const text = readStored(key);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// The project settings (name, data folder, config file) and the flow that changes the folder, which relocates the current
// project: ask the server for the relocation plan first. An empty or missing target is copied to without a prompt, a target
// with backlog folders asks (overwrite, just switch or cancel), and the server saves the new path only after the copy has
// been read back. The old folder is never touched.
// `settleAll` resolves true once every pending save is on disk; it runs before the switch and the reload.
// `onMigrated` runs after a migration so the backlog list and the open backlog show the copied folders.
export function useSettings(settleAll: () => Promise<boolean>, onMigrated?: () => void) {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  // { target, dir, exists, isCodeBase } while the user chooses overwrite, switch or cancel (`exists`: the files an overwrite
  // would replace); { ready: true, retry } when only the switch or relocation is left because a save was running
  const [offer, setOffer] = useState<RelocationOffer | null>(null);
  const [initResult, setInitResult] = useState<ProjectInit | null>(() => readStoredResult<ProjectInit>(INIT_RESULT_KEY));
  const [copyResult, setCopyResult] = useState<CopyCounts | null>(() => readStoredResult<CopyCounts>(COPY_RESULT_KEY));
  const [migrateResult, setMigrateResult] = useState<Migration | null>(null); // { copied, skipped, failed } after the user runs the migration
  const [switched, setSwitched] = useState(() => readStored(SWITCHED_KEY) === '1');

  useEffect(() => {
    clearStored(INIT_RESULT_KEY); // shown on this load only
    clearStored(COPY_RESULT_KEY);

    getProject().then(setSettings, (err: unknown) => setError(messageOf(err)));
  }, []);

  // Runs one action with the working flag and the error line.
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setError(null);
    setWorking(true);
    try {
      return await action();
    } catch (err) {
      setError(messageOf(err));
      return undefined;
    } finally {
      setWorking(false);
    }
  }, []);

  // `isCodeBase` saves `codeBase` (the server derives `.plans` and drops `dataDir`); otherwise it saves `dataDir`.
  const switchTo = async (dir: string, isCodeBase = false): Promise<void> => {
    if (!(await settleAll())) throw new Error(SETTLE_FAILED);
    try {
      await saveProject(isCodeBase ? { codeBase: dir } : { dataDir: dir });
    } catch (err) {
      if (isBusy(err)) setOffer({ ready: true, retry: () => switchTo(dir, isCodeBase) });
      throw err;
    }
    finishSwitch();
  };

  // The config now names the new project: remember it for the note about skill sessions, then reload.
  const finishSwitch = (result: ProjectInit | null = null, copy: CopyCounts | null = null) => {
    writeStored(SWITCHED_KEY, '1');
    if (result) writeStored(INIT_RESULT_KEY, JSON.stringify(result));
    if (copy) writeStored(COPY_RESULT_KEY, JSON.stringify(copy));
    window.location.reload();
  };

  // Choosing a saved project of the Project dropdown: the same switch, and no file is touched. Throws when it cannot switch.
  const switchProject = (project: { codeBase?: string | null; dataDir: string }) => switchTo(project.codeBase ?? project.dataDir, !!project.codeBase);

  // Relocates the current project to `target` ({ dir } or { codeBase }). `choice` is only given after the confirmation.
  // The server copies, reads back and then saves the new path; when it throws, the saved path is unchanged.
  const relocateTo = async (target: FolderTarget, choice?: 'overwrite' | 'switch' | 'cancel'): Promise<void> => {
    if (!(await settleAll())) throw new Error(SETTLE_FAILED);
    let result: ProjectSettings;
    try {
      result = await applyProjectRelocation(target, choice);
    } catch (err) {
      if (isBusy(err)) setOffer({ ready: true, retry: () => relocateTo(target, choice) });
      throw err;
    }
    if (result.cancelled) return;
    const { copy } = result;
    finishSwitch(null, copy ? { copied: copy.copied.length, overwritten: (copy.overwritten ?? []).length, skipped: copy.skipped.length } : null);
  };

  // Asks for the plan first: a target that needs a choice stops here with the files an overwrite would replace.
  const planAndRelocate = async (target: FolderTarget) => {
    setOffer(null);
    setInitResult(null);
    setCopyResult(null);
    const plan = await planProjectRelocation(target);
    if (plan.needsChoice) {
      setOffer({ target, dir: plan.dir, exists: plan.exists, isCodeBase: 'codeBase' in target });
      return undefined;
    }
    return relocateTo(target);
  };

  // Opens the server's folder dialog; a chosen folder is planned and relocated to, a cancel does nothing.
  const pickFolder = () =>
    run(async () => {
      const picked = await pickProjectFolder();
      if (picked.cancelled) return undefined;
      return planAndRelocate({ dir: picked.dir! });
    });

  // Same dialog for a code base; the data goes to its `.plans` folder. The "move my data into a code base" button uses it too.
  const pickCodeBase = () =>
    run(async () => {
      const picked = await pickProjectFolder();
      if (picked.cancelled) return undefined;
      return planAndRelocate({ codeBase: picked.dir! });
    });

  // choice: 'overwrite', 'switch' or 'cancel', for the target in `offer`. Cancel changes nothing and asks the server nothing.
  const chooseRelocation = (choice: 'overwrite' | 'switch' | 'cancel') => {
    if (choice === 'cancel') {
      setOffer(null);
      return undefined;
    }
    return run(() => relocateTo(offer!.target!, choice));
  };

  const retrySwitch = () => run(() => offer!.retry!());

  const runInit = () =>
    run(async () => {
      setCopyResult(null);
      setInitResult(await initProjectFolder(settings!.dataDir));
    });

  // Only on the user's click. Reloads the settings afterwards so the older-layout notice follows what is left,
  // and asks the page to re-read the backlog list so the copied backlogs appear without a reload.
  const runMigration = () =>
    run(async () => {
      setMigrateResult(await migrateOlderLayout());
      setSettings(await getProject());
      onMigrated?.();
    });

  return { settings, error, working, offer, initResult, copyResult, migrateResult, switched, actions: { switchProject, finishSwitch, pickFolder, pickCodeBase, chooseRelocation, retrySwitch, runInit, runMigration } };
}
