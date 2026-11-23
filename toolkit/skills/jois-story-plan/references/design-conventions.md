<!-- GENERATED. Do not edit this copy. -->

# Design conventions

The single statement of the rules for a **design canvas**: the Claude Design canvas that `jois-story-design` makes for one scope (an Epic, a Feature or a story), and that `jois-story-plan`, apply and validate read. The design skill and plan cite this page and do not restate it. The canvas lives on claude.ai. The repo holds a pointer to it (`<backlog>/designs.json`) and the story index (`<backlog>/design-index.csv`, section 1), see [the file table](plans-files.md), and never an artboard.

A canvas is a set of files. `project/canvas.json` lists the artboards and their pages, and each artboard (one screen in one state at one size) is one file, `project/<name>.dc.html`. The first artboard in `order` opens first. `Main` is always that first artboard, and it is a cover page (end of section 1).

## 1. The story index file

The **story index** is the file `<backlog>/design-index.csv`. It has one row per acceptance criterion of each designed story, so scripts, the portal and Claude read one source, and a reworded criterion is fixed by a row edit and not by redrawing the canvas. The file is a CSV like the backlog's other files: RFC 4180, CRLF line endings, and it opens in Excel. A column the code does not know is kept when the file is read and written. Design writes it only through its writer script (`write-design-index.mjs`), which checks the rows, writes atomically and reads the file back.

The header is `Story ID,Story,Criterion,Kind,Artboards,Viewports,Canvas`.

```csv
Story ID,Story,Criterion,Kind,Artboards,Viewports,Canvas
H1-HT-0001,See my current streak,Given ... when ... then the card shows the current streak,main,streaks-card-default-desktop;streaks-card-default-mobile,desktop;mobile,https://claude.ai/artifact/abc123
H1-HT-0001,See my current streak,Given ... when ... then it says the name is taken,failure,streaks-card-error-desktop;streaks-card-error-mobile,desktop;mobile,https://claude.ai/artifact/abc123
```

### Columns

| Column | Meaning |
|---|---|
| `Story ID` | The story's ID in the backlog. With `Criterion` it is the row's key. The portal rewrites this column when a story is renumbered or deleted, and moves the rows with a story that migrates to another backlog. |
| `Story` | The story's Title, for a person reading the file. It is not a key, and a Title that no longer matches the backlog is reported as a change. |
| `Criterion` | The criterion's text verbatim, as written after its `AC<n>:` label. A row is found by this exact text. |
| `Kind` | `main` or `failure` (below). |
| `Artboards` | The file stems of the artboards that show the criterion, one per screen state and viewport, joined by `;`. It may be empty (a design problem, below). |
| `Viewports` | `desktop`, `mobile` or `desktop;mobile`: the sizes drawn for this row. A stem in `Artboards` ends in one of these. A design for one size only is recorded as that value on every row of the design. |
| `Canvas` | The canvas link, repeated on every row. A row that migrates with its story keeps the link of the canvas that holds its artboards. |

A list column (`Artboards`, `Viewports`) joins its items with `;` and no space. A cell with a comma or a quote is wrapped in double quotes and a quote inside it is doubled, as in any CSV.

### Keys and scope

A row is keyed by its `Story ID` and the exact text of its `Criterion`, and a story's rows keep the story's criterion order. A criterion has **no stored id**, because the slice's `AC-<slice>-<name>` ids are assigned by plan later and do not exist yet. The readable position (`AC 1`, `AC 2`, ...) is the criterion's place among its story's rows.

A row does not store the scope. `designs.json` holds `{ scope, url }` for each canvas, and a row's `Canvas` joins to the entry with the same `url`. The scope is `{ "type": "epic", "epic": "..." }`, `{ "type": "feature", "epic": "...", "feature": "..." }` or `{ "type": "story", "epic": "...", "feature": "...", "title": "..." }`, the same fields as the `scope` of a slice's `source.json`. A story with an open clarification is left out of a design on purpose and has no rows. A row whose `Canvas` has no entry in this backlog's `designs.json` (a migrated story) is checked for changes only, and never makes its backlog report new stories.

### The `Kind` values

`main` marks a criterion that describes what happens on the way to the goal. `failure` marks a criterion that describes what happens when something goes wrong, such as a name already taken or a rejected input. A failure criterion must point to at least one **error-state artboard**, one whose name holds `error` as its state (section 2), so the user sees the message. A criterion of either kind with an empty `Artboards` cell is a design problem.

### `Main`, the cover page

`project/Main.dc.html` is a **cover page** for a person who opens the canvas. It lists the canvas's flows and the name of each artboard, with `<a href="<stem>.dc.html">` links to them. It lists no acceptance criterion and holds no story index as data, so a reworded criterion never needs an artboard to change. Design reads the story index from `design-index.csv`, never from `Main`.

A canvas made before the index moved to the file keeps its old `Main` (a `const index = { ... };` object in `renderVals()`) until the next design run on its scope. That run reads the old index out of `Main` once, writes its rows to `design-index.csv`, and replaces `Main` with the cover page.

## 2. Artboards

### Names

An artboard is named `<flow>-<screen>-<state>-<viewport>` in lowercase kebab-case, for example `signup-form-error-mobile`. The name is also the file stem (`signup-form-error-mobile.dc.html`) and what the index's `artboards` lists hold.

- `flow` is what the user does, such as `signup` or `streaks`.
- `screen` is the screen within the flow, such as `form` or `card`.
- `state` is how it looks, such as `default`, `filled` or `error`. The state of an error artboard holds `error`.
- `viewport` is `desktop` or `mobile`.

### One page per flow

The canvas has one page in `canvas.json` for each flow, and the artboards of a flow sit on its page. `Main` sits on the first page.

### Sizes

By default every screen state is drawn twice, once per viewport. These are the Design type's own sizes for a page and a phone.

| Viewport | Artboard | Size |
|---|---|---|
| `desktop` | a fluid page, `expand: "fill"` | 1440 px wide |
| `mobile` | a fixed frame | 390 x 844 |

When the user asks for only one viewport, the other is not drawn and `viewports` in the index names the one that is.

### Links

A link from one artboard to another names the target's file, `<a href="<stem>.dc.html">`. A link that starts with `#` only scrolls inside the artboard it is in, so it cannot reach another artboard. Each flow's artboards link to the next one in the flow, so the flow plays from `#play-<stem>` of its first artboard.

From outside the canvas, an artboard's link is `<canvas url>#artboard-<stem>`. That full form is what the `Design:` lines of a slice's tasks carry.

### What the repo holds

The repo holds no artboard content, no screenshot and no copy of the index. `designs.json` holds only the scope and the canvas url. A stage that needs an artboard reads it from the canvas when it needs it, and a file such a read saves goes under `.scratch/`.
