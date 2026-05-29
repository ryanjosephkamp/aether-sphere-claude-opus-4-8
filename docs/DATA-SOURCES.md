# Data Sources & Attributions

> Supports **Factual Integrity** (Constitution §1) and **Zero External Cost** (§2). All planetary physical data used in AetherSphere must come from verifiable public/open references and be cited here. No data may be hallucinated.

## Planetary Physical Data (planned authoritative sources)

Primary reference: **NASA Planetary Fact Sheets** (public domain, U.S. government work).
- Earth: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
- Mars: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- Comparative index: https://nssdc.gsfc.nasa.gov/planetary/factsheet/

Values to be encoded in `src/planet/PlanetConfig.js` (each with an inline citation):
- Mean radius (km)
- Surface gravity (m/s²)
- Sidereal rotation period (h) → drives auto-rotation default
- Axial tilt (degrees) → drives day/night terminator
- Length of day (h)

> Status: **Planned.** Exact values will be transcribed and cited during Phase B (B2). This file will be updated with the final figures and any additional planets added as stretch goals.

## Visual Assets
- **Default policy:** all textures are **procedurally generated at runtime** (noise-based) — no third-party image assets shipped, eliminating licensing/cost concerns.
- If any bundled binary assets are introduced later (optional quality preset), they must be **public-domain** (e.g., NASA Visible Earth / Blue Marble imagery) and individually attributed here with source URL and license note.

## Libraries (bundled via npm, open-source licenses)
- Three.js — MIT License
- Vite — MIT License
- Vitest — MIT License
- ESLint — MIT License · Prettier — MIT License

(Exact versions recorded in `package.json` / lockfile once Phase A begins.)
