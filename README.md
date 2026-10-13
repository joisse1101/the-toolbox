# Team lead tools

Small local tools for a team lead. Each tool is a React page (built with Vite) that keeps its data as plain files in this repo. The local server itself uses Node built-ins only.

## Run

```
npm install      # once
npm run build    # after every change to src/
node server.js
```

Open http://localhost:3000/ (set `PORT` to use another port). The server listens on `127.0.0.1` only. Stop it with Ctrl+C.

For development, keep `node server.js` running and run `npm run dev`; Vite serves the pages with hot reload and proxies `/api` to the server.

## Tools

| Tool | Page | Data |
| --- | --- | --- |
| User story generator | `/user-story-generator/` | `user-stories/*.csv` |

The user story CSVs open directly in Excel. Close the file in Excel (or accept that the tool shows "Save failed" and keeps retrying) before editing the same backlog in the tool.

## Tests

```
npm test
```

## Add a new tool

1. Create `src/<tool-name>/` with an `index.html` (a `#root` div and a `main.jsx` script, like `src/user-story-generator/index.html`) and a `main.jsx` that imports `../shared/style.css`. Import what you need from `../shared/` (`csv.js`, `files.js`, `story-text.js`). Add the page to `build.rollupOptions.input` in `vite.config.mjs`.
2. Create the data folder (for example `my-data/`) and register it in `STORES` at the top of `server.js`:
   ```js
   const STORES = {
     'user-stories': path.join(__dirname, 'user-stories'),
     'my-data': path.join(__dirname, 'my-data'),
   };
   ```
3. In the tool, `createFileStore('my-data')` gives `list`, `read`, `create`, `write`, `rename` and `openFolder` for that folder. Only `.csv` files directly inside a registered folder are reachable.
4. Add a link to the tool in `src/main.jsx`, then `npm run build`.
