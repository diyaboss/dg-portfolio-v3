"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { socialLinks } from "@/content";
import { audio } from "@/lib/audio";
import { live } from "@/lib/store";
import { PALETTE } from "@/shaders/chunks";
import { shared } from "../shared";
import { sampleGlyphPoints } from "../textures";

/**
 * A bead-like particle sculpture that re-forms into the glyph of the
 * selected contact link: particles scatter into a cloud, then stream into
 * the new shape with a per-particle stagger.
 */
const vertex = /* glsl */ `
attribute vec3 aFrom;
attribute vec4 aSeed;
uniform float uMorph;
uniform float uTime;
uniform float uSize;
uniform float uForm;
varying float vShade;
varying float vHot;
void main(){
  float delay = aSeed.x * 0.45;
  float m = clamp((uMorph - delay) / 0.55, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 p = mix(aFrom, position, m);
  float burst = sin(m * 3.14159);
  vec3 dir = normalize(aSeed.yzw - 0.5 + 0.001);
  p += dir * burst * (0.6 + aSeed.y * 1.6);
  // Idle shimmer and the "unformed" cloud state.
  p += dir * (1.0 - uForm) * (1.5 + aSeed.z * 3.0);
  p += 0.025 * vec3(sin(uTime * 2.0 + aSeed.y * 30.0), cos(uTime * 1.7 + aSeed.z * 30.0), 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.75 + aSeed.w * 0.5) / -mv.z;
  vShade = 0.55 + 0.45 * aSeed.z;
  vHot = step(0.93, aSeed.y) * burst;
  gl_Position = projectionMatrix * mv;
}
`;
const fragment = /* glsl */ `
${PALETTE}
varying float vShade;
varying float vHot;
void main(){
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  // Shade each point as a tiny sphere lit from the halo above.
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
  float diff = max(dot(n, normalize(vec3(-0.3, 0.8, 0.5))), 0.0);
  vec3 base = mix(C_ASH * 1.4, C_BONE * 0.75, diff) * vShade;
  base += mix(C_HOT, C_BONE, 0.3) * vHot * 2.0;
  gl_FragColor = vec4(base, 1.0);
}
`;

export function Sculpture() {
  const group = useRef<THREE.Group>(null);
  const count = live.quality.low ? 3800 : 7500;
  const shapes = useMemo(() => socialLinks.map((s) => sampleGlyphPoints(s.glyph, count, 1.1)), [count]);
  const state = useRef({ index: 0, morph: 1 });

  const points = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) seed[i] = Math.random();
    g.setAttribute("position", new THREE.BufferAttribute(shapes[0].slice(), 3));
    g.setAttribute("aFrom", new THREE.BufferAttribute(shapes[0].slice(), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: shared.uTime,
        uMorph: { value: 1 },
        uSize: { value: 60 },
        uForm: { value: 0 },
      },
    });
    const p = new THREE.Points(g, material);
    p.frustumCulled = false;
    return p;
  }, [count, shapes]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points],
  );

  useFrame((s, delta) => {
    const g = group.current;
    if (!g) return;
    g.visible = live.view === "contact";
    if (!g.visible) return;
    const st = state.current;
    const target = live.contact.index % shapes.length;
    const geo = points.geometry;
    if (target !== st.index) {
      // Freeze the current blended positions (same easing as the shader)
      // as the new origin, so an interrupted morph continues smoothly.
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const from = geo.attributes.aFrom as THREE.BufferAttribute;
      const seed = geo.attributes.aSeed as THREE.BufferAttribute;
      const pa = pos.array as Float32Array;
      const fa = from.array as Float32Array;
      for (let i = 0; i < count; i++) {
        let m = Math.min(1, Math.max(0, (st.morph - seed.getX(i) * 0.45) / 0.55));
        m = m * m * (3 - 2 * m);
        for (let k = 0; k < 3; k++) fa[i * 3 + k] += (pa[i * 3 + k] - fa[i * 3 + k]) * m;
      }
      pa.set(shapes[target]);
      pos.needsUpdate = true;
      from.needsUpdate = true;
      st.index = target;
      st.morph = 0;
      audio.sparkle(1.2);
    }
    st.morph = Math.min(1, st.morph + Math.min(delta, 1 / 20) / 1.6);
    const u = (points.material as THREE.ShaderMaterial).uniforms;
    u.uMorph.value = st.morph;
    const form = Math.min(1, Math.max(0, (live.progress.contact - 0.1) / 0.45));
    u.uForm.value = form * form * (3 - 2 * form);
    u.uSize.value = 52 * s.viewport.dpr * (s.size.height / 900);
    g.rotation.y = Math.sin(shared.uTime.value * 0.35) * 0.55 + live.pointer.sx * 0.3;
  });

  return (
    <group ref={group} position={[0, 2.5, 0]}>
      <primitive object={points} />
    </group>
  );
}
