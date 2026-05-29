import { defineConfig } from 'vite';

// AetherSphere build configuration.
// `base` is set to the GitHub Pages project subpath so that built asset URLs
// resolve correctly when served from https://<user>.github.io/<repo>/.
// It falls back to '/' for local dev/preview (Risk R-4 in IMPLEMENTATION-PLAN.md).
// Using the `command` argument (rather than NODE_ENV) makes the base path apply
// to every production build, including CI where NODE_ENV may be unset.
const repoBase = process.env.GITHUB_PAGES_BASE || '/aether-sphere-claude-opus-4-8/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? repoBase : '/',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['src/main.js', 'src/**/shaders/**'],
    },
  },
}));
