import * as THREE from "three";
import { rng } from "@/lib/math";
import { valueNoise3 } from "@/lib/noise";

/**
 * A chunky, faceted ice crystal: a hexagonal prism with irregular facet
 * radii, a fractured crown and a broken base, shaded flat.
 */
export function createCrystalGeometry(seed: number): THREE.BufferGeometry {
  const r = rng(seed * 97 + 13);
  const noise = valueNoise3(seed + 5);
  const sides = 6 + Math.floor(r() * 3);
  const height = 2.7 + r() * 0.5;
  const g = new THREE.CylinderGeometry(1, 1, height, sides, 7, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const faceScale = Array.from({ length: sides + 1 }, () => 0.78 + r() * 0.42);
  const v = new THREE.Vector3();
  const half = height / 2;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const sector = Math.round(((ang + Math.PI) / (Math.PI * 2)) * sides) % sides;
    const radial = Math.hypot(v.x, v.z);
    const yn = v.y / half; // -1..1
    let s = faceScale[sector] * (1 + 0.16 * noise(v.x * 1.3, v.y * 1.1, v.z * 1.3));
    // Taper toward the crown and the base.
    s *= 1 - 0.28 * Math.max(0, yn - 0.55) / 0.45 - 0.12 * Math.max(0, -yn - 0.7) / 0.3;
    const scaleXZ = radial > 1e-4 ? s : 1;
    v.x *= scaleXZ * 0.62;
    v.z *= scaleXZ * 0.62;
    // Fractured crown and broken base: rough heights.
    if (yn > 0.95) v.y += (noise(v.x * 3, 7, v.z * 3) * 0.5 + 0.1) * 0.65;
    if (yn < -0.95) v.y += noise(v.x * 3, -7, v.z * 3) * 0.3;
    // Gentle bend so silhouettes are not perfectly straight.
    v.x += 0.08 * Math.sin(yn * 1.7 + seed);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  flat.computeBoundingSphere();
  return flat;
}
