import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/backend/index.ts'],
  outDir: 'dist',
  target: 'node18',
  format: ['esm'],
  splitting: false,
  clean: true,
});
