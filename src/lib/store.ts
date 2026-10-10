"use client";

import { useSyncExternalStore } from "react";

export type SectionId = "intro" | "work" | "about" | "contact";
export const SECTION_IDS: SectionId[] = ["intro", "work", "about", "contact"];

type Range = { top: number; height: number };

/**
 * High-frequency mutable state shared by the DOM HUD and the WebGL scene.
 * Written by the frame driver; read every frame by scenes. Never put this
 * in React state — it changes 60 times a second.
 */
export const live = {
  time: 0,
  dt: 0,
  vh: 1,
  vw: 1,
  scroll: { y: 0, smooth: 0, velocity: 0 },
  pointer: { x: 0, y: 0, sx: 0, sy: 0, active: false },
  ranges: {
    intro: { top: 0, height: 1 },
    work: { top: 0, height: 1 },
    about: { top: 0, height: 1 },
    contact: { top: 0, height: 1 },
  } as Record<SectionId, Range>,
  /** Smoothed local progress (0..1) through each section. */
  progress: { intro: 0, work: 0, about: 0, contact: 0 } as Record<SectionId, number>,
  /** Scene the camera is currently rendering (set by the camera rig). */
  view: "intro" as SectionId,
  /** Intro timeline channels (0..1), animated by GSAP. */
  intro: { wire: 0, lattice: 0, glow: 0, terrain: 0, camera: 0, hud: 0 },
  project: { hovered: -1, focus: 0, open: -1, t: 0 },
  skills: { hovered: -1 },
  contact: { index: 0, morph: 1 },
  fx: { chroma: 0, fog: 0, radial: 0, flash: 0 },
  quality: { low: false },
  reducedMotion: false,
};

// ---------------------------------------------------------------------------
// Low-frequency UI state (React subscribes to this).

export type UiState = {
  loadProgress: number;
  ready: boolean;
  introDone: boolean;
  sound: boolean;
  webgl: "pending" | "on" | "off";
  activeSection: SectionId;
  openProject: string | null;
  reveals: ReadonlySet<string>;
};

let ui: UiState = {
  loadProgress: 0,
  ready: false,
  introDone: false,
  sound: false,
  webgl: "pending",
  activeSection: "intro",
  openProject: null,
  reveals: new Set(),
};

const listeners = new Set<() => void>();

export function getUi(): UiState {
  return ui;
}

export function setUi(patch: Partial<UiState>) {
  let changed = false;
  for (const key in patch) {
    const k = key as keyof UiState;
    if (ui[k] !== patch[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeUi(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverUi: UiState = ui;

export function useUi<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    subscribeUi,
    () => selector(ui),
    () => selector(serverUi),
  );
}

/** True while a reveal window is active. Without WebGL everything is shown. */
export function useReveal(key: string): boolean {
  return useUi((s) => s.webgl === "off" || s.reveals.has(key));
}
