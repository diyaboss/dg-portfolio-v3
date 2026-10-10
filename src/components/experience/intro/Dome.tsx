"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CALLOUT_COUNT } from "@/components/site/BlockCallouts";
import { domRegistry } from "@/lib/dom-registry";
import { easeInOutCubic, range, rng } from "@/lib/math";
import { live } from "@/lib/store";
import { FOG, PALETTE, TEXNOISE } from "@/shaders/chunks";
import { shared } from "../shared";

const R = 4.2; // outer radius of the dome
const DEPTH = 0.62;
const GAP = 0.085;
const TUNNEL_ANGLE = -0.42; // radians around Y — entrance faces camera-right
export const DOME_CORE = new THREE.Vector3(0, 1.5, 0);

type Block = {
  matrix: THREE.Matrix4;
  dir: THREE.Vector3;
  rand: [number, number, number, number];
  info: [number, number, number, number];
};

function buildBlocks(): Block[] {
  const rand = rng(7);
  const blocks: Block[] = [];
  const rows = 7;
  const dPhi = (Math.PI / 2) * 0.9 / rows;
  const basis = new THREE.Matrix4();
  const scale = new THREE.Matrix4();

  const push = (pos: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, size: THREE.Vector3, dir: THREE.Vector3, h: number, tunnel: number) => {
    basis.makeBasis(x, y, z).setPosition(pos);
    scale.makeScale(size.x, size.y, size.z);
    blocks.push({
      matrix: basis.clone().multiply(scale),
      dir: dir.clone().normalize(),
      rand: [rand(), rand(), rand(), rand()],
      info: [h, tunnel, 0.6 + rand() * 0.4, blocks.length],
    });
  };

  for (let k = 0; k < rows; k++) {
    const phi = (k + 0.5) * dPhi;
    const rr = R * Math.cos(phi);
    const y = R * Math.sin(phi) - DEPTH * 0.5 * Math.sin(phi);
    const n = Math.max(4, Math.round((Math.PI * 2 * rr) / 1.3));
    const len = (Math.PI * 2 * rr) / n - GAP;
    const h = R * dPhi - GAP;
    const offset = (k % 2) * (Math.PI / n);
    for (let i = 0; i < n; i++) {
      const theta = (i / n) * Math.PI * 2 + offset;
      let dTheta = Math.abs(((theta - TUNNEL_ANGLE + Math.PI) % (Math.PI * 2)) - Math.PI);
      if (dTheta > Math.PI) dTheta = Math.PI * 2 - dTheta;
      if (k < 2 && dTheta < 0.36) continue; // doorway
      const out = new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta));
      const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
      // Right-handed basis (x × y = z): instance matrices with a negative
      // determinant would render the blocks inside-out.
      const up = new THREE.Vector3().crossVectors(out, tangent);
      const pos = new THREE.Vector3(Math.cos(theta) * (rr - DEPTH * 0.5 * Math.cos(phi)), y, Math.sin(theta) * (rr - DEPTH * 0.5 * Math.cos(phi)));
      push(pos, tangent, up, out, new THREE.Vector3(len, h, DEPTH), out, k / rows, 0);
    }
  }

  // Entrance tunnel: three arches of five blocks.
  const dir = new THREE.Vector3(Math.cos(TUNNEL_ANGLE), 0, Math.sin(TUNNEL_ANGLE));
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const tr = 1.45;
  for (let a = 0; a < 3; a++) {
    const along = R - 0.55 + a * 0.82;
    const segs = 5;
    for (let s = 0; s < segs; s++) {
      const ang = ((s + 0.5) / segs) * Math.PI;
      const local = new THREE.Vector3()
        .addScaledVector(side, Math.cos(ang) * (tr - DEPTH * 0.5))
        .add(new THREE.Vector3(0, Math.sin(ang) * (tr - DEPTH * 0.5), 0));
      const pos = local.clone().addScaledVector(dir, along);
      const out = new THREE.Vector3().addScaledVector(side, Math.cos(ang)).add(new THREE.Vector3(0, Math.sin(ang), 0)).normalize();
      const tang = new THREE.Vector3().crossVectors(dir, out).normalize();
      const len = (Math.PI * tr) / segs - GAP;
      push(pos, tang, dir.clone(), out, new THREE.Vector3(len, 0.82 - GAP, DEPTH), out.clone().add(dir.clone().multiplyScalar(0.8)), 0.05, 1);
    }
  }
  return blocks;
}

const vertexShader = /* glsl */ `
attribute vec4 aRand;
attribute vec4 aInfo;
attribute vec3 aDir;
uniform float uExplode;
uniform float uTime;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec4 vInfo;
varying float vVisible;
uniform float uBuild;

vec3 rotateAxis(vec3 v, vec3 axis, float a){
  float s = sin(a), c = cos(a);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

void main(){
  vLocal = position;
  vInfo = aInfo;
  float e = uExplode * (0.35 + aRand.x * 0.9);
  // Subtle breathing even when assembled.
  e += 0.012 * sin(uTime * 0.8 + aRand.y * 6.28);
  vec3 axis = normalize(aRand.yzw - 0.5 + 0.001);
  float ang = e * (aRand.y - 0.5) * 2.4;
  vec3 p = rotateAxis(position, axis, ang);
  vec3 n = rotateAxis(normal, axis, ang);

  vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
  world.xyz += aDir * e * (2.2 + aRand.z * 3.8) + vec3(0.0, 1.0, 0.0) * e * aRand.w * 2.4;

  // Build-up order: bottom rows first, small random jitter.
  vVisible = step(aInfo.x * 0.75 + aRand.x * 0.25, uBuild * 1.05);

  vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
${TEXNOISE}
${PALETTE}
${FOG}
uniform float uWire;
uniform float uSolid;
uniform float uGlow;
uniform float uSeam;
uniform vec3 uCore;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec4 vInfo;
varying float vVisible;

void main(){
  if (vVisible < 0.5) discard;
  vec3 d = 0.5 - abs(vLocal);
  float mn = min(d.x, min(d.y, d.z));
  float mx = max(d.x, max(d.y, d.z));
  float mid = d.x + d.y + d.z - mn - mx;
  float edge = 1.0 - smoothstep(0.012, 0.06, mid);

  // Dithered fade of the faces during the intro build.
  float dither = hash12(gl_FragCoord.xy);
  bool face = dither < uSolid;
  if (!face && edge < 0.5) discard;

  vec3 N = normalize(vNormalW);
  float grain = n3(vLocal * 3.1 + vInfo.w * 1.7);
  float pits = n3(vLocal * 11.0 + vInfo.w) ;
  vec3 albedo = mix(C_ASH * 0.9, C_BONE * 0.3, 0.35 + 0.25 * grain);
  albedo *= 0.85 + 0.15 * pits;
  // Frost on upward faces.
  albedo = mix(albedo, C_BONE * 0.36, smoothstep(0.55, 0.95, N.y) * 0.6);

  vec3 L = normalize(vec3(-0.55, 0.62, 0.35));
  float diff = max(dot(N, L), 0.0);
  // Key + soft camera-side fill so faces away from the key stay readable.
  vec3 Vf = normalize(cameraPosition - vWorld);
  float fill = max(dot(N, Vf), 0.0);
  vec3 col = albedo * (C_BONE * 1.2 * diff + C_BONE * 0.22 * fill + (C_WINE * 0.3 + vec3(0.03, 0.028, 0.03)) * (N.y * 0.5 + 0.5));

  vec3 toCore = uCore - vWorld;
  float dc = length(toCore);
  float facing = max(dot(N, toCore / dc), 0.0);
  vec3 coreCol = mix(C_HOT, C_BONE, 0.32);
  col += albedo * coreCol * facing * 4.0 / (1.0 + dc * dc * 0.45) * uGlow;

  // Light bleeding through the seams.
  float seam = edge * uSeam * vInfo.z;
  col += coreCol * seam * (1.6 + 3.0 / (1.0 + dc * 0.5)) * uGlow;

  // Wireframe draw-in.
  col = mix(col, C_BONE * 2.6, edge * uWire * (face ? 0.6 : 1.0));

  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += C_BONE * fres * 0.06;

  col = applyFog(col, length(cameraPosition - vWorld));
  gl_FragColor = vec4(col, 1.0);
}
`;

const coreVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const coreFragment = /* glsl */ `
${PALETTE}
uniform float uGlow;
varying vec3 vN;
varying vec3 vV;
void main(){
  // Soft volumetric falloff: bright centre, invisible silhouette.
  float f = max(dot(normalize(vN), normalize(vV)), 0.0);
  float g = pow(f, 3.5);
  vec3 col = mix(C_HOT * 1.4, C_BONE * 2.0, g) * g * uGlow;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Dome({ origin }: { origin: THREE.Vector3 }) {
  const { camera, size } = useThree();
  const blocks = useMemo(buildBlocks, []);

  const geometry = useMemo(() => {
    const g = new RoundedBoxGeometry(1, 1, 1, 2, 0.09);
    const n = blocks.length;
    const rand = new Float32Array(n * 4);
    const info = new Float32Array(n * 4);
    const dir = new Float32Array(n * 3);
    blocks.forEach((b, i) => {
      rand.set(b.rand, i * 4);
      info.set(b.info, i * 4);
      dir.set([b.dir.x, b.dir.y, b.dir.z], i * 3);
    });
    g.setAttribute("aRand", new THREE.InstancedBufferAttribute(rand, 4));
    g.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
    g.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3));
    return g;
  }, [blocks]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...shared,
          uExplode: { value: 0 },
          uWire: { value: 0 },
          uSolid: { value: 0 },
          uGlow: { value: 0 },
          uSeam: { value: 1 },
          uBuild: { value: 0 },
          uCore: { value: DOME_CORE.clone().add(origin) },
        },
      }),
    [origin],
  );

  const coreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coreVertex,
        fragmentShader: coreFragment,
        uniforms: { uGlow: { value: 0 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(2.2, 40, 24), []);

  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, blocks.length);
    blocks.forEach((b, i) => m.setMatrixAt(i, b.matrix));
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [geometry, material, blocks]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      mesh.dispose();
    },
    [geometry, material, coreGeometry, coreMaterial, mesh],
  );

  // Blocks that carry the numbered callouts.
  const calloutBlocks = useMemo(() => {
    const picks = [9, 22, 31, 40, 47].map((i) => Math.min(i, blocks.length - 1));
    return picks.slice(0, CALLOUT_COUNT);
  }, [blocks]);

  const tmp = useMemo(
    () => ({ v: new THREE.Vector3(), pos: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }),
    [],
  );

  useFrame(() => {
    const p = live.progress.intro;
    const explode = easeInOutCubic(range(p, 0.22, 0.8)) * 1.0 + range(p, 0.8, 1.2) * 0.6;
    const u = material.uniforms;
    u.uExplode.value = explode;
    u.uWire.value = live.intro.wire * (1 - live.intro.terrain * 0.9);
    u.uSolid.value = live.intro.terrain > 0 ? Math.min(1, live.intro.terrain * 2.2) : 0;
    u.uBuild.value = live.intro.wire > 0 ? Math.min(1, live.intro.wire * 1.4) : 0;
    const glow = live.intro.glow * (1 + explode * 0.12);
    u.uGlow.value = glow;
    coreMaterial.uniforms.uGlow.value = glow * (1 - explode * 0.75) * (0.9 + 0.1 * Math.sin(live.time * 2.1));

    // Numbered callouts riding on blocks.
    const els = domRegistry.blockCallouts;
    const path = domRegistry.blockPath;
    if (!els.length || p < 0.2 || p > 0.85) return;
    const pts: string[] = [];
    calloutBlocks.forEach((bi, i) => {
      const b = blocks[bi];
      b.matrix.decompose(tmp.pos, tmp.q, tmp.s);
      const e = explode * (0.35 + b.rand[0] * 0.9);
      tmp.v
        .copy(tmp.pos)
        .addScaledVector(b.dir, e * (2.2 + b.rand[2] * 3.8))
        .add(origin);
      tmp.v.y += e * b.rand[3] * 2.4;
      tmp.v.project(camera);
      const x = (tmp.v.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.v.y * 0.5 + 0.5) * size.height;
      const el = els[i];
      if (el) {
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 7).toFixed(1)}px, 0)`;
        const num = el.querySelector("[data-num]");
        if (num && num.textContent !== String(b.info[3])) num.textContent = String(b.info[3]);
      }
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    path?.setAttribute("points", pts.join(" "));
  });

  return (
    <group>
      <primitive object={mesh} />
      <mesh geometry={coreGeometry} material={coreMaterial} position={DOME_CORE} />
    </group>
  );
}
