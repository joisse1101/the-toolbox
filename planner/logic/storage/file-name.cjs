'use strict';
// File-name rules for every CSV the tools read or write: the backend's file API and the AI skill scripts share them.

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Returns the safe file name (forced .csv) or throws HttpError(400).
function validateName(raw) {
  if (typeof raw !== 'string') throw new HttpError(400, 'File name is required', 'invalid-name');
  let name = raw.trim();
  if (!name) throw new HttpError(400, 'File name is required', 'invalid-name');
  if (!/\.csv$/i.test(name)) name += '.csv';
  const base = name.slice(0, -4);
  if (!base.trim()) throw new HttpError(400, 'File name is required', 'invalid-name');
  if (/[\\/:*?"<>|\x00-\x1f]/.test(name)) {
    throw new HttpError(400, 'File name cannot contain \\ / : * ? " < > |', 'invalid-name');
  }
  if (name.includes('..') || /[. ]$/.test(base)) {
    throw new HttpError(400, 'File name is not allowed', 'invalid-name');
  }
  if (RESERVED.test(base)) throw new HttpError(400, `"${base}" is a reserved Windows name`, 'invalid-name');
  if (name.length > 120) throw new HttpError(400, 'File name is too long', 'invalid-name');
  return name;
}

// Names a project-level folder in the data folder that is not a backlog.
const RESERVED_BACKLOG_NAMES = ['logs'];

// Returns the backlog name (its folder name) or throws HttpError(400). A trailing .csv is accepted and dropped, so
// `iam.csv` and `iam` are the same backlog. The name must be a valid Windows folder name and hold no separator.
function validateBacklogName(raw) {
  if (typeof raw !== 'string') throw new HttpError(400, 'Backlog name is required', 'invalid-name');
  let name = raw.trim();
  if (/\.csv$/i.test(name)) name = name.slice(0, -4);
  if (!name.trim()) throw new HttpError(400, 'Backlog name is required', 'invalid-name');
  if (/[\\/:*?"<>|\x00-\x1f]/.test(name)) {
    throw new HttpError(400, 'Backlog name cannot contain \\ / : * ? " < > |', 'invalid-name');
  }
  if (name.includes('..') || /[. ]$/.test(name) || name.startsWith(' ')) {
    throw new HttpError(400, 'Backlog name is not allowed', 'invalid-name');
  }
  if (RESERVED.test(name.split('.')[0])) throw new HttpError(400, `"${name}" is a reserved Windows name`, 'invalid-name');
  if (RESERVED_BACKLOG_NAMES.includes(name.toLowerCase())) {
    throw new HttpError(400, `"${name}" is reserved`, 'reserved-name');
  }
  if (name.length > 116) throw new HttpError(400, 'Backlog name is too long', 'invalid-name');
  return name;
}

module.exports = { HttpError, validateName, validateBacklogName, RESERVED_BACKLOG_NAMES };
