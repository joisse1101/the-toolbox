import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Two pages: the launcher and each tool. `node server.cjs` serves the built dist/ and the file API;
// during `npm run dev` the API is proxied to a running `node server.cjs`.
export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'src/index.html'),
        'user-story-generator': resolve(import.meta.dirname, 'src/user-story-generator/index.html'),
      },
    },
  },
  server: {
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
