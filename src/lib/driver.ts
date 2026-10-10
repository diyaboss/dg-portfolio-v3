"use client";

import { domRegistry } from "./dom-registry";
import { clamp, damp } from "./math";
import { REVEALS, REVEALS_NARROW } from "./reveals";
import { getUi, live, SECTION_IDS, setUi, type SectionId } from "./store";

/**
 * The single requestAnimationFrame loop that turns raw scroll / pointer input
 * into smoothed, section-relative state. It runs whether or not WebGL is
 * available, so the DOM HUD behaves identically in the fallback.
 * Returns a disposer.
 */
export function startDriver(): () => void {
  let raf = 0;
  let last = performance.now();
  let disposed = false;

  const measure = () => {
    live.vh = window.innerHeight;
    live.vw = window.innerWidth;
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      live.ranges[id] = { top: rect.top + window.scrollY, height: rect.height };
    }
  };

  const onPointer = (e: PointerEvent) => {
    live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    live.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    live.pointer.active = true;
  };
  const onLeave = () => {
    live.pointer.active = false;
  };

  const ro = new ResizeObserver(measure);
  const main = document.getElementById("main");
  if (main) ro.observe(main);
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  measure();
  live.scroll.y = live.scroll.smooth = window.scrollY;

  const tick = (now: number) => {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    live.dt = dt;
    live.time += dt;

    const ui = getUi();
    // While a project overlay is open the body is scroll-locked; keep the
    // last scene position instead of reading the locked scroll value.
    if (!ui.openProject) {
      const y = window.scrollY;
      const prev = live.scroll.smooth;
      live.scroll.y = y;
      live.scroll.smooth = live.reducedMotion ? y : damp(prev, y, 7.5, dt);
      if (Math.abs(live.scroll.smooth - y) < 0.05) live.scroll.smooth = y;
      const v = dt > 0 ? (live.scroll.smooth - prev) / dt / live.vh : 0;
      live.scroll.velocity = damp(live.scroll.velocity, v, 10, dt);
    } else {
      live.scroll.velocity = damp(live.scroll.velocity, 0, 10, dt);
    }

    const s = live.scroll.smooth;
    let active: SectionId = "intro";
    for (const id of SECTION_IDS) {
      const r = live.ranges[id];
      const span = Math.max(1, r.height - live.vh);
      live.progress[id] = clamp((s - r.top) / span, -1, 2);
      if (s + live.vh * 0.5 >= r.top) active = id;
    }

    const p = live.pointer;
    const pl = p.active ? 1 : 0;
    p.sx = damp(p.sx, p.x * pl, 3.2, dt);
    p.sy = damp(p.sy, p.y * pl, 3.2, dt);

    // Reveal windows.
    let revealsChanged = false;
    const next = new Set<string>();
    for (const key in REVEALS) {
      const r = (live.vw < 760 ? REVEALS_NARROW[key] : undefined) ?? REVEALS[key];
      const prog = live.progress[r.section];
      const on = prog >= r.from && prog <= r.to && (!r.needsIntro || ui.introDone) && !ui.openProject;
      if (on) next.add(key);
      if (on !== ui.reveals.has(key)) revealsChanged = true;
    }

    // Project callouts: shown while their crystal is near the camera.
    const anchors = domRegistry.projectAnchors;
    const n = anchors.length;
    const wp = live.progress.work;
    const half = n > 1 ? 0.5 / (n - 1) : 0.5;
    for (let i = 0; i < n; i++) {
      const on =
        !ui.openProject &&
        live.scroll.y >= live.ranges.work.top - live.vh * 0.2 &&
        Math.abs(wp - projectProgress(i, n)) < half * 0.62;
      const key = `project.${i}`;
      if (on) next.add(key);
      if (on !== ui.reveals.has(key)) revealsChanged = true;
      const el = anchors[i];
      if (el && el.dataset.on !== String(on)) el.dataset.on = String(on);
    }

    const patch: Parameters<typeof setUi>[0] = {};
    if (revealsChanged) patch.reveals = next;
    if (active !== ui.activeSection) patch.activeSection = active;
    if (patch.reveals || patch.activeSection) setUi(patch);

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("resize", measure);
    window.removeEventListener("pointermove", onPointer);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}

/** Scroll position (px) that centres the camera on a project crystal. */
export function scrollForProject(index: number, count: number): number {
  const r = live.ranges.work;
  const span = Math.max(1, r.height - live.vh);
  return r.top + span * projectProgress(index, count);
}

/** Local work-section progress at which crystal `index` is centred. */
export function projectProgress(index: number, count: number): number {
  const lead = 0.1;
  const tail = 0.1;
  return lead + (1 - lead - tail) * (count <= 1 ? 0 : index / (count - 1));
}
