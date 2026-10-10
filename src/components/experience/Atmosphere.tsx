"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { live } from "@/lib/store";
import { PALETTE, TEXNOISE } from "@/shaders/chunks";
import { shared } from "./shared";

/**
 * Camera-locked sky sphere: a red-black mist with a luminous horizon band
 * and slowly drifting cloud structure. `uDots` adds the faint point grid
 * seen behind the project crystals.
 */
const skyVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}
`;
const skyFragment = /* glsl */ `
${TEXNOISE}
${PALETTE}
uniform float uTime;
uniform vec3 uFogColor;
uniform float uHorizon;
uniform float uDots;
uniform vec2 uResolution;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float band = exp(-abs(h - 0.02) * 7.0);
  float clouds = nfbm(d.xz / max(abs(h) + 0.25, 0.25) * 0.12 + uTime * 0.0015);
  vec3 col = uFogColor * (0.75 + 0.5 * smoothstep(0.3, -0.2, h));
  col += C_WINE * band * uHorizon * (0.3 + 0.3 * clouds);
  col += C_BONE * 0.018 * band * uHorizon * smoothstep(0.1, 0.6, clouds);
  col *= 0.85 + 0.25 * clouds;

  // Screen-space dot grid.
  vec2 g = gl_FragCoord.xy / (uResolution.y / 26.0);
  vec2 f = abs(fract(g) - 0.5);
  float grid = 1.0 - smoothstep(0.03, 0.07, max(f.x, f.y));
  col += C_BONE * grid * 0.05 * uDots;
  gl_FragColor = vec4(col, 1.0);
}
`;

const dustVertex = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uSize;
uniform vec3 uBox;
varying float vAlpha;
varying float vHot;
void main(){
  vec3 drift = vec3(0.35, -0.28, 0.12) * uTime * (0.4 + aSeed.w);
  vec3 swirl = vec3(sin(uTime * 0.3 + aSeed.x * 6.28), cos(uTime * 0.23 + aSeed.y * 6.28), 0.0) * 0.4;
  vec3 p = mod(position + drift + swirl - cameraPosition, uBox) - uBox * 0.5 + cameraPosition;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  gl_PointSize = min(uSize * (0.4 + aSeed.z) / max(dist, 0.5), 7.0);
  vAlpha = smoothstep(0.6, 3.0, dist) * (1.0 - smoothstep(14.0, 26.0, dist));
  vHot = step(0.86, aSeed.y);
  gl_Position = projectionMatrix * mv;
}
`;
const dustFragment = /* glsl */ `
${PALETTE}
uniform float uOpacity;
varying float vAlpha;
varying float vHot;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  vec3 col = mix(C_BONE * 0.9, C_HOT * 1.6, vHot);
  gl_FragColor = vec4(col * a * vAlpha * uOpacity, 1.0);
}
`;

export function Atmosphere() {
  const sky = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(50, 48, 24),
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: { ...shared, uHorizon: { value: 1 }, uDots: { value: 0 } },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    m.frustumCulled = false;
    m.renderOrder = -10;
    return m;
  }, []);

  const count = live.quality.low ? 450 : 1100;
  const dust = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos.set([Math.random() * 40, Math.random() * 40, Math.random() * 40], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const m = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: {
        uTime: shared.uTime,
        uSize: { value: 60 },
        uBox: { value: new THREE.Vector3(40, 40, 40) },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, [count]);

  useEffect(
    () => () => {
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
      dust.geometry.dispose();
      (dust.material as THREE.Material).dispose();
    },
    [sky, dust],
  );

  const smooth = useRef({ dots: 0, horizon: 1 });
  useFrame((state) => {
    const m = sky.material as THREE.ShaderMaterial;
    const view = live.view;
    const dotsTarget = view === "work" ? 1 : 0;
    const horizonTarget = view === "intro" ? 1 : view === "contact" ? 0.6 : 0.35;
    const k = 1 - Math.exp(-3 * live.dt);
    smooth.current.dots += (dotsTarget - smooth.current.dots) * k;
    smooth.current.horizon += (horizonTarget - smooth.current.horizon) * k;
    m.uniforms.uDots.value = smooth.current.dots;
    m.uniforms.uHorizon.value = smooth.current.horizon;
    const dm = dust.material as THREE.ShaderMaterial;
    dm.uniforms.uSize.value = 34 * state.viewport.dpr * (state.size.height / 900);
  });

  return (
    <>
      <primitive object={sky} />
      <primitive object={dust} />
    </>
  );
}
