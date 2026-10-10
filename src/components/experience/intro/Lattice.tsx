"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { rng } from "@/lib/math";
import { live } from "@/lib/store";
import { PALETTE } from "@/shaders/chunks";
import { createDigitAtlas } from "../textures";

/**
 * Survey lattice: a sparse triangulated wire network with numbered vertices
 * that draws itself around the dome during the intro, then dissolves as the
 * terrain materialises.
 */
function buildLattice() {
  const rand = rng(21);
  const cell = 3.2;
  const half = 9;
  const verts: THREE.Vector3[] = [];
  const index = (i: number, j: number) => (i + half) * (half * 2 + 1) + (j + half);
  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      const lift = rand() < 0.22 ? 0.8 + rand() * 2.6 : rand() * 0.25;
      verts.push(new THREE.Vector3(i * cell + (rand() - 0.5) * 0.6, lift, j * cell + (rand() - 0.5) * 0.6));
    }
  }
  const seg: number[] = [];
  const delay: number[] = [];
  const along: number[] = [];
  const pushSeg = (a: THREE.Vector3, b: THREE.Vector3) => {
    const r = Math.min(a.length(), b.length());
    if (r > 30) return;
    const d = r / 30 + rand() * 0.25;
    seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
    delay.push(d, d);
    along.push(0, 1);
  };
  for (let i = -half; i < half; i++) {
    for (let j = -half; j < half; j++) {
      const a = verts[index(i, j)];
      const b = verts[index(i + 1, j)];
      const c = verts[index(i, j + 1)];
      const d = verts[index(i + 1, j + 1)];
      if (rand() < 0.5) pushSeg(a, b);
      if (rand() < 0.5) pushSeg(a, c);
      if (rand() < 0.42) pushSeg(rand() < 0.5 ? a : b, rand() < 0.5 ? d : c);
      // Vertical struts make it read as 3D boxes rather than a flat grid.
      if (a.y > 0.6) pushSeg(a, new THREE.Vector3(a.x, 0, a.z));
    }
  }
  const labels: number[] = [];
  const labelNum: number[] = [];
  const labelDelay: number[] = [];
  verts.forEach((v) => {
    if (v.length() < 28 && rand() < 0.3) {
      labels.push(v.x + 0.15, v.y + 0.2, v.z);
      labelNum.push(Math.floor(rand() * 100));
      labelDelay.push(v.length() / 30 + 0.1);
    }
  });
  return { seg, delay, along, labels, labelNum, labelDelay };
}

const lineVertex = /* glsl */ `
attribute float aDelay;
attribute float aAlong;
varying float vAlong;
varying float vDelay;
varying float vDist;
void main(){
  vAlong = aAlong;
  vDelay = aDelay;
  vDist = length(position.xz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const lineFragment = /* glsl */ `
${PALETTE}
uniform float uGrow;
uniform float uFade;
varying float vAlong;
varying float vDelay;
varying float vDist;
void main(){
  float g = clamp((uGrow - vDelay) * 3.5, 0.0, 1.0);
  if (vAlong > g) discard;
  float a = (1.0 - smoothstep(18.0, 30.0, vDist)) * uFade;
  gl_FragColor = vec4(C_BONE * 1.6 * a, 1.0);
}
`;

const labelVertex = /* glsl */ `
attribute float aNum;
attribute float aDelay;
uniform float uGrow;
uniform float uScale;
varying float vNum;
varying float vOn;
void main(){
  vNum = aNum;
  vOn = step(aDelay, uGrow);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const labelFragment = /* glsl */ `
${PALETTE}
uniform sampler2D uAtlas;
uniform float uFade;
varying float vNum;
varying float vOn;
void main(){
  if (vOn < 0.5) discard;
  vec2 cell = vec2(mod(vNum, 10.0), floor(vNum / 10.0));
  // CanvasTexture is flipped on upload: canvas row 0 is at v = 1.
  vec2 uv = vec2((cell.x + gl_PointCoord.x) / 10.0, 1.0 - (cell.y + gl_PointCoord.y) / 10.0);
  float a = texture2D(uAtlas, uv).a;
  if (a < 0.1) discard;
  gl_FragColor = vec4(C_BONE * 1.4 * a * uFade, 1.0);
}
`;

export function Lattice() {
  const data = useMemo(buildLattice, []);
  const atlas = useMemo(createDigitAtlas, []);

  const { lines, labels, lineMat, labelMat } = useMemo(() => {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(data.seg, 3));
    lg.setAttribute("aDelay", new THREE.Float32BufferAttribute(data.delay, 1));
    lg.setAttribute("aAlong", new THREE.Float32BufferAttribute(data.along, 1));
    const lineMat = new THREE.ShaderMaterial({
      vertexShader: lineVertex,
      fragmentShader: lineFragment,
      uniforms: { uGrow: { value: 0 }, uFade: { value: 1 } },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(data.labels, 3));
    pg.setAttribute("aNum", new THREE.Float32BufferAttribute(data.labelNum, 1));
    pg.setAttribute("aDelay", new THREE.Float32BufferAttribute(data.labelDelay, 1));
    const labelMat = new THREE.ShaderMaterial({
      vertexShader: labelVertex,
      fragmentShader: labelFragment,
      uniforms: {
        uGrow: { value: 0 },
        uFade: { value: 1 },
        uAtlas: { value: atlas },
        uScale: { value: 300 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    return {
      lines: new THREE.LineSegments(lg, lineMat),
      labels: new THREE.Points(pg, labelMat),
      lineMat,
      labelMat,
    };
  }, [data, atlas]);

  useEffect(
    () => () => {
      lines.geometry.dispose();
      labels.geometry.dispose();
      lineMat.dispose();
      labelMat.dispose();
      atlas.dispose();
    },
    [lines, labels, lineMat, labelMat, atlas],
  );

  useFrame((state) => {
    const grow = live.intro.lattice * 1.5;
    const fade = Math.max(0, 1 - live.intro.terrain * 1.6);
    lineMat.uniforms.uGrow.value = grow;
    lineMat.uniforms.uFade.value = fade;
    labelMat.uniforms.uGrow.value = grow;
    labelMat.uniforms.uFade.value = fade;
    labelMat.uniforms.uScale.value = 9 * state.size.height * 0.05;
    const visible = fade > 0.001 && live.intro.lattice > 0;
    lines.visible = labels.visible = visible;
  });

  return (
    <group>
      <primitive object={lines} />
      <primitive object={labels} />
    </group>
  );
}
