import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// One page: the app (index.html) routes to each tool. `node viewer/backend/server.ts` serves the built dist/ and the file API;
// during `npm run dev` the API is proxied to a running `node backend/server.ts`.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    proxy: { '/api': `http://127.0.0.1:${process.env.PORT || 3000}` },
  },
});
