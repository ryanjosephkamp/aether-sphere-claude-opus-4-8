/**
 * Clouds — an animated, semi-transparent layer drifting above the surface
 * (PROJECT-SPEC: "Animated clouds layer"). Uses a procedurally generated cloud
 * coverage texture and drifts via a time uniform in the shader.
 */
import * as THREE from 'three';
import { cloudVertexShader, cloudFragmentShader } from '../planet/shaders/atmosphereShader.js';

export function createClouds(config, cloudTexture, radius = 1.0) {
  if (!config.hasClouds || !cloudTexture) return null;
  const geometry = new THREE.SphereGeometry(radius * 1.012, 96, 64);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCloudTex: { value: cloudTexture },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uTime: { value: 0 },
      uOpacity: { value: 0.62 },
    },
    vertexShader: cloudVertexShader,
    fragmentShader: cloudFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return {
    mesh,
    material,
    setSunDirection(v) {
      material.uniforms.uSunDir.value.copy(v);
    },
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      cloudTexture.dispose();
    },
  };
}
