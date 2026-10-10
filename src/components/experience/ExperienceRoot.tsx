"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { getProjectIndex, projects } from "@/content";
import { scrollForProject, startDriver } from "@/lib/driver";
import { getUi, live, setUi, useUi } from "@/lib/store";
import { Loader } from "./Loader";

// The 3D bundle (three, R3F, scenes, shaders) loads only in capable browsers.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function isConstrained(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const lowMem = (nav.deviceMemory ?? 8) <= 4;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || small || lowMem || fewCores;
}

/**
 * Boots the experience: capability detection, the scroll/pointer driver,
 * the loader and (when supported) the persistent WebGL scene.
 */
export function ExperienceRoot() {
  const webgl = useUi((s) => s.webgl);
  const openProject = useUi((s) => s.openProject);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      live.reducedMotion = motion.matches;
    };
    applyMotion();
    motion.addEventListener("change", applyMotion);

    const ok = detectWebGL() && !new URLSearchParams(window.location.search).has("nowebgl");
    live.quality.low = isConstrained();
    document.documentElement.classList.toggle("webgl-on", ok);
    setUi({ webgl: ok ? "on" : "off" });

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const stop = startDriver();

    if (ok && window.location.pathname === "/") window.scrollTo(0, 0);

    const onLost = (e: Event) => {
      // Fall back to the document layer if the GPU context is lost for good.
      e.preventDefault();
      document.documentElement.classList.remove("webgl-on");
      setUi({ webgl: "off", ready: true, introDone: true });
    };
    window.addEventListener("webglcontextlost", onLost, true);

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      if (ok) setUi({ loadProgress: Math.max(getUi().loadProgress, 0.3) });
      else setUi({ loadProgress: 1, introDone: true });
    });

    return () => {
      cancelled = true;
      stop();
      motion.removeEventListener("change", applyMotion);
      window.removeEventListener("webglcontextlost", onLost, true);
    };
  }, []);

  // Opening a project (from a link or a direct URL) parks the scroll at its
  // crystal so closing the overlay returns there.
  useEffect(() => {
    if (!openProject || webgl !== "on") return;
    const i = getProjectIndex(openProject);
    if (i < 0) return;
    const align = () => {
      const y = scrollForProject(i, projects.length);
      window.scrollTo({ top: y, behavior: "instant" });
      live.scroll.y = live.scroll.smooth = y;
    };
    // Ranges are measured on the next frame after mount.
    const id = requestAnimationFrame(align);
    return () => cancelAnimationFrame(id);
  }, [openProject, webgl]);

  return (
    <>
      {webgl === "on" ? <SceneWhenFontsReady /> : null}
      <Loader />
    </>
  );
}

/** Canvas textures use the web fonts, so mount the scene after fonts load. */
function SceneWhenFontsReady() {
  const progress = useUi((s) => s.loadProgress);
  if (progress < 0.3) return null;
  return <SceneLoaded />;
}

function SceneLoaded() {
  useEffect(() => {
    setUi({ loadProgress: Math.max(getUi().loadProgress, 0.6) });
  }, []);
  return <Scene />;
}
