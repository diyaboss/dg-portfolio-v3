import { Decode } from "@/components/ui/Decode";
import { Reveal } from "@/components/ui/Reveal";
import { profile, projects, skillGroups, socialLinks } from "@/content";
import { BlockCallouts } from "./BlockCallouts";
import { ContactCarousel } from "./ContactCarousel";
import { ProjectAnchor } from "./ProjectAnchor";
import { SkillGroupRow } from "./SkillGroupRow";
import styles from "./HomeSections.module.css";

/**
 * The semantic document for the landing experience. In WebGL mode each
 * section is a tall scroll track whose sticky "screen" holds the HUD for its
 * scene; without WebGL the same markup reads as an ordinary page.
 */
export function HomeSections() {
  const projectNumber = new Map(projects.map((p, i) => [p.slug, i + 1]));

  return (
    <main id="main" className={styles.main} tabIndex={-1}>
      {/* ---------------------------------------------------------------- */}
      <section id="intro" className={`${styles.track} ${styles.intro}`} aria-labelledby="intro-title">
        <div className={styles.screen}>
          <Reveal k="intro.hud" className={`${styles.introMeta} hud-text`}>
            <h1 id="intro-title" className="sr-only">
              {profile.name} — {profile.role}
            </h1>
            <Decode as="p" text={`// ${profile.role}`} reveal="intro.hud" delay={0.1} />
            <p className={styles.gap}>
              <Decode text={profile.name} reveal="intro.hud" delay={0.25} />
              <br />
              <Decode
                text={`${profile.education[0].degree}`}
                reveal="intro.hud"
                delay={0.35}
                className="hud-dim"
              />
            </p>
          </Reveal>

          <div className={`${styles.brief} hud-text`}>
            <Decode as="h2" text="////// Brief" reveal="intro.brief" delay={0.2} className={styles.label} />
            <Decode as="p" text={profile.brief} reveal="intro.brief" delay={0.35} speed={110} />
          </div>

          <div className={`${styles.scrollHint} hud-text`}>
            <Decode as="p" text={"Scroll down to\ndiscover"} reveal="intro.scroll" delay={0.6} />
          </div>

          <div className={`${styles.status} hud-text`} aria-hidden="true">
            <Decode as="p" text="////// Perimeter" reveal="intro.status" className={styles.label} />
            <Decode as="p" text="Layered defence, one block at a time." reveal="intro.status" delay={0.15} />
          </div>

          <BlockCallouts />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section
        id="work"
        className={`${styles.track} ${styles.work}`}
        aria-labelledby="work-title"
        style={{ ["--count" as string]: projects.length }}
      >
        <div className={styles.screen}>
          <div className={`${styles.workHead} hud-text`}>
            <h2 id="work-title" className={styles.label}>
              <Decode text={`////// Selected work — ${String(projects.length).padStart(2, "0")}`} reveal="work.head" />
            </h2>
          </div>
          <ol className={styles.projectList}>
            {projects.map((p, i) => (
              <ProjectAnchor
                key={p.id}
                index={i}
                slug={p.slug}
                title={p.title}
                category={p.category}
                status={p.status}
                date={p.date}
                summary={p.summary}
              />
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section id="about" className={`${styles.track} ${styles.about}`} aria-labelledby="about-title">
        <div className={styles.screen}>
          <Reveal k="about.text" className={`${styles.aboutText} ${styles.column} hud-text`}>
            <h2 id="about-title" className={styles.label}>
              <Decode text="////// About" reveal="about.text" />
            </h2>
            {profile.about.map((para, i) => (
              <Decode
                key={i}
                as="p"
                text={para}
                reveal="about.text"
                delay={0.15 + i * 0.35}
                speed={140}
                className={styles.para}
              />
            ))}
            <dl className={styles.facts}>
              <div>
                <dt className="hud-dim">
                  <Decode text="Education" reveal="about.text" delay={0.9} />
                </dt>
                <dd>
                  <Decode
                    text={`${profile.education[0].degree}, ${profile.education[0].institution}`}
                    reveal="about.text"
                    delay={1}
                  />
                </dd>
              </div>
              <div>
                <dt className="hud-dim">
                  <Decode text="Focus" reveal="about.text" delay={1.05} />
                </dt>
                <dd>
                  <Decode text={profile.focus.join(" · ")} reveal="about.text" delay={1.15} />
                </dd>
              </div>
            </dl>
          </Reveal>

          <Reveal k="about.skills" className={`${styles.skills} ${styles.column} hud-text`}>
            <h2 className={styles.label}>
              <Decode text="////// Stack" reveal="about.skills" />
            </h2>
            <p className={`${styles.skillNote} hud-dim`}>
              <Decode
                text="Taken from the stacks of the projects above. Numbers mark the evidence."
                reveal="about.skills"
                delay={0.1}
                speed={160}
              />
            </p>
            <ul className={styles.groups}>
              {skillGroups.map((g, gi) => (
                <SkillGroupRow
                  key={g.id}
                  index={gi}
                  label={g.label}
                  skills={g.skills.map((s) => ({
                    name: s.name,
                    evidence: (s.evidence ?? [])
                      .map((slug) => {
                        const n = projectNumber.get(slug);
                        const project = projects.find((p) => p.slug === slug);
                        return n && project ? { n, slug, title: project.title } : null;
                      })
                      .filter((e): e is { n: number; slug: string; title: string } => e !== null),
                  }))}
                />
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section id="contact" className={`${styles.track} ${styles.contact}`} aria-labelledby="contact-title">
        <div className={styles.screen}>
          <Reveal k="contact.ui" className={`${styles.contactHead} hud-text`}>
            <h2 id="contact-title" className={styles.label}>
              <Decode text="////// Contact" reveal="contact.ui" />
            </h2>
            <p>
              <Decode text="Reach me by email or on GitHub." reveal="contact.ui" delay={0.1} />
              <br />
              <Decode text={profile.email} reveal="contact.ui" delay={0.2} className="hud-dim" />
            </p>
          </Reveal>

          <ContactCarousel links={socialLinks} />

          <footer className={`${styles.footer} hud-text hud-dim`}>
            <Decode text={`© ${profile.copyrightYear} ${profile.name}`} reveal="contact.ui" delay={0.3} />
          </footer>
        </div>
      </section>
    </main>
  );
}
