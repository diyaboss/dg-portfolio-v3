import * as THREE from "three";
import { generateNoiseData } from "@/lib/noise";

/** Linear-space colours mirrored from shaders/chunks.ts PALETTE. */
export const COLORS = {
  fog: new THREE.Color(0.023, 0.0068, 0.0072),
  ink: new THREE.Color(0.003, 0.001, 0.001),
  bone: new THREE.Color(0.888, 0.838, 0.815),
  ember: new THREE.Color(0.658, 0.011, 0.011),
  hot: new THREE.Color(1.0, 0.069, 0.046),
};

function createNoiseTexture() {
  const size = 256;
  const tex = new THREE.DataTexture(generateNoiseData(size), size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Uniform objects shared by reference across every material, so a single
 * write per frame updates the whole world.
 */
export const shared = {
  uNoise: { value: createNoiseTexture() },
  uTime: { value: 0 },
  uFogColor: { value: COLORS.fog.clone() },
  uFogDensity: { value: 0.022 },
  uPointer: { value: new THREE.Vector2() },
  uResolution: { value: new THREE.Vector2(1, 1) },
};

/** World-space origins of each scene. Scenes are cut between under fog. */
export const SCENE_ORIGIN = {
  intro: new THREE.Vector3(0, 0, 0),
  work: new THREE.Vector3(0, -400, 0),
  about: new THREE.Vector3(0, -800, 0),
  contact: new THREE.Vector3(0, -1200, 0),
} as const;

/** Spacing between project crystals along -Y in the work scene. */
export const SHARD_SPACING = 9;
