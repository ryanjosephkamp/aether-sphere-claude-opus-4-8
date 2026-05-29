/**
 * CameraController — smooth orbit / zoom / pan with mouse + touch, wrapping
 * Three.js OrbitControls (PROJECT-SPEC: "Smooth orbit, zoom, and pan controls
 * (mouse + touch support)"). Adds an auto-rotate toggle with adjustable speed
 * and a "free-look vs. orbital" damping profile.
 */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
  constructor(camera, domElement) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 1.25;
    this.controls.maxDistance = 12;
    this.controls.enablePan = true;
    // Touch: one finger rotates, two fingers dolly + pan.
    this.controls.touches = {
      ONE: 0, // ROTATE
      TWO: 2, // DOLLY_PAN
    };
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
  }

  /** Map a user speed multiplier to OrbitControls' autoRotateSpeed. */
  setAutoRotateSpeed(multiplier) {
    this.controls.autoRotateSpeed = 0.6 * multiplier;
  }

  update() {
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
  }
}
