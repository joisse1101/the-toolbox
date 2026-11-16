import TabHeader from './TabHeader.jsx';
import { Row } from './Layout.jsx';

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

  return (
    <section id="settingsView" className="card" role="tabpanel" aria-labelledby="tabSettings" hidden={hidden}>
      <TabHeader title="Settings" />
      {error && <p className="warning" role="alert">{error}</p>}
      {switched && !error && <p className="muted" role="status">{SESSION_NOTE}</p>}
      {settings && (
        <>
          <section className="settings-group" aria-labelledby="settingsProjectHeading">
            <h3 id="settingsProjectHeading">Project</h3>
            <div className="settings-field">
              <label htmlFor="codeBase">Code base</label>
              <Row align="stretch">
                <input type="text" id="codeBase" className="grow settings-path" value={settings.codeBase ?? ''} title={settings.codeBase ?? undefined} placeholder="Not set: the data folder below is used" readOnly />
                <div className="settings-action">
                  <button type="button" id="changeCodeBaseBtn" aria-describedby="tipChangeCodeBase" disabled={working || !!offer} onClick={actions.pickCodeBase}>Change code base</button>
                  <p className="tip" role="tooltip" id="tipChangeCodeBase">Copies the current backlogs into the code base's <code>.plans</code> folder. The old folder keeps its files.</p>
                </div>
                {!settings.codeBase && (
                  <div className="settings-action">
                    <button type="button" id="moveToCodeBaseBtn" aria-describedby="tipMoveToCodeBase" disabled={working || !!offer} onClick={actions.pickCodeBase}>Move data into a code base</button>
                    <p className="tip" role="tooltip" id="tipMoveToCodeBase">Same as above: the data is copied, and the saved project follows.</p>
                  </div>
                )}
              </Row>
            </div>
          </section>
          <section className="settings-group" aria-labelledby="settingsStorageHeading">
            <h3 id="settingsStorageHeading">Storage</h3>
            <div className="settings-field">
              <label htmlFor="dataDir">Data folder</label>
              <Row align="stretch">
                <input type="text" id="dataDir" className="grow settings-path" value={settings.dataDir} title={settings.dataDir} readOnly />
                <div className="settings-action">
                  <button type="button" id="changeFolderBtn" aria-describedby="tipChangeFolder" disabled={working || !!offer} onClick={actions.pickFolder}>Change folder</button>
                  <p className="tip" role="tooltip" id="tipChangeFolder">Copies the current backlogs to the new folder and the saved project follows. The old folder keeps its files.</p>
                </div>
                <div className="settings-action">
                  <button type="button" id="initBtn" aria-describedby="tipInit" disabled={working || !!offer} onClick={actions.runInit}>Create missing folders</button>
                  <p className="tip" role="tooltip" id="tipInit">Adds any folder the planner expects. Existing files are not touched.</p>
                </div>
              </Row>
            </div>
            <div className="settings-field">
              <label htmlFor="configPath">Config file</label>
              <input type="text" id="configPath" className="settings-path" value={settings.configPath} title={settings.configPath} readOnly />
            </div>
          </section>

          {offer && !offer.ready && (
            <div id="folderOffer" className="card">
              <p>
                <code>{offer.dir}</code> already holds planner files. Overwrite replaces these files with the current data; other
                files there are left as they are. Just switch copies nothing and shows the files already there.
              </p>
              <ul id="overwriteList">{offer.exists.map((file) => <li key={file}><code>{file}</code></li>)}</ul>
              <Row>
                <button type="button" id="overwriteBtn" className="offer-danger" disabled={working} onClick={() => actions.chooseRelocation('overwrite')}>Overwrite</button>
                <button type="button" id="justSwitchBtn" disabled={working} onClick={() => actions.chooseRelocation('switch')}>Just switch</button>
                <button type="button" id="cancelOfferBtn" disabled={working} onClick={() => actions.chooseRelocation('cancel')}>Cancel</button>
              </Row>
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
