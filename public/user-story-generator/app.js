import { createFileStore } from '/shared/files.js';
import {
  POINTS, SPLIT_ABOVE, PRIORITIES,
  loadBacklog, serializeBacklog, newBacklogText, newStory, emptyCriterion,
  storyCellText, criteriaCellText, storyIssues, storyLabel,
  groupByEpic, displayOrder, applyBulk,
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
  view: 'editor', // 'editor' | 'stories'
  checked: new Set(), // story ids ticked in the Stories tab (separate from selectedId)
  lastChecked: null, // id of the last ticked row, for shift-click ranges
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
  clearChecked(); // ids are assigned per load, so a selection cannot survive a reload
  setStatus('saved');
  renderAll();
}

function clearCurrent() {
  state.current = null;
  state.backlog = null;
  state.selectedId = null;
  state.lastText = null;
  clearChecked();
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
  $('tabs').hidden = !state.current;
  renderView();
  renderStoryList();
  fillForm();
  renderStoriesTab();
}

function renderView() {
  const editor = state.view === 'editor';
  $('editor').hidden = !state.current || !editor;
  $('storiesView').hidden = !state.current || editor;
  for (const tab of document.querySelectorAll('.tab')) tab.setAttribute('aria-selected', String(tab.dataset.view === state.view));
}

function setView(view) {
  state.view = view;
  renderView();
  if (view === 'stories') renderStoriesTab();
}

// Red wins over yellow.
function issueClass(errors, warnings) {
  if (errors.length) return 'incomplete';
  return warnings.length ? 'warn' : '';
}

function renderStoryList() {
  const list = $('storyList');
  const stories = state.backlog?.stories ?? [];
  list.replaceChildren(
    ...groupByEpic(stories).flatMap((group) => {
      const head = document.createElement('li');
      head.className = 'epic-head'; // no data-id, so clicks on it are ignored
      head.textContent = `${group.label} (${group.stories.length})`;
      head.title = group.label;
      return [head, ...group.stories.map(storyItem)];
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

function storyItem(s) {
  const li = document.createElement('li');
  li.dataset.id = s.id;
  const { errors, warnings } = storyIssues(s);
  li.className = [s.id === state.selectedId ? 'selected' : '', issueClass(errors, warnings)].join(' ').trim();
  li.title = rowTooltip(s, errors, warnings);
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = storyLabel(s);
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = s.points || '–';
  li.append(title, badge);
  return li;
}

const rowTooltip = (s, errors, warnings) => [storyCellText(s), [...errors, ...warnings].join('\n')].filter(Boolean).join('\n\n');

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
      const last = s.criteria.length === 1;
      remove.disabled = last; // every story keeps at least one criterion
      remove.title = last ? 'A story needs at least one criterion' : 'Remove criterion';
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
        if (key === 'then') {
          input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || e.isComposing || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
            e.preventDefault();
            addCriterion();
            $(`criterion-${s.criteria.length - 1}-given`).focus();
          });
        }
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
  const { errors, warnings } = storyIssues(s);
  const cls = issueClass(errors, warnings);
  $('storyForm').classList.toggle('incomplete', cls === 'incomplete');
  $('storyForm').classList.toggle('warn', cls === 'warn');
  showBanner($('incompleteBanner'), errors.length ? `Incomplete: ${errors.join('; ')}.` : '');
  showBanner($('warningBanner'), warnings.join(' '));
  refreshSuggestions(s);
  renderStoryList();
}

function showBanner(el, text) {
  el.hidden = !text;
  el.textContent = text;
}

// Suggestions come from the open backlog: Capability is narrowed by Epic, Feature by Epic and Capability.
function refreshSuggestions(s) {
  const stories = state.backlog.stories;
  const fill = (id, values) => {
    const distinct = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
    $(id).replaceChildren(...distinct.map((v) => new Option(v)));
  };
  const sameEpic = stories.filter((o) => o.epic === s.epic);
  fill('epicList', stories.map((o) => o.epic));
  fill('capabilityList', sameEpic.map((o) => o.capability));
  fill('featureList', sameEpic.filter((o) => o.capability === s.capability).map((o) => o.feature));
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

function addCriterion() {
  const s = selected();
  s.criteria.push(emptyCriterion());
  s.rawCriteria = null;
  renderCriteria();
  refreshDerived();
  markDirty();
}

$('addCriterionBtn').addEventListener('click', addCriterion);

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

// ---------- arrow-key navigation between fields ----------
// Left/right move within a row of fields (text inputs only at the caret edge, so editing still works), up/down
// move between rows. Sprint points: left/right step through the buttons, Alt+Right goes to Priority, Alt+Left back.

function navRows() {
  const s = selected();
  return [
    ['epic', 'capability', 'feature'].map($),
    ['asA', 'iWant', 'soThat'].map($),
    [...$('pointsGroup').children],
    ...s.criteria.map((_, i) => ['given', 'when', 'then'].map((k) => $(`criterion-${i}-${k}`))),
    [$('notes')],
  ];
}

function focusRow(row, col) {
  if (row.length && row[0].parentElement === $('pointsGroup')) {
    (row.find((b) => b.getAttribute('aria-checked') === 'true') ?? row[0]).focus();
  } else {
    row[Math.min(col, row.length - 1)].focus();
  }
}

$('storyForm').addEventListener('keydown', (e) => {
  if (e.isComposing || (e.ctrlKey && !e.altKey) || e.metaKey || e.shiftKey || !e.key.startsWith('Arrow')) return;
  const el = e.target;
  const rows = navRows();
  const pointsRow = rows[2];
  const isPriority = el === $('priority');
  const rowIdx = isPriority ? 2 : rows.findIndex((r) => r.includes(el));
  if (rowIdx < 0) return;
  const col = isPriority ? pointsRow.length : rows[rowIdx].indexOf(el);

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (el.parentElement === $('pointsGroup')) {
      if (e.altKey) {
        if (dir !== 1) return;
        $('priority').focus();
      } else {
        pointsRow[col + dir]?.focus();
      }
    } else if (isPriority) {
      if (!(e.altKey && dir === -1)) return;
      focusRow(pointsRow, 0);
    } else if (el.tagName === 'INPUT' && (!e.altKey || e.ctrlKey)) {
      // Ctrl+Alt jumps regardless of the caret position
      const atEdge = e.ctrlKey || (el.selectionStart === el.selectionEnd && el.selectionStart === (dir < 0 ? 0 : el.value.length));
      const next = rows[rowIdx][col + dir];
      if (!atEdge || !next) return;
      next.focus();
    } else {
      return;
    }
    e.preventDefault();
    return;
  }

  if (e.altKey) return;
  const dir = e.key === 'ArrowUp' ? -1 : 1;
  if (el.tagName === 'TEXTAREA') {
    const hasLineThatWay = dir < 0 ? el.value.slice(0, el.selectionStart).includes('\n') : el.value.slice(el.selectionEnd).includes('\n');
    if (hasLineThatWay) return;
  }
  const target = rows[rowIdx + dir];
  if (!target) return;
  e.preventDefault();
  focusRow(target, col);
});

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
  renderStoriesTab();
  markDirty();
}

$('addStoryBtn').addEventListener('click', () => {
  addStory();
  $('epic').focus();
});

function deleteStory() {
  const s = selected();
  if (!s || !confirm('Delete the selected story?')) return;
  const stories = state.backlog.stories;
  const i = stories.indexOf(s);
  stories.splice(i, 1);
  state.selectedId = stories.length ? stories[Math.min(i, stories.length - 1)].id : null;
  renderStoryList();
  fillForm();
  renderStoriesTab();
  markDirty();
}

$('deleteStoryBtn').addEventListener('click', deleteStory);

// Select the neighbouring story. The focused form field keeps focus (falling back to Epic).
function moveSelection(delta) {
  const stories = displayOrder(state.backlog?.stories ?? []);
  const next = stories[stories.findIndex((s) => s.id === state.selectedId) + delta];
  if (!next) return;
  const focusedId = document.activeElement?.id;
  state.selectedId = next.id;
  renderStoryList();
  fillForm();
  const target = (focusedId && $(focusedId)) || $('epic');
  target.focus();
}

// ---------- stories tab ----------

for (const btn of document.querySelectorAll('.tab')) btn.addEventListener('click', () => setView(btn.dataset.view));

function clearChecked() {
  state.checked.clear();
  state.lastChecked = null;
}

function renderStoriesTab() {
  const stories = displayOrder(state.backlog?.stories ?? []);
  const ids = new Set(stories.map((s) => s.id));
  for (const id of state.checked) if (!ids.has(id)) state.checked.delete(id); // deleted stories drop out

  const cell = (child, className = '') => {
    const td = document.createElement('td');
    td.className = className;
    td.append(child);
    return td;
  };
  $('storiesBody').replaceChildren(
    ...stories.map((s) => {
      const { errors, warnings } = storyIssues(s);
      const tr = document.createElement('tr');
      tr.dataset.id = s.id;
      tr.className = issueClass(errors, warnings);
      tr.title = rowTooltip(s, errors, warnings);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.setAttribute('aria-label', `Select ${storyLabel(s)}`);
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'link-btn';
      open.textContent = s.feature.trim() || 'New story';
      tr.append(
        cell(box, 'check'), cell(s.epic), cell(s.capability), cell(open),
        cell(s.points, 'num'), cell(s.priority),
      );
      return tr;
    }),
  );
  $('storiesEmpty').hidden = stories.length > 0;

  const distinct = (key) => [...new Set((state.backlog?.stories ?? []).map((o) => o[key].trim()).filter(Boolean))];
  $('bulkEpicList').replaceChildren(...distinct('epic').map((v) => new Option(v)));
  $('bulkCapabilityList').replaceChildren(...distinct('capability').map((v) => new Option(v)));
  syncSelectionUI();
}

// Ticks, count, select-all and bulk bar from state.checked, without rebuilding rows (keeps keyboard focus).
function syncSelectionUI() {
  const rows = [...$('storiesBody').children];
  for (const tr of rows) {
    const on = state.checked.has(Number(tr.dataset.id));
    tr.classList.toggle('checked', on);
    tr.querySelector('input').checked = on;
  }
  const n = state.checked.size;
  const all = $('selectAll');
  all.checked = rows.length > 0 && n === rows.length;
  all.indeterminate = n > 0 && n < rows.length;
  all.disabled = !rows.length;
  $('bulkBar').hidden = n === 0;
  $('selectedCount').textContent = `${n} selected`;
  refreshBulkApply();
}

$('storiesBody').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (!tr) return;
  const id = Number(tr.dataset.id);
  if (e.target.matches('.link-btn')) {
    state.selectedId = id;
    setView('editor');
    renderStoryList();
    fillForm();
    return;
  }
  if (!e.target.matches('input[type="checkbox"]')) return;
  const on = e.target.checked;
  const ids = [...$('storiesBody').children].map((r) => Number(r.dataset.id));
  let range = [id];
  if (e.shiftKey && state.lastChecked !== null && ids.includes(state.lastChecked)) {
    const [from, to] = [ids.indexOf(state.lastChecked), ids.indexOf(id)].sort((a, b) => a - b);
    range = ids.slice(from, to + 1);
  }
  for (const r of range) on ? state.checked.add(r) : state.checked.delete(r);
  state.lastChecked = id;
  syncSelectionUI();
});

$('selectAll').addEventListener('change', () => {
  state.checked.clear();
  if ($('selectAll').checked) for (const tr of $('storiesBody').children) state.checked.add(Number(tr.dataset.id));
  state.lastChecked = null;
  syncSelectionUI();
});

// ---------- bulk edit ----------

const KEEP = 'keep'; // bulk Priority "No change" ('' is "None", which clears)

$('bulkPriority').replaceChildren(
  new Option('No change', KEEP), new Option('None', ''), ...PRIORITIES.map((p) => new Option(p)),
);

function bulkPatch() {
  const priority = $('bulkPriority').value;
  return {
    priority: priority === KEEP ? undefined : priority,
    epic: $('bulkEpic').value.trim(),
    capability: $('bulkCapability').value.trim(),
  };
}

const bulkIsEmpty = (p) => p.priority === undefined && !p.epic && !p.capability;

function refreshBulkApply() {
  $('bulkApplyBtn').disabled = bulkIsEmpty(bulkPatch());
}

for (const id of ['bulkPriority', 'bulkEpic', 'bulkCapability']) $(id).addEventListener('input', refreshBulkApply);

$('bulkApplyBtn').addEventListener('click', () => {
  const patch = bulkPatch();
  const n = state.checked.size;
  if (!n || bulkIsEmpty(patch)) return;
  const parts = [];
  if (patch.priority !== undefined) parts.push(patch.priority ? `Priority to "${patch.priority}"` : 'Priority to none');
  if (patch.epic) parts.push(`Epic to "${patch.epic}"`);
  if (patch.capability) parts.push(`Capability to "${patch.capability}"`);
  if (!confirm(`Set ${parts.join(', ')} on ${n} ${n === 1 ? 'story' : 'stories'}?\n\nThis cannot be undone.`)) return;
  applyBulk(state.backlog.stories, state.checked, patch);
  $('bulkPriority').value = KEEP;
  $('bulkEpic').value = '';
  $('bulkCapability').value = '';
  renderStoryList();
  fillForm();
  renderStoriesTab();
  markDirty();
});

// ---------- file actions ----------

async function newBacklog() {
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
}

$('newBtn').addEventListener('click', newBacklog);

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

// ---------- popovers (guideline and shortcuts): hover/focus shows, click pins, Escape or outside click closes ----------

function setPinned(info, pinned) {
  info.classList.toggle('pinned', pinned);
  info.querySelector('.info-btn').setAttribute('aria-expanded', String(pinned));
}

for (const btn of document.querySelectorAll('.info-btn')) {
  btn.addEventListener('click', () => {
    const info = btn.closest('.info');
    setPinned(info, !info.classList.contains('pinned'));
  });
}
document.addEventListener('click', (e) => {
  for (const info of document.querySelectorAll('.info')) if (!info.contains(e.target)) setPinned(info, false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') for (const info of document.querySelectorAll('.info')) setPinned(info, false);
});

// ---------- keyboard shortcuts ----------
// One table drives both the key handler and the helper popover. Matched on e.code so keyboard layouts and
// the Mac Option key (which changes e.key) do not matter. Ctrl+N, Ctrl+Shift+N and Ctrl+D are reserved by browsers.

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const ALT = IS_MAC ? 'Option' : 'Alt';

// Story shortcuts act on the Editor tab only.
const inEditor = () => state.view === 'editor';

const SHORTCUTS = [
  { code: 'KeyN', alt: true, label: `${ALT}+N`, action: 'Add story', run: () => { addStory(); $('epic').focus(); }, enabled: () => !!state.backlog && inEditor() },
  { code: 'KeyN', alt: true, shift: true, label: `${ALT}+Shift+N`, action: 'New backlog', run: newBacklog, enabled: () => true },
  { code: 'KeyD', alt: true, label: `${ALT}+D`, action: 'Delete selected story', run: deleteStory, enabled: () => !!selected() && inEditor() },
  { code: 'ArrowUp', ctrl: true, label: 'Ctrl+Up', action: 'Previous story', run: () => moveSelection(-1), enabled: () => !!selected() && inEditor() },
  { code: 'ArrowDown', ctrl: true, label: 'Ctrl+Down', action: 'Next story', run: () => moveSelection(1), enabled: () => !!selected() && inEditor() },
];

// Handled by the field navigation above; listed here only so the popover shows them.
const NAV_HINTS = [
  { label: 'Left / Right', action: 'Previous / next field (in text, at the start / end)' },
  { label: 'Ctrl+Alt+Left / Right', action: 'Previous / next text field from anywhere in it' },
  { label: 'Up / Down', action: 'Previous / next field group' },
  { label: 'Left / Right (points)', action: 'Previous / next sprint point' },
  { label: `${ALT}+Right / Left (points)`, action: 'Go to Priority / back to points' },
];

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.isComposing) return;
  const hit = SHORTCUTS.find((k) => k.code === e.code && !!k.alt === e.altKey && !!k.ctrl === e.ctrlKey && !!k.shift === e.shiftKey);
  if (!hit || !hit.enabled()) return;
  e.preventDefault();
  hit.run();
});

$('shortcutsText').replaceChildren(
  Object.assign(document.createElement('dl'), { className: 'shortcut-list' }),
);
$('shortcutsText').firstChild.append(
  ...[...SHORTCUTS, ...NAV_HINTS].flatMap((k) => {
    const dt = document.createElement('dt');
    dt.textContent = k.label;
    const dd = document.createElement('dd');
    dd.textContent = k.action;
    return [dt, dd];
  }),
);

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
