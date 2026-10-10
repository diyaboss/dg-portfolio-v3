"use client";

import { createElement, useEffect, useRef, type ElementType } from "react";
import { audio } from "@/lib/audio";
import { live, useReveal } from "@/lib/store";

type DecodeProps = {
  text: string;
  /** Reveal key from lib/reveals.ts; or pass `active` directly. */
  reveal?: string;
  active?: boolean;
  as?: ElementType;
  className?: string;
  /** Seconds before the decode starts. */
  delay?: number;
  /** Characters resolved per second. */
  speed?: number;
  /** Play data ticks while decoding. */
  sound?: boolean;
};

const PRINTABLE_MIN = 33;
const PRINTABLE_MAX = 126;

function shifted(target: string, distance: number) {
  if (target === " " || target === "\n" || distance <= 0) return target;
  const code = target.charCodeAt(0);
  if (code < PRINTABLE_MIN || code > PRINTABLE_MAX) return target;
  let c = code + distance;
  if (c > PRINTABLE_MAX) c = PRINTABLE_MIN + (c - PRINTABLE_MAX);
  return String.fromCharCode(c);
}

/**
 * Text that "decodes" into place: each character starts a few code points
 * away from its target and steps toward it, left to right — the same
 * character-shift scramble observed on the reference. The real text is
 * always present for assistive technology.
 */
export function Decode({
  text,
  reveal,
  active,
  as = "span",
  className,
  delay = 0,
  speed = 70,
  sound = true,
}: DecodeProps) {
  const revealed = useReveal(reveal ?? "__none__");
  const on = active ?? (reveal ? revealed : true);
  const outRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ raf: 0, shown: false });

  useEffect(() => {
    const el = outRef.current;
    if (!el) return;
    const st = state.current;
    cancelAnimationFrame(st.raf);

    if (!on) {
      // Scramble out quickly, then blank.
      if (!st.shown) {
        el.textContent = "";
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const t = (now - start) / 220;
        if (t >= 1) {
          el.textContent = "";
          st.shown = false;
          return;
        }
        let s = "";
        for (let i = 0; i < text.length; i++) {
          s += Math.random() < t ? " " : shifted(text[i], 1 + Math.floor(Math.random() * 6));
        }
        el.textContent = s;
        st.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(st.raf);
    }

    if (live.reducedMotion) {
      el.textContent = text;
      st.shown = true;
      return;
    }

    const offsets = Array.from(text, () => 3 + Math.floor(Math.random() * 9));
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (elapsed < 0) {
        st.raf = requestAnimationFrame(tick);
        return;
      }
      const head = elapsed * speed;
      let s = "";
      let done = true;
      for (let i = 0; i < text.length; i++) {
        const local = head - i;
        if (local < 0) {
          s += i < head + 6 ? shifted(text[i], offsets[i]) : " ";
          done = false;
          continue;
        }
        const remaining = offsets[i] - Math.floor(local * 1.6);
        if (remaining > 0) done = false;
        s += shifted(text[i], remaining);
      }
      el.textContent = s;
      st.shown = true;
      if (sound && !done) audio.tick();
      if (!done) st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(st.raf);
  }, [on, text, delay, speed, sound]);

  return createElement(
    as,
    { className, "data-decode": on ? "on" : "off" },
    <span className="sr-only">{text}</span>,
    <span aria-hidden="true" ref={outRef} className="decode-glyphs" />,
  );
}
