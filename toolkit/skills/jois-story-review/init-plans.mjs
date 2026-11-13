#!/usr/bin/env node
// Creates the `.plans` data folder in the current folder, and nothing else. Run it only after the user said yes.
// It refuses when a file is named `.plans`. It never creates a backlog; the user does that in the planner.
// Usage: node init-plans.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { initPlans } from './lib/skill-support/init-plans.mjs';
import { gitignoreBlock } from './lib/skill-support/plans-files.mjs';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (process.argv.length !== 2) {
    console.error('Usage: node init-plans.mjs  (creates .plans in the current folder)');
    process.exit(2);
  }
  const result = initPlans({ cwd: process.cwd() });
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(result.created ? `Created ${result.dir}.` : `${result.dir} already exists; nothing changed.`);
  if (result.created) {
    // Nothing is written to .gitignore here: the user reviews the block and adds it themselves.
    console.log('\nThis .gitignore block keeps only the committed planner files in git (see references/plans-files.md). Review it and add it to .gitignore yourself; nothing was written:\n');
    process.stdout.write(gitignoreBlock({ dataDir: result.dir, root: process.cwd() }));
  }
}
