/**
 * AetherSphere — application entry point.
 *
 * Wires together the scene, camera, planet, physics, effects, UI, and the
 * animation loop, and implements the high-level interactions: launching
 * projectiles by clicking the planet, dropping them from orbit, pausing,
 * adjusting parameters, switching planets/quality, and saving/loading state
 * (PROJECT-SPEC Core Features; IMPLEMENTATION-PLAN.md Phases B–H).
 */
import * as THREE from 'three';
import './styles/main.css';

import { SceneManager } from './core/SceneManager.js';
import { Clock } from './core/Clock.js';
import { Settings } from './core/Settings.js';
import { CameraController } from './camera/CameraController.js';
import { Planet } from './planet/Planet.js';
import { getPlanetConfig, DEFAULT_PLANET } from './planet/PlanetConfig.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { PROJECTILE_TYPES } from './physics/Projectile.js';
import { ImpactSystem } from './physics/ImpactSystem.js';
import { ParticleSystem } from './effects/Particles.js';
import { SaveLoad } from './state/SaveLoad.js';
import { UIController } from './ui/UIController.js';
import { makeRng } from './util/math.js';

class App {
  constructor() {
    this.canvas = document.getElementById('scene');
    this.settings = new Settings();
    this.saveLoad = new SaveLoad();
    this.clock = new Clock();

    this.planetId = DEFAULT_PLANET;
    this.projectileType = 'asteroid';
    this.launchSpeed = 3.0;
    this.sunAngle = 0;

    this.projectileMeshes = new Map();
    this._rng = makeRng(13);
    this._fpsSmooth = 60;
    this._statTimer = 0;

    this._initScene();
    this._initUI();
    this._buildWorld(this.planetId);
    this._initInteraction();

    // Restore a saved session if present (non-blocking, best-effort).
    this._tryAutoRestore();

    this.ui.hideLoading();
    this._animate();
  }

  _initScene() {
    this.scene = new SceneManager(this.canvas, this.settings.preset);
    this.camera = new CameraController(this.scene.camera, this.canvas);
    this.camera.setAutoRotate(this.settings.get('autoRotate'));
    this.camera.setAutoRotateSpeed(this.settings.get('rotationSpeed'));
  }

  _initUI() {
    this.ui = new UIController({
      onPlanetChange: (id) => this._switchPlanet(id),
      onAutoRotate: (on) => {
        this.camera.setAutoRotate(on);
        this.settings.set('autoRotate', on);
      },
      onRotateSpeed: (v) => {
        this.camera.setAutoRotateSpeed(v);
        this.settings.set('rotationSpeed', v);
      },
      onProjectileType: (t) => (this.projectileType = t),
      onLaunchSpeed: (v) => (this.launchSpeed = v),
      onTogglePause: () => {
        const paused = this.clock.togglePause();
        this.ui.setPauseLabel(paused);
      },
      onResetSurface: () => {
        this.planet.resetSurface();
        this.physics.clear();
        this.impacts.clear();
        this._clearProjectileMeshes();
        this.ui.toast('Surface reset to pristine');
      },
      onSimSpeed: (v) => (this.clock.timeScale = v),
      onGravity: (v) => (this.physics.gravityMultiplier = v),
      onQuality: (q) => this._switchQuality(q),
      onSave: () => this._save(),
      onLoad: () => this._load(),
      onExport: () => this._export(),
      onImport: (file) => this._import(file),
      onDrop: () => this._dropProjectile(),
    });

    this.ui.syncInitial({
      planetId: this.planetId,
      quality: this.settings.get('quality'),
      autoRotate: this.settings.get('autoRotate'),
      rotationSpeed: this.settings.get('rotationSpeed'),
    });
  }

  _buildWorld(planetId) {
    const config = getPlanetConfig(planetId);
    this.config = config;
    this.planet = new Planet(config, this.settings.preset);
    this.scene.scene.add(this.planet.group);

    this.physics = new PhysicsWorld({
      planetRadius: 1.0,
      atmosphereRadius: 1.18,
      gravityStrength: 1.2,
      gravityMultiplier: parseFloat(this._gravityValue() || 1),
    });

    this.particles = new ParticleSystem(this.settings.preset.maxParticles);
    this.scene.scene.add(this.particles.object3d);

    this.impacts = new ImpactSystem(this.scene.scene, this.planet, this.particles, this.settings.preset);

    this._updateSun(0);
    this.ui.setPlanetFacts(config);
  }

  _gravityValue() {
    const el = document.getElementById('gravity');
    return el ? el.value : '1';
  }

  _disposeWorld() {
    this._clearProjectileMeshes();
    this.physics.clear();
    this.impacts.dispose();
    this.scene.scene.remove(this.particles.object3d);
    this.particles.dispose();
    this.scene.scene.remove(this.planet.group);
    this.planet.dispose();
  }

  _switchPlanet(id) {
    this.ui.showLoading(`Generating ${getPlanetConfig(id).name}…`);
    // Defer so the loading overlay can paint before the heavy build.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this._disposeWorld();
        this.planetId = id;
        this._buildWorld(id);
        this.ui.hideLoading();
        this.ui.toast(`Now exploring ${this.config.name}`);
      })
    );
  }

  _switchQuality(q) {
    this.settings.set('quality', q);
    this.ui.showLoading('Applying quality…');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Rebuild renderer-side quality (pixel ratio + bloom) and the world.
        const deformation = this.planet.serialize();
        const planetId = this.planetId;
        this._disposeWorld();
        this.scene.dispose();
        this.scene = new SceneManager(this.canvas, this.settings.preset);
        this.camera.dispose();
        this.camera = new CameraController(this.scene.camera, this.canvas);
        this.camera.setAutoRotate(this.settings.get('autoRotate'));
        this.camera.setAutoRotateSpeed(this.settings.get('rotationSpeed'));
        this._buildWorld(planetId);
        this.planet.loadDeformation(deformation);
        this.ui.hideLoading();
        this.ui.toast(`Quality: ${q}`);
      })
    );
  }

  _initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downTime = 0;

    this.canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
    });
    this.canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const dt = performance.now() - downTime;
      // Treat as a click (fire) only if the pointer barely moved (not a drag).
      if (dist < 6 && dt < 500) this._fireAtPointer(e.clientX, e.clientY);
    });
  }

  _fireAtPointer(clientX, clientY) {
    this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.scene.camera);
    const hits = this.raycaster.intersectObject(this.planet.surfaceMesh, false);
    if (hits.length === 0) return;
    const target = hits[0].point;
    const from = this.scene.camera.position;
    const cfg = PhysicsWorld.buildLaunch(
      this.projectileType,
      [from.x, from.y, from.z],
      [target.x, target.y, target.z],
      this.launchSpeed
    );
    this._spawn(cfg);
  }

  _dropProjectile() {
    // Drop from a random high-orbit position with a gentle inward nudge.
    const dir = new THREE.Vector3(
      this._rng() * 2 - 1,
      this._rng() * 2 - 1,
      this._rng() * 2 - 1
    ).normalize();
    const from = dir.clone().multiplyScalar(3.2);
    const tangent = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const velocity = dir
      .clone()
      .multiplyScalar(-this.launchSpeed * 0.5)
      .addScaledVector(tangent, this.launchSpeed * 0.25);
    const def = PROJECTILE_TYPES[this.projectileType];
    this._spawn({
      type: this.projectileType,
      position: [from.x, from.y, from.z],
      velocity: [velocity.x, velocity.y, velocity.z],
      mass: def.mass,
      radius: def.radius,
    });
  }

  _spawn(cfg) {
    const p = this.physics.spawn(cfg);
    const def = PROJECTILE_TYPES[p.type];
    const geo = new THREE.IcosahedronGeometry(p.radius, p.type === 'rocket' ? 1 : 0);
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: new THREE.Color(def.color),
      emissiveIntensity: p.type === 'asteroid' ? 0.05 : 0.4,
      roughness: 0.7,
      metalness: 0.2,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.position.x, p.position.y, p.position.z);
    this.scene.scene.add(mesh);
    this.projectileMeshes.set(p.id, { mesh, type: p.type });
  }

  _clearProjectileMeshes() {
    for (const { mesh } of this.projectileMeshes.values()) {
      this.scene.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.projectileMeshes.clear();
  }

  _updateSun(elapsed) {
    // Slowly orbit the sun around the planet for a living day/night cycle.
    this.sunAngle = elapsed * 0.05;
    const dir = new THREE.Vector3(
      Math.cos(this.sunAngle),
      0.25,
      Math.sin(this.sunAngle)
    ).normalize();
    this.scene.setSunDirection(dir);
    this.planet.setSunDirection(this.scene.sunDirection);
  }

  // ---- Persistence ----
  _currentState() {
    return SaveLoad.buildState({
      planetId: this.planetId,
      heightfield: this.planet.serialize(),
      sim: {
        timeScale: this.clock.timeScale,
        gravityMultiplier: this.physics.gravityMultiplier,
      },
    });
  }

  _applyState(state) {
    const apply = () => {
      this.planet.loadDeformation(state.heightfield);
      if (state.sim) {
        if (Number.isFinite(state.sim.timeScale)) {
          this.clock.timeScale = state.sim.timeScale;
          document.getElementById('sim-speed').value = state.sim.timeScale;
          document.getElementById('sim-speed-val').textContent = `${state.sim.timeScale.toFixed(1)}×`;
        }
        if (Number.isFinite(state.sim.gravityMultiplier)) {
          this.physics.gravityMultiplier = state.sim.gravityMultiplier;
          document.getElementById('gravity').value = state.sim.gravityMultiplier;
          document.getElementById('gravity-val').textContent = `${state.sim.gravityMultiplier.toFixed(1)}×`;
        }
      }
    };
    if (state.planetId && state.planetId !== this.planetId) {
      this.ui.showLoading(`Loading ${getPlanetConfig(state.planetId).name}…`);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this._disposeWorld();
          this.planetId = state.planetId;
          this._buildWorld(state.planetId);
          document.getElementById('planet-select').value = state.planetId;
          apply();
          this.ui.hideLoading();
        })
      );
    } else {
      apply();
    }
  }

  _save() {
    const ok = this.saveLoad.save(this._currentState());
    this.ui.toast(ok ? 'World saved' : 'Save failed');
  }

  _load() {
    const state = this.saveLoad.load();
    if (!state) {
      this.ui.toast('No saved world found');
      return;
    }
    this._applyState(state);
    this.ui.toast('World loaded');
  }

  _tryAutoRestore() {
    const state = this.saveLoad.load();
    if (state && state.planetId === this.planetId) {
      this.planet.loadDeformation(state.heightfield);
    }
  }

  _export() {
    const text = SaveLoad.toJSON(this._currentState());
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethersphere-${this.planetId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.ui.toast('Exported world JSON');
  }

  async _import(file) {
    try {
      const text = await file.text();
      const state = SaveLoad.fromJSON(text);
      this._applyState(state);
      this.ui.toast('Imported world');
    } catch (err) {
      console.warn(err);
      this.ui.toast('Invalid save file');
    }
  }

  // ---- Main loop ----
  _animate() {
    const loop = () => {
      this._frameId = requestAnimationFrame(loop);
      const { wall, sim } = this.clock.tick();

      this._updateSun(this.clock.elapsed);
      this.planet.update(this.clock.elapsed);
      this.camera.update();

      // Physics + impacts.
      const events = this.physics.step(sim);
      this._syncProjectiles(sim);
      for (const ev of events) {
        const entry = this.projectileMeshes.get(ev.projectile.id);
        if (entry) {
          this.scene.scene.remove(entry.mesh);
          entry.mesh.geometry.dispose();
          entry.mesh.material.dispose();
          this.projectileMeshes.delete(ev.projectile.id);
        }
        this.impacts.handleImpact(ev);
      }
      this.impacts.update(sim);
      this.particles.update(sim);

      this.scene.render();
      this._updateStats(wall);
    };
    loop();
  }

  _syncProjectiles(sim) {
    for (const p of this.physics.projectiles) {
      const entry = this.projectileMeshes.get(p.id);
      if (!entry) continue;
      entry.mesh.position.set(p.position.x, p.position.y, p.position.z);
      entry.mesh.rotation.x += sim * 2;
      entry.mesh.rotation.y += sim * 1.5;
      // Atmospheric-entry trail when inside the air shell.
      const r = p.distanceFromCenter();
      if (r < this.physics.atmosphereRadius && sim > 0) {
        const heat = entry.type === 'rocket' ? [0.6, 0.7, 1.0] : [1.0, 0.5, 0.15];
        this.particles.emitBurst([p.position.x, p.position.y, p.position.z], {
          count: 4,
          speed: 0.15,
          life: 0.6,
          gravity: 0.2,
          color: heat,
        });
      }
    }
  }

  _updateStats(wall) {
    const instFps = wall > 0 ? 1 / wall : 60;
    this._fpsSmooth += (instFps - this._fpsSmooth) * 0.1;
    this._statTimer += wall;
    if (this._statTimer > 0.25) {
      this._statTimer = 0;
      this.ui.updateStats({
        fps: this._fpsSmooth,
        objects: this.physics.count + this.impacts.activeFragments.length,
        impacts: this.planet.impactCount,
      });
    }
  }
}

// Boot once the DOM is ready.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
