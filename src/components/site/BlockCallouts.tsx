"use client";

import { domRegistry } from "@/lib/dom-registry";
import { useReveal } from "@/lib/store";

export const CALLOUT_COUNT = 5;

/**
 * Numbered markers joined by a thin line that ride on individual dome blocks
 * while the perimeter separates. Positions are written by the Dome scene.
 * Purely decorative.
 */
export function BlockCallouts() {
  const on = useReveal("intro.labels");
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 transition-opacity duration-500"
      style={{ opacity: on ? 1 : 0 }}
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <polyline
          ref={(el) => {
            domRegistry.blockPath = el;
          }}
          fill="none"
          stroke="rgb(242 236 233 / 0.75)"
          strokeWidth="1"
          points=""
        />
      </svg>
      {Array.from({ length: CALLOUT_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            domRegistry.blockCallouts[i] = el;
          }}
          className="hud-text absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium will-change-transform"
          style={{ transform: "translate3d(-9999px,0,0)" }}
        >
          <span className="inline-block h-[5px] w-[5px] -translate-x-1/2 bg-bone" />
          <span data-num>00</span>
        </span>
      ))}
    </div>
  );
}
