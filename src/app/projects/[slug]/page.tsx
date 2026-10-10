import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/site/ProjectDetail";
import { ProjectOverlay } from "@/components/site/ProjectOverlay";
import { getProject, getProjectIndex, projects } from "@/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    openGraph: { title: project.title, description: project.summary },
  };
}

/** Only reference media that actually exists in /public. */
function publicAsset(src?: string): string | undefined {
  if (!src || !src.startsWith("/")) return undefined;
  const publicDir = path.join(process.cwd(), "public");
  // If the server was started from another directory we cannot verify; trust the content.
  if (!existsSync(publicDir)) return src;
  return existsSync(path.join(publicDir, ...src.split("/").filter(Boolean))) ? src : undefined;
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = getProjectIndex(slug);
  const next = projects[(index + 1) % projects.length];
  const cover = publicAsset(project.coverImage);

  return (
    <ProjectOverlay key={project.slug} slug={project.slug} title={project.title}>
      <ProjectDetail project={project} index={index} next={next} cover={cover} />
    </ProjectOverlay>
  );
}
