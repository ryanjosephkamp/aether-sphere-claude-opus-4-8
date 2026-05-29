# AetherSphere — Implementation Plan

> Living document. Created in **Prompt 1 (Planning Phase)**. Governed by `CONSTITUTION.md` and scoped by `PROJECT-SPEC.md`. May be revised at any time during execution; all changes recorded in `CHANGELOG.md` and reflected in `PROGRESS.md`.

---

## 0. Executive Summary

**AetherSphere** is a 100% browser-based, GitHub Pages–deployable **3D planetary sandbox simulator**. Users explore a beautiful, rotatable Earth (with selectable alternative planets such as Mars), then unleash asteroids, meteors, and rockets to watch realistic impacts produce fragmentation, cratering, debris, and **permanent surface deformation**. The product targets the polish of a professional indie tech demo.

This plan covers architecture, tech stack, a step-by-step task breakdown (atomic, sequenced, parallelizable where noted), testing strategy, CI/CD via GitHub Actions → GitHub Pages, and a risk register with mitigations. It maps every Project Spec **Success Criterion** to concrete deliverables.

---

## 1. Guiding Constraints (from Constitution & Spec)

These constraints shape every decision below. References: `CONSTITUTION.md` §2 (Hard Boundaries), §6 (Quality Gates), §7 (Tech Freedom); `PROJECT-SPEC.md` (Core Features, Success Criteria).

- **Zero external costs** (Constitution §2): No paid APIs/services. All assets are procedurally generated or bundled open/public-domain. No runtime calls to billed endpoints.
- **GitHub sandbox only** (Constitution §2): Build, test, and deploy entirely via GitHub Actions; host on GitHub Pages.
- **No manual setup** (Constitution §2, §6): Works out-of-the-box from the Pages URL; cloning + `npm install && npm run dev` is the only dev path.
- **Offline-capable assets** (Spec "no external costs / no manual setup"): Avoid CDN runtime dependencies for core functionality — bundle libraries via npm so the deployed artifact is self-contained and resilient. (CDN is *permitted* by Constitution §7 but bundling is safer for reproducibility; see Risk R-7.)
- **Performance target** (Spec): ≥50 FPS during intense impact sequences; design for 60 FPS on modern hardware.
- **Responsive** (Spec): Desktop + mobile, mouse + touch.
- **Factual integrity** (Constitution §1): Real planetary data (radius, gravity, rotation period, axial tilt, day length) sourced from public references (e.g., NASA planetary fact sheets) and cited in-repo.

---

## 2. Architecture Decisions

### 2.1 Rendering & Engine
- **Three.js (r160+)** via npm — mature, well-documented WebGL engine; satisfies Tech Freedom (Constitution §7). Handles spheres, custom shaders, lighting, post-processing.
- **Custom GLSL shaders** for: atmospheric scattering/glow, day/night terminator blending (day texture ↔ night-lights texture), cloud layer, and Fresnel rim lighting.
- **Procedural textures** generated at runtime (simplex/fractal noise) so the repo ships **no large binary image assets** — keeps it lightweight, license-clean, and fully self-contained. Earth and Mars get distinct procedural palettes, normal maps, and specular masks. (Stretch: optional bundled public-domain textures behind a quality preset.)

### 2.2 Surface Deformation Model (core technical challenge)
- The planet mesh is a high-resolution **icosphere** (subdivided icosahedron) for uniform vertex distribution (avoids UV-sphere pole pinching).
- A **displacement height-field** stored in a data texture / typed array drives vertex radial displacement in the vertex shader. Impacts write crater profiles (depressed bowl + raised rim using a smooth radial falloff) into this height-field → **permanent, persistable deformation**.
- Deformation state is a serializable array → enables **save/load** (Spec requirement) and keeps physics decoupled from rendering.
- LOD strategy: pick subdivision level by device capability (quality presets) to protect frame rate.

### 2.3 Physics & Destruction
- **Lightweight custom physics** (no heavy external engine, to control cost/perf): Newtonian gravity well toward planet center, projectile integration (semi-implicit Euler / Verlet), sphere–surface collision against current deformed radius.
- On impact: spawn **fragment chunks** (instanced meshes with momentum + angular velocity), **debris particles** (GPU-friendly points/instanced), an **explosion flash + shockwave**, and write a crater into the height-field.
- **Atmospheric entry**: heat/trail particle effect scaled by velocity while inside atmosphere shell.
- Object pooling for fragments/particles to avoid GC stalls during heavy sequences (perf gate).

### 2.4 Application Structure (modular ES modules)
```
src/
  main.js                 # bootstrap, animation loop, wiring
  core/
    SceneManager.js       # renderer, scene, camera, resize, post-processing
    Clock.js              # sim time, pause/play, speed scaling
    Settings.js           # quality presets, persisted prefs
  planet/
    Planet.js             # icosphere mesh + material orchestration
    PlanetConfig.js       # factual data (Earth, Mars, ...) + citations
    Heightfield.js        # deformation state (read/write/serialize)
    shaders/              # GLSL: surface, atmosphere, clouds, night
  physics/
    PhysicsWorld.js       # gravity, integration, collision dispatch
    Projectile.js         # asteroid / meteor / rocket types
    ImpactSystem.js       # crater writing, fragments, debris, shockwave
  effects/
    Particles.js          # pooled particle systems
    Atmosphere.js         # scattering shell + glow
    Clouds.js             # animated cloud layer
  camera/
    OrbitController.js     # orbit/zoom/pan, touch, free-look modes
  ui/
    UIController.js        # overlay panels, bindings
    components...          # planet selector, sim controls, info/FPS, help
  state/
    SaveLoad.js           # localStorage + JSON export/import
  util/
    noise.js, math.js, pool.js
tests/                    # Vitest unit tests
index.html                # entry
```

### 2.5 Tech Stack (final choices)
| Concern | Choice | Rationale |
|---|---|---|
| Language | Modern JS (ES2022 modules) | Zero-cost, native, fast iteration |
| 3D | Three.js (npm) | Best-in-class WebGL, Constitution §7 |
| Build/dev | **Vite** | Fast HMR dev server, simple static build for Pages |
| Tests | **Vitest** + jsdom | First-class Vite integration, fast unit tests |
| Lint/format | **ESLint** + **Prettier** | Quality Gate §6 "clean code" |
| Deploy | **GitHub Actions → GitHub Pages** | Hard Boundary §2 (GitHub-native) |
| Persistence | localStorage + JSON import/export | No backend, zero cost |
| Styling | Hand-authored CSS (glassmorphism overlay) | Lightweight, no framework needed |

> Note on Vite base path: configured so built asset URLs resolve under the project Pages subpath (`/aether-sphere-claude-opus-4-8/`).

---

## 3. Testing Strategy (Quality Gate §6: "All automated tests pass")

- **Unit tests (Vitest)** for pure logic, runnable headlessly in CI without a GPU:
  - `Heightfield`: crater write math, bounds, serialize/deserialize round-trip.
  - `PhysicsWorld`/`Projectile`: gravity acceleration direction/magnitude, integration step, collision detection against radius.
  - `math/noise/pool` utilities: deterministic outputs, pool reuse correctness.
  - `SaveLoad`: schema versioning, export/import round-trip, corrupt-input handling.
  - `PlanetConfig`: data presence + plausibility (radius/gravity > 0, citations present).
- **Smoke/integration**: a headless module-load test ensuring core modules import and initialize without throwing (Three.js objects mocked where WebGL is required).
- **Coverage goal**: meaningful coverage of non-WebGL logic (target ≥80% of testable modules); rendering/shader code validated manually + via visual checklist.
- **Manual visual QA checklist** (documented in `docs/QA-CHECKLIST.md`): rotation, orbit/zoom/pan, planet switch, day/night, clouds, atmosphere, spawn each projectile type, crater persistence, save/load, FPS overlay, mobile/touch, responsive layout.

---

## 4. CI/CD & Deployment (Hard Boundary §2; Spec "Full GitHub Actions CI")

- **`.github/workflows/ci.yml`** (on push/PR): install → lint → test → build. Fails the build on lint/test errors (Quality Gate enforcement).
- **`.github/workflows/deploy.yml`** (on push to default branch): build → upload Pages artifact → deploy via `actions/deploy-pages`. Uses `Pages` environment; no secrets, no external cost.
- Pages serves the Vite `dist/` output. Verify the live URL loads and is interactive (Quality Gate §6).
- README will embed the **live demo URL** and screenshots/GIFs.

---

## 5. Step-by-Step Task Breakdown

Tasks are atomic and ordered. `[P]` marks tasks that can proceed in parallel with siblings. Each task ends with a commit and a `PROGRESS.md` update (Constitution §4: frequent atomic commits).

### Phase A — Foundation & Tooling
- A1. Initialize npm project; add Vite, Three.js, Vitest, ESLint, Prettier; configure scripts (`dev`, `build`, `preview`, `test`, `lint`, `format`).
- A2. Add `index.html`, base CSS reset, app container; minimal `main.js` that renders a black canvas + a lit sphere to validate the toolchain.
- A3. Configure ESLint/Prettier rules and `vite.config.js` (base path for Pages, Vitest config).
- A4. [P] Author CI workflow (`ci.yml`) and Pages deploy workflow (`deploy.yml`).
- **Gate A:** `npm run dev` shows a rotating lit sphere; `npm run build` + `npm test` + `npm run lint` pass locally and in CI.

### Phase B — Planet Rendering Core
- B1. `SceneManager`: renderer (antialias, correct color space, tone mapping), camera, resize handling, render loop, optional post-processing (bloom).
- B2. `Planet` icosphere geometry + base PBR-ish material; `PlanetConfig` with **factually sourced** Earth/Mars data + citations.
- B3. Procedural surface generation (continents/oceans for Earth; cratered rust palette for Mars) → albedo + normal + specular masks. `[P]` with B4.
- B4. [P] `OrbitController`: smooth orbit/zoom/pan (mouse), inertia, distance clamps.
- B5. Auto-rotation with toggle + speed control hook (data wired to UI later).
- **Gate B:** Detailed, rotatable Earth with mouse orbit/zoom/pan. (Spec criteria 1–2.)

### Phase C — Atmosphere, Clouds, Day/Night
- C1. Day/night shader: blend day albedo ↔ emissive night-lights across the terminator using sun direction; directional "sun" light.
- C2. [P] `Atmosphere`: back-side scattering shell + Fresnel rim glow.
- C3. [P] `Clouds`: animated semi-transparent layer with independent drift; subtle weather variation.
- C4. Tune lighting, exposure, shadows/self-shadowing of terrain.
- **Gate C:** Animated atmosphere, clouds, day/night cycle, realistic lighting. (Spec criterion 3.)

### Phase D — Camera Modes & Touch
- D1. Touch gestures (one-finger orbit, pinch zoom, two-finger pan).
- D2. [P] Orbital + free-look camera modes with smooth transitions.
- **Gate D:** Full mouse + touch parity; multiple camera modes.

### Phase E — Physics & Destruction (core)
- E1. `PhysicsWorld`: gravity well + projectile integration + atmosphere drag region.
- E2. `Projectile` types (asteroid/meteor/rocket) with distinct mass/size/visuals; spawn + aim/launch controls.
- E3. `Heightfield` deformation: crater write (bowl + rim falloff), vertex-shader displacement, persistence-ready state.
- E4. `ImpactSystem`: collision → crater write + fragment chunks (instanced, momentum/spin) + debris particles + explosion flash/shockwave.
- E5. Atmospheric-entry heat/trail particles; object pooling for fragments/particles.
- E6. Perf pass: instancing, pooling, capped particle budgets, LOD by quality preset → validate ≥50 FPS during heavy sequences.
- **Gate E:** Spawn/aim/launch projectiles; impacts show fragmentation, cratering, debris, **permanent deformation**; perf target met. (Spec criteria 4–5, 7.)

### Phase F — Simulation Controls & Persistence
- F1. `Clock`: pause/play, sim-speed scaling, gravity multiplier.
- F2. `SaveLoad`: serialize planet selection + height-field + sim params to localStorage; JSON export/import (stretch: shareable state). Schema-versioned.
- **Gate F:** Pause/play, adjustable speed & gravity, save/load restores surface damage. (Spec criterion 6.)

### Phase G — UI / UX Polish
- G1. Glassmorphism overlay shell that never obstructs the 3D view; responsive layout.
- G2. Planet selector dropdown; simulation controls (spawn, type, speed, gravity, pause/play, reset).
- G3. Info panel: live FPS, object counts, planet stats (with citations link); help/instructions tooltip.
- G4. Visual polish pass: typography, transitions, hover/focus states, accessibility (keyboard, ARIA, contrast).
- **Gate G:** Clean modern UI with selector + controls + info + help; responsive. (Spec criteria 8–9.)

### Phase H — Testing, Docs, Deploy, Verify
- H1. Write/expand Vitest unit tests (§3); reach coverage goal; ensure CI green.
- H2. Professional `README.md`: overview, features, screenshots/GIFs, controls table, **live demo link**, tech stack, dev instructions, attributions/citations.
- H3. `docs/`: `QA-CHECKLIST.md`, `ARCHITECTURE.md`, `DATA-SOURCES.md` (citations), `CONTRIBUTING.md`.
- H4. Trigger Pages deploy; **verify live URL** loads and is fully interactive; capture media for README.
- H5. Final pass over **all Quality Gates** (Constitution §6) and **all Success Criteria** (Spec) — check each off in `PROGRESS.md`.
- **Gate H (Done):** Every Quality Gate + Success Criterion satisfied; live Pages deployment verified. (Spec criteria 10–12.)

### Phase I — Stretch (only if quality bar already met)
- More planets (Venus/Moon/Jupiter), orbital mechanics for spawned bodies, terrain-editing tools, Web Audio SFX, quality-preset performance panel. (Spec Stretch Goals.)

---

## 6. Success Criteria → Deliverable Traceability

| Spec Success Criterion | Delivered by |
|---|---|
| Interactive 3D Earth, orbit/zoom/pan | Phase B (B1–B4) |
| Auto-rotation toggle + speed | B5, G2 |
| Atmosphere, clouds, day/night, lighting | Phase C |
| Collision physics: fragmentation, cratering, debris, permanent deformation | Phase E (E3–E5) |
| Spawn/manipulate projectiles | E2, G2 |
| Save/load custom states | F2 |
| ≥50 FPS during impacts | E6 + quality presets |
| Beautiful visuals (lighting, shadows, particles, atmosphere) | C, E4, G4 |
| Clean UI w/ selector + controls | Phase G |
| Live GitHub Pages deployment | Phase A4, H4 |
| Comprehensive README (screenshots, controls, demo link) | H2 |
| All tests pass + Actions succeed | H1, Phase A4 CI |

---

## 7. Risk Register & Mitigations

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | Permanent deformation hurts FPS at high mesh resolution | Perf gate fail | Height-field + shader displacement (not CPU geometry rebuilds); LOD via quality presets (E3, E6) |
| R-2 | Heavy impact sequences cause GC stalls | Stutter | Object pooling + instancing + capped particle budgets (E5–E6) |
| R-3 | WebGL/shaders untestable in headless CI | Weak test coverage | Test pure logic (physics, height-field, save/load); mock Three.js; manual visual checklist (§3) |
| R-4 | GitHub Pages base-path breaks asset URLs | Blank live site | Set Vite `base` to repo subpath; verify on live URL (A3, H4) |
| R-5 | Mobile performance / touch gaps | Spec miss | Quality presets + dedicated touch layer + mobile QA (D1, E6) |
| R-6 | 59-min session limit (Constitution §4) | Incomplete work | Atomic commits + live PROGRESS.md so work resumes cleanly |
| R-7 | CDN runtime dependency could fail/cost reliability | Fragile deploy | Bundle libs via npm; no runtime CDN for core (Architecture §2.1) |
| R-8 | Large binary texture assets bloat/licensing | Repo bloat / license risk | Procedural textures generated at runtime; any optional assets must be public-domain + cited (§2.1, DATA-SOURCES.md) |
| R-9 | Save schema changes break old saves | Data loss UX | Versioned schema + graceful migration/fallback (F2) |
| R-10 | Physics realism vs. performance trade-off | Spec tension | Tunable params; favor visually convincing + stable over rigorously exact; document assumptions |

---

## 8. Definition of Done

1. All **Quality Gates** in `CONSTITUTION.md` §6 satisfied.
2. All **Success Criteria** in `PROJECT-SPEC.md` checked off in `PROGRESS.md`.
3. CI (lint + test + build) green; Pages deploy succeeds; **live URL verified interactive**.
4. README professional and complete with live demo link + media.
5. `CHANGELOG.md` and `PROGRESS.md` reflect final state; data citations present.

---

## 9. Constitution Update Proposals (from Prompt 1)

The following clarifications were proposed in the Prompt 1 response and, if approved, become part of the living constitution (recorded in `CHANGELOG.md`):

1. **Bundle-over-CDN preference** for core dependencies (reproducibility/offline resilience) while keeping CDN permitted for optional enhancements. *(Refines §2/§7.)*
2. **Asset policy**: prefer procedural generation; any bundled binary assets must be public-domain and cited in `DATA-SOURCES.md`. *(Operationalizes §1 Factual Integrity + §2 Zero Cost.)*
3. **Performance budget made explicit**: hard floor ≥50 FPS during heavy impacts (Spec), 60 FPS target on modern desktop; enforced via quality presets. *(Operationalizes §6.)*

These are non-breaking clarifications consistent with the existing constitution; the project proceeds under them unless overridden.
