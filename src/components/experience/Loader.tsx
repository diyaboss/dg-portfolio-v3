"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/content";
import { setUi, useUi } from "@/lib/store";

/**
 * Minimal boot screen: a thin line that fills with real load progress
 * (fonts → 3D bundle → compiled shaders), then dissolves into the scene.
 */
export function Loader() {
  const progress = useUi((s) => s.loadProgress);
  const ready = useUi((s) => s.ready);
  const [shown, setShown] = useState(0);
  const [gone, setGone] = useState(false);
  const raf = useRef(0);

  // Ease the displayed number toward real progress.
  useEffect(() => {
    const tick = () => {
      setShown((s) => {
        const next = s + (progress - s) * 0.12;
        return Math.abs(progress - next) < 0.002 ? progress : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [progress]);

  useEffect(() => {
    if (shown >= 1 && !ready) {
      const t = window.setTimeout(() => setUi({ ready: true }), 250);
      return () => window.clearTimeout(t);
    }
  }, [shown, ready]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setGone(true), 1400);
    return () => window.clearTimeout(t);
  }, [ready]);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink transition-opacity duration-[1200ms] ease-out"
      style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : "auto" }}
      role="status"
      aria-live="polite"
      aria-label={ready ? "Loaded" : "Loading"}
    >
      <div className="flex w-[180px] flex-col items-center gap-3 hud-text">
        <div className="relative h-px w-full overflow-hidden bg-bone/15">
          <div
            className="absolute inset-y-0 left-1/2 bg-bone shadow-[0_0_12px_rgba(242,236,233,0.8)]"
            style={{ width: `${shown * 100}%`, transform: "translateX(-50%)" }}
          />
        </div>
        <div className="flex w-full justify-between text-[11px] text-bone-dim">
          <span>{profile.shortName}</span>
          <span aria-hidden="true">{String(Math.round(shown * 100)).padStart(3, "0")}</span>
        </div>
      </div>
    </div>
  );
}
