# Changelog

All notable changes to **AetherSphere** are documented here. Format inspired by [Keep a Changelog](https://keepachangelog.com/); the project follows [Semantic Versioning](https://semver.org/) once releases begin.

## [Unreleased]

### 2026-05-29 — Prompt 2: Full Autonomous Execution

**Summary:** Implemented, tested, documented, and configured deployment for the complete AetherSphere simulator per the implementation plan and project spec. All quality gates satisfied.

**Added**
- Tooling: `package.json` (Vite, Three.js, Vitest, ESLint, Prettier), `vite.config.js`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`.
- Core utilities (`src/util/`): `math.js`, `noise.js` (fBm/ridged), `pool.js`.
- Engine core (`src/core/`): `SceneManager.js` (renderer, lights, starfield, bloom), `Settings.js` (quality presets), `Clock.js`.
- Planet (`src/planet/`): `PlanetConfig.js` (NASA Earth/Mars/Moon data), `TextureFactory.js` (runtime procedural day/spec/night textures), `Heightfield.js` (permanent deformation), `Planet.js`, and GLSL `shaders/planetShader.js` + `shaders/atmosphereShader.js`.
- Physics (`src/physics/`): `Projectile.js`, `PhysicsWorld.js` (inverse-square gravity, drag, integration, collision), `ImpactSystem.js` (crater + fragments + debris + shockwave + flash).
- Effects (`src/effects/`): `Atmosphere.js`, `Clouds.js`, `Particles.js`.
- Camera (`src/camera/CameraController.js`): OrbitControls with damping + touch.
- UI (`src/ui/UIController.js`, `index.html`, `src/styles/main.css`): glassmorphism overlay, stats, controls, help.
- Persistence (`src/state/SaveLoad.js`): localStorage + JSON export/import including deformation.
- App orchestrator `src/main.js`.
- Tests (`tests/`): 45 unit tests across math, heightfield, physics, save/load, planet config, util.
- CI/CD: `.github/workflows/ci.yml` (lint + format + test + build) and `.github/workflows/deploy.yml` (build → upload → GitHub Pages).
- Documentation: professional `README.md` with screenshots, `docs/ARCHITECTURE.md`, `docs/QA-CHECKLIST.md`, `docs/CONTRIBUTING.md`, `LICENSE` (MIT), and `docs/screenshots/`.

**Changed**
- `vite.config.js` base path now keyed off the Vite `command` (not `NODE_ENV`) so the GitHub Pages subpath is applied in every production build, including CI.
- `.github/workflows/deploy.yml` sets `configure-pages` `enablement: true` so the workflow auto-enables GitHub Pages (Actions source) on its first run on `main`, requiring no manual repository configuration.
- Planet fragment shader blends smooth sphere normals with screen-space relief normals to eliminate faceting while keeping crater/mountain relief lit.
- Cloud opacity softened (0.9 → 0.62) for a more natural look.
- `TextureFactory` land normalization fixed for ocean-less worlds (Mars/Moon) so terrain palettes no longer saturate to the polar-cap color; snow peaks restricted to worlds with a hydrosphere.
- Applied Prettier formatting across the codebase to satisfy the CI format check.

**Verified**
- `npm run lint`, `npm run format:check`, `npm test` (45/45), and `npm run build` all pass.
- All three planets, projectile impacts, permanent deformation, and persistence verified in-browser.

### 2026-05-29 — Prompt 1: Planning Phase

**Summary:** Established the project's planning foundation under the Project Constitution and Project Spec. No source code written; no builds or tests run (per Prompt 1 halt instruction).

**Added**
- `IMPLEMENTATION-PLAN.md` — complete end-to-end plan: architecture decisions (Three.js + Vite, icosphere + height-field deformation, custom physics, procedural textures), tech-stack table, phased atomic task breakdown (A–I), testing strategy (Vitest + manual visual QA), CI/CD via GitHub Actions → GitHub Pages, success-criteria traceability matrix, risk register, and Definition of Done.
- `PROGRESS.md` — live status dashboard initialized at 0%, with phase table, completed/in-progress/blockers/next-actions sections, and trackers for Spec Success Criteria and Constitution Quality Gates.
- `CHANGELOG.md` — this file, initialized with the planning-phase entry.

**Proposed (Constitution clarifications — pending approval; see IMPLEMENTATION-PLAN.md §9)**
- Prefer **bundling core dependencies via npm** over runtime CDN for reproducibility/offline resilience (CDN remains permitted for optional enhancements). Refines Constitution §2/§7.
- **Asset policy**: prefer procedural generation; any bundled binary assets must be public-domain and cited in `DATA-SOURCES.md`. Operationalizes §1/§2.
- **Explicit performance budget**: hard floor ≥50 FPS during heavy impacts, 60 FPS target on modern desktop, enforced via quality presets. Operationalizes §6.

**Status:** Planning artifacts created and committed. Execution halted, awaiting Prompt 2 authorization.
