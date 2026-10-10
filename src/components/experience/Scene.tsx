"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { audio } from "@/lib/audio";
import { damp } from "@/lib/math";
import { getUi, live, setUi, subscribeUi } from "@/lib/store";
import { Rings } from "./about/Rings";
import { AdaptiveQuality } from "./AdaptiveQuality";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Pedestal } from "./contact/Pedestal";
import { Sculpture } from "./contact/Sculpture";
import { IntroScene } from "./intro/IntroScene";
import { PostFX } from "./PostFX";
import { COLORS, SCENE_ORIGIN, shared } from "./shared";
import { Crystals } from "./work/Crystals";

const FOG_DENSITY = { intro: 0.017, work: 0.034, about: 0.019, contact: 0.022 } as const;

/**
 * Compiles every shader program up-front without blocking the main thread
 * (KHR_parallel_shader_compile via compileAsync), then reports readiness.
 * On Windows/ANGLE, synchronous compilation of all programs can freeze the
 * page for many seconds.
 */
function ReadyGate() {
  const { gl, scene, camera } = useThree();
  const compiled = useRef(false);
  const frames = useRef(0);
  const done = useRef(false);
  useEffect(() => {
    let cancelled = false;
    // Make everything visible while materials are collected so all
    // programs (including scenes not yet on screen) get compiled.
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    const pending = gl.compileAsync(scene, camera);
    hidden.forEach((o) => (o.visible = false));
    setUi({ loadProgress: Math.max(getUi().loadProgress, 0.7) });
    pending
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        compiled.current = true;
        setUi({ loadProgress: Math.max(getUi().loadProgress, 0.92) });
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);
  useFrame(() => {
    if (done.current || !compiled.current) return;
    frames.current += 1;
    if (frames.current > 3) {
      done.current = true;
      setUi({ loadProgress: 1 });
    }
  });
  return null;
}

/** The opening sequence, run once the loader has cleared. */
function IntroTimeline() {
  const started = useRef(false);
  useEffect(() => {
    let tl: gsap.core.Timeline | null = null;
    const start = () => {
      const skip = live.reducedMotion || live.scroll.y > live.vh * 0.5 || getUi().openProject !== null;
      if (skip) {
        Object.assign(live.intro, { wire: 1, lattice: 1, glow: 1, terrain: 1, camera: 1, hud: 1 });
        setUi({ introDone: true });
        return;
      }
      tl = gsap.timeline({ onComplete: () => setUi({ introDone: true }) });
      // Sound cues follow the visual beats: lattice arpeggio, core ignition,
      // terrain swell, and the settle into the hero framing.
      tl.call(() => audio.arpeggio(12, 190), [], 0.1)
        .call(() => audio.thud(0.7), [], 1.4)
        .call(() => audio.whoosh(3.2, true), [], 2.4)
        .call(() => audio.chime(0, 0.04), [], 5.0);
      tl.to(live.intro, { lattice: 1, duration: 2.6, ease: "power2.out" }, 0.1)
        .to(live.intro, { wire: 1, duration: 2.4, ease: "power2.inOut" }, 0.3)
        .to(live.intro, { glow: 0.7, duration: 1.4, ease: "power2.out" }, 1.4)
        .to(live.intro, { camera: 0.22, duration: 2.6, ease: "sine.inOut" }, 0)
        .to(live.intro, { terrain: 1, duration: 2.8, ease: "power2.inOut" }, 2.5)
        .to(live.intro, { glow: 1, duration: 2.0, ease: "power2.inOut" }, 2.8)
        .to(live.intro, { camera: 1, duration: 3.4, ease: "power3.inOut" }, 2.6)
        .add(() => setUi({ introDone: true }), 5.2);
    };
    // Start as soon as the loader reports ready (or immediately if it already has).
    const check = () => {
      if (getUi().ready && !started.current) {
        started.current = true;
        start();
      }
    };
    const unsub = subscribeUi(check);
    check();
    return () => {
      unsub();
      tl?.kill();
    };
  }, []);
  return null;
}

function SceneUpdater() {
  useFrame((state, delta) => {
    shared.uResolution.value.set(state.size.width * state.viewport.dpr, state.size.height * state.viewport.dpr);
    shared.uFogDensity.value = damp(shared.uFogDensity.value, FOG_DENSITY[live.view], 4, Math.min(delta, 0.05));
  }, -3);
  return null;
}

function World() {
  return (
    <>
      <SceneUpdater />
      <CameraRig />
      <Atmosphere />
      <group position={SCENE_ORIGIN.intro}>
        <IntroScene />
      </group>
      <group position={SCENE_ORIGIN.work}>
        <Crystals />
      </group>
      <group position={SCENE_ORIGIN.about}>
        <Rings />
      </group>
      <group position={SCENE_ORIGIN.contact}>
        <Pedestal />
        <Sculpture />
      </group>
      <PostFX />
      <ReadyGate />
      <IntroTimeline />
    </>
  );
}

export default function Scene() {
  const low = live.quality.low;
  const maxDpr = low ? 1.25 : 1.75;
  return (
    <div id="scene" className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={[1, maxDpr]}
        gl={{
          antialias: false,
          alpha: false,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
        }}
        camera={{ fov: 35, near: 0.1, far: 600, position: [0, 58, 0.01] }}
        onCreated={({ gl }) => {
          gl.setClearColor(COLORS.fog, 1);
          gl.outputColorSpace = THREE.LinearSRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <World />
        <AdaptiveQuality min={1} max={maxDpr} />
      </Canvas>
    </div>
  );
}
