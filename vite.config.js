import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const from = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'docs',            // GitHub Pages serves /docs on the main branch
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: from('./index.html'),
      },
    },
  },
});
