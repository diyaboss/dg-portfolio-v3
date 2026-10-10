"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { audio } from "@/lib/audio";
import { domRegistry } from "@/lib/dom-registry";
import { live, setUi } from "@/lib/store";
import styles from "./ProjectOverlay.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal case-study layer for /projects/[slug]. The WebGL scene listens to
 * `openProject` and plays the crystal dissolve; this component handles the
 * document side: scroll lock, inert background, focus, Escape and history.
 */
export function ProjectOverlay({
  slug,
  title,
  children,
}: {
  slug: string;
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"enter" | "open" | "exit">("enter");
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const exiting = useRef(false);
  // Opened by an in-page link on the home experience → closing can go back.
  const canGoBack = useRef(false);

  useLayoutEffect(() => {
    canGoBack.current = domRegistry.openedFromHome;
    domRegistry.openedFromHome = false;

    setUi({ openProject: slug });
    document.body.setAttribute("data-locked", "");
    const main = document.getElementById("main");
    main?.setAttribute("inert", "");
    audio.shatter();

    // Stagger the case-study blocks.
    rootRef.current?.querySelectorAll<HTMLElement>("[data-stagger]").forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
    });

    return () => {
      setUi({ openProject: null });
      document.body.removeAttribute("data-locked");
      main?.removeAttribute("inert");
      const back = domRegistry.returnFocus;
      if (back && back.isConnected) back.focus({ preventScroll: true });
    };
  }, [slug]);

  useEffect(() => {
    const t = window.setTimeout(
      () => {
        setPhase("open");
        closeRef.current?.focus({ preventScroll: true });
      },
      live.reducedMotion ? 0 : 950,
    );
    return () => window.clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    setPhase("exit");
    audio.blip("back");
    audio.reform();
    window.setTimeout(
      () => {
        if (canGoBack.current) router.back();
        else router.push("/", { scroll: false });
      },
      live.reducedMotion ? 0 : 480,
    );
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !rootRef.current) return;
      const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      ref={rootRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-title"
      data-phase={phase}
    >
      <div className={styles.backdrop} aria-hidden="true" />
      <p className={styles.ghostTitle} aria-hidden="true">
        {title}
      </p>
      <button ref={closeRef} type="button" className={`bracket hud-text ${styles.close}`} onClick={close}>
        Close<span className="sr-only"> {title}</span>
      </button>
      <div className={styles.scroller}>{children}</div>
    </div>
  );
}
