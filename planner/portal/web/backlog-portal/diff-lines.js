// Turns the colored text of `git diff --color=always` into lines of { text, kind } pieces, so the Backups tab can
// show it as escaped text in styled spans. Only the handful of colors the server asks git for are known;
// anything else is shown uncolored.

const KIND_BY_CODE = { 1: 'meta', 31: 'removed', 32: 'added', 34: 'moved-from', 35: 'hunk', 36: 'moved-to' };
const SGR = /\x1b\[([0-9;]*)m/g;

function kindOf(params) {
  let kind = null;
  for (const code of params.split(';')) {
    if (code === '' || code === '0') kind = null;
    else if (KIND_BY_CODE[code]) kind = KIND_BY_CODE[code];
  }
  return kind;
}

export function diffLines(text) {
  const lines = [[]];
  let kind = null;
  const add = (chunk) => {
    chunk.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, kind });
    });
  };
  let last = 0;
  for (const match of text.matchAll(SGR)) {
    add(text.slice(last, match.index));
    kind = kindOf(match[1]);
    last = match.index + match[0].length;
  }
  add(text.slice(last));
  if (!lines[lines.length - 1].length) lines.pop(); // the text ended with a newline
  return lines;
}
