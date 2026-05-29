# Architecture

AetherSphere is a modular, dependency-light Three.js application. All state lives in the browser;
there is no backend. This document maps the source tree and describes the major subsystems.

## High-level flow

```
index.html
  └─ src/main.js  (App orchestrator)
       ├─ core/SceneManager   → renderer, scene, lights, starfield, bloom, resize
       ├─ camera/CameraController → OrbitControls (mouse + touch)
       ├─ planet/Planet       → deformable surface + textures + clouds + atmosphere
       ├─ physics/PhysicsWorld → projectiles, gravity, integration, collision
       ├─ physics/ImpactSystem → impact → crater + fragments + debris + shockwave + flash
       ├─ effects/Particles   → pooled additive particle system
       ├─ ui/UIController      → overlay UI wiring & events
       └─ state/SaveLoad       → localStorage + JSON export/import
```

The animation loop in `main.js` advances the clock, steps the physics world, updates effects and
camera, then renders through the post-processing composer.

## Module map

### `src/core/`
- **SceneManager.js** — Owns the `WebGLRenderer`, scene, sun + ambient lights, procedural
  starfield, and the `EffectComposer` (UnrealBloom). Handles resize and pixel-ratio capping.
- **Settings.js** — Quality presets (Low/Medium/High) controlling sphere detail, particle/fragment
  budgets, bloom, and pixel-ratio cap.
- **Clock.js** — Fixed-friendly delta timing with pause and speed scaling.

### `src/planet/`
- **PlanetConfig.js** — Factual NASA data + procedural palette/atmosphere parameters per world.
- **TextureFactory.js** — Generates day albedo, specular mask, and night-lights canvases at
  runtime via a shared surface-sampling function (no binary assets).
- **Heightfield.js** — The permanent-deformation engine: crater profiles, `applyImpact`, and
  serialize/deserialize. Pure and fully unit-tested.
- **Planet.js** — Assembles the icosphere geometry with a per-vertex elevation attribute
  (base terrain + heightfield displacement), wires the shader material, clouds, and atmosphere.
- **shaders/planetShader.js** — Day/night GLSL: in-shader equirectangular UVs (seam/pole safe),
  soft terminator, specular highlight, emissive night lights, and smooth/relief normal blending.
- **shaders/atmosphereShader.js** — Fresnel-based atmospheric glow shell.

### `src/physics/`
- **Projectile.js** — Projectile types (asteroid/meteor/rocket) with mass, radius, and behavior.
- **PhysicsWorld.js** — Inverse-square gravity, semi-implicit Euler, atmospheric drag shell,
  rocket self-propulsion, and sphere collision against the planet.
- **ImpactSystem.js** — Translates a collision into a crater (planet-local frame), break-off
  fragments, scattering debris, an expanding shockwave ring, and a flash.

### `src/effects/`
- **Atmosphere.js / Clouds.js** — Additive atmosphere shell and animated cloud sphere.
- **Particles.js** — Single pooled `THREE.Points` system with additive blending for impact FX.

### `src/camera/`
- **CameraController.js** — Thin wrapper over `OrbitControls` with damping and touch gestures.

### `src/ui/`
- **UIController.js** — Binds the glassmorphism overlay (planet selector, sliders, buttons,
  stats, help) to app callbacks.

### `src/state/`
- **SaveLoad.js** — Serializes planet id, settings, and surface deformation to `localStorage`
  and to downloadable JSON; restores them on load/import.

### `src/util/`
- **math.js** — clamp, lerp, smoothstep, vector helpers.
- **noise.js** — 3D simplex-style noise with fBm and ridged variants.
- **pool.js** — Generic object pool to avoid per-frame allocations.

## Key design decisions

- **Procedural everything.** Textures are drawn to canvases at runtime, keeping the repo free of
  binary assets and avoiding any external fetches.
- **Unit-radius planet.** Rendering uses a planet radius of `1.0`; real-world figures are shown in
  the UI for factual context. Physics operates in this normalized world space.
- **Permanent deformation.** Impacts write into a heightfield in the planet's **local** frame, so
  craters rotate with the planet and survive save/load.
- **Performance.** Geometry detail, particle/fragment counts, and bloom scale with the quality
  preset; pooled particles and partial buffer-attribute updates keep the loop allocation-light.
- **Bundle over CDN.** Dependencies are bundled by Vite so the deployed site has zero runtime
  network dependencies (see the constitution clarification recorded in Prompt 1).

## Testing

Pure logic modules (math, noise, heightfield, physics, save/load, config) are covered by Vitest in
`tests/`. Rendering and DOM-wiring modules are validated manually against the
[QA checklist](QA-CHECKLIST.md) and excluded from coverage instrumentation.
