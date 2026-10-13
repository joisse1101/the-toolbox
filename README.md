# Team lead tools

Small local tools for a team lead. Each tool is a static page that keeps its data as plain files in this repo. No npm install and no build step: Node built-ins only.

## Run

```
node server.js
```

Open http://localhost:3000/ (set `PORT` to use another port). The server listens on `127.0.0.1` only. Stop it with Ctrl+C.

## Tools

| Tool | Page | Data |
| --- | --- | --- |
| User story generator | `/user-story-generator/` | `user-stories/*.csv` |

The user story CSVs open directly in Excel. Close the file in Excel (or accept that the tool shows "Save failed" and keeps retrying) before editing the same backlog in the tool.

## Tests

```
node --test test/*.test.mjs
```

## Add a new tool

1. Create `public/<tool-name>/index.html` (and `app.js`). Link `/shared/style.css` and import what you need from `/shared/` (`csv.js`, `files.js`, `story-text.js`).
2. Create the data folder (for example `my-data/`) and register it in `STORES` at the top of `server.js`:
   ```js
   const STORES = {
     'user-stories': path.join(__dirname, 'user-stories'),
     'my-data': path.join(__dirname, 'my-data'),
   };
   ```
3. In the page, `createFileStore('my-data')` gives `list`, `read`, `create`, `write`, `rename` and `openFolder` for that folder. Only `.csv` files directly inside a registered folder are reachable.
4. Add a link to the tool in `public/index.html`.
