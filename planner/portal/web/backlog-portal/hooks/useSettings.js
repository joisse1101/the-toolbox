import { useCallback, useEffect, useState } from 'react';
import { getProject, saveProject, checkProjectFolder, pickProjectFolder, initProjectFolder, copyProjectData } from '../../shared/files.js';

// Survives the page reload that follows a switch, so the Settings tab can still show the note about skill sessions.
const SWITCHED_KEY = 'planner.dataDirSwitched';
const SETTLE_FAILED = 'The latest changes could not be saved yet, so the folder was not changed.';

// The project settings (name, data folder, config file) and the flow that changes the folder:
// check the folder, then switch at once when it has planner files, otherwise offer copy or init, then switch.
// `settleAll` resolves true once every pending save is on disk; it runs before the switch and the reload.
export function useSettings(settleAll) {
  const [settings, setSettings] = useState(null); // { projectName, dataDir, configPath }
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  const [offer, setOffer] = useState(null); // { dir, status } while the user chooses copy or init; { dir, ready: true } when only the switch is left
  const [initResult, setInitResult] = useState(null);
  const [copyResult, setCopyResult] = useState(null);
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

  const switchTo = async (dir) => {
    if (!(await settleAll())) throw new Error(SETTLE_FAILED);
    try {
      await saveProject({ dataDir: dir });
    } catch (err) {
      if (err.code === 'busy') setOffer({ dir, ready: true });
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
    if (check.status === 'has-planner-files') return switchTo(check.dir);
    setOffer({ dir: check.dir, status: check.status });
    return undefined;
  };

  // Opens the server's folder dialog; a chosen folder goes through the same flow as any new folder, a cancel does nothing.
  const pickFolder = () =>
    run(async () => {
      const picked = await pickProjectFolder();
      if (picked.cancelled) return undefined;
      return checkAndSwitch(picked.dir);
    });

  // choice: 'copy' or 'init', for the folder in `offer`.
  const chooseForNewFolder = (choice) =>
    run(async () => {
      const { dir } = offer;
      if (choice === 'copy') setCopyResult(await copyProjectData(dir));
      else setInitResult(await initProjectFolder(dir));
      await switchTo(dir);
    });

  const retrySwitch = () => run(() => switchTo(offer.dir));

  const runInit = () =>
    run(async () => {
      setCopyResult(null);
      setInitResult(await initProjectFolder(settings.dataDir));
    });

  return { settings, error, working, offer, initResult, copyResult, switched, actions: { saveName, pickFolder, chooseForNewFolder, retrySwitch, runInit, cancelOffer: () => setOffer(null) } };
}
