// Loaded by `npm test` (node --test --import ./test/setup.mjs). Points the data folder at the committed sample data, so
// no test reads the real, git-ignored planner/data/. An explicit PLANNER_DATA_DIR still wins, and the old name is cleared
// because paths.cjs would honour it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.PLANNER_DATA_DIR ||= path.join(path.dirname(fileURLToPath(import.meta.url)), 'sample-data');
delete process.env.TLT_DATA_DIR;
