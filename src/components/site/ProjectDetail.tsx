import Image from "next/image";
import Link from "next/link";
import { linksOf } from "@/content";
import type { PortfolioProject } from "@/content/types";
import styles from "./ProjectDetail.module.css";

/** Case-study body. Server-rendered so it is readable without WebGL or JS. */
export function ProjectDetail({
  project,
  index,
  next,
  cover,
}: {
  project: PortfolioProject;
  index: number;
  next: PortfolioProject;
  cover?: string;
}) {
  const links = linksOf(project);
  const facts: [string, string | undefined][] = [
    ["Category", project.category],
    ["Status", project.status],
    ["Contribution", project.contribution],
    ["Stack", project.technologies.join(" · ")],
    ["Date", project.date],
    ["Collaborators", project.collaborators?.join(", ")],
  ];

  return (
    <article className={styles.article} aria-labelledby="project-title">
      <p className={styles.kicker} data-stagger>
        PROJECT_DG_{String(index + 1).padStart(2, "0")} / {project.category}
      </p>
      <h1 id="project-title" className={styles.title} data-stagger>
        {project.title}
      </h1>

      <section className={styles.block} data-stagger>
        <h2 className={styles.label}>{"////// Summary"}</h2>
        <p>{project.summary}</p>
        {project.description ? <p>{project.description}</p> : null}
      </section>

      <dl className={styles.facts} data-stagger>
        {facts
          .filter((f): f is [string, string] => Boolean(f[1]))
          .map(([k, v]) => (
            <div key={k} className={styles.fact}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      {cover ? (
        <figure className={styles.cover} data-stagger>
          <Image
            src={cover}
            alt={project.coverAlt ?? `${project.title} screenshot`}
            width={1360}
            height={935}
            sizes="(max-width: 760px) 92vw, 520px"
          />
        </figure>
      ) : null}

      {project.sections?.map((s) => (
        <section key={s.id} className={styles.block} data-stagger>
          {s.heading ? <h2 className={styles.label}>{`/// ${s.heading}`}</h2> : null}
          {s.body ? <p>{s.body}</p> : null}
          {s.images?.map((src) => (
            <Image key={src} src={src} alt="" width={1600} height={1000} sizes="560px" className={styles.inline} />
          ))}
          {s.video ? <video src={s.video} controls preload="none" className={styles.inline} /> : null}
        </section>
      ))}

      {project.flow?.length ? (
        <section className={styles.block} data-stagger>
          <h2 className={styles.label}>{"/// System flow"}</h2>
          <ol className={styles.flow}>
            {project.flow.map((step, i) => (
              <li key={step}>
                <span className={styles.flowNum}>{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {links.length ? (
        <section className={styles.block} data-stagger>
          <h2 className={styles.label}>{"/// Visit"}</h2>
          <ul className={styles.links}>
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  [{l.label}] <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className={styles.nextNav} aria-label="More projects" data-stagger>
        <span className={styles.label}>{"///"}</span>
        <Link href={`/projects/${next.slug}`} scroll={false} className={styles.link}>
          Next / {next.title} <span aria-hidden="true">→</span>
        </Link>
      </nav>
      <p className={styles.end} aria-hidden="true">
        ***
      </p>
    </article>
  );
}
