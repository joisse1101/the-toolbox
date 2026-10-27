// Turns a CSV into text with one field per line, so a line diff of two versions shows a changed field as one
// changed line under its column name. Used only to compare backups; the output is never parsed back.

import { parseCsv } from './csv.js';

// Constant, not a row number: inserting a row must not change the lines of the rows after it.
const SEPARATOR = '----';
const INDENT = '  ';

export function flattenCsv(text) {
  const [headers = [], ...rows] = parseCsv(text);
  const lines = [];
  for (const row of rows) {
    const fields = [];
    row.forEach((cell, i) => {
      if (cell === '') return;
      const label = headers[i] || `Column ${i + 1}`;
      const [first, ...more] = cell.replace(/\r\n?/g, '\n').split('\n');
      fields.push(`${label}: ${first}`, ...more.map((line) => INDENT + line));
    });
    if (fields.length) lines.push(SEPARATOR, ...fields);
  }
  return lines.length ? lines.join('\n') + '\n' : '';
}
