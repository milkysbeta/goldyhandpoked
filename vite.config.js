import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const from = (p) => fileURLToPath(new URL(p, import.meta.url));

// GitHub Pages serves a project site under /goldyhandpoked/. When the
// Porkbun domain is wired up at the root, change base back to '/'.
// Dev (npm run dev) always runs at '/', so local work is unaffected.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/goldyhandpoked/' : '/',
  publicDir: 'public',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: from('./index.html') },
    },
  },
}));
