'use strict';
// Pure parts of backing up a backlog: the dated folder name, which names are backup folders, and which files
// belong to one backlog. No file access here; the server does the copying.

const STORE_NAMES = ['user-stories', 'reviews', 'proposals', 'lexicons'];
const FOLDER_PATTERN = /^\d{4}-\d{2}-\d{2}_\d{6}(-[1-9]\d*)?$/;

const pad = (n, width = 2) => String(n).padStart(width, '0');

// Local time, sortable as text: 2026-10-15_143205.
function backupFolderName(date) {
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// True for a name backupFolderName can produce, with the optional `-<n>` suffix used when a second backup
// lands in the same second. Anything else (paths, `..`, other text) is not a backup folder.
function isBackupFolderName(text) {
  return typeof text === 'string' && FOLDER_PATTERN.test(text);
}

// The files a backup of one backlog holds, in their store folders. Never the review's `.decided` sidecar.
function backupFiles(name) {
  return STORE_NAMES.map((store) => ({ store, name }));
}

module.exports = { STORE_NAMES, backupFolderName, isBackupFolderName, backupFiles };
