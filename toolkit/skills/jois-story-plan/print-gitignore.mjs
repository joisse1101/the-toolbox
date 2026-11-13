#!/usr/bin/env node
// Prints the .gitignore block for the planner's data folder, built from the file table (references/plans-files.md), and
// writes nothing. The user reviews the block and adds it to .gitignore themselves. Usage:
//   node <skill folder>/print-gitignore.mjs
// The data folder is the .plans folder in the current folder (see lib/skill-support/resolve-data-dir.mjs).

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { dataDirOrThrow } from './lib/skill-support/resolve-data-dir.mjs';
import { gitignoreBlock } from './lib/skill-support/plans-files.mjs';

// The text to print for a data folder and the project root: the block, or a sentence saying none is needed.
export function gitignoreText({ dataDir, root }) {
  return gitignoreBlock({ dataDir, root }) ?? `No .gitignore block is needed: the data folder ${dataDir} is not inside the project ${path.resolve(root)}.\n`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (process.argv.length !== 2) {
    console.error('Usage: node print-gitignore.mjs  (prints the .gitignore block; writes nothing)');
    process.exit(2);
  }
  let text;
  try {
    text = gitignoreText({ dataDir: dataDirOrThrow(), root: process.cwd() });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  process.stdout.write(text);
}
