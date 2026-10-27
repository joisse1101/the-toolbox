import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Two pages: the launcher and each tool. `node planner/portal/server/server.cjs` serves the built dist/ and the file API;
// during `npm run dev` the API is proxied to a running `node server.cjs`.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        'backlog-portal': resolve(import.meta.dirname, 'backlog-portal/index.html'),
      },
    },
  },
  server: {
    proxy: { '/api': `http://127.0.0.1:${process.env.PORT || 3000}` },
  },
});
