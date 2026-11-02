import { useEffect, useState } from 'react';

const SESSION_NOTE = 'Skill scripts and open Claude sessions use the new data folder only after they are started again.';

function FolderList({ title, names }) {
  if (!names.length) return null;
  return <p className="muted">{title}: {names.join(', ')}</p>;
}

// The project name, the data folder and the config file. Always shown, even with no backlog, because an empty new
// folder is exactly when it is needed. `settingsState` is the useSettings hook's result.
export default function SettingsTab({ hidden, settingsState }) {
  const { settings, error, working, offer, initResult, copyResult, switched, actions } = settingsState;
  const [name, setName] = useState('');
  const [dir, setDir] = useState('');

  useEffect(() => {
    if (!settings) return;
    setName(settings.projectName);
    setDir(settings.dataDir);
  }, [settings]);

  const nameChanged = !!settings && name !== settings.projectName;
  const dirChanged = !!settings && dir.trim() !== '' && dir.trim() !== settings.dataDir;

  return (
    <section id="settingsView" className="card" role="tabpanel" aria-labelledby="tabSettings" hidden={hidden}>
      {error && <p className="warning" role="alert">{error}</p>}
      {switched && <p className="muted" role="status">{SESSION_NOTE}</p>}
      {settings && (
        <>
          <div className="row">
            <div className="grow">
              <label htmlFor="projectName">Project name</label>
              <input type="text" id="projectName" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button type="button" id="saveNameBtn" disabled={!nameChanged || working} onClick={() => actions.saveName(name)}>Save name</button>
          </div>
          <div className="row">
            <div className="grow">
              <label htmlFor="dataDir">Data folder (absolute path)</label>
              <input type="text" id="dataDir" autoComplete="off" spellCheck={false} value={dir} onChange={(e) => setDir(e.target.value)} />
            </div>
            <button type="button" id="changeFolderBtn" disabled={!dirChanged || working} onClick={() => actions.changeFolder(dir.trim())}>Change folder</button>
            <button type="button" id="initBtn" disabled={working || !!offer} onClick={actions.runInit}>Create missing folders</button>
          </div>
          <p className="muted">Config file: <code>{settings.configPath}</code></p>

          {offer && !offer.ready && (
            <div id="folderOffer" className="card">
              <p>
                <code>{offer.dir}</code> {offer.status === 'missing' ? 'does not exist yet' : 'has no planner files'}.
                Copy the current data there, or create an empty structure? The folder is switched to afterwards.
              </p>
              <div className="row">
                <button type="button" id="copyBtn" disabled={working} onClick={() => actions.chooseForNewFolder('copy')}>Copy current data</button>
                <button type="button" id="createEmptyBtn" disabled={working} onClick={() => actions.chooseForNewFolder('init')}>Create empty structure</button>
                <button type="button" id="cancelOfferBtn" disabled={working} onClick={actions.cancelOffer}>Cancel</button>
              </div>
            </div>
          )}
          {offer?.ready && (
            <p className="warning">
              The folder is ready, but a save or backup was running. <button type="button" id="retrySwitchBtn" className="link-btn" disabled={working} onClick={actions.retrySwitch}>Try again</button>
            </p>
          )}

          {initResult && (
            <div id="initResult">
              <FolderList title="Created" names={initResult.created} />
              <FolderList title="Already there" names={initResult.existing} />
            </div>
          )}
          {copyResult && <p className="muted">Copied {copyResult.copied.length} file(s), skipped {copyResult.skipped.length}.</p>}
        </>
      )}
    </section>
  );
}
