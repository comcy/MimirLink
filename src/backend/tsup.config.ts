import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server.ts'],
  outDir: 'dist',
  target: 'node18',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  clean: true,
});
