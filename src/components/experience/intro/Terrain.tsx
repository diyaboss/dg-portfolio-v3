"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { fbm3, valueNoise3 } from "@/lib/noise";
import { live } from "@/lib/store";
import { FOG, PALETTE, TEXNOISE } from "@/shaders/chunks";
import { shared } from "../shared";

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Bakes the static landscape once on the CPU (heights + normals). */
function buildTerrain(segments: number) {
  const g = new THREE.PlaneGeometry(300, 300, segments, segments);
  g.rotateX(-Math.PI / 2);
  const n1 = fbm3(valueNoise3(11), 5);
  const n2 = valueNoise3(23);
  const n3 = fbm3(valueNoise3(37), 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const plateau = -3.6 * smooth(6, 30, r);
    const drift = 0.55 * Math.exp(-((r - 6.2) ** 2) / 5);
    const detail = n1(x * 0.075, 1.7, z * 0.075) * (0.35 + 2.05 * smooth(5, 24, r));
    const ridge = (1 - Math.abs(n2(x * 0.02, 4.2, z * 0.02))) ** 2;
    const mountains = (n3(x * 0.022, 9.1, z * 0.022) * 0.6 + ridge) * 24 * smooth(34, 120, r);
    pos.setY(i, plateau + drift + detail + mountains);
  }
  g.computeVertexNormals();
  return g;
}

const vertexShader = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
void main(){
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vHeight = position.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
${TEXNOISE}
${PALETTE}
${FOG}
uniform float uTime;
uniform float uReveal;
uniform float uGlow;
uniform vec3 uOrigin;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;

void main(){
  vec3 lp = vWorld - uOrigin;
  float r = length(lp.xz);

  // Dissolve-in from the dome outward with a hot edge (intro only).
  float rim = 0.0;
  if (uReveal < 1.0) {
    float edge = r - uReveal * 230.0 + nfbm(lp.xz * 0.012 + uTime * 0.01) * 10.0;
    if (edge > 0.0) discard;
    rim = (1.0 - smoothstep(0.0, 2.5, -edge)) * (1.0 - uReveal);
  }

  // Micro relief from the noise texture: grain, pits and wind streaks.
  vec4 a = nz(lp.xz * 0.045);
  vec4 b = nz(lp.xz * 0.31);
  float streak = nz(vec2(lp.x * 0.02, lp.z * 0.22)).g * 2.0 - 1.0;
  float n1 = a.r * 2.0 - 1.0;
  float n2 = b.g * 2.0 - 1.0;
  vec3 N = normalize(vNormal + vec3(n1 * 0.25 + n2 * 0.09, 0.0, n2 * 0.09 + streak * 0.07));

  float slope = N.y;
  float frost = smoothstep(0.74, 0.94, slope + n1 * 0.16 + streak * 0.05);
  vec3 rock = C_ASH * (0.3 + 0.18 * n2);
  vec3 dust = mix(C_BONE * 0.24, C_MAUVE * 0.2, 0.12 + 0.1 * n1);
  vec3 albedo = mix(rock, dust, frost);
  albedo *= 0.88 + 0.24 * b.a * frost; // sparkle grain

  vec3 L = normalize(vec3(-0.55, 0.62, 0.35));
  float diff = max(dot(N, L), 0.0);
  float wrap = dot(N, L) * 0.5 + 0.5;
  vec3 col = albedo * (C_BONE * 1.15 * diff + (C_WINE * 0.28 + vec3(0.025, 0.024, 0.026)) * wrap);

  // Ember light spilling from the dome onto the plateau.
  vec3 toCore = vec3(0.0, 1.5, 0.0) - lp;
  float d2 = dot(toCore, toCore);
  float coreLight = max(dot(N, normalize(toCore)), 0.0) * 7.0 / (1.0 + d2 * 0.28);
  col += albedo * mix(C_HOT, C_BONE, 0.3) * coreLight * uGlow;

  vec3 V = normalize(cameraPosition - vWorld);
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 36.0) * frost * step(0.82, b.a);
  col += C_BONE * spec * 0.5;

  col += mix(C_HOT, C_BONE, 0.2) * rim * 2.2;

  float mist = smoothstep(-1.0, -9.0, vHeight) * 0.7;
  col = mix(col, uFogColor * 1.5, mist);
  col = applyFog(col, length(cameraPosition - vWorld));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Terrain({ origin }: { origin: THREE.Vector3 }) {
  const segments = live.quality.low ? 180 : 260;
  const geometry = useMemo(() => buildTerrain(segments), [segments]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...shared,
          uReveal: { value: 0 },
          uGlow: { value: 0 },
          uOrigin: { value: origin.clone() },
        },
      }),
    [origin],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    material.uniforms.uReveal.value = live.intro.terrain;
    material.uniforms.uGlow.value = live.intro.glow;
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
