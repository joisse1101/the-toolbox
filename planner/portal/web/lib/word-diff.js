// Word-level diff of two texts, for showing what a suggestion changes. Pure: no DOM.
// Each word keeps the whitespace after it, so the non-removed parts join back to the new text.

const wordsOf = (text) => String(text ?? '').match(/\S+\s*/g) ?? [];

// [{ text, kind }] with kind 'same' | 'added' | 'removed'; neighbouring words of one kind are merged.
// Words are equal when they match ignoring surrounding whitespace.
export function wordDiff(oldText, newText) {
  const a = wordsOf(oldText);
  const b = wordsOf(newText);
  const same = (i, j) => a[i].trim() === b[j].trim();

  // lcs[i][j]: length of the longest common word run of a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = same(i, j) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts = [];
  const push = (text, kind) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text += text;
    else parts.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && same(i, j)) {
      push(b[j++], 'same');
      i++;
    }
    else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) push(a[i++], 'removed'); // removals first
    else push(b[j++], 'added');
  }
  return parts;
}
