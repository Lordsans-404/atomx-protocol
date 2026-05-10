import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for AtomX Protocol backend tests.
 * Resolves the @/ alias (Next.js path alias) to apps/web/ so test imports match
 * the same module resolution used by the Next.js app router.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/backend/setup.ts'],
    include: ['tests/backend/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['apps/web/app/api/**/*.ts', 'apps/web/lib/**/*.ts'],
      exclude: ['apps/web/app/api/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web'),
    },
  },
});
