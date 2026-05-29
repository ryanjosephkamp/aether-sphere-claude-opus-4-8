/**
 * SceneManager — owns the WebGL renderer, scene, camera, lighting ("sun"),
 * starfield backdrop, optional bloom post-processing, and the resize handling
 * (IMPLEMENTATION-PLAN.md §2.4, Phase B). Keeps the render plumbing in one
 * place so the rest of the app deals only with high-level objects.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { makeRng } from '../util/math.js';

export class SceneManager {
  constructor(canvas, preset) {
    this.canvas = canvas;
    this.preset = preset;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x01030a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._applyPixelRatio();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, this._aspect(), 0.01, 2000);
    this.camera.position.set(0, 1.2, 3.2);

    // The "sun": a directional light driving day/night + lighting projectiles.
    this.sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
    this.sun.position.set(5, 2, 3);
    this.scene.add(this.sun);
    this.sunDirection = new THREE.Vector3().copy(this.sun.position).normalize();

    // Soft ambient + subtle blue fill so the night side isn't pure black.
    this.scene.add(new THREE.AmbientLight(0x223044, 0.6));
    const fill = new THREE.DirectionalLight(0x4466aa, 0.25);
    fill.position.set(-4, -1, -2);
    this.scene.add(fill);

    this._addStarfield();
    this._setupComposer();

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  _aspect() {
    return window.innerWidth / Math.max(1, window.innerHeight);
  }

  _applyPixelRatio() {
    const cap = this.preset.pixelRatioCap ?? 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  _addStarfield() {
    const count = 2500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const rng = makeRng(98765);
    for (let i = 0; i < count; i++) {
      // Uniformly distribute on a large sphere shell.
      const u = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const dist = 400 + rng() * 600;
      positions[i * 3] = r * Math.cos(theta) * dist;
      positions[i * 3 + 1] = u * dist;
      positions[i * 3 + 2] = r * Math.sin(theta) * dist;
      const shade = 0.6 + rng() * 0.4;
      const warm = rng() < 0.2 ? 0.85 : 1.0;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade * (0.9 + rng() * 0.1);
      colors[i * 3 + 2] = shade * warm;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);
  }

  _setupComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomEnabled = !!this.preset.bloom;
    if (this.bloomEnabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.55, // strength
        0.6, // radius
        0.6 // threshold
      );
      this.composer.addPass(this.bloomPass);
    }
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
  }

  setSunDirection(vec) {
    this.sunDirection.copy(vec).normalize();
    this.sun.position.copy(this.sunDirection).multiplyScalar(6);
  }

  resize() {
    this.camera.aspect = this._aspect();
    this.camera.updateProjectionMatrix();
    this._applyPixelRatio();
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    if (this.bloomPass) {
      this.bloomPass.setSize(window.innerWidth, window.innerHeight);
    }
  }

  render() {
    this.composer.render();
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
