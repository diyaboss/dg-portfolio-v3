"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation, profile } from "@/content";
import { audio } from "@/lib/audio";
import { jumpToSection } from "@/lib/navigate";
import { setUi, useUi, type SectionId } from "@/lib/store";
import styles from "./SiteChrome.module.css";

/** Fixed frame: wordmark, section navigation and the sound toggle. */
export function SiteChrome() {
  const pathname = usePathname();
  const active = useUi((s) => s.activeSection);
  const sound = useUi((s) => s.sound);
  const ready = useUi((s) => s.ready);
  const overlay = useUi((s) => s.openProject !== null);
  const onHome = pathname === "/";

  const toggleSound = async () => {
    if (sound) {
      audio.disable();
      setUi({ sound: false });
    } else {
      await audio.enable();
      setUi({ sound: true });
      audio.blip("click");
    }
  };

  return (
    <div className={styles.chrome} data-ready={ready ? "true" : "false"} data-overlay={overlay ? "true" : "false"}>
      <Link
        href="/"
        scroll={false}
        className={styles.wordmark}
        aria-label={`${profile.name} — home`}
        onClick={(e) => {
          if (onHome) {
            e.preventDefault();
            jumpToSection("intro");
          }
        }}
      >
        <span aria-hidden="true">DIYA</span>
        <span aria-hidden="true" className={styles.wordmarkB}>
          GUPTA
        </span>
      </Link>

      <nav className={`${styles.nav} hud-text`} aria-label="Sections" inert={overlay || undefined}>
        <ul>
          {navigation.map((item) => {
            const isActive = onHome && active === item.section;
            return (
              <li key={item.id}>
                <a
                  href={`/#${item.section}`}
                  aria-current={isActive ? "location" : undefined}
                  className={styles.navLink}
                  data-active={isActive ? "true" : "false"}
                  onPointerEnter={() => audio.blip("hover")}
                  onClick={(e) => {
                    if (!onHome) return;
                    e.preventDefault();
                    jumpToSection(item.section as SectionId);
                  }}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        className={`${styles.sound} hud-text`}
        onClick={toggleSound}
        aria-pressed={sound}
      >
        <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" className={styles.speaker}>
          <path d="M1 4h2.5L7 1v10L3.5 8H1z" fill="currentColor" />
          {sound ? (
            <path d="M9.5 3.5c1 .8 1 4.2 0 5M11.5 2c1.8 1.6 1.8 6.4 0 8" stroke="currentColor" fill="none" />
          ) : (
            <path d="M9.5 4l3.5 4M13 4l-3.5 4" stroke="currentColor" />
          )}
        </svg>
        Sound: {sound ? "On" : "Off"}
      </button>
    </div>
  );
}
