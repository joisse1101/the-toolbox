// A temp project config for a test: names `dataDir` as the data folder. Returns the config file's path, for PLANNER_CONFIG.
// The config sits in its own temp folder, never in the data folder and never at planner/planner.config.yaml.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function tempConfig(dataDir, projectName = 'Test') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-config-'));
  const file = path.join(dir, 'planner.config.yaml');
  // JSON strings are valid double-quoted YAML, so a Windows path keeps its backslashes.
  fs.writeFileSync(file, `projectName: ${JSON.stringify(projectName)}\ndataDir: ${JSON.stringify(path.resolve(dataDir))}\n`);
  return file;
}
