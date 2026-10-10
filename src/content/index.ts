import { navigation } from "./navigation";
import { profile } from "./profile";
import { projects as rawProjects } from "./projects";
import { skillGroups } from "./skills";
import { socialLinks } from "./social";
import type { PortfolioProject, ProjectLink } from "./types";

export type * from "./types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Accepts only absolute https: URLs (and mailto: for contact links).
 * Anything else — javascript:, data:, protocol-relative, http: — is rejected
 * so content edits can't introduce unsafe links.
 */
export function safeExternalUrl(href: string, allowMailto = false): string | null {
  try {
    const url = new URL(href);
    if (url.protocol === "https:") return url.toString();
    if (allowMailto && url.protocol === "mailto:") return href;
    return null;
  } catch {
    return null;
  }
}

function validateProjects(list: PortfolioProject[]): PortfolioProject[] {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const p of list) {
    if (!SLUG_RE.test(p.slug)) {
      throw new Error(`[content] Project "${p.title}" has an invalid slug "${p.slug}".`);
    }
    if (ids.has(p.id) || slugs.has(p.slug)) {
      throw new Error(`[content] Duplicate project id/slug "${p.id}" / "${p.slug}".`);
    }
    ids.add(p.id);
    slugs.add(p.slug);
    for (const link of p.links ?? []) {
      if (!safeExternalUrl(link.href)) {
        throw new Error(`[content] Project "${p.title}" link "${link.label}" must be an https:// URL.`);
      }
    }
  }
  return [...list].sort((a, b) => a.order - b.order);
}

for (const s of socialLinks) {
  if (!safeExternalUrl(s.href, true)) {
    throw new Error(`[content] Social link "${s.label}" must be https:// or mailto:.`);
  }
}

export const projects = validateProjects(rawProjects);

export function getProject(slug: string): PortfolioProject | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectIndex(slug: string): number {
  return projects.findIndex((p) => p.slug === slug);
}

export function linksOf(project: PortfolioProject): ProjectLink[] {
  return (project.links ?? []).filter((l) => safeExternalUrl(l.href) !== null);
}

export { navigation, profile, skillGroups, socialLinks };
