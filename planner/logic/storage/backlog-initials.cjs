'use strict';
// A backlog's initials: the short code that starts every story ID of the backlog (`B1-IAM-0003`). They live in
// `backlog.json` in the backlog's folder as {"initials":"B1"}. This file reads and writes that file, checks a value, picks
// the default and finds a clash among sibling backlogs. It imports nothing outside storage/.

const fs = require('fs');
const path = require('path');
const { HttpError } = require('./file-name.cjs');
const { backlogDir } = require('./backlog-paths.cjs');

const SETTINGS_FILE = 'backlog.json';
const INITIALS_RULE = 'Initials are 1 to 6 letters or digits, start with a letter and have no hyphen.';
const VALID = /^[A-Z][A-Z0-9]{0,5}$/;
const MAX_DEFAULT_TRIES = 10000;

function settingsFile(dataDir, name) {
  return path.join(backlogDir(dataDir, name), SETTINGS_FILE);
}

// The initials as stored (trimmed, uppercased), or throws a 400 HttpError that says what is valid.
function validateInitials(value) {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!VALID.test(text)) throw new HttpError(400, INITIALS_RULE, 'invalid-initials');
  return text;
}

// The initials saved in the backlog's backlog.json, or null when the file is missing, unreadable or holds no valid value.
function readInitials(dataDir, name) {
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile(dataDir, name), 'utf8'));
    return VALID.test(data && data.initials) ? data.initials : null;
  } catch {
    return null;
  }
}

// Writes {"initials":"<value>"} (validated and uppercased) to the backlog's backlog.json and returns the stored value.
function writeInitials(dataDir, name, value) {
  const initials = validateInitials(value);
  const file = settingsFile(dataDir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ initials }) + '\n', 'utf8');
  fs.renameSync(tmp, file);
  return initials;
}

// The first part of a story ID, before the first hyphen.
const idInitials = (code) => String(code).split('-')[0].toUpperCase();

// The sibling that clashes with `initials`, or undefined. A sibling is { name, initials, frozenCodes } and clashes when it
// holds the same initials (ignoring case) or one of its frozen IDs starts with them and a hyphen. Siblings are the other
// backlogs: the caller leaves the backlog's own entry out.
function findConflict(initials, siblings) {
  const wanted = String(initials).toUpperCase();
  return siblings.find(
    (s) =>
      (s.initials && String(s.initials).toUpperCase() === wanted) ||
      (s.frozenCodes || []).some((code) => String(code).includes('-') && idInitials(code) === wanted),
  );
}

// The lowest `B<n>` (n from 1) that no sibling conflicts with.
function defaultInitials(siblings) {
  for (let n = 1; n < MAX_DEFAULT_TRIES; n++) {
    if (!findConflict(`B${n}`, siblings)) return `B${n}`;
  }
  throw new HttpError(409, 'Could not find free default initials', 'exists');
}

module.exports = {
  SETTINGS_FILE, INITIALS_RULE, settingsFile, validateInitials, readInitials, writeInitials, findConflict, defaultInitials,
};
