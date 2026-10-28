// What the repo tools may touch. Pure: the tools resolve real paths (symbolic links and junctions followed) and ask here
// whether a real path is inside the repo and not excluded. The baseline always applies; the user's `exclude` globs only
// add to it, so there is no way to remove a baseline entry (a `!` negation is refused).
import path from 'node:path';

export const BASELINE = ['.git/', 'node_modules/', '.env*', '*.pem', '*.key', '*.pfx', 'id_rsa*', 'credentials*', 'secrets.*'];

// A glob body as regular-expression source, one pass so that a translated part is never translated again.
function globSource(body) {
  let source = '';
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (c === '*' && body[i + 1] === '*') {
      if (body[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (c === '*') source += '[^/]*';
    else if (c === '?') source += '[^/]';
    else source += c.replace(/[.+^${}()|[\]\\]/, '\\$&');
  }
  return source;
}

// One gitignore-style glob -> { re, anchored, dirOnly }: `*` and `?` stay inside a segment, `**` crosses segments, a glob
// holding a `/` (other than a trailing one) is anchored at the repo root, otherwise it matches a name at any depth.
function compile(glob, caseSensitive) {
  const dirOnly = glob.endsWith('/');
  const body = dirOnly ? glob.slice(0, -1) : glob;
  const anchored = body.includes('/');
  return { re: new RegExp(`^${globSource(body.replace(/^\//, ''))}$`, caseSensitive ? '' : 'i'), anchored, dirOnly };
}

// `rel`: a path inside the repo, forward slashes, no leading `./`. A glob that matches the file or any folder above it
// excludes the file. `dirOnly` globs match folders only, so they are tested against the folders above the file.
export function isExcluded(rel, exclude = [], { caseSensitive = true } = {}) {
  const parts = rel.split('/').filter(Boolean);
  return [...BASELINE, ...exclude].some((glob) => {
    const { re, anchored, dirOnly } = compile(glob, caseSensitive);
    for (let end = 1; end <= parts.length; end += 1) {
      if (dirOnly && end === parts.length) break;
      const candidate = anchored ? parts.slice(0, end).join('/') : parts[end - 1];
      if (re.test(candidate)) return true;
    }
    return false;
  });
}

// `real` relative to `rootReal` with forward slashes, or null when it is not inside (or is the root's parent or sibling).
export function relativeInside(rootReal, real, { caseSensitive = true } = {}) {
  const fold = (s) => (caseSensitive ? s : s.toLowerCase());
  const rel = path.relative(fold(rootReal), fold(real));
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  const parts = path.relative(rootReal, real).split(path.sep);
  return rel === '' ? '' : parts.join('/');
}

// The decision for one real path: { allowed: true, rel } or { allowed: false, reason: 'outside' | 'excluded' }. The reply
// to the session names the rule, never the target.
export function decide({ rootReal, real, exclude = [], caseSensitive = true }) {
  const rel = relativeInside(rootReal, real, { caseSensitive });
  if (rel === null) return { allowed: false, reason: 'outside' };
  if (rel !== '' && isExcluded(rel, exclude, { caseSensitive })) return { allowed: false, reason: 'excluded' };
  return { allowed: true, rel };
}

// repo.json -> { path, exclude }. Throws naming the key. `path` may be missing or empty (the session then has no repo
// tools); `exclude` defaults to [].
export function validateRepoConfig(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('repo.json must be an object with "path" and "exclude"');
  const { path: repoPath = '', exclude = [], ...rest } = raw;
  const unknown = Object.keys(rest);
  if (unknown.length) throw new Error(`repo.json: unknown key "${unknown[0]}" (the keys are "path" and "exclude")`);
  if (typeof repoPath !== 'string') throw new Error('repo.json: "path" must be a string');
  if (!Array.isArray(exclude) || exclude.some((g) => typeof g !== 'string' || g.trim() === '')) throw new Error('repo.json: "exclude" must be a list of non-empty strings');
  const bad = exclude.find((g) => g.trim().startsWith('!'));
  if (bad) throw new Error(`repo.json: "exclude" entry "${bad}" is a negation; exclude only adds to the built-in list`);
  return { path: repoPath, exclude: exclude.map((g) => g.trim()) };
}
