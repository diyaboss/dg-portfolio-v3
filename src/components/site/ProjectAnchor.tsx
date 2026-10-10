"use client";

import Link from "next/link";
import { audio } from "@/lib/audio";
import { domRegistry } from "@/lib/dom-registry";
import { scrollForProject } from "@/lib/driver";
import { getUi, live } from "@/lib/store";
import { Decode } from "@/components/ui/Decode";
import styles from "./ProjectAnchor.module.css";

type Props = {
  index: number;
  slug: string;
  title: string;
  category: string;
  status?: string;
  date?: string;
  summary: string;
};

/**
 * A project's callout. In the WebGL experience the scene pins it beside the
 * project's crystal (writing `--x/--y/--r` and `data-on`); without WebGL it
 * renders as a plain list item. Either way it is a real link.
 */
export function ProjectAnchor({ index, slug, title, category, status, date, summary }: Props) {
  const code = `PROJECT_DG_${String(index + 1).padStart(2, "0")}`;
  return (
    <li className={styles.item}>
      <Link
        href={`/projects/${slug}`}
        scroll={false}
        className={styles.anchor}
        data-on="false"
        ref={(el) => {
          domRegistry.projectAnchors[index] = el;
          return () => {
            domRegistry.projectAnchors[index] = null;
          };
        }}
        onPointerEnter={() => {
          live.project.hovered = index;
          audio.chime(index);
        }}
        onPointerLeave={() => {
          if (live.project.hovered === index) live.project.hovered = -1;
        }}
        onFocus={(e) => {
          live.project.focus = index;
          live.project.hovered = index;
          // Keyboard users: bring the focused crystal into view.
          if (getUi().webgl === "on" && !getUi().openProject && e.currentTarget.matches(":focus-visible")) {
            const y = scrollForProject(index, domRegistry.projectAnchors.length);
            window.scrollTo({ top: y, behavior: live.reducedMotion ? "auto" : "smooth" });
          }
        }}
        onBlur={() => {
          if (live.project.hovered === index) live.project.hovered = -1;
        }}
        onClick={(e) => {
          domRegistry.returnFocus = e.currentTarget;
          domRegistry.openedFromHome = true;
          audio.blip("click");
        }}
        aria-label={`${title} — ${category}${status ? `, ${status}` : ""}. Open case study.`}
      >
        <span className={styles.title} aria-hidden="true">
          <Decode text={code} reveal={`project.${index}`} className={styles.code} />
          <Decode text={title.toUpperCase()} reveal={`project.${index}`} delay={0.08} />
          <span className={styles.leader} />
        </span>
        <span className={styles.meta} aria-hidden="true">
          <Decode text={`CAT  ${category.toUpperCase()}`} reveal={`project.${index}`} delay={0.15} />
          {status ? (
            <Decode text={`STAT ${status.toUpperCase()}`} reveal={`project.${index}`} delay={0.22} />
          ) : null}
        </span>
        <span className={styles.cta} aria-hidden="true">
          {date ? <Decode text={`D ${date}`} reveal={`project.${index}`} delay={0.25} /> : null}
          <Decode text="CLICK TO EXPLORE" reveal={`project.${index}`} delay={0.3} />
          <span className={styles.underline} />
        </span>
        <span className={styles.fallback}>
          <span className={styles.fbIndex}>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.fbTitle}>{title}</span>
          <span className={styles.fbMeta}>
            {category}
            {status ? ` / ${status}` : ""}
          </span>
          <span className={styles.fbSummary}>{summary}</span>
        </span>
      </Link>
    </li>
  );
}
