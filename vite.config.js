import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const from = (p) => fileURLToPath(new URL(p, import.meta.url));

// The site is served at the root of the custom domain goldyhandpoked.net
// (via the docs/CNAME file), so the base is '/' in every mode. If the site
// ever moves back to the bare github.io project path, set build's base to
// '/goldyhandpoked/'.
export default defineConfig(() => ({
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: from('./index.html') },
    },
  },
}));
