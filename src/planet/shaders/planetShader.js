/**
 * GLSL shaders for the planet surface.
 *
 * The surface uses screen-space derivative normals (dFdx/dFdy on the world
 * position) so that BOTH the procedural terrain relief and the dynamic impact
 * craters are correctly lit without needing a baked normal map — the geometry
 * itself (displaced in the vertex shader) drives the lighting. Day/night is
 * blended across the terminator from the sun direction, with emissive city
 * lights on the night side for Earth (IMPLEMENTATION-PLAN.md §2.1, Phase C).
 */

export const planetVertexShader = /* glsl */ `
  attribute float aElevation;   // base terrain elevation + crater displacement
  varying vec3 vDir;            // unit direction (for equirectangular UV)
  varying vec3 vWorldPos;       // world position (for derivative normals)
  varying vec3 vSmoothNormal;   // smooth sphere normal in world space
  varying float vElevation;

  void main() {
    vDir = normalize(position);
    vElevation = aElevation;
    vSmoothNormal = normalize(mat3(modelMatrix) * vDir);
    vec3 displaced = position + vDir * aElevation;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const planetFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uDayTex;
  uniform sampler2D uNightTex;
  uniform sampler2D uSpecTex;
  uniform vec3 uSunDir;        // normalized, in world space
  uniform float uHasNight;     // 1.0 if night lights are used
  uniform vec3 uAtmoColor;
  uniform float uTime;

  varying vec3 vDir;
  varying vec3 vWorldPos;
  varying vec3 vSmoothNormal;
  varying float vElevation;

  const float PI = 3.141592653589793;

  vec2 dirToUV(vec3 d) {
    float u = 0.5 + atan(d.z, d.x) / (2.0 * PI);
    float v = 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI;
    return vec2(u, v);
  }

  void main() {
    // Smooth sphere normal keeps oceans/flat terrain free of facets, while the
    // screen-space derivative normal captures crater + mountain relief. Blend by
    // how much local relief there is so craters are lit but the globe stays smooth.
    vec3 sm = normalize(vSmoothNormal);
    vec3 dv = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
    if (dot(dv, sm) < 0.0) dv = -dv;
    float relief = clamp(abs(vElevation) * 9.0, 0.0, 1.0);
    vec3 n = normalize(mix(sm, dv, relief));

    vec2 uv = dirToUV(vDir);
    vec3 day = texture2D(uDayTex, uv).rgb;
    float spec = texture2D(uSpecTex, uv).r;

    float ndotl = dot(n, uSunDir);
    // Soft terminator.
    float dayAmount = smoothstep(-0.15, 0.25, ndotl);
    float diffuse = max(ndotl, 0.0);

    // Base lit day color with a touch of ambient.
    vec3 color = day * (0.08 + 0.92 * diffuse);

    // Specular ocean/ice highlight (uses the smooth normal to avoid facet glints).
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 halfDir = normalize(uSunDir + viewDir);
    float specPow = pow(max(dot(sm, halfDir), 0.0), 60.0);
    color += spec * specPow * vec3(1.0, 0.97, 0.9) * dayAmount * 0.8;

    // Night side: emissive city lights blended in as the sun sets.
    if (uHasNight > 0.5) {
      vec3 night = texture2D(uNightTex, uv).rgb;
      color += night * (1.0 - dayAmount) * 1.4;
    }

    // Subtle rim/atmosphere tint near the day-side limb.
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    color += uAtmoColor * rim * 0.25 * dayAmount;

    // Crater ambient occlusion: deeper excavation reads slightly darker.
    float ao = clamp(1.0 + vElevation * 1.5, 0.6, 1.0);
    color *= ao;

    gl_FragColor = vec4(color, 1.0);
  }
`;
