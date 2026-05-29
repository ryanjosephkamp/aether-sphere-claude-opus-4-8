/**
 * Atmosphere — a soft Fresnel glow shell rendered on the back faces of a sphere
 * slightly larger than the planet, producing an atmospheric halo that responds
 * to the sun direction (PROJECT-SPEC: "atmospheric scattering/glow").
 */
import * as THREE from 'three';
import {
  atmosphereVertexShader,
  atmosphereFragmentShader,
} from '../planet/shaders/atmosphereShader.js';

export function createAtmosphere(config, radius = 1.0) {
  const atmo = config.atmosphere;
  const geometry = new THREE.SphereGeometry(radius * 1.025, 64, 48);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(...atmo.color) },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uIntensity: { value: atmo.intensity },
      uPower: { value: atmo.power },
    },
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  return {
    mesh,
    material,
    setSunDirection(v) {
      material.uniforms.uSunDir.value.copy(v);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
