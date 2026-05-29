# Changelog

All notable changes to **AetherSphere** are documented here. Format inspired by [Keep a Changelog](https://keepachangelog.com/); the project follows [Semantic Versioning](https://semver.org/) once releases begin.

## [Unreleased]

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
