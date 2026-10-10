"use client";

import gsap from "gsap";
import { audio } from "./audio";
import { scrollForProject } from "./driver";
import { domRegistry } from "./dom-registry";
import { getUi, live, type SectionId } from "./store";

/** Scroll offset that frames a section's scene nicely. */
export function sectionScrollTarget(id: SectionId): number {
  const r = live.ranges[id];
  const span = Math.max(1, r.height - live.vh);
  switch (id) {
    case "intro":
      return 0;
    case "work":
      return scrollForProject(0, Math.max(1, domRegistry.projectAnchors.length));
    case "about":
      return r.top + span * 0.4;
    case "contact":
      return r.top + span * 0.72;
  }
}

/**
 * Jump to a far-away part of the experience. Instead of flying the camera
 * through every scene, the view fogs out, cuts, and fogs back in.
 */
export function jumpToSection(id: SectionId) {
  const y = sectionScrollTarget(id);
  if (getUi().webgl !== "on" || live.reducedMotion) {
    window.scrollTo({ top: y, behavior: live.reducedMotion ? "auto" : "smooth" });
    return;
  }
  audio.whoosh(1.1);
  gsap.killTweensOf(live.fx);
  gsap
    .timeline()
    .to(live.fx, { flash: 1, duration: 0.5, ease: "power2.in" })
    .add(() => {
      window.scrollTo({ top: y, behavior: "instant" });
      live.scroll.y = live.scroll.smooth = y;
    })
    .to(live.fx, { flash: 0, duration: 0.9, ease: "power2.out" }, "+=0.08");
}
