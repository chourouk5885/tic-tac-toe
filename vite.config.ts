import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
  // so every asset URL must start with the repository name.
  base: '/tic-tac-toe/',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
