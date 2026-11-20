// GENERATED. Do not edit this copy.
// The story index of a design canvas (viewer/shared/guidelines/design-conventions.md): reads it out of `Main.dc.html` (or
// from bare JSON), checks its shape, compares it with the backlog's stories and checks that every criterion has an artboard.
// Pure: no file is read or written, so jois-story-design and jois-story-plan each run it from their own script. The
// comparison uses the same categories as read-diagrams.mjs (changed, missing, new); a story with an open clarification
// is left out of a design on purpose, so it is never reported as new.

                                         
import { clarificationsCellText } from '../backlog/model.mjs';
import { sameTitle } from '../backlog/story-ref.mjs';
import { openCount, parseClarifications } from '../backlog/story-text.mjs';

                                            
                                               

                         
                                  
                                                      
                                                                    

                                 
               
                      
                      
 

                             
                
                             
 

                              
             
                  
                     
                        
                        
 

// An index that cannot be read. `line` (1-based, in the text given to parseIndexText) is set when the fault has a place
// in the text; `field` names the part of the object that is wrong, such as `stories[0].criteria[1].kind`.
export class IndexError extends Error {
  line         ;
  field         ;
  constructor(message        , { line, field }                                    = {}) {
    super(line === undefined ? message : `line ${line}: ${message}`);
    this.name = 'IndexError';
    this.line = line;
    this.field = field;
  }
}

const INDEX_MARKER = 'const index = ';
const VIEWPORTS                      = ['desktop', 'mobile'];
const KINDS                           = ['main', 'failure'];
const ERROR_STATE = 'error';

const lineAt = (text        , offset        )         => text.slice(0, offset).split('\n').length;

// The offset one past the brace that closes the object opening at `start`, scanning outside double-quoted strings.
function matchingBrace(text        , start        )         {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  throw new IndexError('the index object is never closed: no matching "}" outside a string', { line: lineAt(text, start) });
}

// The JSON text of the index inside `text` and the offset where it starts: the object after `const index = ` in a
// Main.dc.html file, or the whole text when it is bare JSON.
function cutIndex(text        )                                   {
  const at = text.indexOf(INDEX_MARKER);
  if (at === -1) {
    const offset = text.length - text.trimStart().length;
    if (!text.trimStart().startsWith('{')) throw new IndexError(`found no "${INDEX_MARKER}{" in the text and it is not a bare JSON object`);
    return { json: text.slice(offset), offset };
  }
  const start = at + INDEX_MARKER.length;
  if (text[start] !== '{') throw new IndexError(`"${INDEX_MARKER}" is not followed by "{"`, { line: lineAt(text, start) });
  return { json: text.slice(start, matchingBrace(text, start)), offset: start };
}

const WHITESPACE = /^[ \t\n\r]$/;

// The offset of the first character that strict JSON does not allow in `json`, or -1 when it is all valid. Node's own
// error text names no position, so the line of a fault comes from this scan.
function jsonFault(json        )         {
  let i = 0;
  const skipSpace = ()       => {
    while (WHITESPACE.test(json[i] ?? 'x')) i++;
  };
  const literal = (word        )         => (json.startsWith(word, i) ? ((i += word.length), -1) : i);
  const string = ()         => {
    i++;
    while (i < json.length && json[i] !== '"') {
      if (json[i] === '\n') return i;
      i += json[i] === '\\' ? 2 : 1;
    }
    return i >= json.length ? i : ((i += 1), -1);
  };
  const number = ()         => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(json.slice(i));
    return match ? ((i += match[0].length), -1) : i;
  };
  const list = (close        , item              )         => {
    i++;
    skipSpace();
    if (json[i] === close) return (i++, -1);
    for (;;) {
      const bad = item();
      if (bad !== -1) return bad;
      skipSpace();
      if (json[i] === close) return (i++, -1);
      if (json[i] !== ',') return i;
      i++;
      skipSpace();
    }
  };
  const member = ()         => {
    if (json[i] !== '"') return i;
    const bad = string();
    if (bad !== -1) return bad;
    skipSpace();
    if (json[i] !== ':') return i;
    i++;
    skipSpace();
    return value();
  };
  const value = ()         => {
    const ch = json[i];
    if (ch === '{') return list('}', member);
    if (ch === '[') return list(']', value);
    if (ch === '"') return string();
    if (ch === 't') return literal('true');
    if (ch === 'f') return literal('false');
    if (ch === 'n') return literal('null');
    return number();
  };
  skipSpace();
  const bad = value();
  if (bad !== -1) return bad;
  skipSpace();
  return i < json.length ? i : -1;
}

// Reads the index out of the full text of Main.dc.html, or out of a bare JSON object, and checks its shape.
// Throws an IndexError that names the line of a JSON fault, or the field of a shape fault.
export function parseIndexText(text        )              {
  const source = text.replace(/\r\n/g, '\n');
  const { json, offset } = cutIndex(source);
  let value         ;
  try {
    value = JSON.parse(json);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const line = lineAt(source, offset + Math.max(jsonFault(json), 0));
    throw new IndexError(`the index is not valid JSON (${reason}); it must be strict JSON: double-quoted keys, no comments, no trailing commas`, { line });
  }
  return validateIndex(value);
}

const isRecord = (v         )                               => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v         )              => typeof v === 'string' && v.trim() !== '';

function fail(field        , rule        )        {
  throw new IndexError(`${field} ${rule}`, { field });
}

function textField(obj                         , key        , path        )         {
  const v = obj[key];
  if (!isText(v)) fail(`${path}${key}`, 'must be a non-empty string');
  return v;
}

function validateScope(value         )              {
  if (!isRecord(value)) return fail('scope', 'must be an object');
  const epic = textField(value, 'epic', 'scope.');
  if (value.type === 'epic') return { type: 'epic', epic };
  if (value.type === 'feature') return { type: 'feature', epic, feature: textField(value, 'feature', 'scope.') };
  if (value.type === 'story') return { type: 'story', epic, feature: textField(value, 'feature', 'scope.'), title: textField(value, 'title', 'scope.') };
  return fail('scope.type', 'must be "epic", "feature" or "story"');
}

function validateViewports(value         )             {
  if (!Array.isArray(value) || value.length === 0) return fail('viewports', 'must be a non-empty array');
  const viewports             = [];
  value.forEach((v, i) => {
    const found = VIEWPORTS.find((known) => known === v);
    if (!found) fail(`viewports[${i}]`, `must be "desktop" or "mobile"`);
    if (viewports.includes(found)) fail(`viewports[${i}]`, `repeats "${found}"`);
    viewports.push(found);
  });
  return viewports;
}

function validateCriterion(value         , path        )                 {
  if (!isRecord(value)) return fail(path, 'must be an object');
  const kind = KINDS.find((known) => known === value.kind);
  if (!kind) return fail(`${path}.kind`, 'must be "main" or "failure"');
  const list = value.artboards;
  if (!Array.isArray(list)) return fail(`${path}.artboards`, 'must be an array of artboard file stems');
  const artboards = list.map((stem, i) => {
    if (!isText(stem)) fail(`${path}.artboards[${i}]`, 'must be a non-empty string');
    return stem;
  });
  return { text: textField(value, 'text', `${path}.`), kind, artboards };
}

function validateStory(value         , path        )             {
  if (!isRecord(value)) return fail(path, 'must be an object');
  const title = textField(value, 'title', `${path}.`);
  if (!Array.isArray(value.criteria)) return fail(`${path}.criteria`, 'must be an array');
  return { title, criteria: value.criteria.map((c, i) => validateCriterion(c, `${path}.criteria[${i}]`)) };
}

// Checks the shape of a parsed index; throws an IndexError that names the field at fault.
export function validateIndex(value         )              {
  if (!isRecord(value)) return fail('the index', 'must be an object');
  if (value.version !== 1) fail('version', `must be 1 (found ${JSON.stringify(value.version) ?? 'nothing'})`);
  if (!Array.isArray(value.stories)) fail('stories', 'must be an array');
  return {
    version: 1,
    backlog: textField(value, 'backlog', ''),
    scope: validateScope(value.scope),
    viewports: validateViewports(value.viewports),
    stories: value.stories.map((s, i) => validateStory(s, `stories[${i}]`)),
  };
}

const norm = (s         )         => String(s ?? '').trim().toLowerCase();

// The stories of the backlog the scope covers, by Epic, Feature and Title (the same match as the plan skill's source.json).
export function storiesInScope(backlogStories                  , scope             )          {
  return backlogStories.filter((s) => {
    if (norm(s.epic) !== norm(scope.epic)) return false;
    if (scope.type !== 'epic' && norm(s.feature) !== norm(scope.feature)) return false;
    if (scope.type === 'story' && !sameTitle(s.title, scope.title)) return false;
    return true;
  });
}

// The criteria of a story as the index holds them: the text after the `AC<n>:` label, in the story's order.
export function criterionTexts(story       )           {
  if (typeof story.rawCriteria === 'string') {
    return story.rawCriteria
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => (/^\s*AC\d+\s*:\s*(.*)$/i.exec(l)?.[1] ?? l).trim());
  }
  return story.criteria
    .filter((c) => c.given.trim() || c.when.trim() || c.then.trim())
    .map((c) => `Given ${c.given.trim()}, when ${c.when.trim()}, then ${c.then.trim()}`);
}

// A story with an open question is left out of a design on purpose. A clarification cell that does not parse counts as
// not open, as in the freeze writer.
function hasOpenClarification(story       )          {
  const parsed = parseClarifications(clarificationsCellText(story));
  return parsed.ok && openCount(parsed.pairs) > 0;
}

                               
                
                                                                                        
                                                                       
 

                                  
                          
                                                                        
                                                                                                                    
                 
 

const sameTexts = (a                   , b                   )          => a.length === b.length && a.every((t, i) => t.trim() === b[i].trim());

// The index against the stories of the backlog the index's scope covers. `backlogStories` is every story of the backlog
// (loadBacklog's stories); the scope narrows it.
export function compareIndex(index             , backlogStories                  )                  {
  const inScope = storiesInScope(backlogStories, index.scope);
  const taken = new Set       ();
  const changed                 = [];
  const missing           = [];
  for (const entry of index.stories) {
    const story = inScope.find((s) => !taken.has(s) && sameTitle(s.title, entry.title));
    if (!story) {
      missing.push(entry.title);
      continue;
    }
    taken.add(story);
    const indexed = entry.criteria.map((c) => c.text);
    const current = criterionTexts(story);
    if (sameTexts(indexed, current)) continue;
    changed.push({
      title: entry.title,
      removed: indexed.filter((t) => !current.some((c) => c.trim() === t.trim())),
      added: current.filter((c) => !indexed.some((t) => t.trim() === c.trim())),
    });
  }
  const added = inScope.filter((s) => !taken.has(s) && !hasOpenClarification(s)).map((s) => s.title.trim());
  return { changed, missing, new: added, stale: changed.length > 0 || missing.length > 0 || added.length > 0 };
}

                                  
                
                    
 

                                
                                                                             
                                                                                                      
              
 

// What the index itself can prove. Whether each flow clicks through needs the artboards' links, which only a read of the
// canvas shows, so it is not checked here.
export function checkCoverage(index             )                {
  const noArtboard                    = [];
  const noErrorArtboard                    = [];
  for (const story of index.stories) {
    for (const criterion of story.criteria) {
      const problem = { story: story.title, criterion: criterion.text };
      if (criterion.artboards.length === 0) noArtboard.push(problem);
      if (criterion.kind === 'failure' && !criterion.artboards.some((stem) => stem.includes(ERROR_STATE))) noErrorArtboard.push(problem);
    }
  }
  return { noArtboard, noErrorArtboard, ok: noArtboard.length === 0 && noErrorArtboard.length === 0 };
}
