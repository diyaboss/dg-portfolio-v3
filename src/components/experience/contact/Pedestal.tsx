"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { range } from "@/lib/math";
import { live } from "@/lib/store";
import { FOG, PALETTE, TEXNOISE } from "@/shaders/chunks";
import { shared } from "../shared";

const STEPS = [2.7, 4.1, 5.7, 7.5, 9.6];

function profile() {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0.62)];
  const heights = [0.62, 0.34, 0.2, 0.1, 0.03, -0.06];
  STEPS.forEach((r, i) => {
    pts.push(new THREE.Vector2(r - 0.06, heights[i]));
    pts.push(new THREE.Vector2(r, heights[i] - 0.03));
    pts.push(new THREE.Vector2(r + 0.03, heights[i + 1] + 0.01));
    pts.push(new THREE.Vector2(r + 0.09, heights[i + 1]));
  });
  pts.push(new THREE.Vector2(40, -0.06));
  return pts;
}

const vertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vN;
void main(){
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const fragment = /* glsl */ `
${TEXNOISE}
${PALETTE}
${FOG}
uniform float uGlow;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vN;
float stepLine(float r, float s, float w){ return 1.0 - smoothstep(0.0, w, abs(r - s)); }
void main(){
  float r = length(vLocal.xz);
  vec3 N = normalize(vN);
  float grain = nfbm(vLocal.xz * 0.05);
  float cracks = smoothstep(0.93, 1.0, nz(vLocal.xz * 0.03).b);
  float pits = nz(vLocal.xz * 0.4).g * 2.0 - 1.0;
  vec3 albedo = mix(C_ASH * 0.85, C_BONE * 0.32, 0.45 + 0.3 * grain) * (0.9 + 0.1 * pits);
  albedo *= 1.0 - cracks * 0.35;

  vec3 L = normalize(vec3(-0.3, 0.9, 0.4));
  float diff = max(dot(N, L), 0.0);
  vec3 col = albedo * (C_BONE * 0.9 * diff + C_WINE * 0.45 + 0.02);

  // Overhead halo light pooling on the pedestal.
  float pool = exp(-r * r * 0.03);
  col += albedo * C_BONE * pool * 0.9 * uGlow;

  // Light lines at each step edge, brightest at the outer rim.
  float lines = 0.0;
  ${STEPS.map((s, i) => `lines += stepLine(r, ${s.toFixed(2)}, ${(0.05 + i * 0.01).toFixed(3)}) * ${(0.25 + i * 0.12).toFixed(2)};`).join("\n  ")}
  vec3 lineCol = mix(C_BONE, C_HOT, 0.25);
  col += lineCol * lines * 1.8 * uGlow;
  float rim = stepLine(r, ${STEPS[STEPS.length - 1].toFixed(2)}, 0.22);
  col += mix(C_HOT, C_BONE, 0.5) * rim * 1.4 * uGlow;

  col = applyFog(col, length(cameraPosition - vWorld));
  gl_FragColor = vec4(col, 1.0);
}
`;

const haloFragment = /* glsl */ `
${PALETTE}
uniform float uGlow;
varying vec3 vN;
void main(){
  gl_FragColor = vec4(mix(C_BONE * 4.0, C_HOT * 3.0, 0.15) * uGlow, 1.0);
}
`;

const glassFragment = /* glsl */ `
${PALETTE}
uniform float uGlow;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vN;
void main(){
  // Faint triangulated lattice on the enclosure.
  float a = atan(vLocal.z, vLocal.x) * 9.6 / 3.14159 * 4.0;
  vec2 g = vec2(a, vLocal.y * 1.6);
  vec2 skew = vec2(g.x + g.y * 0.5, g.y);
  vec2 f = fract(skew);
  float l1 = min(f.x, 1.0 - f.x);
  float l2 = min(f.y, 1.0 - f.y);
  float l3 = abs(f.x - f.y);
  float line = 1.0 - smoothstep(0.0, 0.03, min(min(l1, l2), l3 * 0.7));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
  float fade = smoothstep(-0.5, 2.0, vLocal.y) * (1.0 - smoothstep(6.0, 12.0, vLocal.y));
  vec3 col = C_BONE * (line * 0.05 + fres * 0.05) * fade * uGlow;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Pedestal() {
  const group = useRef<THREE.Group>(null);
  const { stone, halo, glass } = useMemo(() => {
    const lathe = new THREE.LatheGeometry(profile(), 160);
    const stoneMat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { ...shared, uGlow: { value: 1 } },
    });
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: haloFragment,
      uniforms: { uGlow: { value: 1 } },
    });
    const glassMat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: glassFragment,
      uniforms: { uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.13, 16, 160), haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 9.5;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(9.3, 9.3, 14, 96, 1, true), glassMat);
    glass.position.y = 6.5;
    return { stone: new THREE.Mesh(lathe, stoneMat), halo, glass };
  }, []);

  useEffect(
    () => () => {
      for (const m of [stone, halo, glass]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
    [stone, halo, glass],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = live.view === "contact";
    if (!g.visible) return;
    const glow = 0.35 + 0.65 * range(live.progress.contact, 0.0, 0.5);
    (stone.material as THREE.ShaderMaterial).uniforms.uGlow.value = glow;
    (halo.material as THREE.ShaderMaterial).uniforms.uGlow.value = glow;
    (glass.material as THREE.ShaderMaterial).uniforms.uGlow.value = range(live.progress.contact, 0.35, 0.7);
  });

  return (
    <group ref={group}>
      <primitive object={stone} />
      <primitive object={halo} />
      <primitive object={glass} />
    </group>
  );
}
