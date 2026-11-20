# Design conventions

The single statement of the rules for a **design canvas**: the Claude Design canvas that `jois-story-design` makes for one scope (an Epic, a Feature or a story), and that `jois-story-plan`, apply and validate read. The design skill and plan cite this page and do not restate it. The canvas lives on claude.ai and the repo holds only a pointer to it (`<backlog>/designs.json`, see [the file table](plans-files.md)), never an artboard.

A canvas is a set of files. `project/canvas.json` lists the artboards and their pages, and each artboard (one screen in one state at one size) is one file, `project/<name>.dc.html`. The first artboard in `order` opens first. `Main` is always that first artboard.

## 1. The story index

`project/Main.dc.html` is the **story index**. It holds the index as one object inside the component's `renderVals()`, written as `const index = { ... };`, and renders that same object as a readable table with `<sc-for>` loops. People, Claude and the checker therefore read one source, and the table can never differ from the data.

The object must be **strict JSON**: double-quoted keys, no comments, no trailing commas. The checker cuts the object out by finding `const index = ` and scanning to its matching brace outside strings, then reads it with `JSON.parse`, so anything JSON does not allow makes the index unreadable and the checker names the line at fault.

```json
{
  "version": 1,
  "backlog": "habits",
  "scope": { "type": "feature", "epic": "Habits", "feature": "Streaks" },
  "viewports": ["desktop", "mobile"],
  "stories": [
    {
      "title": "See my current streak",
      "criteria": [
        {
          "text": "Given ... when ... then the card shows the current streak",
          "kind": "main",
          "artboards": ["streaks-card-default-desktop", "streaks-card-default-mobile"]
        }
      ]
    }
  ]
}
```

### Fields

| Field | Type | Meaning |
|---|---|---|
| `version` | number | The shape of the index. Always `1` for now; a reader refuses another value. |
| `backlog` | string | The backlog's folder name under the data folder. |
| `scope` | object | What the canvas designs, in the words plan uses for a slice's scope (below). |
| `viewports` | array | The sizes drawn: `["desktop", "mobile"]` by default, or one of them when the user asked for one size. This is how "desktop only" is recorded. |
| `stories` | array | One entry per story designed, in backlog order. A story left out for an open clarification has no entry. |
| `stories[].title` | string | The story's Title, verbatim from the backlog. The index is keyed by Title. |
| `stories[].criteria` | array | One entry per acceptance criterion of the story, in the story's order. |
| `stories[].criteria[].text` | string | The criterion's text verbatim, as written after its `AC<n>:` label. |
| `stories[].criteria[].kind` | string | `main` or `failure` (below). |
| `stories[].criteria[].artboards` | array | The file stems of the artboards that show the criterion, one per screen state and viewport. |

The `scope` object is `{ "type": "epic", "epic": "..." }`, `{ "type": "feature", "epic": "...", "feature": "..." }` or `{ "type": "story", "epic": "...", "feature": "...", "title": "..." }`, where `title` is the story's Title. These are the same fields as the `scope` of a slice's `source.json`, so the two can be compared directly.

A criterion has **no stored id**, because the slice's `AC-<slice>-<name>` ids are assigned by plan later and do not exist yet. A criterion is found by its verbatim `text`. The readable table shows each criterion's position number within its story (`AC 1`, `AC 2`, ...), computed in `renderVals()` from the array order, as the id a person sees.

### The `kind` values

`main` marks a criterion that describes what happens on the way to the goal. `failure` marks a criterion that describes what happens when something goes wrong, such as a name already taken or a rejected input. A failure criterion must point to at least one **error-state artboard**, one whose name holds `error` as its state (section 2), so the user sees the message. A criterion of either kind with an empty `artboards` list is a design problem.

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
