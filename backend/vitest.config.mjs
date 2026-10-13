import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Allow imports relative to the project root to resolve correctly
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Tell Vitest to resolve .ts files
    server: {
      deps: {
        inline: [/.*/],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
    },
  },
});
