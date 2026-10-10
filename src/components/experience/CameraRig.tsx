"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getProjectIndex } from "@/content";
import { audio } from "@/lib/audio";
import { clamp, damp, easeInOutCubic } from "@/lib/math";
import { getUi, live } from "@/lib/store";
import { resolveScene, shardPosition } from "./choreography";
import { SCENE_ORIGIN, shared } from "./shared";

/**
 * Applies the scroll choreography to the camera every frame, layers pointer
 * parallax and the project-open dolly on top, and publishes the transition
 * intensities that the post-processing pass consumes.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      shard: new THREE.Vector3(),
      smoothPos: new THREE.Vector3(),
      smoothTarget: new THREE.Vector3(),
    }),
    [],
  );
  const state = useRef({ view: "" as string, initialised: false, fov: 35, roll: 0, openT: 0, openIndex: -1 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const st = state.current;
    shared.uTime.value += dt;

    const scene = resolveScene(live.scroll.smooth, live.vh, live.ranges, live.progress, live.intro.camera);
    const origin = SCENE_ORIGIN[scene.view];
    tmp.pos.copy(scene.pose.pos).add(origin);
    tmp.target.copy(scene.pose.target).add(origin);

    // Pointer parallax in camera space.
    const strength = scene.view === "contact" ? 0.9 : scene.view === "work" ? 0.7 : 0.55;
    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    tmp.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    tmp.pos.addScaledVector(tmp.right, live.pointer.sx * strength);
    tmp.pos.addScaledVector(tmp.up, live.pointer.sy * strength * 0.5);

    // Project open: dolly into the selected crystal.
    const ui = getUi();
    const openIndex = ui.openProject ? getProjectIndex(ui.openProject) : -1;
    if (openIndex >= 0) st.openIndex = openIndex;
    const goal = openIndex >= 0 ? 1 : 0;
    const speed = live.reducedMotion ? 10 : 1 / 1.15;
    st.openT = clamp(st.openT + Math.sign(goal - st.openT) * dt * speed);
    const ot = easeInOutCubic(st.openT);
    live.project.t = st.openT;
    if (ot > 0 && st.openIndex >= 0) {
      shardPosition(st.openIndex, tmp.shard).add(SCENE_ORIGIN.work);
      tmp.pos.lerp(tmp.shard.clone().add(new THREE.Vector3(0, 0.15, 4.4)), ot);
      tmp.target.lerp(tmp.shard, ot);
    }

    // Snap on scene cuts (hidden by fog); otherwise smooth.
    const cut = scene.view !== st.view;
    if (cut || !st.initialised) {
      if (st.initialised) {
        audio.setIntensity(scene.view === "about" ? 0.8 : scene.view === "intro" ? 0.2 : 0.4);
        // The fog cut itself.
        audio.whoosh(1.5, scene.view !== "intro");
        audio.thud(0.55);
      }
      tmp.smoothPos.copy(tmp.pos);
      tmp.smoothTarget.copy(tmp.target);
      st.fov = scene.pose.fov;
      st.roll = scene.pose.roll;
      st.view = scene.view;
      st.initialised = true;
    } else {
      const lambda = live.reducedMotion ? 30 : 9;
      tmp.smoothPos.set(
        damp(tmp.smoothPos.x, tmp.pos.x, lambda, dt),
        damp(tmp.smoothPos.y, tmp.pos.y, lambda, dt),
        damp(tmp.smoothPos.z, tmp.pos.z, lambda, dt),
      );
      tmp.smoothTarget.set(
        damp(tmp.smoothTarget.x, tmp.target.x, lambda, dt),
        damp(tmp.smoothTarget.y, tmp.target.y, lambda, dt),
        damp(tmp.smoothTarget.z, tmp.target.z, lambda, dt),
      );
      st.fov = damp(st.fov, scene.pose.fov - ot * 7, lambda, dt);
      st.roll = damp(st.roll, scene.pose.roll, lambda, dt);
    }
    live.view = scene.view;

    camera.position.copy(tmp.smoothPos);
    camera.up.set(Math.sin(st.roll), Math.cos(st.roll), 0);
    camera.lookAt(tmp.smoothTarget);
    // Portrait screens: widen the vertical FOV so the horizontal framing
    // matches a ~1.25 aspect landscape view instead of cropping the subject.
    const minAspect = 1.25;
    const fov =
      camera.aspect < minAspect
        ? Math.min(
            80,
            THREE.MathUtils.radToDeg(
              2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(st.fov) / 2) * (minAspect / camera.aspect)),
            ),
          )
        : st.fov;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Transition intensities for post-processing.
    const projectBump = Math.sin(st.openT * Math.PI);
    const vel = Math.min(1, Math.abs(live.scroll.velocity) * 0.5);
    live.fx.fog = scene.fog;
    live.fx.chroma = live.reducedMotion ? 0 : Math.max(scene.chroma, projectBump * 1.2) + vel * 0.35;
    live.fx.radial = live.reducedMotion ? 0 : scene.radial + projectBump * 0.35;
    shared.uPointer.value.set(live.pointer.sx, live.pointer.sy);

    // Continuous sound layers follow what is moving on screen.
    const scrollSpeed = Math.min(1, Math.abs(live.scroll.velocity) * 1.6);
    const p = live.progress[scene.view];
    const v = scene.view;
    audio.update({
      rumble:
        (v === "intro" && p > 0.2 && p < 0.9 ? scrollSpeed * 1.2 : 0) +
        scene.fog * 0.7 +
        scene.radial * 0.8,
      shimmer: v === "work" ? 0.12 + scrollSpeed * 1.4 + projectBump * 0.8 : 0,
      hum:
        v === "intro"
          ? live.intro.glow * 0.35
          : v === "about"
            ? 0.25 + Math.min(1, Math.max(0, (p - 0.15) / 0.45)) * 0.75
            : v === "contact"
              ? 0.2 + Math.min(1, Math.max(0, p / 0.5)) * 0.5
              : 0.1,
      humPitch: v === "intro" ? 0.5 : v === "about" ? 1 + Math.max(0, p - 0.8) * 1.5 : v === "contact" ? 0.75 : 0.66,
    });
  }, -2);

  return null;
}
