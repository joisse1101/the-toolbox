## Context

The repo is greenfield: only an empty `user-stories/` data folder exists. Node is installed; nothing else is assumed. The tool is single-user, runs on one Windows machine, and is expected to become one of several team-lead tools. A browser page cannot touch the disk on its own, so file access needs a local helper. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One local server that all future tools share, with a per-tool data folder allow-list.
- Reusable browser modules (CSV, file API client, styles) so a second tool needs no copy-paste.
- No build step and no npm dependencies, so `node server.js` is the whole setup.

**Non-Goals:**
- A frontend framework, bundler, or TypeScript.
- Multi-user concurrency, auth, remote access.
- Conflict resolution beyond re-reading on focus and on dropdown change.

## Decisions

**Layout**
```
server.js                      static files + /api/*
public/
  index.html                   launcher listing the tools
  shared/
    csv.js                     parseCsv / toCsv (RFC 4180, BOM-safe)
    story-text.js              compose/parse "As a…" and "AC1: Given…" text
    files.js                   fetch wrapper for /api/<store>/...
    style.css                  common look, light/dark
  user-story-generator/
    index.html
    app.js
user-stories/                  data (allow-listed store "user-stories")
```

**1. Node built-ins only (http, fs, path, child_process).** Alternative: Express. Rejected: a dozen routes do not justify a dependency or an `npm install`. Revisit if the API grows.

**2. Stores are an allow-list in `server.js`**: `{ "user-stories": "<repo>/user-stories" }`. API shape: `/api/<store>/files` (GET list, POST create), `/api/<store>/files/<name>` (GET read, PUT write, PATCH rename), `/api/<store>/open` (POST). Unknown store returns 404. Adding a tool's data folder is one line. Alternative: a free-form path parameter. Rejected: it widens the attack surface for no benefit.

**3. Filename validation is one function used by every route.** Accept only `^[^\\/:*?"<>|]+$`, reject `..` and names that resolve outside the store after `path.resolve`, force the `.csv` extension, and reject Windows reserved names (CON, NUL, ...). Create uses `fs.open(..., 'wx')` so it can never overwrite; rename uses a check-then-`fs.rename` guarded against an existing target (the check-then-act race is acceptable single-user).

**4. Bind to `127.0.0.1` only.** Satisfies the local-only requirement without auth. A browser could still be driven by a malicious web page via a cross-site request to localhost, so state-changing routes require a custom header (`X-Requested-With`) and no CORS headers are sent, which forces a preflight that fails for foreign origins.

**5. Static file serving with a path check** under `public/` only, with a small MIME map.

**6. CSV model: row-preserving, text-syntax cells.** Eight recognised columns: `Epic, Capability, Feature, User Story, Sprint points, Priority, Acceptance Criteria, Notes`. Notes is a plain multi-line string, last in the default header, with no parsing. Priority is a plain string in the CSV; the dropdown options (Critical, High, Medium, Low) live in one constant in the tool, and an unrecognised loaded value is injected as an extra option so it is never silently changed. On load, keep `headers[]` and each row as an array. The editor maps recognised headers (case-insensitive) to story fields; everything else is carried through untouched in an `extra` map per row, keyed by original column. On save, write columns in the original order, updating recognised columns and leaving unknown columns as they were; a missing recognised column is appended at the end. New stories get empty strings for unknown columns. A new header-only file uses the default header from the spec.

**6a. `User Story` and `Acceptance Criteria` are composed and parsed as text** by two pure functions in `shared/story-text.js`: `composeStory/parseStory` and `composeCriteria/parseCriteria`. Compose joins with `, ` and `\n` between criteria (`As a a, I want w, so that s` and `AC<n>: Given g, when I w, then I am t`). Parse is a keyword split, case-insensitive, first occurrence of each keyword in order (`I want`, `so that`; `when I`, `then I am`), ignoring a leading `AC<n>:`. A comma directly before a keyword is consumed as the separator and trimmed from the previous field; a missing comma is tolerated and normalised on the next save. Alternative considered: a regex per pattern; keyword splitting on `indexOf` is simpler and equally strict. The same functions feed the live preview, so the preview is exactly what is saved.

**6b. Unparseable cells keep their raw text.** If parsing fails, the story holds `rawUserStory` / `rawCriteria`, shows a warning, and saves the raw text back unchanged unless the user edits that group's fields, at which point the composed text replaces it. This avoids silently destroying content typed freely in Excel.

**6c. Known parse limitation.** A field whose own text contains a delimiter keyword (for example an `I want` value containing "so that") will split at the first occurrence. The preview makes this visible immediately; no escaping scheme is added.

**7. Auto-save: debounce ~600 ms after the last input**, one write in flight at a time, latest state wins (a change during a write queues exactly one follow-up). Status indicator has states saved / saving / failed. On failure (`EBUSY`/`EPERM`/`EACCES`, surfaced as 423 or 409 with a message) retry with backoff every few seconds while keeping form state. A `beforeunload` handler warns while a save is pending or failed.

**8. Reload on focus.** On `visibilitychange` to visible and on dropdown selection, fetch the file; if the text differs from the last text this tool wrote or read, and there is no pending local edit, replace the in-memory model. If there is a pending local edit, local wins on the next save (documented trade-off, single user).

**9. Open folder** via `child_process.spawn('explorer.exe', [folder])`, arguments passed as an array (no shell), folder taken from the allow-list, never from the request.

**10. Plain ES modules in the browser** (`<script type="module">`). No state library; one small `state` object and a `render` function per tool. Alternative considered: a framework such as Vite + React. Deferred until a tool genuinely needs it; shared modules keep the migration path open.

**11. BOM handling.** Server returns text as-is; `csv.js` strips a leading BOM when parsing. Writes prepend a BOM so Excel detects UTF-8; this is applied at the client, and the server just stores what it is given.

**12. Sprint points guideline is a static markdown file** at `public/user-story-generator/sprint-points-guideline.md`, fetched by the page and rendered as pre-wrapped plain text (no markdown library). It is deliberately not in `user-stories/`, which is the CSV-only data store. An info button beside Sprint points shows it in a popover on hover/focus (`:hover`, `:focus-within`) and toggles it pinned on click. The starter content covers: the 1/2/3/5/8/13 scale with one line each, the four lenses (complexity, effort, uncertainty/risk, reference stories with a slot for the user's own anchor stories) and "above 13: split". Alternatives: hardcoding the text (edits need code changes) or a native `title` tooltip (no formatting, no multi-line, slow to appear). 

**13. Sprint points are a button group, not an input.** Constant `POINTS = [1,2,3,5,8,13,21,34,55]`; `SPLIT_ABOVE = 13`. Rendered as buttons in a `role="radiogroup"` so it is keyboard accessible; click selects, click on the selected one clears. There is no number input. A loaded value with no button (e.g. `4`) leaves all buttons unselected and shows no hint; the story keeps the raw value and writes it back untouched until a button is clicked, so nothing is lost silently. The "consider splitting" state is derived (`Number(points) > SPLIT_ABOVE`), not stored: it adds a CSS class to the matching story-list entry and to the form header, with a short message, and is a pure function of the story so it needs no extra state. The 21, 34 and 55 buttons get a warning colour so the cutoff is visible before clicking. Alternative: a number input with a hint (the earlier design) was replaced because buttons are one click and make the allowed scale obvious.

## Risks / Trade-offs

- [Excel holds a lock on the CSV, so auto-save fails] → visible failure status, retry with backoff, form state kept, unload warning.
- [Excel edits and tool edits overwrite each other] → re-read on focus and on dropdown change; single-user so no merge logic.
- [Localhost endpoint driven by a malicious web page] → loopback bind, custom-header requirement, no CORS, folder allow-list, filename validation.
- [Hand-rolled CSV parser bugs] → keep it small and round-trip tested against quotes, commas, CRLF and embedded newlines; it is the one piece worth unit tests.
- [Delimiter keywords appearing inside field text break the round trip] → first-occurrence split, live preview shows the saved text, raw text preserved on parse failure (see 6b, 6c).
- [Multi-line criteria cell is hard to read in Excel unless wrapped] → acceptable; the cell is still plain text and the tool's preview is the readable view.
- [Windows-only `explorer.exe`] → fine for the stated machine; isolate it in one function so a `open`/`xdg-open` branch is trivial later.
