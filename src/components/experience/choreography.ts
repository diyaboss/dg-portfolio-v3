import * as THREE from "three";
import { projects } from "@/content";
import { projectProgress } from "@/lib/driver";
import { clamp, easeInCubic, easeInOutCubic, easeOutCubic, lerp, range } from "@/lib/math";
import type { SectionId } from "@/lib/store";
import { SHARD_SPACING } from "./shared";

/**
 * Pure camera choreography. Every scene exposes three phases in its own
 * local space:
 *   enter(u)  0..1 — just after the fog cut, settling into the scene
 *   pose(t)   0..1 — scroll-driven progress through the scene
 *   exit(u)   0..1 — leaving, until the fog fully covers the next cut
 */
export type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; roll: number };

const pose = (pos: THREE.Vector3, target: THREE.Vector3, fov = 35, roll = 0): Pose => ({ pos, target, fov, roll });

function spherical(target: THREE.Vector3, radius: number, azimuth: number, elevation: number) {
  return new THREE.Vector3(
    target.x + Math.cos(azimuth) * Math.cos(elevation) * radius,
    target.y + Math.sin(elevation) * radius,
    target.z + Math.sin(azimuth) * Math.cos(elevation) * radius,
  );
}

// ---------------------------------------------------------------------------
// Intro — the dome on its plateau.
const A0 = 0.3;

export function introPose(t: number, introCamera: number): Pose {
  const k = easeInOutCubic(clamp(t));
  const target = new THREE.Vector3(0, lerp(1.2, 1.9, k), 0);
  const radius = lerp(22, 12.5, k);
  const az = A0 + 0.5 * k;
  const el = lerp(0.25, 0.17, k);

  // Intro flight: from directly overhead down to the hero framing.
  const c = easeInOutCubic(clamp(introCamera));
  const r = lerp(58, radius, c);
  const e = lerp(1.5, el, c);
  const a = lerp(A0 - 0.9, az, c);
  const tgt = target.clone().multiplyScalar(c);
  return pose(spherical(tgt, r, a, e), tgt, 35);
}

export function introExit(u: number): Pose {
  const k = easeInCubic(clamp(u));
  const base = introPose(1, 1);
  // Push in over the scattered perimeter and tip down into the ground mist.
  const target = base.target.clone().lerp(new THREE.Vector3(2.5, -2.5, 0), k);
  const pos = spherical(base.target, lerp(12.5, 8.5, k), A0 + 0.5 + 0.35 * k, lerp(0.17, 0.62, k));
  return pose(pos, target, lerp(35, 50, k), k * 0.1);
}

// ---------------------------------------------------------------------------
// Work — crystals descending along -Y.
export function shardPosition(i: number, out = new THREE.Vector3()) {
  return out.set((i % 2 === 0 ? -1 : 1) * 1.5, -i * SHARD_SPACING, 0);
}

function workFocus(t: number) {
  const n = projects.length;
  const first = projectProgress(0, n);
  const last = projectProgress(n - 1, n);
  return ((t - first) / Math.max(1e-4, last - first)) * (n - 1);
}

export function workPose(t: number): Pose {
  const f = workFocus(t);
  const n = projects.length;
  const fi = clamp(f, 0, n - 1);
  const i0 = Math.floor(fi);
  const i1 = Math.min(n - 1, i0 + 1);
  const x = lerp(shardPosition(i0).x, shardPosition(i1).x, easeInOutCubic(fi - i0)) * 0.55;
  const y = -f * SHARD_SPACING;
  const pos = new THREE.Vector3(x * 1.4, y + 0.4, 13.5);
  const target = new THREE.Vector3(x, y, 0);
  return pose(pos, target, 35);
}

export function workEnter(u: number): Pose {
  const k = easeOutCubic(clamp(u));
  const base = workPose(0);
  const pos = base.pos.clone().add(new THREE.Vector3(0, lerp(26, 0, k), lerp(8, 0, k)));
  const target = base.target.clone().add(new THREE.Vector3(0, lerp(18, 0, k), 0));
  return pose(pos, target, lerp(55, 35, k), (1 - k) * -0.08);
}

export function workExit(u: number): Pose {
  const k = easeInCubic(clamp(u));
  const base = workPose(1);
  const d = new THREE.Vector3(0, -k * 22, -k * 6);
  return pose(base.pos.clone().add(d), base.target.clone().add(d).add(new THREE.Vector3(0, -k * 8, 0)), lerp(35, 60, k), k * 0.1);
}

// ---------------------------------------------------------------------------
// About — shattered rings around an energy core, flown through.
export function aboutPose(t: number): Pose {
  const approach = easeInOutCubic(range(t, 0, 0.8));
  const through = easeInCubic(range(t, 0.8, 1));
  const z = lerp(36, 10.5, approach) - through * 13;
  const x = Math.sin(t * Math.PI) * 1.2;
  const pos = new THREE.Vector3(x, Math.sin(t * Math.PI * 0.7) * 0.8, z);
  const target = new THREE.Vector3(0, 0, Math.min(0, z - 10));
  return pose(pos, target, lerp(35, 46, through), t * 0.25);
}

export function aboutEnter(u: number): Pose {
  const k = easeOutCubic(clamp(u));
  const base = aboutPose(0);
  return pose(base.pos.clone().setZ(lerp(80, base.pos.z, k)), base.target, lerp(50, 35, k), (1 - k) * 0.2);
}

export function aboutExit(u: number): Pose {
  const k = easeInCubic(clamp(u));
  const base = aboutPose(1);
  return pose(base.pos.clone().setZ(base.pos.z - k * 30), base.target.clone().setZ(base.target.z - k * 30), lerp(46, 70, k), 0.25 + k * 0.4);
}

// ---------------------------------------------------------------------------
// Contact — the pedestal, seen from overhead, swinging down to eye level.
export function contactPose(t: number): Pose {
  const k = easeInOutCubic(range(t, 0, 0.62));
  const target = new THREE.Vector3(0, lerp(0, 2.3, k), 0);
  const pos = spherical(target, lerp(26, 11, k), Math.PI / 2 + lerp(-0.4, 0, k), lerp(1.52, 0.1, k));
  return pose(pos, target, 35);
}

export function contactEnter(u: number): Pose {
  const k = easeOutCubic(clamp(u));
  const base = contactPose(0);
  return pose(base.pos.clone().setY(lerp(60, base.pos.y, k)), base.target, lerp(50, 35, k), 0);
}

// ---------------------------------------------------------------------------

export type SceneState = {
  view: SectionId;
  pose: Pose;
  /** Fog cover 0..1 (1 hides the cut). */
  fog: number;
  /** Transition intensity for chromatic aberration. */
  chroma: number;
  radial: number;
};

const ORDER: SectionId[] = ["intro", "work", "about", "contact"];

type Ranges = Record<SectionId, { top: number; height: number }>;

export function resolveScene(
  scroll: number,
  vh: number,
  ranges: Ranges,
  progress: Record<SectionId, number>,
  introCamera: number,
): SceneState {
  const poseFor = (id: SectionId, t: number): Pose => {
    switch (id) {
      case "intro":
        return introPose(t, introCamera);
      case "work":
        return workPose(t);
      case "about":
        return aboutPose(t);
      case "contact":
        return contactPose(t);
    }
  };

  let state: SceneState = {
    view: "intro",
    pose: poseFor("intro", clamp(progress.intro)),
    fog: 0,
    chroma: 0,
    radial: 0,
  };

  for (let i = 0; i < ORDER.length - 1; i++) {
    const a = ORDER[i];
    const b = ORDER[i + 1];
    const zs = ranges[a].top + ranges[a].height - vh;
    if (scroll < zs) break;
    const tz = (scroll - zs) / vh;
    if (tz < 1) {
      const fog = tz < 0.5 ? range(tz, 0.12, 0.5) : 1 - range(tz, 0.5, 0.9);
      const chroma = Math.sin(clamp(tz) * Math.PI);
      if (tz < 0.5) {
        const u = tz * 2;
        const exit = a === "intro" ? introExit(u) : a === "work" ? workExit(u) : aboutExit(u);
        state = { view: a, pose: exit, fog, chroma, radial: a === "about" ? u : u * 0.4 };
      } else {
        const u = (tz - 0.5) * 2;
        const enter = b === "work" ? workEnter(u) : b === "about" ? aboutEnter(u) : contactEnter(u);
        state = { view: b, pose: enter, fog, chroma, radial: (1 - u) * 0.4 };
      }
      break;
    }
    state = { view: b, pose: poseFor(b, clamp(progress[b])), fog: 0, chroma: 0, radial: 0 };
  }

  if (state.view === "about" && state.fog === 0) {
    state.radial = range(clamp(progress.about), 0.82, 1) * 0.8;
  }
  return state;
}
