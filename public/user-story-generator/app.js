import { createFileStore } from '/shared/files.js';
import {
  POINTS, SPLIT_ABOVE, PRIORITIES,
  loadBacklog, serializeBacklog, newBacklogText, newStory, emptyCriterion,
  storyCellText, criteriaCellText, shouldSplit,
} from './model.js';

const store = createFileStore('user-stories');
const $ = (id) => document.getElementById(id);

const SAVE_DEBOUNCE_MS = 600;
const NEW_BACKLOG_NAME = 'new-backlog';

const state = {
  files: [],
  current: null, // selected file name
  backlog: null, // { headers, stories, hasBom }
  selectedId: null,
  lastText: null, // text last read from or written to disk for the current file
  dirty: false, // edits not yet written
  inFlight: null, // promise of the write in progress
  status: 'idle',
};

let saveTimer = null;
let retryTimer = null;
let retryDelay = 2000;

const selected = () => state.backlog?.stories.find((s) => s.id === state.selectedId) ?? null;

// ---------- status and messages ----------

function setStatus(kind, detail = '') {
  state.status = kind;
  const chip = $('saveStatus');
  chip.className = `status-chip ${kind}`;
  chip.textContent = { saved: 'Saved', saving: 'Saving…', failed: 'Save failed', idle: 'No file' }[kind];
  chip.title = detail;
  if (kind === 'failed') showMessage(`${detail} Your edits are kept here and saving will retry automatically.`);
  else if (kind === 'saved') showMessage(null);
}

function showMessage(text) {
  const el = $('message');
  el.hidden = !text;
  el.textContent = text || '';
}

// ---------- auto-save ----------

function markDirty() {
  if (!state.current) return;
  state.dirty = true;
  setStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, SAVE_DEBOUNCE_MS);
}

// One write in flight at a time; edits made during a write trigger one follow-up with the latest state.
function flush() {
  if (state.inFlight || !state.dirty || !state.current) return state.inFlight ?? Promise.resolve();
  clearTimeout(retryTimer);
  const name = state.current;
  const text = serializeBacklog(state.backlog);
  state.dirty = false;
  setStatus('saving');
  state.inFlight = (async () => {
    let failed = false;
    try {
      await store.write(name, text);
      state.lastText = text;
      retryDelay = 2000;
    } catch (err) {
      failed = true;
      state.dirty = true;
      setStatus('failed', err.message);
      retryTimer = setTimeout(flush, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 16000);
    } finally {
      state.inFlight = null;
    }
    if (failed) return;
    if (state.dirty) flush();
    else setStatus('saved');
  })();
  return state.inFlight;
}

// Waits until everything typed so far is on disk. Resolves false if saving is failing.
async function settle() {
  clearTimeout(saveTimer);
  while (state.dirty || state.inFlight) {
    await (state.inFlight ?? flush());
    if (state.status === 'failed') return false;
  }
  return true;
}

// For actions that leave the current file: save first, or ask before discarding failed edits.
async function leaveCurrentFile() {
  if (!state.current || (await settle())) return true;
  if (!confirm('Your latest changes could not be saved. Continue and discard them?')) return false;
  clearTimeout(retryTimer);
  state.dirty = false;
  return true;
}

window.addEventListener('beforeunload', (e) => {
  if (state.dirty || state.inFlight || state.status === 'failed') {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---------- loading ----------

async function refreshFiles() {
  state.files = await store.list();
  renderFileBar();
}

async function loadFile(name) {
  const text = await store.read(name);
  const previousIndex = state.backlog?.stories.findIndex((s) => s.id === state.selectedId) ?? -1;
  state.current = name;
  state.lastText = text;
  state.backlog = loadBacklog(text);
  const stories = state.backlog.stories;
  state.selectedId = stories.length ? stories[Math.min(Math.max(previousIndex, 0), stories.length - 1)].id : null;
  state.dirty = false;
  setStatus('saved');
  renderAll();
}

function clearCurrent() {
  state.current = null;
  state.backlog = null;
  state.selectedId = null;
  state.lastText = null;
  setStatus('idle');
  renderAll();
}

// Re-read the list and the open file (on tab focus). Local unsaved edits always win.
async function refreshFromDisk() {
  try {
    await refreshFiles();
    if (state.current && !state.files.includes(state.current)) {
      showMessage(`${state.current} no longer exists.`);
      state.dirty = false;
      state.files.length ? await loadFile(state.files[0]) : clearCurrent();
      return;
    }
    if (!state.current && state.files.length) return await loadFile(state.files[0]);
    if (!state.current) return;
    const text = await store.read(state.current);
    if (text !== state.lastText && !state.dirty && !state.inFlight) await loadFile(state.current);
  } catch (err) {
    showMessage(err.message);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshFromDisk();
});

// ---------- rendering ----------

function renderFileBar() {
  const select = $('fileSelect');
  select.replaceChildren(...state.files.map((f) => new Option(f, f)));
  select.value = state.current ?? '';
  select.disabled = !state.files.length;
  $('fileName').value = state.current ?? '';
  $('fileName').disabled = !state.current;
}

function renderAll() {
  renderFileBar();
  $('emptyPrompt').hidden = !!state.current;
  $('editor').hidden = !state.current;
  renderStoryList();
  fillForm();
}

function renderStoryList() {
  const list = $('storyList');
  const stories = state.backlog?.stories ?? [];
  list.replaceChildren(
    ...stories.map((s) => {
      const li = document.createElement('li');
      li.dataset.id = s.id;
      li.className = [s.id === state.selectedId ? 'selected' : '', shouldSplit(s) ? 'split' : ''].join(' ').trim();
      if (shouldSplit(s)) li.title = 'Consider splitting this story';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = s.iWant || s.feature || 'New story';
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = s.points || '–';
      li.append(title, badge);
      return li;
    }),
  );
  if (!stories.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No stories yet.';
    li.style.cursor = 'default';
    list.append(li);
  }
  $('deleteStoryBtn').disabled = !selected();
}

function fillForm() {
  const s = selected();
  $('storyForm').hidden = !s;
  if (!s) return;
  for (const id of ['epic', 'capability', 'feature', 'asA', 'iWant', 'soThat', 'notes']) $(id).value = s[id];
  fillPriority(s);
  renderCriteria();
  refreshDerived();
}

function fillPriority(s) {
  const select = $('priority');
  const options = ['', ...PRIORITIES];
  if (s.priority && !options.includes(s.priority)) options.push(s.priority); // never silently change a loaded value
  select.replaceChildren(...options.map((p) => new Option(p || 'None', p)));
  select.value = s.priority;
}

function renderCriteria() {
  const s = selected();
  const host = $('criteria');
  host.replaceChildren(
    ...s.criteria.map((c, i) => {
      const box = document.createElement('div');
      box.className = 'criterion';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'danger criterion-remove';
      remove.textContent = '✕';
      remove.title = 'Remove criterion';
      remove.setAttribute('aria-label', 'Remove criterion');
      remove.addEventListener('click', () => {
        s.criteria.splice(i, 1);
        s.rawCriteria = null;
        renderCriteria();
        refreshDerived();
        markDirty();
      });
      const fields = document.createElement('div');
      fields.className = 'fields';
      for (const [key, label] of [['given', 'Given'], ['when', 'When'], ['then', 'Then']]) {
        const wrap = document.createElement('div');
        const id = `criterion-${i}-${key}`;
        const lab = document.createElement('label');
        lab.htmlFor = id;
        lab.textContent = label;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = id;
        input.value = c[key];
        input.addEventListener('input', () => {
          c[key] = input.value;
          s.rawCriteria = null; // editing the group replaces the original cell text
          refreshDerived();
          markDirty();
        });
        wrap.append(lab, input);
        fields.append(wrap);
      }
      box.append(fields, remove);
      return box;
    }),
  );
}

// Everything computed from the story: previews, warnings, points buttons, split highlight.
function refreshDerived() {
  const s = selected();
  if (!s) return;
  $('storyPreview').textContent = storyCellText(s);
  $('criteriaPreview').textContent = criteriaCellText(s);

  showCellWarning($('storyWarning'), s.rawUserStory, 'The User Story cell does not follow "As a …, I want …, so that …", so it is kept as it is');
  showCellWarning($('criteriaWarning'), s.rawCriteria, 'The Acceptance Criteria cell does not follow "AC1: Given …, when …, then …", so it is kept as it is');

  for (const btn of $('pointsGroup').children) {
    btn.setAttribute('aria-checked', String(String(s.points) === btn.dataset.points));
  }
  const split = shouldSplit(s);
  $('storyForm').classList.toggle('split', split);
  $('splitWarning').hidden = !split;
  renderStoryList();
}

function showCellWarning(el, raw, message) {
  el.hidden = raw === null;
  el.textContent = raw === null ? '' : `${message}: "${raw}". Typing in the fields above replaces it.`;
}

// ---------- form events ----------

for (const id of ['epic', 'capability', 'feature', 'notes']) {
  $(id).addEventListener('input', () => {
    selected()[id] = $(id).value;
    refreshDerived();
    markDirty();
  });
}

for (const id of ['asA', 'iWant', 'soThat']) {
  $(id).addEventListener('input', () => {
    const s = selected();
    s[id] = $(id).value;
    s.rawUserStory = null; // editing the group replaces the original cell text
    refreshDerived();
    markDirty();
  });
}

$('priority').addEventListener('change', () => {
  selected().priority = $('priority').value;
  markDirty();
});

$('addCriterionBtn').addEventListener('click', () => {
  const s = selected();
  s.criteria.push(emptyCriterion());
  renderCriteria();
  refreshDerived();
  markDirty();
});

// Sprint points: one-click Fibonacci buttons; click the selected one again to clear.
for (const p of POINTS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('role', 'radio');
  btn.dataset.points = String(p);
  btn.textContent = p;
  if (p > SPLIT_ABOVE) {
    btn.classList.add('big');
    btn.title = 'Consider splitting';
  }
  btn.addEventListener('click', () => {
    const s = selected();
    s.points = String(s.points) === String(p) ? '' : String(p);
    refreshDerived();
    markDirty();
  });
  $('pointsGroup').append(btn);
}

// ---------- story list ----------

$('storyList').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  state.selectedId = Number(li.dataset.id);
  renderStoryList();
  fillForm();
});

function addStory() {
  const s = newStory(state.backlog.headers);
  state.backlog.stories.push(s);
  state.selectedId = s.id;
  renderStoryList();
  fillForm();
  markDirty();
}

$('addStoryBtn').addEventListener('click', () => {
  addStory();
  $('epic').focus();
});

$('deleteStoryBtn').addEventListener('click', () => {
  const s = selected();
  if (!s || !confirm('Delete the selected story?')) return;
  const stories = state.backlog.stories;
  const i = stories.indexOf(s);
  stories.splice(i, 1);
  state.selectedId = stories.length ? stories[Math.min(i, stories.length - 1)].id : null;
  renderStoryList();
  fillForm();
  markDirty();
});

// ---------- file actions ----------

$('fileSelect').addEventListener('change', async () => {
  const target = $('fileSelect').value;
  showMessage(null);
  try {
    if (!(await leaveCurrentFile())) return renderFileBar();
    state.selectedId = null;
    await loadFile(target);
  } catch (err) {
    showMessage(err.message);
    renderFileBar();
  }
});

$('newBtn').addEventListener('click', async () => {
  showMessage(null);
  try {
    if (!(await leaveCurrentFile())) return;
    const name = await store.create(NEW_BACKLOG_NAME, newBacklogText());
    await refreshFiles();
    state.selectedId = null;
    await loadFile(name);
    addStory(); // a new backlog starts with one blank story
    $('fileName').focus();
    $('fileName').select();
  } catch (err) {
    showMessage(err.message);
  }
});

async function commitRename() {
  const input = $('fileName');
  const wanted = input.value.trim();
  if (!state.current || wanted === state.current) {
    input.value = state.current ?? '';
    return;
  }
  showMessage(null);
  try {
    if (!(await settle())) throw new Error('Cannot rename while your latest changes are unsaved.');
    state.current = await store.rename(state.current, wanted);
    await refreshFiles();
  } catch (err) {
    showMessage(err.message);
    input.value = state.current;
  }
}

$('fileName').addEventListener('change', commitRename);
$('fileName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.target.blur();
  if (e.key === 'Escape') {
    e.target.value = state.current ?? '';
    e.target.blur();
  }
});

$('openBtn').addEventListener('click', async () => {
  showMessage(null);
  try {
    await store.openFolder();
  } catch (err) {
    showMessage(err.message);
  }
});

// ---------- sprint points guideline ----------

async function loadGuideline() {
  const box = $('guidelineText');
  try {
    const res = await fetch('sprint-points-guideline.md', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    box.textContent = await res.text();
  } catch {
    box.textContent = 'The sprint points guideline is unavailable (sprint-points-guideline.md could not be loaded).';
  }
}

function setPinned(pinned) {
  $('guideline').classList.toggle('pinned', pinned);
  $('guidelineBtn').setAttribute('aria-expanded', String(pinned));
}

$('guidelineBtn').addEventListener('click', () => setPinned(!$('guideline').classList.contains('pinned')));
document.addEventListener('click', (e) => {
  if (!e.target.closest('#guideline')) setPinned(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setPinned(false);
});

// ---------- start ----------

(async function init() {
  loadGuideline();
  try {
    await refreshFiles();
    if (state.files.length) await loadFile(state.files[0]);
    else renderAll();
  } catch (err) {
    renderAll();
    showMessage(err.message);
  }
})();
