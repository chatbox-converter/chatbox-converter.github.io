import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves the committed docs/ folder at the root of
// chatbox-converter.github.io, so the build writes there and needs no base path.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: fileURLToPath(new URL('../../docs', import.meta.url)),
    emptyOutDir: true,
  },
});
