"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { projects } from "@/content";
import { audio } from "@/lib/audio";
import { domRegistry } from "@/lib/dom-registry";
import { projectProgress } from "@/lib/driver";
import { clamp, damp } from "@/lib/math";
import { getUi, live } from "@/lib/store";
import { FOG, PALETTE, TEXNOISE } from "@/shaders/chunks";
import { shardPosition } from "../choreography";
import { SCENE_ORIGIN, shared } from "../shared";
import { createTitleTexture } from "../textures";
import { createCrystalGeometry } from "./crystalGeometry";

const vertexShader = /* glsl */ `
uniform sampler2D uNoise;
uniform float uDissolve;
uniform float uTime;
uniform vec3 uCamLocal;
varying vec3 vLocal;
varying vec3 vNormalL;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vViewL;
void main(){
  vec3 p = position;
  // Smear: facets stream downward and outward as the crystal dissolves.
  float n = texture2D(uNoise, p.xy * 0.22 + p.z * 0.13 + 0.5).r * 2.0 - 1.0;
  float d = uDissolve * uDissolve;
  p += normal * d * (0.6 + n * 0.9);
  p.y -= d * (1.5 + 2.5 * (n * 0.5 + 0.5)) * (0.5 + 0.5 * sign(n));
  vLocal = position;
  vNormalL = normal;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vViewL = normalize(uCamLocal - position);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const fragmentShader = /* glsl */ `
${TEXNOISE}
${PALETTE}
${FOG}
uniform sampler2D uTitle;
uniform float uHover;
uniform float uDissolve;
uniform float uTime;
uniform float uSeed;
varying vec3 vLocal;
varying vec3 vNormalL;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vViewL;

vec3 thinFilm(float t){
  // Iridescence restricted to the identity palette: ember → mauve → bone.
  vec3 a = vec3(0.55, 0.32, 0.42);
  vec3 b = vec3(0.45, 0.30, 0.35);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.0, 0.22, 0.42);
  return a + b * cos(6.28318 * (c * t + d));
}

void main(){
  float dn = n3(vLocal * 2.2 + uSeed);
  if (uDissolve > 0.0 && dn * 0.5 + 0.5 < uDissolve * 1.15) discard;
  float burn = uDissolve > 0.0 ? 1.0 - smoothstep(0.0, 0.08, dn * 0.5 + 0.5 - uDissolve * 1.15) : 0.0;

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 2.6);

  // Fake refraction: look "into" the crystal along the local view ray,
  // offset per facet so the embedded mark fractures across faces.
  vec3 vl = normalize(vViewL);
  float depth = 0.55;
  vec2 uv = vLocal.xy * vec2(0.44, 0.36) + 0.5;
  uv -= vl.xy / max(abs(vl.z), 0.35) * depth * 0.18;
  uv += vNormalL.xy * 0.07;
  float mark = 0.0;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
    // Back-facing projection only on the front half, mirrored behind.
    mark = texture2D(uTitle, uv).a * smoothstep(-0.2, 0.4, vLocal.z * sign(vl.z) + 0.3);
  }
  // Chromatic split of the inner mark.
  float markR = texture2D(uTitle, uv + vec2(0.006, 0.0)).a;
  float markB = texture2D(uTitle, uv - vec2(0.006, 0.0)).a;

  float frost = smoothstep(0.1, 0.8, n3(vLocal * 3.4 + uSeed * 2.0));
  float streaks = smoothstep(0.55, 1.0, n3(vec3(vLocal.x * 2.0, vLocal.y * 14.0, vLocal.z * 2.0)));

  vec3 body = mix(C_INK * 2.0, C_FOG * 3.0 + C_PLUM_T, 0.5 + 0.5 * dn);
  body = mix(body, C_BONE * 0.42, frost * 0.6 + streaks * 0.22);

  vec3 inner = vec3(markR, mark, markB) * mix(C_BONE, C_MAUVE, 0.35) * (0.55 + 0.6 * uHover);
  vec3 col = body + inner * (1.0 - frost * 0.6);

  // Key light + rim + iridescent sheen.
  vec3 L = normalize(vec3(-0.4, 0.7, 0.6));
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 60.0);
  col += C_BONE * diff * 0.08;
  col += C_BONE * spec * (0.9 + frost);
  vec3 film = thinFilm(fres * 1.6 + dn * 0.35 + uTime * 0.03);
  col += film * fres * (0.55 + 0.6 * uHover) * vec3(1.0, 0.8, 0.85);
  col += C_BONE * pow(fres, 4.0) * 0.9;

  col += mix(C_HOT, C_BONE, 0.4) * burn * 3.0;

  col = applyFog(col, length(cameraPosition - vWorld));
  gl_FragColor = vec4(col, 1.0);
}
`;

const FRAG = fragmentShader.replace("C_PLUM_T", "vec3(0.031, 0.011, 0.020)");

type Crystal = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  base: THREE.Euler;
  spin: number;
  hover: number;
  scale: number;
};

export function Crystals() {
  const router = useRouter();
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const hovered = useRef(-1);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  const crystals = useMemo<Crystal[]>(
    () =>
      projects.map((p, i) => {
        const geometry = createCrystalGeometry(i + 1);
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: FRAG,
          uniforms: {
            ...shared,
            uTitle: { value: createTitleTexture(p.title, i) },
            uHover: { value: 0 },
            uDissolve: { value: 0 },
            uSeed: { value: i * 3.17 },
            uCamLocal: { value: new THREE.Vector3() },
          },
        });
        const mesh = new THREE.Mesh(geometry, material);
        shardPosition(i, mesh.position);
        mesh.userData.index = i;
        return {
          mesh,
          base: new THREE.Euler(0.12 * (i % 2 ? 1 : -1), i * 1.9, (i % 3) * 0.08 - 0.08),
          spin: 0,
          hover: 0,
          scale: 1,
        };
      }),
    [],
  );

  useEffect(
    () => () => {
      for (const c of crystals) {
        c.mesh.geometry.dispose();
        (c.mesh.material.uniforms.uTitle.value as THREE.Texture).dispose();
        c.mesh.material.dispose();
      }
    },
    [crystals],
  );

  // Clicking a crystal (canvas) opens its case study, same as the callout link.
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#scene canvas");
    if (!canvas) return;
    const onClick = () => {
      const i = hovered.current;
      if (i < 0 || getUi().openProject) return;
      const anchor = domRegistry.projectAnchors[i];
      domRegistry.returnFocus = anchor ?? null;
      domRegistry.openedFromHome = true;
      audio.blip("click");
      router.push(`/projects/${projects[i].slug}`, { scroll: false });
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, [router]);

  const tmp = useMemo(
    () => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), right: new THREE.Vector3(), inv: new THREE.Matrix4() }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const g = group.current;
    if (!g) return;
    const active = live.view === "work";
    g.visible = active || live.project.t > 0;
    if (!g.visible) return;

    const n = crystals.length;
    const wp = live.progress.work;
    const ui = getUi();
    const openIndex = ui.openProject ? projects.findIndex((p) => p.slug === ui.openProject) : -1;

    // Hover via raycast (only when no overlay is open).
    let hit = -1;
    if (!ui.openProject && active && live.pointer.active) {
      ndc.set(live.pointer.x, live.pointer.y);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(
        crystals.map((c) => c.mesh),
        false,
      );
      if (hits.length) hit = hits[0].object.userData.index as number;
    }
    if (hit !== hovered.current) {
      if (hit >= 0 && live.project.hovered !== hit) audio.chime(hit);
      hovered.current = hit;
      document.body.style.cursor = hit >= 0 ? "pointer" : "";
    }
    const focusHover = live.project.hovered;

    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    crystals.forEach((c, i) => {
      const center = projectProgress(i, n);
      const rel = wp - center;
      const isHover = hit === i || focusHover === i;
      c.hover = damp(c.hover, isHover ? 1 : 0, 6, dt);
      c.spin += dt * (0.12 + c.hover * 0.5);
      const m = c.mesh;
      m.rotation.set(
        c.base.x + rel * 1.2 + live.pointer.sy * 0.12,
        c.base.y + rel * 5.5 + c.spin + live.pointer.sx * 0.25,
        c.base.z + rel * 0.6,
      );
      const s = 1.55 * (1 + c.hover * 0.06);
      m.scale.setScalar(s);

      const u = m.material.uniforms;
      u.uHover.value = c.hover;
      u.uDissolve.value = i === openIndex || (openIndex < 0 && live.project.t > 0 && i === live.project.open)
        ? clamp(live.project.t * 1.1)
        : 0;
      m.updateMatrixWorld();
      tmp.inv.copy(m.matrixWorld).invert();
      u.uCamLocal.value.copy(camera.position).applyMatrix4(tmp.inv);

      // Pin the DOM callout next to the crystal.
      const el = domRegistry.projectAnchors[i];
      if (el) {
        tmp.v.copy(m.position).add(SCENE_ORIGIN.work);
        tmp.w.copy(tmp.v).addScaledVector(tmp.right, 1.15 * 1.55);
        tmp.v.project(camera);
        tmp.w.project(camera);
        const x = (tmp.v.x * 0.5 + 0.5) * size.width;
        const y = (-tmp.v.y * 0.5 + 0.5) * size.height;
        const rpx = Math.abs(tmp.w.x - tmp.v.x) * 0.5 * size.width;
        el.style.setProperty("--x", `${x.toFixed(1)}px`);
        el.style.setProperty("--y", `${y.toFixed(1)}px`);
        el.style.setProperty("--r", `${Math.max(60, rpx).toFixed(1)}px`);
      }
    });
    if (openIndex >= 0) live.project.open = openIndex;
  });

  return (
    <group ref={group}>
      {crystals.map((c, i) => (
        <primitive key={i} object={c.mesh} />
      ))}
    </group>
  );
}
