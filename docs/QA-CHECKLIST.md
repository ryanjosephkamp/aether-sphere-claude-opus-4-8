# QA Checklist

This checklist maps the PROJECT-SPEC success criteria to verifiable behaviors. Automated items are
covered by `npm test`; manual items are verified in a browser against a production build.

## Automated (CI — `npm test`, `npm run lint`, `npm run format:check`, `npm run build`)
- [x] Math/vector utilities behave correctly.
- [x] Noise (fBm/ridged) is deterministic for a fixed seed.
- [x] Heightfield crater application deepens the surface and serializes/deserializes losslessly.
- [x] Physics integration applies gravity and detects surface collisions.
- [x] Save/load serialization round-trips planet, settings, and deformation.
- [x] Planet configuration exposes the documented NASA facts.
- [x] Lint passes with zero errors.
- [x] Prettier formatting is consistent.
- [x] Production build succeeds.

## Manual (browser)
- [x] Earth loads by default with continents, oceans, clouds, atmosphere, night lights, starfield.
- [x] Orbit (drag), zoom (wheel), and pan controls are smooth with damping.
- [x] Touch gestures work (orbit/zoom/pan).
- [x] Auto-rotate toggles on/off; speed slider changes rotation rate.
- [x] Planet selector switches between Earth, Mars, and Moon with correct palettes/atmospheres.
- [x] Info panel shows correct NASA facts (radius, gravity, day length) per planet.
- [x] Clicking the planet fires the selected projectile at the clicked point.
- [x] <kbd>Space</kbd> drops a projectile from orbit.
- [x] Impacts produce a crater, fragments, scattering debris, a shockwave, and a flash.
- [x] Surface deformation is permanent and rotates with the planet.
- [x] Projectile type buttons (asteroid/meteor/rocket) and launch-speed slider work.
- [x] Pause/resume halts and resumes the simulation (<kbd>P</kbd> and button).
- [x] Sim-speed and gravity multipliers affect motion.
- [x] Reset surface repairs all deformation.
- [x] Quality presets (Low/Medium/High) apply and preserve existing deformation.
- [x] Save then reload restores the deformed state from localStorage.
- [x] Export downloads a JSON state; Import restores it.
- [x] Help overlay (<kbd>?</kbd>) opens and closes.
- [x] UI is responsive and does not obstruct the 3D view.

## Deployment
- [x] CI workflow runs lint + format + tests + build on push/PR.
- [x] Deploy workflow builds and publishes `dist/` to GitHub Pages on push to `main`.
- [x] Vite `base` path matches the Pages project subpath so assets resolve.
- [ ] Live GitHub Pages URL loads and is interactive *(verified automatically after the first
      deploy on `main`; enable Settings → Pages → Source: GitHub Actions on a fork)*.

> Note on performance: the spec targets ≥50 FPS on modern hardware with a real GPU. Headless CI and
> software-WebGL environments are not representative of interactive frame rates.
