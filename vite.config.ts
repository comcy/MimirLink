import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    target: 'node16',
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'fs', 'path', 'os', 'child_process', 'readline', 'inquirer', 'chalk'
      ],
    },
    sourcemap: true,
    emptyOutDir: true
  }
});
