"use client";

import { useState } from "react";
import { Decode } from "@/components/ui/Decode";
import { audio } from "@/lib/audio";
import { live, useReveal } from "@/lib/store";
import type { SocialLink } from "@/content/types";
import styles from "./ContactCarousel.module.css";

/**
 * Bracketed link carousel over the pedestal. Arrows cycle the destination
 * and morph the particle sculpture; the centre item is the real link.
 */
export function ContactCarousel({ links }: { links: SocialLink[] }) {
  const [index, setIndex] = useState(0);
  const on = useReveal("contact.ui");
  const count = links.length;

  const go = (dir: number) => {
    const next = (index + dir + count) % count;
    setIndex(next);
    live.contact.index = next;
    live.contact.morph = 0;
    audio.blip("click");
  };

  const current = links[index];
  const prev = links[(index - 1 + count) % count];
  const next = links[(index + 1) % count];
  const external = current.href.startsWith("https://");

  return (
    <nav className={styles.root} data-on={on ? "true" : "false"} aria-label="Contact links">
      {/* Arrows flank the sculpture, as on the reference. */}
      {count > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.left}`}
            onClick={() => go(-1)}
            aria-label={`Previous: ${prev.label}`}
          >
            <span className={styles.arrowLine} />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.right}`}
            onClick={() => go(1)}
            aria-label={`Next: ${next.label}`}
          >
            <span className={styles.arrowLine} />
          </button>
        </>
      ) : null}

      <div className={styles.rail}>
        {count > 1 ? (
          <span className={styles.ghost} aria-hidden="true">
            {prev.label}
          </span>
        ) : null}
        <a
          className={`bracket hud-text ${styles.current}`}
          href={current.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={`${current.description}${external ? " (opens in a new tab)" : ""}`}
          onPointerEnter={() => audio.blip("hover")}
        >
          <Decode key={current.id} text={current.label} active={on} speed={50} />
        </a>
        {count > 1 ? (
          <span className={styles.ghost} aria-hidden="true">
            {next.label}
          </span>
        ) : null}
      </div>

      {/* Without WebGL the carousel is replaced by a plain list. */}
      <ul className={styles.list}>
        {links.map((l) => (
          <li key={l.id}>
            <a
              className="hud-text"
              href={l.href}
              {...(l.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              [{l.label}] ↗<span className="sr-only"> — {l.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
