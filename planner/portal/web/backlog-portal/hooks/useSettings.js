import { useCallback, useEffect, useState } from 'react';
import { getProject, saveProject, checkProjectFolder, checkCodeBase, pickProjectFolder, initProjectFolder, initCodeBase, copyProjectData, copyToCodeBase, migrateOlderLayout } from '../../shared/files.js';

// Survives the page reload that follows a switch, so the Settings tab can still show the note about skill sessions.
const SWITCHED_KEY = 'planner.dataDirSwitched';
const SETTLE_FAILED = 'The latest changes could not be saved yet, so the folder was not changed.';

// The project settings (name, data folder, config file) and the flow that changes the folder:
// check the folder, then switch at once when it has planner files, otherwise offer copy or init, then switch.
// `settleAll` resolves true once every pending save is on disk; it runs before the switch and the reload.
// `onMigrated` runs after a migration so the backlog list and the open backlog show the copied folders.
export function useSettings(settleAll, onMigrated) {
  const [settings, setSettings] = useState(null); // { projectName, dataDir, configPath, codeBase? }
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  // { dir, status, isCodeBase?, move? } while the user chooses copy or init; { dir, isCodeBase, ready: true } when only the switch is left
  const [offer, setOffer] = useState(null);
  const [initResult, setInitResult] = useState(null);
  const [copyResult, setCopyResult] = useState(null);
  const [migrateResult, setMigrateResult] = useState(null); // { copied, skipped, failed } after the user runs the migration
  const [switched, setSwitched] = useState(() => sessionStorage.getItem(SWITCHED_KEY) === '1');

  useEffect(() => {
    getProject().then(setSettings, (err) => setError(err.message));
  }, []);

  // Runs one action with the working flag and the error line.
  const run = useCallback(async (action) => {
    setError(null);
    setWorking(true);
    try {
      return await action();
    } catch (err) {
      setError(err.message);
      return undefined;
    } finally {
      setWorking(false);
    }
  }, []);

  const saveName = (projectName) =>
    run(async () => {
      setSettings(await saveProject({ projectName }));
    });

  // `isCodeBase` saves `codeBase` (the server derives `.plans` and drops `dataDir`); otherwise it saves `dataDir`.
  const switchTo = async (dir, isCodeBase = false) => {
    if (!(await settleAll())) throw new Error(SETTLE_FAILED);
    try {
      await saveProject(isCodeBase ? { codeBase: dir } : { dataDir: dir });
    } catch (err) {
      if (err.code === 'busy') setOffer({ dir, isCodeBase, ready: true });
      throw err;
    }
    sessionStorage.setItem(SWITCHED_KEY, '1');
    window.location.reload();
  };

  const checkAndSwitch = async (dir) => {
    setOffer(null);
    setInitResult(null);
    setCopyResult(null);
    const check = await checkProjectFolder(dir);
    if (check.status === 'refused') throw new Error(check.reason);
    // A folder holding only the older layout is switched to as well; the Settings tab then offers the migration.
    if (check.status === 'has-planner-files' || check.status === 'older-layout') return switchTo(check.dir);
    setOffer({ dir: check.dir, status: check.status });
    return undefined;
  };

  // The same flow for a code base, checked on its `.plans` folder. `move` is the offer to move a data folder setup
  // into a code base: it always asks, even when `.plans` already holds planner files, because the copy is the point.
  const checkCodeBaseAndSwitch = async (codeBase, move) => {
    setOffer(null);
    setInitResult(null);
    setCopyResult(null);
    const check = await checkCodeBase(codeBase);
    if (check.status === 'refused') throw new Error(check.reason);
    const hasFiles = check.status === 'has-planner-files' || check.status === 'older-layout';
    if (hasFiles && !move) return switchTo(check.codeBase, true);
    setOffer({ dir: check.codeBase, status: check.status, isCodeBase: true, move });
    return undefined;
  };

  // Opens the server's folder dialog; a chosen folder goes through the same flow as any new folder, a cancel does nothing.
  const pickFolder = () =>
    run(async () => {
      const picked = await pickProjectFolder();
      if (picked.cancelled) return undefined;
      return checkAndSwitch(picked.dir);
    });

  // Same dialog for a code base. `move` marks the "move my data into a code base" offer.
  const pickCodeBase = (move = false) =>
    run(async () => {
      const picked = await pickProjectFolder();
      if (picked.cancelled) return undefined;
      return checkCodeBaseAndSwitch(picked.dir, move);
    });

  // choice: 'copy' or 'init', for the folder in `offer`.
  const chooseForNewFolder = (choice) =>
    run(async () => {
      const { dir, isCodeBase } = offer;
      if (choice === 'copy') setCopyResult(await (isCodeBase ? copyToCodeBase(dir) : copyProjectData(dir)));
      else setInitResult(await (isCodeBase ? initCodeBase(dir) : initProjectFolder(dir)));
      await switchTo(dir, isCodeBase);
    });

  const retrySwitch = () => run(() => switchTo(offer.dir, offer.isCodeBase));

  const runInit = () =>
    run(async () => {
      setCopyResult(null);
      setInitResult(await initProjectFolder(settings.dataDir));
    });

  // Only on the user's click. Reloads the settings afterwards so the older-layout notice follows what is left,
  // and asks the page to re-read the backlog list so the copied backlogs appear without a reload.
  const runMigration = () =>
    run(async () => {
      setMigrateResult(await migrateOlderLayout());
      setSettings(await getProject());
      onMigrated?.();
    });

  return { settings, error, working, offer, initResult, copyResult, migrateResult, switched, actions: { saveName, pickFolder, pickCodeBase, chooseForNewFolder, retrySwitch, runInit, runMigration, cancelOffer: () => setOffer(null) } };
}
