# Contributing

Thanks for your interest in AetherSphere! Contributions are welcome.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Before opening a pull request

Run the full local quality gate — these are the same checks CI enforces:

```bash
npm run lint
npm run format:check   # or: npm run format  (to auto-fix)
npm test
npm run build
```

## Guidelines

- **Keep it dependency-light.** Prefer the standard library, Three.js, and small focused helpers
  over new dependencies. No binary asset files — everything is procedural.
- **Zero external cost / GitHub-native.** No backends, paid APIs, accounts, or runtime network
  fetches. The app must keep working out of the box on GitHub Pages.
- **Test pure logic.** Add or update Vitest tests in `tests/` for any math, physics, heightfield,
  or serialization changes.
- **Match the style.** ESLint + Prettier are the source of truth; run them before committing.
- **Document meaningful changes** in `CHANGELOG.md` and keep `PROGRESS.md` accurate.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module map and design overview.

## Commit & PR

- Make focused, atomic commits with clear messages.
- Describe what changed and why in the PR description; include screenshots for visual changes.
