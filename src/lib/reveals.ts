import type { SectionId } from "./store";

/**
 * Scroll windows in which HUD elements are shown. Each key is consumed by
 * `useReveal(key)` / `data-reveal` and drives the decode-in animations.
 * Values are local progress through the section (0..1).
 */
export const REVEALS: Record<string, { section: SectionId; from: number; to: number; needsIntro?: boolean }> = {
  "intro.hud": { section: "intro", from: -1, to: 0.86, needsIntro: true },
  "intro.brief": { section: "intro", from: -1, to: 0.3, needsIntro: true },
  "intro.scroll": { section: "intro", from: -1, to: 0.06, needsIntro: true },
  "intro.labels": { section: "intro", from: 0.3, to: 0.74 },
  "intro.status": { section: "intro", from: 0.3, to: 0.86 },
  "work.head": { section: "work", from: 0.0, to: 0.96 },
  "about.text": { section: "about", from: 0.12, to: 0.82 },
  "about.skills": { section: "about", from: 0.2, to: 0.82 },
  "contact.ui": { section: "contact", from: 0.42, to: 2 },
};

/** Narrow screens show About and Stack one after the other. */
export const REVEALS_NARROW: Partial<typeof REVEALS> = {
  "about.text": { section: "about", from: 0.08, to: 0.44 },
  "about.skills": { section: "about", from: 0.5, to: 0.84 },
};
