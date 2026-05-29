/**
 * GLSL shaders for the atmospheric glow shell and the cloud layer.
 */

// Atmosphere: rendered on a slightly larger back-side sphere. Produces a soft
// Fresnel halo that is brightest at the limb and on the day side (Phase C).
export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    // Back-side rendering: glow strongest where the surface faces away.
    float fresnel = pow(clamp(1.0 - dot(viewDir, -vNormal), 0.0, 1.0), uPower);
    float sun = clamp(dot(normalize(vWorldPos), uSunDir) * 0.5 + 0.6, 0.0, 1.0);
    float alpha = fresnel * uIntensity * sun;
    gl_FragColor = vec4(uColor * (0.6 + 0.8 * sun), alpha);
  }
`;

// Clouds: a semi-transparent layer drifting independently of the surface,
// lit by the sun so they cast brightness only on the day side.
export const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vDir;
  void main() {
    vUv = uv;
    vDir = normalize(position);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const cloudFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uCloudTex;
  uniform vec3 uSunDir;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vWorldPos;
  varying vec3 vDir;

  const float PI = 3.141592653589793;
  vec2 dirToUV(vec3 d) {
    float u = 0.5 + atan(d.z, d.x) / (2.0 * PI);
    float v = 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI;
    return vec2(u, v);
  }

  void main() {
    vec2 uv = dirToUV(vDir);
    uv.x += uTime * 0.004; // slow eastward drift
    float c = texture2D(uCloudTex, uv).r;
    vec3 n = normalize(vWorldPos);
    float light = clamp(dot(n, uSunDir), 0.0, 1.0);
    float lit = 0.15 + 0.85 * light;
    float alpha = c * uOpacity;
    gl_FragColor = vec4(vec3(1.0) * lit, alpha);
  }
`;
