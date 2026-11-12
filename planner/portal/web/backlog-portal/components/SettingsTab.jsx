import { useEffect, useState } from 'react';
import TabHeader from './TabHeader.jsx';

const SESSION_NOTE = 'Skill scripts and open Claude sessions use the new data folder only after they are started again.';

function FolderList({ title, names }) {
  if (!names.length) return null;
  return <p className="muted">{title}: {names.join(', ')}</p>;
}

// The line after a relocation that copied files; shown once, on the load that follows the switch.
function copySummary(copy) {
  const overwritten = copy.overwritten ? `, overwrote ${copy.overwritten}` : '';
  return `Copied ${copy.copied} file(s)${overwritten}, skipped ${copy.skipped}.`;
}

// The project name, the data folder and the config file. Always shown, even with no backlog, because an empty new
// folder is exactly when it is needed. `settingsState` is the useSettings hook's result.
export default function SettingsTab({ hidden, settingsState }) {
  const { settings, error, working, offer, initResult, copyResult, migrateResult, switched, actions } = settingsState;
  const [name, setName] = useState('');

  useEffect(() => {
    if (!settings) return;
    setName(settings.projectName);
  }, [settings]);

  const nameChanged = !!settings && name !== settings.projectName;

  return (
    <section id="settingsView" className="card" role="tabpanel" aria-labelledby="tabSettings" hidden={hidden}>
      <TabHeader title="Settings" />
      {error && <p className="warning" role="alert">{error}</p>}
      {switched && !error && <p className="muted" role="status">{SESSION_NOTE}</p>}
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
              <label htmlFor="dataDir">Data folder</label>
              <input type="text" id="dataDir" disabled value={settings.dataDir} readOnly />
            </div>
            <button type="button" id="changeFolderBtn" disabled={working || !!offer} onClick={actions.pickFolder}>Change folder</button>
            <button type="button" id="initBtn" disabled={working || !!offer} onClick={actions.runInit}>Create missing folders</button>
          </div>
          <div className="row">
            <div className="grow">
              <label htmlFor="codeBase">Code base</label>
              <input type="text" id="codeBase" disabled value={settings.codeBase ?? ''} placeholder="Not set: the data folder above is used" readOnly />
            </div>
            <button type="button" id="changeCodeBaseBtn" disabled={working || !!offer} onClick={actions.pickCodeBase}>Change code base</button>
            {!settings.codeBase && (
              <button type="button" id="moveToCodeBaseBtn" disabled={working || !!offer} onClick={actions.pickCodeBase}>Move data into a code base</button>
            )}
          </div>
          <p className="muted">
            Changing the folder or the code base moves this project: the current backlogs are copied to the new place and the saved
            project follows. A code base keeps its backlogs in its <code>.plans</code> folder. The old folder keeps its files.
          </p>
          <p className="muted">Config file: <code>{settings.configPath}</code></p>

          {offer && !offer.ready && (
            <div id="folderOffer" className="card">
              <p>
                <code>{offer.dir}</code> already holds planner files. Overwrite replaces these files with the current data; other
                files there are left as they are. Just switch copies nothing and shows the files already there.
              </p>
              <ul id="overwriteList">{offer.exists.map((file) => <li key={file}><code>{file}</code></li>)}</ul>
              <div className="row">
                <button type="button" id="overwriteBtn" disabled={working} onClick={() => actions.chooseRelocation('overwrite')}>Overwrite</button>
                <button type="button" id="justSwitchBtn" disabled={working} onClick={() => actions.chooseRelocation('switch')}>Just switch</button>
                <button type="button" id="cancelOfferBtn" disabled={working} onClick={() => actions.chooseRelocation('cancel')}>Cancel</button>
              </div>
            </div>
          )}
          {offer?.ready && (
            <p className="warning">
              A save was running, so the folder was not changed. <button type="button" id="retrySwitchBtn" className="link-btn" disabled={working} onClick={actions.retrySwitch}>Try again</button>
            </p>
          )}

          {initResult && (
            <div id="initResult">
              <FolderList title="Created" names={initResult.created} />
              <FolderList title="Already there" names={initResult.existing} />
              {initResult.createdBacklog && (
                <p className="muted" id="initBacklog">First backlog created: {initResult.createdBacklog}.</p>
              )}
            </div>
          )}
          {copyResult && <p className="muted" id="copyResult">{copySummary(copyResult)}</p>}

          {settings.olderLayout?.length > 0 && (
            <div id="migrateNotice" className="card">
              <p>
                This data folder still holds the older layout ({settings.olderLayout.join(', ')}). The portal reads backlog folders only.
                Migrating copies it into one folder per backlog; the older files are left as they are.
              </p>
              <button type="button" id="migrateBtn" disabled={working || !!offer} onClick={actions.runMigration}>Migrate older layout</button>
            </div>
          )}
          {migrateResult && (
            <div id="migrateResult">
              <p className="muted">Migrated {migrateResult.copied.length} file(s), skipped {migrateResult.skipped.length}, failed {migrateResult.failed.length}.</p>
              {migrateResult.failed.length > 0 && (
                <ul className="warning">{migrateResult.failed.map((f) => <li key={f.file}>{f.file}: {f.message}</li>)}</ul>
              )}
              {migrateResult.skipped.length > 0 && (
                <ul className="muted">{migrateResult.skipped.map((s) => <li key={s.file}>{s.file}: {s.reason}</li>)}</ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
