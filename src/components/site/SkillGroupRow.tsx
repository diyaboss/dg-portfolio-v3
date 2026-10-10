"use client";

import Link from "next/link";
import { Decode } from "@/components/ui/Decode";
import { audio } from "@/lib/audio";
import { domRegistry } from "@/lib/dom-registry";
import { live } from "@/lib/store";
import styles from "./SkillGroupRow.module.css";

type Evidence = { n: number; slug: string; title: string };

/** One ring of the stack. Hovering lights the matching 3D ring. */
export function SkillGroupRow({
  index,
  label,
  skills,
}: {
  index: number;
  label: string;
  skills: { name: string; evidence: Evidence[] }[];
}) {
  const delay = 0.2 + index * 0.14;
  return (
    <li
      className={styles.row}
      data-interactive
      onPointerEnter={() => {
        live.skills.hovered = index;
        audio.blip("hover");
      }}
      onPointerLeave={() => {
        if (live.skills.hovered === index) live.skills.hovered = -1;
      }}
      onFocusCapture={() => {
        live.skills.hovered = index;
      }}
      onBlurCapture={() => {
        if (live.skills.hovered === index) live.skills.hovered = -1;
      }}
    >
      <h3 className={styles.label}>
        <span className={styles.ring} aria-hidden="true">
          R{index + 1}
        </span>
        <Decode text={label} reveal="about.skills" delay={delay} />
      </h3>
      <ul className={styles.skills}>
        {skills.map((s, i) => (
          <li key={s.name} className={styles.skill}>
            <Decode text={s.name} reveal="about.skills" delay={delay + 0.05 + i * 0.04} speed={120} />
            {s.evidence.map((e) => (
              <Link
                key={e.slug}
                href={`/projects/${e.slug}`}
                scroll={false}
                className={styles.evidence}
                aria-label={`Evidence: ${e.title}`}
                title={e.title}
                onClick={(ev) => {
                  audio.blip("click");
                  domRegistry.returnFocus = ev.currentTarget;
                  domRegistry.openedFromHome = true;
                }}
              >
                {String(e.n).padStart(2, "0")}
              </Link>
            ))}
          </li>
        ))}
      </ul>
    </li>
  );
}
