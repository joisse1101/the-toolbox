// Loaded by `npm test` (node --test --import ./test/setup.mjs). Points the project config at the committed test config,
// whose dataDir is the sample data, so no test reads the real, git-ignored planner/data/. Nothing else is set: the data
// folder has no environment variable any more.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.PLANNER_CONFIG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sample-config.yaml');
