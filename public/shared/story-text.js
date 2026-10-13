// Compose and parse the two text-syntax CSV cells:
//   User Story:          As a <a>, I want <w>, so that <s>
//   Acceptance Criteria: AC<n>: Given <g>, when I <w>, then <t>   (one per line)
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

const STORY_KEYWORDS = [/\bas a\b/i, /\bi want\b/i, /\bso that\b/i];
const CRITERION_KEYWORDS = [/\bgiven\b/i, /\bwhen i\b/i, /\bthen\b/i];

export function composeStory({ asA = '', iWant = '', soThat = '' }) {
  if (isBlank(asA, iWant, soThat)) return '';
  return `As a ${asA}, I want ${iWant}, so that ${soThat}`;
}

export function parseStory(text) {
  if (!String(text ?? '').trim()) return { ok: true, asA: '', iWant: '', soThat: '' };
  const parts = splitByKeywords(text, STORY_KEYWORDS);
  if (!parts) return { ok: false };
  const [asA, iWant, soThat] = parts;
  return { ok: true, asA, iWant, soThat };
}

// Criteria with no text at all are skipped; the rest are numbered by position.
export function composeCriteria(criteria) {
  return criteria
    .filter((c) => !isBlank(c.given, c.when, c.then))
    .map((c, i) => `AC${i + 1}: Given ${c.given}, when I ${c.when}, then ${c.then}`)
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
