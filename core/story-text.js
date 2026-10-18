// Compose and parse the two text-syntax CSV cells:
//   User Story:          As a <a>, I want <w>, so that <s>
//   User Acceptance Criteria: AC<n>: Given <g>, when <w>, then <t>   (one per line)
// Parsing is a case-insensitive keyword split, first occurrence of each keyword, in order.

const isBlank = (...vals) => vals.every((v) => !String(v ?? '').trim());

// The comma directly before a keyword is a separator, not part of the field.
const clean = (s) => s.trim().replace(/,\s*$/, '').trim();

// Splits `text` at each keyword regex in order. Returns the text between them, or null on failure.
function splitByKeywords(text, keywords) {
  const parts = [];
  let rest = text;
  let started = false;
  for (const kw of keywords) {
    const m = kw.exec(rest);
    if (!m) return null;
    if (!started && rest.slice(0, m.index).trim()) return null; // text before the first keyword
    if (started) parts.push(clean(rest.slice(0, m.index)));
    started = true;
    rest = rest.slice(m.index + m[0].length);
  }
  parts.push(clean(rest));
  return parts;
}

const STORY_KEYWORDS = [/\bas an?\b/i, /\bi want\b/i, /\bso that\b/i];
const CRITERION_KEYWORDS = [/\bgiven\b/i, /\bwhen\b/i, /\bthen\b/i];

// `article` is the "a" or "an" the sentence begins with; a story that has none uses "a".
export function composeStory({ article = 'a', asA = '', iWant = '', soThat = '' }) {
  if (isBlank(asA, iWant, soThat)) return '';
  return `As ${article === 'an' ? 'an' : 'a'} ${asA}, I want ${iWant}, so that ${soThat}`;
}

export function parseStory(text) {
  if (!String(text ?? '').trim()) return { ok: true, article: 'a', asA: '', iWant: '', soThat: '' };
  const parts = splitByKeywords(text, STORY_KEYWORDS);
  if (!parts) return { ok: false };
  const [asA, iWant, soThat] = parts;
  const article = /^\s*as\s+an\b/i.test(text) ? 'an' : 'a';
  return { ok: true, article, asA, iWant, soThat };
}

// Criteria with no text at all are skipped; the rest are numbered by position.
export function composeCriteria(criteria) {
  return criteria
    .filter((c) => !isBlank(c.given, c.when, c.then))
    .map((c, i) => `AC${i + 1}: Given ${c.given}, when ${c.when}, then ${c.then}`)
    .join('\n');
}

export function parseCriteria(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const criteria = [];
  for (const line of lines) {
    const body = line.replace(/^\s*AC\d+\s*:/i, '');
    const parts = splitByKeywords(body, CRITERION_KEYWORDS);
    if (!parts) return { ok: false };
    criteria.push({ given: parts[0], when: parts[1], then: parts[2] });
  }
  return { ok: true, criteria };
}

// Clarifications cell: `Q<n>: question` then `A<n>: answer` per pair, n = position from 1. A question or answer may span
// lines (an answer runs until the next Q<n>:). An empty answer means the question is open.
const Q_LINE = /^\s*Q\d+\s*:[ \t]?(.*)$/i;
const A_LINE = /^\s*A\d+\s*:[ \t]?(.*)$/i;

export const emptyClarification = () => ({ q: '', a: '' });

// Pairs with neither question nor answer are skipped; the rest are numbered by position.
export function composeClarifications(pairs) {
  return pairs
    .filter((p) => !isBlank(p.q, p.a))
    .map((p, i) => `Q${i + 1}: ${p.q.trim()}\nA${i + 1}:${p.a.trim() ? ` ${p.a.trim()}` : ''}`)
    .join('\n');
}

// { ok: true, pairs } or { ok: false } when the text does not follow the form (it is then kept raw).
export function parseClarifications(text) {
  const pairs = [];
  let cur = null;
  let inAnswer = false;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const q = !inAnswer || Q_LINE.test(line) ? Q_LINE.exec(line) : null;
    if (q) {
      cur = { q: q[1], a: '' };
      pairs.push(cur);
      inAnswer = false;
      continue;
    }
    if (!cur) {
      if (line.trim()) return { ok: false };
      continue;
    }
    const a = inAnswer ? null : A_LINE.exec(line);
    if (a) {
      cur.a = a[1];
      inAnswer = true;
    } else if (inAnswer) cur.a += `\n${line}`;
    else cur.q += `\n${line}`;
  }
  for (const p of pairs) {
    p.q = p.q.trim();
    p.a = p.a.trim();
  }
  return { ok: true, pairs };
}

// Open questions: a question with an empty answer. Derived, never stored.
export const openCount = (pairs) => pairs.filter((p) => p.q.trim() && !p.a.trim()).length;
