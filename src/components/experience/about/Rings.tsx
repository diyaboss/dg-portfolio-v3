"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { skillGroups } from "@/content";
import { damp, easeOutCubic, range, rng } from "@/lib/math";
import { audio } from "@/lib/audio";
import { live } from "@/lib/store";
import { FOG, PALETTE, TEXNOISE } from "@/shaders/chunks";
import { shared } from "../shared";

type RingSpec = {
  radius: number;
  width: number;
  depth: number;
  segments: number;
  missing: Set<number>;
  tilt: THREE.Vector2;
  speed: number;
};

function ringSpecs(count: number): RingSpec[] {
  const r = rng(404);
  const specs: RingSpec[] = [];
  let radius = 1.7;
  for (let i = 0; i < count; i++) {
    const width = 0.42 + i * 0.07;
    const segments = 4 + i * 2;
    const missing = new Set<number>();
    for (let s = 0; s < segments; s++) if (r() < 0.16 && i < count - 1) missing.add(s);
    specs.push({
      radius: radius + width / 2,
      width,
      depth: 0.38 + i * 0.05,
      segments,
      missing,
      tilt: new THREE.Vector2((r() - 0.5) * 0.9, (r() - 0.5) * 0.9),
      speed: (r() < 0.5 ? -1 : 1) * (0.05 + r() * 0.12),
    });
    radius += width + 0.55 + i * 0.12;
  }
  return specs;
}

function segmentGeometry(spec: RingSpec) {
  const gap = 0.05;
  const span = (Math.PI * 2) / spec.segments - gap;
  const ro = spec.radius + spec.width / 2;
  const ri = spec.radius - spec.width / 2;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, ro, -span / 2, span / 2, false);
  shape.absarc(0, 0, ri, span / 2, -span / 2, true);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: spec.depth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
    curveSegments: 18,
  });
  g.translate(0, 0, -spec.depth / 2);
  return g;
}

const ringVertex = /* glsl */ `
attribute vec4 aRand;
uniform float uAssemble;
uniform float uTime;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec4 vRand;
vec3 rotateAxis(vec3 v, vec3 axis, float a){
  float s = sin(a), c = cos(a);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}
void main(){
  vLocal = position;
  vRand = aRand;
  float scatter = 1.0 - uAssemble;
  vec3 axis = normalize(aRand.xyz - 0.5 + 0.001);
  float ang = scatter * (aRand.w - 0.5) * 3.0;
  vec3 p = rotateAxis(position, axis, ang);
  vec3 n = rotateAxis(normal, axis, ang);
  vec4 w = instanceMatrix * vec4(p, 1.0);
  vec3 radial = normalize(vec3(w.xy, 0.0) + 0.0001);
  w.xyz += radial * scatter * (1.5 + aRand.x * 4.0) + vec3(0.0, 0.0, (aRand.y - 0.5) * 9.0 * scatter);
  w.xyz += radial * 0.03 * sin(uTime * 1.3 + aRand.z * 6.28);
  vec4 world = modelMatrix * w;
  vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const ringFragment = /* glsl */ `
${TEXNOISE}
${PALETTE}
${FOG}
uniform float uHover;
uniform float uEnergy;
uniform vec3 uCore;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec4 vRand;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float grain = n3(vLocal * 2.4 + vRand.x * 10.0);
  float pits = n3(vLocal * 9.0);
  vec3 albedo = mix(C_ASH * 0.8, C_BONE * 0.38, 0.4 + 0.3 * grain) * (0.85 + 0.15 * pits);

  vec3 L = normalize(vec3(-0.5, 0.6, 0.65));
  float diff = max(dot(N, L), 0.0);
  vec3 col = albedo * (C_BONE * 1.0 * diff + C_WINE * 0.5 * (N.y * 0.5 + 0.5) + 0.02);

  // Energy from the core lights inner edges.
  vec3 toCore = uCore - vWorld;
  float dc = length(toCore);
  float facing = max(dot(N, toCore / dc), 0.0);
  vec3 energy = mix(C_HOT, C_BONE, 0.3);
  col += albedo * energy * facing * (2.0 + 6.0 * uHover) / (1.0 + dc * 0.35) * uEnergy;

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += energy * fres * (0.15 + uHover * 1.4) * uEnergy;
  col += C_BONE * fres * 0.08;

  col = applyFog(col, length(cameraPosition - vWorld));
  gl_FragColor = vec4(col, 1.0);
}
`;

const shellVertex = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vW;
void main(){
  vPos = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const shellFragment = /* glsl */ `
${TEXNOISE}
${PALETTE}
uniform float uTime;
uniform float uEnergy;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vW;
// Cellular crackle: thin bright lines where two noise ridges meet.
float crackle(vec3 p){
  vec2 uv = vec2(atan(p.z, p.x) * 0.159, p.y * 0.08);
  float r1 = texture2D(uNoise, uv * 1.0 + p.z * 0.01).b;
  float r2 = texture2D(uNoise, uv * 2.3 + 0.37).b;
  return pow(max(r1, r2 * 0.92), 16.0);
}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float fres = 1.0 - abs(dot(normalize(vN), V));
  vec3 p = normalize(vPos) * 2.4 + vec3(0.0, 0.0, uTime * 0.25);
  float c = crackle(p) + crackle(p * 1.8 + 3.0) * 0.6;
  float flicker = 0.75 + 0.25 * (texture2D(uNoise, vec2(uTime * 0.37, vPos.y * 0.05)).a * 2.0 - 1.0);
  vec3 col = mix(C_HOT, C_BONE, 0.45) * (c * 1.6 + fres * fres * 0.35) * uEnergy * flicker;
  gl_FragColor = vec4(col, 1.0);
}
`;

const coreVertex = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uEnergy;
uniform float uSize;
varying float vA;
void main(){
  float r = pow(aSeed.w, 2.0) * 1.1 * (0.6 + 0.4 * uEnergy);
  float t = uTime * (0.3 + aSeed.x * 0.6);
  vec3 dir = normalize(position);
  vec3 p = dir * r + vec3(sin(t + aSeed.y * 6.28), cos(t * 1.3 + aSeed.z * 6.28), sin(t * 0.7)) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.5 + aSeed.y) / -mv.z;
  vA = (1.0 - aSeed.w * 0.6) * uEnergy;
  gl_Position = projectionMatrix * mv;
}
`;
const coreFragment = /* glsl */ `
${PALETTE}
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(mix(C_HOT * 2.0, C_BONE * 3.0, a) * a * vA, 1.0);
}
`;

export function Rings() {
  const group = useRef<THREE.Group>(null);
  const specs = useMemo(() => ringSpecs(skillGroups.length), []);
  const hoverAmt = useRef(specs.map(() => 0));
  const lastAssemble = useRef(0);

  const rings = useMemo(() => {
    const r = rng(77);
    return specs.map((spec) => {
      const geometry = segmentGeometry(spec);
      const count = spec.segments - spec.missing.size;
      const rand = new Float32Array(count * 4);
      for (let i = 0; i < count * 4; i++) rand[i] = r();
      geometry.setAttribute("aRand", new THREE.InstancedBufferAttribute(rand, 4));
      const material = new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          ...shared,
          uAssemble: { value: 0 },
          uHover: { value: 0 },
          uEnergy: { value: 0 },
          uCore: { value: new THREE.Vector3() },
        },
      });
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      const m = new THREE.Matrix4();
      let k = 0;
      for (let s = 0; s < spec.segments; s++) {
        if (spec.missing.has(s)) continue;
        m.makeRotationZ((s / spec.segments) * Math.PI * 2);
        mesh.setMatrixAt(k++, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      const pivot = new THREE.Group();
      pivot.add(mesh);
      return { spec, mesh, material, geometry, pivot };
    });
  }, [specs]);

  const outer = specs[specs.length - 1];
  const shell = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(outer.radius - outer.width * 0.9, 5);
    const material = new THREE.ShaderMaterial({
      vertexShader: shellVertex,
      fragmentShader: shellFragment,
      uniforms: { uTime: shared.uTime, uNoise: shared.uNoise, uEnergy: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }, [outer]);

  const core = useMemo(() => {
    const n = live.quality.low ? 1200 : 2600;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection();
      pos.set([v.x, v.y, v.z], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const material = new THREE.ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      uniforms: { uTime: shared.uTime, uEnergy: { value: 0 }, uSize: { value: 40 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(g, material);
    p.frustumCulled = false;
    return p;
  }, []);

  useEffect(
    () => () => {
      rings.forEach((r) => {
        r.geometry.dispose();
        r.material.dispose();
        r.mesh.dispose();
      });
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
    },
    [rings, shell, core],
  );

  const coreWorld = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const g = group.current;
    if (!g) return;
    g.visible = live.view === "about";
    if (!g.visible) return;
    const t = live.progress.about;
    const assemble = easeOutCubic(range(t, -0.05, 0.55));
    const energy = range(t, 0.15, 0.6) * 0.7 * (1 + range(t, 0.8, 1) * 2.2);
    // A stone thud as each ring locks into place (inner rings first).
    const n = rings.length;
    for (let k = 0; k < n; k++) {
      const th = (k + 1) / (n + 1);
      const jumped = Math.abs(assemble - lastAssemble.current) > 0.25;
      if (!jumped && lastAssemble.current < th && assemble >= th) audio.thud(1.25 - k * 0.12);
    }
    lastAssemble.current = assemble;
    g.getWorldPosition(coreWorld);
    const time = shared.uTime.value;

    rings.forEach((r, i) => {
      const hov = live.skills.hovered === i ? 1 : 0;
      hoverAmt.current[i] = damp(hoverAmt.current[i], hov, 6, dt);
      const u = r.material.uniforms;
      u.uAssemble.value = assemble;
      u.uEnergy.value = energy;
      u.uHover.value = hoverAmt.current[i];
      u.uCore.value.copy(coreWorld);
      const spin = time * r.spec.speed + t * (i % 2 ? -1.6 : 1.6);
      r.pivot.rotation.set(
        r.spec.tilt.x * (1 - assemble * 0.7) + Math.sin(time * 0.2 + i) * 0.06,
        r.spec.tilt.y * (1 - assemble * 0.7) + Math.cos(time * 0.17 + i) * 0.06,
        spin,
      );
    });

    // Keep the shell subdued while the HUD text is up; flare for the fly-through.
    (shell.material as THREE.ShaderMaterial).uniforms.uEnergy.value = range(t, 0.3, 0.7) * 0.14 + range(t, 0.82, 1) * 0.9;
    shell.rotation.y = time * 0.05;
    const cm = core.material as THREE.ShaderMaterial;
    cm.uniforms.uEnergy.value = Math.max(0.25, energy);
    cm.uniforms.uSize.value = 26 * state.viewport.dpr * (state.size.height / 900);
  });

  return (
    <group ref={group}>
      {rings.map((r, i) => (
        <primitive key={i} object={r.pivot} />
      ))}
      <primitive object={shell} />
      <primitive object={core} />
    </group>
  );
}
