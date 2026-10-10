"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { live } from "@/lib/store";

/**
 * Measures real frame times and steps the device pixel ratio down (or back
 * up) so the experience stays fluid on integrated GPUs and phones.
 */
export function AdaptiveQuality({ min, max }: { min: number; max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);
  const acc = useRef({ t: 0, frames: 0, cooldown: 2 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.t += delta;
    a.frames += 1;
    if (a.t < 1.5) return;
    const avg = (a.t / a.frames) * 1000;
    a.t = 0;
    a.frames = 0;
    if (a.cooldown > 0) {
      a.cooldown -= 1;
      return;
    }
    if (avg > 24 && dpr > min) {
      setDpr(Math.max(min, +(dpr - 0.25).toFixed(2)));
      live.quality.low = true;
      a.cooldown = 1;
    } else if (avg < 13 && dpr < max) {
      setDpr(Math.min(max, +(dpr + 0.25).toFixed(2)));
      a.cooldown = 2;
    }
  });

  return null;
}
