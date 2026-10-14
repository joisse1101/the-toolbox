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

module.exports = { HttpError, validateName };
